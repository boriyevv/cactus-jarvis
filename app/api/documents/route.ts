import { makeCrud } from '@/lib/crud';
import { requireSup } from '@/lib/perm';

export const dynamic = 'force-dynamic';

const crud = makeCrud({
  table: 'documents', alias: 'd', cols: ['title', 'type', 'status', 'owner_id', 'url'],
  select: 'SELECT d.id,d.title,d.type,d.status,d.url,d.owner_id,u.name AS owner_name,d.created_at FROM documents d LEFT JOIN users u ON u.id=d.owner_id',
  guard: (u) => requireSup(u),
});
export const GET = crud.GET;
export const POST = crud.POST;
export const PATCH = crud.PATCH;
export const DELETE = crud.DELETE;
