import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import adminService from '../../services/adminService';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import StatsCard from '../../components/admin/StatsCard';
import Table from '../../components/ui/Table';
import Badge, { StatusBadge } from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Skeleton from '../../components/ui/Skeleton';
import ErrorState from '../../components/ui/ErrorState';
import { 
  Inbox, 
  Users, 
  UserCheck, 
  Package, 
  FolderTree, 
  Clock, 
  ArrowRight,
  PlusCircle,
  ShieldCheck,
  Sparkles
} from 'lucide-react';

const AdminDashboardPage = () => {
  const [summary, setSummary] = useState(null);
  const [recentEnquiries, setRecentEnquiries] = useState([]);
  const [pendingDealers, setPendingDealers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [summaryRes, enquiriesRes, dealersRes] = await Promise.all([
        adminService.getDashboardSummary(),
        adminService.getEnquiries({ limit: 5 }),
        adminService.getDealers({ status: 'pending', limit: 5 }),
      ]);

      setSummary(summaryRes.data || summaryRes);
      setRecentEnquiries(enquiriesRes.data?.enquiries || []);
      setPendingDealers(dealersRes.data?.dealers || []);
    } catch (err) {
      console.error('Error fetching admin dashboard data:', err);
      setError(err.response?.data?.message || 'Failed to load admin dashboard overview');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <AdminPageHeader title="Admin Dashboard" subtitle="Loading system overview..." />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <Skeleton key={n} className="h-28 rounded-xl bg-slate-900" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64 rounded-xl bg-slate-900" />
          <Skeleton className="h-64 rounded-xl bg-slate-900" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <AdminPageHeader title="Admin Dashboard" subtitle="System Control Center Overview" />
        <ErrorState
          title="Failed to load dashboard data"
          message={error}
          onRetry={fetchDashboardData}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Admin Control Center"
        subtitle="Real-time system health, lead analytics & verification queue"
        badge="Live System"
        action={
          <div className="flex items-center gap-2">
            <Link to="/admin/products">
              <Button variant="outline" size="sm">
                <PlusCircle className="w-3.5 h-3.5 mr-1.5" />
                Add Product
              </Button>
            </Link>
            <Link to="/admin/dealers">
              <Button variant="primary" size="sm">
                <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
                Verify Dealers
              </Button>
            </Link>
          </div>
        }
      />

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Enquiries"
          value={summary?.enquiries?.total || 0}
          subtext={`${summary?.enquiries?.new || 0} New Unprocessed Leads`}
          icon={Inbox}
          color="crimson"
        />
        <StatsCard
          title="Pending KYC Queue"
          value={summary?.dealers?.pending || 0}
          subtext={`${summary?.dealers?.approved || 0} Verified Dealers Active`}
          icon={Clock}
          color="amber"
        />
        <StatsCard
          title="Customer Accounts"
          value={summary?.customers?.total || 0}
          subtext={`${summary?.dealers?.total || 0} Total B2B Dealer Accounts`}
          icon={UserCheck}
          color="emerald"
        />
        <StatsCard
          title="Product Catalog"
          value={summary?.products?.total || 0}
          subtext={`${summary?.products?.active || 0} Active / ${summary?.categories?.active || 0} Categories`}
          icon={Package}
          color="blue"
        />
      </div>

      {/* Quick Action Bar */}
      <div className="bg-white border border-[#e5d1d4] rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#f4e7ea] text-[#800020] flex items-center justify-center font-bold">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-[#3d0a0d] uppercase tracking-wider">Quick Control Actions</h4>
            <p className="text-[11px] text-[#7c5c5f]">Direct shortcuts to critical admin workflows</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link to="/admin/categories">
            <Button variant="outline" size="sm" className="text-xs">
              <FolderTree className="w-3.5 h-3.5 mr-1.5 text-[#800020]" />
              Categories
            </Button>
          </Link>
          <Link to="/admin/enquiries">
            <Button variant="outline" size="sm" className="text-xs">
              <Inbox className="w-3.5 h-3.5 mr-1.5 text-[#800020]" />
              Manage Leads
            </Button>
          </Link>
          <Link to="/admin/sessions">
            <Button variant="outline" size="sm" className="text-xs">
              <Users className="w-3.5 h-3.5 mr-1.5 text-[#800020]" />
              Active Sessions
            </Button>
          </Link>
        </div>
      </div>

      {/* Two Column Layout: Recent Enquiries & Pending Dealer KYC Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Enquiries */}
        <div className="bg-white border border-[#e5d1d4] rounded-xl p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-[#e5d1d4] pb-3">
            <div>
              <h3 className="text-sm font-extrabold text-[#3d0a0d] tracking-wider uppercase flex items-center gap-2">
                <Inbox className="w-4 h-4 text-[#800020]" />
                Recent Enquiries
              </h3>
              <p className="text-[11px] text-[#7c5c5f]">Latest 5 leads submitted across portal</p>
            </div>
            <Link to="/admin/enquiries" className="text-xs text-[#800020] hover:text-[#9a1b32] font-bold flex items-center gap-1">
              View All <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recentEnquiries.length === 0 ? (
            <p className="text-xs text-[#7c5c5f] py-6 text-center">No recent enquiries found</p>
          ) : (
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.Head>Lead #</Table.Head>
                  <Table.Head>Contact</Table.Head>
                  <Table.Head>Status</Table.Head>
                  <Table.Head className="text-right">Action</Table.Head>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {recentEnquiries.map((enq) => (
                  <Table.Row key={enq._id}>
                    <Table.Cell className="font-mono text-xs font-bold text-[#3d0a0d]">
                      {enq.enquiryNumber}
                    </Table.Cell>
                    <Table.Cell>
                      <div className="text-xs font-bold text-[#3d0a0d]">{enq.contactName}</div>
                      <div className="text-[10px] text-[#7c5c5f]">{enq.userType}</div>
                    </Table.Cell>
                    <Table.Cell>
                      <StatusBadge status={enq.status} />
                    </Table.Cell>
                    <Table.Cell className="text-right">
                      <Link to={`/admin/enquiries/${enq._id}`}>
                        <Button variant="ghost" size="sm" className="text-xs h-7 px-2 text-[#800020] hover:bg-[#f4e7ea]">
                          Inspect
                        </Button>
                      </Link>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          )}
        </div>

        {/* Pending Dealer KYC Queue */}
        <div className="bg-white border border-[#e5d1d4] rounded-xl p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-[#e5d1d4] pb-3">
            <div>
              <h3 className="text-sm font-extrabold text-[#3d0a0d] tracking-wider uppercase flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600" />
                Pending Dealer KYC Queue
              </h3>
              <p className="text-[11px] text-[#7c5c5f]">Dealers awaiting document verification</p>
            </div>
            <Link to="/admin/dealers?status=pending" className="text-xs text-amber-700 hover:text-amber-800 font-bold flex items-center gap-1">
              View Queue <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {pendingDealers.length === 0 ? (
            <p className="text-xs text-[#7c5c5f] py-6 text-center">No pending dealer KYC applications</p>
          ) : (
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.Head>Company</Table.Head>
                  <Table.Head>GSTIN</Table.Head>
                  <Table.Head>Status</Table.Head>
                  <Table.Head className="text-right">Action</Table.Head>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {pendingDealers.map((dlr) => (
                  <Table.Row key={dlr._id}>
                    <Table.Cell className="text-xs font-bold text-[#3d0a0d]">
                      {dlr.companyName}
                    </Table.Cell>
                    <Table.Cell className="font-mono text-[11px] text-[#7c5c5f]">
                      {dlr.gstin || 'N/A'}
                    </Table.Cell>
                    <Table.Cell>
                      <StatusBadge status={dlr.status} />
                    </Table.Cell>
                    <Table.Cell className="text-right">
                      <Link to={`/admin/dealers/${dlr._id}`}>
                        <Button variant="outline" size="sm" className="text-xs h-7 px-2 border-[#e5d1d4] text-[#800020]">
                          Verify
                        </Button>
                      </Link>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
