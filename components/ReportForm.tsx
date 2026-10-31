'use client';
import { useState } from 'react';
import { api, refreshAll, toast, useApi } from '@/lib/client';
import { Field, Modal } from './ui';

export default function ReportForm({ onClose, presetTask }: { onClose: () => void; presetTask?: number }) {
  const tasks = useApi<any>('/api/tasks?mine=1');
  const [taskId, setTaskId] = useState<any>(presetTask || '');
  const detail = useApi<any>(taskId ? `/api/tasks/${taskId}` : null);
  const [f, setF] = useState<any>({ stageId: '', doneText: '', percent: '', hours: '', blockers: '' });
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: any) => setF((x: any) => ({ ...x, [k]: v }));
  const save = async () => {
    if (!f.doneText.trim()) return toast('Опишите, что сделано за день', 'err');
    setBusy(true);
    try {
      await api('/api/reports', 'POST', { ...f, taskId: taskId ? Number(taskId) : null, stageId: f.stageId ? Number(f.stageId) : null });
      toast('Отчёт сохранён'); refreshAll(); onClose();
    } catch (e: any) { toast(e.message, 'err'); setBusy(false); }
  };
  const stages = (detail.data?.stages || []).filter((s: any) => s.status !== 'accepted');
  return (
    <Modal title="Отчёт за день" onClose={onClose} footer={<><button className="btn secondary" onClick={onClose}>Отмена</button><button className="btn primary" onClick={save} disabled={busy}>Сохранить отчёт</button></>}>
      <Field label="Задание"><select value={taskId} onChange={(e) => { setTaskId(e.target.value); set('stageId', ''); }}><option value="">— общий отчёт —</option>{(tasks.data?.tasks || []).filter((t: any) => t.status !== 'done').map((t: any) => <option key={t.id} value={t.id}>{t.title}</option>)}</select></Field>
      {taskId && (
        <div className="form-grid">
          <Field label="Этап"><select value={f.stageId} onChange={(e) => set('stageId', e.target.value)}><option value="">—</option>{stages.map((s: any) => <option key={s.id} value={s.id}>{s.position + 1}. {s.name} ({s.progress}%)</option>)}</select></Field>
          <Field label="Прогресс этапа, %" hint="обновит этап, если выбран"><input type="number" min={0} max={100} value={f.percent} onChange={(e) => set('percent', e.target.value)} /></Field>
        </div>
      )}
      <Field label="Что сделано *"><textarea value={f.doneText} onChange={(e) => set('doneText', e.target.value)} /></Field>
      <div className="form-grid">
        <Field label="Потрачено, часов"><input type="number" min={0} step={0.5} value={f.hours} onChange={(e) => set('hours', e.target.value)} /></Field>
        <Field label="Что мешает"><input value={f.blockers} onChange={(e) => set('blockers', e.target.value)} placeholder="если есть блокер" /></Field>
      </div>
    </Modal>
  );
}
