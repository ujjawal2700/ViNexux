// Tab-local recovery replaces native browser "leave page" prompts.
// Keys are scoped to the signed-in admin by each editor.
export function readSessionDraft(key) {
  try {
    const value = JSON.parse(sessionStorage.getItem(key));
    return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
  } catch { return null; }
}
export function saveSessionDraft(key, value) {
  try { sessionStorage.setItem(key, JSON.stringify(value)); } catch { /* Storage may be unavailable. */ }
}
export function clearSessionDraft(key) {
  try { sessionStorage.removeItem(key); } catch { /* Storage may be unavailable. */ }
}
