import fs from 'fs';
import path from 'path';

const frontendDir = 'c:/Rays software/MERN Workspace/Vinexus/frontend';

// 1. Update HomePage.jsx
const homePagePath = path.join(frontendDir, 'src/pages/public/HomePage.jsx');
let homePage = fs.readFileSync(homePagePath, 'utf8').replace(/\r\n/g, '\n');

if (!homePage.includes("import axios from 'axios';")) {
  homePage = homePage.replace(
    "import categoryService from '../../services/categoryService';",
    "import axios from 'axios';\nimport categoryService from '../../services/categoryService';"
  );
}

homePage = homePage.replace(
  /} catch {\n\s*setError\('Unable to load the storefront. Please retry.'\);/,
  "} catch (err) {\n      if (axios.isCancel(err)) return;\n      setError('Unable to load the storefront. Please retry.');"
);

fs.writeFileSync(homePagePath, homePage, 'utf8');
console.log('✓ Updated HomePage.jsx');

// 2. Update useCatalogBrands.js
const brandsHookPath = path.join(frontendDir, 'src/hooks/useCatalogBrands.js');
let brandsHook = fs.readFileSync(brandsHookPath, 'utf8').replace(/\r\n/g, '\n');

if (!brandsHook.includes("import axios from 'axios';")) {
  brandsHook = brandsHook.replace(
    "import productService from '../services/productService';",
    "import axios from 'axios';\nimport productService from '../services/productService';"
  );
}

brandsHook = brandsHook.replace(
  /} catch {\n\s*setError\('Unable to load brands. Please try again.'\);/,
  "} catch (err) {\n      if (axios.isCancel(err)) return;\n      setError('Unable to load brands. Please try again.');"
);

fs.writeFileSync(brandsHookPath, brandsHook, 'utf8');
console.log('✓ Updated useCatalogBrands.js');

// 3. Update PublicLayout.jsx
const layoutPath = path.join(frontendDir, 'src/layouts/PublicLayout.jsx');
let layout = fs.readFileSync(layoutPath, 'utf8').replace(/\r\n/g, '\n');

if (!layout.includes("import axios from 'axios';")) {
  layout = layout.replace(
    "import categoryService from '../services/categoryService';",
    "import axios from 'axios';\nimport categoryService from '../services/categoryService';"
  );
}

layout = layout.replace(
  /} catch {\n\s*if \(!active\) return;\n\s*setAllCategories\(\[\]\);\n\s*setCategoriesError\('Categories unavailable'\);/,
  "} catch (err) {\n        if (axios.isCancel(err)) return;\n        if (!active) return;\n        setAllCategories([]);\n        setCategoriesError('Categories unavailable');"
);

fs.writeFileSync(layoutPath, layout, 'utf8');
console.log('✓ Updated PublicLayout.jsx');
