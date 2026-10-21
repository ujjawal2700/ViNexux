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
  .replace(/:token/g, 'invalid-share-token')
  .replace(/:id/g, '507f1f77bcf86cd799439011');

export const discoverApiRoutes = () => {
  const routes = [];
  const walk = (file, base, ancestors = []) => {
    if (ancestors.includes(file)) throw new Error(`Circular router mount: ${file}`);
    const source = fs.readFileSync(path.join(ROUTES_DIR, file), 'utf8');
    const imports = new Map([...source.matchAll(/import\s+(\w+)(?:\s*,\s*\{[^}]*\})?\s+from\s+['"]\.\/(.+?\.routes\.js)['"]/g)]
      .map(match => [match[1], match[2]]));
    for (const match of source.matchAll(/router\.(get|post|put|patch|delete)\(\s*['"]([^'"]+)['"]/g)) {
      routes.push({ method: match[1].toUpperCase(), path: joinUrl(base, match[2]), source: file });
    }
    for (const match of source.matchAll(/router\.use\(\s*['"]([^'"]+)'\s*,([^;\n]+)\);/g)) {
      const routerName = [...match[2].matchAll(/\b(\w+)\b/g)].map(item => item[1]).findLast(name => imports.has(name));
      if (routerName) walk(imports.get(routerName), joinUrl(base, match[1]), [...ancestors, file]);
    }
  };
  walk('index.js', '/api');
  routes.push({ method: 'GET', path: '/', source: 'app.js' });
  return routes.sort((a, b) => `${a.path}:${a.method}`.localeCompare(`${b.path}:${b.method}`));
};
