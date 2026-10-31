import { q, one } from './db';
import { TEMPLATES } from './templates.mjs';
import { HttpError } from './api';
import { isSup } from './perm';
import { normalizeDate } from './util';

export const TODAY = "(now() AT TIME ZONE 'Asia/Tashkent')::date";

export const CLAIMED = `COALESCE((SELECT SUM(s.weight*s.progress)/100.0 FROM stages s WHERE s.task_id=t.id),0)::float`;
export const ACCEPTED = `COALESCE((SELECT SUM(CASE WHEN s.status='accepted' THEN s.weight ELSE 0 END) FROM stages s WHERE s.task_id=t.id),0)::float`;
export const SPENT = `COALESCE((SELECT SUM(EXTRACT(EPOCH FROM (COALESCE(ss.ended_at,now())-ss.started_at))) FROM sessions ss WHERE ss.task_id=t.id),0)::float`;

export const TASK_SELECT = `SELECT t.id,t.title,t.description,t.type,t.status,t.planned_hours,t.complexity,
  t.due_date::text AS due_date,t.created_at,t.updated_at,t.assignee_id,t.project_id,
  p.name AS project_name,u.name AS assignee_name,u.initials AS assignee_initials,u.job_title AS assignee_title,
  ${CLAIMED} AS claimed, ${ACCEPTED} AS accepted, ${SPENT} AS spent_sec,
  (t.status<>'done' AND t.due_date IS NOT NULL AND t.due_date < ${TODAY}) AS overdue
  FROM tasks t LEFT JOIN projects p ON p.id=t.project_id LEFT JOIN users u ON u.id=t.assignee_id`;

export async function getTask(id: number) {
  const t = await one(TASK_SELECT + ' WHERE t.id=$1', [id]);
  if (!t) throw new HttpError(404, 'Задание не найдено');
  return t;
}

export function assertCanSee(user: any, t: any) {
  if (!isSup(user) && t.assignee_id !== user.id) throw new HttpError(403, 'Это задание вам не назначено');
}

export async function log(userId: number | null, taskId: number | null, action: string, detail = '') {
  await q('INSERT INTO activity(user_id,task_id,action,detail) VALUES($1,$2,$3,$4)', [userId, taskId, action, detail]);
}

export async function notify(userId: number, kind: string, title: string, body = '', dedupe: string | null = null) {
  await q(
    'INSERT INTO notifications(user_id,kind,title,body,dedupe_key) VALUES($1,$2,$3,$4,$5) ON CONFLICT (dedupe_key) DO NOTHING',
    [userId, kind, title, body, dedupe]
  );
}

export async function notifySupervisors(kind: string, title: string, body = '', dedupe: string | null = null, exceptId?: number) {
  const sups = await q("SELECT id FROM users WHERE active AND role IN ('founder','manager')");
  for (const s of sups) {
    if (s.id === exceptId) continue;
    await notify(s.id, kind, title, body, dedupe ? `${dedupe}:${s.id}` : null);
  }
}

