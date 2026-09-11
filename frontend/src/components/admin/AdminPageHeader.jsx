import React from 'react';

const AdminPageHeader = ({ title, subtitle, action, badge }) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-xl md:text-2xl font-black text-foreground tracking-tight">{title}</h1>
          {badge && (
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-muted text-primary border border-border">
              {badge}
            </span>
          )}
        </div>
        {subtitle && <p className="text-xs text-muted-foreground mt-1 font-medium">{subtitle}</p>}
      </div>
      {action && <div className="flex items-center gap-3">{action}</div>}
    </div>
  );
};

export default AdminPageHeader;
