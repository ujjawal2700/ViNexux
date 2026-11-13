import BentoBannerEditor from '../../components/admin/BentoBannerEditor';
import AdminPageHeader from '../../components/admin/AdminPageHeader';

export default function AdminCmsBannersPage() {
  return <div className="space-y-6">
    <AdminPageHeader title="Homepage Banners" subtitle="Manage the artwork, effects and rotation time for each homepage banner section" />
    <BentoBannerEditor />
  </div>;
}
