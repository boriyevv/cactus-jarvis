import { NextResponse } from 'next/server';
import { one } from '@/lib/db';
import { checkPassword, signSession, COOKIE } from '@/lib/auth';
import { body } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { email, password } = await body(req);
    const u = await one('SELECT id,password_hash,active FROM users WHERE email=$1', [String(email || '').trim().toLowerCase()]);
    if (!u || !u.active || !checkPassword(String(password || ''), u.password_hash)) {
      return NextResponse.json({ error: 'Неверный email или пароль' }, { status: 401 });
    }
    const token = await signSession(u.id);
    const res = NextResponse.json({ ok: true });
    res.cookies.set(COOKIE, token, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 14 });
    return res;
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Ошибка' }, { status: 500 });
  }
}
