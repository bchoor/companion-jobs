# Companion Jobs

Web scraper orchestration system. Runs Playwright-based scrapers on a schedule, tracks jobs and run history in libSQL, stores screenshots in a content-addressed object store.

## Tech Stack

- **Runtime**: Bun (always use `bun`/`bunx` — never npm/npx)
- **Language**: TypeScript (ESNext, strict, bundler module resolution)
- **Browser automation**: Playwright (Chromium)
- **Database**: libSQL (`@libsql/client`) — local file at `scrapers/scraper-jobs.db`, migration path to Turso
- **Scheduling**: Companion CLI cron (`~/.companion/cron/scrape-festoolreconcom-every-4-hrs.json`)

## Project Structure

```
scrapers/
  scraper-jobs.db       # Local SQLite database (gitignored, created at runtime)
  utils/
    base-scraper.ts     # Abstract BaseScraper class (Template Method pattern)
    types.ts            # Shared interfaces: ScraperResult, Job, Run
    db.ts               # libSQL client singleton, schema init, ensureJob()
    store.ts            # Content-addressed file store (put/get/exists)
    run-tracking.ts     # Utilities for recording run start/success/failure
  README.md             # Scraper architecture guide and how to add new scrapers
  {slug}/               # One directory per scraper, named by canonical slug
    scraper.ts          # Entry point; extends BaseScraper, implements extract()
    output/             # Timestamped JSON outputs (gitignored)
store/                  # Content-addressed screenshot store (gitignored)
  {2-char prefix}/
    {sha256}.png
```

## Architecture

### BaseScraper (Template Method Pattern)

Each scraper extends the abstract `BaseScraper` class (`scrapers/utils/base-scraper.ts`) and only implements its extraction logic. The base class handles all orchestration: DB init, job registration, run tracking, browser lifecycle, screenshot storage, error handling, and cleanup.

**Abstract method (must implement):** `extract(page, job)` — DOM extraction, returns `{ data, productsFound }`

**Hook methods (may override):**
- `configurePage(page)` — set viewport, headers, cookies (default: no-op)
- `waitForContent(page)` — wait for page readiness (default: 2s timeout)
- `shouldScreenshot()` — toggle screenshots (default: true)
- `navigationWaitUntil()` — Playwright wait strategy (default: networkidle)

Each scraper is invoked directly by Companion: `bun run scrapers/{slug}/scraper.ts`

**Architecture principle**: Each scraper manages its own lifecycle. Companion's job scheduling controls frequency — not the executor. This allows manual "run now" to override frequency limits.

See `scrapers/README.md` for the full architecture diagram, examples, and guide to adding new scrapers.

### Content-Addressed File Store

Screenshots are stored in a content-addressed local object store at `store/` (project root, gitignored).

**Layout**: `store/{first2chars}/{sha256hash}.{ext}` (e.g., `store/a3/a3b4c5...png`)

**Module**: `scrapers/utils/store.ts` exports three functions:
- `put(filePath)` — hash with SHA-256, copy to store, insert `files` row, delete source temp file, return hash
- `get(hash)` — return absolute path to stored file
- `exists(hash)` — check if hash exists in store

**Database**: The `files` table tracks metadata (hash, original_name, mime_type, size_bytes, created_at). The `runs.screenshot_file` column stores the SHA-256 hash (not a filesystem path).

**Future**: The `put`/`get`/`exists` API is the abstraction boundary for swapping to S3/R2. Only the internals of `store.ts` change; all callers stay the same.

### Database Schema

**jobs**: id, name (unique slug), url, frequency_hours, enabled, config (JSON), created_at, updated_at

**runs**: id, job_id (FK), started_at, completed_at, status (running/success/failed), output_file, screenshot_file (SHA-256 hash), error_message, products_found

**results**: id, run_id (FK to runs), data (JSON), created_at
- Stores full scraper output from each run
- 1:1 correspondence with runs table (each run generates exactly one result)
- Indexed on `run_id` for efficient lookups

**files**: id, hash (unique), original_name, mime_type, size_bytes, created_at

The `name` column in `jobs` is the canonical slug and matches the directory name under `scrapers/`.

## How to Add a New Scraper

1. Create `scrapers/{slug}/scraper.ts` — extend `BaseScraper`, implement `extract()`
2. Pass `ScraperDefinition` (slug, url, frequencyHours, config) to the constructor
3. Add entry point: `new MyScraper().execute().catch(...)`
4. Run `bun run scrapers/{slug}/scraper.ts` to test (self-registers its job automatically)

See `scrapers/README.md` for a complete minimal example and hook customization guide.

## Commands

```bash
bun install                              # Install dependencies
bunx playwright install chromium         # Install browser (first time only)
bun run scrapers/festoolrecon/scraper.ts # Execute a specific scraper (self-registers its job)
```

## Scheduling

Managed by **Companion CLI** — not standalone crontab. Each scraper has its own cron config:

```
~/.companion/cron/scrape-festoolrecon-every-4-hrs.json
```

- Schedule: `0 */4 * * *` (every 4 hours)
- Executor: Claude (Haiku) runs `bun run scrapers/festoolrecon/scraper.ts`
- **Each scraper executes independently** — Companion controls frequency via the cron schedule

**For manual testing**: Create a separate non-recurring cron job at `~/.companion/cron/scrape-festoolrecon-manual-test.json` with `schedule: null` and `recurring: false`. Trigger it with `companion cron run scrape-festoolrecon-manual-test` to force immediate execution regardless of schedule.

To add a new schedule or change frequency, update the Companion cron config (change `schedule` field).

## Current Scrapers

| Slug | URL | Frequency | Extracts |
|------|-----|-----------|----------|
| `festoolrecon` | https://festoolrecon.com | 4h | MSRP, discounted price, product name, description, features, what's included, SKU |

## Conventions

- Slug = lowercase, no spaces, matches directory name and DB `name` column
- Output filenames: `{slug}-{YYYY-MM-DDTHH-MM-SS}.json`
- Screenshots stored by SHA-256 hash in `store/`, not alongside JSON
- Scrapers use Playwright library (not CLI) for full programmatic control
- All paths use `import.meta.dir` — no CWD dependency
- DB is gitignored; each scraper self-registers its job via `ensureJob()`
- `results` table now uses `run_id` (FK to `runs`) instead of `job_id`

## Future Migrations

### Turso (remote DB)
1. Create a Turso database
2. Update `scrapers/utils/db.ts` to use embedded replica mode with `syncUrl` + `authToken` env vars
3. No other code changes needed — `@libsql/client` API is identical

### S3/R2 (remote file store)
1. Update `scrapers/utils/store.ts` internals: `put()` uploads to bucket, `get()` returns signed URL or downloads to temp
2. No changes to scrapers or DB schema — the `put`/`get`/`exists` API stays the same
