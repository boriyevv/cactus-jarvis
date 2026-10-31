'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { fmtDate, fmtDur, useApi, useMe, STATUS } from '@/lib/client';
import { isSupRole } from '@/lib/roles';
import { Avatar, Empty, ErrorBox, Loading, PageHead, Progress, StatusTag, Tag } from '@/components/ui';
import TaskForm from '@/components/TaskForm';

export default function Tasks() {
  const me = useMe();
  const sup = isSupRole(me.role);
  const router = useRouter();
  const [status, setStatus] = useState('');
  const [assignee, setAssignee] = useState('');
  const [project, setProject] = useState('');
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const qs = new URLSearchParams();
  if (status) qs.set('status', status);
  if (assignee) qs.set('assignee', assignee);
  if (project) qs.set('project', project);
  if (search) qs.set('q', search);
  const { data, error, loading } = useApi<any>('/api/tasks?' + qs.toString());
  const team = useApi<any>(sup ? '/api/team' : null);
  const projects = useApi<any>('/api/projects');
  return (
    <>
      <PageHead title="Все задания" sub="Сложность, плановое время, этапы с весами, сдачи и фактический прогресс." actions={sup && <button className="btn primary" onClick={() => setCreating(true)}>＋ Создать задание</button>} />
      <div className="filters">
        <input placeholder="Поиск по названию…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select value={status} onChange={(e) => setStatus(e.target.value)}><option value="">Все статусы</option>{Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select>
        <select value={project} onChange={(e) => setProject(e.target.value)}><option value="">Все проекты</option>{(projects.data?.items || []).map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
        {sup && <select value={assignee} onChange={(e) => setAssignee(e.target.value)}><option value="">Все исполнители</option>{(team.data?.members || []).map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}</select>}
      </div>
      <div className="card">
        {loading && !data ? <Loading /> : error ? <ErrorBox msg={error} /> : !data.tasks.length ? <Empty>Заданий не найдено</Empty> : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th>Задание</th><th>Исполнитель</th><th>Срок</th><th>Прогресс</th><th>Время</th><th>Статус</th></tr></thead>
              <tbody>
                {data.tasks.map((t: any) => (
                  <tr key={t.id} className="click" onClick={() => router.push(`/tasks/${t.id}`)}>
                    <td><b>{t.title}</b><div className="small muted">{t.project_name || 'без проекта'} · {t.type} · план {t.planned_hours} ч</div></td>
                    <td>{t.assignee_name ? <div className="who"><Avatar text={t.assignee_initials} size={28} /><div><b>{t.assignee_name}</b><small>{t.assignee_title}</small></div></div> : '—'}</td>
                    <td>{fmtDate(t.due_date)}{t.overdue && <div><Tag tone="red">просрочено</Tag></div>}</td>
                    <td style={{ minWidth: 170 }}><Progress value={t.claimed} accepted={t.accepted} /></td>
                    <td>{fmtDur(t.spent_sec)}<div className="small muted">из {t.planned_hours} ч</div></td>
                    <td><StatusTag s={t.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {creating && <TaskForm onClose={() => setCreating(false)} onCreated={(id) => router.push(`/tasks/${id}`)} />}
    </>
  );
}
