import { EmailProvider } from './EmailProvider.js';
import { config } from '../../config/env.js';

/**
 * Development Email Provider implementation.
 * Logs email metadata cleanly to stdout without exposing secrets or credentials.
 * Used for local development and automated testing so real emails are never dispatched.
 */
export class DevEmailProvider extends EmailProvider {
  async sendEmail({ to, subject, html, text, from }) {
    const sender = from || `${config.emailFromName} <${config.emailFrom}>`;

    console.log(`[DevEmailProvider] ----------------------------------------`);
    console.log(`[DevEmailProvider] To     : ${to}`);
    console.log(`[DevEmailProvider] From   : ${sender}`);
    console.log(`[DevEmailProvider] Subject: ${subject}`);
    if (text) console.log(`[DevEmailProvider] Text   : ${text.slice(0, 100)}...`);
    console.log(`[DevEmailProvider] ----------------------------------------`);

    return {
      success: true,
      provider: 'development',
      messageId: `dev-email-${Date.now()}`,
    };
  }
}

export default DevEmailProvider;
