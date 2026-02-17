# Companion Jobs

Web scraper orchestration system deployed on Cloudflare. Runs Playwright-based scrapers on a schedule, tracks jobs and run history in Cloudflare D1, stores screenshots in Cloudflare R2, serves a React dashboard via Cloudflare Pages.

## Tech Stack

- **Runtime**: Bun (always use `bun`/`bunx` — never npm/npx)
- **Language**: TypeScript (ESNext, strict, bundler module resolution)
- **Browser automation**: Playwright (Chromium)
- **Database**: Cloudflare D1 (SQLite-compatible, accessed via HTTP API from scrapers, Worker bindings from API)
- **File storage**: Cloudflare R2 (S3-compatible, screenshots stored as WebP with SHA-256 content addressing)
- **API**: Hono on Cloudflare Workers (`jobs-api.bchoor.com`)
- **Dashboard**: React + Vite + TanStack Router on Cloudflare Pages (`jobs-dashboard.bchoor.com`)
- **Scheduling**: Companion CLI cron

## Project Structure

```
api/                        # Hono REST API (Cloudflare Worker)
  src/
    index.ts                # App entry, CORS, route wiring
    types.ts                # Env bindings (DB: D1Database, STORE: R2Bucket)
    routes/                 # REST handlers: jobs, runs, results, files
  migrations/
    0001_initial_schema.sql # D1 schema
  wrangler.toml             # Worker config (D1 + R2 bindings)
  package.json

dashboard/                  # React SPA (Cloudflare Pages)
  src/
    features/               # Feature modules: jobs, runs, dashboard, settings, etc.
    components/             # Shared UI (shadcn/ui + Radix primitives)
    routes/                 # TanStack Router file-based routes
    lib/api.ts              # Axios client → VITE_API_URL
  wrangler.toml             # Pages config (SPA, custom domain)
  package.json

scrapers/                   # Playwright-based web scrapers
  utils/
    base-scraper.ts         # Abstract BaseScraper (Template Method pattern)
    types.ts                # ScraperResult, Job, Run interfaces
    d1-client.ts            # Cloudflare D1 HTTP API client
    r2-client.ts            # R2 upload with WebP conversion via sharp
    db.ts                   # LEGACY: local libSQL client (unused by BaseScraper)
    store.ts                # LEGACY: local content-addressed store (unused by BaseScraper)
    run-tracking.ts         # LEGACY: local run tracking (unused by BaseScraper)
  festoolrecon/
    scraper.ts              # FestoolReconScraper — extends BaseScraper
  README.md

shared/                     # Shared TypeScript types & schema
  types.ts                  # Job, Run, Result, FileRecord interfaces
  schema.sql                # D1 database schema

migration/                  # SQLite → D1 + local store → R2 migration scripts (reference only)
logs/                       # Scraper execution logs (local, gitignored)
```

## Architecture

### Cloudflare Infrastructure

| Service | Name | Purpose |
|---------|------|---------|
| **Workers** | `companion-jobs` | REST API (`/api/jobs`, `/api/runs`, `/api/results`, `/api/files`) |
| **Pages** | `companion-dashboard` | React SPA dashboard |
| **D1** | `companion-jobs` (ID: `2a789be5-...`) | SQL database for jobs, runs, results, files metadata |
| **R2** | `companion-store` | Screenshot storage (WebP, content-addressed by SHA-256) |

### How Scrapers Access Cloudflare

Scrapers run locally (via Companion CLI cron) and access Cloudflare services through HTTP APIs:
- **D1**: via `scrapers/utils/d1-client.ts` — uses Cloudflare REST API with `CF_API_TOKEN`
- **R2**: via `scrapers/utils/r2-client.ts` — uses `@aws-sdk/client-s3` with R2 S3-compatible endpoint

This is different from the API Worker, which uses native Worker bindings (`env.DB`, `env.STORE`) configured in `wrangler.toml`.

### BaseScraper (Template Method Pattern)

Each scraper extends `BaseScraper` and only implements its extraction logic. The base class handles: D1 job registration, run tracking, browser lifecycle, R2 screenshot storage (with PNG → WebP conversion), error handling, log capture.

**Abstract method (must implement):** `extract(page, job)` — DOM extraction, returns `{ data, productsFound }`

**Hook methods (may override):**
- `configurePage(page)` — set viewport, headers, cookies (default: no-op)
- `waitForContent(page)` — wait for page readiness (default: 2s timeout)
- `shouldScreenshot()` — toggle screenshots (default: true)
- `navigationWaitUntil()` — Playwright wait strategy (default: networkidle)

### Database Schema (D1)

**jobs**: id, name (unique slug), type (`scrape`|`amazon-orders`|`snaptrade`), url (nullable), frequency_hours, enabled, config (JSON), created_at, updated_at

