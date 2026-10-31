import { NextResponse } from 'next/server';

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function handler(fn: (req: Request, ctx: any) => Promise<any>) {
  return async (req: Request, ctx: any) => {
    try {
      const r = await fn(req, ctx);
      if (r instanceof Response) return r;
      return NextResponse.json(r ?? { ok: true });
    } catch (e: any) {
      const status = e?.status || 500;
      if (status === 500) console.error(e);
      return NextResponse.json({ error: e?.message || 'Ошибка сервера' }, { status });
    }
  };
}

export async function body(req: Request) {
  try {
    return await req.json();
  } catch {
    return {};
  }
}

export function need(cond: any, msg: string, status = 400) {
  if (!cond) throw new HttpError(status, msg);
}
