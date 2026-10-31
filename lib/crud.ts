import { q, one } from './db';
import { handler, body, need, HttpError } from './api';
import { requireUser } from './auth';
import { normalizeDate } from './util';

type Cfg = {
  table: string;
  cols: string[];
  select: string;            // SELECT ... FROM table alias
  alias: string;
  order?: string;
  filters?: Record<string, string>; // query param -> sql column
  guard: (u: any, row: any, method: string) => void;
  mask?: (u: any, row: any) => any;
};

export function makeCrud(cfg: Cfg) {
  const GET = handler(async (req) => {
    const u = await requireUser();
    const sp = new URL(req.url).searchParams;
    const row: any = {};
    const w: string[] = ['true'], p: any[] = [];
    for (const [param, col] of Object.entries(cfg.filters || {})) {
      if (sp.get(param)) { p.push(sp.get(param)); w.push(`${col}=$${p.length}`); row[param] = sp.get(param); }
    }
    cfg.guard(u, row, 'GET');
    const items = await q(`${cfg.select} WHERE ${w.join(' AND ')} ORDER BY ${cfg.order || cfg.alias + '.id'}`, p);
    return { items: cfg.mask ? items.map((r: any) => cfg.mask!(u, r)) : items };
  });

  const POST = handler(async (req) => {
    const u = await requireUser();
    const b = await body(req);
    cfg.guard(u, b, 'POST');
    const cols = cfg.cols.filter((c) => b[c] !== undefined && b[c] !== '');
    need(cols.length, 'Нет данных');
    const vals = cols.map((c) => (c.endsWith('date') ? normalizeDate(b[c]) : b[c]));
    const r = await one(
      `INSERT INTO ${cfg.table}(${cols.join(',')}) VALUES(${cols.map((_, i) => '$' + (i + 1)).join(',')}) RETURNING id`, vals);
    return { id: r.id };
  });

  const PATCH = handler(async (req) => {
    const u = await requireUser();
    const b = await body(req);
    need(b.id, 'Не указан id');
    const existing = await one(`SELECT * FROM ${cfg.table} WHERE id=$1`, [b.id]);
    if (!existing) throw new HttpError(404, 'Запись не найдена');
    cfg.guard(u, existing, 'PATCH');
    if (b.section) cfg.guard(u, b, 'PATCH');
    const cols = cfg.cols.filter((c) => b[c] !== undefined);
    need(cols.length, 'Нечего менять');
    const vals = cols.map((c) => (c.endsWith('date') ? normalizeDate(b[c]) : b[c] === '' ? null : b[c]));
    await q(`UPDATE ${cfg.table} SET ${cols.map((c, i) => `${c}=$${i + 1}`).join(',')} WHERE id=$${cols.length + 1}`, [...vals, b.id]);
    return { ok: true };
  });

  const DELETE = handler(async (req) => {
    const u = await requireUser();
    const id = Number(new URL(req.url).searchParams.get('id'));
    need(id, 'Не указан id');
    const existing = await one(`SELECT * FROM ${cfg.table} WHERE id=$1`, [id]);
    if (!existing) throw new HttpError(404, 'Запись не найдена');
    cfg.guard(u, existing, 'DELETE');
    await q(`DELETE FROM ${cfg.table} WHERE id=$1`, [id]);
    return { ok: true };
  });

  return { GET, POST, PATCH, DELETE };
}
