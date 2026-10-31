'use client';
import { useMe } from '@/lib/client';
import { ROLE_LABEL } from '@/lib/nav';
import { PageHead, Tag } from '@/components/ui';

const ROWS: [string, boolean[]][] = [
  ['Свои задания, таймер, отчёты, файлы', [true, true, true, true]],
  ['Все задания и фильтры по сотрудникам', [true, true, false, false]],
  ['Создавать и назначать задания', [true, true, false, false]],
  ['Проверять результаты (принять / вернуть)', [true, true, false, false]],
  ['Список сотрудников и их статистика', [true, true, false, false]],
  ['Добавлять сотрудников, сбрасывать пароли', [true, false, false, true]],
  ['Назначать роли', [true, false, false, false]],
  ['Проекты, документы, разделы бизнеса', [true, true, false, false]],
  ['Стратегия и инвестиции', [true, false, false, false]],
  ['Финансы и бюджеты', [true, false, false, false]],
  ['Jarvis: управление всей системой', [true, true, false, false]],
  ['Jarvis: свои данные и таймер', [true, true, true, true]],
];

export default function Access() {
  const me = useMe();
  const roles = ['founder', 'manager', 'specialist', 'it'];
  return (
    <>
      <PageHead title="Роли и доступ" sub={`Ваша роль: ${ROLE_LABEL[me.role]}. Права проверяются на сервере в каждом запросе — скрытие кнопок не является защитой.`} />
      <div className="card tbl-wrap">
        <table className="tbl">
          <thead><tr><th>Возможность</th>{roles.map((r) => <th key={r}>{ROLE_LABEL[r]}</th>)}</tr></thead>
          <tbody>{ROWS.map(([label, v]) => (
            <tr key={label}><td>{label}</td>{v.map((x, i) => <td key={i}>{x ? <Tag>да</Tag> : <Tag tone="gray">нет</Tag>}</td>)}</tr>
          ))}</tbody>
        </table>
      </div>
    </>
  );
}
