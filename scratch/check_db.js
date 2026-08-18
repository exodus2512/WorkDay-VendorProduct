import { query } from '../backend/db/db.js';

async function check() {
  console.log('=== PROJECTS ===');
  const p = await query('SELECT p.*, u.name as pm_name FROM projects p LEFT JOIN users u ON u.id = p.project_manager_id');
  console.log(JSON.stringify(p.rows, null, 2));

  console.log('=== ASSIGNMENTS ===');
  const a = await query('SELECT a.*, p.name as project_name, u.name as employee_name FROM assignments a LEFT JOIN projects p ON p.id = a.project_id LEFT JOIN users u ON u.id = a.employee_id');
  console.log(JSON.stringify(a.rows, null, 2));

  console.log('=== TIMESHEETS ===');
  const t = await query('SELECT t.*, a.project_id, p.name as project_name, u.name as employee_name, p.project_manager_id as pm_id FROM timesheets t LEFT JOIN assignments a ON a.id = t.assignment_id LEFT JOIN projects p ON p.id = a.project_id LEFT JOIN users u ON u.id = t.employee_id');
  console.log(JSON.stringify(t.rows, null, 2));

  console.log('=== MILESTONES ===');
  const m = await query('SELECT m.*, p.name as project_name, p.project_manager_id as pm_id FROM milestones m LEFT JOIN projects p ON p.id = m.project_id');
  console.log(JSON.stringify(m.rows, null, 2));
}

check().catch(console.error);
