import { useState } from 'react';
import { useAdminPrivacy } from './AdminPrivacyGuard';
import { PrivacyPinEditor, PrivacyPinRecovery } from './AdminPrivacyPinForms';
export default function AdminPrivacySettings() {
  const privacy = useAdminPrivacy();
  const [mode, setMode] = useState(''), [saved, setSaved] = useState(false);
  const done = () => { privacy.unlocked(); setMode(''); setSaved(true); };
  return <section className="space-y-4 rounded-2xl border border-border bg-card p-6" aria-label="Admin privacy lock settings"><h2 className="text-xl font-bold">Privacy lock & six-digit PIN</h2><p className="text-sm text-muted-foreground">Press F8 (Fn + F8 on some keyboards) or use Lock panel to hide your admin workspace. Your privacy PIN is separate from your login password.</p><p className="text-sm font-semibold">{privacy?.configured ? 'Privacy PIN is set.' : 'No privacy PIN has been set yet.'}</p><div className="flex flex-wrap gap-3"><button className="rounded-lg border px-3 py-2 text-sm font-semibold" onClick={() => { setMode(mode === 'edit' ? '' : 'edit'); setSaved(false); }}>{privacy?.configured ? 'Change privacy PIN' : 'Set privacy PIN'}</button><button className="rounded-lg border px-3 py-2 text-sm font-semibold" onClick={() => { setMode(mode === 'reset' ? '' : 'reset'); setSaved(false); }}>Forgot privacy PIN?</button><button className="rounded-lg border px-3 py-2 text-sm font-semibold" onClick={privacy?.lock}>Lock panel (F8)</button></div>{saved && <p role="status" className="text-sm text-emerald-700">Privacy PIN updated.</p>}{mode === 'edit' && <PrivacyPinEditor configured={privacy?.configured} onSaved={done} />}{mode === 'reset' && <PrivacyPinRecovery onSaved={done} />}</section>;
}
