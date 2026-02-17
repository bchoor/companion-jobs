import { Hono } from 'hono';
import type { Env } from '../types';

const app = new Hono<{ Bindings: Env }>();

// GET /api/files/:hash - Get presigned URL for R2 object
app.get('/:hash', async (c) => {
  try {
    const hash = c.req.param('hash');

    if (!hash || hash.length !== 64) {
      return c.json({ success: false, error: 'Invalid hash' }, 400);
    }

    // Construct R2 key: {hash.slice(0,2)}/{hash}.webp
    const key = `${hash.slice(0, 2)}/${hash}.webp`;

    // Check if object exists in R2
    const object = await c.env.STORE.head(key);

    if (!object) {
      return c.json({ success: false, error: 'File not found' }, 404);
    }

    // Generate presigned URL with 1-hour expiration
    // Note: R2 doesn't have built-in presigned URL generation like S3
    // We'll return a signed URL using the R2 HTTP API
    // For now, we'll use the object URL directly (requires public bucket or auth)
    // In production, implement proper signed URLs or use Cloudflare Access

    // Alternative: Stream the file directly through the API
    const file = await c.env.STORE.get(key);

    if (!file) {
      return c.json({ success: false, error: 'File not found' }, 404);
    }

    // Return the file with appropriate headers
    return new Response(file.body, {
      headers: {
        'Content-Type': file.httpMetadata?.contentType || 'image/webp',
        'Cache-Control': 'public, max-age=3600',
        'Content-Length': file.size.toString(),
      },
    });
  } catch (error) {
    console.error('Error fetching file:', error);
    return c.json({ success: false, error: 'Failed to fetch file' }, 500);
  }
});

export default app;
