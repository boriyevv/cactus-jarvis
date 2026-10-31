'use client';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

export async function api(url: string, method = 'GET', body?: any) {
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  const r = await fetch(url, {
    method,
    headers: body && !isForm ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
    cache: 'no-store',
  });
  const j = await r.json().catch(() => ({}));
  if (r.status === 401 && typeof window !== 'undefined' && !location.pathname.startsWith('/login')) location.href = '/login';
  if (!r.ok) throw new Error(j.error || 'Ошибка запроса');
  return j;
}

export function refreshAll() {
  window.dispatchEvent(new Event('cj:refresh'));
}

export function toast(msg: string, kind: 'ok' | 'err' | 'warn' = 'ok') {
  window.dispatchEvent(new CustomEvent('cj:toast', { detail: { msg, kind } }));
}

export function useApi<T = any>(url: string | null, intervalMs = 0) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const alive = useRef(true);
  const load = useCallback(async () => {
    if (!url) return;
    try {
      const j = await api(url);
      if (alive.current) { setData(j); setError(null); }
    } catch (e: any) {
      if (alive.current) setError(e.message);
    } finally {
      if (alive.current) setLoading(false);
    }
  }, [url]);
  useEffect(() => {
    alive.current = true;
    setLoading(true);
    load();
    const h = () => load();
    window.addEventListener('cj:refresh', h);
    const t = intervalMs ? setInterval(load, intervalMs) : null;
    return () => {
      alive.current = false;
      window.removeEventListener('cj:refresh', h);
      if (t) clearInterval(t);
    };
  }, [load, intervalMs]);
  return { data, error, loading, reload: load };
}

export const MeContext = createContext<any>(null);
export const useMe = () => useContext(MeContext) as any;

export const STATUS: Record<string, { label: string; tone: string }> = {
  todo: { label: 'К выполнению', tone: 'gray' },
  in_progress: { label: 'В работе', tone: 'blue' },
  review: { label: 'На проверке', tone: 'warn' },
  rework: { label: 'На доработке', tone: 'red' },
  done: { label: 'Принята', tone: 'green' },
};
export const STAGE_STATUS: Record<string, { label: string; tone: string }> = {
  not_started: { label: 'Не начат', tone: 'gray' },
  in_progress: { label: 'В работе', tone: 'blue' },
  ready: { label: 'Готов к проверке', tone: 'warn' },
  accepted: { label: 'Принят', tone: 'green' },
  rework: { label: 'Доработка', tone: 'red' },
};
export const INIT_STATUS: Record<string, string> = {
  idea: 'Идея', research: 'Исследование', planning: 'Планирование', active: 'В работе', paused: 'Пауза', done: 'Готово',
};

export const fmtDate = (s?: string | null) => {
  if (!s) return '—';
  const d = new Date(s.length === 10 ? s + 'T00:00:00' : s);
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
};
export const fmtDateTime = (s?: string | null) => {
  if (!s) return '—';
  return new Date(s).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tashkent' });
};
export const fmtDur = (sec: number) => {
  sec = Math.max(0, Math.round(sec || 0));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
  if (h) return `${h} ч ${m} мин`;
  return `${m} мин`;
};
export const fmtClock = (sec: number) => {
  sec = Math.max(0, Math.floor(sec));
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(Math.floor(sec / 3600))}:${p(Math.floor((sec % 3600) / 60))}:${p(sec % 60)}`;
};
export const fmtMoney = (n: number) => new Intl.NumberFormat('ru-RU').format(Math.round(n || 0)) + ' сум';
export const fmtSize = (n: number) => (n > 1048576 ? (n / 1048576).toFixed(1) + ' МБ' : Math.max(1, Math.round(n / 1024)) + ' КБ');

export const ACTION_LABEL: Record<string, string> = {
  task_created: 'Создано задание', task_updated: 'Изменено задание', task_deleted: 'Удалено задание',
  stage_progress: 'Прогресс этапа', submitted: 'Результат отправлен на проверку', accepted: 'Результат принят',
  rework: 'Возврат на доработку', timer_start: 'Таймер запущен', timer_stop: 'Таймер остановлен',
  daily_report: 'Ежедневный отчёт', file_added: 'Добавлен файл', employee_added: 'Добавлен сотрудник',
  employee_updated: 'Обновлён сотрудник', warning_sent: 'Отправлено предупреждение', project_created: 'Создан проект',
};
