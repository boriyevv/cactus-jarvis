'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useApi, useMe, ACTION_LABEL, fmtDate, fmtDateTime, STATUS } from '@/lib/client';
import { isSupRole } from '@/lib/roles';
import { Avatar, ErrorBox, Loading, Progress, Stat, Tabs, Tag, StatusTag } from '@/components/ui';

export default function Dashboard() {
  const me = useMe();
  const [period, setPeriod] = useState('week');
  const { data, error, loading } = useApi<any>(`/api/stats?period=${period}`, 60000);
  const sup = isSupRole(me.role);
  if (loading && !data) return <Loading />;
  if (error) return <ErrorBox msg={error} />;
  const c = data.counts;
  const maxH = Math.max(1, ...(data.employees || []).map((e: any) => e.hours));
  return (
    <>
      <div className="card hero" style={{ marginBottom: 16 }}>
        <div className="row sp wrap">
          <div>
            <h1 style={{ margin: 0, fontSize: 22 }}>Добро пожаловать, {me.name.split(' ')[0]}</h1>
            <p>{sup ? 'Картина всей студии: задания, команда, проверка, время.' : 'Ваши задания, сроки и учёт времени.'} Скажите «Jarvis», чтобы спросить обо всём голосом.</p>
          </div>
          <Tabs value={period} onChange={setPeriod} items={[['today', 'Сегодня'], ['week', 'Неделя'], ['month', 'Месяц']]} />
        </div>
      </div>
      <div className="grid stats">
        <Stat label={sup ? 'Сотрудников' : 'Мои задания'} value={sup ? data.team : c.total} foot={sup ? 'активных в системе' : 'всего назначено'} />
        <Stat label="Выполнено" value={`${data.completion}%`} foot={`${c.done} из ${c.total} заданий · за период ${c.done_period}`} />
        <Stat label="Отработано" value={`${Math.round(data.hours * 10) / 10} ч`} foot="по таймеру за период" />
        <Stat label="Нужно внимания" value={c.overdue + c.review} tone={c.overdue ? 'bad' : ''} foot={`просрочено ${c.overdue} · на проверке ${c.review}`} />
      </div>

      <div className="grid two" style={{ marginBottom: 14 }}>
        <div className="card">
          <div className="section-head"><h2>Требует внимания</h2><Link href="/tasks" className="btn small secondary">Все задания →</Link></div>
          {!data.attention.length && <div className="empty">Просрочек и очереди на проверку нет 🎉</div>}
          {data.attention.map((t: any) => (
            <Link key={t.id} href={`/tasks/${t.id}`} className="feed-item">
              <span className={'dot ' + (t.overdue ? 'red' : 'warn')} />
              <div style={{ flex: 1 }}>
                <b>{t.title}</b>
                <div className="small muted">{t.assignee_name || 'не назначено'} · срок {fmtDate(t.due_date)}</div>
              </div>
              {t.overdue ? <Tag tone="red">Просрочено</Tag> : <StatusTag s={t.status} />}
            </Link>
          ))}
        </div>
        <div className="card">
          <div className="section-head"><h2>Последние события</h2><Link href="/timeline" className="btn small secondary">Timeline →</Link></div>
          {!data.activity.length && <div className="empty">Событий пока нет</div>}
          {data.activity.map((a: any) => (
            <div key={a.id} className="feed-item">
              <span className="dot" />
              <div><b className="small">{ACTION_LABEL[a.action] || a.action}</b><div className="small muted">{a.user_name} · {a.detail}</div><div className="small muted">{fmtDateTime(a.created_at)}</div></div>
            </div>
          ))}
        </div>
      </div>

      {sup && (
        <div className="grid two">
          <div className="card">
            <div className="section-head"><h2>Сотрудники</h2><small>выполнение и часы за период</small></div>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead><tr><th>Сотрудник</th><th>Заданий</th><th>Выполнено</th><th>Средний прогресс</th><th>Просрочено</th><th>Часы</th></tr></thead>
                <tbody>
                  {data.employees.map((e: any) => (
                    <tr key={e.id}>
                      <td><div className="who"><Avatar text={e.initials} size={30} /><div><b>{e.name}</b><small>{e.job_title}</small></div></div></td>
                      <td>{e.tasks}</td>
                      <td>{e.tasks ? Math.round((e.done / e.tasks) * 100) : 0}% <small className="muted">({e.done})</small></td>
                      <td style={{ minWidth: 130 }}><Progress value={e.avg_claimed} /></td>
                      <td>{e.overdue ? <Tag tone="red">{e.overdue}</Tag> : '—'}</td>
                      <td>{Math.round(e.hours * 10) / 10}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="card">
            <div className="section-head"><h2>Проекты</h2><Link href="/projects" className="btn small secondary">Портфель →</Link></div>
            <div className="bars">
              {data.projects.map((p: any) => (
                <div key={p.id}>
                  <div className="row sp"><b className="small">{p.name}</b><small className="muted">{p.done}/{p.tasks} заданий</small></div>
                  <Progress value={p.progress} />
                </div>
              ))}
              {!data.projects.length && <div className="empty">Проектов нет</div>}
            </div>
            <div className="section-head" style={{ marginTop: 22 }}><h2>Часы по сотрудникам</h2></div>
            <div className="bars">
              {data.employees.map((e: any) => (
                <div key={e.id} className="bar-row"><span>{e.name.split(' ').slice(-1)[0]}</span><div className="bar"><span style={{ width: (e.hours / maxH) * 100 + '%' }} /></div><b>{Math.round(e.hours * 10) / 10} ч</b></div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
