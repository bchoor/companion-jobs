import { config } from 'dotenv';

// Load environment variables
config();

const D1_API = `https://api.cloudflare.com/client/v4/accounts/${process.env.CF_ACCOUNT_ID}/d1/database/${process.env.CF_D1_DATABASE_ID}`;

/**
 * Execute a query against Cloudflare D1 HTTP API
 * @param sql SQL query string
 * @param params Parameterized values (replaces ? placeholders)
 * @returns Array of result rows
 */
export async function d1Query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const res = await fetch(`${D1_API}/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.CF_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sql, params }),
  });

  const data = await res.json();

  if (!data.success) {
    const errorMsg = data.errors?.[0]?.message || 'Unknown D1 error';
    throw new Error(`D1 query failed: ${errorMsg}`);
  }

  return data.result[0].results;
}

/**
 * Execute a statement that doesn't return rows (INSERT, UPDATE, DELETE)
 * @param sql SQL statement
 * @param params Parameterized values
 */
export async function d1Execute(sql: string, params: any[] = []): Promise<void> {
  await d1Query(sql, params);
}
