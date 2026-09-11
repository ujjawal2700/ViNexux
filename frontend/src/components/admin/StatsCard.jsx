import React from 'react';
import Card from '../ui/Card';

const StatsCard = ({ title, value, subtext, icon: Icon, color = 'crimson', onClick }) => {
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
      className={`relative overflow-hidden transition-all duration-200 bg-card border-border shadow-xs ${
        onClick ? 'cursor-pointer hover:border-primary hover:shadow-md' : ''
      }`}
    >
      <div className="flex items-start justify-between p-4">
        <div>
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{title}</p>
          <h3 className="text-2xl font-black text-foreground mt-1 tracking-tight">
            {value !== undefined && value !== null ? value : '-'}
          </h3>
          {subtext && <p className="text-[11px] text-muted-foreground font-medium mt-1">{subtext}</p>}
        </div>
        {Icon && (
          <div className={`p-2.5 rounded-xl border ${badgeStyle}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
    </Card>
  );
};

export default StatsCard;
