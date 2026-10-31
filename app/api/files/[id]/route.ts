import { promises as fs } from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import { one } from '@/lib/db';
import { handler, HttpError } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { isSup } from '@/lib/perm';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const GET = handler(async (_req, { params }) => {
  const u = await requireUser();
  const f = await one('SELECT f.*,t.assignee_id FROM files f LEFT JOIN tasks t ON t.id=f.task_id WHERE f.id=$1', [Number(params.id)]);
  if (!f) throw new HttpError(404, 'Файл не найден');
  if (!isSup(u) && f.assignee_id !== u.id && f.user_id !== u.id) throw new HttpError(403, 'Нет доступа');
  if (f.url) return NextResponse.redirect(f.url);
  const buf = await fs.readFile(path.join(process.cwd(), 'storage', f.storage_path));
  return new Response(buf, {
    headers: {
      'Content-Type': f.mime || 'application/octet-stream',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(f.name)}`,
    },
  });
});
