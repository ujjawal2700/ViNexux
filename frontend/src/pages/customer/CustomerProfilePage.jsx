import React from 'react';
import { Link } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { User, Mail, Phone, ShieldCheck, MapPin, Edit3, Calendar } from 'lucide-react';

export const CustomerProfilePage = () => {
  const { user } = useAuth();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8 bg-background text-foreground min-h-screen">
      {/* Header */}
      <div className="border-b border-border pb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-primary">Account Overview</span>
          <h1 className="text-3xl font-black text-foreground tracking-tight flex items-center gap-3">
            <User className="w-7 h-7 text-primary" />
            <span>Customer Profile</span>
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="primary" icon={<ShieldCheck className="w-3.5 h-3.5" />}>
            Verified Account
          </Badge>
          <Link to="/customer/profile/update">
            <Button variant="primary" size="sm" leftIcon={<Edit3 className="w-4 h-4" />}>
              Edit Profile
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Profile Info Card */}
      <Card className="bg-card p-6 rounded-2xl border border-border space-y-6 shadow-sm">
        <CardHeader className="p-0 pb-4 border-b border-border flex items-center justify-between">
          <CardTitle className="text-base font-bold text-foreground">Personal Information</CardTitle>
          <Link to="/customer/profile/update" className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
            <Edit3 className="w-3.5 h-3.5" /> Edit Details
          </Link>
        </CardHeader>

        <CardContent className="p-0 grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
          <div className="space-y-1.5 bg-muted/40 p-4 rounded-2xl border border-border">
            <span className="text-muted-foreground font-bold block flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-primary" /> Full Name
            </span>
            <span className="text-sm font-bold text-foreground block">
              {user?.fullName || user?.name || 'Customer Account'}
            </span>
          </div>

          <div className="space-y-1.5 bg-muted/40 p-4 rounded-2xl border border-border">
            <span className="text-muted-foreground font-bold block flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-primary" /> Email Address
            </span>
            <span className="text-sm font-mono font-medium text-foreground block">
              {user?.email || 'N/A'}
            </span>
          </div>

          <div className="space-y-1.5 bg-muted/40 p-4 rounded-2xl border border-border">
            <span className="text-muted-foreground font-bold block flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-primary" /> Mobile Number
            </span>
            <span className="text-sm font-mono font-medium text-foreground block">
              {user?.phone || user?.identifier || 'N/A'}
            </span>
          </div>

          <div className="space-y-1.5 bg-muted/40 p-4 rounded-2xl border border-border">
            <span className="text-muted-foreground font-bold block flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Account Role
            </span>
            <span className="text-sm font-extrabold text-foreground uppercase block">
              {user?.role || 'Customer'}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Address Details */}
      <Card className="bg-card p-6 rounded-2xl border border-border space-y-4 text-xs shadow-sm">
        <CardHeader className="p-0 pb-3 border-b border-border flex items-center justify-between">
          <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" /> Delivery Location
          </CardTitle>
          <Link to="/customer/profile/update" className="text-xs font-bold text-primary hover:underline">
            Update Address
          </Link>
        </CardHeader>

        <CardContent className="p-0 text-muted-foreground leading-relaxed bg-muted/40 p-4 rounded-2xl border border-border font-medium">
          {user?.address ? (
            typeof user.address === 'string' ? (
              user.address
            ) : (
              <div>
                <div>{user.address.line1}</div>
                {user.address.line2 && <div>{user.address.line2}</div>}
                <div>
                  {user.address.city}{user.address.state ? `, ${user.address.state}` : ''} {user.address.pincode}
                </div>
              </div>
            )
          ) : (
            <span className="text-muted-foreground/70 italic">No delivery location specified yet. Click Edit Profile to add your address.</span>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CustomerProfilePage;
