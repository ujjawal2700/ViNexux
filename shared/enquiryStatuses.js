export const ENQUIRY_STATUSES = ['new', 'in-progress', 'completed', 'closed', 'spam'];
export const ENQUIRY_STATUS_LABELS = {
  new: 'New', 'in-progress': 'In Progress', completed: 'Completed', closed: 'Closed', spam: 'Spam',
};
export const LEGACY_ENQUIRY_STATUSES = {
  pending: 'new', contacted: 'in-progress', processing: 'in-progress', cancelled: 'closed',
};
export const canonicalEnquiryStatus = (status) => LEGACY_ENQUIRY_STATUSES[status] || status;
export const ALLOWED_ENQUIRY_TRANSITIONS = {
  new: ['in-progress', 'closed', 'spam'],
  'in-progress': ['completed', 'closed', 'spam'],
  completed: ['closed', 'spam'],
  closed: [],
  spam: [],
};
