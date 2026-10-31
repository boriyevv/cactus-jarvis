import { q } from './db';

export async function financeByProject() {
  return q(
    `SELECT p.id,p.name,p.direction,p.budget,
      COALESCE((SELECT SUM(t.planned_hours*COALESCE(u.hourly_rate,0)) FROM tasks t LEFT JOIN users u ON u.id=t.assignee_id WHERE t.project_id=p.id),0)::float AS planned_cost,
      COALESCE((SELECT SUM(EXTRACT(EPOCH FROM (COALESCE(s.ended_at,now())-s.started_at))/3600*u.hourly_rate) FROM sessions s JOIN tasks t ON t.id=s.task_id JOIN users u ON u.id=s.user_id WHERE t.project_id=p.id),0)::float AS actual_cost,
      COALESCE((SELECT SUM(EXTRACT(EPOCH FROM (COALESCE(s.ended_at,now())-s.started_at))/3600) FROM sessions s JOIN tasks t ON t.id=s.task_id WHERE t.project_id=p.id),0)::float AS hours
     FROM projects p ORDER BY p.id`
  );
}

export async function financeByEmployee() {
  return q(
    `SELECT u.id,u.name,u.job_title,u.hourly_rate,
      COALESCE((SELECT SUM(EXTRACT(EPOCH FROM (COALESCE(s.ended_at,now())-s.started_at))/3600) FROM sessions s WHERE s.user_id=u.id),0)::float AS hours
     FROM users u WHERE u.active AND u.role<>'founder' ORDER BY u.id`
  );
}
