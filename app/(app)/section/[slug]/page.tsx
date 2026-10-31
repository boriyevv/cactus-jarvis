'use client';
import { useState } from 'react';
import { api, fmtDate, INIT_STATUS, refreshAll, toast, useApi, useMe } from '@/lib/client';
import { Empty, ErrorBox, Field, Loading, Modal, PageHead, Progress, Tag } from '@/components/ui';

const TITLES: Record<string, [string, string]> = {
  growth: ['Развитие бизнеса', 'Новые услуги, рынки, партнёрства и гипотезы роста.'],
  marketing: ['Маркетинг и продажи', 'Лиды, предложения, договоры и коммуникации.'],
  product: ['Продукты и IT', 'Цифровые продукты, автоматизация и внутренние системы.'],
  operations: ['Операции и качество', 'Процессы, стандарты, регламенты и ресурсы.'],
  strategy: ['Стратегия и инвестиции', 'Цели, приоритеты и бизнес-кейсы (только ГАП).'],
};

export default function Section({ params }: { params: { slug: string } }) {
  const me = useMe();
  const slug = params.slug;
  const [title, sub] = TITLES[slug] || ['Раздел', ''];
  const { data, error, loading } = useApi<any>(`/api/initiatives?section=${slug}`);
  const [edit, setEdit] = useState<any>(undefined);
  const [f, setF] = useState<any>({});
  const set = (k: string, v: any) => setF((x: any) => ({ ...x, [k]: v }));
  const open = (i?: any) => { setF(i ? { title: i.title, description: i.description, progress: i.progress, status: i.status, due_date: i.due_date || '' } : { title: '', description: '', progress: 0, status: 'planning', due_date: '' }); setEdit(i || null); };
  const save = async () => {
    if (!String(f.title || '').trim()) return toast('Введите название', 'err');
    try {
      const body = { ...f, progress: Number(f.progress) || 0 };
      if (edit) await api('/api/initiatives', 'PATCH', { id: edit.id, ...body }); else await api('/api/initiatives', 'POST', { section: slug, owner_id: me.id, ...body });
      toast('Сохранено'); refreshAll(); setEdit(undefined);
    } catch (e: any) { toast(e.message, 'err'); }
  };
  const del = async (i: any) => { if (!confirm('Удалить инициативу?')) return; try { await api('/api/initiatives?id=' + i.id, 'DELETE'); refreshAll(); } catch (e: any) { toast(e.message, 'err'); } };
  if (!TITLES[slug]) return <ErrorBox msg="Раздел не найден" />;
  if (loading && !data) return <Loading />;
  if (error) return <ErrorBox msg={error} />;
  return (
    <>
      <PageHead title={title} sub={sub} actions={<button className="btn primary" onClick={() => open()}>＋ Добавить</button>} />
      {!data.items.length && <div className="card"><Empty>Записей пока нет</Empty></div>}
      <div className="grid auto">
        {data.items.map((i: any) => (
          <div key={i.id} className="card">
            <div className="row sp"><Tag tone={i.status === 'active' ? 'green' : i.status === 'paused' ? 'warn' : 'gray'}>{INIT_STATUS[i.status] || i.status}</Tag>{i.due_date && <small className="muted">до {fmtDate(i.due_date)}</small>}</div>
            <h3 style={{ margin: '10px 0 4px' }}>{i.title}</h3>
            <p className="muted small" style={{ margin: 0 }}>{i.description}</p>
            <Progress value={i.progress} />
            <div className="small muted" style={{ marginTop: 6 }}>Ответственный: {i.owner_name || '—'}</div>
            <div className="row" style={{ marginTop: 12 }}><button className="btn small secondary" onClick={() => open(i)}>Изменить</button><button className="btn small ghost" onClick={() => del(i)}>Удалить</button></div>
          </div>
        ))}
      </div>
      {edit !== undefined && (
        <Modal title={edit ? 'Изменить' : 'Новая запись'} onClose={() => setEdit(undefined)} footer={<><button className="btn secondary" onClick={() => setEdit(undefined)}>Отмена</button><button className="btn primary" onClick={save}>Сохранить</button></>}>
          <Field label="Название *"><input value={f.title || ''} onChange={(e) => set('title', e.target.value)} autoFocus /></Field>
          <Field label="Описание"><textarea value={f.description || ''} onChange={(e) => set('description', e.target.value)} /></Field>
          <div className="form-grid">
            <Field label="Статус"><select value={f.status} onChange={(e) => set('status', e.target.value)}>{Object.entries(INIT_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
            <Field label="Срок"><input type="date" value={f.due_date || ''} onChange={(e) => set('due_date', e.target.value)} /></Field>
          </div>
          <Field label={`Прогресс: ${f.progress || 0}%`}><input type="range" min={0} max={100} step={5} value={f.progress || 0} onChange={(e) => set('progress', e.target.value)} /></Field>
        </Modal>
      )}
    </>
  );
}
