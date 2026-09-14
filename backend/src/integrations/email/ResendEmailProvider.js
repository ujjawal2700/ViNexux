import { EmailProvider } from './EmailProvider.js';
import { config } from '../../config/env.js';
import { AppError } from '../../utils/AppError.js';
import { HTTP_STATUS } from '../../constants/httpStatusCodes.js';
import { ERROR_CODES } from '../../constants/errorCodes.js';

/**
 * Resend (resend.com) Email Provider implementation.
 * Uses native fetch against Resend's HTTP API - no extra SDK dependency.
 */
export class ResendEmailProvider extends EmailProvider {
  async sendEmail({ to, subject, html, text, from }) {
    if (!config.resendApiKey) {
      throw new AppError(
        'Email provider configuration error: RESEND_API_KEY is missing.',
        HTTP_STATUS.BAD_GATEWAY,
        ERROR_CODES.INTERNAL_ERROR
      );
    }

    const sender = from || `${config.emailFromName} <${config.emailFrom}>`;

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: sender,
          to: [to],
          subject,
          html,
          text,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.message || `Resend API error with HTTP status ${response.status}`);
      }

      return {
        success: true,
        provider: 'resend',
        messageId: data.id || `resend-${Date.now()}`,
      };
    } catch (err) {
      if (err instanceof AppError) {
        throw err;
      }

      // Wrap Resend errors into a clean Bad Gateway AppError without leaking the API key
      throw new AppError(
        'Failed to deliver email via Resend. Please try again later.',
        HTTP_STATUS.BAD_GATEWAY,
        ERROR_CODES.INTERNAL_ERROR
      );
    }
  }
}

export default ResendEmailProvider;
