import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { notifySessionExpired } from '../../api/axios';
import { formatOfficeTime } from '../../../../shared/employeeWorkSchedule.js';
export default function EmployeeWorkSession() {
  const { adminUser } = useAuth(), { pathname } = useLocation();
  const [workWindow, setWorkWindow] = useState(adminUser?.employeeWorkWindow), [now, setNow] = useState(Date.now());
  const expired = useRef(false);
  useEffect(() => { setWorkWindow(adminUser?.employeeWorkWindow); expired.current = false; }, [adminUser]);
  useEffect(() => {
    if (!adminUser?.isEmployee) return;
    const update = event => setWorkWindow(event.detail);
    const timer = globalThis.setInterval(() => setNow(Date.now()), 1000);
    globalThis.window.addEventListener('employee-work-window-updated', update);
    return () => { globalThis.clearInterval(timer); globalThis.window.removeEventListener('employee-work-window-updated', update); };
  }, [adminUser?.isEmployee]);
  useEffect(() => {
    if (!adminUser?.isEmployee || !workWindow?.working || expired.current || now < new Date(workWindow.expiresAt).getTime()) return;
    expired.current = true;
    notifySessionExpired('admin', 'Your employee working session has ended. Ask your super admin for the next working day’s password.');
  }, [now, workWindow, adminUser?.isEmployee]);
  if (!adminUser?.isEmployee || !workWindow?.working || !pathname.startsWith('/admin') || now < new Date(workWindow.warnAt).getTime() || now >= new Date(workWindow.expiresAt).getTime()) return null;
  return <aside role="alert" className="fixed bottom-4 right-4 z-[80] mx-4 max-w-sm rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 shadow-lg"><p className="font-bold">Your working session is ending</p><p className="mt-2">Your session expires at {formatOfficeTime(workWindow.expiresAt)} IST, including the 20-minute grace period. Save your work before then.</p></aside>;
}
