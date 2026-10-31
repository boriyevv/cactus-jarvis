import { q, one } from '@/lib/db';
import { handler, body, need } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { isSup } from '@/lib/perm';
import { getTask, setStageProgress, notifySupervisors, log } from '@/lib/tasks';
import { normalizeDate } from '@/lib/util';

export const dynamic = 'force-dynamic';

export const GET = handler(async (req) => {
  const u = await requireUser();
  const sp = new URL(req.url).searchParams;
  const w: string[] = ['true'], p: any[] = [];
  if (!isSup(u)) { p.push(u.id); w.push(`r.user_id=$${p.length}`); }
  else if (sp.get('user')) { p.push(Number(sp.get('user'))); w.push(`r.user_id=$${p.length}`); }
  const reports = await q(
    `SELECT r.id,r.report_date::text AS report_date,r.done_text,r.percent,r.hours,r.blockers,r.created_at,
       u.name AS user_name,t.title AS task_title,s.name AS stage_name
     FROM reports r LEFT JOIN users u ON u.id=r.user_id LEFT JOIN tasks t ON t.id=r.task_id LEFT JOIN stages s ON s.id=r.stage_id
     WHERE ${w.join(' AND ')} ORDER BY r.id DESC LIMIT 100`, p);
  return { reports };
});

export const POST = handler(async (req) => {
  const u = await requireUser();
  const b = await body(req);
  need(String(b.doneText || '').trim(), 'Опишите, что сделано за день');
  let taskTitle = '';
  if (b.taskId) {
    const t = await getTask(Number(b.taskId));
    if (t.assignee_id !== u.id && !isSup(u)) need(false, 'Это не ваше задание', 403);
    taskTitle = t.title;
  }
  const r = await one(
    `INSERT INTO reports(user_id,task_id,stage_id,report_date,done_text,percent,hours,blockers)
     VALUES($1,$2,$3,COALESCE($4::date,(now() AT TIME ZONE 'Asia/Tashkent')::date),$5,$6,$7,$8) RETURNING id`,
    [u.id, b.taskId || null, b.stageId || null, normalizeDate(b.date), String(b.doneText).trim(),
     b.percent === '' || b.percent == null ? null : Number(b.percent), Number(b.hours) || 0, b.blockers || '']
  );
  if (b.taskId && b.stageId && b.percent !== '' && b.percent != null) {
    try { await setStageProgress(u, Number(b.taskId), Number(b.stageId), Number(b.percent)); } catch {}
  }
  if (b.blockers && String(b.blockers).trim()) {
    await notifySupervisors('warning', 'Блокер в отчёте', `${u.name}: ${b.blockers}`, null, u.id);
  }
  await log(u.id, b.taskId || null, 'daily_report', taskTitle || 'Ежедневный отчёт');
  return { id: r.id };
});
