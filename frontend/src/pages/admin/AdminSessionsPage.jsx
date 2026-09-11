import React, { useState, useEffect } from 'react';
import adminService from '../../services/adminService';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import FilterBar from '../../components/admin/FilterBar';
import Table from '../../components/ui/Table';
import Pagination from '../../components/ui/Pagination';
import Drawer from '../../components/ui/Drawer';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Button from '../../components/ui/Button';
import Badge, { StatusBadge } from '../../components/ui/Badge';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import Toast from '../../components/ui/Toast';
import { ShieldAlert, Eye, LogOut, Laptop, Smartphone, Globe, Clock } from 'lucide-react';

const AdminSessionsPage = () => {
  const [sessions, setSessions] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [userTypeFilter, setUserTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Session Drawer Detail
  const [inspectSession, setInspectSession] = useState(null);

  // Revoke Session State
  const [revokeTarget, setRevokeTarget] = useState(null);
  const [revokeLoading, setRevokeLoading] = useState(false);

  // Toast Notifications
  const [toast, setToast] = useState(null);

  const fetchSessions = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        limit: 20,
        sortBy,
        sortOrder,
      };
      if (search.trim()) params.search = search.trim();
      if (statusFilter) params.status = statusFilter;
      if (userTypeFilter) params.userType = userTypeFilter;

      const res = await adminService.getSessions(params);
      setSessions(res.data?.sessions || []);
      setPagination(res.data?.pagination || { page: 1, limit: 20, totalPages: 1, total: 0 });
    } catch (err) {
      console.error('Error fetching active sessions directory:', err);
      setError(err.response?.data?.message || 'Failed to load user session audit directory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [page, statusFilter, userTypeFilter, sortBy, sortOrder]);

  const handleRevokeConfirm = async () => {
    if (!revokeTarget) return;
    setRevokeLoading(true);
    try {
      await adminService.revokeSession(revokeTarget._id || revokeTarget.sessionId);
      setToast({ message: 'Session revoked successfully!', type: 'success' });
      setRevokeTarget(null);
      fetchSessions();
    } catch (err) {
      console.error('Session revoke error:', err);
      setToast({ message: err.response?.data?.message || 'Failed to revoke session', type: 'error' });
    } finally {
      setRevokeLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <AdminPageHeader
        title="Active Sessions Audit & Control"
        subtitle="Monitor active single-session device logins, IP access records & force terminate unauthorized active sessions"
        badge={`${pagination.total} Session Records`}
      />

      {/* Filter Bar */}
      <FilterBar
        search={search}
        onSearchChange={(e) => setSearch(e.target.value)}
        searchPlaceholder="Search by sessionId, IP address, or user name/email..."
        filters={[
          {
            value: statusFilter,
            onChange: (val) => {
              setStatusFilter(val);
              setPage(1);
            },
            options: [
              { value: '', label: 'All Session States' },
              { value: 'active', label: 'Currently Active Sessions' },
              { value: 'expired', label: 'Expired Sessions' },
              { value: 'revoked', label: 'Revoked Sessions' },
            ],
          },
          {
            value: userTypeFilter,
            onChange: (val) => {
              setUserTypeFilter(val);
              setPage(1);
            },
            options: [
              { value: '', label: 'All User Roles' },
              { value: 'customer', label: 'Customers' },
              { value: 'dealer', label: 'Dealers' },
              { value: 'admin', label: 'Admins' },
            ],
          },
        ]}
        sortOptions={[
          { value: 'createdAt', label: 'Sort by Issued Date' },
          { value: 'lastActiveAt', label: 'Sort by Last Active Time' },
          { value: 'expiresAt', label: 'Sort by Expiration Date' },
        ]}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={(field, order) => {
          setSortBy(field);
          setSortOrder(order);
        }}
        onReset={() => {
          setSearch('');
          setStatusFilter('');
          setUserTypeFilter('');
          setPage(1);
          setSortBy('createdAt');
          setSortOrder('desc');
        }}
      >
        <Button variant="outline" size="sm" onClick={() => { setPage(1); fetchSessions(); }} className="text-xs shrink-0">
          Apply Search
        </Button>
      </FilterBar>

      {/* Table Content */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((n) => (
            <Skeleton key={n} className="h-16 rounded-lg bg-muted" />
          ))}
        </div>
      ) : error ? (
        <ErrorState title="Failed to load session audit directory" message={error} onRetry={fetchSessions} />
      ) : sessions.length === 0 ? (
        <EmptyState
          icon={ShieldAlert}
          title="No session records found"
          description="There are no user sessions matching your filter or search query."
        />
      ) : (
        <div className="space-y-4">
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.Head>Session ID / User</Table.Head>
                <Table.Head>Role</Table.Head>
                <Table.Head>IP Address</Table.Head>
                <Table.Head>Last Active</Table.Head>
                <Table.Head>State</Table.Head>
                <Table.Head className="text-right">Action</Table.Head>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {sessions.map((sess) => {
                const userObj = sess.userId || {};
                const userName = userObj.name || userObj.fullName || 'Anonymous User';
                const roleStr = sess.userType || userObj.role || 'user';
                const isSessionActive = sess.isActive && new Date(sess.expiresAt) > new Date();

                return (
                  <Table.Row key={sess._id}>
                    <Table.Cell>
                      <div className="font-mono text-xs text-foreground font-bold truncate max-w-[180px]">
                        {sess.sessionId || sess._id}
                      </div>
                      <div className="text-[11px] font-semibold text-foreground">
                        {userName} <span className="text-[10px] text-muted-foreground">({userObj.email || userObj.phone || 'N/A'})</span>
                      </div>
                    </Table.Cell>
                    <Table.Cell>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                        roleStr === 'admin'
                          ? 'bg-rose-50 text-rose-800 border-rose-200'
                          : roleStr === 'dealer'
                          ? 'bg-purple-50 text-purple-800 border-purple-200'
                          : 'bg-blue-50 text-blue-800 border-blue-200'
                      }`}>
                        {roleStr}
                      </span>
                    </Table.Cell>
                    <Table.Cell className="font-mono text-xs text-muted-foreground">
                      {sess.ipAddress || '127.0.0.1'}
                    </Table.Cell>
                    <Table.Cell className="text-xs text-muted-foreground">
                      {new Date(sess.lastActiveAt || sess.updatedAt || sess.createdAt).toLocaleString('en-IN')}
                    </Table.Cell>
                    <Table.Cell>
                      {isSessionActive ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Active
                        </span>
                      ) : sess.revokedAt ? (
                        <span className="text-xs font-medium text-rose-700">Revoked</span>
                      ) : (
                        <span className="text-xs font-medium text-muted-foreground">Expired</span>
                      )}
                    </Table.Cell>
                    <Table.Cell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setInspectSession(sess)}
                          className="h-8 px-2 text-xs"
                          title="View Session Details"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" /> View
                        </Button>

                        {isSessionActive && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setRevokeTarget(sess)}
                            className="h-8 px-2 text-xs text-rose-700 hover:text-rose-800 hover:bg-rose-50"
                            title="Force Terminate Session"
                          >
                            <LogOut className="w-3.5 h-3.5 mr-1" /> Force Revoke
                          </Button>
                        )}
                      </div>
                    </Table.Cell>
                  </Table.Row>
                );
              })}
            </Table.Body>
          </Table>

          {pagination.totalPages > 1 && (
            <Pagination
              currentPage={page}
              totalPages={pagination.totalPages}
              onPageChange={(newPage) => setPage(newPage)}
            />
          )}
        </div>
      )}

      {/* Session Details Drawer */}
      <Drawer
        isOpen={!!inspectSession}
        onClose={() => setInspectSession(null)}
        title="Session Audit Details"
        size="md"
      >
        {inspectSession && (
          <div className="space-y-6 text-xs">
            <div className="p-4 rounded-xl bg-card border border-border space-y-3">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <span className="text-muted-foreground">Session UUID:</span>
                <span className="font-mono text-foreground font-bold">{inspectSession.sessionId}</span>
              </div>
              <div className="flex items-center justify-between border-b border-border pb-2">
                <span className="text-muted-foreground">IP Address:</span>
                <span className="font-mono text-foreground">{inspectSession.ipAddress || '127.0.0.1'}</span>
              </div>
              <div className="flex items-center justify-between border-b border-border pb-2">
                <span className="text-muted-foreground">Issued Timestamp:</span>
                <span className="text-foreground">{new Date(inspectSession.createdAt).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex items-center justify-between border-b border-border pb-2">
                <span className="text-muted-foreground">Expiration Timestamp:</span>
                <span className="text-foreground">{new Date(inspectSession.expiresAt).toLocaleString('en-IN')}</span>
              </div>
              {inspectSession.revokedAt && (
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <span className="text-muted-foreground">Revocation Timestamp:</span>
                  <span className="text-rose-700 font-semibold">{new Date(inspectSession.revokedAt).toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Active State:</span>
                <span className={`font-bold ${inspectSession.isActive ? 'text-emerald-700' : 'text-muted-foreground'}`}>
                  {inspectSession.isActive ? 'Active' : 'Terminated/Revoked'}
                </span>
              </div>
            </div>

            {/* User Details */}
            {inspectSession.userId && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Associated User Profile</h4>
                <div className="p-4 rounded-xl bg-card border border-border space-y-2">
                  <div className="flex justify-between py-1 border-b border-border">
                    <span className="text-muted-foreground">User Name:</span>
                    <span className="font-bold text-foreground">{inspectSession.userId.name || inspectSession.userId.fullName}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border">
                    <span className="text-muted-foreground">Email:</span>
                    <span className="font-mono text-foreground">{inspectSession.userId.email || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border">
                    <span className="text-muted-foreground">Phone:</span>
                    <span className="font-mono text-foreground">{inspectSession.userId.phone || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground">Role:</span>
                    <span className="font-bold uppercase text-primary">{inspectSession.userId.role}</span>
                  </div>
                </div>
              </div>
            )}

            {/* User Agent */}
            {inspectSession.userAgent && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">User Agent String</h4>
                <p className="p-3 rounded-lg bg-background border border-border font-mono text-[11px] text-muted-foreground break-all">
                  {inspectSession.userAgent}
                </p>
              </div>
            )}

            <div className="pt-4 border-t border-border flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setInspectSession(null)}>
                Close Drawer
              </Button>
            </div>
          </div>
        )}
      </Drawer>

      {/* Force Revoke Confirm Dialog */}
      <ConfirmDialog
        isOpen={!!revokeTarget}
        onClose={() => setRevokeTarget(null)}
        onConfirm={handleRevokeConfirm}
        title="Force Revoke User Session"
        message={`Are you sure you want to force terminate session "${revokeTarget?.sessionId}"? The user will be immediately logged out on their device.`}
        confirmText="Revoke Session"
        isLoading={revokeLoading}
        variant="danger"
      />
    </div>
  );
};

export default AdminSessionsPage;
