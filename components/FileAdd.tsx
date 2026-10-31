'use client';
import { useState } from 'react';
import { api, refreshAll, toast, useApi } from '@/lib/client';
import { Field, Modal } from './ui';

export default function FileAdd({ onClose, taskId, stages }: { onClose: () => void; taskId?: number; stages?: any[] }) {
  const tasks = useApi<any>(taskId ? null : '/api/tasks?mine=1');
  const [tid, setTid] = useState<any>(taskId || '');
  const [stageId, setStageId] = useState('');
  const [mode, setMode] = useState<'file' | 'link'>('file');
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const stageList = stages || [];
  const save = async () => {
    if (!tid) return toast('Выберите задание', 'err');
    const fd = new FormData();
    fd.set('taskId', String(tid));
    if (stageId) fd.set('stageId', stageId);
    if (mode === 'file') { if (!file) return toast('Выберите файл', 'err'); fd.set('file', file); }
    else { fd.set('url', url); fd.set('name', name); }
    setBusy(true);
    try { await api('/api/files', 'POST', fd); toast('Файл добавлен'); refreshAll(); onClose(); }
    catch (e: any) { toast(e.message, 'err'); setBusy(false); }
  };
  return (
    <Modal title="Добавить файл или ссылку" onClose={onClose} footer={<><button className="btn secondary" onClick={onClose}>Отмена</button><button className="btn primary" onClick={save} disabled={busy}>{busy ? 'Загрузка…' : 'Добавить'}</button></>}>
      {!taskId && <Field label="Задание *"><select value={tid} onChange={(e) => setTid(e.target.value)}><option value="">— выберите —</option>{(tasks.data?.tasks || []).map((t: any) => <option key={t.id} value={t.id}>{t.title}</option>)}</select></Field>}
      {stageList.length > 0 && <Field label="Этап (необязательно)"><select value={stageId} onChange={(e) => setStageId(e.target.value)}><option value="">— весь результат —</option>{stageList.map((s: any) => <option key={s.id} value={s.id}>{s.position + 1}. {s.name}</option>)}</select></Field>}
      <div className="tabs" style={{ marginBottom: 14 }}>
        <button className={mode === 'file' ? 'on' : ''} onClick={() => setMode('file')}>Загрузить файл</button>
        <button className={mode === 'link' ? 'on' : ''} onClick={() => setMode('link')}>Ссылка (Google Drive и др.)</button>
      </div>
      {mode === 'file' ? (
        <Field label="Файл" hint="до 25 МБ"><input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} /></Field>
      ) : (
        <>
          <Field label="Ссылка *"><input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://drive.google.com/…" /></Field>
          <Field label="Название"><input value={name} onChange={(e) => setName(e.target.value)} /></Field>
        </>
      )}
    </Modal>
  );
}
