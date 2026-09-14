import { PushProvider } from './PushProvider.js';

/**
 * Development Push Provider implementation.
 * Logs the notification to stdout instead of dispatching a real push,
 * so the app works before Firebase credentials are configured.
 */
export class DevPushProvider extends PushProvider {
  async sendToTokens({ tokens = [], title, body, data }) {
    console.log(`[DevPushProvider] ----------------------------------------`);
    console.log(`[DevPushProvider] Tokens : ${tokens.length} device(s)`);
    console.log(`[DevPushProvider] Title  : ${title}`);
    console.log(`[DevPushProvider] Body   : ${body}`);
    if (data) console.log(`[DevPushProvider] Data   : ${JSON.stringify(data)}`);
    console.log(`[DevPushProvider] ----------------------------------------`);

    return { success: true, provider: 'development', invalidTokens: [] };
  }
}

export default DevPushProvider;
