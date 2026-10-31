import { q, one } from './db';
import { HttpError } from './api';
import { isSup, isFounder, canManageUsers, requireSup, requireFounder } from './perm';
import {
  TASK_SELECT, TODAY, createTask, setStageProgress, reviewDecide, startTimer, stopTimer, notify, log,
  findUserByName, findTaskByRef, findProjectByName, getTask,
} from './tasks';
import { findLateness, runWatchdog } from './watchdog';
import { overview, periodStart } from './stats';
import { financeByProject } from './finance';
import { hashPassword } from './auth';
import { initialsOf, randomPassword, translit, normalizeDate } from './util';
import { TYPES } from './templates.mjs';

const round = (n: number) => Math.round(n * 10) / 10;

export const TOOLS: any[] = [
  { name: 'overview', description: 'Общая сводка: задания, выполнение, просрочки, часы, команда. period: today|week|month.',
    input_schema: { type: 'object', properties: { period: { type: 'string', enum: ['today', 'week', 'month'] } } } },
  { name: 'list_employees', description: 'Список активных сотрудников (id, имя, должность, отдел, роль).',
    input_schema: { type: 'object', properties: {} } },
  { name: 'employee_progress', description: 'Прогресс сотрудника: сколько заданий выполнено (%), средний прогресс активных, просрочки, часы за неделю. employee — имя или часть имени.',
    input_schema: { type: 'object', properties: { employee: { type: 'string' } }, required: ['employee'] } },
  { name: 'add_employee', description: 'Добавить нового сотрудника. Роль по умолчанию specialist — другие роли ставить только если руководитель прямо попросил. Пароль и email генерируются, если не указаны.',
    input_schema: { type: 'object', properties: {
      name: { type: 'string' }, job_title: { type: 'string', description: 'Должность/профессия, например «Программист»' },
      department: { type: 'string' }, role: { type: 'string', enum: ['specialist', 'manager', 'it'] },
      email: { type: 'string' }, password: { type: 'string' }, hourly_rate: { type: 'number' } }, required: ['name', 'job_title'] } },
  { name: 'update_employee', description: 'Изменить данные сотрудника. Для деактивации (active=false) обязательно confirm=true после согласия руководителя.',
    input_schema: { type: 'object', properties: {
      employee: { type: 'string' }, job_title: { type: 'string' }, department: { type: 'string' },
      role: { type: 'string', enum: ['specialist', 'manager', 'it'] }, hourly_rate: { type: 'number' },
      active: { type: 'boolean' }, confirm: { type: 'boolean' } }, required: ['employee'] } },
  { name: 'list_tasks', description: 'Список заданий с фильтрами.',
    input_schema: { type: 'object', properties: {
      assignee: { type: 'string' }, status: { type: 'string', enum: ['todo', 'in_progress', 'review', 'rework', 'done'] },
      project: { type: 'string' }, overdue_only: { type: 'boolean' }, limit: { type: 'number' } } } },
  { name: 'create_task', description: `Создать задание (этапы создаются автоматически по типу). Типы: ${TYPES.join(', ')}.`,
    input_schema: { type: 'object', properties: {
      title: { type: 'string' }, assignee: { type: 'string' }, project: { type: 'string' }, type: { type: 'string' },
      due_date: { type: 'string', description: 'YYYY-MM-DD' }, planned_hours: { type: 'number' },
      description: { type: 'string' }, complexity: { type: 'number' } }, required: ['title', 'assignee'] } },
  { name: 'update_task', description: 'Изменить задание: статус (todo|in_progress|done), исполнителя, срок, название, плановые часы.',
    input_schema: { type: 'object', properties: {
      task: { type: 'string', description: 'id или часть названия' }, status: { type: 'string', enum: ['todo', 'in_progress', 'done'] },
      assignee: { type: 'string' }, due_date: { type: 'string' }, title: { type: 'string' }, planned_hours: { type: 'number' } }, required: ['task'] } },
  { name: 'set_stage_progress', description: 'Установить прогресс этапа задания (0-100). stage — номер этапа (1,2,…) или часть названия.',
    input_schema: { type: 'object', properties: { task: { type: 'string' }, stage: { type: 'string' }, progress: { type: 'number' } }, required: ['task', 'stage', 'progress'] } },
  { name: 'review_task', description: 'Проверка присланного результата: accept (принять) или rework (вернуть с комментарием).',
    input_schema: { type: 'object', properties: { task: { type: 'string' }, decision: { type: 'string', enum: ['accept', 'rework'] }, comment: { type: 'string' } }, required: ['task', 'decision'] } },
  { name: 'send_warning', description: 'Отправить сотруднику предупреждение/напоминание (появится у него в уведомлениях и будет озвучено).',
    input_schema: { type: 'object', properties: { employee: { type: 'string' }, message: { type: 'string' } }, required: ['employee', 'message'] } },
  { name: 'check_lateness', description: 'Найти опаздывающих: просроченные задания, отставание от графика, простой. notify=true — сразу разослать предупреждения сотрудникам.',
    input_schema: { type: 'object', properties: { notify: { type: 'boolean' } } } },
  { name: 'list_projects', description: 'Список проектов с прогрессом.', input_schema: { type: 'object', properties: {} } },
  { name: 'create_project', description: 'Создать проект.',
    input_schema: { type: 'object', properties: { name: { type: 'string' }, direction: { type: 'string' }, budget: { type: 'number' } }, required: ['name'] } },
  { name: 'time_report', description: 'Отработанные часы по сотрудникам за период.',
    input_schema: { type: 'object', properties: { period: { type: 'string', enum: ['today', 'week', 'month'] }, employee: { type: 'string' } } } },
  { name: 'start_timer', description: 'Запустить таймер по своему заданию (для текущего пользователя).',
    input_schema: { type: 'object', properties: { task: { type: 'string' } }, required: ['task'] } },
  { name: 'stop_timer', description: 'Остановить свой таймер.', input_schema: { type: 'object', properties: {} } },
  { name: 'finance_summary', description: 'Финансы по проектам: бюджет, плановые и фактические трудозатраты (только руководитель ГАП).',
    input_schema: { type: 'object', properties: {} } },
  { name: 'list_initiatives', description: 'Инициативы раздела: growth|marketing|product|operations|strategy.',
    input_schema: { type: 'object', properties: { section: { type: 'string' } }, required: ['section'] } },
  { name: 'add_initiative', description: 'Добавить инициативу в раздел бизнеса.',
    input_schema: { type: 'object', properties: { section: { type: 'string', enum: ['growth', 'marketing', 'product', 'operations', 'strategy'] },
      title: { type: 'string' }, description: { type: 'string' }, progress: { type: 'number' } }, required: ['section', 'title'] } },
];

