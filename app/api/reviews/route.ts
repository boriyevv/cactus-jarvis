import { q } from '@/lib/db';
import { handler, body, need } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { isSup, requireSup } from '@/lib/perm';
import { reviewDecide } from '@/lib/tasks';

export const dynamic = 'force-dynamic';

export const GET = handler(async () => {
  const u = await requireUser();
  const own = isSup(u) ? '' : `AND s.user_id=${Number(u.id)}`;
  const rows = await q(
    `SELECT s.id,s.task_id,s.note,s.status,s.review_comment,s.created_at,s.reviewed_at,
       t.title,t.planned_hours,p.name AS project_name,a.name AS user_name,r.name AS reviewer_name,
       COALESCE((SELECT SUM(x.weight*x.progress)/100.0 FROM stages x WHERE x.task_id=t.id),0)::float AS claimed,
       COALESCE((SELECT SUM(CASE WHEN x.status='accepted' THEN x.weight ELSE 0 END) FROM stages x WHERE x.task_id=t.id),0)::float AS accepted
     FROM submissions s JOIN tasks t ON t.id=s.task_id LEFT JOIN projects p ON p.id=t.project_id
     LEFT JOIN users a ON a.id=s.user_id LEFT JOIN users r ON r.id=s.reviewer_id
     WHERE true ${own} ORDER BY (s.status='pending') DESC, s.id DESC LIMIT 60`
  );
  for (const r of rows) {
    r.stages = await q('SELECT id,name,weight,progress,status FROM stages WHERE task_id=$1 ORDER BY position', [r.task_id]);
    r.files = await q('SELECT id,name,url FROM files WHERE task_id=$1 ORDER BY id DESC', [r.task_id]);
  }
  return { reviews: rows };
});

export const POST = handler(async (req) => {
  const u = await requireUser();
  requireSup(u);
  const b = await body(req);
  need(b.submissionId, 'Не указана отправка');
  return reviewDecide(u, Number(b.submissionId), b.decision, b.comment || '', b.stageIds);
});
