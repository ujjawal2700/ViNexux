import React from 'react';
import { Link } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { ShieldCheck, User, Mail, Phone, Calendar, Edit3, KeyRound, Lock } from 'lucide-react';

const AdminProfilePage = () => {
  const { user } = useAuth();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4" /> System Administrator Profile
          </div>
          <h1 className="text-2xl font-black text-foreground tracking-tight">Admin Settings & Profile</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage your administrative account details, security settings, and credentials.
          </p>
        </div>
        <Link
          to="/admin/profile/update"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-bold text-xs rounded-xl hover:bg-primary/90 transition-all shadow-md active:scale-95"
        >
          <Edit3 className="w-4 h-4" />
          Edit Profile & Credentials
        </Link>
      </div>

      {/* Profile Details Card */}
      <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-black text-2xl uppercase">
            {(user?.fullName || user?.name || user?.email || 'A').charAt(0)}
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">
              {user?.fullName || user?.name || 'Administrator'}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                Active System Admin
              </span>
              <span className="text-xs text-muted-foreground font-mono">
                ID: {user?.id || user?._id || 'N/A'}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border">
          <div className="p-4 rounded-xl bg-muted/40 border border-border/50 space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
              <User className="w-4 h-4 text-primary" /> Full Name
            </div>
            <p className="text-sm font-bold text-foreground">
              {user?.fullName || user?.name || 'Not provided'}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-muted/40 border border-border/50 space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
              <Mail className="w-4 h-4 text-primary" /> Email Address
            </div>
            <p className="text-sm font-bold text-foreground font-mono">
              {user?.email || 'Not provided'}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-muted/40 border border-border/50 space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
              <Phone className="w-4 h-4 text-primary" /> Mobile Phone
            </div>
            <p className="text-sm font-bold text-foreground font-mono">
              {user?.phone || user?.phoneNumber || 'Not provided'}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-muted/40 border border-border/50 space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
              <ShieldCheck className="w-4 h-4 text-primary" /> Security Role
            </div>
            <p className="text-sm font-bold text-foreground uppercase tracking-wide">
              {user?.role || 'ADMIN'}
            </p>
          </div>
        </div>

        {/* Security Summary */}
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 flex items-start gap-3 text-xs">
          <KeyRound className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <strong className="font-bold">Credential Security Notice:</strong>
            <p className="mt-0.5 text-muted-foreground">
              If you update your email address or password, you must use the updated email and password for all future sign-ins across the system.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminProfilePage;
