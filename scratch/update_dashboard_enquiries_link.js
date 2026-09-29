import fs from 'fs';
import path from 'path';

const filePath = path.resolve('frontend/src/pages/admin/AdminDashboardPage.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// Update StatsCard for Total Enquiries
content = content.replace(
  `color="crimson"\n        />`,
  `color="crimson"\n          onClick={() => navigate('/admin/enquiries/customers')}\n        />`
);

// Update Quick Control Action Manage Leads
content = content.replace(
  '<Link to="/admin/enquiries">',
  '<Link to="/admin/enquiries/customers">'
);

// Update Recent Enquiries View All link
content = content.replace(
  '<Link to="/admin/enquiries" className="text-xs text-primary hover:text-accent font-bold flex items-center gap-1">',
  '<Link to="/admin/enquiries/customers" className="text-xs text-primary hover:text-accent font-bold flex items-center gap-1">'
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated AdminDashboardPage.jsx');
