import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { Session } from '../models/Session.js';
import { AccessRole } from '../models/AccessRole.js';
import { AuditLog } from '../audit/audit.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ADMIN_SECTIONS, isSuperAdmin } from '../../../shared/adminAccess.js';

const router = Router();
const fail = (message, status = 400) => { throw new AppError(message, status, 'VALIDATION_ERROR'); };
const parse = (schema, input) => { const result = schema.safeParse(input); if (!result.success) fail(result.error.issues.map(i => i.message).join('; ')); return result.data; };
const id = value => { if (!mongoose.isValidObjectId(value)) fail('Invalid record ID.'); return value; };
const reply = (res, data) => ApiResponse.success(res, 'Access control', data);
export const roleInput = z.object({
  name: z.string().trim().min(2).max(80), description: z.string().trim().max(300).default(''), isActive: z.boolean().default(true),
  permissions: z.object(Object.fromEntries(ADMIN_SECTIONS.map(({ key }) => [key, z.object({ read: z.boolean(), write: z.boolean() }).strict().default({ read: false, write: false })]))).strict(),
}).strict();
export const employeeInput = z.object({
  fullName: z.string().trim().min(2).max(100), email: z.string().trim().email().max(254).toLowerCase(),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/, 'Enter a 10-digit Indian mobile number.'),
  password: z.string().min(8).max(72), accessRoleId: z.string().refine(mongoose.isValidObjectId, 'Choose a valid role.'),
  accountStatus: z.enum(['active', 'blocked']).default('active'),
}).strict();
const editableEmployee = employeeInput.extend({ password: z.string().min(8).max(72).optional() });
const publicEmployee = user => { const value = user.toObject ? user.toObject() : { ...user }; delete value.passwordHash; return value; };
router.use(authenticate);
router.get('/self', asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') fail('Admin access required.', 403);
  reply(res, { access: { role: 'admin', ...req.adminAccess }, sections: ADMIN_SECTIONS });
}));
router.use((req, res, next) => { if (!isSuperAdmin(req.user)) return next(new AppError('Only a super admin can manage access or view the logbook.', 403, 'FORBIDDEN')); next(); });
router.get('/roles', asyncHandler(async (req, res) => {
  reply(res, { roles: await AccessRole.find().sort({ name: 1 }).lean(), sections: ADMIN_SECTIONS });
}));
router.post('/roles', asyncHandler(async (req, res) => {
  const data = parse(roleInput, req.body);
  const role = await AccessRole.create({ ...data, createdBy: req.user._id });
  reply(res, { role });
}));
router.put('/roles/:id', asyncHandler(async (req, res) => {
  const data = parse(roleInput, req.body);
  const role = await AccessRole.findByIdAndUpdate(id(req.params.id), { $set: data }, { new: true, runValidators: true });
  if (!role) fail('Role not found.', 404);
  reply(res, { role });
}));
const assignedEmployees = (roleId, session = null) => User.find({ isEmployee: true, accessRoleId: roleId })
  .select('fullName email phone accountStatus accessRoleId').sort({ fullName: 1, _id: 1 }).session(session).lean();
