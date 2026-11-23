import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendLabel,
  color = 'amber',
  onClick,
}) {
  const colorMap = {
    amber: {
      border: 'border-amber-500/20',
      bgIcon: 'bg-amber-500/10 text-amber-600',
      accent: 'text-amber-600',
    },
    emerald: {
      border: 'border-emerald-500/20',
      bgIcon: 'bg-emerald-500/10 text-emerald-600',
      accent: 'text-emerald-600',
    },
    blue: {
      border: 'border-blue-500/20',
      bgIcon: 'bg-blue-500/10 text-blue-600',
      accent: 'text-blue-600',
    },
    rose: {
      border: 'border-rose-500/20',
      bgIcon: 'bg-rose-500/10 text-rose-600',
      accent: 'text-rose-600',
    },
    indigo: {
      border: 'border-indigo-500/20',
      bgIcon: 'bg-indigo-500/10 text-indigo-600',
      accent: 'text-indigo-600',
    },
    slate: {
      border: 'border-slate-200',
      bgIcon: 'bg-slate-100 text-slate-600',
      accent: 'text-slate-700',
    },
  };

  const scheme = colorMap[color] || colorMap.slate;

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl p-6 border ${scheme.border} shadow-sm hover:shadow-md transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:-translate-y-0.5' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-slate-500">{title}</span>
        {Icon && (
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${scheme.bgIcon}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-2">
        <h3 className="text-2xl font-bold text-slate-900 tracking-tight">{value}</h3>
      </div>

      {(subtitle || trend !== undefined) && (
        <div className="mt-3 flex items-center gap-2 text-xs">
          {trend !== undefined && (
            <span
              className={`flex items-center gap-0.5 font-semibold ${
                trend >= 0 ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {trend >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              {Math.abs(trend)}%
            </span>
          )}
          {trendLabel && <span className="text-slate-400">{trendLabel}</span>}
          {subtitle && !trendLabel && <span className="text-slate-400">{subtitle}</span>}
        </div>
      )}
    </div>
  );
}
