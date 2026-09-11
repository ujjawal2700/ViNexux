import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import enquiryService from '../../services/enquiryService';
import { Table } from '../../components/ui/Table';
import { StatusBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { Pagination } from '../../components/ui/Pagination';
import { SkeletonTable } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { FileText, Eye, Calendar, RefreshCw } from 'lucide-react';

export const CustomerEnquiriesPage = () => {
  const [enquiries, setEnquiries] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch My Enquiries
  const fetchEnquiries = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const query = {
        page: currentPage,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      };
      if (statusFilter) {
        query.status = statusFilter;
      }

      const res = await enquiryService.getMyEnquiries(query);
      const list = res.data?.enquiries || res.enquiries || [];
      const pageInfo = res.data?.pagination || res.pagination || { page: 1, totalPages: 1, total: list.length };

      setEnquiries(list);
      setPagination(pageInfo);
    } catch (err) {
      console.error('Customer enquiries fetch error:', err);
      setError('Unable to load your enquiry history.');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, statusFilter]);

  useEffect(() => {
    fetchEnquiries();
  }, [fetchEnquiries]);

  // Format Currency (INR ₹)
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Table Columns Setup
  const columns = [
    {
      header: 'Enquiry No',
      key: 'enquiryNumber',
      className: 'font-mono text-primary font-bold',
      render: (val, row) => (
        <Link to={`/customer/enquiries/${row._id}`} className="hover:underline">
          {val || row.id || 'VNX'}
        </Link>
      ),
    },
    {
      header: 'Date',
      key: 'createdAt',
      render: (val) => (
        <span className="text-xs text-muted-foreground">
          {new Date(val).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
        </span>
      ),
    },
    {
      header: 'Status',
      key: 'status',
      render: (val) => <StatusBadge status={val} />,
    },
    {
      header: 'Items',
      key: 'items',
      render: (val) => (
        <span className="text-xs text-muted-foreground font-medium">
          {Array.isArray(val) ? val.length : 0} item(s)
        </span>
      ),
    },
    {
      header: 'Est. Total',
      key: 'total',
      align: 'right',
      className: 'font-mono font-bold text-foreground',
      render: (_, row) => {
        const total = (row.items || []).reduce(
          (sum, item) => sum + (item.priceShown || 0) * (item.quantity || 1),
          0
        );
        return formatCurrency(total);
      },
    },
    {
      header: 'Action',
      key: '_id',
      align: 'right',
      render: (val) => (
        <Link to={`/customer/enquiries/${val}`}>
          <Button variant="outline" size="sm" iconOnly title="View Details">
            <Eye className="w-3.5 h-3.5 text-muted-foreground" />
          </Button>
        </Link>
      ),
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8 bg-background text-foreground min-h-screen">
      
      {/* Header */}
      <div className="border-b border-border pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-primary">Quotations & Leads</span>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight flex items-center gap-3">
            <FileText className="w-7 h-7 text-primary" />
            <span>Enquiry History</span>
          </h1>
        </div>

        {/* Filter Controls */}
        <div className="w-full sm:w-56">
          <Select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            options={[
              { value: '', label: 'All Statuses' },
              { value: 'new', label: 'New Lead' },
              { value: 'contacted', label: 'Contacted' },
              { value: 'in-progress', label: 'In Progress' },
              { value: 'closed', label: 'Closed' },
            ]}
          />
        </div>
      </div>

      {/* Main Content Body */}
      {isLoading ? (
        <SkeletonTable rows={5} columns={6} />
      ) : error ? (
        <ErrorState title="Enquiry List Error" description={error} onRetry={fetchEnquiries} />
      ) : enquiries.length > 0 ? (
        <div className="space-y-6">
          <Table columns={columns} data={enquiries} />

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="pt-4 flex justify-center border-t border-border">
              <Pagination
                currentPage={currentPage}
                totalPages={pagination.totalPages}
                onPageChange={(page) => setCurrentPage(page)}
              />
            </div>
          )}
        </div>
      ) : (
        <EmptyState
          title="No Enquiries Submitted Yet"
          description="Build a cart in our product catalog and submit a quotation enquiry to see it listed here."
          actionLabel="Explore Product Catalog"
          onAction={() => window.location.assign('/products')}
        />
      )}
    </div>
  );
};

export default CustomerEnquiriesPage;
