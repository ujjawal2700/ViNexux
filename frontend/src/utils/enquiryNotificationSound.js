let context;
const sounded = new Set();
export function enableEnquiryNotificationSound() {
  const unlock = () => {
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (Audio) { context ||= new Audio(); context.resume().catch(() => {}); }
    } catch { /* Browser/OS may disable audio. */ }
  };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
  return () => { window.removeEventListener('pointerdown', unlock); window.removeEventListener('keydown', unlock); };
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
