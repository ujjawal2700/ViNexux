/**
 * Abstract Email Provider interface contract for Vinexus backend.
 * Concrete implementations (DevEmailProvider, SmtpEmailProvider, SendGridEmailProvider, etc.)
 * must implement the `sendEmail` method.
 */
export class EmailProvider {
  /**
   * Send an email message.
   * @param {Object} params
   * @param {string} params.to - Recipient email address
   * @param {string} params.subject - Email subject line
   * @param {string} [params.html] - HTML body content
   * @param {string} [params.text] - Plain text body content
   * @param {string} [params.from] - Sender address override
   * @returns {Promise<{ success: boolean, messageId?: string }>}
   */
  async sendEmail({ to, subject, html, text, from }) {
    throw new Error('Method sendEmail() must be implemented by concrete Email provider.');
  }
}

export default EmailProvider;
