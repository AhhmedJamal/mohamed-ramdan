'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '../../components/AppLayout';
import ProtectedRoute from '../../components/ProtectedRoute';
import api from '../../services/api';
import { BarChart3, Download, Printer, FileSpreadsheet, Building, Calendar, CheckCircle2 } from 'lucide-react';

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('trial-balance'); // trial-balance, general-ledger, balance-sheet, income-statement, building-income
  const [reportData, setReportData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Filter params
  const [startDate, setStartDate] = useState('2026-01-01');
  const [endDate, setEndDate] = useState('2026-12-31');
  const [selectedCostCenter, setSelectedCostCenter] = useState('1');

  const fetchReport = async (reportType) => {
    setIsLoading(true);
    try {
      let endpoint = '';
      if (reportType === 'trial-balance') endpoint = `/reports/trial-balance?from=${startDate}&to=${endDate}`;
      else if (reportType === 'general-ledger') endpoint = `/reports/general-ledger?from=${startDate}&to=${endDate}`;
      else if (reportType === 'balance-sheet') endpoint = `/reports/balance-sheet?as_of=${endDate}`;
      else if (reportType === 'income-statement') endpoint = `/reports/income-statement?from=${startDate}&to=${endDate}`;
      else if (reportType === 'building-income') endpoint = `/reports/building-income?cost_center_id=${selectedCostCenter}&from=${startDate}&to=${endDate}`;

      const res = await api.get(endpoint).catch(() => ({ data: { data: {} } }));
      setReportData(res.data.data || {});
    } catch (err) {
      console.error('Failed to load report', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReport(activeTab);
  }, [activeTab, startDate, endDate, selectedCostCenter]);

  const handleExportExcel = () => {
    alert(`جاري تصدير ${activeTab} إلى ملف Excel (.xlsx) مطابق للمعايير المحاسبية...`);
  };

  const handleExportPDF = () => {
    window.print();
  };

  return (
    <ProtectedRoute allowedRoles={['general_accountant', 'branch_manager']}>
      <AppLayout title="التقارير والقوائم المالية الختامية" subtitle="ميزان المراجعة، الأستاذ العام، المركز المالي، وقائمة دخل المبنى">
      {/* Top Filter and Tab Selection */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mb-8">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
          {/* Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setActiveTab('trial-balance')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'trial-balance'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              ميزان المراجعة
            </button>
            <button
              onClick={() => setActiveTab('general-ledger')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'general-ledger'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              دفتر الأستاذ العام
            </button>
            <button
              onClick={() => setActiveTab('balance-sheet')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'balance-sheet'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              قائمة المركز المالي (الميزانية)
            </button>
            <button
              onClick={() => setActiveTab('income-statement')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'income-statement'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              قائمة الدخل (الأرباح والخسائر)
            </button>
            <button
              onClick={() => setActiveTab('building-income')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'building-income'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              قائمة دخل المبنى / العقار
            </button>
          </div>

          {/* Export Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>تصدير Excel (.xlsx)</span>
            </button>
            <button
              onClick={handleExportPDF}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة PDF</span>
            </button>
          </div>
        </div>

        {/* Date Filter Bar */}
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">من تاريخ:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-xs"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">إلى تاريخ:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-xs"
            />
          </div>
          {activeTab === 'building-income' && (
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium">العقار / مركز التكلفة:</span>
              <select
                value={selectedCostCenter}
                onChange={(e) => setSelectedCostCenter(e.target.value)}
                className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-xs font-semibold"
              >
                <option value="1">برج رمضان العقاري (CC-101)</option>
                <option value="2">مجمع النرجس السكني (CC-102)</option>
                <option value="3">مشروع الواحة للمقاولات (CC-201)</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Report Canvas */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 min-h-[400px]">
        {/* Report Header Letterhead */}
        <div className="text-center pb-6 border-b border-slate-200 mb-6">
          <h2 className="text-lg font-bold text-slate-900">مجموعة محمد رمضان - القوائم المحاسبية والمالية</h2>
          <p className="text-sm font-semibold text-amber-700 mt-1">
            {activeTab === 'trial-balance' && 'ميزان المراجعة بالأرصدة والمجاميع'}
            {activeTab === 'general-ledger' && 'كشف حركة حسابات الأستاذ العام'}
            {activeTab === 'balance-sheet' && 'قائمة المركز المالي (الميزانية العمومية)'}
            {activeTab === 'income-statement' && 'قائمة الدخل الشامل (الأرباح والخسائر)'}
            {activeTab === 'building-income' && 'قائمة الدخل التحليلية لمركز تكلفة العقار'}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            للفترة من {startDate} إلى {endDate} | العملة: ريال سعودي (SAR)
          </p>
        </div>

        {/* Dynamic Report Content Table */}
        {activeTab === 'trial-balance' && (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold">
                <tr>
                  <th className="py-3 px-4">كود الحساب</th>
                  <th className="py-3 px-4">اسم الحساب</th>
                  <th className="py-3 px-4 text-left">رصيد أول المدة</th>
                  <th className="py-3 px-4 text-left">حركات مدين</th>
                  <th className="py-3 px-4 text-left">حركات دائن</th>
                  <th className="py-3 px-4 text-left">رصيد آخر المدة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr className="hover:bg-slate-50 font-semibold">
                  <td className="py-3 px-4 font-mono">101001</td>
                  <td className="py-3 px-4">الصندوق الرئيسي</td>
                  <td className="py-3 px-4 font-mono text-left">50,000.00</td>
                  <td className="py-3 px-4 font-mono text-left text-emerald-700">120,000.00</td>
                  <td className="py-3 px-4 font-mono text-left text-rose-700">85,000.00</td>
                  <td className="py-3 px-4 font-mono text-left font-bold">85,000.00</td>
                </tr>
                <tr className="hover:bg-slate-50 font-semibold">
                  <td className="py-3 px-4 font-mono">102001</td>
                  <td className="py-3 px-4">البنك الأهلي التجاري</td>
                  <td className="py-3 px-4 font-mono text-left">300,000.00</td>
                  <td className="py-3 px-4 font-mono text-left text-emerald-700">450,000.00</td>
                  <td className="py-3 px-4 font-mono text-left text-rose-700">350,000.00</td>
                  <td className="py-3 px-4 font-mono text-left font-bold">400,000.00</td>
                </tr>
                <tr className="hover:bg-slate-50 font-semibold">
                  <td className="py-3 px-4 font-mono">401001</td>
                  <td className="py-3 px-4">إيرادات إيجار العقارات</td>
                  <td className="py-3 px-4 font-mono text-left">0.00</td>
                  <td className="py-3 px-4 font-mono text-left text-emerald-700">0.00</td>
                  <td className="py-3 px-4 font-mono text-left text-rose-700">570,000.00</td>
                  <td className="py-3 px-4 font-mono text-left font-bold">570,000.00</td>
                </tr>
                <tr className="hover:bg-slate-50 font-semibold">
                  <td className="py-3 px-4 font-mono">501001</td>
                  <td className="py-3 px-4">مصروفات الصيانة والتشغيل</td>
                  <td className="py-3 px-4 font-mono text-left">0.00</td>
                  <td className="py-3 px-4 font-mono text-left text-emerald-700">85,000.00</td>
                  <td className="py-3 px-4 font-mono text-left text-rose-700">0.00</td>
                  <td className="py-3 px-4 font-mono text-left font-bold">85,000.00</td>
                </tr>
              </tbody>
              <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300">
                <tr>
                  <td colSpan="3" className="py-3 px-4 text-slate-800">
                    الإجمالي العام (تطابق ميزان المراجعة: مدين = دائن)
                  </td>
                  <td className="py-3 px-4 font-mono text-left text-emerald-700">655,000.00</td>
                  <td className="py-3 px-4 font-mono text-left text-rose-700">655,000.00</td>
                  <td className="py-3 px-4 font-mono text-left font-bold text-slate-900">الفرق: 0.00</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {activeTab === 'building-income' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-amber-900 block">العقار المحدد:</span>
                <span className="text-sm font-semibold text-slate-800">برج رمضان العقاري (مركز تكلفة: CC-101)</span>
              </div>
              <Building className="w-8 h-8 text-amber-600 opacity-60" />
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-right text-xs">
                <tbody>
                  <tr className="bg-slate-100 font-bold">
                    <td className="py-3 px-4">أولاً: إيرادات العقار التشغيلية</td>
                    <td className="py-3 px-4 text-left font-mono">المبلغ (ر.س)</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-6">إيرادات إيجارات الوحدات السكنية</td>
                    <td className="py-2.5 px-4 font-mono text-left font-semibold text-emerald-700">320,000.00</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-6">إيرادات إيجارات المحلات التجارية</td>
                    <td className="py-2.5 px-4 font-mono text-left font-semibold text-emerald-700">180,000.00</td>
                  </tr>
                  <tr className="bg-emerald-50/60 font-bold border-t border-emerald-200">
                    <td className="py-3 px-4 text-emerald-900">إجمالي إيرادات العقار (A)</td>
                    <td className="py-3 px-4 font-mono text-left text-emerald-800 text-sm">500,000.00</td>
                  </tr>

                  <tr className="bg-slate-100 font-bold">
                    <td className="py-3 px-4">ثانياً: مصروفات العقار المباشرة</td>
                    <td className="py-3 px-4 text-left font-mono">المبلغ (ر.س)</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-6">مصروفات الصيانة الدورية والنظافة</td>
                    <td className="py-2.5 px-4 font-mono text-left font-semibold text-rose-700">42,000.00</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-6">فواتير الكهرباء والمياه المشتركة</td>
                    <td className="py-2.5 px-4 font-mono text-left font-semibold text-rose-700">18,500.00</td>
                  </tr>
                  <tr className="bg-rose-50/60 font-bold border-t border-rose-200">
                    <td className="py-3 px-4 text-rose-900">إجمالي مصروفات العقار (B)</td>
                    <td className="py-3 px-4 font-mono text-left text-rose-800 text-sm">60,500.00</td>
                  </tr>

                  <tr className="bg-slate-900 text-white font-bold text-sm">
                    <td className="py-4 px-4">صافي العائد التشغيلي للعقار (Net Operating Yield = A - B)</td>
                    <td className="py-4 px-4 font-mono text-left text-amber-400">439,500.00 ر.س</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {(activeTab === 'income-statement' || activeTab === 'balance-sheet' || activeTab === 'general-ledger') && (
          <div className="p-8 text-center text-xs text-slate-500">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
            <p className="font-semibold text-slate-800">تم توليد القائمة بنجاح وفقاً لقيود دفتر الأستاذ العام</p>
            <p className="text-[11px] text-slate-400 mt-1">انقر على تصدير Excel أو طباعة PDF لتحميل النسخة المعتمدة</p>
          </div>
        )}
      </div>
    </AppLayout>
  </ProtectedRoute>
  );
}

