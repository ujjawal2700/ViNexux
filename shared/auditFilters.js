export function auditRequestParams(filters, page) {
  if (filters.from && filters.to && filters.from > filters.to) throw new Error('From date must be before the to date.');
  const params = { ...(page ? { page } : {}), search: filters.search };
  for (const key of ['section', 'status', 'startTime', 'endTime']) if (filters[key]) params[key] = filters[key];
  if (filters.from) params.from = new Date(`${filters.from}T00:00:00+05:30`).toISOString();
  if (filters.to) params.to = new Date(`${filters.to}T23:59:59.999+05:30`).toISOString();
  return params;
}
