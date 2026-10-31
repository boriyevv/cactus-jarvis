'use client';
import { useState } from 'react';
import { api, refreshAll, toast, useApi, useMe } from '@/lib/client';
import { canManageUsersRole, isSupRole } from '@/lib/roles';
import { ROLE_LABEL } from '@/lib/nav';
import { Avatar, ErrorBox, Field, Loading, Modal, PageHead, Progress, Tag } from '@/components/ui';
import TaskForm from '@/components/TaskForm';

function MemberForm({ m, onClose, founder }: { m?: any; onClose: () => void; founder: boolean }) {
  const [f, setF] = useState<any>({ name: m?.name || '', job_title: m?.job_title || '', department: m?.department || '', role: m?.role || 'specialist', hourly_rate: m?.hourly_rate || 0, email: '', password: '', active: m ? m.active : true });
  const [secret, setSecret] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: any) => setF((x: any) => ({ ...x, [k]: v }));
  const save = async () => {
    if (!m && (!f.name.trim() || !f.job_title.trim())) return toast('Укажите имя и должность', 'err');
    setBusy(true);
    try {
      if (m) { await api('/api/team', 'PATCH', { id: m.id, job_title: f.job_title, department: f.department, role: founder ? f.role : undefined, hourly_rate: Number(f.hourly_rate) || 0, active: f.active }); toast('Сохранено'); refreshAll(); onClose(); }
      else { const r = await api('/api/team', 'POST', { ...f, hourly_rate: Number(f.hourly_rate) || 0 }); setSecret(r); refreshAll(); setBusy(false); }
    } catch (e: any) { toast(e.message, 'err'); setBusy(false); }
  };
  const reset = async () => {
    if (!confirm('Сбросить пароль сотрудника?')) return;
    try { const r = await api('/api/team', 'PATCH', { id: m.id, resetPassword: true }); setSecret({ email: m.email, password: r.password }); } catch (e: any) { toast(e.message, 'err'); }
  };
  if (secret) return (
    <Modal title="Данные для входа" onClose={onClose} footer={<button className="btn primary" onClick={onClose}>Готово</button>}>
      <p>Передайте сотруднику (пароль показывается один раз):</p>
      <div className="card" style={{ background: '#f4f8f5' }}><div>Email: <b>{secret.email}</b></div><div>Пароль: <b>{secret.password}</b></div></div>
    </Modal>
  );
  return (
    <Modal title={m ? `Сотрудник: ${m.name}` : 'Новый сотрудник'} onClose={onClose} footer={<><button className="btn secondary" onClick={onClose}>Отмена</button><button className="btn primary" disabled={busy} onClick={save}>{m ? 'Сохранить' : 'Добавить'}</button></>}>
      {!m && <Field label="Имя *"><input value={f.name} onChange={(e) => set('name', e.target.value)} autoFocus /></Field>}
      <div className="form-grid">
        <Field label="Должность / профессия *"><input value={f.job_title} onChange={(e) => set('job_title', e.target.value)} /></Field>
        <Field label="Отдел"><input value={f.department} onChange={(e) => set('department', e.target.value)} /></Field>
        {(founder || !m) && <Field label="Роль" hint={founder ? '' : 'Другие роли назначает ГАП'}><select value={f.role} disabled={!founder} onChange={(e) => set('role', e.target.value)}><option value="specialist">Специалист</option><option value="manager">Менеджер</option><option value="it">IT-специалист</option></select></Field>}
        <Field label="Ставка, сум/час"><input type="number" min={0} value={f.hourly_rate} onChange={(e) => set('hourly_rate', e.target.value)} /></Field>
        {!m && <Field label="Email" hint="пусто — создастся автоматически"><input value={f.email} onChange={(e) => set('email', e.target.value)} /></Field>}
        {!m && <Field label="Пароль" hint="пусто — сгенерируется"><input value={f.password} onChange={(e) => set('password', e.target.value)} /></Field>}
      </div>
      {m && (
        <div className="row wrap">
          <label className="row"><input type="checkbox" style={{ width: 'auto' }} checked={f.active} onChange={(e) => set('active', e.target.checked)} /> Активен (может входить)</label>
          <button className="btn small secondary" onClick={reset}>Сбросить пароль</button>
        </div>
      )}
    </Modal>
  );
}

export default function Team() {
  const me = useMe();
  const { data, error, loading } = useApi<any>('/api/team');
  const [edit, setEdit] = useState<any>(undefined);
  const [taskFor, setTaskFor] = useState<number | null>(null);
  const manage = canManageUsersRole(me.role);
  const sup = isSupRole(me.role);
  if (loading && !data) return <Loading />;
  if (error) return <ErrorBox msg={error} />;
  return (
    <>
      <PageHead title="Сотрудники" sub="Роли, загрузка и результаты. Новых сотрудников можно добавить и голосом: «Jarvis, добавь сотрудника…»." actions={manage && <button className="btn primary" onClick={() => setEdit(null)}>＋ Добавить сотрудника</button>} />
      <div className="grid auto">
        {data.members.map((m: any) => (
          <div key={m.id} className="card" style={m.active ? undefined : { opacity: 0.55 }}>
            <div className="row sp"><div className="who"><Avatar text={m.initials} size={42} /><div><b>{m.name}</b><small>{m.job_title}</small></div></div><Tag tone={m.role === 'founder' ? 'green' : m.role === 'manager' ? 'blue' : 'gray'}>{ROLE_LABEL[m.role]}</Tag></div>
            <div className="small muted" style={{ marginTop: 10 }}>{m.email}{m.department ? ` · ${m.department}` : ''}{!m.active && ' · отключён'}</div>
            {sup && <>
              <Progress value={m.tasks ? (m.done / m.tasks) * 100 : 0} />
              <div className="small muted">Заданий {m.tasks}, принято {m.done} · {Math.round(m.hours_week * 10) / 10} ч за неделю</div>
            </>}
            <div className="row wrap" style={{ marginTop: 12 }}>
              {sup && m.active && m.role !== 'founder' && <button className="btn small light" onClick={() => setTaskFor(m.id)}>＋ Задание</button>}
              {manage && (m.role !== 'founder' || me.role === 'founder') && <button className="btn small secondary" onClick={() => setEdit(m)}>Изменить</button>}
            </div>
          </div>
        ))}
      </div>
      {edit !== undefined && <MemberForm m={edit || undefined} founder={me.role === 'founder'} onClose={() => setEdit(undefined)} />}
      {taskFor && <TaskForm presetAssignee={taskFor} onClose={() => setTaskFor(null)} />}
    </>
  );
}
