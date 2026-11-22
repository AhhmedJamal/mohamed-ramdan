'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '../../../components/AppLayout';
import ProtectedRoute from '../../../components/ProtectedRoute';
import api from '../../../services/api';
import { Receipt, Key, Users, AlertCircle, Plus, FileEdit, CheckCircle2, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function DataEntryDashboard() {
  const [metrics, setMetrics] = useState({
    my_draft_vouchers: 3,
    recent_tenants_count: 5,
    draft_contracts_count: 2,
    rejected_items_count: 1,
  });
  const [rejectedVouchers, setRejectedVouchers] = useState([
    {
      id: 99,
      voucher_number: 'RV-2026-004',
      type: 'receipt',
      amount: 12000,
      rejection_reason: 'المبلغ غير مطابق لعقد الإيجار المرفق، يرجى إعادة التأكد من قيمة القسط',
      updated_at: 'اليوم 09:30',
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);

  return (
    <ProtectedRoute allowedRoles={['data_entry']}>
      <AppLayout title="لوحة مدخل البيانات" subtitle="مركز إدخال العمليات التشغيلية والسندات ومتابعة المسودات">
      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">سنداتي قيد المسودة</p>
            <p className="text-2xl font-bold text-amber-600 mt-2">{metrics.my_draft_vouchers}</p>
            <p className="text-[11px] text-slate-500 mt-1">بانتظار الاعتماد المالي</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
            <Receipt className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">عقود قيد الإدخال</p>
            <p className="text-2xl font-bold text-slate-900 mt-2">{metrics.draft_contracts_count}</p>
            <p className="text-[11px] text-slate-500 mt-1">مسودات عقود إيجار</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
            <Key className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">المستأجرون المسجلون حديثاً</p>
            <p className="text-2xl font-bold text-emerald-600 mt-2">{metrics.recent_tenants_count}</p>
            <p className="text-[11px] text-emerald-600 font-semibold mt-1">خلال الشهر الحالي</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">ملاحظات ومستندات مرفوضة</p>
            <p className="text-2xl font-bold text-rose-600 mt-2">{metrics.rejected_items_count}</p>
            <p className="text-[11px] text-rose-600 font-semibold mt-1">تتطلب تعديلك وإعادة التقديم</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
            <AlertCircle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Quick Entry Action Hub */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mb-8">
        <h3 className="text-base font-bold text-slate-900 mb-1">مركز الإدخال السريع (Quick Actions)</h3>
        <p className="text-xs text-slate-500 mb-6">اختصارات مباشرة لبدء إدخال العمليات التشغيلية والعقود</p>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Link
            href="/vouchers"
            className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 hover:bg-amber-50 hover:border-amber-300 transition-all flex items-center gap-3 group"
          >
            <div className="w-10 h-10 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold shadow-sm">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 group-hover:text-amber-800">سند قبض جديد</p>
              <p className="text-[11px] text-slate-500">تحصيل إيجار أو دفعة</p>
            </div>
          </Link>

          <Link
            href="/vouchers"
            className="p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 transition-all flex items-center gap-3 group"
          >
            <div className="w-10 h-10 rounded-lg bg-slate-800 text-white flex items-center justify-center font-bold shadow-sm">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">سند صرف جديد</p>
              <p className="text-[11px] text-slate-500">مصروف تشغيلي أو صيانة</p>
            </div>
          </Link>

          <Link
            href="/contracts"
            className="p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 transition-all flex items-center gap-3 group"
          >
            <div className="w-10 h-10 rounded-lg bg-slate-800 text-white flex items-center justify-center font-bold shadow-sm">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">عقد إيجار جديد</p>
              <p className="text-[11px] text-slate-500">جدولة الأقساط للوحدة</p>
            </div>
          </Link>

          <Link
            href="/tenants"
            className="p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 transition-all flex items-center gap-3 group"
          >
            <div className="w-10 h-10 rounded-lg bg-slate-800 text-white flex items-center justify-center font-bold shadow-sm">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">تسجيل مستأجر</p>
              <p className="text-[11px] text-slate-500">فرد أو شركة</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Rejected Items Notice Section */}
      {rejectedVouchers.length > 0 && (
        <div className="bg-white rounded-2xl border border-rose-200 shadow-sm overflow-hidden mb-8">
          <div className="p-5 bg-rose-50/50 border-b border-rose-100 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-600" />
            <h4 className="font-bold text-sm text-rose-900">سندات مرفوضة تحتاج مراجعتك وتعديلك</h4>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {rejectedVouchers.map((item) => (
                <div key={item.id} className="p-4 rounded-xl border border-rose-200 bg-rose-50/20 flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-mono font-bold text-xs text-slate-900">{item.voucher_number}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-semibold">مرفوض</span>
                      <span className="text-xs text-slate-600 font-bold">{Number(item.amount).toLocaleString()} ر.س</span>
                    </div>
                    <p className="text-xs text-rose-700 font-medium mt-2 bg-white/80 p-2.5 rounded-lg border border-rose-100">
                      <strong>سبب الرفض من المحاسب:</strong> {item.rejection_reason}
                    </p>
                  </div>
                  <Link
                    href="/vouchers"
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all shadow-sm shrink-0 mr-4"
                  >
                    <FileEdit className="w-3.5 h-3.5" />
                    <span>تعديل السند</span>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  </ProtectedRoute>
  );
}

