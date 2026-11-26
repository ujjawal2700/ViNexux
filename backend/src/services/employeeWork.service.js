import crypto from 'node:crypto';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { config } from '../config/env.js';
import { User } from '../models/User.js';
import { AccessRole } from '../models/AccessRole.js';
import { Session } from '../models/Session.js';
import { EmployeeWorkCredential } from '../models/EmployeeWorkCredential.js';
import { employeeWorkWindow, withinWorkWindow, formatOfficeTime } from '../../../shared/employeeWorkSchedule.js';
import { AppError } from '../utils/AppError.js';
const secretFields = '+passwordHash +passwordCiphertext +passwordIv +passwordAuthTag';
const cipherKey = () => crypto.createHash('sha256').update(`vinexus-employee-daily-password:${config.jwtSecret}`).digest();
const encrypt = password => {
  const iv = crypto.randomBytes(12), cipher = crypto.createCipheriv('aes-256-gcm', cipherKey(), iv);
  return { passwordIv: iv.toString('hex'), passwordCiphertext: Buffer.concat([cipher.update(password, 'utf8'), cipher.final()]).toString('hex'), passwordAuthTag: cipher.getAuthTag().toString('hex') };
};
const decrypt = record => {
  const decipher = crypto.createDecipheriv('aes-256-gcm', cipherKey(), Buffer.from(record.passwordIv, 'hex'));
  decipher.setAuthTag(Buffer.from(record.passwordAuthTag, 'hex'));
  return Buffer.concat([decipher.update(Buffer.from(record.passwordCiphertext, 'hex')), decipher.final()]).toString('utf8');
};
const expired = () => new AppError('Your scheduled employee session has ended. Sign in during your next working window with the new daily password.', 401, 'EMPLOYEE_SESSION_EXPIRED');
const ensureWindow = (window, now) => {
  if (!withinWorkWindow(window, now)) throw new AppError(window?.working ? `Employee login is available from ${formatOfficeTime(window.loginFrom)} to ${formatOfficeTime(window.expiresAt)} IST today.` : 'Your role has no working hours today. Contact your super admin.', 403, 'OUTSIDE_WORKING_HOURS');
};
export const employeeWorkService = {
  async credential(user, role, now = new Date()) {
    const window = employeeWorkWindow(role.workSchedule, now);
    if (!window?.working || now < new Date(window.issuedAt) || now >= new Date(window.expiresAt)) return null;
    const filter = { userId: user._id, roleId: role._id, workDate: window.workDate, revision: role.workScheduleRevision || 0 };
    const existing = await EmployeeWorkCredential.findOne(filter).select(secretFields);
    if (existing) return existing.discardedAt ? null : existing;
    const password = crypto.randomBytes(18).toString('base64url');
    const passwordHash = await bcrypt.hash(password, 12), encrypted = encrypt(password);
    try {
      return await mongoose.connection.transaction(async session => {
        // Sharing the role write lock with timetable edits prevents stale generation.
        const currentRole = await AccessRole.findOneAndUpdate({ _id: role._id, isActive: true, workScheduleRevision: role.workScheduleRevision || 0, 'workSchedule.enabled': true }, { $inc: { __v: 1 } }, { session });
        if (!currentRole) return null;
        const current = await User.findOne({ _id: user._id, accessRoleId: role._id, role: 'admin', isEmployee: true, accountStatus: 'active' }).session(session);
        if (!current) return null;
        const replay = await EmployeeWorkCredential.findOne(filter).select(secretFields).session(session);
        if (replay) return replay.discardedAt ? null : replay;
        const [record] = await EmployeeWorkCredential.create([{ ...filter, roleId: role._id, ...encrypted, passwordHash,
          issuedAt: window.issuedAt, loginFrom: window.loginFrom, expiresAt: window.expiresAt,
          purgeAt: new Date(new Date(window.expiresAt).getTime() + 86400000) }], { session });
        await User.updateOne({ _id: user._id }, { $set: { passwordHash, dailyPasswordId: record._id, dailyPasswordDate: window.workDate } }, { session });
        return record;
      });
    } catch (error) {
      if (error.code === 11000) return EmployeeWorkCredential.findOne({ ...filter, discardedAt: null }).select(secretFields);
      throw error;
    }
  },
  async verifyPassword(user, password, now = new Date()) {
    if (!user.isEmployee) return Boolean(user.passwordHash && await bcrypt.compare(password, user.passwordHash));
    const role = await AccessRole.findById(user.accessRoleId).lean();
    if (!role?.workSchedule?.enabled) return Boolean(user.passwordHash && await bcrypt.compare(password, user.passwordHash));
    if (!role.isActive) throw new AppError('Your employee role is disabled.', 403, 'FORBIDDEN');
    const window = employeeWorkWindow(role.workSchedule, now); ensureWindow(window, now);
    const record = await this.credential(user, role, now);
    return Boolean(record?.passwordHash && await bcrypt.compare(password, record.passwordHash));
  },
  async loginWindow(user, now = new Date()) {
    if (!user.isEmployee) return null;
    const role = await AccessRole.findById(user.accessRoleId).lean();
    if (!role?.workSchedule?.enabled) return null;
    if (!role.isActive) throw expired();
    const window = employeeWorkWindow(role.workSchedule, now); ensureWindow(window, now);
    const record = await this.credential(user, role, now);
    if (!record || record.discardedAt) throw expired();
    return { ...window, credentialId: record._id, revision: role.workScheduleRevision || 0 };
  },
  async checkSession(user, session, access, now = new Date()) {
    if (!user.isEmployee || !access.workSchedule?.enabled) return;
    const window = employeeWorkWindow(access.workSchedule, now);
    if (!access.accessRoleActive || !withinWorkWindow(window, now) || session.employeeWorkDate !== window.workDate || !session.employeeCredentialId || String(session.employeeCredentialId) !== String(user.dailyPasswordId) || session.employeeScheduleRevision !== (access.workScheduleRevision || 0)) {
      await Session.updateOne({ _id: session._id }, { $set: { isActive: false, revokedAt: now } });
      throw expired();
    }
  },
  async reveal(userId, now = new Date()) {
    const user = await User.findOne({ _id: userId, role: 'admin', isEmployee: true }).lean();
    if (!user) throw new AppError('Employee not found.', 404, 'NOT_FOUND');
    const role = await AccessRole.findById(user.accessRoleId).lean();
    if (!role?.isActive || user.accountStatus !== 'active') throw new AppError('This employee or role is blocked.', 409, 'CONFLICT');
    if (!role.workSchedule?.enabled) return { managed: false, available: false };
    const window = employeeWorkWindow(role.workSchedule, now);
    const record = await this.credential(user, role, now);
    if (!record?.passwordCiphertext) return { managed: true, available: false, window };
    return { managed: true, available: true, password: decrypt(record), window, issuedAt: record.issuedAt };
  },
  async invalidate(userIds, session, now = new Date()) {
    const filter = { userId: { $in: userIds }, discardedAt: null };
    await EmployeeWorkCredential.updateMany(filter, { $set: { discardedAt: now }, $unset: { passwordHash: 1, passwordCiphertext: 1, passwordIv: 1, passwordAuthTag: 1 } }, { session });
    await User.updateMany({ _id: { $in: userIds }, dailyPasswordId: { $ne: null } }, { $unset: { passwordHash: 1, dailyPasswordId: 1, dailyPasswordDate: 1 } }, { session });
    await Session.updateMany({ userId: { $in: userIds }, isActive: true }, { $set: { isActive: false, revokedAt: now } }, { session });
  },
  async tick(now = new Date()) {
    const stale = await EmployeeWorkCredential.find({ expiresAt: { $lte: now }, discardedAt: null }).select('_id userId').lean();
    for (const record of stale) await mongoose.connection.transaction(async session => {
      await EmployeeWorkCredential.updateOne({ _id: record._id, discardedAt: null }, { $set: { discardedAt: now }, $unset: { passwordHash: 1, passwordCiphertext: 1, passwordIv: 1, passwordAuthTag: 1 } }, { session });
      await User.updateOne({ _id: record.userId, dailyPasswordId: record._id }, { $unset: { passwordHash: 1, dailyPasswordId: 1, dailyPasswordDate: 1 } }, { session });
      await Session.updateMany({ employeeCredentialId: record._id, isActive: true }, { $set: { isActive: false, revokedAt: now } }, { session });
    });
    const roles = await AccessRole.find({ isActive: true, 'workSchedule.enabled': true }).lean();
    for (const role of roles) {
      const window = employeeWorkWindow(role.workSchedule, now);
      if (!window?.working || now < new Date(window.issuedAt) || now >= new Date(window.expiresAt)) continue;
      const employees = await User.find({ role: 'admin', isEmployee: true, accessRoleId: role._id, accountStatus: 'active' }).select('_id accessRoleId').lean();
      for (const employee of employees) await this.credential(employee, role, now);
    }
  },
};
export function startEmployeeWorkWorker() {
  if (!config.isPrimaryInstance) return () => {};
  let running = false, stopped = false;
  const run = async () => { if (running || stopped) return; running = true; try { await employeeWorkService.tick(); } catch (error) { console.error('[Employee work schedule]', error.message); } finally { running = false; } };
  run();
  // Minute-aligned scheduling issues the next day's passwords at 08:00 IST.
  let interval;
  const first = setTimeout(() => { run(); interval = setInterval(run, 60000); interval.unref(); }, 60000 - Date.now() % 60000);
  first.unref();
  return () => { stopped = true; clearTimeout(first); clearInterval(interval); };
}
