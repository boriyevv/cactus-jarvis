'use client';
import Link from 'next/link';
import { ACTION_LABEL, fmtDateTime, useApi } from '@/lib/client';
import { Empty, ErrorBox, Loading, PageHead } from '@/components/ui';

export default function Timeline() {
  const { data, error, loading } = useApi<any>('/api/activity', 60000);
  if (loading && !data) return <Loading />;
  if (error) return <ErrorBox msg={error} />;
  return (
    <>
      <PageHead title="Timeline" sub="Журнал действий в системе: задания, этапы, таймер, проверки, сотрудники и действия Jarvis." />
      <div className="card">
        {!data.items.length && <Empty>Событий пока нет</Empty>}
        {data.items.map((a: any) => (
          <div key={a.id} className="feed-item">
            <span className={'dot ' + (a.action === 'rework' || a.action === 'warning_sent' ? 'warn' : '')} />
            <div style={{ flex: 1 }}>
              <b className="small">{ACTION_LABEL[a.action] || a.action}</b>
              <div className="small">{a.task_id ? <Link href={`/tasks/${a.task_id}`}>{a.detail}</Link> : a.detail}</div>
              <div className="small muted">{a.user_name || 'система'} · {fmtDateTime(a.created_at)}</div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
