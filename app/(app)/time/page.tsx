'use client';
import { useEffect, useState } from 'react';
import { api, fmtClock, fmtDateTime, fmtDur, refreshAll, toast, useApi, useMe } from '@/lib/client';
import { isSupRole } from '@/lib/roles';
import { Avatar, Empty, ErrorBox, Loading, PageHead, Tabs } from '@/components/ui';

export default function TimePage() {
  const me = useMe();
  const sup = isSupRole(me.role);
  const [period, setPeriod] = useState('week');
  const timer = useApi<any>('/api/timer', 30000);
  const time = useApi<any>(`/api/time?period=${period}`);
  const tasks = useApi<any>('/api/tasks?mine=1');
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const active = timer.data?.active;
  const elapsed = active ? (now - new Date(active.started_at).getTime()) / 1000 : 0;
  const act = async (body: any) => { try { await api('/api/timer', 'POST', body); refreshAll(); } catch (e: any) { toast(e.message, 'err'); } };
  if (time.loading && !time.data) return <Loading />;
  if (time.error) return <ErrorBox msg={time.error} />;
  const startable = (tasks.data?.tasks || []).filter((t: any) => ['todo', 'in_progress', 'rework'].includes(t.status));
  return (
    <>
      <PageHead title="Учёт рабочего времени" sub="Таймер фиксирует сессию только по выбранному заданию внутри системы." actions={<Tabs value={period} onChange={setPeriod} items={[['today', 'Сегодня'], ['week', 'Неделя'], ['month', 'Месяц']]} />} />
      <div className="grid two" style={{ marginBottom: 14 }}>
        <div className="card">
          <div className="muted small">{active ? 'Активная сессия' : 'Нет активной сессии'}</div>
          <div className="timer-big">{fmtClock(elapsed)}</div>
          {active ? (
            <>
              <p><b>{active.task_title}</b><br /><span className="muted small">{active.project_name} · начало {fmtDateTime(active.started_at)}</span></p>
              <button className="btn danger" onClick={() => act({ action: 'stop' })}>⏸ Остановить</button>
            </>
          ) : <p className="muted">Выберите задание справа и нажмите «Начать».</p>}
        </div>
        <div className="card">
          <div className="section-head"><h2>Доступные задания</h2></div>
          {!startable.length && <Empty>Нет заданий для запуска</Empty>}
          {startable.map((t: any) => (
            <div key={t.id} className="feed-item row sp">
              <div><b className="small">{t.title}</b><div className="small muted">{t.project_name}</div></div>
              <button className="btn small light" disabled={active?.task_id === t.id} onClick={() => act({ taskId: t.id })}>▶ Начать</button>
            </div>
          ))}
        </div>
      </div>
      <div className="grid two">
        {sup && (
          <div className="card">
            <div className="section-head"><h2>Учёт по сотрудникам</h2></div>
            {time.data.byUser.map((u: any) => (
              <div key={u.id} className="feed-item row sp"><div className="who"><Avatar text={u.initials} size={30} /><div><b>{u.name}</b><small>{u.job_title}</small></div></div><b>{fmtDur(u.sec)}</b></div>
            ))}
          </div>
        )}
        <div className="card" style={sup ? undefined : { gridColumn: '1 / -1' }}>
          <div className="section-head"><h2>Последние сессии</h2></div>
          {!time.data.sessions.length && <Empty>Сессий за период нет</Empty>}
          {time.data.sessions.map((s: any) => (
            <div key={s.id} className="feed-item row sp"><div><b className="small">{s.title}</b><div className="small muted">{sup ? s.user_name + ' · ' : ''}{fmtDateTime(s.started_at)}{!s.ended_at && ' · идёт'}</div></div><b>{fmtDur(s.sec)}</b></div>
          ))}
        </div>
      </div>
    </>
  );
}
