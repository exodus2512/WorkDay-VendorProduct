import { query } from '../db/db.js';

/**
 * Smart Bench & Skill Matcher Engine
 *
 * GET /api/match?skills=React,Node.js&requiredHours=20&vendor_id=1
 *
 * Scoring algorithm:
 *  1. Fetch every EMPLOYEE who is not UNAVAILABLE.
 *  2. Sum their ACTIVE assignment weekly_hour_limit to get "allocated hours".
 *  3. Compute available_hours = weekly_capacity_hours - allocated_hours.
 *  4. Filter out anyone with available_hours < requiredHours (or flag them with a warning).
 *  5. Compare contractor skills (comma-separated) against requested skills.
 *     match_score = matched_skills / total_requested_skills * 100 (0–100).
 *  6. Sort: primary → match_score DESC, secondary → available_hours DESC.
 */
export async function handleMatch(req, pathSegments, queryParams) {
  if (req.method !== 'GET') {
    return { status: 405, body: { error: 'Method Not Allowed' } };
  }

  const skillsParam = queryParams.get('skills') || '';
  const requiredHours = parseInt(queryParams.get('requiredHours') || '0', 10);
  const vendorId = queryParams.get('vendor_id');
  const includeUnderCapacity = queryParams.get('includeUnderCapacity') === 'true';

  // Parse requested skills — trim, lowercase for case-insensitive comparison
  const requestedSkills = skillsParam
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);

  // ── 1. Fetch all active employees (optionally scoped to a vendor) ──────────
  let empQuery = `
    SELECT id, name, email, skills, availability, status, weekly_capacity_hours, payout_currency, tax_region, tax_exempt, vendor_id
    FROM users
    WHERE role = 'EMPLOYEE'
      AND status != 'INACTIVE'
      AND availability != 'UNAVAILABLE'
  `;
  const empParams = [];
  if (vendorId) {
    empParams.push(vendorId);
    empQuery += ` AND vendor_id = $${empParams.length}`;
  }
  empQuery += ' ORDER BY name ASC';

  const empRes = await query(empQuery, empParams);
  const employees = empRes.rows;

  if (employees.length === 0) {
    return { status: 200, body: { candidates: [], meta: { requested_skills: requestedSkills, required_hours: requiredHours } } };
  }

  // ── 2. Fetch active assignment weekly_hour_limit sums per employee ─────────
  const allocQuery = `
    SELECT employee_id, SUM(weekly_hour_limit) AS allocated_hours
    FROM assignments
    WHERE status = 'ACTIVE'
    GROUP BY employee_id
  `;
  const allocRes = await query(allocQuery);
  const allocationMap = {};
  for (const row of allocRes.rows) {
    allocationMap[row.employee_id] = parseInt(row.allocated_hours, 10);
  }

  // ── 3. Fetch current active assignment details per employee (for display) ──
  const assignDetailQuery = `
    SELECT a.employee_id, a.weekly_hour_limit, p.name AS project_name, a.role AS assignment_role
    FROM assignments a
    JOIN projects p ON p.id = a.project_id
    WHERE a.status = 'ACTIVE'
    ORDER BY a.employee_id, a.id DESC
  `;
  const assignDetailRes = await query(assignDetailQuery);
  const assignmentsByEmployee = {};
  for (const row of assignDetailRes.rows) {
    if (!assignmentsByEmployee[row.employee_id]) {
      assignmentsByEmployee[row.employee_id] = [];
    }
    assignmentsByEmployee[row.employee_id].push(row);
  }

  // ── 4 & 5. Score and rank each candidate ──────────────────────────────────
  const candidates = employees.map(emp => {
    const capacity = parseInt(emp.weekly_capacity_hours || 40, 10);
    const allocated = allocationMap[emp.id] || 0;
    const available = capacity - allocated;

    // Skill matching — case-insensitive, partial match allowed
    const empSkillsRaw = emp.skills || '';
    const empSkills = empSkillsRaw
      .split(',')
      .map(s => s.trim().toLowerCase())
      .filter(Boolean);

    let matchedSkills = [];
    let unmatchedSkills = [];

    if (requestedSkills.length > 0) {
      for (const req of requestedSkills) {
        // Accept partial matches (e.g. "node" matches "Node.js")
        const found = empSkills.find(es => es.includes(req) || req.includes(es));
        if (found) {
          matchedSkills.push(req);
        } else {
          unmatchedSkills.push(req);
        }
      }
    }

    const totalRequested = requestedSkills.length;
    const matchScore = totalRequested > 0
      ? Math.round((matchedSkills.length / totalRequested) * 100)
      : 100; // No skills requested → all are valid matches

    // Capacity status
    const isOverCapacity = requiredHours > 0 && available < requiredHours;
    const utilizationPct = capacity > 0 ? Math.min(Math.round((allocated / capacity) * 100), 100) : 0;

    return {
      id: emp.id,
      name: emp.name,
      email: emp.email,
      skills: emp.skills || '',
      skill_tags: empSkillsRaw.split(',').map(s => s.trim()).filter(Boolean),
      availability: emp.availability,
      weekly_capacity_hours: capacity,
      allocated_hours: allocated,
      available_hours: Math.max(0, available),
      payout_currency: emp.payout_currency,
      tax_region: emp.tax_region,
      tax_exempt: emp.tax_exempt,
      utilization_pct: utilizationPct,
      match_score: matchScore,
      matched_skills: matchedSkills,
      unmatched_skills: unmatchedSkills,
      is_over_capacity: isOverCapacity,
      current_assignments: (assignmentsByEmployee[emp.id] || []).map(a => ({
        project_name: a.project_name,
        role: a.assignment_role,
        weekly_hours: parseInt(a.weekly_hour_limit, 10)
      }))
    };
  });

  // ── 6. Filter (optional) and sort ─────────────────────────────────────────
  const allCandidates = candidates.sort((a, b) => {
    if (b.match_score !== a.match_score) return b.match_score - a.match_score;
    return b.available_hours - a.available_hours;
  });

  // Separate into recommended (capacity OK) and under-capacity warnings
  const recommended = allCandidates.filter(c => !c.is_over_capacity);
  const underCapacity = allCandidates.filter(c => c.is_over_capacity);

  return {
    status: 200,
    body: {
      meta: {
        requested_skills: requestedSkills,
        required_hours: requiredHours,
        total_candidates_evaluated: employees.length,
        recommended_count: recommended.length,
        under_capacity_count: underCapacity.length
      },
      recommended,
      under_capacity: underCapacity
    }
  };
}
