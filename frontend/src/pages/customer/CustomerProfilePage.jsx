import React from 'react';
import useAuth from '../../hooks/useAuth';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { User, Mail, Phone, ShieldCheck, MapPin, Calendar, Lock } from 'lucide-react';

export const CustomerProfilePage = () => {
  const { user } = useAuth();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8 bg-[#fdf8f9] text-[#3d0a0d] min-h-screen">
      {/* Header */}
      <div className="border-b border-[#e5d1d4] pb-6 flex items-center justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#800020]">Account Overview</span>
          <h1 className="text-3xl font-extrabold text-[#3d0a0d] tracking-tight flex items-center gap-3">
            <User className="w-7 h-7 text-[#800020]" />
            <span>Customer Profile</span>
          </h1>
        </div>

        <Badge variant="primary" icon={<ShieldCheck className="w-3.5 h-3.5" />}>
          Verified Account
        </Badge>
      </div>

      {/* Main Profile Info Card */}
      <Card className="bg-white p-6 rounded-2xl border border-[#e5d1d4] space-y-6 shadow-sm">
        <CardHeader className="p-0 pb-4 border-b border-[#e5d1d4] flex items-center justify-between">
          <CardTitle className="text-base font-bold text-[#3d0a0d]">Personal Information (Read-Only)</CardTitle>
          <Lock className="w-4 h-4 text-[#7c5c5f]" />
        </CardHeader>

        <CardContent className="p-0 grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
          <div className="space-y-1.5 bg-[#fdf8f9] p-4 rounded-xl border border-[#e5d1d4]">
            <span className="text-[#7c5c5f] font-bold block flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-[#800020]" /> Full Name
            </span>
            <span className="text-sm font-bold text-[#3d0a0d] block">
              {user?.fullName || user?.name || 'Vinexus Customer'}
            </span>
          </div>

          <div className="space-y-1.5 bg-[#fdf8f9] p-4 rounded-xl border border-[#e5d1d4]">
            <span className="text-[#7c5c5f] font-bold block flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-[#800020]" /> Email Address
            </span>
            <span className="text-sm font-mono font-medium text-[#3d0a0d] block">
              {user?.email || 'N/A'}
            </span>
          </div>

          <div className="space-y-1.5 bg-[#fdf8f9] p-4 rounded-xl border border-[#e5d1d4]">
            <span className="text-[#7c5c5f] font-bold block flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-[#800020]" /> Mobile Number
            </span>
            <span className="text-sm font-mono font-medium text-[#3d0a0d] block">
              {user?.phone || user?.identifier || 'N/A'}
            </span>
          </div>

          <div className="space-y-1.5 bg-[#fdf8f9] p-4 rounded-xl border border-[#e5d1d4]">
            <span className="text-[#7c5c5f] font-bold block flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" /> Account Role
            </span>
            <span className="text-sm font-bold text-[#3d0a0d] uppercase block">
              {user?.role || 'Customer'}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Address Details if Available */}
      {user?.address && (
        <Card className="bg-white p-6 rounded-2xl border border-[#e5d1d4] space-y-4 text-xs shadow-sm">
          <CardHeader className="p-0 pb-3 border-b border-[#e5d1d4]">
            <CardTitle className="text-base font-bold text-[#3d0a0d] flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#800020]" /> Default Delivery Location
            </CardTitle>
          </CardHeader>

          <CardContent className="p-0 text-[#664448] leading-relaxed bg-[#fdf8f9] p-4 rounded-xl border border-[#e5d1d4]">
            {typeof user.address === 'string' ? (
              user.address
            ) : (
              <div>
                <div>{user.address.line1}</div>
                {user.address.line2 && <div>{user.address.line2}</div>}
                <div>
                  {user.address.city}{user.address.state ? `, ${user.address.state}` : ''} {user.address.pincode}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CustomerProfilePage;
