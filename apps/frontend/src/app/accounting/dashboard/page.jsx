'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '../../../components/AppLayout';
import ProtectedRoute from '../../../components/ProtectedRoute';
import api from '../../../services/api';
import { BookOpen, Receipt, FileText, CheckCircle2, XCircle, ArrowUpRight, BarChart3, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

export default function AccountingDashboard() {
  const [metrics, setMetrics] = useState({
    pending_vouchers_count: 4,
    pending_invoices_count: 2,
    liquid_cash_balance: 485000,
    unposted_entries_count: 0,
    current_month_revenue: 125000,
    current_month_expense: 42000,
  });
  const [pendingVouchers, setPendingVouchers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Maker-Checker approval / rejection modal state
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedVoucherId, setSelectedVoucherId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchAccountingData = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/vouchers?status=draft').catch(() => ({ data: { data: [] } }));
      const drafts = res.data.data || [];
      setPendingVouchers(drafts);
      setMetrics((prev) => ({
        ...prev,
        pending_vouchers_count: drafts.length,
      }));
    } catch (err) {
      console.error('Failed to load accounting data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAccountingData();
  }, []);

  // Maker-Checker: Approve Voucher
  const handleApproveVoucher = async (voucherId) => {
    if (!window.confirm('هل أنت متأكد من اعتماد السند؟ سيتم ترحيل القيد المحاسبي المتوازن إلى دفتر الأستاذ العام فوراً.')) {
      return;
    }

    setActionLoading(true);
    try {
      await api.post(`/vouchers/${voucherId}/approve`);
      alert('تم اعتماد السند وترحيل القيد بنجاح');
      fetchAccountingData();
    } catch (err) {
      alert(err.response?.data?.message || 'حدث خطأ أثناء اعتماد السند');
    } finally {
      setActionLoading(false);
    }
  };

  // Maker-Checker: Reject Voucher (Requires >= 10 chars)
  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!rejectionReason || rejectionReason.trim().length < 10) {
      alert('سبب الرفض إلزامي ويجب ألا يقل عن 10 أحرف وفقاً لسياسة الاعتماد والمراجعة');
      return;
    }

    setActionLoading(true);
    try {
      await api.post(`/vouchers/${selectedVoucherId}/reject`, {
        rejection_reason: rejectionReason,
      });
      alert('تم رفض السند بنجاح');
      setRejectModalOpen(false);
      setRejectionReason('');
      setSelectedVoucherId(null);
      fetchAccountingData();
    } catch (err) {
      alert(err.response?.data?.message || 'فشل في رفض السند');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={['general_accountant']}>
      <AppLayout title="لوحة تحكم المحاسب العام" subtitle="الاعتمادات المالية والرقابة على القيود والقوائم المالية">
      {/* Top Financial KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">سندات بانتظار الاعتماد</p>
            <p className="text-2xl font-bold text-amber-600 mt-2">{metrics.pending_vouchers_count}</p>
            <p className="text-[11px] text-amber-700 font-semibold mt-1">Maker-Checker Queue</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
            <Receipt className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">فواتير مقاولين للمراجعة</p>
            <p className="text-2xl font-bold text-slate-900 mt-2">{metrics.pending_invoices_count}</p>
            <p className="text-[11px] text-slate-500 mt-1">مستخلصات جارية</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
            <FileText className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">السيولة النقدية والبنكية</p>
            <p className="text-2xl font-bold text-emerald-600 mt-2">
              {Number(metrics.liquid_cash_balance).toLocaleString()} ر.س
            </p>
            <p className="text-[11px] text-emerald-600 font-semibold mt-1">أرصدة الخزينة والحسابات</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">صافي الدخل التشغيلي (الشهر)</p>
            <p className="text-2xl font-bold text-slate-900 mt-2">
              {Number(metrics.current_month_revenue - metrics.current_month_expense).toLocaleString()} ر.س
            </p>
            <p className="text-[11px] text-emerald-600 font-semibold mt-1">الإيرادات - المصروفات</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
            <BarChart3 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Maker-Checker Approval Queue */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-8">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">سندات الصرف والقبض المعلقة (Maker-Checker Queue)</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              مراجعة وتدقيق السندات المدخلة - الاعتماد يرحل القيد المتوازن آلياً إلى دفتر الأستاذ العام
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-6">رقم السند</th>
                <th className="py-3 px-6">النوع</th>
                <th className="py-3 px-6">المبلغ (ر.س)</th>
                <th className="py-3 px-6">الطرف المقابل</th>
                <th className="py-3 px-6">البيان / الوصف</th>
                <th className="py-3 px-6 text-center">إجراء الاعتماد / الرفض</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pendingVouchers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-400">
                    لا توجد سندات معلقة تنتظر الاعتماد حالياً
                  </td>
                </tr>
              ) : (
                pendingVouchers.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-4 px-6 font-mono font-semibold text-slate-800">{v.voucher_number}</td>
                    <td className="py-4 px-6">
                      <span
                        className={`inline-block px-2 py-0.5 rounded font-semibold text-[11px] ${
                          v.type === 'receipt' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {v.type === 'receipt' ? 'سند قبض' : 'سند صرف'}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-mono font-bold text-slate-900">
                      {Number(v.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-4 px-6 text-slate-700">{v.party_name || '—'}</td>
                    <td className="py-4 px-6 text-slate-600 truncate max-w-xs">{v.description || '—'}</td>
                    <td className="py-4 px-6 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleApproveVoucher(v.id)}
                          disabled={actionLoading}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold flex items-center gap-1 shadow-sm transition-all"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>اعتماد وترحيل</span>
                        </button>
                        <button
                          onClick={() => {
                            setSelectedVoucherId(v.id);
                            setRejectModalOpen(true);
                          }}
                          disabled={actionLoading}
                          className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg font-semibold flex items-center gap-1 transition-all"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>رفض</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Accounting Navigation Portals */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Link
          href="/accounting/chart-of-accounts"
          className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm hover:border-slate-300 transition-all flex items-center justify-between"
        >
          <div>
            <h4 className="font-bold text-sm text-slate-900 mb-1">دليل الحسابات (COA)</h4>
            <p className="text-xs text-slate-500">الأصول، الخصوم، الإيرادات والمصروفات</p>
          </div>
          <BookOpen className="w-5 h-5 text-amber-600" />
        </Link>

        <Link
          href="/accounting/journal-entries"
          className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm hover:border-slate-300 transition-all flex items-center justify-between"
        >
          <div>
            <h4 className="font-bold text-sm text-slate-900 mb-1">القيود اليومية المتوازنة</h4>
            <p className="text-xs text-slate-500">إنشاء القيود ومراجعة اليومية العامة</p>
          </div>
          <FileText className="w-5 h-5 text-slate-700" />
        </Link>

        <Link
          href="/reports"
          className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm hover:border-slate-300 transition-all flex items-center justify-between"
        >
          <div>
            <h4 className="font-bold text-sm text-slate-900 mb-1">القوائم والتقارير المالية</h4>
            <p className="text-xs text-slate-500">ميزان المراجعة، الأستاذ، المركز المالي والأرباح</p>
          </div>
          <BarChart3 className="w-5 h-5 text-emerald-600" />
        </Link>

        <Link
          href="/accounting/fiscal-years"
          className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm hover:border-slate-300 transition-all flex items-center justify-between"
        >
          <div>
            <h4 className="font-bold text-sm text-slate-900 mb-1">إقفال السنة المالية</h4>
            <p className="text-xs text-slate-500">تدوير الأرباح المبقاة وقفل الفترات</p>
          </div>
          <ShieldCheck className="w-5 h-5 text-rose-600" />
        </Link>
      </div>

      {/* Mandatory Rejection Reason Modal (min 10 chars) */}
      {rejectModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h4 className="font-bold text-base text-slate-900 mb-2">رفض السند المالي</h4>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              وفقاً لسياسة الرقابة المالية، يجب ذكر سبب واضح وتفصيلي للرفض لا يقل عن 10 أحرف ليتم إشعار مدخل البيانات به.
            </p>

            <form onSubmit={handleRejectSubmit}>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="اكتب سبب الرفض هنا بالتفصيل (10 أحرف كحد أدنى)..."
                rows="4"
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-rose-500 mb-2 text-slate-900"
                required
              />
              <div className="flex justify-between items-center text-[11px] mb-4">
                <span className={rejectionReason.length < 10 ? 'text-rose-600 font-semibold' : 'text-emerald-600'}>
                  عدد الأحرف: {rejectionReason.length} / 10
                </span>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setRejectModalOpen(false);
                    setRejectionReason('');
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={rejectionReason.length < 10 || actionLoading}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all disabled:opacity-40"
                >
                  تأكيد الرفض
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  </ProtectedRoute>
  );
}

