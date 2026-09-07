import { GoogleSheetsProvider } from './GoogleSheetsProvider.js';

/**
 * Development Google Sheets Provider implementation.
 * Logs row append operations to stdout without making outbound network calls to Google APIs.
 * Used for local development and automated integration testing.
 */
export class DevGoogleSheetsProvider extends GoogleSheetsProvider {
  async appendRow({ spreadsheetId, tabName, rowValues }) {
    console.log(`[DevGoogleSheetsProvider] ----------------------------------------`);
    console.log(`[DevGoogleSheetsProvider] Spreadsheet ID: ${spreadsheetId || 'dev-spreadsheet-id'}`);
    console.log(`[DevGoogleSheetsProvider] Tab Name      : ${tabName || 'Enquiries'}`);
    console.log(`[DevGoogleSheetsProvider] Row Values    :`, rowValues);
    console.log(`[DevGoogleSheetsProvider] ----------------------------------------`);

    return {
      success: true,
      provider: 'development',
      updatedRange: `${tabName || 'Enquiries'}!A${Date.now().toString().slice(-4)}:M${Date.now().toString().slice(-4)}`,
    };
  }
}

export default DevGoogleSheetsProvider;
