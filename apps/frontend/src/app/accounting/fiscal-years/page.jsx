'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '../../../components/AppLayout';
import ProtectedRoute from '../../../components/ProtectedRoute';
import api from '../../../services/api';
import {
  Settings, Plus, Calendar, Lock, Unlock, CheckCircle,
  XCircle, AlertTriangle, RefreshCw, Layers, TrendingUp, TrendingDown, ShieldCheck
} from 'lucide-react';

export default function FiscalYearsPage() {
  const [fiscalYears, setFiscalYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closingSummary, setClosingSummary] = useState(null);
  const [closingLoading, setClosingLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [formError, setFormError] = useState(null);

  const [formData, setFormData] = useState({
    name: `السنة المالية ${new Date().getFullYear()}`,
    start_date: `${new Date().getFullYear()}-01-01`,
    end_date: `${new Date().getFullYear()}-12-31`,
  });

  const fetchYears = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/fiscal-years');
      const data = res.data.fiscal_years || [];
      setFiscalYears(data);
      if (data.length > 0 && !selectedYear) {
        setSelectedYear(data[0]);
      } else if (selectedYear) {
        const updated = data.find((y) => y.id === selectedYear.id);
        if (updated) setSelectedYear(updated);
      }
    } catch (err) {
      console.error('Failed to load fiscal years', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchYears();
  }, []);

  const handleCreateYear = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setFormError(null);

    try {
      const res = await api.post('/fiscal-years', formData);
      setShowAddModal(false);
      await fetchYears();
      if (res.data.fiscal_year) {
        setSelectedYear(res.data.fiscal_year);
      }
    } catch (err) {
      setFormError(err.response?.data?.message || 'حدث خطأ أثناء إنشاء السنة المالية');
    } finally {
      setActionLoading(false);
    }
  };

  const handleTogglePeriod = async (yearId, periodId) => {
    try {
      await api.post(`/fiscal-years/${yearId}/periods/${periodId}/toggle`);
      fetchYears();
    } catch (err) {
      alert(err.response?.data?.message || 'حدث خطأ أثناء تغيير حالة الفترة المالية');
    }
  };

  const openCloseWizard = async (year) => {
    setSelectedYear(year);
    setShowCloseModal(true);
    setClosingLoading(true);
    setClosingSummary(null);

    try {
      const res = await api.get(`/fiscal-years/${year.id}/closing-summary`);
      setClosingSummary(res.data.summary);
    } catch (err) {
      alert(err.response?.data?.message || 'تعذر جلب الملخص المالي للإقفال');
    } finally {
      setClosingLoading(false);
    }
  };

  const handleExecuteClosing = async () => {
    if (!selectedYear) return;
    if (!window.confirm(`هل أنت متأكد من تنفيذ الإقفال النهائي للسنة المالية "${selectedYear.name}"؟ سيتم ترحيل الأرباح/الخسائر وتوليد قيد الإقفال وقفل جميع الفترات نهائياً.`)) return;

    setActionLoading(true);
    try {
      await api.post(`/fiscal-years/${selectedYear.id}/close`);
      setShowCloseModal(false);
      fetchYears();
    } catch (err) {
      alert(err.response?.data?.message || 'حدث خطأ أثناء إقفال السنة المالية، يرجى التأكد من عدم وجود قيود مسودة');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={['general_accountant', 'branch_manager']}>
      <AppLayout
        title="إدارة السنوات والفترات المالية (Fiscal Years & Periods)"
        subtitle="إنشاء السنوات المالية، توليد الفترات الشهرية الـ 12 تلقائياً، قفل/فتح الفترات، وإجراء الإقفال السنوي النهائي (UC-24 & UC-61)"
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Fiscal Years List Column */}
          <div className="lg:col-span-1 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-600" />
                <span>السنوات المالية ({fiscalYears.length})</span>
              </h3>
              <button
                onClick={() => {
                  setFormError(null);
                  setShowAddModal(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>سنة مالية جديدة</span>
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100 max-h-[calc(100vh-280px)] overflow-y-auto">
              {isLoading ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-500" />
                  جاري تحميل السنوات...
                </div>
              ) : fiscalYears.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  لا توجد سنوات مالية مسجلة
                </div>
              ) : (
                fiscalYears.map((fy) => (
                  <div
                    key={fy.id}
                    onClick={() => setSelectedYear(fy)}
                    className={`p-4 cursor-pointer transition-all ${
                      selectedYear?.id === fy.id
                        ? 'bg-amber-50/70 border-r-4 border-amber-600'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-xs text-slate-900">{fy.name}</h4>
                        <p className="text-[11px] text-slate-500 font-mono mt-1">
                          {fy.start_date} إلى {fy.end_date}
                        </p>
                      </div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                        fy.status === 'open'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}>
                        {fy.status === 'open' ? 'مفتوحة' : 'مغلقة نهائياً'}
                      </span>
                    </div>

                    <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100/80 pt-2">
                      <span>الفترات المفتوحة: {fy.open_periods_count ?? 12}</span>
                      <span>الفترات المقفلة: {fy.closed_periods_count ?? 0}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Periods Breakdown & Year Actions Column */}
          <div className="lg:col-span-2 space-y-4">
            {selectedYear ? (
              <>
                {/* Header Banner */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-base text-slate-900">{selectedYear.name}</h3>
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                        selectedYear.status === 'open'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}>
                        {selectedYear.status === 'open' ? 'سنة مالية نشطة ومفتوحة' : 'سنة مالية مقفلة نهائياً'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-mono mt-1">
                      النطاق الزمني: {selectedYear.start_date} حتى {selectedYear.end_date}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {selectedYear.status === 'open' && (
                      <button
                        onClick={() => openCloseWizard(selectedYear)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow transition-colors"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        <span>معالج الإقفال السنوي النهائي (UC-61)</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* 12 Periods Grid */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                    <h4 className="font-bold text-xs text-slate-900 flex items-center gap-2">
                      <Layers className="w-4 h-4 text-amber-600" />
                      <span>الفترات المالية الشهرية الـ 12 وقفل الترحيل (Period Lock)</span>
                    </h4>
                    <span className="text-[11px] text-slate-500">
                      قفل الفترة يمنع إنشاء أو تعديل أي قيد أو سند مالي بتاريخها
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                        <tr>
                          <th className="py-3 px-4">رقم الفترة</th>
                          <th className="py-3 px-4">اسم الفترة</th>
                          <th className="py-3 px-4">تاريخ البداية</th>
                          <th className="py-3 px-4">تاريخ النهاية</th>
                          <th className="py-3 px-4">حالة الفترة</th>
                          <th className="py-3 px-4 text-center">إجراء القفل / الفتح</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {(selectedYear.periods || []).map((period) => (
                          <tr key={period.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-4 font-mono font-bold text-slate-900">
                              شهر {period.period_number}
                            </td>
                            <td className="py-3 px-4 font-semibold text-slate-800">
                              {period.name || `فترة شهر ${period.period_number}`}
                            </td>
                            <td className="py-3 px-4 font-mono text-slate-600">{period.start_date}</td>
                            <td className="py-3 px-4 font-mono text-slate-600">{period.end_date}</td>
                            <td className="py-3 px-4">
                              {period.status === 'open' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <Unlock className="w-3 h-3" />
                                  مفتوحة للترحيل
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200">
                                  <Lock className="w-3 h-3" />
                                  مقفلة (ممنوع الترحيل)
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center">
                              {selectedYear.status === 'open' && (
                                <button
                                  onClick={() => handleTogglePeriod(selectedYear.id, period.id)}
                                  className={`px-3 py-1 rounded-lg border text-[11px] font-semibold transition-colors ${
                                    period.status === 'open'
                                      ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
                                      : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
                                  }`}
                                >
                                  {period.status === 'open' ? 'قفل الفترة' : 'إعادة فتح'}
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-white p-12 rounded-2xl border border-slate-200 shadow-sm text-center text-slate-400">
                <Calendar className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                <p className="font-semibold text-sm text-slate-600">اختر سنة مالية من القائمة الجانبية</p>
              </div>
            )}
          </div>
        </div>

        {/* Add Year Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-md overflow-hidden">
              <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-amber-500" />
                  <span>إنشاء سنة مالية جديدة (UC-24)</span>
                </h3>
                <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">✕</button>
              </div>

              <form onSubmit={handleCreateYear} className="p-6 space-y-4 text-xs">
                {formError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
                    <span>{formError}</span>
                  </div>
                )}

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">اسم السنة المالية *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="السنة المالية 2026"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:bg-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">تاريخ البداية *</label>
                    <input
                      type="date"
                      required
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-amber-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">تاريخ النهاية *</label>
                    <input
                      type="date"
                      required
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-amber-500 focus:bg-white"
                    />
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200/60 leading-relaxed">
                  ملاحظة: سيقوم النظام تلقائياً بتوليد 12 فترة مالية شهرية تابعة لهذه السنة مع فتحها لعمليات الترحيل المحاسبي.
                </p>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl shadow disabled:opacity-50"
                  >
                    {actionLoading ? 'جاري الإنشاء...' : 'حفظ وإنشاء الفترات'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Closing Wizard Modal */}
        {showCloseModal && selectedYear && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-lg overflow-hidden">
              <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-amber-500" />
                  <span>معالج الإقفال المالي السنوي ({selectedYear.name})</span>
                </h3>
                <button onClick={() => setShowCloseModal(false)} className="text-slate-400 hover:text-white">✕</button>
              </div>

              <div className="p-6 text-xs space-y-4">
                {closingLoading ? (
                  <div className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-500" />
                    جاري احتساب أرصدة الإيرادات والمصروفات والتحقق من قيود المسودة...
                  </div>
                ) : closingSummary ? (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                        <span className="text-slate-500 text-[11px]">إجمالي الإيرادات المرحّلة</span>
                        <p className="text-base font-bold text-slate-900 font-mono mt-1">
                          {Number(closingSummary.total_revenue || 0).toLocaleString()} ر.س
                        </p>
                      </div>

                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                        <span className="text-slate-500 text-[11px]">إجمالي المصروفات المرحّلة</span>
                        <p className="text-base font-bold text-slate-900 font-mono mt-1">
                          {Number(closingSummary.total_expenses || 0).toLocaleString()} ر.س
                        </p>
                      </div>

                      <div className={`col-span-2 p-4 rounded-xl border flex items-center justify-between ${
                        closingSummary.is_profit
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          : 'bg-red-50 border-red-200 text-red-800'
                      }`}>
                        <div>
                          <span className="text-xs font-semibold">
                            {closingSummary.is_profit ? 'صافي أرباح السنة المالية' : 'صافي خسائر السنة المالية'}
                          </span>
                          <p className="text-xl font-bold font-mono mt-0.5">
                            {Number(closingSummary.net_profit || 0).toLocaleString()} ر.س
                          </p>
                        </div>
                        {closingSummary.is_profit ? (
                          <TrendingUp className="w-8 h-8 text-emerald-600" />
                        ) : (
                          <TrendingDown className="w-8 h-8 text-red-600" />
                        )}
                      </div>
                    </div>

                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 leading-relaxed text-[11px]">
                      عند تأكيد الإقفال، سيتم تلقائياً:
                      <ul className="list-disc list-inside mt-1 space-y-0.5">
                        <li>توليد قيد إقفال الأرباح والخسائر إلى حساب الأرباح المبقاة (Retained Earnings).</li>
                        <li>قفل جميع الفترات المالية الـ 12 نهائياً ومنع إضافة أي قيود أو سندات جديدة.</li>
                        <li>تغيير حالة السنة المالية إلى "مغلقة".</li>
                      </ul>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                      <button
                        onClick={() => setShowCloseModal(false)}
                        className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50"
                      >
                        إلغاء
                      </button>
                      <button
                        onClick={handleExecuteClosing}
                        disabled={actionLoading}
                        className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl shadow disabled:opacity-50"
                      >
                        {actionLoading ? 'جاري الإقفال...' : 'تأكيد الإقفال المالي النهائي'}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-center text-slate-500 py-6">
                    تعذر عرض ملخص الإقفال
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </AppLayout>
    </ProtectedRoute>
  );
}

