import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './types';

// Import routes
import jobs from './routes/jobs';
import runs from './routes/runs';
import results from './routes/results';
import files from './routes/files';

const app = new Hono<{ Bindings: Env }>();

// CORS middleware
app.use('/*', cors({
  origin: (origin) => {
    if (!origin) return 'http://localhost:3000';
    if (origin === 'http://localhost:3000') return origin;
    if (origin.endsWith('.pages.dev')) return origin;
    if (origin.endsWith('.bchoor.com')) return origin;
    return '';
  },
  credentials: true,
}));

// Health check endpoint
app.get('/', (c) => c.json({ message: 'Companion Jobs API' }));

// Wire up routes
app.route('/api/jobs', jobs);
app.route('/api/runs', runs);
app.route('/api/results', results);
app.route('/api/files', files);

export default app;
