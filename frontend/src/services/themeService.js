import api from '../api/axios';
const base = '/admin/cms/themes';
const unwrap = response => response.data.data;
export const themeService = {
  public: () => api.get('/content/theme', { skipGlobalLoader: true }).then(unwrap),
  list: () => api.get(base).then(unwrap),
  get: id => api.get(`${base}/${id}`).then(unwrap),
  create: data => api.post(base, data).then(unwrap),
  save: (id, data) => api.put(`${base}/${id}`, data).then(unwrap),
  action: (id, action, revision) => api.post(`${base}/${id}/${action}`, { revision }).then(unwrap),
  reset: resumeSchedules => api.post(`${base}/reset`, { resumeSchedules }).then(unwrap),
  upload: (id, slot, file) => { const body = new FormData(); body.append('file', file); return api.post(`${base}/${id}/assets/${slot}`, body, { headers: { 'Content-Type': 'multipart/form-data' } }).then(unwrap); },
};