**runs**: id, job_id (FK), started_at, completed_at, status (`pending`|`running`|`success`|`failed`), output_file, screenshot_file (SHA-256 hash), error_message, products_found

**results**: id, run_id (FK), data (JSON), created_at

**files**: id, hash (unique SHA-256), original_name, mime_type, size_bytes, created_at

### R2 Screenshot Storage

Screenshots are captured as PNG by Playwright, converted to WebP (80% quality) by `sharp`, then uploaded to R2 at `{hash[0:2]}/{hash}.webp`. The `files` table in D1 tracks metadata. The `runs.screenshot_file` column stores the SHA-256 hash.

## Commands

```bash
# Root (scrapers)
bun install                              # Install root dependencies
bunx playwright install chromium         # Install browser (first time only)
bun run scrapers/festoolrecon/scraper.ts # Execute a scraper (self-registers in D1)

# API
cd api && bun install                    # Install API dependencies
cd api && bun run dev                    # Local dev (wrangler dev, port 8787)
cd api && bun run deploy                 # Deploy to Cloudflare Workers

# Dashboard
cd dashboard && bun install              # Install dashboard dependencies
cd dashboard && bun run dev              # Local dev (vite, port 5173)
cd dashboard && bun run build            # Build for production
cd dashboard && bunx wrangler deploy          # Deploy to Cloudflare Workers (static assets)
```

## Environment Variables

### Root `.env` (for scrapers — loaded by dotenv)

| Variable | Purpose |
|----------|---------|
| `CF_ACCOUNT_ID` | Cloudflare account ID |
| `CF_API_TOKEN` | Cloudflare API token (D1 + R2 permissions) |
| `CF_D1_DATABASE_ID` | D1 database ID |
| `R2_ENDPOINT` | R2 S3-compatible endpoint URL |
| `R2_ACCESS_KEY_ID` | R2 access key |
| `R2_SECRET_ACCESS_KEY` | R2 secret key |
| `R2_BUCKET_NAME` | R2 bucket name (`companion-store`) |

### Dashboard `.env`

| Variable | Purpose |
|----------|---------|
| `VITE_API_URL` | API base URL (local: `http://localhost:8787`, prod: `https://jobs-api.bchoor.com`) |

### API Worker

No `.env` needed — uses D1/R2 bindings from `wrangler.toml`.

## Scheduling

Managed by **Companion CLI** cron:

```
~/.companion/cron/scrape-festoolreconcom-every-4-hrs.json
```

- Schedule: `0 */4 * * *` (every 4 hours)
- Executor: Claude Haiku runs `bun run scrapers/festoolrecon/scraper.ts`
- Permissions: `bypassPermissions`

## Current Scrapers

| Slug | URL | Frequency | Extracts |
|------|-----|-----------|----------|
| `festoolrecon` | https://festoolrecon.com | 4h | MSRP, discounted price, product name, description, features, what's included, SKU |

## Deployed URLs

| Service | URL |
|---------|-----|
| API | `https://jobs-api.bchoor.com` |
| Dashboard | `https://jobs-dashboard.bchoor.com` |
| Scraper | `https://jobs-scraper.bchoor.com` |

## How to Add a New Scraper

1. Create `scrapers/{slug}/scraper.ts` — extend `BaseScraper`, implement `extract()`
2. Pass `ScraperDefinition` (slug, url, frequencyHours, config) to the constructor
3. Add entry point: `new MyScraper().execute().catch(...)`
4. Run `bun run scrapers/{slug}/scraper.ts` to test (self-registers its job in D1)

## Conventions

- Slug = lowercase, no spaces, matches directory name and D1 `jobs.name` column
- Screenshots stored as WebP in R2, keyed by SHA-256 hash
- Scrapers use Playwright library (not CLI) for full programmatic control
- All paths use `import.meta.dir` — no CWD dependency
- Each scraper self-registers its job in D1 via `ensureJob()`
- `results` table uses `run_id` (FK to `runs`), not `job_id`

## Legacy Files (can be removed)

These files are from the pre-Cloudflare architecture and are no longer used by `BaseScraper`:
- `scrapers/utils/db.ts` — local libSQL client (replaced by `d1-client.ts`)
- `scrapers/utils/store.ts` — local file store (replaced by `r2-client.ts`)
- `scrapers/utils/run-tracking.ts` — local run tracking (replaced by methods in `BaseScraper`)
- `scrapers/scraper-jobs.db` — local SQLite database (data migrated to D1)
- `store/` — local screenshot store (files migrated to R2)
- `dashboard-old/` — previous dashboard version (backup)
- `netlify.toml` in dashboard — leftover from shadcn-admin starter kit (not used)
