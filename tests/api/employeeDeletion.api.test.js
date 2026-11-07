import { beforeEach, afterEach, expect, jest, test } from '@jest/globals';
import express from '../../backend/node_modules/express/index.js';
import supertest from 'supertest';
import mongoose from '../../backend/node_modules/mongoose/index.js';
import { User } from '../../backend/src/models/User.js';
import { Session } from '../../backend/src/models/Session.js';
import { PushDevice } from '../../backend/src/models/PushDevice.js';
import { OtpVerification } from '../../backend/src/models/OtpVerification.js';
import { errorHandler } from '../../backend/src/middlewares/errorHandler.js';

jest.unstable_mockModule('../../backend/src/middlewares/auth.middleware.js', () => ({ authenticate: (req, res, next) => {
  const role = req.headers['x-role']; if (!role) return res.sendStatus(401);
  req.user = { _id: '507f1f77bcf86cd799439011', role: role === 'employee' ? 'admin' : role, isEmployee: role === 'employee' }; next();
} }));
const { default: router } = await import('../../backend/src/routes/adminAccess.routes.js');
const employeeId = '507f1f77bcf86cd799439022';
let request, session;
beforeEach(() => {
  session = {};
  jest.spyOn(mongoose.connection, 'transaction').mockImplementation(async fn => fn(session));
  jest.spyOn(User, 'findOne').mockImplementation(() => ({ session: async () => ({ _id: employeeId, email: 'employee@example.com', phone: '9876543210' }) }));
  for (const [model, method] of [[User, 'deleteOne'], [Session, 'deleteMany'], [PushDevice, 'deleteMany'], [OtpVerification, 'deleteMany']]) jest.spyOn(model, method).mockResolvedValue({ deletedCount: 1 });
  const app = express(); app.use(express.json()); app.use('/admin/access', router); app.use(errorHandler); request = supertest(app);
});
afterEach(() => jest.restoreAllMocks());
test('super admin removes only the employee login and its active authentication records in one transaction', async () => {
  expect((await request.delete(`/admin/access/employees/${employeeId}`).set('x-role', 'admin')).status).toBe(200);
  expect(User.findOne).toHaveBeenCalledWith({ _id: employeeId, role: 'admin', isEmployee: true });
  expect(User.deleteOne).toHaveBeenCalledWith({ _id: employeeId, role: 'admin', isEmployee: true }, { session });
  expect(Session.deleteMany).toHaveBeenCalledWith({ userId: employeeId }, { session });
  expect(PushDevice.deleteMany).toHaveBeenCalledWith({ userId: employeeId }, { session });
  expect(OtpVerification.deleteMany).toHaveBeenCalledWith({ identifier: { $in: ['employee@example.com', '9876543210'] } }, { session });
  expect(mongoose.connection.transaction).toHaveBeenCalledTimes(1);
});
test('employee and customer sessions cannot delete employees; anonymous requests are rejected', async () => {
  for (const role of ['employee', 'customer', 'dealer']) expect((await request.delete(`/admin/access/employees/${employeeId}`).set('x-role', role)).status).toBe(403);
  expect((await request.delete(`/admin/access/employees/${employeeId}`)).status).toBe(401);
  expect(mongoose.connection.transaction).not.toHaveBeenCalled();
});
test('super admins cannot delete themselves or use this route to delete a super admin or customer', async () => {
  expect((await request.delete('/admin/access/employees/507f1f77bcf86cd799439011').set('x-role', 'admin')).status).toBe(403);
  User.findOne.mockReturnValue({ session: async () => null });
  expect((await request.delete(`/admin/access/employees/${employeeId}`).set('x-role', 'admin')).status).toBe(404);
  expect(User.deleteOne).not.toHaveBeenCalled(); expect(Session.deleteMany).not.toHaveBeenCalled();
});
test('malformed IDs are rejected before any database mutation', async () => {
  expect((await request.delete('/admin/access/employees/bad').set('x-role', 'admin')).status).toBe(400);
  expect(mongoose.connection.transaction).not.toHaveBeenCalled();
});
test('transaction errors are reported instead of claiming successful deletion', async () => {
  Session.deleteMany.mockRejectedValue(new Error('test transaction failed'));
  expect((await request.delete(`/admin/access/employees/${employeeId}`).set('x-role', 'admin')).status).toBe(500);
  expect(User.deleteOne).not.toHaveBeenCalled();
});
