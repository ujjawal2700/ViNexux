import crypto from 'node:crypto';
import { afterEach, describe, expect, jest, test } from '@jest/globals';
import { authService } from '../../backend/src/services/auth.service.js';
import { authenticate } from '../../backend/src/middlewares/auth.middleware.js';
import { User } from '../../backend/src/models/User.js';
import { Session } from '../../backend/src/models/Session.js';
import { OtpVerification } from '../../backend/src/models/OtpVerification.js';

const otp = '123456';
const mockLogin = (role) => {
  const user = {
    _id: '507f1f77bcf86cd799439011', role, email: 'test@example.com',
    accountStatus: 'active', status: 'active', save: jest.fn(),
  };
  jest.spyOn(User, 'findOne').mockResolvedValue(user);
  jest.spyOn(User, 'findById').mockResolvedValue(user);
  jest.spyOn(OtpVerification, 'findOne').mockImplementation(async () => ({
    otpHash: crypto.createHash('sha256').update(otp).digest('hex'),
    expiresAt: new Date(Date.now() + 60000), attempts: 0, isVerified: false,
    save: jest.fn(),
  }));
  return user;
};
const login = (role, platform) => authService.verifyOtp({
  identifier: 'test@example.com', otp, portal: role === 'admin' ? 'admin' : undefined,
  reqInfo: { deviceInfo: { platform } },
});
afterEach(() => jest.restoreAllMocks());

describe('temporary admin multi-device login', () => {
  test('a second admin login leaves both devices authenticated', async () => {
    mockLogin('admin');
    const sessions = [];
    jest.spyOn(Session, 'create').mockImplementation(async (data) => {
      const session = { ...data, _id: crypto.randomUUID() };
      sessions.push(session);
      return session;
    });
    const lookup = jest.spyOn(Session, 'findOne').mockImplementation(async (filter) =>
      sessions.find((session) => session.sessionId === filter.sessionId && session.isActive) || null
    );
    const revoke = jest.spyOn(Session, 'updateMany');
    const first = await login('admin', 'desktop');
    const second = await login('admin', 'phone');
    expect(first.sessionConflict).toBe(false);
    expect(second.sessionConflict).toBe(false);
    expect(first.session.sessionId).not.toBe(second.session.sessionId);
    expect(lookup).not.toHaveBeenCalled();
    expect(revoke).not.toHaveBeenCalled();
    for (const result of [first, second]) {
      const req = { headers: { authorization: `Bearer ${result.accessToken}` } };
      const next = jest.fn();
      await authenticate(req, {}, next);
      expect(next).toHaveBeenCalledWith();
      expect(req.session.sessionId).toBe(result.session.sessionId);
    }
    expect(sessions.every((session) => session.isActive)).toBe(true);
  });

  test.each(['customer', 'dealer'])('%s logins still require resolving an active session conflict', async (role) => {
    mockLogin(role);
    jest.spyOn(Session, 'findOne').mockResolvedValue({
      sessionId: 'existing-device', userType: role, issuedAt: new Date(),
      expiresAt: new Date(Date.now() + 60000), isActive: true,
    });
    const create = jest.spyOn(Session, 'create');
    const result = await login(role, 'phone');
    expect(result.sessionConflict).toBe(true);
    expect(result.conflictTicket).toEqual(expect.any(String));
    expect(create).not.toHaveBeenCalled();
  });
});
