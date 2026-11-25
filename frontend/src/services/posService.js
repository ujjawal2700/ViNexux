import api from '../api/axios';
import { publicInvoiceUrl } from '../../../shared/posInvoiceUrl.js';

const read = async (path, config) => (await api.get(`/admin/pos${path}`, config)).data.data;
const post = async (path, data) => (await api.post(`/admin/pos${path}`, data)).data.data;
export const posService = {
  deliveryNote: id => read(`/delivery-notes/${id}`),
  invoiceDeliveryNotes: data => post('/delivery-notes/invoice', data),
  accountBalance: userId => read(`/account-balances/${userId}`),
  enquiryDraft: async id => (await api.get(`/admin/enquiries/${id}/pos-draft`, { skipGlobalLoader: true })).data.data,
  products: search => read('/products', { params: { search }, skipGlobalLoader: true }),
  customers: search => read('/customers', { params: { search }, skipGlobalLoader: true }),
  lookupCustomer: (phone, billType = 'b2c') => read('/customer', { params: { phone, billType }, skipGlobalLoader: true }),
  sendCustomerOtp: (phone, billType = 'b2c') => post('/customer/otp', { phone, billType }),
  verifyCustomerOtp: (phone, otp) => post('/customer/verify', { phone, otp }),
  saveCustomer: async (customer, billType = 'b2c') => (await api.put('/admin/pos/customer', customer, { params: { billType } })).data.data,
  settings: () => read('/settings'),
  saveSettings: async seller => (await api.put('/admin/pos/settings', seller)).data.data,
  sales: params => read('/sales', { params, skipGlobalLoader: true }),
  sale: id => read(`/sales/${id}`),
  editSale: async (id, data) => (await api.put(`/admin/pos/sales/${id}`, data)).data.data,
  createSale: data => post('/sales', data),
  validateSale: data => post('/sales/validate', data),
  payment: (id, data) => post(`/sales/${id}/payments`, data),
  refund: (id, data) => post(`/sales/${id}/refunds`, data),
  returnItems: (id, data) => post(`/sales/${id}/returns`, data),
  voidSale: (id, reason) => post(`/sales/${id}/void`, { reason }),
  held: () => read('/held'),
  hold: (draft, label) => post('/held', { draft, label }),
  removeHeld: async id => (await api.delete(`/admin/pos/held/${id}`)).data.data,
  invoice: id => api.get(`/admin/pos/sales/${id}/invoice`, { responseType: 'blob' }),
  exportPdf: params => api.get('/admin/pos/sales/export/pdf', { params, responseType: 'blob' }),
  export: params => api.get('/admin/pos/sales/export', { params, responseType: 'blob' }),
  shareUrl: sale => publicInvoiceUrl(sale.shareToken, {
    publicSiteUrl: import.meta.env.VITE_PUBLIC_SITE_URL,
    production: import.meta.env.PROD,
    origin: window.location.origin,
  }),
};
export const saveBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
};
export default posService;
