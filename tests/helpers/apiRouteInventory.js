import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ROUTES_DIR = path.join(ROOT, 'backend/src/routes');

const joinUrl = (...parts) => {
  const joined = parts.join('/').replace(/\/+/, '/').replace(/\/+/g, '/');
  return joined.length > 1 && joined.endsWith('/') ? joined.slice(0, -1) : joined;
};

export const materializeApiPath = (routePath) => routePath
  .replace(/:publicId\(\*\)/g, 'test-public-id')
  .replace(/:addressId/g, '507f1f77bcf86cd799439011')
  .replace(/:productId/g, '507f1f77bcf86cd799439011')
  .replace(/:field/g, 'logo')
  .replace(/:slug/g, 'test-page')
  .replace(/:type/g, 'gst')
  .replace(/:id/g, '507f1f77bcf86cd799439011');

export const discoverApiRoutes = () => {
  const indexSource = fs.readFileSync(path.join(ROUTES_DIR, 'index.js'), 'utf8');
  const imports = new Map(
    [...indexSource.matchAll(/import\s+(\w+)\s+from\s+'\.\/(.+?\.routes\.js)'/g)]
      .map((match) => [match[1], match[2]])
  );

  const mounts = [];
  for (const match of indexSource.matchAll(/router\.use\(\s*'([^']+)'\s*,([^;\n]+)\);/g)) {
    const identifiers = [...match[2].matchAll(/\b(\w+Routes)\b/g)].map((item) => item[1]);
    const routerName = identifiers.at(-1);
    if (routerName && imports.has(routerName)) mounts.push({ base: match[1], file: imports.get(routerName) });
  }

  const routes = [];
  for (const mount of mounts) {
    const source = fs.readFileSync(path.join(ROUTES_DIR, mount.file), 'utf8');
    for (const match of source.matchAll(/router\.(get|post|put|patch|delete)\(\s*['"]([^'"]+)['"]/g)) {
      routes.push({
        method: match[1].toUpperCase(),
        path: joinUrl('/api', mount.base, match[2]),
        source: mount.file,
      });
    }
  }

  routes.push({ method: 'GET', path: '/', source: 'app.js' });
  return routes.sort((a, b) => `${a.path}:${a.method}`.localeCompare(`${b.path}:${b.method}`));
};
