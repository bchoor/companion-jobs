import { getDb } from "./db";
import type { ScraperResult } from "./types";

export async function recordRunStart(jobId: number): Promise<number> {
  const db = getDb();
  const result = await db.execute({
    sql: `INSERT INTO runs (job_id, status, started_at)
          VALUES (?, 'running', datetime('now'))`,
    args: [jobId],
  });
  return Number(result.lastInsertRowid);
}

export async function recordRunSuccess(
  runId: number,
  result: ScraperResult,
  scrapeData: unknown
): Promise<void> {
  const db = getDb();
  await db.execute({
    sql: `UPDATE runs SET
            status = 'success',
            completed_at = datetime('now'),
            output_file = ?,
            screenshot_file = ?,
            products_found = ?
          WHERE id = ?`,
    args: [
      null,
      result.screenshotFile,
      result.productsFound,
      runId,
    ],
  });

  // Now includes run_id instead of job_id
  await db.execute({
    sql: `INSERT INTO results (run_id, data, created_at)
          VALUES (?, ?, datetime('now'))`,
    args: [runId, JSON.stringify(scrapeData)],
  });
}

export async function recordRunFailure(
  runId: number,
  error: string
): Promise<void> {
  const db = getDb();
  await db.execute({
    sql: `UPDATE runs SET
            status = 'failed',
            completed_at = datetime('now'),
            error_message = ?
          WHERE id = ?`,
    args: [error.substring(0, 2000), runId],
  });
}
