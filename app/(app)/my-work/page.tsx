'use client';
import Link from 'next/link';
import { useState } from 'react';
import { api, fmtDate, fmtDur, refreshAll, toast, useApi, useMe } from '@/lib/client';
import { Empty, ErrorBox, Loading, PageHead, Progress, StatusTag, Tag } from '@/components/ui';
import ReportForm from '@/components/ReportForm';

export default function MyWork() {
  const me = useMe();
  const { data, error, loading } = useApi<any>('/api/tasks?mine=1');
  const timer = useApi<any>('/api/timer');
  const [report, setReport] = useState<number | null | undefined>(undefined);
  const toggle = async (t: any, active: boolean) => {
    try {
      if (active) await api('/api/timer', 'POST', { action: 'stop' });
      else await api('/api/timer', 'POST', { taskId: t.id });
      refreshAll();
    } catch (e: any) { toast(e.message, 'err'); }
  };
  if (loading && !data) return <Loading />;
  if (error) return <ErrorBox msg={error} />;
  const activeId = timer.data?.active?.task_id;
  const list = data.tasks;
  return (
    <>
      <PageHead title="Моя работа" sub="Ваши задания, ближайшие сроки, учёт времени и ежедневные отчёты." actions={<button className="btn primary" onClick={() => setReport(null)}>＋ Отчёт за день</button>} />
      {!list.length ? <div className="card"><Empty>На вас пока не назначены задания.</Empty></div> : (
        <div className="grid auto">
          {list.map((t: any) => {
            const running = activeId === t.id;
            const canTimer = ['todo', 'in_progress', 'rework'].includes(t.status);
            return (
              <div key={t.id} className="card">
                <div className="row sp"><StatusTag s={t.status} />{t.overdue && <Tag tone="red">просрочено</Tag>}</div>
                <h3 style={{ margin: '10px 0 2px' }}><Link href={`/tasks/${t.id}`}>{t.title}</Link></h3>
                <div className="small muted">{t.project_name || 'без проекта'} · срок {fmtDate(t.due_date)} · план {t.planned_hours} ч</div>
                <Progress value={t.claimed} accepted={t.accepted} />
                <div className="small muted" style={{ marginTop: 6 }}>Затрачено: {fmtDur(t.spent_sec)}</div>
                <div className="row wrap" style={{ marginTop: 12 }}>
                  {canTimer && <button className={'btn small ' + (running ? 'danger' : 'light')} onClick={() => toggle(t, running)}>{running ? '⏸ Остановить' : '▶ Начать'}</button>}
                  <Link className="btn small secondary" href={`/tasks/${t.id}`}>Этапы</Link>
                  <button className="btn small secondary" onClick={() => setReport(t.id)}>Отчёт</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <p className="small muted" style={{ marginTop: 16 }}>Если запустить таймер другой задачи, предыдущая сессия завершится автоматически. Заявленный прогресс не равен принятому результату.</p>
      {report !== undefined && <ReportForm onClose={() => setReport(undefined)} presetTask={report || undefined} />}
    </>
  );
}
