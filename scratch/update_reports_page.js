import fs from 'fs';
import path from 'path';

const filePath = path.resolve('frontend/src/pages/admin/AdminReportsPage.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Remove Calendar, RefreshCw imports if present
content = content.replace(/\s*Calendar,\s*/g, '\n');
content = content.replace(/\s*RefreshCw,\s*/g, '\n');

// 2. Remove startDate and endDate states
content = content.replace(/\s*\/\/ Date Range Filters\s*const \[startDate, setStartDate\] = useState\(''\);\s*const \[endDate, setEndDate\] = useState\(''\);/, '');

// 3. Remove date params from fetchEnquiryReport
content = content.replace(/\s*if \(startDate\) params\.startDate = startDate;\s*if \(endDate\) params\.endDate = endDate;/, '');

// 4. Remove date params from fetchDealerReport
content = content.replace(/\s*if \(startDate\) params\.startDate = startDate;\s*if \(endDate\) params\.endDate = endDate;/, '');

// 5. Remove date params from fetchCustomerReport
content = content.replace(/\s*if \(startDate\) params\.startDate = startDate;\s*if \(endDate\) params\.endDate = endDate;/, '');

// 6. Remove startDate, endDate from useEffect dependency array
content = content.replace(/startDate,\s*endDate,\s*/g, '');

// 7. Remove Date Range UI block
const dateBlockRegex = /\{\/\* Date Filter & Tab Bar \*\/\}[\s\S]*?\{\/\* Main Tab Panels \*\/\}/;
const newTabBar = `{/* Tab Bar */}
      <div className="bg-card border border-border rounded-xl p-3 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 bg-background p-1 rounded-lg border border-border">
          {[
            { id: 'summary', label: 'Platform Summary', icon: BarChart3 },
            { id: 'enquiries', label: 'Enquiry Leads', icon: Inbox },
            { id: 'dealers', label: 'Dealer Onboarding', icon: Users },
            { id: 'customers', label: 'Customer Accounts', icon: UserCheck },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={\`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all duration-200 \${
                  isActive
                    ? 'bg-primary text-white'
                    : 'text-muted-foreground hover:text-primary hover:bg-muted'
                }\`}
              >
                <Icon className={\`w-3.5 h-3.5 \${isActive ? 'text-white' : 'text-primary'}\`} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Tab Panels */}`;

content = content.replace(dateBlockRegex, newTabBar);

// 8. Remove setStartDate and setEndDate in onReset handlers
content = content.replace(/\s*setStartDate\(''\);\s*setEndDate\(''\);/g, '');

fs.writeFileSync(filePath, content, 'utf8');
console.log('AdminReportsPage updated successfully');
