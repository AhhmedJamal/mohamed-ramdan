import React from 'react';

/**
 * Standardized Entity Status Badge for Ehkam ERP
 * Supports: draft, approved, posted, rejected, active, overdue, expired, cancelled, vacant, occupied, under_maintenance, frozen
 */
const STATUS_CONFIG = {
  // Accounting & Vouchers
  draft: { label: 'مسودة', bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300' },
  pending: { label: 'قيد المراجعة', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  approved: { label: 'معتمد', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  posted: { label: 'مرحّل', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  rejected: { label: 'مرفوض', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },

  // General & Company Statuses
  active: { label: 'نشط', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  frozen: { label: 'مجمد', bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-300' },
  inactive: { label: 'غير نشط', bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-300' },

  // Contracts & Installments
  paid: { label: 'مدفوع', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  overdue: { label: 'متأخر', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  expired: { label: 'منتهي', bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300' },
  cancelled: { label: 'ملغي', bg: 'bg-gray-100', text: 'text-gray-500', border: 'border-gray-300' },

  // Real Estate Units
  vacant: { label: 'شاغرة', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  occupied: { label: 'مشغولة', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  under_maintenance: { label: 'تحت الصيانة', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },

  // Nature
  debit: { label: 'مدين', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  credit: { label: 'دائن', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
};

export default function Badge({ status, label, size = 'sm', className = '' }) {
  const config = STATUS_CONFIG[status] || {
    label: label || status,
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-200',
  };

  const displayLabel = label || config.label;
  const sizeClasses = size === 'xs' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1 font-semibold rounded-full border ${config.bg} ${config.text} ${config.border} ${sizeClasses} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      {displayLabel}
    </span>
  );
}
