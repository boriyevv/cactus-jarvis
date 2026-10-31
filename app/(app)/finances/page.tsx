'use client';
import { fmtMoney, useApi } from '@/lib/client';
import { ErrorBox, Loading, PageHead, Progress, Stat } from '@/components/ui';

export default function Finances() {
  const { data, error, loading } = useApi<any>('/api/finance', 120000);
  if (loading && !data) return <Loading />;
  if (error) return <ErrorBox msg={error} />;
  const sum = (k: string) => data.projects.reduce((a: number, p: any) => a + (p[k] || 0), 0);
  return (
    <>
      <PageHead title="Финансы" sub="Трудозатраты считаются по реальным сессиям таймера × часовая ставка сотрудника (ставка задаётся в разделе «Сотрудники»)." />
      <div className="grid stats">
        <Stat label="Бюджеты проектов" value={fmtMoney(sum('budget'))} />
        <Stat label="План трудозатрат" value={fmtMoney(sum('planned_cost'))} foot="плановые часы × ставка" />
        <Stat label="Факт трудозатрат" value={fmtMoney(sum('actual_cost'))} foot={`${Math.round(sum('hours') * 10) / 10} ч по таймеру`} />
        <Stat label="Остаток бюджета" value={fmtMoney(sum('budget') - sum('actual_cost'))} />
      </div>
      <div className="grid two">
        <div className="card">
          <div className="section-head"><h2>По проектам</h2></div>
          <div className="tbl-wrap"><table className="tbl">
            <thead><tr><th>Проект</th><th>Бюджет</th><th>План</th><th>Факт</th><th>Использовано</th></tr></thead>
            <tbody>{data.projects.map((p: any) => {
              const pct = p.budget ? (p.actual_cost / p.budget) * 100 : 0;
              return <tr key={p.id}><td><b>{p.name}</b><div className="small muted">{p.direction}</div></td><td>{fmtMoney(p.budget)}</td><td>{fmtMoney(p.planned_cost)}</td><td>{fmtMoney(p.actual_cost)}<div className="small muted">{Math.round(p.hours * 10) / 10} ч</div></td><td style={{ minWidth: 120 }}><Progress value={pct} tone={pct > 90 ? 'blue' : ''} /></td></tr>;
            })}</tbody>
          </table></div>
        </div>
        <div className="card">
          <div className="section-head"><h2>Сотрудники</h2></div>
          {data.employees.map((e: any) => (
            <div key={e.id} className="feed-item row sp"><div><b className="small">{e.name}</b><div className="small muted">{e.job_title} · {fmtMoney(e.hourly_rate)}/ч</div></div><div style={{ textAlign: 'right' }}><b>{fmtMoney(e.hours * e.hourly_rate)}</b><div className="small muted">{Math.round(e.hours * 10) / 10} ч</div></div></div>
          ))}
        </div>
      </div>
    </>
  );
}
