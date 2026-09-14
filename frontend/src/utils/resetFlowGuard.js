/**
 * In-memory-only guard for the forgot-password flow.
 *
 * The reset-password page must be reachable ONLY by completing the
 * forgot-password OTP step first, and a refresh or back/forward navigation
 * while on it must force the user to start over. `location.state` (React
 * Router) is not reliable for this: browsers persist `history.state` across
 * a hard refresh, so relying on it alone would let a refreshed page keep
 * "remembering" the identifier.
 *
 * A plain module-scoped variable, on the other hand, lives only in the
 * current JS heap - a full page reload re-executes the module from
 * scratch and this resets to null unconditionally, which is exactly the
 * "refresh -> timed out -> back to login" behavior requested. Back/forward
 * navigation is handled separately via a popstate listener in
 * ResetPasswordPage.
 */
let activeFlow = null;

/**
 * Starts (or restarts) a reset flow for the given identifier.
 * Call this right after the "send OTP" step succeeds.
 */
export const startResetFlow = (identifier) => {
  activeFlow = {
    identifier,
    token: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  };
  return activeFlow.token;
};

/** Returns the active flow ({identifier, token}) or null if none/expired. */
export const getResetFlow = () => activeFlow;

/** Clears the active flow - call on success, timeout, or abandonment. */
export const clearResetFlow = () => {
  activeFlow = null;
};

export default { startResetFlow, getResetFlow, clearResetFlow };
