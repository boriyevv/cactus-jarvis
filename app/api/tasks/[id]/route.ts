import { q, one } from '@/lib/db';
import { handler, body, need, HttpError } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { requireSup } from '@/lib/perm';
import { getTask, assertCanSee, setStageProgress, submitTask, notify, log } from '@/lib/tasks';
import { normalizeDate } from '@/lib/util';

export const dynamic = 'force-dynamic';

export const GET = handler(async (_req, { params }) => {
  const u = await requireUser();
  const id = Number(params.id);
  const task = await getTask(id);
  assertCanSee(u, task);
  const stages = await q('SELECT * FROM stages WHERE task_id=$1 ORDER BY position', [id]);
  const submissions = await q(
    `SELECT s.*,a.name AS user_name,r.name AS reviewer_name FROM submissions s
     LEFT JOIN users a ON a.id=s.user_id LEFT JOIN users r ON r.id=s.reviewer_id WHERE s.task_id=$1 ORDER BY s.id DESC`, [id]);
  const files = await q(
    `SELECT f.id,f.name,f.url,f.size,f.stage_id,f.created_at,u.name AS user_name FROM files f
     LEFT JOIN users u ON u.id=f.user_id WHERE f.task_id=$1 ORDER BY f.id DESC`, [id]);
  const reports = await q(
    `SELECT r.id,r.report_date::text AS report_date,r.done_text,r.percent,r.hours,r.blockers,u.name AS user_name
     FROM reports r LEFT JOIN users u ON u.id=r.user_id WHERE r.task_id=$1 ORDER BY r.id DESC LIMIT 20`, [id]);
  const active = await one('SELECT id FROM sessions WHERE task_id=$1 AND user_id=$2 AND ended_at IS NULL', [id, u.id]);
  return { task, stages, submissions, files, reports, timerActive: !!active };
});

export const PATCH = handler(async (req, { params }) => {
  const u = await requireUser();
  const id = Number(params.id);
  const b = await body(req);
  const task = await getTask(id);
  assertCanSee(u, task);

  if (b.action === 'stage') return setStageProgress(u, id, Number(b.stageId), b.progress);
  if (b.action === 'submit') return submitTask(u, id, b.note || '');

  requireSup(u);
  const sets: string[] = [], p: any[] = [];
  if (b.status) {
    need(['todo', 'in_progress', 'rework', 'done'].includes(b.status), 'Неверный статус');
    p.push(b.status); sets.push(`status=$${p.length}`);
  }
  if (b.assigneeId !== undefined) {
    p.push(b.assigneeId || null); sets.push(`assignee_id=$${p.length}`);
    if (b.assigneeId) await notify(Number(b.assigneeId), 'task', 'Вам назначено задание', task.title);
  }
  if (b.dueDate !== undefined) { p.push(normalizeDate(b.dueDate)); sets.push(`due_date=$${p.length}`); }
  if (b.title) { p.push(String(b.title)); sets.push(`title=$${p.length}`); }
  if (b.description !== undefined) { p.push(String(b.description)); sets.push(`description=$${p.length}`); }
  if (b.plannedHours !== undefined) { p.push(Number(b.plannedHours) || 0); sets.push(`planned_hours=$${p.length}`); }
  if (!sets.length) throw new HttpError(400, 'Нечего менять');
  p.push(id);
  await q(`UPDATE tasks SET ${sets.join(',')},updated_at=now() WHERE id=$${p.length}`, p);
  await log(u.id, id, 'task_updated', task.title);
  return { ok: true };
});

export const DELETE = handler(async (_req, { params }) => {
  const u = await requireUser();
  requireSup(u);
  const id = Number(params.id);
  const task = await getTask(id);
  await q('DELETE FROM tasks WHERE id=$1', [id]);
  await log(u.id, null, 'task_deleted', task.title);
  return { ok: true };
});
