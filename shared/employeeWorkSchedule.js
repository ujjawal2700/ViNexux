export const WORK_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
export const DEFAULT_WORK_SCHEDULE = Object.freeze({ enabled: false, days: Object.fromEntries(WORK_DAYS.map(day => [day, { enabled: day !== 'sunday', start: '10:00', end: '19:00' }])) });
export const IST_OFFSET_MS = 330 * 60000;
export const istDate = (now = new Date()) => new Date(new Date(now).getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
export const atIst = (date, time) => new Date(`${date}T${time}:00+05:30`);
export const minutesOf = time => { const [hours, minutes] = time.split(':').map(Number); return hours * 60 + minutes; };
export const formatOfficeTime = value => new Date(value).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit', hour12: true });
export function employeeWorkWindow(schedule, now = new Date()) {
  if (!schedule?.enabled) return null;
  const workDate = istDate(now);
  const weekday = new Date(`${workDate}T12:00:00+05:30`).toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata', weekday: 'long' }).toLowerCase();
  const shift = schedule.days?.[weekday];
  if (!shift?.enabled) return { workDate, weekday, working: false, issuedAt: atIst(workDate, '08:00').toISOString() };
  const start = atIst(workDate, shift.start), end = atIst(workDate, shift.end);
  return { workDate, weekday, working: true, shiftStart: start.toISOString(), shiftEnd: end.toISOString(),
    issuedAt: atIst(workDate, '08:00').toISOString(), loginFrom: new Date(start.getTime() - 60 * 60000).toISOString(),
    warnAt: new Date(end.getTime() - 15 * 60000).toISOString(), expiresAt: new Date(end.getTime() + 20 * 60000).toISOString() };
}
export const withinWorkWindow = (window, now = new Date()) => Boolean(window?.working && new Date(window.loginFrom) <= now && now < new Date(window.expiresAt));
