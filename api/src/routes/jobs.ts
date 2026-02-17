import { Hono } from 'hono';
import type { Env } from '../types';
import type { Job } from '../../../shared/types';

const app = new Hono<{ Bindings: Env }>();

// GET /api/jobs - List all jobs (with optional ?type= filter)
app.get('/', async (c) => {
  try {
    const type = c.req.query('type');

    let query = 'SELECT * FROM jobs';
    const params: string[] = [];

    if (type) {
      query += ' WHERE type = ?';
      params.push(type);
    }

    query += ' ORDER BY created_at DESC';

    const stmt = c.env.DB.prepare(query);
    const result = params.length > 0
      ? await stmt.bind(...params).all<Job>()
      : await stmt.all<Job>();

    return c.json({ success: true, data: result.results || [] });
  } catch (error) {
    console.error('Error fetching jobs:', error);
    return c.json({ success: false, error: 'Failed to fetch jobs' }, 500);
  }
});

// GET /api/jobs/:id - Get job by ID
app.get('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));

    if (isNaN(id)) {
      return c.json({ success: false, error: 'Invalid job ID' }, 400);
    }

    const result = await c.env.DB.prepare('SELECT * FROM jobs WHERE id = ?')
      .bind(id)
      .first<Job>();

    if (!result) {
      return c.json({ success: false, error: 'Job not found' }, 404);
    }

    return c.json({ success: true, data: result });
  } catch (error) {
    console.error('Error fetching job:', error);
    return c.json({ success: false, error: 'Failed to fetch job' }, 500);
  }
});

// POST /api/jobs - Create new job
app.post('/', async (c) => {
  try {
    const body = await c.req.json();

    // Validate required fields
    if (!body.name || !body.type) {
      return c.json({
        success: false,
        error: 'Missing required fields: name, type'
      }, 400);
    }

    // Validate type enum
    if (!['scrape', 'amazon-orders', 'snaptrade'].includes(body.type)) {
      return c.json({
        success: false,
        error: 'Invalid type. Must be: scrape, amazon-orders, or snaptrade'
      }, 400);
    }

    const now = new Date().toISOString();

    const result = await c.env.DB.prepare(
      `INSERT INTO jobs (name, type, url, frequency_hours, enabled, config, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       RETURNING *`
    )
      .bind(
        body.name,
        body.type,
        body.url || null,
        body.frequency_hours || 24,
        body.enabled !== false ? 1 : 0,
        body.config ? JSON.stringify(body.config) : null,
        now,
        now
      )
      .first<Job>();

    return c.json({ success: true, data: result }, 201);
  } catch (error) {
    console.error('Error creating job:', error);
    return c.json({ success: false, error: 'Failed to create job' }, 500);
  }
});

// PUT /api/jobs/:id - Update job
app.put('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));

    if (isNaN(id)) {
      return c.json({ success: false, error: 'Invalid job ID' }, 400);
    }

    const body = await c.req.json();

    // Check if job exists
    const existing = await c.env.DB.prepare('SELECT id FROM jobs WHERE id = ?')
      .bind(id)
      .first();

    if (!existing) {
      return c.json({ success: false, error: 'Job not found' }, 404);
    }

    // Build update query dynamically
    const updates: string[] = [];
    const params: any[] = [];

    if (body.name !== undefined) {
      updates.push('name = ?');
      params.push(body.name);
    }
    if (body.type !== undefined) {
      if (!['scrape', 'amazon-orders', 'snaptrade'].includes(body.type)) {
        return c.json({
          success: false,
          error: 'Invalid type. Must be: scrape, amazon-orders, or snaptrade'
        }, 400);
      }
      updates.push('type = ?');
      params.push(body.type);
    }
    if (body.url !== undefined) {
      updates.push('url = ?');
      params.push(body.url);
    }
    if (body.frequency_hours !== undefined) {
      updates.push('frequency_hours = ?');
      params.push(body.frequency_hours);
    }
    if (body.enabled !== undefined) {
      updates.push('enabled = ?');
      params.push(body.enabled ? 1 : 0);
    }
    if (body.config !== undefined) {
      updates.push('config = ?');
      params.push(body.config ? JSON.stringify(body.config) : null);
    }

    if (updates.length === 0) {
      return c.json({ success: false, error: 'No fields to update' }, 400);
    }

    updates.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(id);

    const result = await c.env.DB.prepare(
      `UPDATE jobs SET ${updates.join(', ')} WHERE id = ? RETURNING *`
    )
      .bind(...params)
      .first<Job>();

    return c.json({ success: true, data: result });
  } catch (error) {
    console.error('Error updating job:', error);
    return c.json({ success: false, error: 'Failed to update job' }, 500);
  }
});

export default app;
