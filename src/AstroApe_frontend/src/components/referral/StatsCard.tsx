import React from 'react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  colorClass?: string;
  subtitle?: string;
}

export const StatsCard: React.FC<StatsCardProps> = ({ 
  title, 
  value, 
  icon, 
  colorClass = 'text-color-1',
  subtitle 
}) => {
  return (
    <div className="bg-n-7 border border-n-6 rounded-2xl p-6 hover:border-color-1 transition-all">
      <div className="flex items-start justify-between mb-4">
        <h3 className="caption text-n-3 uppercase tracking-wider">{title}</h3>
        {icon && (
          <div className="p-2 bg-n-6 rounded-lg">
            {icon}
          </div>
        )}
      </div>
      <p className={`text-4xl font-bold ${colorClass} mb-2 font-code`}>
        {value}
      </p>
      {subtitle && (
        <p className="caption text-n-4">{subtitle}</p>
      )}
    </div>
  );
};