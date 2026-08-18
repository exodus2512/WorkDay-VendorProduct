/**
 * Explicit State Machines for Financial Entities
 * Enforces allowed state transitions and prevents invalid jumps.
 */

const STATE_TRANSITIONS = {
  TIMESHEET: {
    DRAFT: ['SUBMITTED'],
    SUBMITTED: ['APPROVED', 'REJECTED'],
    REJECTED: ['SUBMITTED'],
    APPROVED: [] // Terminal state
  },
  MILESTONE: {
    PENDING: ['IN_PROGRESS'],
    IN_PROGRESS: ['SUBMITTED'],
    SUBMITTED: ['APPROVED', 'REJECTED'],
    REJECTED: ['SUBMITTED'],
    APPROVED: ['COMPLETED'],
    COMPLETED: [] // Terminal state
  },
  INVOICE: {
    DRAFT: ['SUBMITTED'],
    SUBMITTED: ['APPROVED', 'PAID', 'REJECTED'],
    REJECTED: ['SUBMITTED'], // Can resubmit if needed
    APPROVED: ['PAID'],
    PAID: [] // Terminal state
  },
  PAYROLL: {
    PENDING: ['PROCESSED'],
    PROCESSED: ['PAID'],
    PAID: [] // Terminal state
  }
};

/**
 * Validates a state transition.
 * 
 * @param {string} entityType - E.g., 'TIMESHEET', 'MILESTONE', 'INVOICE'
 * @param {string} currentState - The current status in DB
 * @param {string} targetState - The requested new status
 * @returns {boolean} True if the transition is allowed
 */
export function isValidTransition(entityType, currentState, targetState) {
  const transitions = STATE_TRANSITIONS[entityType.toUpperCase()];
  if (!transitions) {
    throw new Error(`Unknown entity type for state machine: ${entityType}`);
  }

  // If the state is unchanged, we can allow it as a no-op, but typically this is called on change.
  if (currentState === targetState) return true;

  const allowedNextStates = transitions[currentState.toUpperCase()];
  if (!allowedNextStates) {
    return false; // Current state doesn't exist in map (e.g. invalid current state)
  }

  return allowedNextStates.includes(targetState.toUpperCase());
}
