import { q } from '@/lib/db';
import { handler, body, need } from '@/lib/api';
import { requireUser, hashPassword } from '@/lib/auth';
import { isSup, canManageUsers } from '@/lib/perm';
import { runTool } from '@/lib/jarvis-tools';
import { periodStart } from '@/lib/stats';
import { findUserByName } from '@/lib/tasks';
import { randomPassword } from '@/lib/util';
import { HttpError } from '@/lib/api';

export const dynamic = 'force-dynamic';

export const GET = handler(async () => {
  const u = await requireUser();
  if (!isSup(u) && !canManageUsers(u)) throw new HttpError(403, 'Нет доступа к списку сотрудников');
  const seeStats = isSup(u);
  const members = await q(
    `SELECT u.id,u.name,u.email,u.role,u.job_title,u.department,u.initials,u.hourly_rate,u.active,
      ${seeStats ? `COUNT(t.id)::int` : '0'} AS tasks,
      ${seeStats ? `COUNT(t.id) FILTER (WHERE t.status='done')::int` : '0'} AS done,
      ${seeStats ? `COALESCE((SELECT SUM(EXTRACT(EPOCH FROM (COALESCE(s.ended_at,now())-s.started_at)))/3600 FROM sessions s WHERE s.user_id=u.id AND (s.started_at AT TIME ZONE 'Asia/Tashkent')::date >= ${periodStart('week')}),0)::float` : '0'} AS hours_week
     FROM users u LEFT JOIN tasks t ON t.assignee_id=u.id ${seeStats ? '' : 'AND false'} GROUP BY u.id ORDER BY u.active DESC, u.id`
  );
  return { members };
});

export const POST = handler(async (req) => {
  const u = await requireUser();
  const b = await body(req);
  need(b.name && b.job_title, 'Укажите имя и должность');
  return runTool('add_employee', b, u);
});

export const PATCH = handler(async (req) => {
  const u = await requireUser();
  const b = await body(req);
  need(b.id, 'Не указан сотрудник');
  if (b.resetPassword) {
    if (!canManageUsers(u)) throw new HttpError(403, 'Недостаточно прав');
    const target = await findUserByName(String(b.id), false);
    if (target.role === 'founder' && u.role !== 'founder') throw new HttpError(403, 'Нельзя менять руководителя');
    const password = randomPassword();
    await q('UPDATE users SET password_hash=$1 WHERE id=$2', [hashPassword(password), target.id]);
    return { password };
  }
  return runTool('update_employee', { employee: String(b.id), job_title: b.job_title, department: b.department, role: b.role, hourly_rate: b.hourly_rate, active: b.active, confirm: true }, u);
});
