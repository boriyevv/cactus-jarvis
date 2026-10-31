import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

export async function middleware(req: NextRequest) {
  const token = req.cookies.get('cj_session')?.value;
  let ok = false;
  if (token) {
    try {
      const secret = new TextEncoder().encode(
        process.env.AUTH_SECRET || 'change-this-to-a-long-random-string-0123456789'
      );
      await jwtVerify(token, secret);
      ok = true;
    } catch {}
  }
  if (!ok) return NextResponse.redirect(new URL('/login', req.url));
  return NextResponse.next();
}

export const config = { matcher: ['/((?!api|_next|login|favicon.ico).*)'] };
