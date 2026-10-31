'use client';
import { useState } from 'react';
import { api, refreshAll, toast, useApi, useMe } from '@/lib/client';
import { Empty, ErrorBox, Field, Loading, Modal, PageHead, Tag } from '@/components/ui';

const DS: Record<string, string> = { draft: 'Черновик', review: 'На согласовании', approved: 'Утверждён', archive: 'Архив' };

export default function Documents() {
  const me = useMe();
  const { data, error, loading } = useApi<any>('/api/documents');
  const [edit, setEdit] = useState<any>(undefined);
  const [f, setF] = useState<any>({});
  const set = (k: string, v: any) => setF((x: any) => ({ ...x, [k]: v }));
  const open = (d?: any) => { setF(d ? { title: d.title, type: d.type, status: d.status, url: d.url } : { title: '', type: 'Шаблон', status: 'draft', url: '' }); setEdit(d || null); };
  const save = async () => {
    if (!String(f.title || '').trim()) return toast('Введите название', 'err');
    try {
      if (edit) await api('/api/documents', 'PATCH', { id: edit.id, ...f }); else await api('/api/documents', 'POST', { owner_id: me.id, ...f });
      toast('Сохранено'); refreshAll(); setEdit(undefined);
    } catch (e: any) { toast(e.message, 'err'); }
  };
  const del = async (d: any) => { if (!confirm('Удалить документ?')) return; try { await api('/api/documents?id=' + d.id, 'DELETE'); refreshAll(); } catch (e: any) { toast(e.message, 'err'); } };
  if (loading && !data) return <Loading />;
  if (error) return <ErrorBox msg={error} />;
  return (
    <>
      <PageHead title="Документы и договоры" sub="Реестр ключевых документов: статус, ответственный и ссылка на файл." actions={<button className="btn primary" onClick={() => open()}>＋ Добавить документ</button>} />
      <div className="card">
        {!data.items.length ? <Empty>Документов нет</Empty> : (
          <div className="tbl-wrap"><table className="tbl">
            <thead><tr><th>Документ</th><th>Тип</th><th>Статус</th><th>Ответственный</th><th></th></tr></thead>
            <tbody>{data.items.map((d: any) => (
              <tr key={d.id}>
                <td>{d.url ? <a href={d.url} target="_blank" rel="noreferrer"><b>{d.title}</b></a> : <b>{d.title}</b>}</td>
                <td>{d.type}</td>
                <td><Tag tone={d.status === 'approved' ? 'green' : d.status === 'review' ? 'warn' : 'gray'}>{DS[d.status] || d.status}</Tag></td>
                <td>{d.owner_name || '—'}</td>
                <td><div className="row"><button className="btn small secondary" onClick={() => open(d)}>Изменить</button><button className="btn small ghost" onClick={() => del(d)}>✕</button></div></td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </div>
      {edit !== undefined && (
        <Modal title={edit ? 'Изменить документ' : 'Новый документ'} onClose={() => setEdit(undefined)} footer={<><button className="btn secondary" onClick={() => setEdit(undefined)}>Отмена</button><button className="btn primary" onClick={save}>Сохранить</button></>}>
          <Field label="Название *"><input value={f.title || ''} onChange={(e) => set('title', e.target.value)} autoFocus /></Field>
          <div className="form-grid">
            <Field label="Тип"><input value={f.type || ''} onChange={(e) => set('type', e.target.value)} /></Field>
            <Field label="Статус"><select value={f.status} onChange={(e) => set('status', e.target.value)}>{Object.entries(DS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
          </div>
          <Field label="Ссылка на файл"><input value={f.url || ''} onChange={(e) => set('url', e.target.value)} placeholder="https://…" /></Field>
        </Modal>
      )}
    </>
  );
}
