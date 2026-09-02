import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

/**
 * Generate a short-lived JWT access token containing userId, sessionId, and user role.
 * @param {Object} params
 * @param {string} params.userId
 * @param {string} params.sessionId
 * @param {string} params.role
 * @returns {string} Signed JWT access token
 */
export const generateAccessToken = ({ userId, sessionId, role }) => {
  return jwt.sign(
    {
      userId: userId.toString(),
      sessionId,
      role,
    },
    config.jwtSecret,
    {
      expiresIn: config.jwtAccessExpiry || '15m',
    }
  );
};

/**
 * Verify and decode JWT access token.
 * @param {string} token
 * @returns {Object} Decoded payload
 */
export const verifyAccessToken = (token) => {
  return jwt.verify(token, config.jwtSecret);
};

/**
 * Generate a cryptographically secure random refresh token.
 * @returns {string}
 */
export const generateRefreshToken = () => {
  return crypto.randomBytes(40).toString('hex');
};

/**
 * Compute SHA-256 hash of a token string.
 * @param {string} token
 * @returns {string}
 */
export const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Generate short-lived, tamper-resistant ticket token bound to user and conflicting session ID.
 * @param {Object} params
 * @param {string} params.userId
 * @param {string} params.existingSessionId
 * @returns {string} Signed JWT conflict ticket
 */
export const generateConflictTicket = ({ userId, existingSessionId }) => {
  return jwt.sign(
    {
      userId: userId.toString(),
      existingSessionId: existingSessionId ? existingSessionId.toString() : null,
      type: 'session-conflict',
      jti: crypto.randomUUID(),
    },
    config.jwtSecret,
    {
      expiresIn: '5m',
    }
  );
};

/**
 * Verify session conflict ticket token.
 * @param {string} ticket
 * @returns {Object} Decoded payload
 */
export const verifyConflictTicket = (ticket) => {
  const decoded = jwt.verify(ticket, config.jwtSecret);
  if (decoded.type !== 'session-conflict') {
    throw new Error('Invalid ticket type');
  }
  return decoded;
};

export default {
  generateAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  hashToken,
  generateConflictTicket,
  verifyConflictTicket,
};
