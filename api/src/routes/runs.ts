import { Hono } from 'hono';
import type { Env } from '../types';
import type { Run } from '../../../shared/types';

const app = new Hono<{ Bindings: Env }>();

// GET /api/runs - List all runs (with optional ?job_id= filter, ordered by started_at DESC)
app.get('/', async (c) => {
  try {
    const jobId = c.req.query('job_id');

    let query = 'SELECT * FROM runs';
    const params: number[] = [];

    if (jobId) {
      const jobIdNum = parseInt(jobId);
      if (!isNaN(jobIdNum)) {
        query += ' WHERE job_id = ?';
        params.push(jobIdNum);
      }
    }

    query += ' ORDER BY started_at DESC';

    const stmt = c.env.DB.prepare(query);
    const result = params.length > 0
      ? await stmt.bind(...params).all<Run>()
      : await stmt.all<Run>();

    return c.json({ success: true, data: result.results || [] });
  } catch (error) {
    console.error('Error fetching runs:', error);
    return c.json({ success: false, error: 'Failed to fetch runs' }, 500);
  }
});

// GET /api/runs/:id - Get run by ID (include job details via JOIN)
app.get('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));

    if (isNaN(id)) {
      return c.json({ success: false, error: 'Invalid run ID' }, 400);
    }

    const result = await c.env.DB.prepare(
      `SELECT
        runs.*,
        jobs.name as job_name,
        jobs.type as job_type,
        jobs.url as job_url
      FROM runs
      LEFT JOIN jobs ON runs.job_id = jobs.id
      WHERE runs.id = ?`
    )
      .bind(id)
      .first();

    if (!result) {
      return c.json({ success: false, error: 'Run not found' }, 404);
    }

    return c.json({ success: true, data: result });
  } catch (error) {
    console.error('Error fetching run:', error);
    return c.json({ success: false, error: 'Failed to fetch run' }, 500);
  }
});

// POST /api/runs - Create new run (for job execution tracking)
app.post('/', async (c) => {
  try {
    const body = await c.req.json();

    // Validate required fields
    if (!body.job_id) {
      return c.json({
        success: false,
        error: 'Missing required field: job_id'
      }, 400);
    }

    const jobId = parseInt(body.job_id);
    if (isNaN(jobId)) {
      return c.json({ success: false, error: 'Invalid job_id' }, 400);
    }

    // Verify job exists
    const job = await c.env.DB.prepare('SELECT id FROM jobs WHERE id = ?')
      .bind(jobId)
      .first();

    if (!job) {
      return c.json({ success: false, error: 'Job not found' }, 404);
    }

    const now = new Date().toISOString();

    const result = await c.env.DB.prepare(
      `INSERT INTO runs (job_id, started_at, status)
       VALUES (?, ?, ?)
       RETURNING *`
    )
      .bind(jobId, now, body.status || 'pending')
      .first<Run>();

    return c.json({ success: true, data: result }, 201);
  } catch (error) {
    console.error('Error creating run:', error);
    return c.json({ success: false, error: 'Failed to create run' }, 500);
  }
});

// PATCH /api/runs/:id - Update run (status, completed_at, error_message, etc.)
app.patch('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));

    if (isNaN(id)) {
      return c.json({ success: false, error: 'Invalid run ID' }, 400);
    }

    const body = await c.req.json();

    // Check if run exists
    const existing = await c.env.DB.prepare('SELECT id FROM runs WHERE id = ?')
      .bind(id)
      .first();

    if (!existing) {
      return c.json({ success: false, error: 'Run not found' }, 404);
    }

    // Build update query dynamically
    const updates: string[] = [];
    const params: any[] = [];

    if (body.status !== undefined) {
      if (!['pending', 'running', 'success', 'failed'].includes(body.status)) {
        return c.json({
          success: false,
          error: 'Invalid status. Must be: pending, running, success, or failed'
        }, 400);
      }
      updates.push('status = ?');
      params.push(body.status);
    }
    if (body.completed_at !== undefined) {
      updates.push('completed_at = ?');
      params.push(body.completed_at);
    }
    if (body.output_file !== undefined) {
      updates.push('output_file = ?');
      params.push(body.output_file);
    }
    if (body.screenshot_file !== undefined) {
      updates.push('screenshot_file = ?');
      params.push(body.screenshot_file);
    }
    if (body.error_message !== undefined) {
      updates.push('error_message = ?');
      params.push(body.error_message);
    }
    if (body.products_found !== undefined) {
      updates.push('products_found = ?');
      params.push(body.products_found);
    }

    if (updates.length === 0) {
      return c.json({ success: false, error: 'No fields to update' }, 400);
    }

    params.push(id);

    const result = await c.env.DB.prepare(
      `UPDATE runs SET ${updates.join(', ')} WHERE id = ? RETURNING *`
    )
      .bind(...params)
      .first<Run>();

    return c.json({ success: true, data: result });
  } catch (error) {
    console.error('Error updating run:', error);
    return c.json({ success: false, error: 'Failed to update run' }, 500);
  }
});

export default app;
