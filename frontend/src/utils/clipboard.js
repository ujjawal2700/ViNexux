export async function copyText(value) {
  try {
    if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(value); return true; }
  } catch { /* Try the browser's legacy copy action when clipboard access is denied. */ }
  const previousFocus = document.activeElement;
  const input = document.createElement('textarea');
  input.value = value;
  input.setAttribute('readonly', '');
  input.style.cssText = 'position:fixed;left:0;top:0;opacity:0;pointer-events:none';
  document.body.appendChild(input);
  try { input.select(); return document.execCommand('copy'); }
  catch { return false; }
  finally { input.remove(); previousFocus?.focus?.({ preventScroll: true }); }
}
