import { beforeEach, afterEach, expect, jest, test } from '@jest/globals';
import express from '../../backend/node_modules/express/index.js';
import supertest from 'supertest';
import BannerGrid from '../../backend/src/models/BannerGrid.js';
import router, { publicBannerGrid } from '../../backend/src/routes/bannerGrid.routes.js';
import { config } from '../../backend/src/config/env.js';
import { storageService } from '../../backend/src/services/storage/storage.service.js';
let grid, request, previousProvider;
const matches = filter => grid && grid.revision === filter.revision && Object.entries(filter).every(([key, value]) => {
  if (key.endsWith('.images.2')) return grid.sections[Number(key.split('.')[1])].images.length < 3;
  if (key.endsWith('.images._id')) return grid.sections[Number(key.split('.')[1])].images.some(i => String(i._id) === value);
  return true;
});
beforeEach(() => {
  grid = null; previousProvider = config.storageProvider; config.storageProvider = 'cloudinary';
  jest.spyOn(storageService, 'uploadFile').mockResolvedValue({ url: 'https://images.example/banner.webp', publicId: 'bento/test' });
  jest.spyOn(BannerGrid, 'findOne').mockImplementation(() => ({ lean: async () => grid?.toObject() || null }));
  jest.spyOn(BannerGrid, 'updateOne').mockImplementation(async (filter, update) => { if (!grid) grid = new BannerGrid(update.$setOnInsert); });
  jest.spyOn(BannerGrid, 'exists').mockImplementation(async filter => matches(filter));
  jest.spyOn(BannerGrid, 'findOneAndUpdate').mockImplementation(async (filter, update) => {
    if (!matches(filter)) return null;
    for (const [path, value] of Object.entries(update.$push || {})) grid.sections[Number(path.split('.')[1])].images.push(value);
    for (const [path, value] of Object.entries(update.$pull || {})) {
      const section = grid.sections[Number(path.split('.')[1])]; section.images = section.images.filter(i => String(i._id) !== value._id);
    }
    for (const [path, value] of Object.entries(update.$set || {})) {
      if (path === 'configured') grid.configured = value;
      else { const section = Number(path.split('.')[1]); grid.sections[section].images.find(i => String(i._id) === filter[`sections.${section}.images._id`])[path.split('.').at(-1)] = value; }
    }
    grid.revision += update.$inc.revision;
    return grid;
  });
  const app = express(); app.use(express.json()); app.use('/grid', router); app.get('/public', publicBannerGrid);
  app.use((err, req, res, next) => res.status(err.statusCode || 500).json({ message: err.message })); request = supertest(app);
});
afterEach(() => { config.storageProvider = previousProvider; jest.restoreAllMocks(); });
const upload = (section, revision) => request.post(`/grid/${section}/images`).field('revision', revision).attach('file', Buffer.from('test fixture'), { filename: 'banner.png', contentType: 'image/png' });
test('four sections initialize; uploads are capped at three independently', async () => {
  expect((await request.get('/grid')).body.data.grid.sections).toHaveLength(4);
  expect((await request.get('/public')).body.data.grid).toBeNull();
  for (let revision = 0; revision < 3; revision++) expect((await upload(0, revision)).status).toBe(200);
  expect((await upload(0, 3)).status).toBe(409);
  expect(storageService.uploadFile).toHaveBeenCalledTimes(3);
  expect((await upload(1, 3)).status).toBe(200);
  const publicResponse = await request.get('/public');
  expect(publicResponse.headers['cache-control']).toBe('no-store');
  expect(publicResponse.body.data.grid.sections.map(s => s.images.length)).toEqual([3, 1, 0, 0]);
});
test('stale edits fail; replacement, metadata edits and removal preserve other sections', async () => {
  await upload(0, 0); await upload(1, 1); const id = String(grid.sections[0].images[0]._id);
  expect((await request.put(`/grid/0/images/${id}`).send({ revision: 0, title: 'stale' })).status).toBe(409);
  expect((await request.put(`/grid/0/images/${id}`).send({ revision: 2, title: 'Camera offers', link: '/products', fit: 'contain', positionX: 25, positionY: 75, zoom: 1.8 })).status).toBe(200);
  expect(grid.sections[0].images[0].title).toBe('Camera offers');
  expect(grid.sections[0].images[0].zoom).toBe(1.8);
  expect(grid.sections[0].images[0].positionX).toBe(25);
  const replace = await request.post(`/grid/0/images/${id}`).field('revision', 3).field('title', 'New artwork').attach('file', Buffer.from('fixture'), { filename: 'replacement.png', contentType: 'image/png' });
  expect(replace.status).toBe(200); expect(grid.sections[0].images).toHaveLength(1);
  expect((await request.delete(`/grid/0/images/${id}`).send({ revision: 4 })).status).toBe(200);
  expect(grid.sections[0].images).toHaveLength(0); expect(grid.sections[1].images).toHaveLength(1);
});
test('invalid sections, unsafe links, invalid IDs and SVG uploads are rejected', async () => {
  expect((await upload(4, 0)).status).toBe(400);
  expect((await request.post('/grid/0/images').field('revision', 0).attach('file', Buffer.from('<svg/>'), { filename: 'banner.svg', contentType: 'image/svg+xml' })).status).toBe(400);
  expect((await request.put('/grid/0/images/not-an-id').send({ revision: 0 })).status).toBe(400);
  expect((await request.put('/grid/0/images/507f1f77bcf86cd799439011').send({ revision: 0, link: 'javascript:alert(1)' })).status).toBe(400);
  expect(storageService.uploadFile).not.toHaveBeenCalled();
});
