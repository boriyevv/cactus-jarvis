import { q } from '@/lib/db';
import { handler, body } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { runWatchdog } from '@/lib/watchdog';

export const dynamic = 'force-dynamic';

export const GET = handler(async () => {
  const u = await requireUser();
  try { await runWatchdog(false); } catch (e) { console.error('watchdog', e); }
  const items = await q('SELECT id,kind,title,body,is_read,created_at FROM notifications WHERE user_id=$1 ORDER BY id DESC LIMIT 30', [u.id]);
  return { items, unread: items.filter((i: any) => !i.is_read).length };
});

export const POST = handler(async (req) => {
  const u = await requireUser();
  const b = await body(req);
  if (Array.isArray(b.ids) && b.ids.length) await q('UPDATE notifications SET is_read=true WHERE user_id=$1 AND id = ANY($2::int[])', [u.id, b.ids]);
  else await q('UPDATE notifications SET is_read=true WHERE user_id=$1', [u.id]);
  return { ok: true };
});
