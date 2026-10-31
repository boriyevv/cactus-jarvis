import Anthropic from '@anthropic-ai/sdk';
import { one } from '@/lib/db';
import { handler, body, HttpError } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { ROLE_LABEL } from '@/lib/perm';
import { TOOLS, runTool } from '@/lib/jarvis-tools';
import { TODAY } from '@/lib/tasks';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

function systemPrompt(user: any, today: string) {
  return `Ты — JARVIS, голосовой AI-ассистент и «пульт управления» системы CACTUS Founder Command Center (архитектурная студия: задания, этапы с весами, учёт времени, проверка результатов, отчёты, финансы).
Сегодня: ${today} (Ташкент). Собеседник: ${user.name}, ${user.job_title || ROLE_LABEL[user.role]} (роль: ${user.role}).

Правила:
- Отвечай на языке пользователя (русский, узбекский или английский). Коротко: ответ будет озвучен голосом, обычно 1–3 предложения. Без markdown-таблиц и эмодзи, кроме строки с доступами.
- Для любых данных и действий используй инструменты — никогда не выдумывай цифры. Если данных нет — скажи прямо.
- «Первый сотрудник/ишчи» = первый в list_employees среди не-руководителей; назови его по имени.
- Для процентов используй completion_percent (доля завершённых заданий) и avg_progress (средний прогресс активных); объясни, что именно назвал.
- Чтобы предупредить опаздывающих: check_lateness, затем send_warning или check_lateness с notify=true. Формулируй предупреждение вежливо и конкретно (задание, срок).
- Добавляя сотрудника, роль оставляй specialist, если руководитель явно не просил иное. После add_employee последней строкой ответа выведи: «🔑 Логин: … Пароль: …» (эту строку система не озвучивает). Сам пароль вслух не произноси.
- Деактивацию сотрудника, удаление и массовые рассылки выполняй только после явного подтверждения пользователя в чате.
- Если инструмент вернул ошибку — объясни причину простыми словами и предложи, что сделать.
- Даты в инструментах — формат YYYY-MM-DD; «завтра», «в пятницу» переводи в дату относительно сегодняшней.`;
}

export const POST = handler(async (req) => {
  const user = await requireUser();
  if (!process.env.ANTHROPIC_API_KEY) throw new HttpError(400, 'ANTHROPIC_API_KEY не задан — добавьте ключ в .env.local и перезапустите yarn dev');
  const { messages } = await body(req);
  let msgs: any[] = (Array.isArray(messages) ? messages : [])
    .slice(-20)
    .filter((m: any) => m && (m.role === 'user' || m.role === 'assistant') && String(m.content || '').trim())
    .map((m: any) => ({ role: m.role, content: String(m.content) }));
  while (msgs.length && msgs[0].role !== 'user') msgs.shift();
  if (!msgs.length) throw new HttpError(400, 'Пустое сообщение');

  const d = await one(`SELECT ${TODAY}::text AS d, to_char(now() AT TIME ZONE 'Asia/Tashkent','HH24:MI') AS t, to_char(now() AT TIME ZONE 'Asia/Tashkent','Dy') AS dow`);
  const client = new Anthropic();
  const model = process.env.JARVIS_MODEL || 'claude-sonnet-5-5';
  const actions: any[] = [];

  for (let step = 0; step < 8; step++) {
    const res = await client.messages.create({
      model, max_tokens: 1500, system: systemPrompt(user, `${d.d} (${d.dow}) ${d.t}`), tools: TOOLS, messages: msgs,
    });
    msgs.push({ role: 'assistant', content: res.content });
    if (res.stop_reason !== 'tool_use') {
      const reply = res.content.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('\n').trim();
      return { reply: reply || 'Готово.', actions };
    }
    const results: any[] = [];
    for (const b of res.content as any[]) {
      if (b.type !== 'tool_use') continue;
      try {
        const out = await runTool(b.name, b.input || {}, user);
        actions.push({ tool: b.name, input: b.input, ok: true });
        results.push({ type: 'tool_result', tool_use_id: b.id, content: JSON.stringify(out) });
      } catch (e: any) {
        actions.push({ tool: b.name, input: b.input, ok: false, error: e.message });
        results.push({ type: 'tool_result', tool_use_id: b.id, content: JSON.stringify({ error: e.message }), is_error: true });
      }
    }
    msgs.push({ role: 'user', content: results });
  }
  return { reply: 'Не удалось завершить за разумное число шагов — уточните запрос.', actions };
});
