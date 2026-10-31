import { promises as fs } from 'fs';
import path from 'path';
import { q, one } from '@/lib/db';
import { handler, need, HttpError } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { isSup } from '@/lib/perm';
import { getTask, log } from '@/lib/tasks';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const GET = handler(async (req) => {
  const u = await requireUser();
  const sp = new URL(req.url).searchParams;
  const w: string[] = ['true'], p: any[] = [];
  if (!isSup(u)) { p.push(u.id); w.push(`(t.assignee_id=$${p.length} OR f.user_id=$${p.length})`); }
  if (sp.get('task')) { p.push(Number(sp.get('task'))); w.push(`f.task_id=$${p.length}`); }
  const files = await q(
    `SELECT f.id,f.name,f.url,f.size,f.mime,f.created_at,f.task_id,t.title AS task_title,u.name AS user_name,(f.storage_path IS NOT NULL) AS stored
     FROM files f LEFT JOIN tasks t ON t.id=f.task_id LEFT JOIN users u ON u.id=f.user_id
     WHERE ${w.join(' AND ')} ORDER BY f.id DESC LIMIT 200`, p);
  return { files };
});

export const POST = handler(async (req) => {
  const u = await requireUser();
  const form = await req.formData();
  const taskId = Number(form.get('taskId'));
  need(taskId, 'Выберите задание');
  const task = await getTask(taskId);
  if (!isSup(u) && task.assignee_id !== u.id) throw new HttpError(403, 'Нет доступа к заданию');
  const stageId = form.get('stageId') ? Number(form.get('stageId')) : null;
  const link = String(form.get('url') || '').trim();
  const file = form.get('file') as any;

  if (file && typeof file === 'object' && file.size > 0) {
    need(file.size <= 25 * 1024 * 1024, 'Файл больше 25 МБ');
    const dir = path.join(process.cwd(), 'storage');
    await fs.mkdir(dir, { recursive: true });
    const safe = String(file.name).replace(/[^\w.\-а-яА-ЯёЁ]+/g, '_');
    const stored = `${Date.now()}-${safe}`;
    await fs.writeFile(path.join(dir, stored), Buffer.from(await file.arrayBuffer()));
    const r = await one(
      'INSERT INTO files(task_id,stage_id,user_id,name,storage_path,size,mime) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id',
      [taskId, stageId, u.id, file.name, stored, file.size, file.type || '']);
    await log(u.id, taskId, 'file_added', file.name);
    return { id: r.id };
  }
  need(/^https?:\/\//i.test(link), 'Выберите файл или вставьте ссылку (https://…)');
  const name = String(form.get('name') || '').trim() || link.replace(/^https?:\/\//, '').slice(0, 60);
  const r = await one('INSERT INTO files(task_id,stage_id,user_id,name,url) VALUES($1,$2,$3,$4,$5) RETURNING id', [taskId, stageId, u.id, name, link]);
  await log(u.id, taskId, 'file_added', name);
  return { id: r.id };
});

export const DELETE = handler(async (req) => {
  const u = await requireUser();
  const id = Number(new URL(req.url).searchParams.get('id'));
  const f = await one('SELECT * FROM files WHERE id=$1', [id]);
  if (!f) throw new HttpError(404, 'Файл не найден');
  if (!isSup(u) && f.user_id !== u.id) throw new HttpError(403, 'Нет доступа');
  if (f.storage_path) await fs.unlink(path.join(process.cwd(), 'storage', f.storage_path)).catch(() => {});
  await q('DELETE FROM files WHERE id=$1', [id]);
  return { ok: true };
});
