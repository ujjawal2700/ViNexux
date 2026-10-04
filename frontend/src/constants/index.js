export const ROLES = {
  GUEST: 'guest',
  CUSTOMER: 'customer',
  DEALER: 'dealer',
  ADMIN: 'admin',
};

export const ACCOUNT_STATUS = {
  PENDING: 'pending',
  ACTIVE: 'active',
  BLOCKED: 'blocked',
};

export const DEALER_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

export const ENQUIRY_STATUS = {
  NEW: 'new',
  CONTACTED: 'contacted',
  IN_PROGRESS: 'in-progress',
  CLOSED: 'closed',
  SPAM: 'spam',
};

export const STORAGE_KEYS = {
  REFRESH_TOKEN: 'vinexus_refresh_token',
  ADMIN_REFRESH_TOKEN: 'vinexus_admin_refresh_token',
  USER: 'vinexus_user',
  ADMIN_USER: 'vinexus_admin_user',
  CUSTOMER_SESSION_EXPIRES_AT: 'vinexus_customer_session_expires_at',
  LAST_CUSTOMER_PHONE: 'vinexus_last_customer_phone',
};
