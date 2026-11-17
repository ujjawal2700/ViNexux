export const unreadEnquiryReplies = enquiry => Math.max(0, (enquiry?.customerReplies?.length || 0) - (enquiry?.lastReadReplyCount || 0));
export const isAvailabilityEnquiry = enquiry => enquiry?.enquiryType === 'out-of-stock';
