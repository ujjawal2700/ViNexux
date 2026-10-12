import { Enquiry } from '../models/Enquiry.js';
import { LEGACY_ENQUIRY_STATUSES } from '../../../shared/enquiryStatuses.js';

export const backfillEnquiryStatuses = async () => {
  let updated = 0;
  for (const [previous, status] of Object.entries(LEGACY_ENQUIRY_STATUSES)) {
    const result = await Enquiry.updateMany({ status: previous }, { $set: { status } });
    updated += result.modifiedCount || 0;
  }
  return updated;
};
