import { describe, expect, test } from '@jest/globals';
import { DEFAULT_WORK_SCHEDULE, employeeWorkWindow, withinWorkWindow } from '../../shared/employeeWorkSchedule.js';
import { employeeScheduleSchema } from '../../backend/src/validators/employeeSchedule.validator.js';
import { optionalAdminLocation } from '../../backend/src/utils/adminLocation.util.js';
const schedule = () => ({ ...structuredClone(DEFAULT_WORK_SCHEDULE), enabled: true });
describe('employee weekly schedule in IST', () => {
  test('a 10 AM–7 PM shift opens at 9 AM, warns at 6:45 PM and closes at 7:20 PM', () => {
    const window = employeeWorkWindow(schedule(), new Date('2026-11-30T12:00:00+05:30'));
    expect(window).toMatchObject({ workDate: '2026-11-30', weekday: 'monday', working: true, issuedAt: '2026-11-30T02:30:00.000Z', loginFrom: '2026-11-30T03:30:00.000Z', warnAt: '2026-11-30T13:15:00.000Z', expiresAt: '2026-11-30T13:50:00.000Z' });
    expect(withinWorkWindow(window, new Date('2026-11-30T08:59:59+05:30'))).toBe(false);
    expect(withinWorkWindow(window, new Date('2026-11-30T09:00:00+05:30'))).toBe(true);
    expect(withinWorkWindow(window, new Date('2026-11-30T19:19:59+05:30'))).toBe(true);
    expect(withinWorkWindow(window, new Date('2026-11-30T19:20:00+05:30'))).toBe(false);
  });
  test('Saturday can have different hours and Sunday can be disabled', () => {
    const value = schedule(); value.days.saturday = { enabled: true, start: '09:00', end: '15:00' };
    expect(employeeWorkWindow(value, new Date('2026-12-05T10:00:00+05:30'))).toMatchObject({ weekday: 'saturday', loginFrom: '2026-12-05T02:30:00.000Z', expiresAt: '2026-12-05T09:50:00.000Z' });
    const sunday = employeeWorkWindow(value, new Date('2026-12-06T10:00:00+05:30'));
    expect(sunday.working).toBe(false); expect(withinWorkWindow(sunday)).toBe(false);
    expect(employeeWorkWindow(DEFAULT_WORK_SCHEDULE)).toBeNull();
  });
  test('invalid times and shifts incompatible with 8 AM issuance are rejected', () => {
    for (const patch of [{ start: '08:00' }, { end: '10:00' }, { end: '23:40' }, { start: 'nonsense' }]) {
      const value = schedule(); Object.assign(value.days.monday, patch);
      expect(employeeScheduleSchema.safeParse(value).success).toBe(false);
    }
    expect(employeeScheduleSchema.safeParse(schedule()).success).toBe(true);
  });
  test('optional location only records current valid coordinates', () => {
    const now = new Date('2026-11-30T10:00:00+05:30');
    const location = { status: 'available', latitude: 25.18, longitude: 75.85, accuracy: 10, timestamp: now.getTime() };
    expect(optionalAdminLocation(location, now).latitude).toBe(25.18);
    for (const patch of [{ status: 'denied' }, { latitude: 91 }, { longitude: -181 }, { accuracy: -1 }, { timestamp: now.getTime() - 301000 }]) expect(optionalAdminLocation({ ...location, ...patch }, now)).toBeUndefined();
    expect(optionalAdminLocation(null, now)).toBeUndefined();
  });
});
