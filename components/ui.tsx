'use client';
import { ReactNode, useEffect } from 'react';
import { STATUS, STAGE_STATUS } from '@/lib/client';

export function Modal({ title, onClose, children, footer, wide }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={'modal' + (wide ? ' wide' : '')} role="dialog" aria-modal="true">
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="close" onClick={onClose} aria-label="Закрыть">✕</button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export const Tag = ({ tone = 'green', children }: { tone?: string; children: ReactNode }) => <span className={'tag ' + tone}>{children}</span>;
export const StatusTag = ({ s }: { s: string }) => <Tag tone={STATUS[s]?.tone || 'gray'}>{STATUS[s]?.label || s}</Tag>;
export const StageTag = ({ s }: { s: string }) => <Tag tone={STAGE_STATUS[s]?.tone || 'gray'}>{STAGE_STATUS[s]?.label || s}</Tag>;

export function Progress({ value, accepted, tone }: { value: number; accepted?: number; tone?: string }) {
  const v = Math.max(0, Math.min(100, value || 0));
  return (
    <div className="progress-row">
      <div className={'progress ' + (tone || '')}>
        <span style={{ width: v + '%' }} />
        {accepted != null && <i style={{ width: Math.min(100, accepted) + '%' }} />}
      </div>
      <small>{Math.round(v)}%{accepted != null ? ` · принято ${Math.round(accepted)}%` : ''}</small>
    </div>
  );
}

export const Avatar = ({ text, size = 36 }: { text?: string; size?: number }) => (
  <div className="avatar" style={{ width: size, height: size, fontSize: size * 0.36 }}>{text || '??'}</div>
);

export function PageHead({ title, sub, actions }: { title: string; sub?: string; actions?: ReactNode }) {
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        {sub && <p className="sub">{sub}</p>}
      </div>
      {actions && <div className="head-actions">{actions}</div>}
    </div>
  );
}

export const Stat = ({ label, value, foot, tone }: { label: string; value: ReactNode; foot?: string; tone?: string }) => (
  <div className={'card stat ' + (tone || '')}>
    <div className="stat-top">{label}</div>
    <div className="stat-num">{value}</div>
    {foot && <div className="stat-foot">{foot}</div>}
  </div>
);

export const Empty = ({ children }: { children: ReactNode }) => <div className="empty">{children}</div>;
export const Loading = () => <div className="empty">Загрузка…</div>;
export const ErrorBox = ({ msg }: { msg: string }) => <div className="empty err">{msg}</div>;

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <em>{hint}</em>}
    </label>
  );
}

export function Tabs({ value, onChange, items }: { value: string; onChange: (v: string) => void; items: [string, string][] }) {
  return (
    <div className="tabs">
      {items.map(([k, l]) => (
        <button key={k} className={value === k ? 'on' : ''} onClick={() => onChange(k)}>{l}</button>
      ))}
    </div>
  );
}
