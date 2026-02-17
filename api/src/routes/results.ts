import { Hono } from 'hono';
import type { Env } from '../types';
import type { Result } from '../../../shared/types';

const app = new Hono<{ Bindings: Env }>();

// GET /api/results/:runId - Get result data for a run
app.get('/:runId', async (c) => {
  try {
    const runId = parseInt(c.req.param('runId'));

    if (isNaN(runId)) {
      return c.json({ success: false, error: 'Invalid run ID' }, 400);
    }

    const result = await c.env.DB.prepare(
      'SELECT * FROM results WHERE run_id = ?'
    )
      .bind(runId)
      .first<Result>();

    if (!result) {
      return c.json({ success: false, error: 'Result not found' }, 404);
    }

    return c.json({ success: true, data: result });
  } catch (error) {
    console.error('Error fetching result:', error);
    return c.json({ success: false, error: 'Failed to fetch result' }, 500);
  }
});

// POST /api/results - Create result (stores JSON data for a run)
app.post('/', async (c) => {
  try {
    const body = await c.req.json();

    // Validate required fields
    if (!body.run_id || !body.data) {
      return c.json({
        success: false,
        error: 'Missing required fields: run_id, data'
      }, 400);
    }

    const runId = parseInt(body.run_id);
    if (isNaN(runId)) {
      return c.json({ success: false, error: 'Invalid run_id' }, 400);
    }

    // Verify run exists
    const run = await c.env.DB.prepare('SELECT id FROM runs WHERE id = ?')
      .bind(runId)
      .first();

    if (!run) {
      return c.json({ success: false, error: 'Run not found' }, 404);
    }

    // Check if result already exists for this run
    const existing = await c.env.DB.prepare(
      'SELECT id FROM results WHERE run_id = ?'
    )
      .bind(runId)
      .first();

    if (existing) {
      return c.json({
        success: false,
        error: 'Result already exists for this run'
      }, 409);
    }

    const now = new Date().toISOString();

    const result = await c.env.DB.prepare(
      `INSERT INTO results (run_id, data, created_at)
       VALUES (?, ?, ?)
       RETURNING *`
    )
      .bind(runId, JSON.stringify(body.data), now)
      .first<Result>();

    return c.json({ success: true, data: result }, 201);
  } catch (error) {
    console.error('Error creating result:', error);
    return c.json({ success: false, error: 'Failed to create result' }, 500);
  }
});

export default app;
