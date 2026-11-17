import { beforeEach, afterEach, expect, jest, test } from '@jest/globals';
import express from '../../backend/node_modules/express/index.js';
import supertest from 'supertest';
import { DealerProfile } from '../../backend/src/models/DealerProfile.js';
import { uploadSingle } from '../../backend/src/middlewares/upload.middleware.js';
import { uploadKycDoc, deleteKycDoc } from '../../backend/src/controllers/dealer.controller.js';
import { storageService } from '../../backend/src/services/storage/storage.service.js';
import { errorHandler } from '../../backend/src/middlewares/errorHandler.js';
const id = '507f1f77bcf86cd799439011';
let request, profile;
beforeEach(() => {
  profile = new DealerProfile({ _id: id, userId: id, companyName: 'Company', status: 'approved', kycDocuments: [{ type: 'aadhaar', url: 'https://storage.example/old.pdf', publicId: 'old' }] });
  jest.spyOn(DealerProfile, 'findOne').mockResolvedValue(profile);
  jest.spyOn(DealerProfile.prototype, 'save').mockImplementation(async function () { await this.validate(); return this; });
  jest.spyOn(DealerProfile.prototype, 'populate').mockImplementation(async function () { return this; });
  jest.spyOn(storageService, 'uploadFile').mockResolvedValue({ url: 'https://storage.example/new.webp', publicId: 'new' });
  jest.spyOn(storageService, 'deleteFile').mockResolvedValue({});
  const app = express();
  app.use((req, res, next) => { req.user = { _id: id }; next(); });
  app.post('/documents', uploadSingle('file', 'kyc'), uploadKycDoc);
  app.delete('/documents/:type', deleteKycDoc);
  app.use(errorHandler); request = supertest(app);
});
afterEach(() => jest.restoreAllMocks());
const upload = (type = 'aadhaar', filename = 'aadhaar.png', contentType = 'image/png') => request.post('/documents').field('type', type).attach('file', Buffer.from('fixture'), { filename, contentType });

test.each([['aadhaar.png', 'image/png'], ['aadhaar.jpg', 'image/jpeg'], ['aadhaar.pdf', 'application/pdf']])('replaces a dealer document from %s and saves before deleting the original', async (filename, mime) => {
  const response = await upload('aadhaar', filename, mime);
  expect(response.status).toBe(200);
  expect(response.body.data.profile.status).toBe('pending');
  expect(response.body.data.profile.kycDocuments).toHaveLength(1);
  expect(response.body.data.profile.kycDocuments[0].url).toBe('https://storage.example/new.webp');
  expect(storageService.uploadFile).toHaveBeenCalledWith(expect.objectContaining({ category: 'kyc', mimetype: mime }));
  expect(DealerProfile.prototype.save.mock.invocationCallOrder[0]).toBeLessThan(storageService.deleteFile.mock.invocationCallOrder[0]);
  expect(storageService.deleteFile).toHaveBeenCalledWith('old');
});

test('failed profile save retains the old storage file and cleans up the replacement', async () => {
  DealerProfile.prototype.save.mockRejectedValue(new Error('Database unavailable'));
  expect((await upload()).status).toBe(500);
  expect(storageService.deleteFile).toHaveBeenCalledWith('new');
  expect(storageService.deleteFile).not.toHaveBeenCalledWith('old');
});

test('failed storage upload leaves the old document in place', async () => {
  storageService.uploadFile.mockRejectedValue(new Error('Storage unavailable'));
  expect((await upload()).status).toBe(500);
  expect(profile.kycDocuments[0].publicId).toBe('old');
  expect(DealerProfile.prototype.save).not.toHaveBeenCalled();
  expect(storageService.deleteFile).not.toHaveBeenCalled();
});

test('delete persists the profile before removing storage, and rejects unsupported documents', async () => {
  expect((await request.delete('/documents/aadhaar')).status).toBe(200);
  expect(DealerProfile.prototype.save.mock.invocationCallOrder[0]).toBeLessThan(storageService.deleteFile.mock.invocationCallOrder[0]);
  expect((await upload('invalid')).status).toBe(400);
  expect((await upload('gst', 'script.js', 'application/javascript')).status).toBe(400);
});
