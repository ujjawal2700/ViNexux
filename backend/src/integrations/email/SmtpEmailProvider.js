import nodemailer from 'nodemailer';
import { EmailProvider } from './EmailProvider.js';
import { config } from '../../config/env.js';
import { AppError } from '../../utils/AppError.js';
import { HTTP_STATUS } from '../../constants/httpStatusCodes.js';
import { ERROR_CODES } from '../../constants/errorCodes.js';

/**
 * Production SMTP Email Provider implementation using Nodemailer transport.
 * Dispatches HTML/text emails safely without exposing SMTP credentials in error messages or logs.
 */
export class SmtpEmailProvider extends EmailProvider {
  constructor(customTransporter = null) {
    super();
    this.transporter = customTransporter;
  }

  getTransporter() {
    if (this.transporter) {
      return this.transporter;
    }

    if (!config.emailHost || !config.emailUser || !config.emailPassword) {
      throw new AppError(
        'Email provider configuration error: Missing SMTP credentials or host configuration.',
        HTTP_STATUS.BAD_GATEWAY,
        ERROR_CODES.INTERNAL_ERROR
      );
    }

    return nodemailer.createTransport({
      host: config.emailHost,
      port: config.emailPort || 587,
      secure: config.emailSecure || false,
      auth: {
        user: config.emailUser,
        pass: config.emailPassword,
      },
    });
  }

  async sendEmail({ to, subject, html, text, from }) {
    try {
      const transporter = this.getTransporter();
      const sender = from || `"${config.emailFromName}" <${config.emailFrom}>`;

      const info = await transporter.sendMail({
        from: sender,
        to,
        subject,
        text,
        html,
      });

      return {
        success: true,
        provider: 'smtp',
        messageId: info.messageId || `smtp-${Date.now()}`,
      };
    } catch (err) {
      if (err instanceof AppError) {
        throw err;
      }

      // Wrap Nodemailer / SMTP errors into a clean Bad Gateway AppError without leaking passwords or host credentials
      throw new AppError(
        'Failed to deliver email. Please try again later.',
        HTTP_STATUS.BAD_GATEWAY,
        ERROR_CODES.INTERNAL_ERROR
      );
    }
  }
}

export default SmtpEmailProvider;
