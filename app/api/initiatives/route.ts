import { makeCrud } from '@/lib/crud';
import { requireSup, requireFounder } from '@/lib/perm';

export const dynamic = 'force-dynamic';

const crud = makeCrud({
  table: 'initiatives', alias: 'i', cols: ['section', 'title', 'description', 'progress', 'status', 'owner_id', 'due_date'],
  select: 'SELECT i.id,i.section,i.title,i.description,i.progress,i.status,i.due_date::text AS due_date,i.owner_id,u.name AS owner_name FROM initiatives i LEFT JOIN users u ON u.id=i.owner_id',
  filters: { section: 'i.section' },
  guard: (u, row) => { requireSup(u); if (row?.section === 'strategy') requireFounder(u); },
});
export const GET = crud.GET;
export const POST = crud.POST;
export const PATCH = crud.PATCH;
export const DELETE = crud.DELETE;
