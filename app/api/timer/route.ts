import { handler, body, need } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { activeSession, startTimer, stopTimer } from '@/lib/tasks';

export const dynamic = 'force-dynamic';

export const GET = handler(async () => {
  const u = await requireUser();
  return { active: await activeSession(u.id) };
});

export const POST = handler(async (req) => {
  const u = await requireUser();
  const b = await body(req);
  if (b.action === 'stop') return stopTimer(u);
  need(b.taskId, 'Не указано задание');
  return startTimer(u, Number(b.taskId));
});
