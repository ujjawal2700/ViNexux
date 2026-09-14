import React from 'react';
import Card from '../ui/Card';
import { AlertCircle } from 'lucide-react';

const StatsCard = ({ title, value, subtext, icon: Icon, color = 'crimson', onClick, attention = false }) => {
  const colorMap = {
    crimson: 'bg-muted text-primary border-border',
    blue: 'bg-blue-50 text-blue-800 border-blue-200',
    amber: 'bg-amber-50 text-amber-800 border-amber-200',
    emerald: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    purple: 'bg-purple-50 text-purple-800 border-purple-200',
  };

  const badgeStyle = colorMap[color] || colorMap.crimson;

  return (
    <Card
      onClick={onClick}
      className={`relative overflow-hidden transition-all duration-200 bg-card shadow-xs ${
        attention ? 'border-rose-400 dark:border-rose-500 ring-1 ring-rose-400/40' : 'border-border'
      } ${onClick ? 'cursor-pointer hover:border-primary hover:shadow-md' : ''}`}
    >
      {attention && (
        <span className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-600 text-white text-[9px] font-bold uppercase tracking-wide shadow-sm animate-pulse">
          <AlertCircle className="w-2.5 h-2.5" />
          Action Required
        </span>
      )}
      <div className="flex items-start justify-between p-4">
        <div>
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{title}</p>
          <h3 className="text-2xl font-black text-foreground mt-1 tracking-tight">
            {value !== undefined && value !== null ? value : '-'}
          </h3>
          {subtext && <p className="text-[11px] text-muted-foreground font-medium mt-1">{subtext}</p>}
        </div>
        {Icon && (
          <div className={`p-2.5 rounded-xl border ${attention ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/30' : badgeStyle}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
    </Card>
  );
};

export default StatsCard;
