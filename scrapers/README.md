# Scrapers

Playwright-based web scrapers using the **Template Method pattern**. Each scraper extends `BaseScraper` and only implements its extraction logic — all orchestration is handled by the base class.

## Architecture

```
BaseScraper (scrapers/utils/base-scraper.ts)
├── execute()          # Template method — the fixed 11-step workflow
│   1. initDb          # Initialize database connection + schema
│   2. ensureJob       # Upsert job definition (self-registration)
│   3. recordRunStart  # Insert run record with status=running
│   4. chromium.launch # Start headless browser
│   5. configurePage   # Hook: set viewport, headers, cookies
│   6. page.goto       # Navigate to target URL
│   7. waitForContent  # Hook: wait for page readiness
│   8. extract()       # Abstract: scraper-specific DOM extraction
│   9. screenshot      # Capture + store in content-addressed store
│  10. recordRunSuccess# Persist result data to DB
│  11. cleanup         # Close browser + DB connection
├── extract()          # Abstract — subclasses MUST implement
├── configurePage()    # Hook — override to customize (default: no-op)
├── waitForContent()   # Hook — override to customize (default: 2s wait)
├── shouldScreenshot() # Hook — override to disable (default: true)
└── navigationWaitUntil() # Hook — override strategy (default: networkidle)
```

## Adding a New Scraper

1. Create `scrapers/{slug}/scraper.ts`
2. Extend `BaseScraper`, pass a `ScraperDefinition` to the constructor
3. Implement the `extract(page, job)` method — return `{ data, productsFound }`
4. Add the entry point at the bottom of the file

Minimal example:

```typescript
import type { Page } from "playwright";
import { BaseScraper, type ExtractResult } from "../utils/base-scraper";
import type { Job } from "../utils/types";

class MyStoreScraper extends BaseScraper {
  constructor() {
    super({
      slug: "my-store",
      url: "https://my-store.com/deals",
      frequencyHours: 6,
    });
  }

  protected async extract(page: Page, _job: Job): Promise<ExtractResult> {
    const products = await page.evaluate(() =>
      Array.from(document.querySelectorAll(".product")).map((el) => ({
        name: el.querySelector("h2")?.textContent?.trim() ?? "",
        price: el.querySelector(".price")?.textContent?.trim() ?? "",
      }))
    );

    return {
      data: { products, scrapedAt: new Date().toISOString() },
      productsFound: products.length,
    };
  }
}

const scraper = new MyStoreScraper();
scraper.execute().catch((err) => {
  console.error("[my-store] Fatal:", err);
  process.exit(1);
});
export default scraper;
```

## Customizing Behavior

Override hook methods to customize without touching the base workflow:

```typescript
class CustomScraper extends BaseScraper {
  // Wait for a specific element instead of a fixed timeout
  protected async waitForContent(page: Page): Promise<void> {
    await page.waitForSelector(".product-grid", { timeout: 10000 });
  }

  // Use faster navigation strategy
  protected navigationWaitUntil() {
    return "domcontentloaded" as const;
  }

  // Skip screenshots for this scraper
  protected shouldScreenshot(): boolean {
    return false;
  }

  // Set custom viewport or headers
  protected async configurePage(page: Page): Promise<void> {
    await page.setViewportSize({ width: 1920, height: 1080 });
  }

  protected async extract(page: Page, _job: Job): Promise<ExtractResult> {
    // ... extraction logic
  }
}
```

## Running a Scraper

```bash
bun run scrapers/{slug}/scraper.ts
```

Each scraper self-registers its job in the database on startup. No manual DB setup needed.

## Utilities

| File | Purpose |
|------|---------|
| `utils/base-scraper.ts` | Abstract base class (Template Method pattern) |
| `utils/types.ts` | Shared interfaces: `ScraperResult`, `Job`, `Run` |
| `utils/db.ts` | libSQL client, schema init, `ensureJob()` |
| `utils/store.ts` | Content-addressed file store (`put`/`get`/`exists`) |
| `utils/run-tracking.ts` | Run lifecycle: `recordRunStart`/`Success`/`Failure` |
