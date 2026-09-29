import fs from 'fs';
import path from 'path';

const filePath = path.resolve('frontend/src/pages/admin/AdminProductsPage.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Remove Star import
content = content.replace(/\s*Star,\s*/g, '\n');

// 2. Remove isFeaturedFilter state
content = content.replace(/\s*const \[isFeaturedFilter, setIsFeaturedFilter\] = useState\(''\);/g, '');

// 3. Remove isFeatured query param
content = content.replace(/\s*if \(isFeaturedFilter !== ''\) params\.isFeatured = isFeaturedFilter;/g, '');

// 4. Remove isFeaturedFilter from useEffect dependencies
content = content.replace(/,\s*isFeaturedFilter/g, '');

// 5. Remove isFeaturedFilter filter dropdown from FilterBar
const filterDropdownRegex = /\s*\{\s*value:\s*isFeaturedFilter,[\s\S]*?options:\s*\[[\s\S]*?\]\s*\},/g;
content = content.replace(filterDropdownRegex, '');

// 6. Remove setIsFeaturedFilter('') in onReset
content = content.replace(/\s*setIsFeaturedFilter\(''\);/g, '');

// 7. Remove <Table.Head>Featured</Table.Head>
content = content.replace(/\s*<Table\.Head>Featured<\/Table\.Head>/g, '');

// 8. Remove Featured <Table.Cell> from Table.Body
const tableCellRegex = /\s*<Table\.Cell>\s*\{prod\.isFeatured \? \([\s\S]*?\)\s*:\s*\([\s\S]*?\)\}\s*<\/Table\.Cell>/g;
content = content.replace(tableCellRegex, '');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated AdminProductsPage.jsx');
