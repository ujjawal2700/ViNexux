import { posBillLabel } from '../../../shared/posDocumentLabels.js';
const money = value => Number(value || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });

export const sendToBillingConfirmation = order => ({
  title: 'Send order to billing?',
  message: `Open POS for ${order.enquiryNumber || 'this order'}${order.contactName ? ` (${order.contactName})` : ''} with the customer details and selected products? You can review the bill before saving it.`,
  confirmText: 'Yes, open billing', cancelText: 'Cancel',
});

export const deliveryNoteBillConfirmation = note => ({
  title: `Create ${posBillLabel(note)}?`,
  message: `Create a ${posBillLabel(note)} from delivery note ${note.deliveryNoteNumber || note.invoiceNumber}${note.customer?.name ? ` for ${note.customer.name}` : ''}? Bill value: ${money(note.total - (note.returnedAmount || 0))}. Only the remaining products will be billed. Existing payments and credit dues will carry forward.`,
  confirmText: 'Create bill', cancelText: 'Cancel',
});
