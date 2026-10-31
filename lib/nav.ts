export const ROLE_LABEL: Record<string, string> = {
  founder: 'ГАП / руководитель',
  manager: 'Менеджер',
  specialist: 'Специалист',
  it: 'IT-специалист',
};

// Какие разделы видит роль (то же самое проверяется на сервере в API)
export const NAV = [
  { href: '/', label: 'Обзор', ico: '▦', roles: ['founder', 'manager', 'specialist', 'it'] },
  { href: '/jarvis', label: 'JARVIS AI', ico: '✦', roles: ['founder', 'manager', 'specialist', 'it'] },
  { href: '/timeline', label: 'Timeline', ico: '◷', roles: ['founder', 'manager', 'specialist', 'it'] },
  { href: '/tasks', label: 'Все задания', ico: '☷', roles: ['founder', 'manager', 'specialist', 'it'] },
  { href: '/my-work', label: 'Моя работа', ico: '✓', roles: ['founder', 'manager', 'specialist', 'it'] },
  { href: '/time', label: 'Учёт времени', ico: '◴', roles: ['founder', 'manager', 'specialist', 'it'] },
  { href: '/reviews', label: 'На проверке', ico: '◉', roles: ['founder', 'manager', 'specialist', 'it'] },
  { href: '/reports', label: 'Ежедневные отчёты', ico: '▤', roles: ['founder', 'manager', 'specialist', 'it'] },
  { href: '/files', label: 'Файлы', ico: '☁', roles: ['founder', 'manager', 'specialist', 'it'] },
  { sep: true },
  { href: '/team', label: 'Сотрудники', ico: '♙', roles: ['founder', 'manager', 'it'] },
  { sep: true },
  { href: '/projects', label: 'Портфель проектов', ico: '▣', roles: ['founder', 'manager'] },
  { href: '/section/growth', label: 'Развитие бизнеса', ico: '↗', roles: ['founder', 'manager'] },
  { href: '/section/marketing', label: 'Маркетинг и продажи', ico: '◈', roles: ['founder', 'manager'] },
  { href: '/section/product', label: 'Продукты и IT', ico: '✧', roles: ['founder', 'manager'] },
  { href: '/section/operations', label: 'Операции и качество', ico: '⚙', roles: ['founder', 'manager'] },
  { href: '/section/strategy', label: 'Стратегия и инвестиции', ico: '♜', roles: ['founder'] },
  { href: '/documents', label: 'Документы и договоры', ico: '▤', roles: ['founder', 'manager'] },
  { href: '/finances', label: 'Финансы', ico: '＄', roles: ['founder'] },
  { sep: true },
  { href: '/access', label: 'Роли и доступ', ico: '⌘', roles: ['founder', 'manager', 'specialist', 'it'] },
] as any[];
