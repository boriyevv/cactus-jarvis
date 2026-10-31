import { q } from '@/lib/db';
import { handler } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { isSup } from '@/lib/perm';

export const dynamic = 'force-dynamic';
export const GET = handler(async () => {
  const u = await requireUser();
  const items = await q(
    `SELECT a.id,a.action,a.detail,a.created_at,a.task_id,u.name AS user_name FROM activity a
     LEFT JOIN users u ON u.id=a.user_id ${isSup(u) ? '' : 'WHERE a.user_id=' + Number(u.id)}
     ORDER BY a.id DESC LIMIT 100`
  );
  return { items };
});
