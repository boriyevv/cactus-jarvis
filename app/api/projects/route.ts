import { makeCrud } from '@/lib/crud';
import { requireSup, isFounder } from '@/lib/perm';

export const dynamic = 'force-dynamic';

const crud = makeCrud({
  table: 'projects', alias: 'p', cols: ['name', 'direction', 'description', 'budget', 'status'],
  select: 'SELECT p.id,p.name,p.direction,p.description,p.budget,p.status,p.created_at FROM projects p',
  guard: (u, _row, method) => { if (method !== 'GET') requireSup(u); },
  mask: (u, r) => (isFounder(u) ? r : { ...r, budget: undefined }),
});
export const GET = crud.GET;
export const POST = crud.POST;
export const PATCH = crud.PATCH;
export const DELETE = crud.DELETE;
