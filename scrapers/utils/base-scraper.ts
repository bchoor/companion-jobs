import { chromium, type Page } from "playwright";
import { tmpdir } from "os";
import { resolve } from "path";
import { mkdirSync, writeFileSync } from "fs";
import { d1Query, d1Execute } from "./d1-client";
import { r2Put } from "./r2-client";
import type { Job } from "./types";

export interface ScraperDefinition {
  slug: string;
  url: string;
  frequencyHours: number;
  config?: Record<string, unknown>;
  enabled?: boolean;
}

export interface ExtractResult {
  data: unknown;
  productsFound: number;
}

export abstract class BaseScraper {
  protected readonly def: ScraperDefinition;

  constructor(def: ScraperDefinition) {
    this.def = def;
  }

  // ── Abstract method (subclasses MUST implement) ──────────────

  protected abstract extract(page: Page, job: Job): Promise<ExtractResult>;

  // ── Hook methods (subclasses MAY override) ───────────────────

  protected async configurePage(_page: Page): Promise<void> {}

  protected async waitForContent(page: Page): Promise<void> {
    await page.waitForTimeout(2000);
  }

  protected shouldScreenshot(): boolean {
    return true;
  }

  protected navigationWaitUntil():
    | "load"
    | "domcontentloaded"
    | "networkidle"
    | "commit" {
    return "networkidle";
  }

  // ── Protected utilities ──────────────────────────────────────

  protected makeTimestamp(): string {
    return (
      new Date()
        .toISOString()
        .replace(/[:.]/g, "-")
        .replace(/Z$/, "")
        .match(/\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}/)?.[0] ?? "unknown"
    );
  }

  protected log(message: string): void {
    console.log(`[${this.def.slug}] ${message}`);
  }

  protected logError(message: string): void {
    console.error(`[${this.def.slug}] ${message}`);
  }

  // ── D1 helper methods ────────────────────────────────────────

  private async ensureJob(): Promise<Job> {
    // Insert or update job in D1
    const enabledValue = this.def.enabled !== false ? 1 : 0;
    const configValue = JSON.stringify(this.def.config ?? {});

    await d1Execute(
      `INSERT INTO jobs (name, type, url, frequency_hours, enabled, config)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(name) DO UPDATE SET
         url = excluded.url,
         frequency_hours = excluded.frequency_hours,
         enabled = excluded.enabled,
         config = excluded.config,
         updated_at = datetime('now')`,
      [
        this.def.slug,       // name
        'scrape',            // type (default for scrapers)
        this.def.url,        // url
        this.def.frequencyHours, // frequency_hours
        enabledValue,        // enabled (1 or 0)
        configValue,         // config (JSON string)
      ]
    );

    // Retrieve the job
    const rows = await d1Query<Job>(
      "SELECT * FROM jobs WHERE name = ?",
      [this.def.slug]
    );

    if (rows.length === 0) {
      throw new Error(`Failed to create/retrieve job: ${this.def.slug}`);
    }

    return rows[0];
  }

  private async recordRunStart(jobId: number): Promise<number> {
    await d1Execute(
      `INSERT INTO runs (job_id, status, started_at)
       VALUES (?, 'running', datetime('now'))`,
      [jobId]
    );

    // Get the last inserted row ID
    const rows = await d1Query<{ id: number }>(
      "SELECT id FROM runs WHERE job_id = ? ORDER BY id DESC LIMIT 1",
      [jobId]
    );

    return rows[0].id;
  }

  private async recordRunSuccess(
    runId: number,
    screenshotHash: string | null,
    productsFound: number,
    data: unknown
  ): Promise<void> {
    await d1Execute(
      `UPDATE runs SET
         status = 'success',
         completed_at = datetime('now'),
         screenshot_file = ?,
         products_found = ?
       WHERE id = ?`,
      [screenshotHash, productsFound, runId]
    );

    // Insert result data
    await d1Execute(
      `INSERT INTO results (run_id, data, created_at)
       VALUES (?, ?, datetime('now'))`,
      [runId, JSON.stringify(data)]
    );
  }

  private async recordRunFailure(runId: number, error: string): Promise<void> {
    await d1Execute(
      `UPDATE runs SET
         status = 'failed',
         completed_at = datetime('now'),
         error_message = ?
       WHERE id = ?`,
      [error.substring(0, 2000), runId]
    );
  }

  // ── Template method (the fixed workflow) ─────────────────────

  async execute(): Promise<void> {
    const timestamp = this.makeTimestamp();
    const logBuffer: string[] = [];

    // Capture console output
    const originalLog = console.log;
    const originalError = console.error;

    const captureLog = (level: 'log' | 'error', ...args: any[]) => {
      const message = args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ');
      logBuffer.push(`[${level.toUpperCase()}] ${message}`);
      if (level === 'log') originalLog(...args);
      else originalError(...args);
    };

    console.log = (...args) => captureLog('log', ...args);
    console.error = (...args) => captureLog('error', ...args);

    try {
      const job = await this.ensureJob();
      const runId = await this.recordRunStart(job.id);

      let browser;
      try {
        this.log(`Scraping ${job.url}...`);

        browser = await chromium.launch();
        const page = await browser.newPage();

        await this.configurePage(page);
        await page.goto(job.url, { waitUntil: this.navigationWaitUntil() });
        await this.waitForContent(page);

        const extractResult = await this.extract(page, job);

        let screenshotHash: string | null = null;
        if (this.shouldScreenshot()) {
          const screenshotPath = resolve(
            tmpdir(),
            `${this.def.slug}-${timestamp}.png`
          );
          await page.screenshot({
            path: screenshotPath,
            fullPage: true,
            type: 'png' // Playwright captures as PNG, r2Put converts to WebP
          });
          screenshotHash = await r2Put(screenshotPath);
          this.log(`Screenshot stored (WebP): ${screenshotHash.slice(0, 12)}...`);
        }

        await this.recordRunSuccess(
          runId,
          screenshotHash,
          extractResult.productsFound,
          extractResult.data
        );

        this.log(`Success: ${extractResult.productsFound} product(s) found`);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        await this.recordRunFailure(runId, message);
        this.logError(`Failed: ${message}`);

        // Write log file before exiting
        this.writeLogFile(timestamp, logBuffer);

        // Restore console
        console.log = originalLog;
        console.error = originalError;

        process.exit(1);
      } finally {
        if (browser) {
          await browser.close();
        }
      }

      // Write log file on success
      this.writeLogFile(timestamp, logBuffer);
    } finally {
      // Restore console
      console.log = originalLog;
      console.error = originalError;
    }
  }

  private writeLogFile(timestamp: string, logBuffer: string[]): void {
    const logDir = resolve(import.meta.dir, "..", "..", "logs", this.def.slug);
    mkdirSync(logDir, { recursive: true });

    const logPath = resolve(logDir, `${timestamp}.log`);
    writeFileSync(logPath, logBuffer.join('\n'), 'utf-8');

    // Use process.stdout directly to avoid capture
    process.stdout.write(`[${this.def.slug}] Log file written: ${logPath}\n`);
  }
}