async function userHours(userId: number, start: string) {
  const r = await one(
    `SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (COALESCE(ended_at,now())-started_at)))/3600,0)::float AS h
     FROM sessions WHERE user_id=$1 AND (started_at AT TIME ZONE 'Asia/Tashkent')::date >= ${start}`,
    [userId]
  );
  return round(r.h);
}

const brief = (t: any) => ({
  id: t.id, title: t.title, status: t.status, project: t.project_name, assignee: t.assignee_name, due: t.due_date,
  progress_claimed: Math.round(t.claimed), progress_accepted: Math.round(t.accepted), overdue: !!t.overdue,
  hours_spent: round(t.spent_sec / 3600), hours_planned: t.planned_hours,
});

export async function runTool(name: string, i: any, user: any): Promise<any> {
  switch (name) {
    case 'overview': {
      const o = await overview(user, i.period || 'week');
      return {
        period: i.period || 'week', employees_active: o.team, tasks: o.counts, completion_percent: o.completion, hours: round(o.hours),
        attention: o.attention.map((a: any) => ({ id: a.id, title: a.title, status: a.status, assignee: a.assignee_name, due: a.due_date, overdue: a.overdue })),
        employees: o.employees.map((e: any) => ({ name: e.name, tasks: e.tasks, done: e.done, overdue: e.overdue, avg_progress: Math.round(e.avg_claimed), hours: round(e.hours) })),
      };
    }
    case 'list_employees': {
      const rows = await q('SELECT id,name,job_title,department,role,email FROM users WHERE active ORDER BY id');
      return isSup(user) || canManageUsers(user) ? rows : rows.filter((r: any) => r.id === user.id);
    }
    case 'employee_progress': {
      const u = await findUserByName(i.employee);
      if (!isSup(user) && u.id !== user.id) throw new HttpError(403, 'Можно смотреть только свой прогресс');
      const tasks = await q(TASK_SELECT + ' WHERE t.assignee_id=$1 ORDER BY t.id DESC', [u.id]);
      const done = tasks.filter((t: any) => t.status === 'done').length;
      const act = tasks.filter((t: any) => t.status !== 'done');
      return {
        employee: u.name, job_title: u.job_title, tasks_total: tasks.length, tasks_done: done,
        completion_percent: tasks.length ? Math.round((done / tasks.length) * 100) : 0,
        avg_progress_of_active_tasks: act.length ? Math.round(act.reduce((s: number, t: any) => s + t.claimed, 0) / act.length) : 0,
        overdue_tasks: tasks.filter((t: any) => t.overdue).length,
        hours_week: await userHours(u.id, periodStart('week')),
        tasks: tasks.slice(0, 12).map(brief),
      };
    }
    case 'add_employee': {
      if (!canManageUsers(user)) throw new HttpError(403, 'Добавлять сотрудников может руководитель или IT-специалист');
      const role = i.role || 'specialist';
      if (role !== 'specialist' && !isFounder(user)) throw new HttpError(403, 'Роли кроме «специалист» назначает только руководитель ГАП');
      const name = String(i.name || '').trim();
      if (!name) throw new HttpError(400, 'Укажите имя');
      let email = String(i.email || '').trim().toLowerCase() || `${translit(name) || 'user'}@cactus.uz`;
      const base = email.split('@')[0], dom = email.split('@')[1] || 'cactus.uz';
      let n = 1;
      while (await one('SELECT 1 FROM users WHERE email=$1', [email])) email = `${base}${++n}@${dom}`;
      const password = i.password || randomPassword();
      const r = await one(
        `INSERT INTO users(name,email,password_hash,role,job_title,department,initials,hourly_rate)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
        [name, email, hashPassword(password), role, i.job_title || '', i.department || '', initialsOf(name), Number(i.hourly_rate) || 0]
      );
      await log(user.id, null, 'employee_added', `${name} · ${i.job_title || ''}`);
      return { id: r.id, name, job_title: i.job_title, role, email, password, note: 'Сообщите сотруднику логин и пароль' };
    }
    case 'update_employee': {
      if (!canManageUsers(user)) throw new HttpError(403, 'Недостаточно прав');
      const u = await findUserByName(i.employee, false);
      if (u.role === 'founder' && !isFounder(user)) throw new HttpError(403, 'Нельзя менять руководителя');
      if (i.role && !isFounder(user)) throw new HttpError(403, 'Менять роли может только руководитель ГАП');
      if (i.active === false && !i.confirm) throw new HttpError(400, 'Нужно подтверждение руководителя: повторите с confirm=true');
      if (i.active === false && u.id === user.id) throw new HttpError(400, 'Нельзя деактивировать себя');
      await q(
        `UPDATE users SET job_title=COALESCE($1,job_title),department=COALESCE($2,department),role=COALESCE($3,role),
         hourly_rate=COALESCE($4,hourly_rate),active=COALESCE($5,active) WHERE id=$6`,
        [i.job_title ?? null, i.department ?? null, i.role ?? null, i.hourly_rate ?? null, i.active ?? null, u.id]
      );
      await log(user.id, null, 'employee_updated', u.name);
      return { ok: true, employee: u.name };
    }
    case 'list_tasks': {
      const w: string[] = ['true'], p: any[] = [];
      if (!isSup(user)) { p.push(user.id); w.push(`t.assignee_id=$${p.length}`); }
      else if (i.assignee) { const u = await findUserByName(i.assignee); p.push(u.id); w.push(`t.assignee_id=$${p.length}`); }
      if (i.status) { p.push(i.status); w.push(`t.status=$${p.length}`); }
      if (i.project) { const pr = await findProjectByName(i.project); p.push(pr.id); w.push(`t.project_id=$${p.length}`); }
      if (i.overdue_only) w.push(`(t.status<>'done' AND t.due_date < ${TODAY})`);
      const rows = await q(`${TASK_SELECT} WHERE ${w.join(' AND ')} ORDER BY t.due_date NULLS LAST, t.id DESC LIMIT ${Math.min(30, Number(i.limit) || 15)}`, p);
      return rows.map(brief);
    }
    case 'create_task': {
      requireSup(user);
      const a = await findUserByName(i.assignee);
      const pr = i.project ? await findProjectByName(i.project) : null;
      const id = await createTask(user, {
        title: i.title, description: i.description, projectId: pr?.id, type: i.type, assigneeId: a.id,
        dueDate: i.due_date, plannedHours: i.planned_hours, complexity: i.complexity,
      });
      return { id, title: i.title, assignee: a.name, project: pr?.name || null, due: normalizeDate(i.due_date) };
    }
    case 'update_task': {
      requireSup(user);
      const t = await findTaskByRef(i.task);
      const sets: string[] = [], p: any[] = [];
      if (i.status) { p.push(i.status); sets.push(`status=$${p.length}`); }
      if (i.assignee) { const a = await findUserByName(i.assignee); p.push(a.id); sets.push(`assignee_id=$${p.length}`); await notify(a.id, 'task', 'Вам назначено задание', t.title); }
      if (i.due_date) { p.push(normalizeDate(i.due_date)); sets.push(`due_date=$${p.length}`); }
      if (i.title) { p.push(i.title); sets.push(`title=$${p.length}`); }
      if (i.planned_hours != null) { p.push(Number(i.planned_hours)); sets.push(`planned_hours=$${p.length}`); }
      if (!sets.length) throw new HttpError(400, 'Нечего менять');
      p.push(t.id);
      await q(`UPDATE tasks SET ${sets.join(',')},updated_at=now() WHERE id=$${p.length}`, p);
      await log(user.id, t.id, 'task_updated', t.title);
      return { ok: true, task: t.title };
    }
    case 'set_stage_progress': {
      const t = await findTaskByRef(i.task);
      const stages = await q('SELECT * FROM stages WHERE task_id=$1 ORDER BY position', [t.id]);
      const ref = String(i.stage).trim();
      let st = /^\d+$/.test(ref) ? stages[Number(ref) - 1] : stages.find((s: any) => s.name.toLowerCase().includes(ref.toLowerCase()));
      if (!st) throw new HttpError(404, `Этап «${ref}» не найден. Этапы: ${stages.map((s: any, k: number) => `${k + 1}. ${s.name}`).join('; ')}`);
      const r = await setStageProgress(user, t.id, st.id, i.progress);
      return { task: t.title, stage: st.name, ...r };
    }
    case 'review_task': {
      requireSup(user);
      const t = await findTaskByRef(i.task);
      const sub = await one("SELECT id FROM submissions WHERE task_id=$1 AND status='pending' ORDER BY id DESC LIMIT 1", [t.id]);
      if (!sub) throw new HttpError(400, `По заданию «${t.title}» нет результата на проверке`);
      const r = await reviewDecide(user, sub.id, i.decision, i.comment || '');
      return { task: t.title, decision: i.decision, new_status: r.status };
    }
    case 'send_warning': {
      requireSup(user);
      const u = await findUserByName(i.employee);
      await notify(u.id, 'warning', 'Jarvis: предупреждение', String(i.message));
      await log(user.id, null, 'warning_sent', `${u.name}: ${i.message}`);
      return { ok: true, employee: u.name };
    }
    case 'check_lateness': {
      requireSup(user);
      const items = await findLateness();
      if (i.notify) await runWatchdog(true);
      return {
        total: items.length, notified: !!i.notify,
        items: items.map((x: any) => ({ employee: x.userName, kind: x.kind, task: x.taskTitle || null, message: x.supMessage })),
      };
    }
    case 'list_projects': {
      requireSup(user);
      const o = await overview(user, 'week');
      return o.projects.map((p: any) => ({ id: p.id, name: p.name, direction: p.direction, tasks: p.tasks, done: p.done, progress: Math.round(p.progress) }));
    }
    case 'create_project': {
      requireSup(user);
      const r = await one('INSERT INTO projects(name,direction,budget) VALUES($1,$2,$3) RETURNING id', [i.name, i.direction || 'Архитектура', Number(i.budget) || 0]);
      await log(user.id, null, 'project_created', i.name);
      return { id: r.id, name: i.name };
    }
    case 'time_report': {
      const start = periodStart(i.period || 'week');
      if (i.employee) {
        const u = await findUserByName(i.employee);
        if (!isSup(user) && u.id !== user.id) throw new HttpError(403, 'Нет доступа');
        return { employee: u.name, period: i.period || 'week', hours: await userHours(u.id, start) };
      }
      if (!isSup(user)) return { employee: user.name, hours: await userHours(user.id, start) };
      const us = await q("SELECT id,name FROM users WHERE active AND role<>'founder' ORDER BY id");
      const out = [];
      for (const u of us) out.push({ employee: u.name, hours: await userHours(u.id, start) });
      return { period: i.period || 'week', by_employee: out };
    }
    case 'start_timer': {
      const t = await findTaskByRef(i.task);
      return startTimer(user, t.id);
    }
    case 'stop_timer':
      return stopTimer(user);
    case 'finance_summary': {
      requireFounder(user);
      const rows = await financeByProject();
      return rows.map((r: any) => ({ project: r.name, budget: r.budget, planned_labor_cost: Math.round(r.planned_cost), actual_labor_cost: Math.round(r.actual_cost), hours: round(r.hours) }));
    }
    case 'list_initiatives': {
      requireSup(user);
      if (i.section === 'strategy') requireFounder(user);
      return q('SELECT id,title,description,progress,status FROM initiatives WHERE section=$1 ORDER BY id', [i.section]);
    }
    case 'add_initiative': {
      requireSup(user);
      if (i.section === 'strategy') requireFounder(user);
      const r = await one('INSERT INTO initiatives(section,title,description,progress,owner_id) VALUES($1,$2,$3,$4,$5) RETURNING id', [i.section, i.title, i.description || '', Math.min(100, Math.max(0, Number(i.progress) || 0)), user.id]);
      return { id: r.id, title: i.title };
    }
    default:
      throw new HttpError(400, `Неизвестная функция ${name}`);
  }
}
