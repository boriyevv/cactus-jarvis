import { HttpError } from './api';

export const isFounder = (u: any) => u?.role === 'founder';
export const isSup = (u: any) => u?.role === 'founder' || u?.role === 'manager';
export const canManageUsers = (u: any) => u?.role === 'founder' || u?.role === 'it';

export function requireSup(u: any) {
  if (!isSup(u)) throw new HttpError(403, 'Недостаточно прав (нужен руководитель)');
}
export function requireFounder(u: any) {
  if (!isFounder(u)) throw new HttpError(403, 'Доступно только руководителю (ГАП)');
}

export { NAV, ROLE_LABEL } from './nav';
