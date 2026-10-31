'use client';
import { useState } from 'react';
import { api, refreshAll, toast, useApi } from '@/lib/client';
import { TYPES } from '@/lib/templates.mjs';
import { Field, Modal } from './ui';

export default function TaskForm({ onClose, presetAssignee, onCreated }: { onClose: () => void; presetAssignee?: number; onCreated?: (id: number) => void }) {
  const projects = useApi<any>('/api/projects');
  const team = useApi<any>('/api/team');
  const [f, setF] = useState<any>({ title: '', projectId: '', type: 'АР', assigneeId: presetAssignee || '', dueDate: '', plannedHours: 8, complexity: 3, description: '' });
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: any) => setF((x: any) => ({ ...x, [k]: v }));
  const save = async () => {
    if (!f.title.trim()) return toast('Укажите название задания', 'err');
    if (!f.assigneeId) return toast('Выберите исполнителя', 'err');
    setBusy(true);
    try {
      const r = await api('/api/tasks', 'POST', { ...f, assigneeId: Number(f.assigneeId), projectId: f.projectId ? Number(f.projectId) : null });
      toast('Задание создано, этапы добавлены по типу');
      refreshAll(); onCreated?.(r.id); onClose();
    } catch (e: any) { toast(e.message, 'err'); setBusy(false); }
  };
  const members = (team.data?.members || []).filter((m: any) => m.active);
  return (
    <Modal title="Новое задание" onClose={onClose} footer={<><button className="btn secondary" onClick={onClose}>Отмена</button><button className="btn primary" onClick={save} disabled={busy}>{busy ? 'Создаём…' : 'Создать задание'}</button></>}>
      <Field label="Название *"><input value={f.title} onChange={(e) => set('title', e.target.value)} autoFocus /></Field>
      <div className="form-grid">
        <Field label="Проект"><select value={f.projectId} onChange={(e) => set('projectId', e.target.value)}><option value="">— без проекта —</option>{(projects.data?.items || []).map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
        <Field label="Тип задания" hint="От типа зависят этапы и их веса"><select value={f.type} onChange={(e) => set('type', e.target.value)}>{TYPES.map((t: string) => <option key={t}>{t}</option>)}</select></Field>
        <Field label="Исполнитель *"><select value={f.assigneeId} onChange={(e) => set('assigneeId', e.target.value)}><option value="">— выберите —</option>{members.map((m: any) => <option key={m.id} value={m.id}>{m.name} — {m.job_title}</option>)}</select></Field>
        <Field label="Срок"><input type="date" value={f.dueDate} onChange={(e) => set('dueDate', e.target.value)} /></Field>
        <Field label="План, часов"><input type="number" min={0} value={f.plannedHours} onChange={(e) => set('plannedHours', e.target.value)} /></Field>
        <Field label="Сложность (1–5)"><input type="number" min={1} max={5} value={f.complexity} onChange={(e) => set('complexity', e.target.value)} /></Field>
      </div>
      <Field label="Описание"><textarea value={f.description} onChange={(e) => set('description', e.target.value)} /></Field>
    </Modal>
  );
}
