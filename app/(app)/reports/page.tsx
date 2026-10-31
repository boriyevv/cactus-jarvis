'use client';
import { useState } from 'react';
import { fmtDate, useApi, useMe } from '@/lib/client';
import { Empty, ErrorBox, Loading, PageHead, Tag } from '@/components/ui';
import ReportForm from '@/components/ReportForm';

export default function Reports() {
  const me = useMe();
  const { data, error, loading } = useApi<any>('/api/reports');
  const [open, setOpen] = useState(false);
  if (loading && !data) return <Loading />;
  if (error) return <ErrorBox msg={error} />;
  return (
    <>
      <PageHead title="Ежедневные отчёты" sub="Что сделано, сколько потрачено и что мешает." actions={<button className="btn primary" onClick={() => setOpen(true)}>＋ Новый отчёт</button>} />
      <div className="card">
        {!data.reports.length && <Empty>Отчётов пока нет</Empty>}
        {data.reports.map((r: any) => (
          <div key={r.id} className="feed-item">
            <span className={'dot ' + (r.blockers ? 'warn' : '')} />
            <div style={{ flex: 1 }}>
              <div className="row sp wrap"><b>{r.user_name} · {fmtDate(r.report_date)}</b><span className="small muted">{r.hours} ч{r.percent != null ? ` · ${r.percent}%` : ''}</span></div>
              {r.task_title && <div className="small muted">{r.task_title}{r.stage_name ? ` → ${r.stage_name}` : ''}</div>}
              <div style={{ marginTop: 4 }}>{r.done_text}</div>
              {r.blockers && <div style={{ marginTop: 4 }}><Tag tone="warn">Мешает</Tag> <span className="small">{r.blockers}</span></div>}
            </div>
          </div>
        ))}
      </div>
      {open && <ReportForm onClose={() => setOpen(false)} />}
    </>
  );
}
