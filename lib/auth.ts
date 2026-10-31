import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { one } from './db';
import { HttpError } from './api';

export const COOKIE = 'cj_session';
const secret = () =>
  new TextEncoder().encode(process.env.AUTH_SECRET || 'change-this-to-a-long-random-string-0123456789');

export const hashPassword = (p: string) => bcrypt.hashSync(p, 10);
export const checkPassword = (p: string, h: string) => bcrypt.compareSync(p, h);

export async function signSession(uid: number) {
  return new SignJWT({ uid })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('14d')
    .sign(secret());
}

export async function getUser() {
  const token = cookies().get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    const u = await one(
      'SELECT id,name,email,role,job_title,department,initials,hourly_rate,active FROM users WHERE id=$1',
      [payload.uid]
    );
    return u && u.active ? u : null;
  } catch {
    return null;
  }
}

export async function requireUser() {
  const u = await getUser();
  if (!u) throw new HttpError(401, 'Требуется вход в систему');
  return u;
}
