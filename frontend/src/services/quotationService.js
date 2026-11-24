import api from '../api/axios';
export const quoteRequest = async (path = '', options = {}) => (await api({ url: `/quotations${path}`, ...options })).data.data;
export const adminQuoteRequest = async (path = '', options = {}) => (await api({ url: `/admin/quotations${path}`, ...options })).data.data;
export async function downloadQuotation(id, admin = false) {
  const response = await api.get(`${admin ? '/admin' : ''}/quotations/${id}/pdf`, { responseType: 'blob' });
  const url = URL.createObjectURL(response.data); const link = document.createElement('a'); link.href = url; link.download = `ViNexus-quotation-${id}.pdf`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
