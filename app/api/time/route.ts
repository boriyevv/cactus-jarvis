import { q } from '@/lib/db';
import { handler } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { isSup } from '@/lib/perm';
import { periodStart } from '@/lib/stats';

export const dynamic = 'force-dynamic';

export const GET = handler(async (req) => {
  const u = await requireUser();
  const period = new URL(req.url).searchParams.get('period') || 'week';
  const start = periodStart(period);
  const sup = isSup(u);
  const sessions = await q(
    `SELECT s.id,s.started_at,s.ended_at,t.id AS task_id,t.title,us.name AS user_name,
       EXTRACT(EPOCH FROM (COALESCE(s.ended_at,now())-s.started_at))::float AS sec
     FROM sessions s JOIN tasks t ON t.id=s.task_id JOIN users us ON us.id=s.user_id
     WHERE (s.started_at AT TIME ZONE 'Asia/Tashkent')::date >= ${start} ${sup ? '' : 'AND s.user_id=' + Number(u.id)}
     ORDER BY s.started_at DESC LIMIT 60`
  );
  const byUser = sup
    ? await q(
        `SELECT us.id,us.name,us.initials,us.job_title,
           COALESCE(SUM(EXTRACT(EPOCH FROM (COALESCE(s.ended_at,now())-s.started_at))),0)::float AS sec
         FROM users us LEFT JOIN sessions s ON s.user_id=us.id AND (s.started_at AT TIME ZONE 'Asia/Tashkent')::date >= ${start}
         WHERE us.active AND us.role<>'founder' GROUP BY us.id ORDER BY us.id`
      )
    : [];
  return { sessions, byUser };
});
