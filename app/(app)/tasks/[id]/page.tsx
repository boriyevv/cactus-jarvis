'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api, fmtDate, fmtDateTime, fmtDur, fmtSize, refreshAll, toast, useApi, useMe } from '@/lib/client';
import { isSupRole } from '@/lib/roles';
import { ErrorBox, Field, Loading, Modal, PageHead, Progress, StageTag, StatusTag, Tag } from '@/components/ui';
import FileAdd from '@/components/FileAdd';
import ReviewBox from '@/components/ReviewBox';

function StageRow({ s, canEdit, taskId }: { s: any; canEdit: boolean; taskId: number }) {
  const [v, setV] = useState<number>(s.progress);
  const [busy, setBusy] = useState(false);
  const locked = !canEdit || s.status === 'accepted';
  const save = async (val: number) => {
    setBusy(true);
    try { await api(`/api/tasks/${taskId}`, 'PATCH', { action: 'stage', stageId: s.id, progress: val }); refreshAll(); }
    catch (e: any) { toast(e.message, 'err'); setV(s.progress); }
    setBusy(false);
  };
  return (
    <div className="stage">
      <div className="row sp wrap">
        <div><b>{s.position + 1}. {s.name}</b> <span className="small muted">· вес {s.weight}%</span></div>
        <StageTag s={s.status} />
      </div>
      <div className="row" style={{ marginTop: 8 }}>
        <input type="range" min={0} max={100} step={5} value={v} disabled={locked || busy} onChange={(e) => setV(Number(e.target.value))} onMouseUp={() => v !== s.progress && save(v)} onTouchEnd={() => v !== s.progress && save(v)} onKeyUp={() => v !== s.progress && save(v)} />
        <b style={{ width: 44, textAlign: 'right' }}>{v}%</b>
        {!locked && <button className="btn small light" disabled={busy || v === 100} onClick={() => { setV(100); save(100); }}>100%</button>}
      </div>
    </div>
  );
}

