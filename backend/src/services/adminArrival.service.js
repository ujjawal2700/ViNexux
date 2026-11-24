import { AdminArrival } from '../models/AdminArrival.js';
import { User } from '../models/User.js';
import { pushService } from './push/push.service.js';

export const adminArrivalService = {
  // Called only after the source record is committed. Failure never undoes an order.
  async publish(record, kind = 'enquiry') {
    try {
      const sale = kind === 'sale';
      const quotation = kind === 'quotation';
      const whatsapp = record.source === 'whatsapp';
      const arrival = await AdminArrival.create({
        eventKey: `${kind}:${record._id}`,
        title: quotation ? 'New CCTV quotation request' : sale ? 'New order received' : whatsapp ? 'New WhatsApp order lead' : 'New enquiry received',
        body: `${record.quoteNumber || record.invoiceNumber || record.enquiryNumber} · ${sale ? record.customer?.name || 'Customer' : record.contactName || 'Customer'}`,
        link: quotation ? `/admin/quotations/${record._id}` : sale ? `/admin/pos?invoice=${record._id}` : whatsapp ? `/admin/whatsapp-orders/${record._id}` : `/admin/enquiries/${record._id}`,
      });
      const admins = await User.find({ role: 'admin', isEmployee: { $ne: true }, accountStatus: { $ne: 'blocked' }, status: { $ne: 'blocked' } }).select('_id').lean();
      await Promise.allSettled(admins.map(admin => pushService.sendToUser(admin._id, {
        title: arrival.title, body: arrival.body,
        data: { type: 'admin-arrival', arrivalId: String(arrival._id), link: arrival.link, sound: 'default' },
      })));
    } catch (error) {
      if (error.code !== 11000) console.error('[AdminArrival] Notification failed:', error.message);
    }
  },
  async list(after) {
    if (!after) {
      const latest = await AdminArrival.findOne().sort({ _id: -1 }).select('_id').lean();
      return { arrivals: [], cursor: latest ? String(latest._id) : '000000000000000000000000', hasMore: false };
    }
    const rows = await AdminArrival.find({ _id: { $gt: after } }).sort({ _id: 1 }).limit(51).lean();
    const arrivals = rows.slice(0, 50);
    return { arrivals, cursor: arrivals.length ? String(arrivals.at(-1)._id) : after, hasMore: rows.length > 50 };
  },
};
