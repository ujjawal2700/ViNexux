import React, { useState, useEffect } from 'react';
import adminService from '../../services/adminService';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import StatsCard from '../../components/admin/StatsCard';
import FilterBar from '../../components/admin/FilterBar';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Pagination from '../../components/ui/Pagination';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import StatusBadge, { Badge } from '../../components/ui/Badge';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import Toast from '../../components/ui/Toast';
import { 
  BarChart3, 
  Inbox, 
  Users, 
  UserCheck, 
  Package, 
  Calendar, 
  Filter, 
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  ShieldAlert
} from 'lucide-react';

const AdminReportsPage = () => {
  const [activeTab, setActiveTab] = useState('summary'); // 'summary' | 'enquiries' | 'dealers' | 'customers'

  // Summary State
  const [summaryData, setSummaryData] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState(null);

  // Date Range Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Enquiry Report State
  const [enquiryReport, setEnquiryReport] = useState(null);
  const [enquiryStatusFilter, setEnquiryStatusFilter] = useState('');
  const [enquiryUserTypeFilter, setEnquiryUserTypeFilter] = useState('');
  const [enquiryPage, setEnquiryPage] = useState(1);
  const [enquiryLoading, setEnquiryLoading] = useState(false);

  // Dealer Report State
  const [dealerReport, setDealerReport] = useState(null);
  const [dealerStatusFilter, setDealerStatusFilter] = useState('');
  const [dealerPage, setDealerPage] = useState(1);
  const [dealerLoading, setDealerLoading] = useState(false);

  // Customer Report State
  const [customerReport, setCustomerReport] = useState(null);
  const [customerStatusFilter, setCustomerStatusFilter] = useState('');
  const [customerPage, setCustomerPage] = useState(1);
  const [customerLoading, setCustomerLoading] = useState(false);

  // Toast State
  const [toast, setToast] = useState(null);

  const fetchSummary = async () => {
    setSummaryLoading(true);
    setSummaryError(null);
    try {
      const res = await adminService.getReportSummary();
      setSummaryData(res.data || res);
    } catch (err) {
      console.error('Error fetching report summary:', err);
      setSummaryError(err.response?.data?.message || 'Failed to load report summary');
    } finally {
      setSummaryLoading(false);
    }
  };

  const fetchEnquiryReport = async () => {
    setEnquiryLoading(true);
    try {
      const params = { page: enquiryPage, limit: 20 };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (enquiryStatusFilter) params.status = enquiryStatusFilter;
      if (enquiryUserTypeFilter) params.userType = enquiryUserTypeFilter;

      const res = await adminService.getEnquiryReport(params);
      setEnquiryReport(res.data || res);
    } catch (err) {
      console.error('Error fetching enquiry report:', err);
      setToast({ message: 'Failed to load enquiry analytics report', type: 'error' });
    } finally {
      setEnquiryLoading(false);
    }
  };

  const fetchDealerReport = async () => {
    setDealerLoading(true);
    try {
      const params = { page: dealerPage, limit: 20 };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (dealerStatusFilter) params.status = dealerStatusFilter;

      const res = await adminService.getDealerReport(params);
      setDealerReport(res.data || res);
    } catch (err) {
      console.error('Error fetching dealer report:', err);
      setToast({ message: 'Failed to load dealer analytics report', type: 'error' });
    } finally {
      setDealerLoading(false);
    }
  };

  const fetchCustomerReport = async () => {
    setCustomerLoading(true);
    try {
      const params = { page: customerPage, limit: 20 };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (customerStatusFilter) params.accountStatus = customerStatusFilter;

      const res = await adminService.getCustomerReport(params);
      setCustomerReport(res.data || res);
    } catch (err) {
      console.error('Error fetching customer report:', err);
      setToast({ message: 'Failed to load customer analytics report', type: 'error' });
    } finally {
      setCustomerLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  useEffect(() => {
    if (activeTab === 'enquiries') fetchEnquiryReport();
    if (activeTab === 'dealers') fetchDealerReport();
    if (activeTab === 'customers') fetchCustomerReport();
  }, [activeTab, startDate, endDate, enquiryPage, enquiryStatusFilter, enquiryUserTypeFilter, dealerPage, dealerStatusFilter, customerPage, customerStatusFilter]);

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <AdminPageHeader
        title="Executive Analytics & Platform Reports"
        subtitle="Audited operational metrics, lead acquisition breakdown, dealer onboarding & customer account distribution"
        badge="Live Telemetry"
      />

      {/* Date Filter & Tab Bar */}
      <div className="bg-card border border-border rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
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
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all duration-200 ${
                  isActive
                    ? 'bg-primary text-white'
                    : 'text-muted-foreground hover:text-primary hover:bg-muted'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-primary'}`} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Global Date Range Range Filter */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-muted-foreground font-medium flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-primary" /> Range:
          </span>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-36 text-xs py-1"
          />
          <span className="text-[#9a6870]">to</span>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-36 text-xs py-1"
          />
          {(startDate || endDate) && (
            <Button variant="ghost" size="sm" iconOnly title="Clear Dates" onClick={() => { setStartDate(''); setEndDate(''); }}>
              <RefreshCw className="w-3.5 h-3.5 text-primary" />
            </Button>
          )}
        </div>
      </div>

      {/* Main Tab Panels */}
      {activeTab === 'summary' && (
        <div className="space-y-8">
          {summaryLoading ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((n) => (
                  <Skeleton key={n} className="h-28 rounded-xl" />
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatsCard
                  title="Total Enquiries"
                  value={summaryData?.enquiries?.total || 0}
                  subtext={`+${summaryData?.enquiries?.new || 0} New Unprocessed`}
                  icon={Inbox}
                  color="purple"
                />
                <StatsCard
                  title="Dealer Accounts"
                  value={summaryData?.dealers?.total || 0}
                  subtext={`${summaryData?.dealers?.approved || 0} Approved / ${summaryData?.dealers?.pending || 0} Pending`}
                  icon={Users}
                  color="emerald"
                />
                <StatsCard
                  title="Customer Accounts"
                  value={summaryData?.customers?.total || 0}
                  subtext={`${summaryData?.customers?.active || 0} Verified Active Users`}
                  icon={UserCheck}
                  color="amber"
                />
                <StatsCard
                  title="Active Products"
                  value={summaryData?.products?.active || 0}
                  subtext={`Out of ${summaryData?.products?.total || 0} Total Catalog SKUs`}
                  icon={Package}
                  color="blue"
                />
              </div>

              {/* Status Breakdown Grids */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Enquiry Breakdown */}
                <Card className="space-y-3 bg-card border-border shadow-sm">
                  <h4 className="text-xs font-extrabold text-foreground uppercase tracking-wider border-b border-border pb-2">
                    Enquiry Status Distribution
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-border">
                      <span className="text-muted-foreground">New Unprocessed</span>
                      <span className="font-bold text-emerald-700">{summaryData?.enquiries?.new || 0}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border">
                      <span className="text-muted-foreground">Contacted Leads</span>
                      <span className="font-bold text-blue-700">{summaryData?.enquiries?.contacted || 0}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border">
                      <span className="text-muted-foreground">In-Progress</span>
                      <span className="font-bold text-amber-800">{summaryData?.enquiries?.inProgress || 0}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border">
                      <span className="text-muted-foreground">Closed / Converted</span>
                      <span className="font-bold text-foreground">{summaryData?.enquiries?.closed || 0}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-muted-foreground">Spam / Invalid</span>
                      <span className="font-bold text-rose-700">{summaryData?.enquiries?.spam || 0}</span>
                    </div>
                  </div>
                </Card>

                {/* Dealer KYC Breakdown */}
                <Card className="space-y-3 bg-card border-border shadow-sm">
                  <h4 className="text-xs font-extrabold text-foreground uppercase tracking-wider border-b border-border pb-2">
                    Dealer Onboarding Funnel
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-border">
                      <span className="text-muted-foreground">Pending Review Queue</span>
                      <span className="font-bold text-amber-800">{summaryData?.dealers?.pending || 0}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border">
                      <span className="text-muted-foreground">Approved Wholesale Dealers</span>
                      <span className="font-bold text-emerald-700">{summaryData?.dealers?.approved || 0}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-muted-foreground">Rejected Applications</span>
                      <span className="font-bold text-rose-700">{summaryData?.dealers?.rejected || 0}</span>
                    </div>
                  </div>
                </Card>

                {/* Customer Status Breakdown */}
                <Card className="space-y-3 bg-card border-border shadow-sm">
                  <h4 className="text-xs font-extrabold text-foreground uppercase tracking-wider border-b border-border pb-2">
                    Customer Account Status
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-border">
                      <span className="text-muted-foreground">Active Customer Accounts</span>
                      <span className="font-bold text-emerald-700">{summaryData?.customers?.active || 0}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border">
                      <span className="text-muted-foreground">Pending Verification</span>
                      <span className="font-bold text-amber-800">{summaryData?.customers?.pending || 0}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-muted-foreground">Blocked Accounts</span>
                      <span className="font-bold text-rose-700">{summaryData?.customers?.blocked || 0}</span>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- TAB 2: ENQUIRY REPORTS --- */}
      {activeTab === 'enquiries' && (
        <div className="space-y-6">
          <FilterBar
            filters={[
              {
                value: enquiryStatusFilter,
                onChange: (val) => { setEnquiryStatusFilter(val); setEnquiryPage(1); },
                options: [
                  { value: '', label: 'All Statuses' },
                  { value: 'new', label: 'New' },
                  { value: 'contacted', label: 'Contacted' },
                  { value: 'in-progress', label: 'In-Progress' },
                  { value: 'closed', label: 'Closed' },
                  { value: 'spam', label: 'Spam' },
                ],
              },
              {
                value: enquiryUserTypeFilter,
                onChange: (val) => { setEnquiryUserTypeFilter(val); setEnquiryPage(1); },
                options: [
                  { value: '', label: 'All User Types' },
                  { value: 'customer', label: 'Customer' },
                  { value: 'dealer', label: 'Dealer' },
                ],
              },
            ]}
            onReset={() => {
              setEnquiryStatusFilter('');
              setEnquiryUserTypeFilter('');
              setStartDate('');
              setEndDate('');
              setEnquiryPage(1);
            }}
          />

          {enquiryLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((n) => <Skeleton key={n} className="h-16 rounded-lg bg-muted" />)}
            </div>
          ) : !enquiryReport || enquiryReport.enquiries?.length === 0 ? (
            <EmptyState icon={Inbox} title="No enquiry report data" description="No leads match your selected parameters." />
          ) : (
            <div className="space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Card className="text-center">
                  <p className="text-[10px] text-muted-foreground uppercase">Filtered Total</p>
                  <h4 className="text-xl font-extrabold text-foreground mt-1">{enquiryReport.filteredCount || 0}</h4>
                </Card>
                <Card className="text-center">
                  <p className="text-[10px] text-muted-foreground uppercase">New Leads</p>
                  <h4 className="text-xl font-extrabold text-emerald-700 mt-1">{enquiryReport.statusBreakdown?.new || 0}</h4>
                </Card>
                <Card className="text-center">
                  <p className="text-[10px] text-muted-foreground uppercase">Retail Enquiries</p>
                  <h4 className="text-xl font-extrabold text-blue-700 mt-1">{enquiryReport.userTypeBreakdown?.customer || 0}</h4>
                </Card>
                <Card className="text-center">
                  <p className="text-[10px] text-muted-foreground uppercase">B2B Dealer Enquiries</p>
                  <h4 className="text-xl font-extrabold text-purple-800 mt-1">{enquiryReport.userTypeBreakdown?.dealer || 0}</h4>
                </Card>
              </div>

              {/* Data Table */}
              <Table>
                <Table.Header>
                  <Table.Row>
                    <Table.Head>Enquiry #</Table.Head>
                    <Table.Head>Contact</Table.Head>
                    <Table.Head>Type</Table.Head>
                    <Table.Head>Total Amount</Table.Head>
                    <Table.Head>Status</Table.Head>
                    <Table.Head>Date</Table.Head>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {enquiryReport.enquiries.map((enq) => (
                    <Table.Row key={enq._id}>
                      <Table.Cell className="font-mono text-xs font-bold text-foreground">{enq.enquiryNumber}</Table.Cell>
                      <Table.Cell>
                        <div className="text-xs font-semibold text-foreground">{enq.contactName}</div>
                        <div className="text-[10px] text-muted-foreground">{enq.contactEmail || enq.contactPhone}</div>
                      </Table.Cell>
                      <Table.Cell>
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-muted text-foreground">
                          {enq.userType || 'customer'}
                        </span>
                      </Table.Cell>
                      <Table.Cell className="font-mono text-xs text-emerald-700 font-bold">
                        ₹{Number(enq.totalAmount || 0).toLocaleString('en-IN')}
                      </Table.Cell>
                      <Table.Cell><StatusBadge status={enq.status} /></Table.Cell>
                      <Table.Cell className="text-xs text-muted-foreground">
                        {new Date(enq.createdAt).toLocaleDateString('en-IN')}
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table>

              {enquiryReport.pagination?.totalPages > 1 && (
                <Pagination
                  currentPage={enquiryPage}
                  totalPages={enquiryReport.pagination.totalPages}
                  onPageChange={(p) => setEnquiryPage(p)}
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* --- TAB 3: DEALER REPORTS --- */}
      {activeTab === 'dealers' && (
        <div className="space-y-6">
          <FilterBar
            filters={[
              {
                value: dealerStatusFilter,
                onChange: (val) => { setDealerStatusFilter(val); setDealerPage(1); },
                options: [
                  { value: '', label: 'All Statuses' },
                  { value: 'pending', label: 'Pending Verification' },
                  { value: 'approved', label: 'Approved Dealers' },
                  { value: 'rejected', label: 'Rejected Applications' },
                ],
              },
            ]}
            onReset={() => {
              setDealerStatusFilter('');
              setStartDate('');
              setEndDate('');
              setDealerPage(1);
            }}
          />

          {dealerLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((n) => <Skeleton key={n} className="h-16 rounded-lg bg-muted" />)}
            </div>
          ) : !dealerReport || dealerReport.dealers?.length === 0 ? (
            <EmptyState icon={Users} title="No dealer report data" description="No dealer profiles match your selected parameters." />
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="text-center">
                  <p className="text-[10px] text-muted-foreground uppercase">Pending Verification</p>
                  <h4 className="text-xl font-extrabold text-amber-700 mt-1">{dealerReport.statusBreakdown?.pending || 0}</h4>
                </Card>
                <Card className="text-center">
                  <p className="text-[10px] text-muted-foreground uppercase">Approved Dealers</p>
                  <h4 className="text-xl font-extrabold text-emerald-700 mt-1">{dealerReport.statusBreakdown?.approved || 0}</h4>
                </Card>
                <Card className="text-center">
                  <p className="text-[10px] text-muted-foreground uppercase">Rejected Applications</p>
                  <h4 className="text-xl font-extrabold text-rose-700 mt-1">{dealerReport.statusBreakdown?.rejected || 0}</h4>
                </Card>
              </div>

              <Table>
                <Table.Header>
                  <Table.Row>
                    <Table.Head>Company Name</Table.Head>
                    <Table.Head>GSTIN / PAN</Table.Head>
                    <Table.Head>City / State</Table.Head>
                    <Table.Head>Status</Table.Head>
                    <Table.Head>Application Date</Table.Head>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {dealerReport.dealers.map((dlr) => (
                    <Table.Row key={dlr._id}>
                      <Table.Cell className="text-xs font-bold text-foreground">{dlr.companyName}</Table.Cell>
                      <Table.Cell className="font-mono text-[11px] text-muted-foreground">
                        GST: {dlr.gstin || 'N/A'}
                      </Table.Cell>
                      <Table.Cell className="text-xs text-muted-foreground">
                        {[dlr.city, dlr.state].filter(Boolean).join(', ') || 'N/A'}
                      </Table.Cell>
                      <Table.Cell><StatusBadge status={dlr.status} /></Table.Cell>
                      <Table.Cell className="text-xs text-muted-foreground">
                        {new Date(dlr.createdAt).toLocaleDateString('en-IN')}
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table>

              {dealerReport.pagination?.totalPages > 1 && (
                <Pagination
                  currentPage={dealerPage}
                  totalPages={dealerReport.pagination.totalPages}
                  onPageChange={(p) => setDealerPage(p)}
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* --- TAB 4: CUSTOMER REPORTS --- */}
      {activeTab === 'customers' && (
        <div className="space-y-6">
          <FilterBar
            filters={[
              {
                value: customerStatusFilter,
                onChange: (val) => { setCustomerStatusFilter(val); setCustomerPage(1); },
                options: [
                  { value: '', label: 'All Statuses' },
                  { value: 'active', label: 'Active' },
                  { value: 'pending', label: 'Pending' },
                  { value: 'blocked', label: 'Blocked' },
                ],
              },
            ]}
            onReset={() => {
              setCustomerStatusFilter('');
              setStartDate('');
              setEndDate('');
              setCustomerPage(1);
            }}
          />

          {customerLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((n) => <Skeleton key={n} className="h-16 rounded-lg bg-muted" />)}
            </div>
          ) : !customerReport || customerReport.customers?.length === 0 ? (
            <EmptyState icon={UserCheck} title="No customer report data" description="No customer accounts match your selected parameters." />
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="text-center">
                  <p className="text-[10px] text-muted-foreground uppercase">Active Accounts</p>
                  <h4 className="text-xl font-extrabold text-emerald-700 mt-1">{customerReport.statusBreakdown?.active || 0}</h4>
                </Card>
                <Card className="text-center">
                  <p className="text-[10px] text-muted-foreground uppercase">Pending Accounts</p>
                  <h4 className="text-xl font-extrabold text-amber-700 mt-1">{customerReport.statusBreakdown?.pending || 0}</h4>
                </Card>
                <Card className="text-center">
                  <p className="text-[10px] text-muted-foreground uppercase">Blocked Accounts</p>
                  <h4 className="text-xl font-extrabold text-rose-700 mt-1">{customerReport.statusBreakdown?.blocked || 0}</h4>
                </Card>
              </div>

              <Table>
                <Table.Header>
                  <Table.Row>
                    <Table.Head>Customer Name</Table.Head>
                    <Table.Head>Email</Table.Head>
                    <Table.Head>Phone</Table.Head>
                    <Table.Head>Status</Table.Head>
                    <Table.Head>Registration Date</Table.Head>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {customerReport.customers.map((cust) => (
                    <Table.Row key={cust._id}>
                      <Table.Cell className="text-xs font-bold text-foreground">{cust.fullName || cust.name}</Table.Cell>
                      <Table.Cell className="font-mono text-xs text-foreground">{cust.email || 'N/A'}</Table.Cell>
                      <Table.Cell className="font-mono text-xs text-foreground">{cust.phone || 'N/A'}</Table.Cell>
                      <Table.Cell><StatusBadge status={cust.accountStatus || cust.status || 'active'} /></Table.Cell>
                      <Table.Cell className="text-xs text-muted-foreground">
                        {new Date(cust.createdAt).toLocaleDateString('en-IN')}
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table>

              {customerReport.pagination?.totalPages > 1 && (
                <Pagination
                  currentPage={customerPage}
                  totalPages={customerReport.pagination.totalPages}
                  onPageChange={(p) => setCustomerPage(p)}
                />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminReportsPage;
