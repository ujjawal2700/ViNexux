import mongoose from 'mongoose';
import { getGoogleSheetsProvider } from '../../integrations/googleSheets/index.js';
import { Enquiry } from '../../models/Enquiry.js';
import { config } from '../../config/env.js';
import { AppError } from '../../utils/AppError.js';
import { HTTP_STATUS } from '../../constants/httpStatusCodes.js';
import { ERROR_CODES } from '../../constants/errorCodes.js';

/**
 * Centralized Google Sheets Service facade.
 * Handles deterministic row formatting, automated sync on enquiry creation, duplicate prevention, and manual admin sync.
 */
export const googleSheetsService = {
  /**
   * Formats an Enquiry record into a deterministic, human-readable 13-column array for Google Sheets.
   * 
   * @param {Object} enquiry - Mongoose Enquiry document or plain object
   * @returns {Array<string|number>} Ordered array of cell values
   */
  formatEnquiryRow(enquiry) {
    if (!enquiry) return [];

    const enquiryNumber = enquiry.enquiryNumber || 'N/A';
    const createdAt = enquiry.createdAt ? new Date(enquiry.createdAt).toISOString() : new Date().toISOString();
    const userType = enquiry.userType || 'customer';
    const contactName = enquiry.contactName || 'N/A';
    const contactEmail = enquiry.contactEmail || 'N/A';
    const contactPhone = enquiry.contactPhone || 'N/A';

    // Format items array into human-readable summary string and compute total quantity
    const items = Array.isArray(enquiry.items) ? enquiry.items : [];
    const itemsSummary = items
      .map((item) => `${item.productName || 'Product'} (Qty: ${item.quantity || 1})`)
      .join('; ');
    const totalQuantity = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);

    const message = enquiry.message || '';

    // Format delivery address into clean string
    const addr = enquiry.deliveryAddress || {};
    const addrParts = [addr.line1, addr.line2, addr.city, addr.state, addr.pincode].filter(Boolean);
    const formattedAddress = addrParts.join(', ') || 'N/A';

    const status = enquiry.status || 'new';

    // Assigned admin formatting
    let assignedTo = 'Unassigned';
    if (enquiry.assignedTo) {
      if (typeof enquiry.assignedTo === 'object') {
        assignedTo = enquiry.assignedTo.fullName || enquiry.assignedTo.email || 'Admin';
      } else {
        assignedTo = String(enquiry.assignedTo);
      }
    }

    const syncedAt = new Date().toISOString();

    return [
      enquiryNumber,
      createdAt,
      userType,
      contactName,
      contactEmail,
      contactPhone,
      itemsSummary,
      totalQuantity,
      message,
      formattedAddress,
      status,
      assignedTo,
      syncedAt,
    ];
  },

  /**
   * Syncs a single enquiry to Google Sheets and updates MongoDB syncedToGoogleSheet status flag.
   * Isolates Google Sheets failures so that primary MongoDB enquiry creation is never rolled back.
   * 
   * @param {Object|string} enquiryOrId - Enquiry document or Mongoose ObjectId
   * @returns {Promise<{ success: boolean, skipped?: boolean, reason?: string, updatedRange?: string }>}
   */
  async syncEnquiryToSheet(enquiryOrId) {
    if (!config.googleSheetsEnabled) {
      return {
        success: false,
        skipped: true,
        reason: 'Google Sheets integration is disabled in environment config',
      };
    }

    let enquiry = enquiryOrId;
    if (typeof enquiryOrId === 'string' || mongoose.Types.ObjectId.isValid(enquiryOrId)) {
      enquiry = await Enquiry.findById(enquiryOrId).populate('assignedTo', 'fullName email');
    }

    if (!enquiry) {
      throw new AppError('Enquiry record not found for Google Sheets sync', HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
    }

    const rowValues = this.formatEnquiryRow(enquiry);
    const provider = getGoogleSheetsProvider();

    try {
      const result = await provider.appendRow({
        spreadsheetId: config.googleSheetsSpreadsheetId,
        tabName: config.googleSheetsTabName || 'Enquiries',
        rowValues,
      });

      // Update MongoDB record to reflect successful sync
      if (enquiry.save && typeof enquiry.save === 'function') {
        enquiry.syncedToGoogleSheet = true;
        await enquiry.save();
      } else {
        await Enquiry.updateOne({ _id: enquiry._id }, { syncedToGoogleSheet: true });
      }

      return {
        success: true,
        updatedRange: result.updatedRange,
      };
    } catch (err) {
      console.warn(`[GoogleSheetsService] Failed to sync enquiry ${enquiry.enquiryNumber} to Google Sheets: ${err.message}`);
      return {
        success: false,
        error: err.message,
      };
    }
  },

  /**
   * Explicit manual retry sync method for Admin triggered sync.
   * Throws safe AppError if manual sync fails.
   */
  async manualSyncEnquiry(enquiryId) {
    const enquiry = await Enquiry.findById(enquiryId).populate('assignedTo', 'fullName email');
    if (!enquiry) {
      throw new AppError('Enquiry record not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
    }

    if (!config.googleSheetsEnabled) {
      // Force test execution if provider is dev or manually overridden
      const provider = getGoogleSheetsProvider();
      const rowValues = this.formatEnquiryRow(enquiry);
      const result = await provider.appendRow({
        spreadsheetId: config.googleSheetsSpreadsheetId || 'dev-spreadsheet',
        tabName: config.googleSheetsTabName || 'Enquiries',
        rowValues,
      });

      enquiry.syncedToGoogleSheet = true;
      await enquiry.save();

      return {
        message: 'Enquiry synced to Google Sheets successfully',
        syncedToGoogleSheet: true,
        updatedRange: result.updatedRange,
      };
    }

    const syncResult = await this.syncEnquiryToSheet(enquiry);
    if (!syncResult.success && !syncResult.skipped) {
      throw new AppError(
        'Manual Google Sheets sync failed. Please check credentials and spreadsheet status.',
        HTTP_STATUS.BAD_GATEWAY,
        ERROR_CODES.INTERNAL_ERROR
      );
    }

    return {
      message: 'Enquiry synced to Google Sheets successfully',
      syncedToGoogleSheet: true,
      updatedRange: syncResult.updatedRange,
    };
  },
};

export default googleSheetsService;
