/**
 * Abstract Google Sheets Provider interface contract for Vinexus backend.
 * Concrete implementations (DevGoogleSheetsProvider, GoogleSheetsApiProvider, etc.)
 * must implement the `appendRow` method.
 */
export class GoogleSheetsProvider {
  /**
   * Append a single formatted enquiry row to the configured Google Sheet tab.
   * @param {Object} params
   * @param {string} params.spreadsheetId - Target Google Spreadsheet ID
   * @param {string} params.tabName - Target Tab/Sheet name
   * @param {Array<string|number>} params.rowValues - Ordered array of cell values
   * @returns {Promise<{ success: boolean, updatedRange?: string }>}
   */
  async appendRow({ spreadsheetId, tabName, rowValues }) {
    throw new Error('Method appendRow() must be implemented by concrete GoogleSheets provider.');
  }
}

export default GoogleSheetsProvider;
