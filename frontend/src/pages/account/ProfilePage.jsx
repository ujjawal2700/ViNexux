import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import useToast from '../../hooks/useToast';
import dealerService from '../../services/dealerService';
import enquiryService from '../../services/enquiryService';
import { StatusBadge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Modal } from '../../components/ui/Modal';
import { AddressBookSection } from '../../components/address/AddressBookSection';
import {
  User,
  Mail,
  Phone,
  ShieldCheck,
  MapPin,
  Edit3,
  Building2,
  FileText,
  ExternalLink,
  Clock,
  AlertTriangle,
  ArrowRight,
  Search,
  Plus,
  Store,
  Trash2,
  LogOut,
  Receipt,
  X,
  FileSpreadsheet,
} from 'lucide-react';

const KYC_DOC_TYPES = [
  { type: 'gst', required: true },
  { type: 'aadhaar', required: true },
  { type: 'msme', required: false },
];

const QUOTATION_STATUS_FILTERS = ['All', 'Draft', 'Finalized', 'Converted'];

/**
 * Account Dashboard for ViNexus (Mega Jaipur 2-column layout).
 * Left Sidebar: ACCOUNT (My Profile, My Quotations, Delete Account, Log Out)
 * Right Pane: Dynamic content depending on active tab.
 * Brand theme: ViNexus signature Maroon (#800020).
 */
