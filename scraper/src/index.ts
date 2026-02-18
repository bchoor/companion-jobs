import { extractFestoolrecon } from './extract-festoolrecon';

interface Env {
  DB: D1Database;
  STORE: R2Bucket;
  CF_ACCOUNT_ID: string;
  CF_API_TOKEN: string;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

async function runScrape(env: Env, trigger: 'scheduled' | 'manual'): Promise<string> {
  console.log('[festoolrecon] Starting scrape');

  // Check if we should run based on frequency_hours
  if (trigger === 'scheduled') {
    const job = await env.DB.prepare(
      `SELECT id, frequency_hours FROM jobs WHERE name = 'festoolrecon'`
    ).first<{ id: number; frequency_hours: number }>();

    if (job) {
      const lastRun = await env.DB.prepare(
        `SELECT completed_at FROM runs WHERE job_id = ? AND status = 'success' ORDER BY completed_at DESC LIMIT 1`
      ).bind(job.id).first<{ completed_at: string }>();

      if (lastRun?.completed_at) {
        const lastRunTime = new Date(lastRun.completed_at + 'Z').getTime();
        const now = Date.now();
        const hoursSinceLastRun = (now - lastRunTime) / (1000 * 60 * 60);
        if (hoursSinceLastRun < job.frequency_hours) {
          console.log(`[festoolrecon] Skipping: ${hoursSinceLastRun.toFixed(1)}h since last run, frequency is ${job.frequency_hours}h`);
          return `Skipped: only ${hoursSinceLastRun.toFixed(1)}h since last run (frequency: ${job.frequency_hours}h)`;
        }
      }
    }
  }

  let runId: number | null = null;

  try {
    // 1. Ensure Job
    await env.DB.prepare(
      `INSERT INTO jobs (name, type, url, frequency_hours, enabled, created_at, updated_at)
       VALUES ('festoolrecon', 'scrape', 'https://festoolrecon.com', 4, 1, datetime('now'), datetime('now'))
       ON CONFLICT(name) DO UPDATE SET url = excluded.url, frequency_hours = excluded.frequency_hours, updated_at = datetime('now')`
    ).run();

    const jobResult = await env.DB.prepare(
      `SELECT id FROM jobs WHERE name = 'festoolrecon'`
    ).first<{ id: number }>();

    if (!jobResult) {
      throw new Error('Failed to ensure job');
    }

    const jobId = jobResult.id;
    console.log(`[festoolrecon] Job ensured: id=${jobId}`);

    // 2. Create Run
    const runResult = await env.DB.prepare(
      `INSERT INTO runs (job_id, started_at, status, trigger) VALUES (?, datetime('now'), 'running', ?)`
    ).bind(jobId, trigger).run();

    runId = runResult.meta.last_row_id as number;
    console.log(`[festoolrecon] Run created: id=${runId}`);

    // 3. Call Browser Rendering /snapshot
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/browser-rendering/snapshot`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.CF_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: 'https://festoolrecon.com',
          gotoOptions: { waitUntil: 'networkidle0' },
          viewport: { width: 1920, height: 1080 },
          screenshotOptions: { fullPage: true },
        }),
      }
    );

    const snapshot = await response.json() as {
      success: boolean;
      result?: {
        content: string;
        screenshot: string;
      };
      errors?: Array<{ message: string }>;
    };

    if (!snapshot.success || !snapshot.result) {
      const errorMsg = snapshot.errors?.map(e => e.message).join(', ') || 'Unknown error';
      throw new Error(`Snapshot API failed: ${errorMsg}`);
    }

    console.log(
      `[festoolrecon] Snapshot fetched: ${snapshot.result.content.length} chars HTML, screenshot present`
    );

    // 4. Extract Data
    const result = extractFestoolrecon(snapshot.result.content);
    console.log(`[festoolrecon] Extracted ${result.productsFound} products`);

    // 5. Store Screenshot in R2
    const screenshotBuffer = Uint8Array.from(
      atob(snapshot.result.screenshot),
      c => c.charCodeAt(0)
    );

    const hashBuffer = await crypto.subtle.digest('SHA-256', screenshotBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    const key = `${hash.slice(0, 2)}/${hash}`;
    await env.STORE.put(key, screenshotBuffer, {
      httpMetadata: { contentType: 'image/png' },
    });

    await env.DB.prepare(
      `INSERT INTO files (hash, original_name, mime_type, size_bytes, created_at)
       VALUES (?, ?, 'image/png', ?, datetime('now'))
       ON CONFLICT(hash) DO NOTHING`
    ).bind(hash, 'screenshot.png', screenshotBuffer.length).run();

    console.log(`[festoolrecon] Screenshot stored: ${hash}`);

    // 6. Store Results
    await env.DB.prepare(
      `INSERT INTO results (run_id, data, created_at) VALUES (?, ?, datetime('now'))`
    ).bind(runId, JSON.stringify(result.data)).run();

    // 7. Update Run (success)
    await env.DB.prepare(
      `UPDATE runs SET status = 'success', completed_at = datetime('now'), screenshot_file = ?, products_found = ? WHERE id = ?`
    ).bind(hash, result.productsFound, runId).run();

    console.log('[festoolrecon] Run completed successfully');
    return `Success: ${result.productsFound} products extracted`;
  } catch (error) {
    console.error('[festoolrecon] Run failed:', error);

    if (runId) {
      const errorMessage = String(error).slice(0, 2000);
      await env.DB.prepare(
        `UPDATE runs SET status = 'failed', completed_at = datetime('now'), error_message = ? WHERE id = ?`
      ).bind(errorMessage, runId).run();
    }

    throw error;
  }
}

export default {
  async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(runScrape(env, 'scheduled'));
  },

  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Handle OPTIONS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    if (url.pathname === '/trigger') {
      try {
        const message = await runScrape(env, 'manual');
        return new Response(message, { status: 200, headers: CORS_HEADERS });
      } catch (error) {
        return new Response(`Scrape failed: ${error}`, { status: 500, headers: CORS_HEADERS });
      }
    }
    return new Response('companion-scraper is running', { status: 200, headers: CORS_HEADERS });
  },
} satisfies ExportedHandler<Env>;
