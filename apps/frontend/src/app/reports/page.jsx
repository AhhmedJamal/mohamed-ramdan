'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '../../components/AppLayout';
import ProtectedRoute from '../../components/ProtectedRoute';
import api from '../../services/api';
import {
  BarChart3, Download, Printer, FileSpreadsheet, Building, Calendar,
  CheckCircle2, AlertTriangle, RefreshCw, Layers, ArrowLeftRight
} from 'lucide-react';

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('trial-balance'); // trial-balance, general-ledger, balance-sheet, income-statement, building-income
  const [reportData, setReportData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Aux state for dropdowns
  const [accounts, setAccounts] = useState([]);
  const [costCenters, setCostCenters] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [selectedCostCenterId, setSelectedCostCenterId] = useState('');

  // Date filters
  const currentYear = new Date().getFullYear();
  const [startDate, setStartDate] = useState(`${currentYear}-01-01`);
  const [endDate, setEndDate] = useState(`${currentYear}-12-31`);

  // Load auxiliary data on mount
  useEffect(() => {
    const loadAux = async () => {
      try {
        const [accRes, ccRes] = await Promise.all([
          api.get('/accounts').catch(() => ({ data: { data: [] } })),
          api.get('/cost-centers').catch(() => ({ data: { data: [] } })),
        ]);
        const accs = accRes.data.data || [];
        const ccs = ccRes.data.data || ccRes.data.cost_centers || [];
        setAccounts(accs);
        setCostCenters(ccs);

        if (accs.length > 0 && !selectedAccountId) {
          setSelectedAccountId(accs[0].id);
        }
        if (ccs.length > 0 && !selectedCostCenterId) {
          setSelectedCostCenterId(ccs[0].id);
        }
      } catch (err) {
        console.error('Failed to load aux data', err);
      }
    };
    loadAux();
  }, []);

  const fetchReport = async () => {
    setIsLoading(true);
    try {
      let endpoint = '';
      if (activeTab === 'trial-balance') {
        endpoint = `/reports/trial-balance?from_date=${startDate}&to_date=${endDate}`;
      } else if (activeTab === 'general-ledger') {
        if (!selectedAccountId) return;
        endpoint = `/reports/general-ledger?account_id=${selectedAccountId}&from_date=${startDate}&to_date=${endDate}`;
      } else if (activeTab === 'balance-sheet') {
        endpoint = `/reports/balance-sheet?as_of_date=${endDate}`;
      } else if (activeTab === 'income-statement') {
        endpoint = `/reports/income-statement?from_date=${startDate}&to_date=${endDate}`;
      } else if (activeTab === 'building-income') {
        if (!selectedCostCenterId) return;
        endpoint = `/reports/building-income?cost_center_id=${selectedCostCenterId}&from_date=${startDate}&to_date=${endDate}`;
      }

      const res = await api.get(endpoint);
      setReportData(res.data.data || {});
    } catch (err) {
      console.error('Failed to load report', err);
      setReportData(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [activeTab, startDate, endDate, selectedAccountId, selectedCostCenterId]);

  const handleExportCSV = () => {
    let reportType = 'trial_balance';
    if (activeTab === 'trial-balance') reportType = 'trial_balance';
    const url = `/api/reports/export?report_type=${reportType}&from_date=${startDate}&to_date=${endDate}`;
    window.open(url, '_blank');
  };

  const handlePrintPDF = () => {
    window.print();
  };

  return (
    <ProtectedRoute allowedRoles={['general_accountant', 'branch_manager', 'super_admin']}>
      <AppLayout
        title="التقارير والقوائم المالية الختامية (Financial Reports)"
        subtitle="ميزان المراجعة، الأستاذ العام، المركز المالي، وقائمة دخل المبنى ومشاريع المقاولات (UC-56 إلى UC-60)"
      >
        {/* Top Filter and Tab Selection */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mb-6 print:hidden">
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
                ميزان المراجعة (UC-56)
              </button>
              <button
                onClick={() => setActiveTab('general-ledger')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'general-ledger'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                دفتر الأستاذ العام (UC-57)
              </button>
              <button
                onClick={() => setActiveTab('balance-sheet')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'balance-sheet'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                الميزانية العمومية (UC-57)
              </button>
              <button
                onClick={() => setActiveTab('income-statement')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'income-statement'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                قائمة الدخل الشامل (UC-58)
              </button>
              <button
                onClick={() => setActiveTab('building-income')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'building-income'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                قائمة دخل العمارة / المركز (UC-59)
              </button>
            </div>

            {/* Export Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportCSV}
                className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
                title="تصدير ملف إكسل متوافق"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>تصدير Excel / CSV (UC-60)</span>
              </button>
              <button
                onClick={handlePrintPDF}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
                title="طباعة التقرير أو حفظ PDF"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة PDF</span>
              </button>
            </div>
          </div>

          {/* Date & Selector Filter Bar */}
          <div className="flex flex-wrap items-center gap-4 text-xs">
            {activeTab !== 'balance-sheet' && (
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium">من تاريخ:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-xs"
                />
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium">{activeTab === 'balance-sheet' ? 'كما في تاريخ:' : 'إلى تاريخ:'}</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-xs"
              />
            </div>

            {activeTab === 'general-ledger' && (
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium">الحساب المالي:</span>
                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-xs font-semibold"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.code} - {acc.name_ar || acc.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {activeTab === 'building-income' && (
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium">مركز التكلفة / العمارة:</span>
                <select
                  value={selectedCostCenterId}
                  onChange={(e) => setSelectedCostCenterId(e.target.value)}
                  className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-xs font-semibold"
                >
                  {costCenters.map((cc) => (
                    <option key={cc.id} value={cc.id}>
                      {cc.code} - {cc.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              onClick={fetchReport}
              disabled={isLoading}
              className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors mr-auto"
              title="تحديث البيانات"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Report Canvas */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 min-h-[450px]">
          {/* Letterhead */}
          <div className="text-center pb-6 border-b border-slate-200 mb-6">
            <h2 className="text-base font-bold text-slate-900">مجموعة محمد رمضان - القوائم والتقارير المالية المعتمدة</h2>
            <p className="text-sm font-semibold text-amber-700 mt-1">
              {activeTab === 'trial-balance' && 'ميزان المراجعة بالأرصدة والمجاميع (Trial Balance)'}
              {activeTab === 'general-ledger' && `كشف حركة دفتر الأستاذ العام (${reportData?.account?.name || ''})`}
              {activeTab === 'balance-sheet' && 'قائمة المركز المالي - الميزانية العمومية (Balance Sheet)'}
              {activeTab === 'income-statement' && 'قائمة الدخل الشامل - الأرباح والخسائر (Income Statement)'}
              {activeTab === 'building-income' && `قائمة دخل مركز التكلفة (${reportData?.cost_center?.name || ''})`}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              الفترة: {startDate} إلى {endDate} | العملة: ريال سعودي (SAR)
            </p>
          </div>

          {isLoading ? (
            <div className="py-20 text-center text-slate-400 text-xs">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-500" />
              جاري استخراج البيانات وحساب الأرصدة المحاسبية...
            </div>
          ) : !reportData ? (
            <div className="py-20 text-center text-slate-400 text-xs">
              لا توجد بيانات متاحة للعرض
            </div>
          ) : (
            <>
              {/* 1. TRIAL BALANCE TAB (UC-56) */}
              {activeTab === 'trial-balance' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-3">كود الحساب</th>
                        <th className="py-3 px-3">اسم الحساب</th>
                        <th className="py-3 px-3">الطبيعة</th>
                        <th className="py-3 px-3 font-mono text-left">مدين افتتاحي</th>
                        <th className="py-3 px-3 font-mono text-left">دائن افتتاحي</th>
                        <th className="py-3 px-3 font-mono text-left">مدين الفترة</th>
                        <th className="py-3 px-3 font-mono text-left">دائن الفترة</th>
                        <th className="py-3 px-3 font-mono text-left">رصيد مدين</th>
                        <th className="py-3 px-3 font-mono text-left">رصيد دائن</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {(reportData.accounts || []).map((acc) => (
                        <tr key={acc.account_id} className="hover:bg-slate-50/80">
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{acc.code}</td>
                          <td className="py-2.5 px-3 font-semibold text-slate-800">{acc.name}</td>
                          <td className="py-2.5 px-3 text-slate-500">{acc.nature === 'debit' ? 'مدين' : 'دائن'}</td>
                          <td className="py-2.5 px-3 font-mono text-left">{Number(acc.opening_debit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          <td className="py-2.5 px-3 font-mono text-left">{Number(acc.opening_credit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          <td className="py-2.5 px-3 font-mono text-left text-emerald-700">{Number(acc.period_debit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          <td className="py-2.5 px-3 font-mono text-left text-rose-700">{Number(acc.period_credit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          <td className="py-2.5 px-3 font-mono text-left font-bold text-slate-900">{Number(acc.ending_debit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          <td className="py-2.5 px-3 font-mono text-left font-bold text-slate-900">{Number(acc.ending_credit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300">
                      <tr>
                        <td colSpan="3" className="py-3 px-3 text-slate-800">
                          الإجمالي العام المحاسبي
                        </td>
                        <td className="py-3 px-3 font-mono text-left">{Number(reportData.totals?.opening_debit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td className="py-3 px-3 font-mono text-left">{Number(reportData.totals?.opening_credit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td className="py-3 px-3 font-mono text-left text-emerald-700">{Number(reportData.totals?.period_debit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td className="py-3 px-3 font-mono text-left text-rose-700">{Number(reportData.totals?.period_credit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td className="py-3 px-3 font-mono text-left font-bold text-slate-900">{Number(reportData.totals?.ending_debit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td className="py-3 px-3 font-mono text-left font-bold text-slate-900">{Number(reportData.totals?.ending_credit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      </tr>
                      <tr>
                        <td colSpan="9" className="py-2 px-3 text-center">
                          {reportData.totals?.is_balanced ? (
                            <span className="text-emerald-700 font-semibold flex items-center justify-center gap-1">
                              <CheckCircle2 className="w-4 h-4" />
                              <span>ميزان المراجعة متوازن تماماً: إجمالي المدين = إجمالي الدائن (الفرق: 0.00 ر.س)</span>
                            </span>
                          ) : (
                            <span className="text-rose-700 font-semibold flex items-center justify-center gap-1">
                              <AlertTriangle className="w-4 h-4" />
                              <span>ميزان المراجعة غير متوازن! الفرق: {reportData.totals?.balance_difference} ر.س</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              {/* 2. GENERAL LEDGER TAB (UC-57) */}
              {activeTab === 'general-ledger' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="font-semibold text-slate-800">
                      رصيد أول المدة الافتتاحي:
                    </span>
                    <span className="font-mono font-bold text-slate-900 text-sm">
                      {Number(reportData.opening_balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} ر.س
                    </span>
                  </div>

                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                        <tr>
                          <th className="py-3 px-3">التاريخ</th>
                          <th className="py-3 px-3">رقم القيد</th>
                          <th className="py-3 px-3">الحساب المقابل</th>
                          <th className="py-3 px-3">مركز التكلفة</th>
                          <th className="py-3 px-3">البيان / الإيضاح</th>
                          <th className="py-3 px-3 font-mono text-left">مدين (ر.س)</th>
                          <th className="py-3 px-3 font-mono text-left">دائن (ر.س)</th>
                          <th className="py-3 px-3 font-mono text-left">الرصيد التراكمي</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {(!reportData.rows || reportData.rows.length === 0) ? (
                          <tr>
                            <td colSpan="8" className="py-8 text-center text-slate-400">
                              لا توجد حركات مرحّلة على هذا الحساب خلال الفترة المحددة
                            </td>
                          </tr>
                        ) : (
                          reportData.rows.map((row) => (
                            <tr key={row.id} className="hover:bg-slate-50/80">
                              <td className="py-2.5 px-3 font-mono text-slate-600">{row.date}</td>
                              <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{row.entry_number}</td>
                              <td className="py-2.5 px-3 text-slate-800">{row.counter_account_name}</td>
                              <td className="py-2.5 px-3 text-slate-500">{row.cost_center_name || '—'}</td>
                              <td className="py-2.5 px-3 text-slate-700">{row.explanation}</td>
                              <td className="py-2.5 px-3 font-mono text-left text-emerald-700">{Number(row.debit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                              <td className="py-2.5 px-3 font-mono text-left text-rose-700">{Number(row.credit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                              <td className="py-2.5 px-3 font-mono font-bold text-left text-slate-900">{Number(row.running_balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                      <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300">
                        <tr>
                          <td colSpan="5" className="py-3 px-3 text-slate-800">الإجمالي ورصيد الإغلاق الختامي</td>
                          <td className="py-3 px-3 font-mono text-left text-emerald-700">{Number(reportData.total_debit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          <td className="py-3 px-3 font-mono text-left text-rose-700">{Number(reportData.total_credit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          <td className="py-3 px-3 font-mono text-left font-bold text-slate-900">{Number(reportData.closing_balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              {/* 3. BALANCE SHEET TAB (UC-57 Part 2) */}
              {activeTab === 'balance-sheet' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Assets Column */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <div className="p-3 bg-slate-100 font-bold text-slate-900 flex justify-between">
                        <span>الأصول (Assets)</span>
                        <span className="font-mono">{Number(reportData.assets?.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} ر.س</span>
                      </div>
                      <table className="w-full text-right text-xs divide-y divide-slate-100">
                        <tbody>
                          {(reportData.assets?.items || []).map((item) => (
                            <tr key={item.account_id} className="hover:bg-slate-50">
                              <td className="py-2 px-3 font-mono text-slate-500">{item.code}</td>
                              <td className="py-2 px-3 text-slate-800 font-semibold">{item.name}</td>
                              <td className="py-2 px-3 font-mono text-left font-bold text-slate-900">{Number(item.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Liabilities & Equity Column */}
                    <div className="space-y-6">
                      {/* Liabilities */}
                      <div className="border border-slate-200 rounded-xl overflow-hidden">
                        <div className="p-3 bg-slate-100 font-bold text-slate-900 flex justify-between">
                          <span>الخصوم والالتزامات (Liabilities)</span>
                          <span className="font-mono">{Number(reportData.liabilities?.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} ر.س</span>
                        </div>
                        <table className="w-full text-right text-xs divide-y divide-slate-100">
                          <tbody>
                            {(reportData.liabilities?.items || []).map((item) => (
                              <tr key={item.account_id} className="hover:bg-slate-50">
                                <td className="py-2 px-3 font-mono text-slate-500">{item.code}</td>
                                <td className="py-2 px-3 text-slate-800 font-semibold">{item.name}</td>
                                <td className="py-2 px-3 font-mono text-left font-bold text-slate-900">{Number(item.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Equity */}
                      <div className="border border-slate-200 rounded-xl overflow-hidden">
                        <div className="p-3 bg-slate-100 font-bold text-slate-900 flex justify-between">
                          <span>حقوق الملكية (Equity)</span>
                          <span className="font-mono">{Number(reportData.equity?.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} ر.س</span>
                        </div>
                        <table className="w-full text-right text-xs divide-y divide-slate-100">
                          <tbody>
                            {(reportData.equity?.items || []).map((item) => (
                              <tr key={item.account_id} className="hover:bg-slate-50">
                                <td className="py-2 px-3 font-mono text-slate-500">{item.code}</td>
                                <td className="py-2 px-3 text-slate-800 font-semibold">{item.name}</td>
                                <td className="py-2 px-3 font-mono text-left font-bold text-slate-900">{Number(item.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                              </tr>
                            ))}
                            <tr className="bg-amber-50/60 font-semibold">
                              <td colSpan="2" className="py-2 px-3 text-amber-900">صافي ربح / (خسارة) الفترة المرحّلة</td>
                              <td className="py-2 px-3 font-mono text-left font-bold text-amber-900">
                                {Number(reportData.equity?.net_profit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* Accounting Equation Verification Banner */}
                  <div className={`p-4 rounded-xl border flex items-center justify-between text-xs font-bold ${
                    reportData.is_balanced ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-red-50 border-red-200 text-red-900'
                  }`}>
                    <div className="flex items-center gap-2">
                      {reportData.is_balanced ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <AlertTriangle className="w-5 h-5 text-red-600" />}
                      <span>
                        المعادلة المحاسبية الأساسية: إجمالي الأصول ({Number(reportData.assets?.total || 0).toLocaleString()} ر.س) = الخصوم وحقوق الملكية ({Number(reportData.total_liabilities_and_equity || 0).toLocaleString()} ر.س)
                      </span>
                    </div>
                    <span>الفرق: {reportData.difference || '0.00'} ر.س</span>
                  </div>
                </div>
              )}

              {/* 4. INCOME STATEMENT TAB (UC-58) */}
              {activeTab === 'income-statement' && (
                <div className="max-w-2xl mx-auto space-y-6">
                  {/* Revenues */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="p-3 bg-emerald-50 text-emerald-900 font-bold flex justify-between">
                      <span>الإيرادات (Revenues)</span>
                      <span className="font-mono">{Number(reportData.revenues?.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} ر.س</span>
                    </div>
                    <table className="w-full text-right text-xs divide-y divide-slate-100">
                      <tbody>
                        {(reportData.revenues?.items || []).map((item) => (
                          <tr key={item.account_id} className="hover:bg-slate-50">
                            <td className="py-2.5 px-4 font-mono text-slate-500">{item.code}</td>
                            <td className="py-2.5 px-4 text-slate-800 font-semibold">{item.name}</td>
                            <td className="py-2.5 px-4 font-mono text-left font-bold text-emerald-700">{Number(item.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Expenses */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="p-3 bg-rose-50 text-rose-900 font-bold flex justify-between">
                      <span>المصروفات (Expenses)</span>
                      <span className="font-mono">{Number(reportData.expenses?.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} ر.س</span>
                    </div>
                    <table className="w-full text-right text-xs divide-y divide-slate-100">
                      <tbody>
                        {(reportData.expenses?.items || []).map((item) => (
                          <tr key={item.account_id} className="hover:bg-slate-50">
                            <td className="py-2.5 px-4 font-mono text-slate-500">{item.code}</td>
                            <td className="py-2.5 px-4 text-slate-800 font-semibold">{item.name}</td>
                            <td className="py-2.5 px-4 font-mono text-left font-bold text-rose-700">{Number(item.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Net Profit Summary */}
                  <div className="p-5 rounded-2xl bg-slate-900 text-white flex items-center justify-between shadow-lg">
                    <div>
                      <span className="text-xs text-slate-400 block">صافي الربح / (الخسارة) للفترة المحاسبية</span>
                      <span className="text-base font-bold text-white">Net Income = الإيرادات − المصروفات</span>
                    </div>
                    <div className={`font-mono text-xl font-bold ${reportData.is_profit ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {Number(reportData.net_profit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} ر.س
                    </div>
                  </div>
                </div>
              )}

              {/* 5. BUILDING INCOME STATEMENT TAB (UC-59) */}
              {activeTab === 'building-income' && (
                <div className="max-w-2xl mx-auto space-y-6">
                  <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-amber-900 block">المركز المالي للعقار / المشروع:</span>
                      <span className="text-sm font-semibold text-slate-800">
                        {reportData.cost_center?.name} (كود: {reportData.cost_center?.code})
                      </span>
                    </div>
                    <Building className="w-8 h-8 text-amber-600 opacity-60" />
                  </div>

                  {/* Building Revenues */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="p-3 bg-slate-100 font-bold text-slate-900 flex justify-between">
                      <span>إيرادات العقار التشغيلية</span>
                      <span className="font-mono text-emerald-700">{Number(reportData.revenues?.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} ر.س</span>
                    </div>
                    <table className="w-full text-right text-xs divide-y divide-slate-100">
                      <tbody>
                        {(!reportData.revenues?.items || reportData.revenues.items.length === 0) ? (
                          <tr><td colSpan="3" className="py-3 px-4 text-center text-slate-400">لا توجد إيرادات مسجلة لهذا المركز</td></tr>
                        ) : (
                          reportData.revenues.items.map((it, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="py-2.5 px-4 font-mono text-slate-500">{it.entry_number}</td>
                              <td className="py-2.5 px-4 font-semibold text-slate-800">{it.account_name}</td>
                              <td className="py-2.5 px-4 font-mono text-left font-bold text-emerald-700">{Number(it.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Building Expenses */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="p-3 bg-slate-100 font-bold text-slate-900 flex justify-between">
                      <span>مصروفات العقار المباشرة</span>
                      <span className="font-mono text-rose-700">{Number(reportData.expenses?.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} ر.س</span>
                    </div>
                    <table className="w-full text-right text-xs divide-y divide-slate-100">
                      <tbody>
                        {(!reportData.expenses?.items || reportData.expenses.items.length === 0) ? (
                          <tr><td colSpan="3" className="py-3 px-4 text-center text-slate-400">لا توجد مصروفات مسجلة لهذا المركز</td></tr>
                        ) : (
                          reportData.expenses.items.map((it, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="py-2.5 px-4 font-mono text-slate-500">{it.entry_number}</td>
                              <td className="py-2.5 px-4 font-semibold text-slate-800">{it.account_name}</td>
                              <td className="py-2.5 px-4 font-mono text-left font-bold text-rose-700">{Number(it.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Net Operating Yield */}
                  <div className="p-5 rounded-2xl bg-slate-900 text-white flex items-center justify-between shadow-lg">
                    <div>
                      <span className="text-xs text-slate-400 block">صافي العائد التشغيلي للمركز (Net Operating Yield)</span>
                      <span className="text-base font-bold text-white">الإيرادات − المصروفات المباشرة</span>
                    </div>
                    <div className={`font-mono text-xl font-bold ${reportData.is_profit ? 'text-amber-400' : 'text-rose-400'}`}>
                      {Number(reportData.net_profit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} ر.س
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