export const ProfilePage = ({ initialTab = 'profile' }) => {
  const { user, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Active tab state (synced with ?tab= query parameter)
  const tabFromUrl = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabFromUrl || initialTab || 'profile');

  // Modals state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isBrandingOpen, setIsBrandingOpen] = useState(false);

  // Quotations state
  const [quotationSearch, setQuotationSearch] = useState('');
  const [quotationFilter, setQuotationFilter] = useState('All');
  const [quotations, setQuotations] = useState([]);
  const [quotationsLoading, setQuotationsLoading] = useState(false);

  // Dealer profile state
  const isDealer = user?.role === 'dealer';
  const [dealerProfile, setDealerProfile] = useState(null);
  const [dealerLoading, setDealerLoading] = useState(isDealer);
  const [dealerError, setDealerError] = useState(null);

  // Sync tab with URL
  useEffect(() => {
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId }, { replace: true });
  };

  // Fetch Dealer KYC Profile
  const fetchDealerProfile = useCallback(async () => {
    if (!isDealer) return;
    setDealerLoading(true);
    setDealerError(null);
    try {
      const res = await dealerService.getDealerProfile();
      setDealerProfile(res.data?.profile || res.profile || res.data);
    } catch (err) {
      if (err.response?.status === 404) {
        setDealerProfile(null);
      } else {
        console.error('Failed to load dealer KYC profile:', err);
        setDealerError('Unable to load KYC status.');
      }
    } finally {
      setDealerLoading(false);
    }
  }, [isDealer]);

  // Fetch Quotations / Enquiries
  const fetchQuotations = useCallback(async () => {
    setQuotationsLoading(true);
    try {
      const res = await enquiryService.getMyEnquiries({ page: 1, limit: 20 });
      const list = res.data?.enquiries || res.enquiries || [];
      setQuotations(list);
    } catch (err) {
      console.warn('Could not load user quotations:', err);
      setQuotations([]);
    } finally {
      setQuotationsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDealerProfile();
  }, [fetchDealerProfile]);

  useEffect(() => {
    if (activeTab === 'quotations') {
      fetchQuotations();
    }
  }, [activeTab, fetchQuotations]);

  // Direct Logout Action
  const handleDirectLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully.');
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
      navigate('/login');
    }
  };

  // Delete Account Confirmation Action
  const handleConfirmDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      // Clear user session, tokens and cached storage
      await logout();
      localStorage.removeItem('vinexus_user');
      toast.success('Your account has been deleted successfully.');
      navigate('/login');
    } catch (err) {
      console.error('Failed to delete account:', err);
      toast.error('Unable to delete account. Please try again.');
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  // Filter quotations by search and status
  const filteredQuotations = quotations.filter((q) => {
    const matchesSearch =
      !quotationSearch.trim() ||
      (q.enquiryNumber && q.enquiryNumber.toLowerCase().includes(quotationSearch.toLowerCase())) ||
      (q._id && q._id.toLowerCase().includes(quotationSearch.toLowerCase())) ||
      (q.notes && q.notes.toLowerCase().includes(quotationSearch.toLowerCase()));

    if (!matchesSearch) return false;

    if (quotationFilter === 'All') return true;
    if (quotationFilter === 'Draft') return q.status === 'draft';
    if (quotationFilter === 'Finalized') return q.status === 'confirmed' || q.status === 'finalized';
    if (quotationFilter === 'Converted') return q.status === 'converted' || q.status === 'completed';
    return true;
  });

  return (
    <div className="w-full max-w-[1920px] mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8 bg-gray-50 min-h-[calc(100vh-220px)]">
      
      {/* 2-Column Responsive Dashboard Layout */}
      <div className="flex flex-col md:flex-row gap-6 lg:gap-8 items-start">
        
        {/* LEFT COLUMN: ACCOUNT SIDEBAR (Mega Jaipur Style with ViNexus Maroon) */}
        <aside className="w-full md:w-64 lg:w-72 shrink-0">
          <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 shadow-2xs space-y-1">
            
            {/* Header: ACCOUNT */}
            <div className="px-3 pt-1 pb-3 text-left">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-gray-400">
                Account
              </span>
            </div>

            {/* Sidebar Navigation Items */}
            <nav className="space-y-1" aria-label="Account sidebar">
              
              {/* 1. My Profile (Replaces "My Orders" per user specification) */}
              <button
                type="button"
                onClick={() => handleTabChange('profile')}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-lg text-sm font-semibold transition-all text-left cursor-pointer border-l-4 ${
                  activeTab === 'profile'
                    ? 'border-[#800020] bg-[#800020]/5 text-[#800020] font-bold shadow-2xs'
                    : 'border-transparent text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <User
                  className={`w-5 h-5 shrink-0 ${
                    activeTab === 'profile' ? 'text-[#800020]' : 'text-gray-400'
                  }`}
                />
                <span>My Profile</span>
              </button>

              {/* 2. My Quotations */}
              <button
                type="button"
                onClick={() => handleTabChange('quotations')}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-lg text-sm font-semibold transition-all text-left cursor-pointer border-l-4 ${
                  activeTab === 'quotations'
                    ? 'border-[#800020] bg-[#800020]/5 text-[#800020] font-bold shadow-2xs'
                    : 'border-transparent text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <FileSpreadsheet
                  className={`w-5 h-5 shrink-0 ${
                    activeTab === 'quotations' ? 'text-[#800020]' : 'text-gray-400'
                  }`}
                />
                <span>My Quotations</span>
              </button>

              {/* 3. Delete Account (Opens warning confirmation dialog) */}
              <button
                type="button"
                onClick={() => setIsDeleteDialogOpen(true)}
                className="w-full flex items-center gap-3 px-3.5 py-3 rounded-lg text-sm font-semibold text-gray-700 hover:text-rose-600 hover:bg-rose-50/60 border-l-4 border-transparent transition-all text-left cursor-pointer"
              >
                <Trash2 className="w-5 h-5 shrink-0 text-gray-400 group-hover:text-rose-600" />
                <span>Delete Account</span>
              </button>

              {/* 4. Log Out (Directly logs out user and navigates to /login) */}
              <button
                type="button"
                onClick={handleDirectLogout}
                className="w-full flex items-center gap-3 px-3.5 py-3 rounded-lg text-sm font-semibold text-gray-700 hover:text-[#800020] hover:bg-gray-50 border-l-4 border-transparent transition-all text-left cursor-pointer"
              >
                <LogOut className="w-5 h-5 shrink-0 text-gray-400" />
                <span>Log Out</span>
              </button>

            </nav>
          </div>
        </aside>

        {/* RIGHT COLUMN: DYNAMIC CONTENT PANE */}
        <main className="flex-1 w-full space-y-6">
          
          {/* ========================================================= */}
          {/* TAB 1: MY PROFILE */}
          {/* ========================================================= */}
          {activeTab === 'profile' && (
            <div className="space-y-6 text-left animate-in fade-in-50 duration-200">
              
              {/* Header Row */}
              <div className="border-b border-gray-200 pb-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="text-left">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#800020]">
                    Account Overview
                  </span>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2.5 mt-0.5">
                    <User className="w-6 h-6 sm:w-7 sm:h-7 text-[#800020]" />
                    <span>My Profile</span>
                  </h1>
                </div>

                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    Verified Account
                  </span>
                  <Link
                    to="/account/profile/update"
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#800020] hover:bg-[#9a1b32] text-white text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Profile</span>
                  </Link>
                </div>
              </div>

              {/* Personal Information Card */}
              <div className="bg-white p-5 sm:p-7 rounded-xl border border-gray-200 shadow-2xs space-y-5">
                <div className="pb-3 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="text-base font-bold text-gray-900">Personal Information</h2>
                  <Link
                    to="/account/profile/update"
                    className="text-xs font-bold text-[#800020] hover:underline flex items-center gap-1"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Details</span>
                  </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6 text-xs">
                  {/* Full Name */}
                  <div className="space-y-1.5 bg-gray-50/80 hover:bg-gray-50 p-4 rounded-xl border border-gray-200/80 transition-colors">
                    <span className="text-gray-500 font-semibold flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-[#800020]" /> Full Name
                    </span>
                    <span className="text-sm font-bold text-gray-900 block truncate">
                      {user?.fullName || user?.name || user?.contactPerson || 'Dipesh Gocher'}
                    </span>
                  </div>

                  {/* Email Address */}
                  <div className="space-y-1.5 bg-gray-50/80 hover:bg-gray-50 p-4 rounded-xl border border-gray-200/80 transition-colors">
                    <span className="text-gray-500 font-semibold flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-[#800020]" /> Email Address
                    </span>
                    <span className="text-sm font-mono font-medium text-gray-900 block truncate">
                      {user?.email || 'customer@vinexus.com'}
                    </span>
                  </div>

                  {/* Mobile Number */}
                  <div className="space-y-1.5 bg-gray-50/80 hover:bg-gray-50 p-4 rounded-xl border border-gray-200/80 transition-colors">
                    <span className="text-gray-500 font-semibold flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-[#800020]" /> Mobile Number
                    </span>
                    <span className="text-sm font-mono font-medium text-gray-900 block truncate">
                      {user?.phone || user?.identifier || '8209224481'}
                    </span>
                  </div>

                  {/* Account Role */}
                  <div className="space-y-1.5 bg-gray-50/80 hover:bg-gray-50 p-4 rounded-xl border border-gray-200/80 transition-colors">
                    <span className="text-gray-500 font-semibold flex items-center gap-2">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Account Role
                    </span>
                    <span className="text-sm font-extrabold text-[#800020] uppercase block">
                      {user?.role || 'Customer'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Business & KYC Verification (Dealer Only) */}
              {isDealer && (
                <div className="bg-white p-5 sm:p-7 rounded-xl border border-gray-200 shadow-2xs space-y-4">
                  <div className="pb-3 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="text-base font-bold flex items-center gap-2 text-gray-900">
                      <Building2 className="w-4 h-4 text-[#800020]" />
                      <span>Business &amp; KYC Verification</span>
                    </h2>
                    {dealerProfile && <StatusBadge status={dealerProfile.status} />}
                  </div>

                  <div>
                    {dealerLoading ? (
                      <div className="space-y-3">
                        <Skeleton className="h-16 w-full rounded-xl" />
                        <Skeleton className="h-16 w-full rounded-xl" />
                      </div>
                    ) : dealerError ? (
                      <p className="text-xs text-rose-600">{dealerError}</p>
                    ) : !dealerProfile ? (
                      <div className="text-center py-6 space-y-3">
                        <p className="text-xs text-gray-500 max-w-sm mx-auto">
                          You haven't submitted your company profile and KYC documents yet. This is required to unlock dealer
                          wholesale pricing.
                        </p>
                        <Link
                          to="/account/profile/update"
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#800020] hover:bg-[#9a1b32] text-white text-xs font-bold shadow-2xs transition-colors"
                        >
                          <span>Start KYC Submission</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    ) : (
                      <div className="space-y-4 text-xs">
                        {dealerProfile.status === 'rejected' && (
                          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 space-y-2">
                            <div className="flex items-center gap-2 text-rose-800 font-bold">
                              <AlertTriangle className="w-4 h-4 shrink-0" /> KYC Rejected - Action Required
                            </div>
                            <p className="text-rose-900/80">
                              Reason: "{dealerProfile.rejectionReason || 'Submitted documentation was incomplete or invalid.'}"
                            </p>
                            <Link
                              to="/account/profile/update"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold transition-colors"
                            >
                              <span>Resubmit KYC Documents</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        )}
                        {dealerProfile.status === 'pending' && (
                          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2.5">
                            <Clock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                            <p className="text-amber-900">
                              Your business profile and documents are under Vinexus admin review. Standard pricing applies
                              until approved.
                            </p>
                          </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                          <div className="space-y-1 bg-gray-50 p-3 rounded-xl border border-gray-200">
                            <span className="text-gray-500 block text-[10px] font-semibold">Company Name</span>
                            <span className="font-bold text-gray-900 block">{dealerProfile.companyName}</span>
                          </div>
                          <div className="space-y-1 bg-gray-50 p-3 rounded-xl border border-gray-200">
                            <span className="text-gray-500 block text-[10px] font-semibold">GSTIN Number</span>
                            <span className="font-mono font-bold text-gray-900 block">{dealerProfile.gstin || 'Not Provided'}</span>
                          </div>
                          <div className="space-y-1 bg-gray-50 p-3 rounded-xl border border-gray-200">
                            <span className="text-gray-500 block text-[10px] font-semibold">PAN Number</span>
                            <span className="font-mono font-bold text-gray-900 block">{dealerProfile.pan || 'Not Provided'}</span>
                          </div>
                          <div className="space-y-1 bg-gray-50 p-3 rounded-xl border border-gray-200">
                            <span className="text-gray-500 block text-[10px] font-semibold">Registered Location</span>
                            <span className="font-bold text-gray-900 block">
                              {dealerProfile.city ? `${dealerProfile.city}, ${dealerProfile.state || ''} ${dealerProfile.pincode || ''}` : 'Not Provided'}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-2 pt-2 border-t border-gray-200">
                          <h4 className="text-[11px] font-bold text-gray-600 uppercase flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-[#800020]" /> Submitted KYC Documents
                          </h4>
                          {KYC_DOC_TYPES.map(({ type: docType, required }) => {
                            const doc = (dealerProfile.kycDocuments || []).find((d) => d.type === docType);
                            return (
                              <div key={docType} className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 border border-gray-200">
                                <span className="font-bold uppercase text-gray-800">
                                  {docType}
                                  {!required && <span className="text-gray-400 normal-case font-normal"> (Optional)</span>}
                                </span>
                                {doc ? (
                                  <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-[#800020] hover:underline flex items-center gap-1 font-semibold">
                                    View <ExternalLink className="w-3 h-3" />
                                  </a>
                                ) : required ? (
                                  <span className="text-rose-600 font-semibold italic">Missing</span>
                                ) : (
                                  <span className="text-gray-400 italic">Not uploaded</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Saved Addresses Section */}
              <div className="bg-white p-5 sm:p-7 rounded-xl border border-gray-200 shadow-2xs space-y-4">
                <div className="pb-3 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#800020]" />
                    <span>Saved Addresses</span>
                  </h2>
                </div>
                <div>
                  <AddressBookSection />
                </div>
              </div>

            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 2: MY QUOTATIONS (Exact Mega Jaipur Layout in ViNexus Maroon) */}
          {/* ========================================================= */}
          {activeTab === 'quotations' && (
            <div className="space-y-5 text-left animate-in fade-in-50 duration-200">
              
              {/* Header Row: Title & Subtitle + Branding button */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                    My Quotations
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1">
                    Build branded quotations for your buyers from our catalogue
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsBrandingOpen(true)}
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-white hover:bg-gray-50 border border-gray-300 text-xs font-bold text-gray-800 shadow-2xs transition-colors cursor-pointer"
                >
                  <Store className="w-4 h-4 text-gray-600" />
                  <span>Branding</span>
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative w-full">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Search className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  placeholder="Search by estimate no., buyer or subject..."
                  value={quotationSearch}
                  onChange={(e) => setQuotationSearch(e.target.value)}
                  className="w-full h-11 pl-10 pr-10 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#800020] focus:ring-1 focus:ring-[#800020] transition-all shadow-2xs"
                />
                {quotationSearch && (
                  <button
                    type="button"
                    onClick={() => setQuotationSearch('')}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Filter Tabs & "+ New Quotation" Action Row */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
                
                {/* Filter Pills: All, Draft, Finalized, Converted */}
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  {QUOTATION_STATUS_FILTERS.map((filter) => {
                    const isActive = quotationFilter === filter;
                    return (
                      <button
                        key={filter}
                        type="button"
                        onClick={() => setQuotationFilter(filter)}
                        className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                          isActive
                            ? 'bg-[#800020] text-white shadow-2xs'
                            : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                        }`}
                      >
                        {filter}
                      </button>
                    );
                  })}
                </div>

                {/* + New Quotation Button */}
                <Link
                  to="/products"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#800020] hover:bg-[#9a1b32] text-white text-xs sm:text-sm font-bold shadow-2xs transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Quotation</span>
                </Link>
              </div>

              {/* Main Content Box (Exact Mega Jaipur Empty State / List View) */}
              <div className="bg-white rounded-xl border border-gray-200 p-8 sm:p-14 min-h-[380px] flex flex-col items-center justify-center text-center shadow-2xs">
                
                {quotationsLoading ? (
                  <div className="space-y-4 w-full max-w-md mx-auto">
                    <Skeleton className="h-8 w-48 mx-auto rounded" />
                    <Skeleton className="h-20 w-full rounded-xl" />
                    <Skeleton className="h-10 w-36 mx-auto rounded" />
                  </div>
                ) : filteredQuotations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center space-y-4">
                    
                    {/* Centered Soft Square with Note Icon */}
                    <div className="w-14 h-14 rounded-xl bg-[#800020]/10 text-[#800020] flex items-center justify-center shadow-2xs">
                      <Receipt className="w-7 h-7" />
                    </div>

                    {/* "No quotations yet" heading */}
                    <h3 className="text-base sm:text-lg font-extrabold text-gray-900">
                      {quotationSearch ? 'No matching quotations found' : 'No quotations yet'}
                    </h3>

                    {/* "+ New Quotation" action button */}
                    <Link
                      to="/products"
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#800020] hover:bg-[#9a1b32] text-white text-xs sm:text-sm font-bold shadow-2xs transition-colors cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>New Quotation</span>
                    </Link>
                  </div>
                ) : (
                  <div className="w-full space-y-3 text-left">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredQuotations.map((quotation) => (
                        <div
                          key={quotation._id || quotation.id}
                          className="p-4 rounded-xl border border-gray-200 hover:border-[#800020]/50 transition-colors bg-white shadow-2xs space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-sm text-[#800020]">
                              {quotation.enquiryNumber || 'EST-' + String(quotation._id).slice(-6).toUpperCase()}
                            </span>
                            <StatusBadge status={quotation.status || 'draft'} />
                          </div>

                          <div className="text-xs text-gray-500 space-y-1">
                            <div className="flex justify-between">
                              <span>Created on:</span>
                              <span className="font-medium text-gray-700">
                                {new Date(quotation.createdAt || Date.now()).toLocaleDateString('en-IN', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Items:</span>
                              <span className="font-bold text-gray-800">
                                {quotation.items?.length || 1} item(s)
                              </span>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-gray-100 flex items-center justify-end">
                            <Link
                              to={`/account/enquiries/${quotation._id || quotation.id}`}
                              className="text-xs font-bold text-[#800020] hover:underline inline-flex items-center gap-1"
                            >
                              <span>View Details</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>

            </div>
          )}

        </main>
      </div>

      {/* WARNING DIALOG: DELETE ACCOUNT */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleConfirmDeleteAccount}
        title="Delete Account"
        message="Are you sure you want to permanently delete your account? All your personal information, saved addresses, quotations, and order preferences will be permanently removed. This action cannot be undone."
        confirmText="Yes, Delete Account"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeleting}
      />

      {/* BRANDING MODAL: QUOTATION BRANDING */}
      <Modal
        isOpen={isBrandingOpen}
        onClose={() => setIsBrandingOpen(false)}
        title="Quotation Branding"
        size="md"
      >
        <div className="space-y-4 text-xs text-gray-600 text-left">
          <p>
            Configure your brand details for client quotations. Your company name, logo, contact number, and registered address will appear cleanly on generated PDF estimates.
          </p>

          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-2.5">
            <div className="flex justify-between items-center py-1 border-b border-gray-200/60">
              <span className="font-semibold text-gray-600">Company Name:</span>
              <span className="font-bold text-gray-900">
                {dealerProfile?.companyName || user?.fullName || 'ViNexus Member'}
              </span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-gray-200/60">
              <span className="font-semibold text-gray-600">Contact Person:</span>
              <span className="font-bold text-gray-900">
                {user?.fullName || user?.name || 'Dipesh Gocher'}
              </span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-gray-200/60">
              <span className="font-semibold text-gray-600">Contact Number:</span>
              <span className="font-mono text-gray-900">
                {user?.phone || user?.identifier || '+91 8209224481'}
              </span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="font-semibold text-gray-600">Brand Header:</span>
              <span className="text-emerald-700 font-bold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Active
              </span>
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsBrandingOpen(false)}
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-bold hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                setIsBrandingOpen(false);
                toast.success('Quotation branding preferences saved.');
              }}
              className="px-4 py-2 rounded-lg bg-[#800020] text-white font-bold hover:bg-[#9a1b32] transition-colors cursor-pointer"
            >
              Save Branding
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
};

export default ProfilePage;
