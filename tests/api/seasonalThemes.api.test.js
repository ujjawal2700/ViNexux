import { beforeEach, afterEach, describe, expect, jest, test } from '@jest/globals';
import express from '../../backend/node_modules/express/index.js';
import supertest from 'supertest';
import SeasonalTheme from '../../backend/src/models/SeasonalTheme.js';
import WebsiteSettings from '../../backend/src/models/WebsiteSettings.js';
import router, { publicTheme, resetTheme } from '../../backend/src/routes/theme.routes.js';
import { presetConfig } from '../../shared/seasonalThemes.js';
import storageService from '../../backend/src/services/storage/storage.service.js';
const id = '507f1f77bcf86cd799439011';
let themes; let settings; let request;
beforeEach(() => {
  themes = []; settings = {};
  jest.spyOn(SeasonalTheme, 'find').mockImplementation(() => ({ lean: async () => themes.filter(t => !t.archived).map(t => t.toObject()), sort: () => ({ lean: async () => themes.map(t => t.toObject()) }) }));
  jest.spyOn(SeasonalTheme, 'findById').mockImplementation(async key => themes.find(t => String(t._id) === String(key)) || null);
  jest.spyOn(SeasonalTheme, 'create').mockImplementation(async data => { const theme = new SeasonalTheme({ ...data, ...(themes.length ? {} : { _id: id }) }); themes.push(theme); return theme; });
  jest.spyOn(SeasonalTheme, 'findOneAndUpdate').mockImplementation(async (filter, update) => { const theme = themes.find(t => String(t._id) === String(filter._id) && t.revision === filter.revision); if (!theme) return null; theme.set(update.$set); theme.revision += update.$inc?.revision || 0; return theme; });
  jest.spyOn(WebsiteSettings, 'findOne').mockImplementation(() => ({ lean: async () => settings }));
  jest.spyOn(WebsiteSettings, 'findOneAndUpdate').mockImplementation(async (filter, update) => { Object.assign(settings, update.$set); return settings; });
  jest.spyOn(WebsiteSettings, 'updateOne').mockImplementation(async (filter, update) => { if (String(settings.activeThemeId) === String(filter.activeThemeId)) Object.assign(settings, update.$set); return settings; });
  const app = express(); app.use(express.json());
  // Authentication is tested on the real app in coreBehavior.api.test; this fixture isolates CMS persistence.
  app.use((req, res, next) => { req.user = { _id: id }; next(); });
  app.post('/themes/reset', resetTheme); app.use('/themes', router); app.get('/content/theme', publicTheme);
  app.use((err, req, res, next) => res.status(err.statusCode || 500).json({ message: err.message }));
  request = supertest(app);
});
afterEach(() => jest.restoreAllMocks());
const payload = () => ({ name: 'Diwali', preset: 'diwali', draft: presetConfig('diwali'), schedule: { enabled: false, startAt: null, endAt: null, priority: 0 }, revision: 0 });
describe('theme CMS lifecycle', () => {
  test('draft remains private; publish and activation expose only published config', async () => {
    expect((await request.post('/themes').send(payload())).status).toBe(201);
    expect((await request.get('/content/theme')).body.data.theme.id).toBeNull();
    expect((await request.post(`/themes/${id}/publish`).send({ revision: 0 })).status).toBe(200);
    await request.post(`/themes/${id}/activate`).send({ revision: 1 });
    const edited = payload(); edited.revision = 1; edited.draft.colors.background = '#123456'; edited.draft.styles.buttons = 'pill'; edited.draft.styles.font = 'serif';
    expect((await request.put(`/themes/${id}`).send(edited)).status).toBe(200);
    const live = await request.get('/content/theme'); expect(live.headers['cache-control']).toBe('no-store'); expect(live.body.data.theme.config.colors.background).toBe('#fff4df');
    expect(live.body.data.theme.draft).toBeUndefined();
    expect(live.body.data.theme.config.styles.buttons).toBe(presetConfig('diwali').styles.buttons);
    expect((await request.post(`/themes/${id}/publish`).send({ revision: 2 })).status).toBe(200);
    expect((await request.get('/content/theme')).body.data.theme.config.colors.background).toBe('#123456');
    expect((await request.get('/content/theme')).body.data.theme.config.styles.buttons).toBe('pill');
  });
  test('stale save and publish receive 409 without overwriting newer edits', async () => {
    await request.post('/themes').send(payload()); await request.put(`/themes/${id}`).send(payload());
    expect((await request.put(`/themes/${id}`).send(payload())).status).toBe(409);
    expect((await request.post(`/themes/${id}/publish`).send({ revision: 0 })).status).toBe(409);
  });
  test('published schedules activate, while default/reset/resume/archive behave deterministically', async () => {
    const data = payload(); data.schedule = { enabled: true, startAt: new Date(Date.now() - 60000).toISOString(), endAt: new Date(Date.now() + 60000).toISOString(), priority: 10 };
    await request.post('/themes').send(data); await request.post(`/themes/${id}/publish`).send({ revision: 0 });
    expect((await request.get('/content/theme')).body.data.theme.id).toBe(id);
    await request.post('/themes/reset').send({ resumeSchedules: false }); expect((await request.get('/content/theme')).body.data.theme.id).toBeNull();
    await request.post('/themes/reset').send({ resumeSchedules: true }); expect((await request.get('/content/theme')).body.data.theme.id).toBe(id);
    await request.post(`/themes/${id}/archive`).send({ revision: 1 }); expect((await request.get('/content/theme')).body.data.theme.id).toBeNull();
  });
  test('invalid payloads and invalid resource IDs receive actionable 400s', async () => {
    expect((await request.post('/themes').send({})).status).toBe(400);
    expect((await request.get('/themes/bad-id')).status).toBe(400);
    expect((await request.post('/themes/reset').send({ resumeSchedules: 'false' })).status).toBe(400);
  });
  test('duplicates are private drafts with scheduling disabled', async () => {
    await request.post('/themes').send(payload()); await request.post(`/themes/${id}/publish`).send({ revision: 0 });
    const copy = await request.post(`/themes/${id}/duplicate`).send({ revision: 1 });
    expect(copy.status).toBe(201); expect(copy.body.data.theme._id).not.toBe(id); expect(copy.body.data.theme.published).toBeUndefined(); expect(copy.body.data.theme.schedule.enabled).toBe(false);
  });
  test('image upload returns an asset without mutating the live snapshot and rejects unsafe types', async () => {
    await request.post('/themes').send(payload());
    const upload = jest.spyOn(storageService, 'uploadFile').mockResolvedValue({ url: 'https://images.example/diya.webp', publicId: 'cms/themes/diya' });
    const response = await request.post(`/themes/${id}/assets/header`).attach('file', Buffer.from('test-image'), { filename: 'diya.png', contentType: 'image/png' });
    expect(response.status).toBe(200); expect(response.body.data.asset.publicId).toBe('cms/themes/diya'); expect(themes[0].draft.assets).toEqual(presetConfig('diwali').assets);
    expect(upload).toHaveBeenCalledTimes(1);
    const rejected = await request.post(`/themes/${id}/assets/header`).attach('file', Buffer.from('<svg />'), { filename: 'diya.svg', contentType: 'image/svg+xml' });
    expect(rejected.status).toBe(400); expect(upload).toHaveBeenCalledTimes(1);
  });
});
