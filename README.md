# Companion Jobs

A web scraper orchestration system with a React dashboard, built on Cloudflare D1, R2, and Workers. Extensible architecture for multi-job-type systems (web scrapers, Amazon order tracking, SnapTrade portfolio monitoring, and more).

## Project Overview

Companion Jobs is a monorepo that:
- **Runs Playwright-based web scrapers** on a schedule (managed by Companion CLI)
- **Stores data** in Cloudflare D1 (SQL database) and R2 (object storage)
- **Exposes a REST API** for dashboard integration (Hono on Cloudflare Workers)
- **Provides a React dashboard** for viewing jobs, runs, and results (Vite + Stack Auth + shadcn-admin)
- **Handles multi-format screenshot storage** with automatic WebP conversion (80% size reduction)

**Current scrapers:**
- `festoolrecon`: Extracts pricing, SKU, product details from festoolrecon.com (every 4 hours)

**Planned integrations:**
- Amazon order tracking (order history, delivery status, price history)
- SnapTrade portfolio monitoring (holdings, performance, tax lots)

## Monorepo Structure

```
companion-jobs/
├── shared/                 # Shared TypeScript types and constants
│   ├── types.ts           # Shared interfaces (ScraperResult, Job, Run, etc.)
│   ├── constants.ts       # Database constants (table names, statuses)
│   ├── schema.sql         # D1 database schema (jobs, runs, results, files)
│   └── package.json       # No runtime deps, types only
├── api/                   # Hono REST API (Cloudflare Worker)
│   ├── index.ts           # API entry point (13 endpoints)
│   ├── src/
│   │   ├── routes/        # Endpoint handlers (jobs, runs, results, files)
│   │   └── middleware/    # Auth, CORS, error handling
│   ├── migrations/        # D1 migration scripts
│   └── wrangler.toml      # Cloudflare Worker config (D1 + R2 bindings)
├── dashboard/             # React + Vite frontend
│   ├── src/
│   │   ├── pages/         # Stack Auth integration, job details, run history
│   │   ├── components/    # shadcn-admin table, forms, modals
│   │   └── api.ts         # HTTP client for API routes
│   ├── public/            # Static assets
│   └── vite.config.ts     # Vite build config
├── scrapers/              # Playwright-based web scrapers
│   ├── utils/
│   │   ├── base-scraper.ts    # Abstract BaseScraper class (Template Method)
│   │   ├── types.ts           # ScraperResult, ScraperDefinition
│   │   ├── api-client.ts      # HTTP client for D1 API + R2 S3 SDK
│   │   └── image-processor.ts # WebP conversion, file hashing
│   ├── festoolrecon/          # Example scraper (extends BaseScraper)
│   │   ├── scraper.ts         # extract() implementation
│   │   └── output/            # Timestamped JSON results (gitignored)
│   └── README.md              # Scraper architecture guide
├── migration/             # Data migration scripts (SQLite → D1, local store → R2)
│   ├── migrate.ts         # Main migration orchestrator
│   └── strategies/        # CSV import, file upload handlers
├── package.json           # Root monorepo config (bun workspaces)
├── bun.lock               # Dependency lock file
├── .env.example           # Template for environment variables
└── README.md              # This file
```

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Database** | Cloudflare D1 | Relational data (jobs, runs, results, files) |
| **File Storage** | Cloudflare R2 | Screenshot storage with S3-compatible SDK |
| **Browser Automation** | Playwright | DOM extraction, screenshot capture |
| **API** | Hono + Cloudflare Workers | REST endpoints for dashboard + scrapers |
| **Frontend** | React 18 + Vite | Dashboard UI with shadcn-admin components |
| **Auth** | Stack Auth | OAuth provider for dashboard access |
| **Runtime** | Bun | Package manager, dev server, build tool |
| **Language** | TypeScript (ESNext, strict mode) | Type safety across monorepo |

## Database Schema

### `jobs`
- `id`: Auto-increment primary key
- `name`: Unique slug (e.g., `festoolrecon`), matches scraper directory name
- `url`: Target website URL
- `frequency_hours`: Scheduling interval (0 for manual only)
- `enabled`: Boolean (false = ignore in scheduling)
- `config`: JSON object (scraper-specific settings)
- `created_at`, `updated_at`: Timestamps

### `runs`
- `id`: Auto-increment primary key
- `job_id`: Foreign key to `jobs`
- `started_at`, `completed_at`: Timestamps
- `status`: `running` | `success` | `failed`
- `output_file`: Relative path to JSON output (stored in results)
- `screenshot_file`: SHA-256 hash of screenshot in R2
- `error_message`: Failure details
- `products_found`: Product count

