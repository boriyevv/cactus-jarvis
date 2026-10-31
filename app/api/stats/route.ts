import { handler } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { overview } from '@/lib/stats';

export const dynamic = 'force-dynamic';
export const GET = handler(async (req) => {
  const u = await requireUser();
  const period = new URL(req.url).searchParams.get('period') || 'week';
  return overview(u, period);
});
