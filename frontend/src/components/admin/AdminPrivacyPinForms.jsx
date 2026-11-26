import { useState } from 'react';
import { adminPrivacyService as api } from '../../services/adminPrivacyService';
const inputClass = 'mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-950';
const actionClass = 'rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50';
export function PinInput({ label, value, onChange, autoFocus = false, autoComplete = 'off' }) {
  return <label className="block text-sm font-semibold">{label}<input aria-label={label} type="password" inputMode="numeric" pattern="[0-9]{6}" minLength={6} maxLength={6} required value={value} autoFocus={autoFocus} autoComplete={autoComplete} onChange={event => onChange(event.target.value.replace(/\D/g, ''))} className={inputClass} /></label>;
}
const errorMessage = error => error.response?.data?.message || 'Unable to update your privacy PIN. Please try again.';
export function PrivacyPinEditor({ configured, onSaved }) {
  const [password, setPassword] = useState(''), [currentPin, setCurrentPin] = useState(''), [newPin, setNewPin] = useState(''), [confirmPin, setConfirmPin] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const save = async event => {
    event.preventDefault(); if (busy) return; setError('');
    if (newPin !== confirmPin) { setError('The new PINs do not match.'); return; }
    setBusy(true);
    try { await api.setPin({ password, ...(configured ? { currentPin } : {}), newPin }); setPassword(''); setCurrentPin(''); setNewPin(''); setConfirmPin(''); onSaved?.(); }
    catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
  };
  return <form onSubmit={save} className="space-y-4"><label className="block text-sm font-semibold">Administrator password<input aria-label="Administrator password" type="password" required minLength={6} maxLength={200} autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} className={inputClass} /></label>{configured && <PinInput label="Current privacy PIN" value={currentPin} onChange={setCurrentPin} />}<PinInput label="New six-digit PIN" value={newPin} onChange={setNewPin} autoComplete="new-password" /><PinInput label="Confirm new PIN" value={confirmPin} onChange={setConfirmPin} autoComplete="new-password" />{error && <p role="alert" className="text-sm text-rose-700">{error}</p>}<button className={actionClass} disabled={busy}>{busy ? 'Saving…' : configured ? 'Change privacy PIN' : 'Set privacy PIN'}</button></form>;
}
export function PrivacyPinRecovery({ login = false, onSaved }) {
  const [email, setEmail] = useState(''), [password, setPassword] = useState(''), [challenge, setChallenge] = useState(null);
  const [otp, setOtp] = useState(''), [newPin, setNewPin] = useState(''), [confirmPin, setConfirmPin] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [saved, setSaved] = useState(false);
  const submit = async event => {
    event.preventDefault(); if (busy) return; setError(''); setBusy(true);
    try {
      if (!challenge) {
        setChallenge(await api.requestReset({ password, ...(login ? { email } : {}) }, login)); setPassword('');
      } else {
        if (newPin !== confirmPin) { setError('The new PINs do not match.'); return; }
        await api.resetPin({ challengeToken: challenge.challengeToken, otp, newPin }, login);
        setChallenge(null); setOtp(''); setNewPin(''); setConfirmPin(''); setSaved(true); onSaved?.();
      }
    } catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
  };
  if (saved) return <p role="status" className="text-sm text-emerald-700">Privacy PIN reset successfully.{login ? ' Sign in with your administrator credentials to continue.' : ''}</p>;
  return <form onSubmit={submit} className="space-y-4"><p className="text-sm text-slate-600">{challenge ? `Enter the verification code sent to your registered phone ${challenge.maskedPhone}.` : login ? 'Verify your super admin email and password, then the SMS OTP sent to your registered phone, to set a new privacy PIN.' : 'Confirm your administrator password. We will send a verification OTP to your registered phone.'}</p>{!challenge ? <>{login && <label className="block text-sm font-semibold">Super admin email<input aria-label="Super admin email" type="email" required maxLength={254} autoComplete="username" value={email} onChange={event => setEmail(event.target.value)} className={inputClass} /></label>}<label className="block text-sm font-semibold">Administrator password<input aria-label="Administrator password" type="password" required minLength={6} maxLength={200} autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} className={inputClass} /></label></> : <><PinInput label="SMS verification OTP" value={otp} onChange={setOtp} autoFocus autoComplete="one-time-code" />{challenge.mockOtp && <p className="text-xs text-slate-500">Development OTP: {challenge.mockOtp}</p>}<PinInput label="New six-digit PIN" value={newPin} onChange={setNewPin} autoComplete="new-password" /><PinInput label="Confirm new PIN" value={confirmPin} onChange={setConfirmPin} autoComplete="new-password" /><button type="button" className="text-sm underline" disabled={busy} onClick={() => { setChallenge(null); setOtp(''); setNewPin(''); setConfirmPin(''); setError(''); }}>Start verification again</button></>}{error && <p role="alert" className="text-sm text-rose-700">{error}</p>}<button className={actionClass} disabled={busy}>{busy ? 'Please wait…' : challenge ? 'Verify OTP & reset PIN' : 'Send PIN reset OTP'}</button></form>;
}