export async function createTask(creator: any, p: any) {
  const title = String(p.title || '').trim();
  if (!title) throw new HttpError(400, 'Укажите название задания');
  const type = TEMPLATES[p.type] ? p.type : 'Другое';
  const due = normalizeDate(p.dueDate);
  const row = await one(
    `INSERT INTO tasks(title,description,project_id,type,assignee_id,created_by,due_date,planned_hours,complexity)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
    [title, p.description || '', p.projectId || null, type, p.assigneeId || null, creator.id, due,
     Number(p.plannedHours) || 0, Math.min(5, Math.max(1, Number(p.complexity) || 3))]
  );
  const st = TEMPLATES[type];
  await q('INSERT INTO stages(task_id,position,name,weight) SELECT $1::int, * FROM unnest($2::int[], $3::text[], $4::int[])', [
    row.id, st.map((_: any, i: number) => i), st.map((s: any) => s.name), st.map((s: any) => s.weight),
  ]);
  if (p.assigneeId && p.assigneeId !== creator.id) {
    await notify(p.assigneeId, 'task', 'Новое задание', title + (due ? ` · срок ${due}` : ''));
  }
  await log(creator.id, row.id, 'task_created', title);
  return row.id as number;
}

export async function setStageProgress(user: any, taskId: number, stageId: number, progress: number) {
  const t = await getTask(taskId);
  if (t.assignee_id !== user.id && !isSup(user)) throw new HttpError(403, 'Нет доступа к заданию');
  if (t.status === 'review') throw new HttpError(400, 'Задание на проверке — изменения заблокированы');
  if (t.status === 'done') throw new HttpError(400, 'Задание уже принято');
  const st = await one('SELECT * FROM stages WHERE id=$1 AND task_id=$2', [stageId, taskId]);
  if (!st) throw new HttpError(404, 'Этап не найден');
  if (st.status === 'accepted') throw new HttpError(400, 'Этап уже принят проверяющим');
  const pr = Math.max(0, Math.min(100, Math.round(Number(progress) || 0)));
  const status = pr === 0 ? 'not_started' : pr < 100 ? 'in_progress' : 'ready';
  await q('UPDATE stages SET progress=$1,status=$2 WHERE id=$3', [pr, status, stageId]);
  if (pr > 0 && (t.status === 'todo' || t.status === 'rework')) {
    await q("UPDATE tasks SET status='in_progress',updated_at=now() WHERE id=$1", [taskId]);
  } else {
    await q('UPDATE tasks SET updated_at=now() WHERE id=$1', [taskId]);
  }
  await log(user.id, taskId, 'stage_progress', `${st.name}: ${pr}%`);
  return { stageId, progress: pr, status };
}

export async function submitTask(user: any, taskId: number, note = '') {
  const t = await getTask(taskId);
  if (t.assignee_id !== user.id) throw new HttpError(403, 'Отправить результат может только исполнитель');
  if (t.status === 'review') throw new HttpError(400, 'Результат уже на проверке');
  if (t.status === 'done') throw new HttpError(400, 'Задание уже принято');
  const ready = await one("SELECT COUNT(*)::int AS c FROM stages WHERE task_id=$1 AND status='ready'", [taskId]);
  if (!ready.c) throw new HttpError(400, 'Нет этапов со 100% — доведите хотя бы один этап до готовности');
  const files = await one('SELECT COUNT(*)::int AS c FROM files WHERE task_id=$1', [taskId]);
  if (!files.c) throw new HttpError(400, 'Прикрепите хотя бы один файл или ссылку на результат');
  await q('INSERT INTO submissions(task_id,user_id,note) VALUES($1,$2,$3)', [taskId, user.id, note]);
  await q("UPDATE tasks SET status='review',updated_at=now() WHERE id=$1", [taskId]);
  await q('UPDATE sessions SET ended_at=now() WHERE user_id=$1 AND task_id=$2 AND ended_at IS NULL', [user.id, taskId]);
  await notifySupervisors('review', 'Результат на проверку', `${user.name}: «${t.title}»`, null, user.id);
  await log(user.id, taskId, 'submitted', t.title);
  return { ok: true };
}

export async function reviewDecide(reviewer: any, submissionId: number, decision: string, comment = '', stageIds?: number[]) {
  const sub = await one('SELECT * FROM submissions WHERE id=$1', [submissionId]);
  if (!sub) throw new HttpError(404, 'Отправка не найдена');
  if (sub.status !== 'pending') throw new HttpError(400, 'Эта отправка уже проверена');
  if (!['accept', 'rework'].includes(decision)) throw new HttpError(400, 'Неверное решение');
  if (decision === 'rework' && !String(comment).trim()) throw new HttpError(400, 'Для возврата на доработку нужен комментарий');
  const t = await getTask(sub.task_id);
  const newStageStatus = decision === 'accept' ? 'accepted' : 'rework';
  if (stageIds && stageIds.length) {
    await q("UPDATE stages SET status=$1 WHERE task_id=$2 AND status='ready' AND id = ANY($3::int[])", [newStageStatus, t.id, stageIds]);
  } else {
    await q("UPDATE stages SET status=$1 WHERE task_id=$2 AND status='ready'", [newStageStatus, t.id]);
  }
  await q('UPDATE submissions SET status=$1,reviewer_id=$2,review_comment=$3,reviewed_at=now() WHERE id=$4', [
    decision === 'accept' ? 'accepted' : 'rework', reviewer.id, comment || '', submissionId,
  ]);
  const left = await one("SELECT COUNT(*)::int AS c FROM stages WHERE task_id=$1 AND status<>'accepted'", [t.id]);
  const stillReady = await one("SELECT COUNT(*)::int AS c FROM stages WHERE task_id=$1 AND status='ready'", [t.id]);
  let status = 'in_progress';
  if (left.c === 0) status = 'done';
  else if (decision === 'rework' || stillReady.c > 0) status = 'rework';
  await q('UPDATE tasks SET status=$1,updated_at=now() WHERE id=$2', [status, t.id]);
  if (t.assignee_id) {
    await notify(
      t.assignee_id, decision === 'accept' ? 'accepted' : 'warning',
      decision === 'accept' ? (status === 'done' ? 'Задание принято полностью' : 'Этапы приняты') : 'Возврат на доработку',
      `«${t.title}»${comment ? ': ' + comment : ''}`
    );
  }
  await log(reviewer.id, t.id, decision === 'accept' ? 'accepted' : 'rework', `${t.title}${comment ? ' — ' + comment : ''}`);
  return { status };
}

export async function activeSession(userId: number) {
  return one(
    `SELECT s.id,s.task_id,s.started_at,t.title AS task_title,p.name AS project_name
     FROM sessions s JOIN tasks t ON t.id=s.task_id LEFT JOIN projects p ON p.id=t.project_id
     WHERE s.user_id=$1 AND s.ended_at IS NULL ORDER BY s.started_at DESC LIMIT 1`,
    [userId]
  );
}

export async function startTimer(user: any, taskId: number) {
  const t = await getTask(taskId);
  if (t.assignee_id !== user.id) throw new HttpError(403, 'Таймер можно запускать только по своим заданиям');
  if (t.status === 'review' || t.status === 'done') throw new HttpError(400, 'Задание уже сдано — таймер недоступен');
  await q('UPDATE sessions SET ended_at=now() WHERE user_id=$1 AND ended_at IS NULL', [user.id]);
  await q('INSERT INTO sessions(task_id,user_id) VALUES($1,$2)', [taskId, user.id]);
  if (t.status === 'todo' || t.status === 'rework') await q("UPDATE tasks SET status='in_progress',updated_at=now() WHERE id=$1", [taskId]);
  await log(user.id, taskId, 'timer_start', t.title);
  return { ok: true, title: t.title };
}

export async function stopTimer(user: any) {
  const a = await activeSession(user.id);
  if (!a) throw new HttpError(400, 'Нет активной сессии');
  await q('UPDATE sessions SET ended_at=now() WHERE id=$1', [a.id]);
  await log(user.id, a.task_id, 'timer_stop', a.task_title);
  return { ok: true, title: a.task_title };
}

export async function findUserByName(name: string, onlyActive = true) {
  const n = String(name || '').trim();
  if (!n) throw new HttpError(400, 'Не указан сотрудник');
  if (/^\d+$/.test(n)) {
    const u = await one('SELECT * FROM users WHERE id=$1', [Number(n)]);
    if (u) return u;
  }
  const rows = await q(
    `SELECT * FROM users WHERE ${onlyActive ? 'active AND ' : ''}(name ILIKE $1 OR email ILIKE $1 OR initials ILIKE $2) ORDER BY id`,
    ['%' + n + '%', n]
  );
  if (rows.length === 0) throw new HttpError(404, `Сотрудник «${n}» не найден`);
  if (rows.length > 1) {
    const exact = rows.find((r: any) => r.name.toLowerCase() === n.toLowerCase());
    if (exact) return exact;
    throw new HttpError(400, `Найдено несколько сотрудников: ${rows.map((r: any) => r.name).join(', ')}. Уточните.`);
  }
  return rows[0];
}

export async function findTaskByRef(ref: any) {
  const s = String(ref ?? '').trim().replace(/^#/, '');
  if (!s) throw new HttpError(400, 'Не указано задание');
  if (/^\d+$/.test(s)) return getTask(Number(s));
  const rows = await q(TASK_SELECT + ' WHERE t.title ILIKE $1 ORDER BY t.id DESC LIMIT 6', ['%' + s + '%']);
  if (rows.length === 0) throw new HttpError(404, `Задание «${s}» не найдено`);
  if (rows.length > 1) {
    const exact = rows.find((r: any) => r.title.toLowerCase() === s.toLowerCase());
    if (exact) return exact;
    throw new HttpError(400, `Найдено несколько заданий: ${rows.map((r: any) => `#${r.id} ${r.title}`).join('; ')}. Уточните.`);
  }
  return rows[0];
}

export async function findProjectByName(name: string) {
  const n = String(name || '').trim();
  if (!n) return null;
  if (/^\d+$/.test(n)) return one('SELECT * FROM projects WHERE id=$1', [Number(n)]);
  const rows = await q('SELECT * FROM projects WHERE name ILIKE $1 ORDER BY id', ['%' + n + '%']);
  if (rows.length === 0) throw new HttpError(404, `Проект «${n}» не найден`);
  return rows[0];
}
