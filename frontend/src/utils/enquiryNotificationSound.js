let context;
const sounded = new Set();
export function enableEnquiryNotificationSound() {
  const unlock = event => unlockNotificationSound(event);
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
  return () => { window.removeEventListener('pointerdown', unlock); window.removeEventListener('keydown', unlock); };
}
export function playEnquiryReplySound(data) {
  if (!['enquiry-reply', 'quotation-response'].includes(data?.type) || !context || context.state !== 'running' || document.visibilityState !== 'visible') return;
  const key = `${data.type}:${data.enquiryId || data.quotationId}:${data.replyCount}`;
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

function announceSoundState() {
  window.dispatchEvent?.(new Event('notification-sound-ready'));
}
export async function unlockNotificationSound(event) {
  if (event?.target?.closest?.('[data-notification-sound-control]')) return;
  try {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (Audio) {
      if (!context || context.state === 'closed') {
        context = new Audio();
        context.addEventListener?.('statechange', announceSoundState);
      }
      await context.resume();
      announceSoundState();
    }
  } catch { /* Browsers require a user gesture before playing audio. */ }
}
export function isNotificationSoundReady() { return context?.state === 'running'; }
export function playAdminArrivalSound(id) {
  if (sounded.has(`admin:${id}`)) return;
  if (!isNotificationSoundReady()) {
    // A background tab may suspend audio after it was enabled.
    if (context?.state === 'suspended') {
      context.resume().then(() => {
        announceSoundState();
        if (isNotificationSoundReady()) playAdminArrivalSound(id);
      }).catch(() => {});
    }
    return;
  }
  try {
    const tone = context.createOscillator(), gain = context.createGain();
    const start = context.currentTime;
    tone.type = 'triangle'; tone.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, start);
    for (const [index, offset] of [0, 0.33, 0.66].entries()) {
      tone.frequency.setValueAtTime?.(index === 1 ? 1318 : 880, start + offset);
      gain.gain.exponentialRampToValueAtTime(0.55, start + offset + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + offset + 0.30);
    }
    tone.connect(gain); gain.connect(context.destination); tone.start(); tone.stop(start + 1);
    sounded.add(`admin:${id}`);
    if (sounded.size > 2000) sounded.delete(sounded.values().next().value);
    tone.onended = () => { tone.disconnect(); gain.disconnect(); };
  } catch { /* The visible banner remains available when audio is blocked. */ }
}