### `results`
- `id`: Auto-increment primary key
- `run_id`: Foreign key to `runs` (1:1 relationship)
- `data`: JSON (full scraper output)
- `created_at`: Timestamp

### `files`
- `id`: Auto-increment primary key
- `hash`: Unique SHA-256 hash (primary file identifier)
- `original_name`: Original filename before hashing
- `mime_type`: File type (e.g., `image/webp`)
- `size_bytes`: File size
- `created_at`: Timestamp

## Setup Instructions

### Prerequisites
- Bun 1.0+ ([install](https://bun.sh))
- Cloudflare account with D1 and R2 enabled
- Playwright (installed automatically)
- GitHub CLI (`gh`, for repo setup)

### 1. Clone the Repository
```bash
git clone https://github.com/bchoor/companion-jobs.git
cd companion-jobs
```

### 2. Install Dependencies
```bash
bun install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env` and fill in your credentials:
```bash
cp .env.example .env
```

**Required variables:**
- `CF_ACCOUNT_ID`: Cloudflare account ID
- `CF_API_TOKEN`: Cloudflare API token (with D1 and R2 permissions)
- `CF_D1_DATABASE_ID`: D1 database ID
- `R2_ENDPOINT`: R2 endpoint URL
- `R2_ACCESS_KEY_ID`: R2 access key
- `R2_SECRET_ACCESS_KEY`: R2 secret key
- `R2_BUCKET_NAME`: R2 bucket name (e.g., `companion-store`)
- `VITE_STACK_PROJECT_ID`: Stack Auth project ID (for dashboard)
- `VITE_STACK_PUBLISHABLE_CLIENT_KEY`: Stack Auth client key
- `STACK_SERVER_SECRET_KEY`: Stack Auth server secret

### 4. Initialize Database
If migrating from local SQLite, run the migration:
```bash
bun run migration/migrate.ts
```

Otherwise, the database schema is auto-created on first API request.

### 5. Install Playwright Browser
```bash
bunx playwright install chromium
```

## Development Workflow

### Run a Scraper Manually
```bash
bun run scrapers/festoolrecon/scraper.ts
```

Outputs:
- JSON result: `scrapers/festoolrecon/output/festoolrecon-{timestamp}.json`
- Screenshot: Stored in R2, hash recorded in `runs.screenshot_file`
- Database records: Auto-created in `jobs`, `runs`, `results`, `files`

### Start the Dashboard
```bash
cd dashboard
bun run dev
```

Opens at `http://localhost:5173` with Stack Auth login.

### Run the API Locally (Cloudflare Worker)
```bash
cd api
bun run dev
```

API listens at `http://localhost:8787`.

### Schedule Scrapers
Managed by **Companion CLI** cron jobs. Example:
```json
{
  "name": "scrape-festoolrecon-every-4-hrs",
  "schedule": "0 */4 * * *",
  "command": "cd /path/to/companion-jobs && bun run scrapers/festoolrecon/scraper.ts",
  "recurring": true
}
```

Place at `~/.companion/cron/scrape-festoolrecon-every-4-hrs.json`.

## API Endpoints

All endpoints require Stack Auth verification (Bearer token in `Authorization` header).

### Jobs
- `GET /api/jobs` — List all jobs
- `GET /api/jobs/:id` — Get job details
- `POST /api/jobs` — Create a new job
- `PUT /api/jobs/:id` — Update job config
- `DELETE /api/jobs/:id` — Disable a job

### Runs
- `GET /api/jobs/:id/runs` — List runs for a job
- `GET /api/runs/:id` — Get run details
- `POST /api/jobs/:id/run` — Trigger manual run (calls scraper)

### Results
- `GET /api/runs/:id/result` — Get full result data for a run
- `GET /api/runs/:id/screenshot` — Download screenshot (signed R2 URL)

### Files
- `GET /api/files/:hash` — Download file by hash (signed R2 URL)
- `GET /api/files/:hash/info` — Get file metadata

## Architecture Overview

### Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Playwright Scraper                       │
│  (festoolrecon/scraper.ts extends BaseScraper)             │
│                                                             │
│  1. Open browser, navigate to URL                          │
│  2. Wait for content (customizable)                        │
│  3. Extract DOM (implement extract() method)               │
│  4. Capture screenshot (auto-convert to WebP)              │
│  5. Upload screenshot to R2 (get SHA-256 hash)             │
│  6. POST results to API (D1 + R2 bindings)                 │
└──────────────┬──────────────────────────────────────────────┘
               │ HTTP API Calls (D1 + R2 SDK)
               │
        ┌──────▼────────────────────────────────────────────┐
        │   Hono REST API (Cloudflare Worker)              │
        │                                                   │
        │  - Parse requests                                │
        │  - Write to D1 (jobs, runs, results, files)      │
        │  - Handle R2 file operations (upload, download)  │
        │  - Return signed URLs for file access            │
        └───┬──────────────────────┬──────────────────────┘
            │                      │
      ┌─────▼────────────┐   ┌────▼────────────────┐
      │  D1 Database     │   │  R2 Object Store    │
      │                  │   │                     │
      │ - jobs table     │   │ - screenshots       │
      │ - runs table     │   │ - JSON outputs      │
      │ - results table  │   │ - user files        │
      │ - files table    │   │                     │
      └────────────────┬─┘   └────────────┬────────┘
                       │                  │
                    ┌──▼──────────────────▼──┐
                    │  React Dashboard       │
                    │                        │
                    │ - Job status view      │
                    │ - Run history          │
                    │ - Result details       │
                    │ - Screenshot gallery   │
                    │ - Manual run trigger   │
                    └────────────────────────┘
```

### Design Patterns

**Template Method (BaseScraper)**
Each scraper extends the abstract `BaseScraper` class and only implements `extract()`. The base class handles:
- Database registration (`ensureJob()`)
- Run lifecycle tracking (start/success/failure)
- Browser setup and teardown
- Screenshot capture and R2 upload
- Error handling and cleanup

**Content-Addressed File Storage**
Screenshots and files are identified by SHA-256 hash, enabling:
- Deduplication (identical files share one R2 object)
- Integrity checks (hash verification on retrieval)
- Easy migration to S3/R2 (only `store.ts` changes, callers stay the same)

**Separation of Concerns**
- **Scrapers**: Know only their domain (DOM extraction, click sequences)
- **API**: Handles D1 queries, R2 file ops, auth validation
- **Dashboard**: Consumes API, displays results
- **Shared types**: Single source of truth for TypeScript interfaces

## Adding a New Scraper

1. Create `scrapers/{slug}/scraper.ts`:
```typescript
import { BaseScraper } from '../utils/base-scraper.ts';

class AmazonScraper extends BaseScraper {
  constructor() {
    super({
      slug: 'amazon',
      url: 'https://amazon.com',
      frequencyHours: 24,
      config: { orderHistoryUrl: '...' }
    });
  }

  async extract(page, job) {
    // DOM extraction logic here
    return {
      data: { /* your extracted data */ },
      productsFound: 5
    };
  }
}

new AmazonScraper().execute().catch(console.error);
```

2. Run to test:
```bash
bun run scrapers/amazon/scraper.ts
```

3. Add to Companion cron schedule once stable.

See `scrapers/README.md` for detailed examples and hook customization.

## Future Migrations

### From Local SQLite to Turso (Remote D1)
Update `API_D1_DATABASE_ID` and `API_D1_AUTH_TOKEN` environment variables. The `@libsql/client` API remains identical.

### From Local Store to S3/R2 (Remote Object Storage)
Update `scrapers/utils/store.ts` internals (S3 API calls). The `put()`/`get()`/`exists()` interface stays the same — all scrapers continue working without changes.

## Troubleshooting

### Database Connection Errors
- Verify `CF_D1_DATABASE_ID` and `CF_API_TOKEN` in `.env`
- Ensure D1 database exists in Cloudflare dashboard
- Check API logs: `wrangler tail api`

### Screenshot Upload Failures
- Verify R2 bucket exists and credentials are correct
- Check `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`
- Ensure bucket policy allows object uploads

### Scraper Timeouts
- Increase `waitTimeout` in `configurePage()` hook
- Add custom `waitForContent()` to wait for specific DOM elements
- Check target website rate limiting and blocking

### Dashboard Auth Issues
- Verify Stack Auth credentials in `.env` (VITE_ prefix for client-side)
- Clear browser cookies and re-login
- Check `STACK_SERVER_SECRET_KEY` on API side

## Contributing

1. Create a feature branch: `git checkout -b feature/my-feature`
2. Make changes and run tests (see project READMEs for test commands)
3. Commit with conventional commits: `git commit -m "feat: description"`
4. Push and open a pull request

## License

MIT

## Contact

Created with Companion Jobs automation framework.
