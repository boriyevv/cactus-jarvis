import { neon } from '@neondatabase/serverless';

let _sql: any = null;
function client() {
  if (!_sql) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL не задан (.env.local)');
    _sql = neon(url);
  }
  return _sql;
}

export async function q<T = any>(text: string, params: any[] = []): Promise<T[]> {
  return (await client().query(text, params)) as T[];
}

export async function one<T = any>(text: string, params: any[] = []): Promise<T | null> {
  const rows = await q<T>(text, params);
  return rows[0] || null;
}
