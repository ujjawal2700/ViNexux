import BentoBannerEditor from '../../components/admin/BentoBannerEditor';
import AdminPageHeader from '../../components/admin/AdminPageHeader';

export default function AdminCmsBannersPage() {
  return <div className="space-y-6">
    <AdminPageHeader title="Homepage Banners" subtitle="Manage the four independently rotating homepage banner sections" />
    <BentoBannerEditor />
  </div>;
}
