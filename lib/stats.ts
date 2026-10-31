import { q, one } from './db';
import { isSup } from './perm';
import { TODAY, CLAIMED } from './tasks';

export function periodStart(period: string) {
  if (period === 'today') return TODAY;
  if (period === 'month') return `(${TODAY} - 29)`;
  return `(${TODAY} - 6)`;
}

export async function overview(user: any, period = 'week') {
  const sup = isSup(user);
  const start = periodStart(period);
  const scope = sup ? '' : ` AND t.assignee_id=${Number(user.id)}`;
  const sScope = sup ? '' : ` AND s.user_id=${Number(user.id)}`;

  const counts = await one(
    `SELECT COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE t.status='done')::int AS done,
       COUNT(*) FILTER (WHERE t.status='review')::int AS review,
       COUNT(*) FILTER (WHERE t.status IN ('in_progress','rework'))::int AS active,
       COUNT(*) FILTER (WHERE t.status<>'done' AND t.due_date < ${TODAY})::int AS overdue,
       COUNT(*) FILTER (WHERE t.status='done' AND (t.updated_at AT TIME ZONE 'Asia/Tashkent')::date >= ${start})::int AS done_period
     FROM tasks t WHERE true${scope}`
  );
  const hours = await one(
    `SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (COALESCE(s.ended_at,now())-s.started_at)))/3600,0)::float AS h
     FROM sessions s WHERE (s.started_at AT TIME ZONE 'Asia/Tashkent')::date >= ${start}${sScope}`
  );
  const team = await one("SELECT COUNT(*)::int AS c FROM users WHERE active");

  let employees: any[] = [];
  let projects: any[] = [];
  if (sup) {
    employees = await q(
      `SELECT u.id,u.name,u.initials,u.job_title,u.department,
         COUNT(t.id)::int AS tasks,
         COUNT(t.id) FILTER (WHERE t.status='done')::int AS done,
         COUNT(t.id) FILTER (WHERE t.status<>'done' AND t.due_date < ${TODAY})::int AS overdue,
         COALESCE(AVG(${CLAIMED}) FILTER (WHERE t.status<>'done'),0)::float AS avg_claimed,
         COALESCE((SELECT SUM(EXTRACT(EPOCH FROM (COALESCE(s.ended_at,now())-s.started_at)))/3600 FROM sessions s
            WHERE s.user_id=u.id AND (s.started_at AT TIME ZONE 'Asia/Tashkent')::date >= ${start}),0)::float AS hours
       FROM users u LEFT JOIN tasks t ON t.assignee_id=u.id
       WHERE u.active AND u.role<>'founder' GROUP BY u.id ORDER BY u.id`
    );
    projects = await q(
      `SELECT p.id,p.name,p.direction,COUNT(t.id)::int AS tasks,
         COUNT(t.id) FILTER (WHERE t.status='done')::int AS done,
         COALESCE(AVG(${CLAIMED}),0)::float AS progress
       FROM projects p LEFT JOIN tasks t ON t.project_id=p.id GROUP BY p.id ORDER BY p.id`
    );
  }
  const attention = await q(
    `SELECT t.id,t.title,t.status,t.due_date::text AS due_date,u.name AS assignee_name,
       (t.status<>'done' AND t.due_date < ${TODAY}) AS overdue
     FROM tasks t LEFT JOIN users u ON u.id=t.assignee_id
     WHERE (t.status='review' OR (t.status<>'done' AND t.due_date < ${TODAY}))${scope}
     ORDER BY t.due_date NULLS LAST LIMIT 8`
  );
  const activity = await q(
    `SELECT a.id,a.action,a.detail,a.created_at,a.task_id,u.name AS user_name FROM activity a
     LEFT JOIN users u ON u.id=a.user_id ${sup ? '' : 'WHERE a.user_id=' + Number(user.id)}
     ORDER BY a.id DESC LIMIT 8`
  );
  return {
    counts, hours: hours.h, team: team.c, employees, projects, attention, activity,
    completion: counts.total ? Math.round((counts.done / counts.total) * 100) : 0,
  };
}
