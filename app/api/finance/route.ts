import { handler } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { requireFounder } from '@/lib/perm';
import { financeByProject, financeByEmployee } from '@/lib/finance';

export const dynamic = 'force-dynamic';
export const GET = handler(async () => {
  const u = await requireUser();
  requireFounder(u);
  return { projects: await financeByProject(), employees: await financeByEmployee() };
});
