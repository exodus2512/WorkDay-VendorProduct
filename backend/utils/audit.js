import { query } from '../db/db.js';

/**
 * Logs a state transition or significant action to the immutable audit trail.
 * 
 * @param {Object} params
 * @param {number} params.vendor_id - Tenant ID
 * @param {string} params.entity_type - e.g., 'TIMESHEET', 'MILESTONE', 'INVOICE'
 * @param {number} params.entity_id - ID of the entity
 * @param {number} params.actor_id - ID of the user performing the action
 * @param {string} params.action - e.g., 'SUBMIT', 'APPROVE', 'REJECT', 'GENERATE', 'INVALID_TRANSITION_ATTEMPT'
 * @param {string} [params.previous_status] - Status before action
 * @param {string} [params.new_status] - Status after action
 * @param {Object} [params.metadata] - Additional JSON metadata context
 */
export async function logAudit({ vendor_id, entity_type, entity_id, actor_id, action, previous_status = null, new_status = null, metadata = {} }) {
  if (!vendor_id || !entity_type || !entity_id || !action) {
    console.error('Audit log missing required fields:', { vendor_id, entity_type, entity_id, action });
    return;
  }

  try {
    await query(
      `INSERT INTO audit_log (vendor_id, entity_type, entity_id, actor_id, action, previous_status, new_status, metadata) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [vendor_id, entity_type, entity_id, actor_id, action, previous_status, new_status, JSON.stringify(metadata)]
    );
  } catch (error) {
    console.error('Failed to write to audit log:', error);
  }
}
