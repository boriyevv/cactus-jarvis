import { q, one } from './db';
import { TASK_SELECT, TODAY, notify, notifySupervisors } from './tasks';

const DAY = 86400000;

// Находит опоздания: просроченные задания, отставание от темпа, простой сотрудников
export async function findLateness() {
  const now = await one(
    `SELECT ${TODAY}::text AS d, EXTRACT(HOUR FROM now() AT TIME ZONE 'Asia/Tashkent')::int AS h,
            EXTRACT(ISODOW FROM now() AT TIME ZONE 'Asia/Tashkent')::int AS dow`
  );
  const today = now.d as string;
  const items: any[] = [];

  const overdue = await q(
    TASK_SELECT +
      ` WHERE t.status NOT IN ('done','review') AND t.due_date < ${TODAY} AND t.assignee_id IS NOT NULL ORDER BY t.due_date`
  );
  for (const t of overdue) {
    const days = Math.max(1, Math.round((Date.parse(today) - Date.parse(t.due_date)) / DAY));
    items.push({
      kind: 'overdue', userId: t.assignee_id, userName: t.assignee_name, taskId: t.id, taskTitle: t.title,
      key: `overdue:${t.id}:${today}`,
      message: `Вы опаздываете: задание «${t.title}» просрочено на ${days} дн. (срок ${t.due_date}). Выполнено ${Math.round(t.claimed)}%.`,
      supMessage: `${t.assignee_name}: «${t.title}» просрочено на ${days} дн., выполнено ${Math.round(t.claimed)}%`,
    });
  }

  const active = await q(
    TASK_SELECT +
      ` WHERE t.status IN ('todo','in_progress','rework') AND t.assignee_id IS NOT NULL AND t.due_date >= ${TODAY}
        AND t.due_date > (t.created_at AT TIME ZONE 'Asia/Tashkent')::date`
  );
  for (const t of active) {
    const created = Date.parse(String(new Date(t.created_at).toISOString()).slice(0, 10));
    const total = (Date.parse(t.due_date) - created) / DAY;
    const elapsed = (Date.parse(today) - created) / DAY;
    if (total <= 0) continue;
    const ratio = elapsed / total;
    if (ratio >= 0.5 && t.claimed < ratio * 100 - 25) {
      items.push({
        kind: 'pace', userId: t.assignee_id, userName: t.assignee_name, taskId: t.id, taskTitle: t.title,
        key: `pace:${t.id}:${today}`,
        message: `Вы отстаёте от графика по заданию «${t.title}»: прошло ${Math.round(ratio * 100)}% срока, выполнено ${Math.round(t.claimed)}%. Срок ${t.due_date}.`,
        supMessage: `${t.assignee_name}: «${t.title}» отстаёт — прошло ${Math.round(ratio * 100)}% срока, готово ${Math.round(t.claimed)}%`,
      });
    }
  }

  if (now.dow <= 5 && now.h >= 11) {
    const idle = await q(
      `SELECT u.id,u.name FROM users u WHERE u.active AND u.role<>'founder'
       AND EXISTS(SELECT 1 FROM tasks t WHERE t.assignee_id=u.id AND t.status IN ('todo','in_progress','rework'))
       AND NOT EXISTS(SELECT 1 FROM sessions s WHERE s.user_id=u.id AND (s.started_at AT TIME ZONE 'Asia/Tashkent')::date=${TODAY})`
    );
    for (const u of idle) {
      items.push({
        kind: 'idle', userId: u.id, userName: u.name, taskId: null, taskTitle: '',
        key: `idle:${u.id}:${today}`,
        message: `Вы сегодня ещё не запускали таймер, а у вас есть активные задания. Вы опаздываете с началом работы.`,
        supMessage: `${u.name}: сегодня нет ни одной рабочей сессии`,
      });
    }
  }
  return items;
}

export async function runWatchdog(force = false) {
  if (!force) {
    const s = await one("SELECT value FROM settings WHERE key='watchdog_last'");
    if (s && Date.now() - Number(s.value) < 5 * 60 * 1000) return { skipped: true, sent: 0 };
  }
  await q(
    "INSERT INTO settings(key,value) VALUES('watchdog_last',$1) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value",
    [String(Date.now())]
  );
  const items = await findLateness();
  let sent = 0;
  for (const it of items) {
    await notify(it.userId, 'warning', 'Jarvis: предупреждение', it.message, it.key);
    await notifySupervisors('warning', 'Опоздание', it.supMessage, 'sup:' + it.key, it.userId);
    sent++;
  }
  return { skipped: false, sent };
}
