import { handler } from '@/lib/api';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const GET = handler(async () => {
  const u = await requireUser();
  return { user: u };
});
