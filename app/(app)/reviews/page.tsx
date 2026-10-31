'use client';
import Link from 'next/link';
import { fmtDateTime, useApi, useMe } from '@/lib/client';
import { isSupRole } from '@/lib/roles';
import { Empty, ErrorBox, Loading, PageHead, Progress, Tag } from '@/components/ui';
import ReviewBox from '@/components/ReviewBox';

export default function Reviews() {
  const me = useMe();
  const sup = isSupRole(me.role);
  const { data, error, loading } = useApi<any>('/api/reviews', 60000);
  if (loading && !data) return <Loading />;
  if (error) return <ErrorBox msg={error} />;
  const pending = data.reviews.filter((r: any) => r.status === 'pending');
  const done = data.reviews.filter((r: any) => r.status !== 'pending');
  return (
    <>
      <PageHead title="На проверке" sub="Заявленный прогресс становится принятым только после решения проверяющего." />
      <div className="grid" style={{ gap: 14 }}>
        {!pending.length && <div className="card"><Empty>Очередь проверки пуста</Empty></div>}
        {pending.map((r: any) => (
          <div key={r.id} className="card">
            <div className="row sp wrap">
              <div><h3 style={{ margin: 0 }}><Link href={`/tasks/${r.task_id}`}>{r.title}</Link></h3><div className="small muted">{r.project_name || 'без проекта'} · {r.user_name} · {fmtDateTime(r.created_at)}</div></div>
              <Tag tone="warn">ожидает</Tag>
            </div>
            <Progress value={r.claimed} accepted={r.accepted} />
            <div className="small muted" style={{ margin: '8px 0' }}>Файлы: {r.files.length ? r.files.map((f: any) => <a key={f.id} href={`/api/files/${f.id}`} target="_blank" rel="noreferrer" style={{ marginRight: 8, textDecoration: 'underline' }}>{f.name}</a>) : 'нет'}</div>
            {sup ? <ReviewBox sub={r} stages={r.stages} /> : <p className="muted small">Ожидает решения руководителя.</p>}
          </div>
        ))}
        {done.length > 0 && (
          <div className="card">
            <div className="section-head"><h2>История проверок</h2></div>
            {done.map((r: any) => (
              <div key={r.id} className="feed-item">
                <span className={'dot ' + (r.status === 'rework' ? 'red' : '')} />
                <div style={{ flex: 1 }}>
                  <Link href={`/tasks/${r.task_id}`}><b className="small">{r.title}</b></Link>
                  <div className="small muted">{r.user_name} · {r.status === 'accepted' ? 'принято' : 'возврат'} · {r.reviewer_name || ''} · {fmtDateTime(r.reviewed_at)}</div>
                  {r.review_comment && <div className="small">{r.review_comment}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
