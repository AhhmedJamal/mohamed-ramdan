'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '../../components/AppLayout';
import ProtectedRoute from '../../components/ProtectedRoute';
import api from '../../services/api';
import {
  Receipt,
  Plus,
  CheckCircle2,
  XCircle,
  Printer,
  Filter,
  AlertCircle,
  DollarSign,
  Search,
  Calendar,
  Building,
  ArrowUpRight,
  ArrowDownLeft,
  X,
  Eye,
  Edit,
  Clock,
  FileCheck
} from 'lucide-react';

export default function VouchersPage() {
  const [vouchers, setVouchers] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [costCenters, setCostCenters] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState('');

  // Filters
  const [filterType, setFilterType] = useState('all'); // all, receipt, disbursement
  const [filterStatus, setFilterStatus] = useState('all'); // all, draft, approved, rejected
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [disbursementModalOpen, setDisbursementModalOpen] = useState(false);
  const [editVoucherModal, setEditVoucherModal] = useState(null);
  const [approveVoucherModal, setApproveVoucherModal] = useState(null);
  const [rejectModalVoucher, setRejectModalVoucher] = useState(null);
  const [printModalVoucher, setPrintModalVoucher] = useState(null);

  // Receipt Voucher Form State (UC-43)
  const [receiptForm, setReceiptForm] = useState({
    contract_id: '',
    installment_id: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    payment_method: 'bank_transfer',
    debit_account_id: '',
    credit_account_id: '',
    notes: '',
  });
  const [selectedContractInstallments, setSelectedContractInstallments] = useState([]);
  const [selectedInstallmentRemaining, setSelectedInstallmentRemaining] = useState(0);
  const [receiptCostCenterName, setReceiptCostCenterName] = useState('');

  // Disbursement Voucher Form State (UC-44)
  const [disbursementForm, setDisbursementForm] = useState({
    expense_type: 'maintenance',
    cost_center_id: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    payment_method: 'bank_transfer',
    debit_account_id: '',
    credit_account_id: '',
    notes: '',
  });

  // Rejection Reason State (UC-48)
  const [rejectionReason, setRejectionReason] = useState('');

  // Detect user role
  useEffect(() => {
    try {
      const stored = localStorage.getItem('auth_user');
      if (stored) {
        const u = JSON.parse(stored);
        setUserRole(u.active_role || u.role || '');
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [vouchersRes, contractsRes, ccRes, accountsRes] = await Promise.all([
        api.get('/vouchers').catch(() => ({ data: { data: [] } })),
        api.get('/contracts').catch(() => ({ data: { data: [] } })),
        api.get('/cost-centers').catch(() => ({ data: { data: [] } })),
        api.get('/accounts').catch(() => ({ data: { data: [] } })),
      ]);
      setVouchers(vouchersRes.data.data || []);
      setContracts(contractsRes.data.data || []);
      setCostCenters(ccRes.data.data || []);
      setAccounts(accountsRes.data.data || []);
    } catch (err) {
      console.error('Failed to fetch voucher dependencies', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // When a contract is selected in Receipt form
  const handleContractChange = (contractId) => {
    setReceiptForm((prev) => ({
      ...prev,
      contract_id: contractId,
      installment_id: '',
      amount: '',
    }));
    const found = contracts.find((c) => String(c.id) === String(contractId));
    if (found) {
      // Filter unpaid or due installments
      const dueInsts = (found.installments || []).filter((i) => i.status !== 'paid' && i.status !== 'cancelled');
      setSelectedContractInstallments(dueInsts);
      setReceiptCostCenterName(found.property?.name || 'مركز العقار');
    } else {
      setSelectedContractInstallments([]);
      setReceiptCostCenterName('');
    }
  };

  // When an installment is selected in Receipt form
  const handleInstallmentChange = (installmentId) => {
    const inst = selectedContractInstallments.find((i) => String(i.id) === String(installmentId));
    if (inst) {
      const remaining = Math.max(0, Number(inst.amount) - Number(inst.paid_amount || 0));
      setSelectedInstallmentRemaining(remaining);
      setReceiptForm((prev) => ({
        ...prev,
        installment_id: installmentId,
        amount: remaining > 0 ? remaining : inst.amount,
      }));
    } else {
      setSelectedInstallmentRemaining(0);
      setReceiptForm((prev) => ({ ...prev, installment_id: installmentId }));
    }
  };

  // UC-43: Submit Receipt Voucher
  const handleCreateReceiptVoucher = async (e) => {
    e.preventDefault();
    if (Number(receiptForm.amount) <= 0) {
      alert('المبلغ يجب أن يكون أكبر من 0');
      return;
    }
    if (selectedInstallmentRemaining > 0 && Number(receiptForm.amount) > selectedInstallmentRemaining + 0.01) {
      alert('المبلغ يتجاوز قيمة الدفعة المتبقية (UC-43 Alternative 1)');
      return;
    }

    try {
      await api.post('/vouchers/receipt', receiptForm);
      alert('تم حفظ سند القبض كمسودة وإرساله للمحاسب العام للاعتماد بنجاح (UC-43)');
      setReceiptModalOpen(false);
      setReceiptForm({
        contract_id: '',
        installment_id: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        payment_method: 'bank_transfer',
        debit_account_id: '',
        credit_account_id: '',
        notes: '',
      });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'فشل في حفظ سند القبض');
    }
  };

  // UC-44: Submit Disbursement Voucher
  const handleCreateDisbursementVoucher = async (e) => {
    e.preventDefault();
    if (Number(disbursementForm.amount) <= 0) {
      alert('المبلغ يجب أن يكون أكبر من 0 (UC-44 Alternative 1)');
      return;
    }
    try {
      await api.post('/vouchers/disbursement', disbursementForm);
      alert('تم حفظ سند الصرف كمسودة وإرساله للمحاسب العام للاعتماد بنجاح (UC-44)');
      setDisbursementModalOpen(false);
      setDisbursementForm({
        expense_type: 'maintenance',
        cost_center_id: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        payment_method: 'bank_transfer',
        debit_account_id: '',
        credit_account_id: '',
        notes: '',
      });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'فشل في حفظ سند الصرف');
    }
  };

  // UC-45: Edit & Resubmit Rejected Voucher
  const handleUpdateVoucher = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/vouchers/${editVoucherModal.id}`, {
        amount: editVoucherModal.amount,
        date: editVoucherModal.date,
        payment_method: editVoucherModal.payment_method,
        expense_type: editVoucherModal.expense_type,
        cost_center_id: editVoucherModal.cost_center_id,
        notes: editVoucherModal.notes,
      });
      alert('تم تعديل السند وإعادة إرساله كمسودة للمحاسب العام بنجاح (UC-45)');
      setEditVoucherModal(null);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'فشل في تعديل السند');
    }
  };

  // UC-47: Approve Voucher (General Accountant)
  const handleApprove = async (id) => {
    try {
      await api.post(`/vouchers/${id}/approve`);
      alert('تم اعتماد السند وتوليد القيد المحاسبي المتوازن وترحيله لدفتر الأستاذ بنجاح (UC-47)');
      setApproveVoucherModal(null);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'فشل في اعتماد السند');
    }
  };

  // UC-48: Reject Voucher with Mandatory Reason (General Accountant)
  const handleReject = async (e) => {
    e.preventDefault();
    if (!rejectionReason || rejectionReason.trim().length < 10) {
      alert('يجب إدخال سبب الرفض بحيث لا يقل عن 10 أحرف (UC-48)');
      return;
    }
    try {
      await api.post(`/vouchers/${rejectModalVoucher.id}/reject`, {
        rejection_reason: rejectionReason,
      });
      alert('تم رفض السند وإشعار مدخل البيانات لتصحيحه بنجاح (UC-48)');
      setRejectModalVoucher(null);
      setRejectionReason('');
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'فشل في رفض السند');
    }
  };

  // Filtered Vouchers
  const filteredVouchers = vouchers.filter((v) => {
    const matchesType = filterType === 'all' || v.type === filterType;
    const matchesStatus = filterStatus === 'all' || v.status === filterStatus;
    const matchesSearch =
      searchTerm === '' ||
      v.voucher_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.contract?.tenant?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.cost_center?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.notes?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesType && matchesStatus && matchesSearch;
  });

  const pendingDraftsCount = vouchers.filter((v) => v.status === 'draft').length;
  const rejectedCount = vouchers.filter((v) => v.status === 'rejected').length;

  const totalApprovedReceipts = vouchers
    .filter((v) => v.type === 'receipt' && v.status === 'approved')
    .reduce((sum, v) => sum + Number(v.amount), 0);

  const totalApprovedDisbursements = vouchers
    .filter((v) => v.type === 'disbursement' && v.status === 'approved')
    .reduce((sum, v) => sum + Number(v.amount), 0);

  return (
    <ProtectedRoute allowedRoles={['branch_manager', 'data_entry', 'general_accountant', 'super_admin']}>
      <AppLayout
        title="السندات المالية (قبض وصرف) (UC-43 - UC-48)"
        subtitle="دورة صانع القرار والمدقق (Maker-Checker)، ترحيل القيود المتوازنة لدفتر الأستاذ"
      >
        {/* Pending Review Banner for General Accountant */}
        {pendingDraftsCount > 0 && (userRole === 'general_accountant' || userRole === 'super_admin') && (
          <div className="mb-6 p-4 bg-amber-500/10 border border-amber-300 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600" />
              <div>
                <h4 className="text-sm font-bold text-amber-900">
                  تنبيه محاسبي: يوجد {pendingDraftsCount} سند مسودة جديد بانتظار اعتمادك المالي (UC-46)
                </h4>
                <p className="text-xs text-amber-700">
                  السندات لا تؤثر على الدفاتر حتى اعتمادها وترحيل قيودها المحاسبية تلقائياً.
                </p>
              </div>
            </div>
            <button
              onClick={() => setFilterStatus('draft')}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl transition-all shadow-sm"
            >
              عرض المسودات المعلقة
            </button>
          </div>
        )}

        {/* Statistical KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-500">إجمالي المقبوضات المعتمدة</span>
              <div className="text-sm font-bold font-mono text-slate-900 mt-0.5">
                {totalApprovedReceipts.toLocaleString(undefined, { minimumFractionDigits: 2 })} ر.س
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <ArrowUpRight className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-500">إجمالي المصروفات المعتمدة</span>
              <div className="text-sm font-bold font-mono text-slate-900 mt-0.5">
                {totalApprovedDisbursements.toLocaleString(undefined, { minimumFractionDigits: 2 })} ر.س
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-500">مسودات معلقة للاعتماد</span>
              <div className="text-sm font-bold font-mono text-amber-800 mt-0.5">
                {pendingDraftsCount} سند مسودة
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
              <XCircle className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-500">سندات مرفوضة للتعديل</span>
              <div className="text-sm font-bold font-mono text-red-800 mt-0.5">
                {rejectedCount} سند مرفوض
              </div>
            </div>
          </div>
        </div>

        {/* Top Control Bar: Search, Filters & Action Buttons */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Search */}
            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 absolute right-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="بحث برقم السند، الطرف، مركز التكلفة..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-3 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-slate-900 focus:outline-none"
              />
            </div>

            {/* Type Filter */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-slate-900 focus:outline-none"
            >
              <option value="all">جميع الأنواع</option>
              <option value="receipt">سندات القبض (تحصيل)</option>
              <option value="disbursement">سندات الصرف (مصروفات)</option>
            </select>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-slate-900 focus:outline-none"
            >
              <option value="all">جميع الحالات</option>
              <option value="draft">مسودة معلقة ({pendingDraftsCount})</option>
              <option value="approved">معتمد ومرحل</option>
              <option value="rejected">مرفوض للتعديل ({rejectedCount})</option>
            </select>
          </div>

          {/* Maker Actions (Data Entry & Super Admin only per Section 1.6) */}
          {(userRole === 'data_entry' || userRole === 'super_admin' || !userRole) && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setReceiptModalOpen(true)}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-all whitespace-nowrap"
              >
                <ArrowDownLeft className="w-4 h-4" />
                <span>سند قبض جديد (UC-43)</span>
              </button>
              <button
                onClick={() => setDisbursementModalOpen(true)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-all whitespace-nowrap"
              >
                <ArrowUpRight className="w-4 h-4" />
                <span>سند صرف جديد (UC-44)</span>
              </button>
            </div>
          )}
        </div>

        {/* Vouchers Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-8">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-6">رقم السند</th>
                  <th className="py-3.5 px-6">النوع</th>
                  <th className="py-3.5 px-6">التاريخ</th>
                  <th className="py-3.5 px-6">المبلغ (ر.س)</th>
                  <th className="py-3.5 px-6">طريقة الدفع</th>
                  <th className="py-3.5 px-6">مركز التكلفة</th>
                  <th className="py-3.5 px-6">الحالة</th>
                  <th className="py-3.5 px-6 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan="8" className="py-12 text-center text-slate-400">
                      جاري تحميل بيانات السندات المالية...
                    </td>
                  </tr>
                ) : filteredVouchers.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="py-12 text-center text-slate-400">
                      لا توجد سندات مالية مسجلة مطابقة للبحث أو الفلتر
                    </td>
                  </tr>
                ) : (
                  filteredVouchers.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-4 px-6 font-mono font-bold text-slate-900">{v.voucher_number}</td>
                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                            v.type === 'receipt'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {v.type === 'receipt' ? (
                            <>
                              <ArrowDownLeft className="w-3 h-3" />
                              <span>سند قبض</span>
                            </>
                          ) : (
                            <>
                              <ArrowUpRight className="w-3 h-3" />
                              <span>سند صرف</span>
                            </>
                          )}
                        </span>
                      </td>
                      <td className="py-4 px-6 font-mono text-slate-600 text-[11px]">{v.date}</td>
                      <td className="py-4 px-6 font-mono font-bold text-slate-900">
                        {Number(v.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-4 px-6 text-slate-700">
                        {v.payment_method === 'cash' && 'نقداً (خزينة)'}
                        {v.payment_method === 'bank_transfer' && 'تحويل بنكي'}
                        {v.payment_method === 'cheque' && 'شيك مصرفي'}
                      </td>
                      <td className="py-4 px-6 text-slate-700 font-medium">
                        {v.cost_center?.name || v.contract?.property?.name || '—'}
                      </td>
                      <td className="py-4 px-6">
                        {v.status === 'approved' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>معتمد ومرحل</span>
                          </span>
                        )}
                        {v.status === 'draft' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-300">
                            <Clock className="w-3 h-3 text-amber-600" />
                            <span>مسودة معلقة</span>
                          </span>
                        )}
                        {v.status === 'rejected' && (
                          <div>
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                              <XCircle className="w-3 h-3" />
                              <span>مرفوض للتعديل</span>
                            </span>
                            {v.rejection_reason && (
                              <p className="text-[10px] text-rose-600 mt-1 max-w-[200px] truncate" title={v.rejection_reason}>
                                سبب: {v.rejection_reason}
                              </p>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          {/* Checker Approval & Review (General Accountant) */}
                          {(userRole === 'general_accountant' || userRole === 'super_admin') &&
                            v.status === 'draft' && (
                              <>
                                <button
                                  onClick={() => setApproveVoucherModal(v)}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-sm transition-all"
                                  title="اعتماد السند وترحيل القيد (UC-47)"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>اعتماد</span>
                                </button>
                                <button
                                  onClick={() => {
                                    setRejectModalVoucher(v);
                                    setRejectionReason('');
                                  }}
                                  className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all"
                                  title="رفض السند مع ذكر السبب (UC-48)"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                  <span>رفض</span>
                                </button>
                              </>
                            )}

                          {/* Maker Edit Rejected / Draft Voucher (Data Entry) */}
                          {(userRole === 'data_entry' || userRole === 'super_admin' || !userRole) &&
                            (v.status === 'rejected' || v.status === 'draft') && (
                              <button
                                onClick={() => setEditVoucherModal({ ...v })}
                                className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all"
                                title="تعديل وإعادة إرسال السند (UC-45)"
                              >
                                <Edit className="w-3.5 h-3.5" />
                                <span>{v.status === 'rejected' ? 'تعديل وإعادة إرسال' : 'تعديل'}</span>
                              </button>
                            )}

                          {/* Print Voucher Modal Trigger */}
                          <button
                            onClick={() => setPrintModalVoucher(v)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all"
                            title="معاينة وطباعة السند الرسمي"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>طباعة</span>
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

        {/* MODAL 1: Create Receipt Voucher Modal (UC-43) */}
        {receiptModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 my-8">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  <ArrowDownLeft className="w-5 h-5 text-emerald-600" />
                  <span>تحرير سند قبض مسودة (تحصيل إيجار) - UC-43</span>
                </h3>
                <button
                  onClick={() => setReceiptModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateReceiptVoucher} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Contract Selector */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      عقد الإيجار النشط *
                    </label>
                    <select
                      value={receiptForm.contract_id}
                      onChange={(e) => handleContractChange(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-slate-900 focus:outline-none"
                      required
                    >
                      <option value="">اختر العقد...</option>
                      {contracts.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.contract_number} ({c.tenant?.name}) - {c.property?.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Installment Selector */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      الدفعة المستحقة *
                    </label>
                    <select
                      value={receiptForm.installment_id}
                      onChange={(e) => handleInstallmentChange(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-slate-900 focus:outline-none"
                      required
                    >
                      <option value="">اختر الدفعة...</option>
                      {selectedContractInstallments.map((i) => {
                        const rem = Math.max(0, Number(i.amount) - Number(i.paid_amount || 0));
                        return (
                          <option key={i.id} value={i.id}>
                            قسط #{i.installment_number} (تاريخ: {i.due_date}) - المتبقي: {rem.toLocaleString()} ر.س
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* Amount */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      المبلغ المحصل (ر.س) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={receiptForm.amount}
                      onChange={(e) => setReceiptForm({ ...receiptForm, amount: e.target.value })}
                      placeholder="0.00"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-slate-900 focus:outline-none"
                      required
                    />
                    {selectedInstallmentRemaining > 0 && (
                      <p className="text-[11px] text-slate-500 mt-1">
                        أقصى مبلغ متبقي للدفعة: {selectedInstallmentRemaining.toLocaleString()} ر.س
                      </p>
                    )}
                  </div>

                  {/* Date */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      تاريخ التحصيل *
                    </label>
                    <input
                      type="date"
                      value={receiptForm.date}
                      onChange={(e) => setReceiptForm({ ...receiptForm, date: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:ring-2 focus:ring-slate-900 focus:outline-none"
                      required
                    />
                  </div>

                  {/* Cost Center Auto-filled */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      مركز التكلفة (يُملأ تلقائياً من العقد)
                    </label>
                    <input
                      type="text"
                      disabled
                      value={receiptCostCenterName || 'يحدد تلقائياً من العقار'}
                      className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-600 font-semibold cursor-not-allowed"
                    />
                  </div>

                  {/* Payment Method */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      طريقة الدفع *
                    </label>
                    <select
                      value={receiptForm.payment_method}
                      onChange={(e) => setReceiptForm({ ...receiptForm, payment_method: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-slate-900 focus:outline-none"
                    >
                      <option value="bank_transfer">تحويل بنكي</option>
                      <option value="cash">نقداً (خزينة)</option>
                      <option value="cheque">شيك مصرفي</option>
                    </select>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    البيان / ملاحظات التحصيل
                  </label>
                  <textarea
                    rows={2}
                    value={receiptForm.notes}
                    onChange={(e) => setReceiptForm({ ...receiptForm, notes: e.target.value })}
                    placeholder="ملاحظات إضافية عن السند أو رقم الحوالة..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setReceiptModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-xl shadow-sm"
                  >
                    حفظ السند كمسودة (UC-43)
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 2: Create Disbursement Voucher Modal (UC-44) */}
        {disbursementModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 my-8">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  <ArrowUpRight className="w-5 h-5 text-rose-600" />
                  <span>تحرير سند صرف مسودة (مصروفات) - UC-44</span>
                </h3>
                <button
                  onClick={() => setDisbursementModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateDisbursementVoucher} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Expense Type */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      نوع المصروف *
                    </label>
                    <select
                      value={disbursementForm.expense_type}
                      onChange={(e) => setDisbursementForm({ ...disbursementForm, expense_type: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-slate-900 focus:outline-none"
                      required
                    >
                      <option value="maintenance">صيانة دورية وإصلاحات</option>
                      <option value="electricity">كهرباء وإنارة</option>
                      <option value="water">مياه وصرف</option>
                      <option value="rent">إيجارات تشغيلية</option>
                      <option value="salaries">رواتب وأجور</option>
                      <option value="other">مصروفات أخرى</option>
                    </select>
                  </div>

                  {/* Cost Center */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      مركز التكلفة المرتبط *
                    </label>
                    <select
                      value={disbursementForm.cost_center_id}
                      onChange={(e) => setDisbursementForm({ ...disbursementForm, cost_center_id: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-slate-900 focus:outline-none"
                      required
                    >
                      <option value="">اختر مركز التكلفة...</option>
                      {costCenters.map((cc) => (
                        <option key={cc.id} value={cc.id}>
                          {cc.name} ({cc.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Amount */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      المبلغ المصروف (ر.س) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={disbursementForm.amount}
                      onChange={(e) => setDisbursementForm({ ...disbursementForm, amount: e.target.value })}
                      placeholder="0.00"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-slate-900 focus:outline-none"
                      required
                    />
                  </div>

                  {/* Date */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      تاريخ الصرف *
                    </label>
                    <input
                      type="date"
                      value={disbursementForm.date}
                      onChange={(e) => setDisbursementForm({ ...disbursementForm, date: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:ring-2 focus:ring-slate-900 focus:outline-none"
                      required
                    />
                  </div>

                  {/* Payment Method */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      طريقة الصرف *
                    </label>
                    <select
                      value={disbursementForm.payment_method}
                      onChange={(e) => setDisbursementForm({ ...disbursementForm, payment_method: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-slate-900 focus:outline-none"
                    >
                      <option value="bank_transfer">تحويل بنكي</option>
                      <option value="cash">نقداً (خزينة)</option>
                      <option value="cheque">شيك مصرفي</option>
                    </select>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    البيان التفصيلي للمصروف *
                  </label>
                  <textarea
                    rows={2}
                    value={disbursementForm.notes}
                    onChange={(e) => setDisbursementForm({ ...disbursementForm, notes: e.target.value })}
                    placeholder="بيان سبب الصرف والمستفيد وأرقام الفواتير..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-slate-900 focus:outline-none"
                    required
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setDisbursementModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-sm"
                  >
                    حفظ السند كمسودة (UC-44)
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 3: Edit Rejected / Draft Voucher (UC-45) */}
        {editVoucherModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 my-8">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  <Edit className="w-5 h-5 text-amber-600" />
                  <span>تعديل السند وإعادة الإرسال للمحاسب (UC-45): {editVoucherModal.voucher_number}</span>
                </h3>
                <button
                  onClick={() => setEditVoucherModal(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Show Rejection Reason if Rejected */}
              {editVoucherModal.status === 'rejected' && editVoucherModal.rejection_reason && (
                <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900">
                  <span className="font-bold block mb-1">سبب الرفض المسجل من المحاسب العام:</span>
                  <p>{editVoucherModal.rejection_reason}</p>
                </div>
              )}

              <form onSubmit={handleUpdateVoucher} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">المبلغ (ر.س) *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editVoucherModal.amount}
                      onChange={(e) => setEditVoucherModal({ ...editVoucherModal, amount: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">التاريخ *</label>
                    <input
                      type="date"
                      value={editVoucherModal.date}
                      onChange={(e) => setEditVoucherModal({ ...editVoucherModal, date: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">طريقة الدفع *</label>
                  <select
                    value={editVoucherModal.payment_method}
                    onChange={(e) => setEditVoucherModal({ ...editVoucherModal, payment_method: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
                  >
                    <option value="bank_transfer">تحويل بنكي</option>
                    <option value="cash">نقداً (خزينة)</option>
                    <option value="cheque">شيك مصرفي</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">البيان / ملاحظات التصحيح</label>
                  <textarea
                    rows={3}
                    value={editVoucherModal.notes || ''}
                    onChange={(e) => setEditVoucherModal({ ...editVoucherModal, notes: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setEditVoucherModal(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-sm"
                  >
                    حفظ وإعادة الإرسال كمسودة (UC-45)
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 4: Review & Approve with Balanced Journal Preview (UC-46, UC-47) */}
        {approveVoucherModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 my-8">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  <FileCheck className="w-5 h-5 text-emerald-600" />
                  <span>اعتماد السند وتوليد القيد المحاسبي المتوازن (UC-47)</span>
                </h3>
                <button
                  onClick={() => setApproveVoucherModal(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Voucher Overview */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs mb-4">
                <div>
                  <span className="text-slate-500 block">رقم السند:</span>
                  <span className="font-bold font-mono text-slate-900">{approveVoucherModal.voucher_number}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">المبلغ:</span>
                  <span className="font-bold font-mono text-slate-900">
                    {Number(approveVoucherModal.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })} ر.س
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">مركز التكلفة:</span>
                  <span className="font-semibold text-slate-800">
                    {approveVoucherModal.cost_center?.name || approveVoucherModal.contract?.property?.name || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">تاريخ العملية:</span>
                  <span className="font-mono text-slate-800">{approveVoucherModal.date}</span>
                </div>
              </div>

              {/* Live Double-Entry Balancing Preview */}
              <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl mb-4">
                <h4 className="text-xs font-bold text-emerald-950 mb-2 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>معاينة القيد المحاسبي الآلي (Total Debit - Total Credit = 0)</span>
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-emerald-100">
                    <span className="text-slate-700">
                      <strong>طرف مدين:</strong> {approveVoucherModal.debit_account?.name || 'حساب الخزينة / البنك'}
                    </span>
                    <span className="font-mono font-bold text-emerald-700">
                      +{Number(approveVoucherModal.amount).toLocaleString()} ر.س
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-emerald-100">
                    <span className="text-slate-700">
                      <strong>طرف دائن:</strong> {approveVoucherModal.credit_account?.name || 'حساب إيرادات الإيجار'}
                    </span>
                    <span className="font-mono font-bold text-slate-700">
                      -{Number(approveVoucherModal.amount).toLocaleString()} ر.س
                    </span>
                  </div>
                </div>
                <div className="mt-3 pt-2 border-t border-emerald-200 flex items-center justify-between text-[11px] font-bold text-emerald-900">
                  <span>فرق التوازن (Balance):</span>
                  <span>0.00 ر.س (متوازن ومستوفٍ لشرط الترحيل)</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setApproveVoucherModal(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={() => handleApprove(approveVoucherModal.id)}
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-xl shadow-sm"
                >
                  تأكيد الاعتماد والترحيل لدفتر الأستاذ
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 5: Mandatory Rejection Reason Modal (UC-48) */}
        {rejectModalVoucher && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-rose-600" />
                  <span>رفض السند المالي (UC-48)</span>
                </h4>
                <button
                  onClick={() => setRejectModalVoucher(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                وفقاً لـ SRS (Section 2.8 / UC-48)، سبب الرفض إلزامي ويجب ألا يقل عن 10 أحرف لتوضيح أوجه القصور لمدخل البيانات.
              </p>

              <form onSubmit={handleReject}>
                <div className="mb-2">
                  <div className="flex justify-between items-center text-[11px] mb-1">
                    <span className="font-semibold text-slate-700">سبب الرفض المفصل *</span>
                    <span
                      className={`font-mono ${
                        rejectionReason.length < 10 ? 'text-rose-600 font-bold' : 'text-emerald-600'
                      }`}
                    >
                      {rejectionReason.length} / 10 أحرف كحد أدنى
                    </span>
                  </div>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="اكتب سبب رفض السند بالتفصيل (خطأ في المبلغ، إرفاق إيصال خاطئ، حساب غير مطابق)..."
                    rows="4"
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-rose-500 text-slate-900"
                    required
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setRejectModalVoucher(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={rejectionReason.trim().length < 10}
                    className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl disabled:opacity-40 shadow-sm"
                  >
                    تأكيد الرفض وإشعار مدخل البيانات
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 6: Formal Printable Voucher View */}
        {printModalVoucher && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto print:p-0 print:bg-white print:fixed print:inset-0">
            <div className="bg-white rounded-2xl max-w-3xl w-full p-8 shadow-2xl border border-slate-200 my-8 print:border-none print:shadow-none print:p-0 print:my-0">
              {/* Header controls (hidden during print) */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-6 print:hidden">
                <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  <Printer className="w-5 h-5 text-slate-700" />
                  <span>معاينة السند المالي الرسمي للطباعة</span>
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => window.print()}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-sm"
                  >
                    <Printer className="w-4 h-4" />
                    <span>طباعة الآن (Print / PDF)</span>
                  </button>
                  <button
                    onClick={() => setPrintModalVoucher(null)}
                    className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Official Printable Sheet */}
              <div className="print-content text-slate-900 font-sans border-2 border-slate-800 p-8 rounded-xl bg-white">
                {/* Official Header */}
                <div className="text-center border-b-2 border-slate-800 pb-6 mb-6">
                  <div className="text-xs text-slate-500 font-semibold mb-1">المملكة العربية السعودية</div>
                  <h2 className="text-xl font-black text-slate-900 mb-1">
                    مجموعة محمد رمضان للاستثمار العقاري والمقاولات
                  </h2>
                  <div className="inline-block px-4 py-1 bg-slate-900 text-white font-bold text-sm rounded-lg mt-2">
                    {printModalVoucher.type === 'receipt' ? 'سند قبض رسمي (Receipt Voucher)' : 'سند صرف رسمي (Payment Voucher)'}
                  </div>
                  <div className="mt-3 text-xs font-mono font-semibold text-slate-600">
                    رقم السند: {printModalVoucher.voucher_number} | التاريخ: {printModalVoucher.date}
                  </div>
                </div>

                {/* Amount Box */}
                <div className="p-4 bg-slate-50 border-2 border-slate-300 rounded-xl mb-6 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-500 block">المبلغ بالأرقام:</span>
                    <span className="text-xl font-black font-mono text-slate-900">
                      {Number(printModalVoucher.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })} ر.س
                    </span>
                  </div>
                  <div className="text-left">
                    <span className="text-xs text-slate-500 block">طريقة الدفع:</span>
                    <span className="font-bold text-sm text-slate-800">
                      {printModalVoucher.payment_method === 'cash' && 'نقداً (خزينة)'}
                      {printModalVoucher.payment_method === 'bank_transfer' && 'تحويل مصرفي'}
                      {printModalVoucher.payment_method === 'cheque' && 'شيك مصرفي'}
                    </span>
                  </div>
                </div>

                {/* Voucher Details */}
                <div className="space-y-3 text-xs mb-8 border-b border-slate-200 pb-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="font-bold">
                        {printModalVoucher.type === 'receipt' ? 'استلمنا من السيد/السادة:' : 'اصرفوا إلى السيد/السادة:'}
                      </span>{' '}
                      <span className="text-slate-800">
                        {printModalVoucher.contract?.tenant?.name || printModalVoucher.party_name || 'الطرف المعني'}
                      </span>
                    </div>
                    <div>
                      <span className="font-bold">مركز التكلفة / المشروع:</span>{' '}
                      <span className="text-slate-800">
                        {printModalVoucher.cost_center?.name || printModalVoucher.contract?.property?.name || 'عام'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <span className="font-bold">وذلك عن (البيان):</span>{' '}
                    <span className="text-slate-800">
                      {printModalVoucher.notes ||
                        (printModalVoucher.type === 'receipt'
                          ? `تحصيل قسط إيجاري بموجب عقد رقم ${printModalVoucher.contract?.contract_number || '—'}`
                          : `مصروفات تشغيلية - نوع المصروف: ${printModalVoucher.expense_type || 'صيانة'}`)}
                    </span>
                  </div>
                </div>

                {/* Signatures & Seal */}
                <div className="grid grid-cols-3 gap-6 pt-6 text-center text-xs">
                  <div className="space-y-8">
                    <p className="font-bold">المستلم / الدافع</p>
                    <div className="h-12 flex items-center justify-center text-slate-300 font-serif">
                      ....................................
                    </div>
                  </div>
                  <div className="space-y-8">
                    <p className="font-bold">المحاسب المسؤول</p>
                    <div className="h-12 flex items-center justify-center text-slate-300 font-serif">
                      ....................................
                    </div>
                  </div>
                  <div className="space-y-8">
                    <p className="font-bold">اعتماد الإدارة / الختم</p>
                    <div className="h-12 flex items-center justify-center text-slate-300 font-serif">
                      [ الختم المعتمد ]
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </AppLayout>
    </ProtectedRoute>
  );
}
