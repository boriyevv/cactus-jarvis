'use client';
import { useState } from 'react';
import { api, fmtMoney, refreshAll, toast, useApi, useMe } from '@/lib/client';
import { Empty, ErrorBox, Field, Loading, Modal, PageHead, Progress } from '@/components/ui';

export default function Projects() {
  const me = useMe();
  const stats = useApi<any>('/api/stats?period=month');
  const list = useApi<any>('/api/projects');
  const [open, setOpen] = useState<any>(undefined);
  const [f, setF] = useState<any>({ name: '', direction: 'Архитектура', budget: 0, description: '' });
  const set = (k: string, v: any) => setF((x: any) => ({ ...x, [k]: v }));
  const openForm = (p?: any) => { setF(p ? { name: p.name, direction: p.direction, budget: p.budget || 0, description: p.description || '' } : { name: '', direction: 'Архитектура', budget: 0, description: '' }); setOpen(p || null); };
  const save = async () => {
    if (!f.name.trim()) return toast('Введите название проекта', 'err');
    try {
      const body: any = { name: f.name, direction: f.direction, description: f.description };
      if (me.role === 'founder') body.budget = Number(f.budget) || 0;
      if (open) await api('/api/projects', 'PATCH', { id: open.id, ...body }); else await api('/api/projects', 'POST', body);
      toast('Проект сохранён'); refreshAll(); setOpen(undefined);
    } catch (e: any) { toast(e.message, 'err'); }
  };
  const del = async (p: any) => { if (!confirm(`Удалить проект «${p.name}»? Задания останутся без проекта.`)) return; try { await api('/api/projects?id=' + p.id, 'DELETE'); refreshAll(); } catch (e: any) { toast(e.message, 'err'); } };
  if (stats.loading && !stats.data) return <Loading />;
  if (stats.error) return <ErrorBox msg={stats.error} />;
  const meta: Record<number, any> = {};
  (list.data?.items || []).forEach((p: any) => (meta[p.id] = p));
  return (
    <>
      <PageHead title="Портфель проектов" sub="Прогресс считается по заявленному выполнению заданий проекта." actions={<button className="btn primary" onClick={() => openForm()}>＋ Добавить проект</button>} />
      {!stats.data.projects.length && <div className="card"><Empty>Проектов пока нет</Empty></div>}
      <div className="grid auto">
        {stats.data.projects.map((p: any) => (
          <div key={p.id} className="card">
            <div className="row sp"><h3 style={{ margin: 0 }}>{p.name}</h3><b style={{ fontSize: 22 }}>{Math.round(p.progress)}%</b></div>
            <div className="small muted">{p.direction} · заданий {p.tasks}, принято {p.done}</div>
            <Progress value={p.progress} />
            {me.role === 'founder' && <div className="small" style={{ marginTop: 8 }}>Бюджет: <b>{fmtMoney(meta[p.id]?.budget || 0)}</b></div>}
            <div className="row" style={{ marginTop: 12 }}>
              <button className="btn small secondary" onClick={() => openForm(meta[p.id] || p)}>Изменить</button>
              <button className="btn small ghost" onClick={() => del(p)}>Удалить</button>
            </div>
          </div>
        ))}
      </div>
      {open !== undefined && (
        <Modal title={open ? 'Изменить проект' : 'Новый проект'} onClose={() => setOpen(undefined)} footer={<><button className="btn secondary" onClick={() => setOpen(undefined)}>Отмена</button><button className="btn primary" onClick={save}>Сохранить</button></>}>
          <Field label="Название *"><input value={f.name} onChange={(e) => set('name', e.target.value)} autoFocus /></Field>
          <div className="form-grid">
            <Field label="Направление"><input value={f.direction} onChange={(e) => set('direction', e.target.value)} /></Field>
            {me.role === 'founder' && <Field label="Бюджет, сум"><input type="number" min={0} value={f.budget} onChange={(e) => set('budget', e.target.value)} /></Field>}
          </div>
          <Field label="Описание"><textarea value={f.description} onChange={(e) => set('description', e.target.value)} /></Field>
        </Modal>
      )}
    </>
  );
}