router.get('/roles/:id/assignments', asyncHandler(async (req, res) => {
  const roleId = id(req.params.id);
  if (!await AccessRole.exists({ _id: roleId })) fail('Role not found.', 404);
  reply(res, { employees: await assignedEmployees(roleId) });
}));
router.delete('/roles/:id', asyncHandler(async (req, res) => {
  const roleId = id(req.params.id);
  await mongoose.connection.transaction(async session => {
    // Assignments acquire the same role lock, preventing deletion/assignment races.
    const role = await AccessRole.findOneAndUpdate({ _id: roleId }, { $inc: { __v: 1 } }, { session });
    if (!role) fail('Role not found.', 404);
    const employees = await assignedEmployees(roleId, session);
    if (employees.length) throw new AppError('These employees are associated with this role. First change their role to delete this role.',
      409, 'ROLE_IN_USE', employees.map(employee => ({ ...employee, type: 'employee' })));
    await AccessRole.deleteOne({ _id: roleId }, { session });
  });
  reply(res, { deleted: true });
}));
router.get('/employees', asyncHandler(async (req, res) => {
  const query = parse(z.object({ page: z.coerce.number().int().min(1).default(1), search: z.string().max(100).default('') }), req.query);
  const filter = { role: 'admin', isEmployee: true };
  if (query.search) { const regex = new RegExp(query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'); filter.$or = ['fullName', 'email', 'phone'].map(key => ({ [key]: regex })); }
  const [employees, total] = await Promise.all([User.find(filter).populate('accessRoleId', 'name isActive').sort({ createdAt: -1 }).skip((query.page - 1) * 25).limit(25).lean(), User.countDocuments(filter)]);
  reply(res, { employees: employees.map(publicEmployee), total, page: query.page, pages: Math.ceil(total / 25) });
}));
router.post('/employees', asyncHandler(async (req, res) => {
  const { password, ...data } = parse(employeeInput, req.body);
  const passwordHash = await bcrypt.hash(password, 12);
  const employee = await mongoose.connection.transaction(async session => {
    if (!await AccessRole.findOneAndUpdate({ _id: data.accessRoleId, isActive: true }, { $inc: { __v: 1 } }, { session })) fail('Choose an active role.');
    const [created] = await User.create([{ ...data, name: data.fullName, role: 'admin', isEmployee: true,
      passwordHash, status: data.accountStatus, isPhoneVerified: true, isEmailVerified: true, createdBy: req.user._id }], { session });
    return created;
  });
  employee.$session(null);
  reply(res, { employee: publicEmployee(employee) });
}));
router.put('/employees/:id', asyncHandler(async (req, res) => {
  const { password, ...data } = parse(editableEmployee, req.body);
  if (!await AccessRole.exists({ _id: data.accessRoleId, isActive: true })) fail('Choose an active role.');
  const employee = await User.findOne({ _id: id(req.params.id), role: 'admin', isEmployee: true });
  if (!employee) fail('Employee not found.', 404);
  Object.assign(employee, data, { name: data.fullName, status: data.accountStatus });
  if (password) employee.passwordHash = await bcrypt.hash(password, 12);
  try {
    await mongoose.connection.transaction(async session => {
      if (!await AccessRole.findOneAndUpdate({ _id: data.accessRoleId, isActive: true }, { $inc: { __v: 1 } }, { session })) fail('Choose an active role.');
      await employee.save({ session });
      if (password || data.accountStatus === 'blocked') await Session.updateMany({ userId: employee._id, isActive: true },
        { $set: { isActive: false, revokedAt: new Date() } }, { session });
    });
  } finally { employee.$session(null); }
  reply(res, { employee: publicEmployee(employee) });
}));
router.get('/logs', asyncHandler(async (req, res) => {
  const query = parse(z.object({ page: z.coerce.number().int().min(1).default(1), actorId: z.string().optional(),
    section: z.enum(ADMIN_SECTIONS.map(s => s.key).concat(['access', 'profile', 'auth', 'enquiries'])).optional(),
    from: z.string().datetime().optional(), to: z.string().datetime().optional(),
    status: z.enum(['pending', 'applied', 'failed']).optional(), search: z.string().trim().max(100).default(''),
  }), req.query);
  const filter = {};
  if (query.search) { const regex = new RegExp(query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'); filter.$or = ['actor.name', 'actor.email', 'entity', 'documents.id'].map(key => ({ [key]: regex })); }
  if (query.actorId) filter['actor.id'] = id(query.actorId);
  if (query.section) filter.section = query.section;
  if (query.status) filter.status = query.status;
  if (query.from || query.to) filter.createdAt = { ...(query.from ? { $gte: new Date(query.from) } : {}), ...(query.to ? { $lte: new Date(query.to) } : {}) };
  const [logs, total] = await Promise.all([AuditLog.find(filter).select('-attempted -documents.before -documents.after').sort({ createdAt: -1, _id: -1 }).skip((query.page - 1) * 25).limit(25).lean(), AuditLog.countDocuments(filter)]);
  reply(res, { logs, total, page: query.page, pages: Math.ceil(total / 25) });
}));
router.get('/logs/:id', asyncHandler(async (req, res) => {
  const log = await AuditLog.findById(id(req.params.id)).lean();
  if (!log) fail('Log entry not found.', 404);
  reply(res, { log });
}));
router.use((error, req, res, next) => { if (error.code === 11000) return next(new AppError('That name, email, or phone number is already in use.', 409, 'CONFLICT')); next(error); });
export default router;
