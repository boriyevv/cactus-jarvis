'use client';
import { useState } from 'react';
import { api } from '@/lib/client';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e: any) => {
    e.preventDefault(); setBusy(true); setErr('');
    try { await api('/api/auth/login', 'POST', { email, password }); window.location.href = '/'; }
    catch (e: any) { setErr(e.message); setBusy(false); }
  };
  return (
    <div className="login-wrap">
      <form className="login" onSubmit={submit}>
        <div className="logo" style={{ width: 46, height: 46 }}>C</div>
        <h1>CACTUS JARVIS</h1>
        <p className="muted" style={{ marginTop: 0 }}>Founder Command Center — вход в систему</p>
        <label className="field"><span>Email</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus required /></label>
        <label className="field"><span>Пароль</span><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
        {err && <p className="red small">{err}</p>}
        <button className="btn primary" style={{ width: '100%' }} disabled={busy}>{busy ? 'Входим…' : 'Войти'}</button>
      </form>
    </div>
  );
}
