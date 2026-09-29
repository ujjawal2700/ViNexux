import fs from 'fs';
import path from 'path';

const filePath = path.resolve('frontend/src/pages/admin/AdminProductDetailPage.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Remove Star import
content = content.replace(/\s*Star,\s*/g, '\n');

// 2. Remove isFeatured state
content = content.replace(/\s*const \[isFeatured, setIsFeatured\] = useState\(false\);/g, '');

// 3. Remove setIsFeatured in loadProduct
content = content.replace(/\s*setIsFeatured\(!!prod\.isFeatured\);/g, '');

// 4. Change isFeatured in payload to isFeatured: false
content = content.replace(/\s*isFeatured:\s*Boolean\(isFeatured\),/g, '\n        isFeatured: false,');

// 5. Remove Featured Product checkbox from Status & Visibility card
const featuredCardBlock = /\s*<div className="pt-3 border-t border-\[#f0e6e8\]">\s*<label className="flex items-center justify-between cursor-pointer">[\s\S]*?<\/div>/;
content = content.replace(featuredCardBlock, '');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated AdminProductDetailPage.jsx');
