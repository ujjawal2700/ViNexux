import { google } from 'googleapis';
import { GoogleSheetsProvider } from './GoogleSheetsProvider.js';
import { config } from '../../config/env.js';
import { AppError } from '../../utils/AppError.js';
import { HTTP_STATUS } from '../../constants/httpStatusCodes.js';
import { ERROR_CODES } from '../../constants/errorCodes.js';

/**
 * Production Google Sheets API Provider implementation using official googleapis library and JWT Service Account authentication.
 */
export class GoogleSheetsApiProvider extends GoogleSheetsProvider {
  constructor(customSheetsClient = null) {
    super();
    this.customSheetsClient = customSheetsClient;
  }

  getSheetsClient() {
    if (this.customSheetsClient) {
      return this.customSheetsClient;
    }

    if (!config.googleServiceAccountEmail || !config.googleServiceAccountPrivateKey) {
      throw new AppError(
        'Google Sheets provider configuration error: Missing service account email or private key.',
        HTTP_STATUS.BAD_GATEWAY,
        ERROR_CODES.INTERNAL_ERROR
      );
    }

    const formattedPrivateKey = config.googleServiceAccountPrivateKey.replace(/\\n/g, '\n');

    const auth = new google.auth.JWT({
      email: config.googleServiceAccountEmail,
      key: formattedPrivateKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    return google.sheets({ version: 'v4', auth });
  }

  async appendRow({ spreadsheetId, tabName, rowValues }) {
    const targetSpreadsheetId = spreadsheetId || config.googleSheetsSpreadsheetId;
    const targetTab = tabName || config.googleSheetsTabName || 'Enquiries';

    if (!targetSpreadsheetId) {
      throw new AppError(
        'Google Sheets provider configuration error: Spreadsheet ID is missing.',
        HTTP_STATUS.BAD_GATEWAY,
        ERROR_CODES.INTERNAL_ERROR
      );
    }

    try {
      const sheets = this.getSheetsClient();
      const range = `${targetTab}!A:M`;

      const response = await sheets.spreadsheets.values.append({
        spreadsheetId: targetSpreadsheetId,
        range,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values: [rowValues],
        },
      });

      return {
        success: true,
        provider: 'google_api',
        updatedRange: response.data.updates?.updatedRange || `${targetTab}!A:M`,
      };
    } catch (err) {
      if (err instanceof AppError) {
        throw err;
      }

      // Wrap Google API errors safely without leaking private keys or authorization credentials
      throw new AppError(
        'Failed to sync row to Google Sheet. Please check spreadsheet configuration and access permissions.',
        HTTP_STATUS.BAD_GATEWAY,
        ERROR_CODES.INTERNAL_ERROR
      );
    }
  }
}

export default GoogleSheetsApiProvider;
