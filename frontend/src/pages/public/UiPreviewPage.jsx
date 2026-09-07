import React, { useState } from 'react';
import {
  Button,
  Input,
  PasswordInput,
  Textarea,
  Select,
  SearchInput,
  OTPInput,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Badge,
  StatusBadge,
  Modal,
  ConfirmDialog,
  Drawer,
  Table,
  Pagination,
  Spinner,
  LoadingState,
  Skeleton,
  SkeletonCard,
  SkeletonTable,
  EmptyState,
  ErrorState,
  Image,
} from '../../components/ui';
import useToast from '../../hooks/useToast';
import { Mail, Phone, ArrowRight, ShieldCheck, Sparkles, Download } from 'lucide-react';

const UiPreviewPage = () => {
  const toast = useToast();

  // Modal, Dialog & Drawer states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Form states
  const [searchValue, setSearchValue] = useState('');
  const [otpValue, setOtpValue] = useState('123456');
  const [currentPage, setCurrentPage] = useState(1);

  // Table sample data
  const columns = [
    { header: 'Order ID', key: 'id', className: 'font-mono text-[#800020]' },
    { header: 'Customer', key: 'customer' },
    { header: 'Date', key: 'date' },
    {
      header: 'Status',
      key: 'status',
      render: (val) => <StatusBadge status={val} />,
    },
    { header: 'Total', key: 'total', align: 'right', className: 'font-bold text-[#3d0a0d]' },
  ];

  const tableData = [
    { id: 'ORD-9821', customer: 'Apex Security Systems', date: '2026-09-04', status: 'new', total: '₹14,250.00' },
    { id: 'ORD-9822', customer: 'Global Surveillance Corp', date: '2026-09-04', status: 'contacted', total: '₹8,900.00' },
    { id: 'ORD-9823', customer: 'Vanguard Electronics', date: '2026-09-03', status: 'in-progress', total: '₹22,100.00' },
    { id: 'ORD-9824', customer: 'Titan Security Ltd', date: '2026-09-02', status: 'closed', total: '₹5,400.00' },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-12 bg-[#fdf8f9] text-[#3d0a0d]">
      {/* Header Title */}
      <div className="border-b border-[#e5d1d4] pb-6 flex items-center justify-between">
        <div>
          <span className="px-3 py-1 text-xs font-semibold tracking-wider text-[#800020] bg-[#f4e7ea] border border-[#e5d1d4] rounded-full uppercase mb-3 inline-block">
            Internal Component Library
          </span>
          <h1 className="text-3xl font-extrabold text-[#3d0a0d] tracking-tight">Vinexus Shared Design System Showcase</h1>
          <p className="text-xs text-[#7c5c5f] mt-1">
            Phase 12 interactive component showcase & verification panel.
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="primary" icon={<Sparkles className="w-3 h-3" />}>Phase 12 Ready</Badge>
        </div>
      </div>

      {/* 1. BUTTONS */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-[#3d0a0d] border-b border-[#e5d1d4] pb-2">1. Buttons & Variants</h2>
        <div className="flex flex-wrap gap-4 items-center">
          <Button variant="primary">Primary Button</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button variant="success">Success</Button>
          <Button variant="primary" isLoading>Loading State</Button>
          <Button variant="primary" isDisabled>Disabled</Button>
          <Button variant="primary" leftIcon={<Mail className="w-4 h-4" />}>With Icon</Button>
          <Button variant="secondary" iconOnly title="Download"><Download className="w-4 h-4" /></Button>
        </div>
        <div className="flex gap-4 items-center pt-2">
          <Button size="sm">Small (sm)</Button>
          <Button size="md">Medium (md)</Button>
          <Button size="lg">Large (lg)</Button>
        </div>
      </section>

      {/* 2. FORM INPUTS */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-[#3d0a0d] border-b border-[#e5d1d4] pb-2">2. Form Inputs & Controls</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Input label="Standard Text Input" placeholder="Enter company name..." helperText="Used for business entity name" />
          <Input label="With Left Icon" leftIcon={<Phone className="w-4 h-4" />} placeholder="+91 98765 43210" />
          <Input label="Input Error State" error="This field is required by backend validation" placeholder="Invalid field..." />
          <PasswordInput label="Secure Password Input" placeholder="••••••••" />
          <SearchInput label="Search Input" value={searchValue} onChange={(e) => setSearchValue(e.target.value)} onClear={() => setSearchValue('')} />
          <Select
            label="Select Dropdown"
            options={[
              { value: 'dealer', label: 'Authorized Dealer' },
              { value: 'customer', label: 'B2B Wholesale Customer' },
              { value: 'admin', label: 'System Administrator' },
            ]}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          <Textarea label="Textarea Component" placeholder="Write wholesale enquiry instructions..." rows={3} />
          <OTPInput label="6-Digit Verification Code (OTPInput)" value={otpValue} onChange={setOtpValue} />
        </div>
      </section>

      {/* 3. CARDS & BADGES */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-[#3d0a0d] border-b border-[#e5d1d4] pb-2">3. Cards & Status Badges</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card hoverable>
            <CardHeader>
              <CardTitle>Metric Overview Card</CardTitle>
              <StatusBadge status="approved" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-extrabold text-[#3d0a0d]">₹148,920.00</p>
              <CardDescription>Total wholesale quarterly transactions</CardDescription>
            </CardContent>
            <CardFooter>
              <span className="text-xs text-emerald-700 font-semibold">+18.4% from last month</span>
              <Button size="sm" variant="ghost">View Report</Button>
            </CardFooter>
          </Card>

          <Card glow>
            <CardHeader>
              <CardTitle>Glow Highlight Card</CardTitle>
              <Badge variant="primary">Featured</Badge>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-[#7c5c5f]">
                Light burgundy glowing container designed for featured equipment, tier announcements, or critical system notices.
              </p>
            </CardContent>
          </Card>

          <div className="bg-white p-6 rounded-2xl border border-[#e5d1d4] space-y-4 shadow-sm">
            <h4 className="text-sm font-bold text-[#3d0a0d]">Status Badges Taxonomy</h4>
            <div className="flex flex-wrap gap-2">
              <StatusBadge status="new" />
              <StatusBadge status="contacted" />
              <StatusBadge status="in-progress" />
              <StatusBadge status="closed" />
              <StatusBadge status="spam" />
              <StatusBadge status="pending" />
              <StatusBadge status="approved" />
              <StatusBadge status="rejected" />
              <StatusBadge status="in-stock" />
              <StatusBadge status="out-of-stock" />
              <StatusBadge status="on-request" />
            </div>
          </div>
        </div>
      </section>

      {/* 4. MODALS, DIALOGS, DRAWERS & TOASTS */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-[#3d0a0d] border-b border-[#e5d1d4] pb-2">4. Overlays & Interactive Feedback</h2>
        <div className="flex flex-wrap gap-4">
          <Button variant="primary" onClick={() => setIsModalOpen(true)}>Open Modal</Button>
          <Button variant="danger" onClick={() => setIsConfirmOpen(true)}>Open Danger Confirmation</Button>
          <Button variant="secondary" onClick={() => setIsDrawerOpen(true)}>Open Right Drawer</Button>
          <Button variant="success" onClick={() => toast.success('Product added to dealer quote!')}>Trigger Success Toast</Button>
          <Button variant="danger" onClick={() => toast.error('Session conflict detected. Action required.')}>Trigger Error Toast</Button>
          <Button variant="outline" onClick={() => toast.info('System maintenance scheduled.')}>Trigger Info Toast</Button>
        </div>

        {/* Modal Demo */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Vinexus Modal Dialog"
          description="Reusable overlay component with backdrop blur and ESC listener"
          footer={
            <Button variant="secondary" size="sm" onClick={() => setIsModalOpen(false)}>
              Close Dialog
            </Button>
          }
        >
          <p className="text-xs text-[#7c5c5f] leading-relaxed">
            This modal supports custom headers, footers, body contents, click-outside dismissal, and keyboard accessibility.
          </p>
        </Modal>

        {/* ConfirmDialog Demo */}
        <ConfirmDialog
          isOpen={isConfirmOpen}
          onClose={() => setIsConfirmOpen(false)}
          onConfirm={() => {
            toast.error('Record deleted successfully');
            setIsConfirmOpen(false);
          }}
          title="Revoke Active Session?"
          description="This will instantly disconnect the user from all active terminals."
          confirmText="Yes, Revoke Session"
          isDanger
        />

        {/* Drawer Demo */}
        <Drawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          title="Slide-out Navigation Drawer"
          description="Supports left, right, top, and bottom positions"
          footer={
            <Button variant="primary" size="sm" onClick={() => setIsDrawerOpen(false)}>
              Done
            </Button>
          }
        >
          <p className="text-xs text-[#7c5c5f] leading-relaxed">
            Drawers are ideal for mobile filters, cart previews, and admin detailed sidebar panels.
          </p>
        </Drawer>
      </section>

      {/* 5. TABLE & PAGINATION */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-[#3d0a0d] border-b border-[#e5d1d4] pb-2">5. Data Table & Pagination</h2>
        <Table columns={columns} data={tableData} />
        <Pagination currentPage={currentPage} totalPages={5} onPageChange={setCurrentPage} />
      </section>

      {/* 6. LOADING, SKELETONS, EMPTY & ERROR STATES */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-[#3d0a0d] border-b border-[#e5d1d4] pb-2">6. Feedback & Placeholder States</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <LoadingState message="Fetching live wholesale inventory stream..." />
          <SkeletonCard />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          <EmptyState
            title="No Enquiries Submitted Yet"
            description="When customers send quotation enquiries, they will appear in this centralized inbox."
            actionLabel="Submit First Enquiry"
            onAction={() => toast.info('Navigating to enquiry submission...')}
          />
          <ErrorState
            title="Unable to Sync Catalog"
            description="The system could not fetch category metadata due to a connection timeout."
            onRetry={() => toast.success('Retrying connection...')}
          />
        </div>
      </section>

      {/* 7. IMAGE & FALLBACK */}
      <section className="space-y-4 pb-12">
        <h2 className="text-lg font-bold text-[#3d0a0d] border-b border-[#e5d1d4] pb-2">7. Image Component & Fallback Handling</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <span className="text-xs font-semibold text-[#7c5c5f] block mb-2">Valid Image</span>
            <Image
              src="https://images.unsplash.com/photo-1557597774-9d273605dfa9?auto=format&fit=crop&w=400&q=80"
              alt="Security Camera"
              aspectRatio="aspect-video"
            />
          </div>
          <div>
            <span className="text-xs font-semibold text-[#7c5c5f] block mb-2">Broken Image (Fallback UI)</span>
            <Image
              src="invalid-image-url-path.png"
              alt="Broken Image Demo"
              aspectRatio="aspect-video"
            />
          </div>
        </div>
      </section>
    </div>
  );
};

export default UiPreviewPage;
