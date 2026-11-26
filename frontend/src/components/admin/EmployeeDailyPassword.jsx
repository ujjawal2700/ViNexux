import { useEffect, useState } from 'react';
import Modal from '../ui/Modal';
import api from '../../api/axios';
import { copyText } from '../../utils/clipboard';
import { formatOfficeTime } from '../../../../shared/employeeWorkSchedule.js';
export default function EmployeeDailyPassword({ employee }) {
  const [open, setOpen] = useState(false), [result, setResult] = useState(null), [error, setError] = useState(''), [busy, setBusy] = useState(false), [copied, setCopied] = useState(false);
  const show = async () => {
    setOpen(true); setBusy(true); setError(''); setCopied(false); setResult(null);
    try { const response = await api.post(`/admin/access/employees/${employee._id}/daily-password`); setResult(response.data.data); }
    catch (error) { setError(error.response?.data?.message || 'Unable to reveal the daily password.'); } finally { setBusy(false); }
  };
  const close = () => { setOpen(false); setResult(null); setCopied(false); };
  useEffect(() => {
    if (!result?.available || !result.window?.expiresAt) return;
    const timeout = setTimeout(() => { setResult({ ...result, available: false, password: undefined }); setCopied(false); }, Math.max(0, new Date(result.window.expiresAt).getTime() - Date.now()));
    return () => clearTimeout(timeout);
  }, [result]);
  return <><button type="button" className="mt-3 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-primary" onClick={show}>Reveal today’s password</button><Modal isOpen={open} onClose={close} title={`Daily password · ${employee.fullName}`} size="sm">{busy ? <p role="status">Loading today’s password…</p> : error ? <p role="alert" className="text-sm text-rose-700">{error}</p> : result?.available ? <div className="space-y-4"><p className="text-sm text-muted-foreground">Only super admins can reveal this password. Share it with the employee when they arrive.</p><p className="break-all rounded-lg border bg-muted p-4 font-mono text-lg font-bold" aria-label="Employee daily password">{result.password}</p><p className="text-sm">Valid on {result.window.workDate}, from {formatOfficeTime(result.window.loginFrom)} to {formatOfficeTime(result.window.expiresAt)} IST.</p><button type="button" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white" onClick={async () => { if (await copyText(result.password)) setCopied(true); }}>{copied ? 'Copied' : 'Copy password'}</button></div> : <p role="status" className="text-sm">{result?.managed === false ? 'This role uses a manual password. Enable scheduled employee access in the role timetable for daily passwords.' : !result?.window?.working ? 'No working hours are scheduled for this employee today.' : new Date(result.window.issuedAt) > new Date() ? 'Today’s password will be available at 8 AM IST.' : 'Today’s password has expired. The next working day’s password is generated at 8 AM IST.'}</p>}</Modal></>;
}
