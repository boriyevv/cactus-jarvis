'use client';
import { JarvisChat } from '@/components/Jarvis';
import { PageHead } from '@/components/ui';

export default function JarvisPage() {
  return (
    <>
      <PageHead title="JARVIS AI" sub="Управляйте всей системой голосом или текстом: сводки, проценты выполнения, предупреждения опаздывающим, создание заданий и сотрудников." />
      <div className="grid two">
        <JarvisChat page />
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Как пользоваться</h3>
          <ol className="small" style={{ paddingLeft: 18, lineHeight: 1.8 }}>
            <li>Нажмите «🎙 Включить голос» (Chrome / Edge) и разрешите микрофон.</li>
            <li>Скажите «Jarvis» — прозвучит сигнал — и продиктуйте команду. Можно сразу: «Jarvis, как идут дела?»</li>
            <li>Jarvis отвечает голосом и выполняет действия в системе.</li>
          </ol>
          <h3>Примеры команд</h3>
          <ul className="small" style={{ paddingLeft: 18, lineHeight: 1.8 }}>
            <li>«Как идут дела?»</li>
            <li>«Сколько процентов задач выполнил первый сотрудник?»</li>
            <li>«Кто опаздывает? Отправь им предупреждение.»</li>
            <li>«Добавь сотрудника Асадбек, профессия — программист.»</li>
            <li>«Создай задание „Фасады блока Б“ для Муаззам до пятницы.»</li>
            <li>«Прими результат по заданию генплан.»</li>
            <li>«Сколько часов отработали за неделю?»</li>
          </ul>
          <p className="small muted">Jarvis работает с правами того, кто вошёл: специалист не сможет управлять другими сотрудниками.</p>
        </div>
      </div>
    </>
  );
}
