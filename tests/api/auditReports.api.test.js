import mongoose from '../../backend/node_modules/mongoose/index.js';
import { beforeEach, afterEach, expect, jest, test } from '@jest/globals';
import express from '../../backend/node_modules/express/index.js';
import supertest from 'supertest';
import ExcelJS from '../../backend/node_modules/exceljs/excel.js';
import { AuditLog } from '../../backend/src/audit/audit.js';
import { errorHandler } from '../../backend/src/middlewares/errorHandler.js';
jest.unstable_mockModule('../../backend/src/middlewares/auth.middleware.js', () => ({ authenticate: (req, res, next) => {
  const role = req.headers['x-role']; if (!role) return res.sendStatus(401);
  req.user = { _id: '507f1f77bcf86cd799439011', role: role === 'employee' ? 'admin' : role, isEmployee: role === 'employee' }; next();
} }));
const { default: router } = await import('../../backend/src/routes/adminAccess.routes.js');
const id = '507f1f77bcf86cd799439012';
const entry = { _id: id, actor: { id: '507f1f77bcf86cd799439011', name: 'Asha Singh', email: 'asha@example.test', roleName: 'Catalog editor' }, entity: 'Product', operation: 'updateOne', status: 'applied', section: 'products', createdAt: '2026-11-07T07:30:00Z', attempted: { password: 'do-not-return' }, documents: [{ id, before: { name: 'Ethernet Cable', modelNumber: 'CAT6' }, after: { name: 'Ethernet Cable', modelNumber: 'CAT6' }, changes: [{ field: 'standardPrice', before: 150, after: 175 }, { field: 'passwordHash', before: 'private-one', after: 'private-two' }] }] };
let request, rows, chain, limit, skip;
beforeEach(() => {
  rows = [entry]; limit = 25; skip = 0;
  chain = { select: jest.fn(() => chain), sort: jest.fn(() => chain), skip: jest.fn(n => { skip = n; return chain; }), limit: jest.fn(n => { limit = n; return chain; }), lean: jest.fn(async () => rows.slice(skip, skip + limit)) };
  jest.spyOn(AuditLog, 'find').mockReturnValue(chain);
  jest.spyOn(AuditLog, 'findById').mockReturnValue({ select: () => ({ lean: async () => rows[0] }) });
  jest.spyOn(AuditLog, 'countDocuments').mockImplementation(async () => rows.length);
  const app = express(); app.use(express.json()); app.use('/admin/access', router); app.use(errorHandler); request = supertest(app);
});
afterEach(() => jest.restoreAllMocks());
const binary = (res, callback) => { const chunks = []; res.on('data', chunk => chunks.push(chunk)); res.on('end', () => callback(null, Buffer.concat(chunks))); };
test('list and details give human-readable product and field names without exposing raw snapshots or secrets', async () => {
  for (const path of ['/logs', `/logs/${id}`]) {
    const res = await request.get(`/admin/access${path}`).set('x-role', 'admin');
    expect(res.status).toBe(200); const log = path === '/logs' ? res.body.data.logs[0] : res.body.data.log;
    expect(log.display.summary).toBe('Updated Ethernet Cable (CAT6)');
    if (path === '/logs') expect(log.display.records[0].changes).toEqual([]);
    else expect(log.display.records[0].changes[0]).toEqual({ field: 'Retail price', before: 'INR 150', after: 'INR 175' });
    expect(log.documents).toBeUndefined(); expect(JSON.stringify(res.body)).not.toMatch(/private-one|private-two|do-not-return/);
  }
});
test('list and both exports use identical section, search, date and IST daily-time filters', async () => {
  const query = { search: 'Ethernet', section: 'products', from: '2026-11-06T18:30:00.000Z', to: '2026-11-07T18:29:59.999Z', startTime: '12:00', endTime: '18:00', status: 'applied' };
  const list = await request.get('/admin/access/logs').set('x-role', 'admin').query(query); expect(list.status).toBe(200);
  const filter = AuditLog.find.mock.calls[0][0];
  for (const format of ['pdf', 'xlsx']) {
    const res = await request.get('/admin/access/logs/export').set('x-role', 'admin').query({ ...query, format }).buffer(true).parse(binary);
    expect(res.status).toBe(200); expect(AuditLog.find.mock.calls.at(-1)[0]).toEqual(filter);
    expect(res.headers['content-disposition']).toContain(`.${format}`); expect(res.headers['cache-control']).toBe('no-store');
    if (format === 'pdf') { expect(res.headers['content-type']).toContain('application/pdf'); expect(res.body.subarray(0, 4).toString()).toBe('%PDF'); }
    else {
      const workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(res.body);
      expect(workbook.worksheets.map(sheet => sheet.name)).toEqual(['Activity', 'Changes']);
      const activity = workbook.getWorksheet('Activity'), changes = workbook.getWorksheet('Changes');
      expect(activity.getCell('C12').value).toBe('Asha Singh'); expect(activity.getCell('G12').value).toContain('Ethernet Cable');
      expect(activity.getCell('A6').value).toContain('12:00 to 18:00');
      expect(changes.getCell('F12').value).toBe('Retail price'); expect(changes.getCell('G12').value).toBe(150); expect(changes.getCell('H12').value).toBe(175);
      expect(changes.getCell('G12').numFmt).toContain('INR'); expect(changes.getCell('B12').value).toBeInstanceOf(Date);
      expect(activity.views[0].ySplit).toBe(11); expect(activity.autoFilter).toBeTruthy();
      expect(JSON.stringify(workbook.model)).not.toContain('private-one');
    }
  }
});
test('exports contain matching entries across every screen page rather than only page one', async () => {
  rows = Array.from({ length: 31 }, (_, i) => ({ ...entry, actor: { ...entry.actor, name: `Administrator ${i + 1}` } }));
  const res = await request.get('/admin/access/logs/export').set('x-role', 'admin').query({ format: 'xlsx', page: 2 }).buffer(true).parse(binary);
  expect(res.status).toBe(200); expect(chain.skip).not.toHaveBeenCalled();
  const workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(res.body);
  const sheet = workbook.getWorksheet('Activity');
  expect(sheet.getCell('C12').value).toBe('Administrator 1'); expect(sheet.getCell('C42').value).toBe('Administrator 31');
  expect(sheet.getCell('B4').value).toBe(31); expect(sheet.getCell('B4').numFmt).toBe('0');
});
test('oversized reports are refused explicitly, without silently truncating the report', async () => {
  rows = Array(1001).fill(entry);
  const res = await request.get('/admin/access/logs/export').set('x-role', 'admin').query({ format: 'pdf' });
  expect(res.status).toBe(413); expect(res.body.message).toContain('No partial report');
});
test('employees, customers and anonymous users cannot download or read reports', async () => {
  for (const path of ['/logs', '/logs/export?format=pdf', '/logs/export?format=xlsx', `/logs/${id}`]) {
    for (const role of ['employee', 'customer', 'dealer']) expect((await request.get(`/admin/access${path}`).set('x-role', role)).status).toBe(403);
    expect((await request.get(`/admin/access${path}`)).status).toBe(401);
  }
  expect(AuditLog.find).not.toHaveBeenCalled();
});
test('invalid windows and unsupported formats are rejected before a database query', async () => {
  for (const query of [{ format: 'html' }, { format: 'pdf', startTime: '25:00' }, { format: 'xlsx', from: '2026-11-08T00:00:00Z', to: '2026-11-07T00:00:00Z' }]) {
    expect((await request.get('/admin/access/logs/export').set('x-role', 'admin').query(query)).status).toBe(400);
  }
  expect(AuditLog.find).not.toHaveBeenCalled();
});

test('list IDs and dates survive BSON serialization, and bulk records stay compact until inspection', async () => {
  rows = [{ ...entry, _id: new mongoose.Types.ObjectId(id), createdAt: new Date('2026-11-07T07:30:00Z'), documents: Array.from({ length: 91 }, (_, i) => ({ ...entry.documents[0], id: new mongoose.Types.ObjectId(), after: { name: `Camera ${i}` } })) }];
  const res = await request.get('/admin/access/logs').set('x-role', 'admin');
  expect(res.status).toBe(200); const log = res.body.data.logs[0];
  expect(log._id).toBe(id); expect(log.createdAt).toBe('2026-11-07T07:30:00.000Z');
  expect(log.display.time).not.toBe('Time unavailable'); expect(log.display.summary).toBe('Updated 91 product records');
  expect(log.display.recordCount).toBe(91); expect(log.display.records).toHaveLength(2);
  expect(chain.select).toHaveBeenCalledWith(expect.not.stringContaining('documents.changes'));
  expect(log.display.records[0].changes).toEqual([]);
});
