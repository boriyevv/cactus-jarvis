// Idempotent: jadvallarni yaratadi va birinchi marta demo ma'lumot qo'shadi.
import dotenv from 'dotenv';
import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
import { TEMPLATES } from '../lib/templates.mjs';

dotenv.config({ path: '.env.local' });
dotenv.config();

const url = process.env.DATABASE_URL;
if (!url || url.includes('USER:PASSWORD')) {
  console.error('\n❌ .env.local ichidagi DATABASE_URL ni Neon connection string bilan to\'ldiring.\n   (https://console.neon.tech → Connection string)\n');
  process.exit(1);
}

const sql = neon(url);
const run = (t, p = []) => sql.query(t, p);
const TODAY = "(now() AT TIME ZONE 'Asia/Tashkent')::date";

const schema = [
  `CREATE TABLE IF NOT EXISTS users(
    id SERIAL PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'specialist', job_title TEXT NOT NULL DEFAULT '', department TEXT NOT NULL DEFAULT '',
    initials TEXT NOT NULL DEFAULT '', hourly_rate DOUBLE PRECISION NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS projects(
    id SERIAL PRIMARY KEY, name TEXT NOT NULL, direction TEXT NOT NULL DEFAULT 'Архитектура',
    description TEXT NOT NULL DEFAULT '', budget DOUBLE PRECISION NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active', created_at TIMESTAMPTZ NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS tasks(
    id SERIAL PRIMARY KEY, title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',
    project_id INT REFERENCES projects(id) ON DELETE SET NULL, type TEXT NOT NULL DEFAULT 'Другое',
    assignee_id INT REFERENCES users(id) ON DELETE SET NULL, created_by INT REFERENCES users(id) ON DELETE SET NULL,
    due_date DATE, planned_hours DOUBLE PRECISION NOT NULL DEFAULT 0, complexity INT NOT NULL DEFAULT 3,
    status TEXT NOT NULL DEFAULT 'todo', created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS stages(
    id SERIAL PRIMARY KEY, task_id INT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    position INT NOT NULL DEFAULT 0, name TEXT NOT NULL, weight INT NOT NULL DEFAULT 0,
    progress INT NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'not_started')`,
  `CREATE TABLE IF NOT EXISTS sessions(
    id SERIAL PRIMARY KEY, task_id INT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(), ended_at TIMESTAMPTZ)`,
  `CREATE TABLE IF NOT EXISTS reports(
    id SERIAL PRIMARY KEY, user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    task_id INT REFERENCES tasks(id) ON DELETE SET NULL, stage_id INT REFERENCES stages(id) ON DELETE SET NULL,
    report_date DATE NOT NULL DEFAULT ${TODAY}, done_text TEXT NOT NULL DEFAULT '', percent INT,
    hours DOUBLE PRECISION NOT NULL DEFAULT 0, blockers TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS submissions(
    id SERIAL PRIMARY KEY, task_id INT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id INT REFERENCES users(id) ON DELETE SET NULL, note TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending', reviewer_id INT REFERENCES users(id) ON DELETE SET NULL,
    review_comment TEXT NOT NULL DEFAULT '', created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    reviewed_at TIMESTAMPTZ)`,
  `CREATE TABLE IF NOT EXISTS files(
    id SERIAL PRIMARY KEY, task_id INT REFERENCES tasks(id) ON DELETE CASCADE,
    stage_id INT REFERENCES stages(id) ON DELETE SET NULL, user_id INT REFERENCES users(id) ON DELETE SET NULL,
    name TEXT NOT NULL, url TEXT, storage_path TEXT, size INT NOT NULL DEFAULT 0, mime TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS notifications(
    id SERIAL PRIMARY KEY, user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind TEXT NOT NULL DEFAULT 'info', title TEXT NOT NULL, body TEXT NOT NULL DEFAULT '',
    dedupe_key TEXT UNIQUE, is_read BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS activity(
    id SERIAL PRIMARY KEY, user_id INT REFERENCES users(id) ON DELETE SET NULL,
    task_id INT REFERENCES tasks(id) ON DELETE CASCADE, action TEXT NOT NULL, detail TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS initiatives(
    id SERIAL PRIMARY KEY, section TEXT NOT NULL, title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',
    progress INT NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'planning',
    owner_id INT REFERENCES users(id) ON DELETE SET NULL, due_date DATE, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS documents(
    id SERIAL PRIMARY KEY, title TEXT NOT NULL, type TEXT NOT NULL DEFAULT 'Шаблон', status TEXT NOT NULL DEFAULT 'draft',
    owner_id INT REFERENCES users(id) ON DELETE SET NULL, url TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY, value TEXT NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee_id)`,
  `CREATE INDEX IF NOT EXISTS idx_stages_task ON stages(task_id)`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id, started_at)`,
  `CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id, created_at)`,
];

console.log('▶ Neon: jadvallar tekshirilmoqda...');
for (const s of schema) await run(s);

const [{ c }] = await run('SELECT COUNT(*)::int AS c FROM users');
if (c === 0) {
  console.log('▶ Birinchi ishga tushirish: demo ma\'lumotlar qo\'shilmoqda...');
  const adminHash = bcrypt.hashSync('Cactus2026!', 10);
  const teamHash = bcrypt.hashSync('cactus123', 10);
  const people = [
    ['Абдуллаев Иброхим', 'admin@cactus.uz', 'founder', 'ГАП / руководитель', 'Архитектура', 'ИА', 0, adminHash],
    ['Камол Халимов', 'kamol@cactus.uz', 'manager', 'Архитектор-менеджер', 'Архитектура', 'КХ', 60000, teamHash],
    ['Корабоевна Муаззам', 'muazzam@cactus.uz', 'specialist', 'Архитектор', 'Архитектура', 'МК', 45000, teamHash],
    ['Норкузиева Элмира', 'elmira@cactus.uz', 'specialist', 'Генпланист', 'Генплан', 'ЭН', 45000, teamHash],
    ['Ўрозалиева Мафтуна', 'maftuna@cactus.uz', 'specialist', 'Архитектор', 'Архитектура', 'МЎ', 45000, teamHash],
    ['Камолиддин Шокиров', 'kamoliddin@cactus.uz', 'specialist', '3D-артист', '3D', 'КШ', 50000, teamHash],
    ['Темур Саматов', 'temur@cactus.uz', 'it', 'IT-специалист', 'IT', 'ТС', 55000, teamHash],
    ['Асадов Акбар', 'akbar@cactus.uz', 'specialist', 'Архитектор', 'Архитектура', 'АА', 45000, teamHash],
    ['Аъзамов Саидафзал', 'saidafzal@cactus.uz', 'specialist', 'Архитектор', 'Архитектура', 'АС', 45000, teamHash],
  ];
  const ids = {};
  for (const p of people) {
    const [r] = await run(
      'INSERT INTO users(name,email,role,job_title,department,initials,hourly_rate,password_hash) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id',
      [p[0], p[1], p[2], p[3], p[4], p[5], p[6], p[7]]
    );
    ids[p[5]] = r.id;
  }
  const projects = [
    ['Жилой комплекс «Навруз»', 'Архитектура', 450000000],
    ['Бизнес-парк Orion', 'Архитектура', 320000000],
    ['Школа № 17', 'Архитектура', 180000000],
    ['CACTUS 3D', '3D-визуализация', 90000000],
  ];
  const pid = [];
  for (const p of projects) {
    const [r] = await run('INSERT INTO projects(name,direction,budget) VALUES($1,$2,$3) RETURNING id', [p[0], p[1], p[2]]);
    pid.push(r.id);
  }
  const demoTasks = [
    ['Разработка АР-части', 'Подготовить согласованный комплект архитектурных чертежей.', pid[0], 'АР', 'МК', 6, 24, 3],
    ['Генеральный план участка', 'Проверить транспортные связи, отступы, зонирование и посадку зданий.', pid[1], 'Генплан', 'ЭН', 3, 18, 3],
    ['Фасадные варианты', 'Подготовить 3 варианта фасадов.', pid[0], 'АР', 'МЎ', 9, 16, 2],
    ['Планировочные решения 1-го этажа', 'Комплект планов первого этажа.', pid[2], 'АР', 'МК', 5, 8, 2],
  ];
  for (const t of demoTasks) {
    const [r] = await run(
      `INSERT INTO tasks(title,description,project_id,type,assignee_id,created_by,due_date,planned_hours,complexity)
       VALUES($1,$2,$3,$4,$5,$6,${TODAY} + $7::int,$8,$9) RETURNING id`,
      [t[0], t[1], t[2], t[3], ids[t[4]], ids['ИА'], t[5], t[6], t[7]]
    );
    const st = TEMPLATES[t[3]];
    await run(
      'INSERT INTO stages(task_id,position,name,weight) SELECT $1::int, * FROM unnest($2::int[], $3::text[], $4::int[])',
      [r.id, st.map((_, i) => i), st.map((s) => s.name), st.map((s) => s.weight)]
    );
  }
  const init = [
    ['growth', 'Услуги комплексного проектирования', 'Проверить спрос у действующих заказчиков', 45, 'research'],
    ['growth', 'Партнёрская сеть застройщиков', 'Список потенциальных партнёров и план контактов', 20, 'planning'],
    ['growth', 'Новый региональный рынок', 'Сравнить спрос, конкурентов, затраты и риски входа', 10, 'idea'],
    ['marketing', 'Входящие обращения', 'Назначить ответственного и следующий шаг для каждого лида', 65, 'active'],
    ['marketing', 'Коммерческие предложения', 'Контроль подготовки, отправки и обратной связи', 48, 'active'],
    ['marketing', 'Маркетинговый календарь', 'Кейсы, портфолио, сайт, публикации', 30, 'planning'],
    ['product', 'Cactus Timeline', 'Задачи, этапы, время, проверка, роли и файлы', 70, 'active'],
    ['product', 'Автоматизация процессов', 'Сократить повторяющиеся ручные действия', 18, 'planning'],
    ['operations', 'Стандарты передачи результата', 'Единые чек-листы по типам задач', 58, 'active'],
    ['operations', 'База инструкций', 'Правила работы и онбординг новых сотрудников', 25, 'planning'],
    ['strategy', 'Стандартизация процесса проектирования', 'Владелец: ГАП · срок: квартал', 35, 'active'],
    ['strategy', 'Единая система управления проектами', 'Поэтапное внедрение', 20, 'active'],
  ];
  for (const i of init) {
    await run('INSERT INTO initiatives(section,title,description,progress,status,owner_id) VALUES($1,$2,$3,$4,$5,$6)', [i[0], i[1], i[2], i[3], i[4], ids['ИА']]);
  }
  await run("INSERT INTO documents(title,type,status,owner_id) VALUES('Шаблон технического задания','Шаблон','draft',$1),('Реестр договоров','Реестр','draft',$1),('Стандарты оформления проектов','Регламент','approved',$1)", [ids['ИА']]);
  console.log('✔ Demo: admin@cactus.uz / Cactus2026!   (jamoa: cactus123)');
}
console.log('✔ Baza tayyor.\n');
