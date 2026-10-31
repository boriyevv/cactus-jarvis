import { q } from '@/lib/db';
import { handler, body, need } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { isSup, requireSup } from '@/lib/perm';
import { TASK_SELECT, createTask } from '@/lib/tasks';

export const dynamic = 'force-dynamic';

export const GET = handler(async (req) => {
  const u = await requireUser();
  const sp = new URL(req.url).searchParams;
  const w: string[] = ['true'], p: any[] = [];
  if (!isSup(u) || sp.get('mine')) { p.push(u.id); w.push(`t.assignee_id=$${p.length}`); }
  if (sp.get('status')) { p.push(sp.get('status')); w.push(`t.status=$${p.length}`); }
  if (sp.get('assignee') && isSup(u)) { p.push(Number(sp.get('assignee'))); w.push(`t.assignee_id=$${p.length}`); }
  if (sp.get('project')) { p.push(Number(sp.get('project'))); w.push(`t.project_id=$${p.length}`); }
  if (sp.get('q')) { p.push('%' + sp.get('q') + '%'); w.push(`t.title ILIKE $${p.length}`); }
  const tasks = await q(`${TASK_SELECT} WHERE ${w.join(' AND ')} ORDER BY (t.status='done'), t.due_date NULLS LAST, t.id DESC`, p);
  return { tasks };
});

export const POST = handler(async (req) => {
  const u = await requireUser();
  requireSup(u);
  const b = await body(req);
  need(b.title && b.assigneeId, 'Укажите название и исполнителя');
  const id = await createTask(u, b);
  return { id };
});
