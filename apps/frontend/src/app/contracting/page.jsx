'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '../../components/AppLayout';
import ProtectedRoute from '../../components/ProtectedRoute';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  HardHat, Truck, Plus, Search, RefreshCw, FileText, CheckCircle2,
  Clock, ShieldAlert, DollarSign, Building, AlertTriangle, Eye, Receipt
} from 'lucide-react';

export default function ContractingPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('contractor'); // 'contractor' | 'supplier'

  // Contractor Invoices State (UC-52..UC-54)
  const [contractorInvoices, setContractorInvoices] = useState([]);
  const [isContractorLoading, setIsContractorLoading] = useState(true);
  const [contractorSearch, setContractorSearch] = useState('');
  const [contractorStatusFilter, setContractorStatusFilter] = useState('all');
  const [showAddContractorModal, setShowAddContractorModal] = useState(false);
  const [contractorFormError, setContractorFormError] = useState(null);
  const [contractorFormData, setContractorFormData] = useState({
    contractor_name: '',
    project_name: '',
    contract_number: '',
    invoice_date: new Date().toISOString().split('T')[0],
    claim_amount: '',
    retention_rate: 10,
    vat_rate: 15,
    notes: '',
  });

  // Supplier Invoices State (UC-55)
  const [supplierInvoices, setSupplierInvoices] = useState([]);
  const [isSupplierLoading, setIsSupplierLoading] = useState(true);
  const [supplierSearch, setSupplierSearch] = useState('');
  const [supplierStatusFilter, setSupplierStatusFilter] = useState('all');
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [supplierFormError, setSupplierFormError] = useState(null);
  const [costCenters, setCostCenters] = useState([]);
  const [supplierFormData, setSupplierFormData] = useState({
    supplier_name: '',
    invoice_number: '',
    date: new Date().toISOString().split('T')[0],
    cost_center_id: '',
    gross_amount: '',
    discount_earned: 0,
    tax_type: 'vat',
    payment_terms: 'credit',
  });

  const [actionLoading, setActionLoading] = useState(false);

  // Fetch Contractor Invoices
  const fetchContractorInvoices = async () => {
    setIsContractorLoading(true);
    try {
      const res = await api.get('/contractor-invoices');
      setContractorInvoices(res.data.data || []);
    } catch (err) {
      console.error('Failed to load contractor invoices', err);
    } finally {
      setIsContractorLoading(false);
    }
  };

  // Fetch Supplier Invoices & Cost Centers
  const fetchSupplierInvoices = async () => {
    setIsSupplierLoading(true);
    try {
      const [invRes, ccRes] = await Promise.all([
        api.get('/supplier-invoices').catch(() => ({ data: { data: [] } })),
        api.get('/cost-centers').catch(() => ({ data: { data: [] } })),
      ]);
      setSupplierInvoices(invRes.data?.data || []);
      setCostCenters(ccRes.data?.data || []);
      if (ccRes.data?.data?.length > 0 && !supplierFormData.cost_center_id) {
        setSupplierFormData((prev) => ({ ...prev, cost_center_id: ccRes.data.data[0].id }));
      }
    } catch (err) {
      console.error('Failed to load supplier invoices', err);
    } finally {
      setIsSupplierLoading(false);
    }
  };

  useEffect(() => {
    fetchContractorInvoices();
    fetchSupplierInvoices();
  }, []);

  // Compute live breakdown for Contractor Claim
  const claim = parseFloat(contractorFormData.claim_amount) || 0;
  const retention = (claim * (contractorFormData.retention_rate || 0)) / 100;
  const taxable = claim - retention;
  const vat = (taxable * (contractorFormData.vat_rate || 0)) / 100;
  const netPayable = taxable + vat;

  // Compute live breakdown for Supplier Invoice (UC-55)
  const suppGross = parseFloat(supplierFormData.gross_amount) || 0;
  const suppDiscount = parseFloat(supplierFormData.discount_earned) || 0;
  const suppNet = Math.max(0, suppGross - suppDiscount);
  const suppTaxRate = supplierFormData.tax_type === 'vat' ? 0.15 : 0.05;
  const suppTax = Math.round(suppNet * suppTaxRate * 100) / 100;
  const suppTotalPayable = Math.round((suppNet + suppTax) * 100) / 100;

  // Handlers for Contractor Invoices
  const handleCreateContractorInvoice = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setContractorFormError(null);

    try {
      await api.post('/contractor-invoices', {
        ...contractorFormData,
        claim_amount: claim,
      });

      setShowAddContractorModal(false);
      setContractorFormData({
        contractor_name: '',
        project_name: '',
        contract_number: '',
        invoice_date: new Date().toISOString().split('T')[0],
        claim_amount: '',
        retention_rate: 10,
        vat_rate: 15,
        notes: '',
      });
      fetchContractorInvoices();
    } catch (err) {
      setContractorFormError(err.response?.data?.message || 'حدث خطأ أثناء حفظ مستخلص المقاول');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveContractorInvoice = async (invoice) => {
    if (!window.confirm(`هل أنت متأكد من مراجعة واعتماد مستخلص المقاول "${invoice.contractor_name}"؟ سيتم تلقائياً ترحيل قيد اليومية المتوازن إلى دفتر الأستاذ العام.`)) return;

    setActionLoading(true);
    try {
      await api.post(`/contractor-invoices/${invoice.id}/approve`);
      fetchContractorInvoices();
    } catch (err) {
      alert(err.response?.data?.message || 'حدث خطأ أثناء اعتماد المستخلص');
    } finally {
      setActionLoading(false);
    }
  };

  // Handlers for Supplier Invoices (UC-55)
  const handleCreateSupplierInvoice = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setSupplierFormError(null);

    if (!supplierFormData.cost_center_id) {
      setSupplierFormError('يرجى اختيار مركز التكلفة المرتبط بفاتورة المورد');
      setActionLoading(false);
      return;
    }

    try {
      await api.post('/supplier-invoices', {
        ...supplierFormData,
        gross_amount: suppGross,
        discount_earned: suppDiscount,
      });

      setShowAddSupplierModal(false);
      setSupplierFormData({
        supplier_name: '',
        invoice_number: '',
        date: new Date().toISOString().split('T')[0],
        cost_center_id: costCenters[0]?.id || '',
        gross_amount: '',
        discount_earned: 0,
        tax_type: 'vat',
        payment_terms: 'credit',
      });
      fetchSupplierInvoices();
    } catch (err) {
      setSupplierFormError(err.response?.data?.message || 'حدث خطأ أثناء حفظ فاتورة المورد');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveSupplierInvoice = async (invoice) => {
    if (!window.confirm(`هل أنت متأكد من مراجعة واعتماد فاتورة المورد "${invoice.supplier_name}" برقم "${invoice.invoice_number}"؟ سيتم ترحيل قيد اليومية المتوازن تلقائياً للأستاذ العام.`)) return;

    setActionLoading(true);
    try {
      await api.post(`/supplier-invoices/${invoice.id}/approve`);
      fetchSupplierInvoices();
    } catch (err) {
      alert(err.response?.data?.message || 'حدث خطأ أثناء اعتماد فاتورة المورد');
    } finally {
      setActionLoading(false);
    }
  };

  // Filtering
  const filteredContractorInvoices = contractorInvoices.filter((inv) => {
    const q = contractorSearch.toLowerCase();
    const matchesSearch =
      inv.contractor_name?.toLowerCase().includes(q) ||
      inv.project_name?.toLowerCase().includes(q) ||
      inv.invoice_number?.toLowerCase().includes(q) ||
      inv.contract_number?.toLowerCase().includes(q);
    const matchesStatus = contractorStatusFilter === 'all' || inv.status === contractorStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredSupplierInvoices = supplierInvoices.filter((inv) => {
    const q = supplierSearch.toLowerCase();
    const matchesSearch =
      inv.supplier_name?.toLowerCase().includes(q) ||
      inv.invoice_number?.toLowerCase().includes(q);
    const matchesStatus = supplierStatusFilter === 'all' || inv.status === supplierStatusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <ProtectedRoute allowedRoles={['branch_manager', 'data_entry', 'general_accountant']}>
      <AppLayout
        title="إدارة المقاولات والمشتريات"
        subtitle="مستخلصات مقاولي الباطن، احتساب حجز الضمان (Retention)، فواتير مشتريات الموردين، وترحيل القيود اليومية المتوازنة (UC-52 إلى UC-55)"
      >
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 mb-6 gap-2">
          <button
            onClick={() => setActiveTab('contractor')}
            className={`flex items-center gap-2 pb-3 px-4 text-xs font-bold transition-all border-b-2 ${
              activeTab === 'contractor'
                ? 'border-amber-500 text-amber-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <HardHat className="w-4 h-4" />
            <span>مستخلصات مقاولي الباطن (UC-52 إلى UC-54)</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-700">
              {contractorInvoices.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('supplier')}
            className={`flex items-center gap-2 pb-3 px-4 text-xs font-bold transition-all border-b-2 ${
              activeTab === 'supplier'
                ? 'border-amber-500 text-amber-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>فواتير مشتريات الموردين (UC-55)</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-700">
              {supplierInvoices.length}
            </span>
          </button>
        </div>

        {/* TAB 1: CONTRACTOR INVOICES */}
        {activeTab === 'contractor' && (
          <div>
            {/* Actions Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative w-full sm:w-80">
                  <input
                    type="text"
                    value={contractorSearch}
                    onChange={(e) => setContractorSearch(e.target.value)}
                    placeholder="البحث باسم المقاول أو المشروع أو رقم المستخلص..."
                    className="w-full pl-3 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 shadow-sm"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                </div>

                <select
                  value={contractorStatusFilter}
                  onChange={(e) => setContractorStatusFilter(e.target.value)}
                  className="py-2.5 px-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 shadow-sm focus:ring-2 focus:ring-amber-500"
                >
                  <option value="all">كافة الحالات</option>
                  <option value="draft">مسودة (بانتظار الاعتماد)</option>
                  <option value="approved">معتمد ومرحل للدفاتر</option>
                </select>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <button
                  onClick={fetchContractorInvoices}
                  disabled={isContractorLoading}
                  className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 shadow-sm transition-colors"
                  title="تحديث البيانات"
                >
                  <RefreshCw className={`w-4 h-4 ${isContractorLoading ? 'animate-spin' : ''}`} />
                </button>
                {(user?.role === 'data_entry' || user?.role === 'super_admin') && (
                  <button
                    onClick={() => {
                      setContractorFormError(null);
                      setShowAddContractorModal(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>مستخلص إنجاز جديد</span>
                  </button>
                )}
              </div>
            </div>

            {/* Contractor Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                    <tr>
                      <th className="py-3.5 px-4">رقم المستخلص</th>
                      <th className="py-3.5 px-4">اسم المقاول / المنفذ</th>
                      <th className="py-3.5 px-4">المشروع ورقم العقد</th>
                      <th className="py-3.5 px-4">تاريخ المستخلص</th>
                      <th className="py-3.5 px-4">قيمة الإنجاز</th>
                      <th className="py-3.5 px-4">ضمان الأعمال (10%)</th>
                      <th className="py-3.5 px-4">الضريبة (15%)</th>
                      <th className="py-3.5 px-4">الصافي المستحق</th>
                      <th className="py-3.5 px-4">الحالة</th>
                      <th className="py-3.5 px-4 text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {isContractorLoading ? (
                      <tr>
                        <td colSpan="10" className="py-12 text-center text-slate-400">
                          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-500" />
                          جاري تحميل مستخلصات المقاولين...
                        </td>
                      </tr>
                    ) : filteredContractorInvoices.length === 0 ? (
                      <tr>
                        <td colSpan="10" className="py-12 text-center text-slate-400">
                          لا توجد مستخلصات مسجلة
                        </td>
                      </tr>
                    ) : (
                      filteredContractorInvoices.map((inv) => (
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
                                  onClick={() => handleApproveContractorInvoice(inv)}
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
          </div>
        )}

        {/* TAB 2: SUPPLIER INVOICES (UC-55) */}
        {activeTab === 'supplier' && (
          <div>
            {/* Actions Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative w-full sm:w-80">
                  <input
                    type="text"
                    value={supplierSearch}
                    onChange={(e) => setSupplierSearch(e.target.value)}
                    placeholder="البحث باسم المورد أو رقم الفاتورة..."
                    className="w-full pl-3 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 shadow-sm"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                </div>

                <select
                  value={supplierStatusFilter}
                  onChange={(e) => setSupplierStatusFilter(e.target.value)}
                  className="py-2.5 px-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 shadow-sm focus:ring-2 focus:ring-amber-500"
                >
                  <option value="all">كافة الحالات</option>
                  <option value="draft">مسودة (بانتظار الاعتماد)</option>
                  <option value="approved">معتمد ومرحل للأستاذ العام</option>
                </select>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <button
                  onClick={fetchSupplierInvoices}
                  disabled={isSupplierLoading}
                  className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 shadow-sm transition-colors"
                  title="تحديث البيانات"
                >
                  <RefreshCw className={`w-4 h-4 ${isSupplierLoading ? 'animate-spin' : ''}`} />
                </button>
                {(user?.role === 'data_entry' || user?.role === 'super_admin') && (
                  <button
                    onClick={() => {
                      setSupplierFormError(null);
                      setShowAddSupplierModal(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>فاتورة مورد جديدة (UC-55)</span>
                  </button>
                )}
              </div>
            </div>

            {/* Supplier Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                    <tr>
                      <th className="py-3.5 px-4">رقم الفاتورة</th>
                      <th className="py-3.5 px-4">اسم المورد</th>
                      <th className="py-3.5 px-4">مركز التكلفة</th>
                      <th className="py-3.5 px-4">التاريخ</th>
                      <th className="py-3.5 px-4">إجمالي المشتريات</th>
                      <th className="py-3.5 px-4">الخصم المكتسب</th>
                      <th className="py-3.5 px-4">الضريبة</th>
                      <th className="py-3.5 px-4">الإجمالي المستحق</th>
                      <th className="py-3.5 px-4">شروط السداد</th>
                      <th className="py-3.5 px-4">الحالة</th>
                      <th className="py-3.5 px-4 text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {isSupplierLoading ? (
                      <tr>
                        <td colSpan="11" className="py-12 text-center text-slate-400">
                          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-500" />
                          جاري تحميل فواتير المشتريات والموردين...
                        </td>
                      </tr>
                    ) : filteredSupplierInvoices.length === 0 ? (
                      <tr>
                        <td colSpan="11" className="py-12 text-center text-slate-400">
                          لا توجد فواتير موردين مسجلة
                        </td>
                      </tr>
                    ) : (
                      filteredSupplierInvoices.map((inv) => (
                        <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                            {inv.invoice_number}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center gap-2">
                            <Truck className="w-4 h-4 text-sky-600 shrink-0" />
                            <span>{inv.supplier_name}</span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-600">
                            {inv.cost_center?.name_ar || inv.cost_center?.name || '—'}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-600">
                            {inv.date ? inv.date.split('T')[0] : '—'}
                          </td>
                          <td className="py-3.5 px-4 font-bold font-mono text-slate-900">
                            {Number(inv.gross_amount || 0).toLocaleString()} ر.س
                          </td>
                          <td className="py-3.5 px-4 font-mono text-emerald-600">
                            -{Number(inv.discount_earned || 0).toLocaleString()} ر.س
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-600">
                            +{Number(inv.tax_amount || 0).toLocaleString()} ر.س
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-sky-700 text-sm">
                            {Number(inv.total_payable || 0).toLocaleString()} ر.س
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                              {inv.payment_terms === 'cash' ? 'نقداً' : 'آجل (ذمم دائنة)'}
                            </span>
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
                                مسودة (بانتظار الاعتماد)
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {inv.status === 'draft' && (user?.role === 'general_accountant' || user?.role === 'super_admin') && (
                                <button
                                  onClick={() => handleApproveSupplierInvoice(inv)}
                                  disabled={actionLoading}
                                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-semibold shadow transition-colors"
                                  title="اعتماد الفاتورة وتوليد القيد المحاسبي"
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
          </div>
        )}

        {/* MODAL 1: ADD CONTRACTOR INVOICE */}
        {showAddContractorModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-lg overflow-hidden">
              <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <HardHat className="w-4 h-4 text-amber-500" />
                  <span>إدخال مستخلص إنجاز مقاول جديد (UC-52)</span>
                </h3>
                <button onClick={() => setShowAddContractorModal(false)} className="text-slate-400 hover:text-white">✕</button>
              </div>

              <form onSubmit={handleCreateContractorInvoice} className="p-6 space-y-4 text-xs">
                {contractorFormError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
                    <span>{contractorFormError}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1">اسم المقاول / الشركة المنفذة *</label>
                    <input
                      type="text"
                      required
                      value={contractorFormData.contractor_name}
                      onChange={(e) => setContractorFormData({ ...contractorFormData, contractor_name: e.target.value })}
                      placeholder="مثال: شركة الإنشاءات الحديثة المحدودة"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">اسم المشروع *</label>
                    <input
                      type="text"
                      required
                      value={contractorFormData.project_name}
                      onChange={(e) => setContractorFormData({ ...contractorFormData, project_name: e.target.value })}
                      placeholder="مشروع بناء مجمع الأندلس"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">رقم العقد *</label>
                    <input
                      type="text"
                      required
                      value={contractorFormData.contract_number}
                      onChange={(e) => setContractorFormData({ ...contractorFormData, contract_number: e.target.value })}
                      placeholder="CON-2026-08"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-amber-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">تاريخ المستخلص *</label>
                    <input
                      type="date"
                      required
                      value={contractorFormData.invoice_date}
                      onChange={(e) => setContractorFormData({ ...contractorFormData, invoice_date: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-amber-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">قيمة الإنجاز (المطالبة) ر.س *</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={contractorFormData.claim_amount}
                      onChange={(e) => setContractorFormData({ ...contractorFormData, claim_amount: e.target.value })}
                      placeholder="100000"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-amber-500 focus:bg-white font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">نسبة ضمان الأعمال (Retention) *</label>
                    <select
                      value={contractorFormData.retention_rate}
                      onChange={(e) => setContractorFormData({ ...contractorFormData, retention_rate: parseFloat(e.target.value) })}
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
                      value={contractorFormData.vat_rate}
                      onChange={(e) => setContractorFormData({ ...contractorFormData, vat_rate: parseFloat(e.target.value) })}
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
                    <span>خصم ضمان الأعمال المحجوز ({contractorFormData.retention_rate}%):</span>
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
                    value={contractorFormData.notes}
                    onChange={(e) => setContractorFormData({ ...contractorFormData, notes: e.target.value })}
                    placeholder="ملاحظات حول نسبة الإنجاز والبنود المنجزة..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:bg-white"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowAddContractorModal(false)}
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

        {/* MODAL 2: ADD SUPPLIER INVOICE (UC-55) */}
        {showAddSupplierModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-lg overflow-hidden">
              <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <Truck className="w-4 h-4 text-sky-400" />
                  <span>إدخال فاتورة مشتريات مورد (UC-55)</span>
                </h3>
                <button onClick={() => setShowAddSupplierModal(false)} className="text-slate-400 hover:text-white">✕</button>
              </div>

              <form onSubmit={handleCreateSupplierInvoice} className="p-6 space-y-4 text-xs">
                {supplierFormError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
                    <span>{supplierFormError}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1">اسم المورد / الشركة الموردة *</label>
                    <input
                      type="text"
                      required
                      value={supplierFormData.supplier_name}
                      onChange={(e) => setSupplierFormData({ ...supplierFormData, supplier_name: e.target.value })}
                      placeholder="مثال: شركة التوريدات الإنشائية المتكاملة"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-sky-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">رقم فاتورة المورد *</label>
                    <input
                      type="text"
                      required
                      value={supplierFormData.invoice_number}
                      onChange={(e) => setSupplierFormData({ ...supplierFormData, invoice_number: e.target.value })}
                      placeholder="INV-SUP-2026-001"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-sky-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">تاريخ الفاتورة *</label>
                    <input
                      type="date"
                      required
                      value={supplierFormData.date}
                      onChange={(e) => setSupplierFormData({ ...supplierFormData, date: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-sky-500 focus:bg-white"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1">مركز التكلفة المرتبط *</label>
                    <select
                      required
                      value={supplierFormData.cost_center_id}
                      onChange={(e) => setSupplierFormData({ ...supplierFormData, cost_center_id: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-sky-500 focus:bg-white"
                    >
                      <option value="">اختر مركز التكلفة...</option>
                      {costCenters.map((cc) => (
                        <option key={cc.id} value={cc.id}>
                          {cc.code} - {cc.name_ar || cc.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">إجمالي المشتريات (Gross) ر.س *</label>
                    <input
                      type="number"
                      required
                      min={0.01}
                      step="0.01"
                      value={supplierFormData.gross_amount}
                      onChange={(e) => setSupplierFormData({ ...supplierFormData, gross_amount: e.target.value })}
                      placeholder="50000"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-sky-500 focus:bg-white font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">الخصم المكتسب (Discount) ر.س</label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={supplierFormData.discount_earned}
                      onChange={(e) => setSupplierFormData({ ...supplierFormData, discount_earned: e.target.value })}
                      placeholder="0"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-sky-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">نوع الضريبة *</label>
                    <select
                      value={supplierFormData.tax_type}
                      onChange={(e) => setSupplierFormData({ ...supplierFormData, tax_type: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-sky-500 focus:bg-white"
                    >
                      <option value="vat">ضريبة القيمة المضافة (15% VAT)</option>
                      <option value="excise">ضريبة السلع الانتقائية (5%)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">شروط السداد *</label>
                    <select
                      value={supplierFormData.payment_terms}
                      onChange={(e) => setSupplierFormData({ ...supplierFormData, payment_terms: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-sky-500 focus:bg-white"
                    >
                      <option value="credit">آجل (ذمم دائنة / حساب الموردين)</option>
                      <option value="cash">نقداً (الصندوق / البنك)</option>
                    </select>
                  </div>
                </div>

                {/* Live Financial Breakdown Card */}
                <div className="bg-sky-50/60 p-3.5 rounded-xl border border-sky-100 space-y-2">
                  <div className="flex justify-between text-slate-600">
                    <span>إجمالي المشتريات:</span>
                    <span className="font-mono font-semibold">{suppGross.toLocaleString()} ر.س</span>
                  </div>
                  <div className="flex justify-between text-emerald-600">
                    <span>الخصم المكتسب:</span>
                    <span className="font-mono font-semibold">-{suppDiscount.toLocaleString()} ر.س</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>قيمة الضريبة ({supplierFormData.tax_type === 'vat' ? '15%' : '5%'}):</span>
                    <span className="font-mono font-semibold">+{suppTax.toLocaleString()} ر.س</span>
                  </div>
                  <div className="flex justify-between border-t border-sky-200 pt-2 font-bold text-slate-900 text-sm">
                    <span>الإجمالي المستحق للمورد:</span>
                    <span className="font-mono text-sky-800">{suppTotalPayable.toLocaleString()} ر.س</span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowAddSupplierModal(false)}
                    className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading || suppGross <= 0}
                    className="px-5 py-2 bg-sky-900 hover:bg-sky-800 text-white font-semibold rounded-xl shadow disabled:opacity-50"
                  >
                    {actionLoading ? 'جاري الحفظ...' : 'حفظ الفاتورة (مسودة)'}
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
