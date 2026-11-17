let context;
const sounded = new Set();
export function enableEnquiryNotificationSound() {
  window.addEventListener('pointerdown', unlockNotificationSound);
  window.addEventListener('keydown', unlockNotificationSound);
  return () => { window.removeEventListener('pointerdown', unlockNotificationSound); window.removeEventListener('keydown', unlockNotificationSound); };
}
export function playEnquiryReplySound(data) {
  if (data?.type !== 'enquiry-reply' || !context || context.state !== 'running' || document.visibilityState !== 'visible') return;
  const key = `${data.enquiryId}:${data.replyCount}`;
  if (sounded.has(key)) return;
  sounded.add(key);
  if (sounded.size > 100) sounded.delete(sounded.values().next().value);
  try {
    const oscillator = context.createOscillator(); const gain = context.createGain();
    oscillator.type = 'sine'; oscillator.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.15, context.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.25);
    oscillator.connect(gain); gain.connect(context.destination); oscillator.start(); oscillator.stop(context.currentTime + 0.26);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  } catch { /* Sound is supplementary; the response remains available. */ }
}

export async function unlockNotificationSound() {
  try {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (Audio) { context ||= new Audio(); await context.resume(); window.dispatchEvent?.(new Event('notification-sound-ready')); }
  } catch { /* Browsers require a user gesture before playing audio. */ }
}
export function isNotificationSoundReady() { return context?.state === 'running'; }
export function playAdminArrivalSound(id) {
  if (!isNotificationSoundReady() || sounded.has(`admin:${id}`)) return;
  sounded.add(`admin:${id}`);
  if (sounded.size > 2000) sounded.delete(sounded.values().next().value);
  try {
    const tone = context.createOscillator(), gain = context.createGain();
    const start = context.currentTime;
    tone.type = 'sine'; tone.frequency.value = 1046;
    gain.gain.setValueAtTime(0.0001, start);
    for (const offset of [0, 0.33, 0.66]) {
      gain.gain.exponentialRampToValueAtTime(0.12, start + offset + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + offset + 0.30);
    }
    tone.connect(gain); gain.connect(context.destination); tone.start(); tone.stop(start + 1);
    tone.onended = () => { tone.disconnect(); gain.disconnect(); };
  } catch { /* The visible banner remains available when audio is blocked. */ }
}