export default function TaskPage({ params }: { params: { id: string } }) {
  const me = useMe();
  const router = useRouter();
  const sup = isSupRole(me.role);
  const { data, error, loading, reload } = useApi<any>(`/api/tasks/${params.id}`);
  const team = useApi<any>(sup ? '/api/team' : null);
  const [adding, setAdding] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  if (loading && !data) return <Loading />;
  if (error) return <ErrorBox msg={error} />;
  const { task: t, stages, submissions, files, reports, timerActive } = data;
  const mine = t.assignee_id === me.id;
  const editable = mine && t.status !== 'review' && t.status !== 'done';
  const pending = submissions.find((s: any) => s.status === 'pending');

  const patch = async (b: any, ok = 'Сохранено') => {
    try { await api(`/api/tasks/${t.id}`, 'PATCH', b); toast(ok); refreshAll(); } catch (e: any) { toast(e.message, 'err'); }
  };
  const timer = async () => {
    try {
      if (timerActive) await api('/api/timer', 'POST', { action: 'stop' });
      else await api('/api/timer', 'POST', { taskId: t.id });
      refreshAll();
    } catch (e: any) { toast(e.message, 'err'); }
  };
  const submit = async () => {
    setBusy(true);
    try { await api(`/api/tasks/${t.id}`, 'PATCH', { action: 'submit', note }); toast('Результат отправлен на проверку'); setSubmitOpen(false); setNote(''); refreshAll(); }
    catch (e: any) { toast(e.message, 'err'); }
    setBusy(false);
  };
  const remove = async () => {
    if (!confirm(`Удалить задание «${t.title}» со всеми этапами, файлами и сессиями времени?`)) return;
    try { await api(`/api/tasks/${t.id}`, 'DELETE'); toast('Задание удалено'); router.push('/tasks'); } catch (e: any) { toast(e.message, 'err'); }
  };
  const delFile = async (id: number) => { try { await api('/api/files?id=' + id, 'DELETE'); refreshAll(); } catch (e: any) { toast(e.message, 'err'); } };

  return (
    <>
      <PageHead
        title={t.title}
        sub={`${t.project_name || 'Без проекта'} · ${t.type} · сложность ${t.complexity}/5`}
        actions={<>
          <Link href="/tasks" className="btn secondary">← К списку</Link>
          {mine && ['todo', 'in_progress', 'rework'].includes(t.status) && <button className={'btn ' + (timerActive ? 'danger' : 'light')} onClick={timer}>{timerActive ? '⏸ Остановить таймер' : '▶ Начать работу'}</button>}
          {mine && editable && <button className="btn primary" onClick={() => setSubmitOpen(true)}>Отправить на проверку</button>}
          {sup && <button className="btn danger" onClick={remove}>Удалить</button>}
        </>}
      />
      <div className="grid stats">
        <div className="card"><div className="stat-top">Статус</div><div style={{ margin: '12px 0' }}><StatusTag s={t.status} />{t.overdue && <> <Tag tone="red">просрочено</Tag></>}</div><div className="stat-foot">срок {fmtDate(t.due_date)}</div></div>
        <div className="card"><div className="stat-top">Заявлено исполнителем</div><div className="stat-num">{Math.round(t.claimed)}%</div></div>
        <div className="card"><div className="stat-top">Принято проверяющим</div><div className="stat-num">{Math.round(t.accepted)}%</div></div>
        <div className="card"><div className="stat-top">Время</div><div className="stat-num" style={{ fontSize: 24 }}>{fmtDur(t.spent_sec)}</div><div className="stat-foot">план {t.planned_hours} ч</div></div>
      </div>

      <div className="grid two">
        <div className="grid">
          <div className="card">
            <div className="section-head"><h2>Этапы и веса</h2><small>сумма весов: {stages.reduce((a: number, s: any) => a + s.weight, 0)}%</small></div>
            {t.description && <p className="muted small" style={{ marginTop: 0 }}>{t.description}</p>}
            <Progress value={t.claimed} accepted={t.accepted} />
            {stages.map((s: any) => <StageRow key={s.id + ':' + s.progress + s.status} s={s} canEdit={editable} taskId={t.id} />)}
            {!editable && mine && <p className="small muted">Изменение этапов недоступно: {t.status === 'review' ? 'задание на проверке' : 'задание принято'}.</p>}
          </div>

          {sup && pending && (
            <div className="card">
              <div className="section-head"><h2>Проверка результата</h2><Tag tone="warn">ожидает решения</Tag></div>
              <ReviewBox sub={pending} stages={stages} />
            </div>
          )}

          <div className="card">
            <div className="section-head"><h2>История сдач</h2></div>
            {!submissions.length && <p className="muted">Результат ещё не отправлялся.</p>}
            {submissions.map((s: any) => (
              <div key={s.id} className="feed-item">
                <span className={'dot ' + (s.status === 'rework' ? 'red' : s.status === 'pending' ? 'warn' : '')} />
                <div style={{ flex: 1 }}>
                  <b className="small">{s.status === 'pending' ? 'На проверке' : s.status === 'accepted' ? 'Принято' : 'Возврат на доработку'}</b>
                  <div className="small muted">{s.user_name} · {fmtDateTime(s.created_at)}{s.reviewer_name ? ` · проверил ${s.reviewer_name}` : ''}</div>
                  {s.note && <div className="small">«{s.note}»</div>}
                  {s.review_comment && <div className="small"><b>Комментарий:</b> {s.review_comment}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid" style={{ alignContent: 'start' }}>
          <div className="card">
            <div className="section-head"><h2>Исполнитель</h2></div>
            <b>{t.assignee_name || 'не назначен'}</b><div className="small muted">{t.assignee_title}</div>
            {sup && (
              <div style={{ marginTop: 14 }}>
                <Field label="Переназначить"><select value={t.assignee_id || ''} onChange={(e) => patch({ assigneeId: Number(e.target.value) || null }, 'Исполнитель изменён')}><option value="">—</option>{(team.data?.members || []).filter((m: any) => m.active).map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></Field>
                <Field label="Срок"><input type="date" defaultValue={t.due_date || ''} onBlur={(e) => e.target.value !== (t.due_date || '') && patch({ dueDate: e.target.value }, 'Срок изменён')} /></Field>
                <Field label="Статус"><select value={t.status === 'review' ? 'in_progress' : t.status} disabled={t.status === 'review'} onChange={(e) => patch({ status: e.target.value }, 'Статус изменён')}><option value="todo">К выполнению</option><option value="in_progress">В работе</option><option value="rework">На доработке</option><option value="done">Принята</option></select></Field>
              </div>
            )}
          </div>
          <div className="card">
            <div className="section-head"><h2>Файлы результата</h2>{(mine || sup) && <button className="btn small secondary" onClick={() => setAdding(true)}>＋ Добавить</button>}</div>
            {!files.length && <p className="muted small">Файлов нет. Чтобы отправить результат, прикрепите файл или ссылку.</p>}
            {files.map((f: any) => (
              <div key={f.id} className="feed-item">
                <span>📎</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <a href={`/api/files/${f.id}`} target="_blank" rel="noreferrer"><b className="small">{f.name}</b></a>
                  <div className="small muted">{f.user_name} · {fmtDateTime(f.created_at)}{f.size ? ' · ' + fmtSize(f.size) : ''}</div>
                </div>
                {(sup || f.user_name === me.name) && t.status !== 'done' && <button className="btn small ghost" onClick={() => delFile(f.id)}>✕</button>}
              </div>
            ))}
          </div>
          <div className="card">
            <div className="section-head"><h2>Ежедневные отчёты</h2></div>
            {!reports.length && <p className="muted small">Отчётов по заданию нет.</p>}
            {reports.map((r: any) => (
              <div key={r.id} className="feed-item"><span className="dot" /><div><b className="small">{fmtDate(r.report_date)} · {r.user_name}</b><div className="small">{r.done_text}</div>{r.blockers && <div className="small red">Мешает: {r.blockers}</div>}<div className="small muted">{r.hours} ч{r.percent != null ? ` · ${r.percent}%` : ''}</div></div></div>
            ))}
          </div>
        </div>
      </div>

      {adding && <FileAdd onClose={() => setAdding(false)} taskId={t.id} stages={stages} />}
      {submitOpen && (
        <Modal title="Отправить результат на проверку" onClose={() => setSubmitOpen(false)} footer={<><button className="btn secondary" onClick={() => setSubmitOpen(false)}>Отмена</button><button className="btn primary" disabled={busy} onClick={submit}>Отправить</button></>}>
          <p className="muted small">Проверяющий увидит этапы со 100% и прикреплённые файлы ({files.length}).</p>
          <Field label="Комментарий проверяющему"><textarea value={note} onChange={(e) => setNote(e.target.value)} /></Field>
        </Modal>
      )}
    </>
  );
}
