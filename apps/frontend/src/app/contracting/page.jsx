'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '../../components/AppLayout';
import ProtectedRoute from '../../components/ProtectedRoute';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  HardHat, Plus, Search, RefreshCw, FileText, CheckCircle2,
  Clock, ShieldAlert, DollarSign, Building, AlertTriangle, Eye
} from 'lucide-react';

export default function ContractingPage() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [formError, setFormError] = useState(null);

  const [formData, setFormData] = useState({
    contractor_name: '',
    project_name: '',
    contract_number: '',
    invoice_date: new Date().toISOString().split('T')[0],
    claim_amount: '',
    retention_rate: 10,
    vat_rate: 15,
    notes: '',
  });

  const fetchInvoices = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/contractor-invoices');
      setInvoices(res.data.data || []);
    } catch (err) {
      console.error('Failed to load contractor invoices', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  // Compute live breakdown
  const claim = parseFloat(formData.claim_amount) || 0;
  const retention = (claim * (formData.retention_rate || 0)) / 100;
  const taxable = claim - retention;
  const vat = (taxable * (formData.vat_rate || 0)) / 100;
  const netPayable = taxable + vat;

  const handleCreateInvoice = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setFormError(null);

    try {
      await api.post('/contractor-invoices', {
        ...formData,
        claim_amount: claim,
      });

      setShowAddModal(false);
      setFormData({
        contractor_name: '',
        project_name: '',
        contract_number: '',
        invoice_date: new Date().toISOString().split('T')[0],
        claim_amount: '',
        retention_rate: 10,
        vat_rate: 15,
        notes: '',
      });
      fetchInvoices();
    } catch (err) {
      setFormError(err.response?.data?.message || 'حدث خطأ أثناء حفظ مستخلص المقاول');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveInvoice = async (invoice) => {
    if (!window.confirm(`هل أنت متأكد من مراجعة واعتماد مستخلص المقاول "${invoice.contractor_name}"؟ سيتم تلقائياً ترحيل قيد اليومية المتوازن إلى دفتر الأستاذ العام.`)) return;

    setActionLoading(true);
    try {
      await api.post(`/contractor-invoices/${invoice.id}/approve`);
      fetchInvoices();
    } catch (err) {
      alert(err.response?.data?.message || 'حدث خطأ أثناء اعتماد المستخلص');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredInvoices = invoices.filter((inv) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      inv.contractor_name?.toLowerCase().includes(q) ||
      inv.project_name?.toLowerCase().includes(q) ||
      inv.invoice_number?.toLowerCase().includes(q) ||
      inv.contract_number?.toLowerCase().includes(q);

    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <ProtectedRoute allowedRoles={['branch_manager', 'data_entry', 'general_accountant']}>
      <AppLayout
        title="مستخلصات وفواتير المقاولين والمشاريع"
        subtitle="إدارة مستخلصات الإنجاز لشركات المقاولات، خصم ضمان الأعمال (Retention)، احتساب ضريبة القيمة المضافة، واعتماد المحاسب العام (UC-52 إلى UC-54)"
      >
        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-80">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="البحث باسم المقاول أو المشروع أو رقم المستخلص..."
                className="w-full pl-3 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 shadow-sm"
              />
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="py-2.5 px-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 shadow-sm focus:ring-2 focus:ring-amber-500"
            >
              <option value="all">كافة الحالات</option>
              <option value="draft">مسودة (بانتظار الاعتماد)</option>
              <option value="approved">معتمد ومرحل للدفاتر</option>
            </select>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              onClick={fetchInvoices}
              disabled={isLoading}
              className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 shadow-sm transition-colors"
              title="تحديث البيانات"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => {
                setFormError(null);
                setShowAddModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>مستخلص إنجاز جديد</span>
            </button>
          </div>
        </div>

        {/* Invoices Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                <tr>
                  <th className="py-3.5 px-4">رقم المستخلص</th>
                  <th className="py-3.5 px-4">اسم المقاول / المنفذ</th>
                  <th className="py-3.5 px-4">المشروع ورقم العقد</th>
                  <th className="py-3.5 px-4">تاريخ المستخلص</th>
                  <th className="py-3.5 px-4">قيمة الإنجاز (المطالبة)</th>
                  <th className="py-3.5 px-4">خصم الضمان (Retention)</th>
                  <th className="py-3.5 px-4">الضريبة (VAT)</th>
                  <th className="py-3.5 px-4">الصافي المستحق</th>
                  <th className="py-3.5 px-4">الحالة</th>
                  <th className="py-3.5 px-4 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {isLoading ? (
                  <tr>
                    <td colSpan="10" className="py-12 text-center text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-500" />
                      جاري تحميل فواتير ومستخلصات المقاولين...
                    </td>
                  </tr>
                ) : filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="py-12 text-center text-slate-400">
                      لا توجد مستخلصات مسجلة
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {inv.invoice_number || `CLAIM-${inv.id}`}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center gap-2">
                        <HardHat className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>{inv.contractor_name}</span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        <div className="font-semibold text-slate-800">{inv.project_name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">عقد: {inv.contract_number}</div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600">{inv.invoice_date}</td>
                      <td className="py-3.5 px-4 font-bold font-mono text-slate-900">
                        {Number(inv.claim_amount || 0).toLocaleString()} ر.س
                      </td>
                      <td className="py-3.5 px-4 font-mono text-red-600">
                        -{Number(inv.retention_amount || 0).toLocaleString()} ر.س ({inv.retention_rate}%)
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600">
                        +{Number(inv.vat_amount || 0).toLocaleString()} ر.س
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-700 text-sm">
                        {Number(inv.net_payable || inv.net_amount || 0).toLocaleString()} ر.س
                      </td>
                      <td className="py-3.5 px-4">
                        {inv.status === 'approved' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            معتمد ومرحل
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="w-3 h-3" />
                            مسودة (بانتظار المراجعة)
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {inv.status === 'draft' && (user?.role === 'general_accountant' || user?.role === 'super_admin') && (
                            <button
                              onClick={() => handleApproveInvoice(inv)}
                              disabled={actionLoading}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-semibold shadow transition-colors"
                              title="اعتماد المستخلص وتوليد القيد المحاسبي"
                            >
                              اعتماد وترحيل
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-lg overflow-hidden">
              <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <HardHat className="w-4 h-4 text-amber-500" />
                  <span>إدخال مستخلص إنجاز مقاول جديد (UC-52)</span>
                </h3>
                <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">✕</button>
              </div>

              <form onSubmit={handleCreateInvoice} className="p-6 space-y-4 text-xs">
                {formError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1">اسم المقاول / الشركة المنفذة *</label>
                    <input
                      type="text"
                      required
                      value={formData.contractor_name}
                      onChange={(e) => setFormData({ ...formData, contractor_name: e.target.value })}
                      placeholder="مثال: شركة الإنشاءات الحديثة المحدودة"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">اسم المشروع *</label>
                    <input
                      type="text"
                      required
                      value={formData.project_name}
                      onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
                      placeholder="مشروع بناء مجمع الأندلس"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">رقم العقد *</label>
                    <input
                      type="text"
                      required
                      value={formData.contract_number}
                      onChange={(e) => setFormData({ ...formData, contract_number: e.target.value })}
                      placeholder="CON-2026-08"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-amber-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">تاريخ المستخلص *</label>
                    <input
                      type="date"
                      required
                      value={formData.invoice_date}
                      onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-amber-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">قيمة الإنجاز (المطالبة) ر.س *</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={formData.claim_amount}
                      onChange={(e) => setFormData({ ...formData, claim_amount: e.target.value })}
                      placeholder="100000"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-amber-500 focus:bg-white font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">نسبة ضمان الأعمال (Retention) *</label>
                    <select
                      value={formData.retention_rate}
                      onChange={(e) => setFormData({ ...formData, retention_rate: parseFloat(e.target.value) })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500 focus:bg-white"
                    >
                      <option value={10}>10% (النسبة القياسية لمشاريع المقاولات)</option>
                      <option value={5}>5%</option>
                      <option value={0}>0% (بدون حجز ضمان)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">ضريبة القيمة المضافة (VAT)</label>
                    <select
                      value={formData.vat_rate}
                      onChange={(e) => setFormData({ ...formData, vat_rate: parseFloat(e.target.value) })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500 focus:bg-white"
                    >
                      <option value={15}>15% (النسبة الأساسية في السعودية)</option>
                      <option value={0}>0% (معفى)</option>
                    </select>
                  </div>
                </div>

                {/* Live Financial Breakdown Card */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex justify-between text-slate-600">
                    <span>قيمة المطالبة الإجمالية:</span>
                    <span className="font-mono font-semibold">{claim.toLocaleString()} ر.س</span>
                  </div>
                  <div className="flex justify-between text-red-600">
                    <span>خصم ضمان الأعمال المحجوز ({formData.retention_rate}%):</span>
                    <span className="font-mono font-semibold">-{retention.toLocaleString()} ر.س</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>ضريبة القيمة المضافة (15%):</span>
                    <span className="font-mono font-semibold">+{vat.toLocaleString()} ر.س</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-2 font-bold text-slate-900 text-sm">
                    <span>الصافي المستحق للمقاول:</span>
                    <span className="font-mono text-emerald-700">{netPayable.toLocaleString()} ر.س</span>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ملاحظات المستخلص</label>
                  <textarea
                    rows={2}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="ملاحظات حول نسبة الإنجاز والبنود المنجزة..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:bg-white"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading || claim <= 0}
                    className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl shadow disabled:opacity-50"
                  >
                    {actionLoading ? 'جاري الحفظ...' : 'حفظ المستخلص (مسودة)'}
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

