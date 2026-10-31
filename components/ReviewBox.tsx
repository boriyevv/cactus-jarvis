'use client';
import { useState } from 'react';
import { api, refreshAll, toast } from '@/lib/client';
import { StageTag } from './ui';

export default function ReviewBox({ sub, stages }: { sub: any; stages: any[] }) {
  const ready = stages.filter((s) => s.status === 'ready');
  const [picked, setPicked] = useState<number[]>(ready.map((s) => s.id));
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const toggle = (id: number) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const decide = async (decision: 'accept' | 'rework') => {
    if (decision === 'rework' && !comment.trim()) return toast('Для возврата напишите комментарий', 'err');
    if (!picked.length) return toast('Выберите хотя бы один этап', 'err');
    setBusy(true);
    try {
      await api('/api/reviews', 'POST', { submissionId: sub.id, decision, comment, stageIds: picked });
      toast(decision === 'accept' ? 'Этапы приняты' : 'Возвращено на доработку');
      refreshAll();
    } catch (e: any) { toast(e.message, 'err'); setBusy(false); }
  };
  return (
    <div>
      {sub.note && <p className="small"><b>Комментарий исполнителя:</b> {sub.note}</p>}
      <p className="small muted" style={{ margin: '4px 0 8px' }}>Отметьте этапы, к которым применяется решение:</p>
      {ready.map((s) => (
        <label key={s.id} className="row" style={{ padding: '6px 0' }}>
          <input type="checkbox" style={{ width: 'auto' }} checked={picked.includes(s.id)} onChange={() => toggle(s.id)} />
          <span style={{ flex: 1 }}>{s.position + 1}. {s.name} <small className="muted">· вес {s.weight}%</small></span>
          <StageTag s={s.status} />
        </label>
      ))}
      {!ready.length && <p className="muted small">Нет этапов, ожидающих решения.</p>}
      <textarea style={{ marginTop: 10 }} placeholder="Комментарий (обязателен при возврате на доработку)" value={comment} onChange={(e) => setComment(e.target.value)} />
      <div className="row" style={{ marginTop: 10 }}>
        <button className="btn primary" disabled={busy || !ready.length} onClick={() => decide('accept')}>✓ Принять выбранное</button>
        <button className="btn danger" disabled={busy || !ready.length} onClick={() => decide('rework')}>↩ Вернуть на доработку</button>
      </div>
    </div>
  );
}
