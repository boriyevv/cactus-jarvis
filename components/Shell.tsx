'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect, useRef, useState } from 'react';
import { MeContext, api, fmtDateTime, useApi } from '@/lib/client';
import { NAV, ROLE_LABEL } from '@/lib/nav';
import { Avatar } from './ui';
import { JarvisDock, JarvisProvider, useJarvis } from './Jarvis';

function Toasts() {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => {
    const h = (e: any) => {
      const id = Math.random();
      setItems((x) => [...x, { id, ...e.detail }]);
      setTimeout(() => setItems((x) => x.filter((i) => i.id !== id)), 5500);
    };
    window.addEventListener('cj:toast', h);
    return () => window.removeEventListener('cj:toast', h);
  }, []);
  return <div className="toasts">{items.map((i) => <div key={i.id} className={'toast ' + i.kind}>{i.msg}</div>)}</div>;
}

function Bell() {
  const { data, reload } = useApi<any>('/api/notifications', 30000);
  const [open, setOpen] = useState(false);
  const jarvis = useJarvis();
  const seen = useRef<Set<number> | null>(null);

  useEffect(() => {
    if (!data) return;
    const ids = new Set<number>(data.items.map((i: any) => i.id));
    if (seen.current === null) { seen.current = ids; return; }
    const fresh = data.items.filter((i: any) => !seen.current!.has(i.id) && !i.is_read);
    fresh.forEach((i: any) => {
      window.dispatchEvent(new CustomEvent('cj:toast', { detail: { msg: `${i.title}: ${i.body}`, kind: i.kind === 'warning' ? 'warn' : 'ok' } }));
      if (i.kind === 'warning') jarvis.speak(`${i.title}. ${i.body}`);
    });
    seen.current = ids;
  }, [data]);

  const markAll = async () => { await api('/api/notifications', 'POST', {}); reload(); };
  return (
    <div style={{ position: 'relative' }}>
      <button className="bell" onClick={() => setOpen(!open)} aria-label="Уведомления">🔔{data?.unread ? <b>{data.unread}</b> : null}</button>
      {open && (
        <div className="pop">
          <div className="row sp" style={{ padding: '6px 10px' }}>
            <b>Уведомления</b>
            <button className="btn small ghost" onClick={markAll}>Прочитано</button>
          </div>
          {!data?.items?.length && <div className="empty">Пока пусто</div>}
          {data?.items?.map((n: any) => (
            <div key={n.id} className={`n ${n.kind} ${n.is_read ? '' : 'unread'}`}>
              <b>{n.title}</b>
              <p>{n.body}</p>
              <small className="muted">{fmtDateTime(n.created_at)}</small>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Frame({ me, children }: { me: any; children: ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const items = NAV.filter((n) => n.sep || n.roles.includes(me.role));
  const cleaned = items.filter((n, i) => !(n.sep && (i === 0 || items[i - 1]?.sep || i === items.length - 1)));
  const current = NAV.find((n) => n.href && (n.href === '/' ? path === '/' : path.startsWith(n.href)));
  const logout = async () => { await api('/api/auth/logout', 'POST'); router.push('/login'); router.refresh(); };
  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand"><div className="logo">C</div><div><strong>CACTUS JARVIS</strong><small>Founder Command Center</small></div></div>
        <nav className="nav">
          {cleaned.map((n, i) =>
            n.sep ? <div key={i} className="nav-sep" /> : (
              <Link key={n.href} href={n.href} className={current?.href === n.href ? 'active' : ''}>
                <span className="nav-ico">{n.ico}</span>{n.label}
              </Link>
            )
          )}
        </nav>
        <div className="side-foot">v1.5 · данные в Neon Postgres</div>
      </aside>
      <main className="main">
        <header className="topbar">
          <div><div className="crumb">CACTUS / WORKSPACE</div><div className="top-title">{current?.label || 'Founder Command Center'}</div></div>
          <div className="top-actions">
            <Bell />
            <div className="user-chip">
              <Avatar text={me.initials} />
              <div><b>{me.name}</b><small>{me.job_title || ROLE_LABEL[me.role]}</small></div>
            </div>
            <button className="btn secondary small" onClick={logout}>Выйти</button>
          </div>
        </header>
        <div className="content">{children}</div>
      </main>
      {path !== '/jarvis' && <JarvisDock />}
      <Toasts />
    </div>
  );
}

export default function Shell({ children }: { children: ReactNode }) {
  const { data, error } = useApi<any>('/api/me');
  if (error) return <div className="login-wrap"><div className="login"><h1>Сессия недоступна</h1><p className="muted">{error}</p><a className="btn primary" href="/login">Войти</a></div></div>;
  if (!data) return <div className="empty" style={{ marginTop: 120 }}>Загрузка…</div>;
  return (
    <MeContext.Provider value={data.user}>
      <JarvisProvider>
        <Frame me={data.user}>{children}</Frame>
      </JarvisProvider>
    </MeContext.Provider>
  );
}
