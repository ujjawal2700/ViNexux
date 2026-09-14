import { getEmailProvider } from '../../integrations/email/index.js';
import { AppError } from '../../utils/AppError.js';
import { HTTP_STATUS } from '../../constants/httpStatusCodes.js';
import { ERROR_CODES } from '../../constants/errorCodes.js';

/**
 * Centralized Email Service facade.
 * Decouples service/business logic from underlying email provider implementations.
 */
export const emailService = {
  /**
   * Dispatches an email using the active email provider.
   * 
   * @param {Object} params
   * @param {string} params.to - Target recipient email address
   * @param {string} params.subject - Email subject line
   * @param {string} [params.html] - HTML body
   * @param {string} [params.text] - Plain text body
   * @param {string} [params.from] - Sender address override
   * @returns {Promise<{ success: boolean, messageId?: string }>}
   */
  async sendEmail({ to, subject, html, text, from }) {
    if (!to || !subject) {
      throw new AppError(
        'Recipient email address and subject are required.',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    const provider = getEmailProvider();
    return await provider.sendEmail({ to, subject, html, text, from });
  },

  /**
   * Dispatches a responsive HTML / text OTP email to the user.
   * 
   * @param {Object} params
   * @param {string} params.email - Recipient email address
   * @param {string} params.otp - Plaintext 6-digit numeric OTP
   * @param {string} params.purpose - Purpose of OTP ('signup', 'login', 'reset')
   * @returns {Promise<{ success: boolean, messageId?: string }>}
   */
  async sendOtpEmail({ email, otp, purpose = 'login' }) {
    const subjectMap = {
      signup: 'Welcome to Vinexus — Verify Your Account OTP',
      login: 'Vinexus Verification Code',
      'phone-change': 'Vinexus Account Security Code',
    };

    const subject = subjectMap[purpose] || 'Vinexus Verification Code';

    const text = `Your Vinexus verification code is: ${otp}. This code is valid for 5 minutes. Do not share this code with anyone.`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #6b21a8; text-align: center;">Vinexus</h2>
        <p>Hello,</p>
        <p>Your verification code for <strong>${purpose}</strong> is:</p>
        <div style="background-color: #f3e8ff; border-radius: 6px; padding: 15px; text-align: center; margin: 20px 0;">
          <span style="font-size: 28px; font-weight: bold; letter-spacing: 5px; color: #581c87;">${otp}</span>
        </div>
        <p style="font-size: 13px; color: #666;">This code is valid for 5 minutes. Please do not share this code with anyone for security reasons.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 11px; color: #999; text-align: center;">&copy; ${new Date().getFullYear()} Vinexus Inc. All rights reserved.</p>
      </div>
    `;

    return await this.sendEmail({
      to: email,
      subject,
      text,
      html,
    });
  },

  /**
   * Notifies a dealer that their KYC submission was rejected, with the
   * reason (if provided) and a link to resubmit.
   *
   * @param {Object} params
   * @param {string} params.email - Dealer's account email address
   * @param {string} params.companyName - Dealer's registered company name
   * @param {string} [params.rejectionReason] - Admin-provided rejection reason
   * @param {string} [params.resubmitUrl] - Frontend URL to resubmit KYC
   */
  async sendDealerKycRejectedEmail({ email, companyName, rejectionReason, resubmitUrl }) {
    const subject = 'Vinexus Dealer KYC — Action Required';
    const reason = rejectionReason?.trim() || 'Submitted documentation was incomplete or invalid.';
    const link = resubmitUrl || 'https://vi-nexux.vercel.app/dealer/kyc';

    const text = `Hello ${companyName || 'Dealer'},\n\nYour Vinexus dealer KYC submission was not approved.\n\nReason: ${reason}\n\nPlease resubmit your KYC documents here: ${link}\n\n— Vinexus Team`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #800020; text-align: center;">Vinexus</h2>
        <p>Hello${companyName ? ` <strong>${companyName}</strong>` : ''},</p>
        <p>Your dealer KYC submission was <strong style="color: #be123c;">not approved</strong> by our verification team.</p>
        <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 15px; margin: 20px 0;">
          <span style="font-size: 12px; font-weight: bold; color: #991b1b; text-transform: uppercase;">Reason</span>
          <p style="margin: 6px 0 0; color: #7f1d1d;">${reason}</p>
        </div>
        <p style="text-align: center; margin: 24px 0;">
          <a href="${link}" style="background-color: #800020; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 14px;">Resubmit KYC Documents</a>
        </p>
        <p style="font-size: 13px; color: #666;">Please correct the issue above and resubmit — your account will be re-reviewed as soon as new documents are uploaded.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 11px; color: #999; text-align: center;">&copy; ${new Date().getFullYear()} Vinexus Inc. All rights reserved.</p>
      </div>
    `;

    return await this.sendEmail({ to: email, subject, text, html });
  },
};

export default emailService;
