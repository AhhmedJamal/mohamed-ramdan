import React from 'react';
import { CheckCircle2, AlertTriangle } from 'lucide-react';

/**
 * Live Balance Checker Bar for Journal Entries
 * Enforces UC-49: Delta = Total Debit - Total Credit = 0
 */
export default function BalanceBar({ totalDebit = 0, totalCredit = 0 }) {
  const deb = Number(totalDebit) || 0;
  const cred = Number(totalCredit) || 0;
  const diff = Math.abs(deb - cred);
  const isBalanced = diff < 0.005;

  return (
    <div
      className={`rounded-xl p-4 border transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
        isBalanced
          ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
          : 'bg-rose-50/80 border-rose-200 text-rose-900'
      }`}
    >
      <div className="flex items-center gap-3">
        {isBalanced ? (
          <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        ) : (
          <div className="w-9 h-9 rounded-full bg-rose-600 text-white flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
        )}
        <div>
          <p className="font-bold text-sm">
            {isBalanced ? 'القيد متوازن محاسبياً (شرط الترحيل محقق)' : 'القيد غير متوازن! لا يمكن ترحيل القيد'}
          </p>
          <p className="text-xs opacity-80 mt-0.5">
            {isBalanced
              ? 'إجمالي المدين يطابق إجمالي الدائن تماماً (Δ = 0.00 ر.س)'
              : `الفرق المطلوب معادلته: ${diff.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س`}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-6 font-mono text-sm shrink-0">
        <div className="text-left">
          <span className="text-[11px] font-sans font-medium text-slate-500 block">إجمالي المدين (Debit)</span>
          <span className="font-bold text-slate-800">
            {deb.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س
          </span>
        </div>
        <div className="h-8 w-px bg-slate-300" />
        <div className="text-left">
          <span className="text-[11px] font-sans font-medium text-slate-500 block">إجمالي الدائن (Credit)</span>
          <span className="font-bold text-slate-800">
            {cred.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س
          </span>
        </div>
      </div>
    </div>
  );
}
