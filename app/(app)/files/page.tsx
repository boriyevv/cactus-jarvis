'use client';
import Link from 'next/link';
import { useState } from 'react';
import { api, fmtDateTime, fmtSize, refreshAll, toast, useApi } from '@/lib/client';
import { Empty, ErrorBox, Loading, PageHead } from '@/components/ui';
import FileAdd from '@/components/FileAdd';

export default function Files() {
  const { data, error, loading } = useApi<any>('/api/files');
  const [open, setOpen] = useState(false);
  const del = async (id: number) => { if (!confirm('Удалить файл?')) return; try { await api('/api/files?id=' + id, 'DELETE'); refreshAll(); } catch (e: any) { toast(e.message, 'err'); } };
  if (loading && !data) return <Loading />;
  if (error) return <ErrorBox msg={error} />;
  return (
    <>
      <PageHead title="Файлы результата" sub="Загруженные файлы хранятся на сервере (папка storage), ссылки — Google Drive и любые https." actions={<button className="btn primary" onClick={() => setOpen(true)}>＋ Добавить файл / ссылку</button>} />
      <div className="card">
        {!data.files.length && <Empty>Файлов пока нет</Empty>}
        <div className="tbl-wrap">
          {data.files.length > 0 && (
            <table className="tbl">
              <thead><tr><th>Файл</th><th>Задание</th><th>Кто добавил</th><th>Когда</th><th></th></tr></thead>
              <tbody>
                {data.files.map((f: any) => (
                  <tr key={f.id}>
                    <td><a href={`/api/files/${f.id}`} target="_blank" rel="noreferrer"><b>📎 {f.name}</b></a><div className="small muted">{f.stored ? fmtSize(f.size) : 'ссылка'}</div></td>
                    <td>{f.task_id ? <Link href={`/tasks/${f.task_id}`}>{f.task_title}</Link> : '—'}</td>
                    <td>{f.user_name}</td>
                    <td>{fmtDateTime(f.created_at)}</td>
                    <td><button className="btn small ghost" onClick={() => del(f.id)}>Удалить</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      {open && <FileAdd onClose={() => setOpen(false)} />}
    </>
  );
}
