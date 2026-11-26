import { z } from 'zod';
import { WORK_DAYS, minutesOf } from '../../../shared/employeeWorkSchedule.js';
const time = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, 'Enter a valid time.');
const day = z.object({ enabled: z.boolean(), start: time, end: time }).strict().superRefine((shift, ctx) => {
  if (!shift.enabled) return;
  // Daily passwords are issued at 08:00, before the one-hour early-login window.
  if (minutesOf(shift.start) < 9 * 60) ctx.addIssue({ code: 'custom', path: ['start'], message: 'Start at 9 AM or later so the daily password is ready before login opens.' });
  if (minutesOf(shift.end) <= minutesOf(shift.start) || minutesOf(shift.end) > 23 * 60 + 39) ctx.addIssue({ code: 'custom', path: ['end'], message: 'End after the start time and by 11:39 PM, allowing the 20-minute grace period on the same day.' });
});
export const employeeScheduleSchema = z.object({ enabled: z.boolean(), days: z.object(Object.fromEntries(WORK_DAYS.map(key => [key, day]))).strict() }).strict();
