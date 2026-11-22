'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '../../components/AppLayout';
import ProtectedRoute from '../../components/ProtectedRoute';
import api from '../../services/api';
import { Receipt, Plus, CheckCircle2, XCircle, Printer, Filter, AlertCircle, DollarSign } from 'lucide-react';

export default function VouchersPage() {
  const [vouchers, setVouchers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterType, setFilterType] = useState('all'); // all, receipt, disbursement
  const [filterStatus, setFilterStatus] = useState('all'); // all, draft, approved, rejected

  // New Voucher Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [newVoucher, setNewVoucher] = useState({
    type: 'receipt', // receipt or disbursement
    party_name: '',
    amount: '',
    payment_method: 'bank_transfer',
    description: '',
  });

  // Rejection Modal
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedVoucherId, setSelectedVoucherId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const fetchVouchers = async () => {
    setIsLoading(true);
    try {
      let url = '/vouchers';
      const params = [];
      if (filterType !== 'all') params.push(`type=${filterType}`);
      if (filterStatus !== 'all') params.push(`status=${filterStatus}`);
      if (params.length > 0) url += `?${params.join('&')}`;

      const res = await api.get(url).catch(() => ({ data: { data: [] } }));
      setVouchers(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch vouchers', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVouchers();
  }, [filterType, filterStatus]);

  const handleCreateVoucher = async (e) => {
    e.preventDefault();
    try {
      await api.post('/vouchers', newVoucher);
      alert('تم حفظ السند كمسودة بنجاح! بانتظار اعتماد المحاسب العام.');
      setModalOpen(false);
      setNewVoucher({
        type: 'receipt',
        party_name: '',
        amount: '',
        payment_method: 'bank_transfer',
        description: '',
      });
      fetchVouchers();
    } catch (err) {
      alert(err.response?.data?.message || 'فشل في حفظ السند');
    }
  };

  const handleApprove = async (id) => {
    if (!window.confirm('اعتماد السند؟ سيتم ترحيل القيد المحاسبي المتوازن إلى دفتر الأستاذ العام.')) return;
    try {
      await api.post(`/vouchers/${id}/approve`);
      alert('تم اعتماد السند وترحيل القيد بنجاح');
      fetchVouchers();
    } catch (err) {
      alert(err.response?.data?.message || 'فشل في اعتماد السند');
    }
  };

  const handleReject = async (e) => {
    e.preventDefault();
    if (!rejectionReason || rejectionReason.trim().length < 10) {
      alert('سبب الرفض إلزامي ويجب ألا يقل عن 10 أحرف');
      return;
    }
    try {
      await api.post(`/vouchers/${selectedVoucherId}/reject`, {
        rejection_reason: rejectionReason,
      });
      alert('تم رفض السند');
      setRejectModalOpen(false);
      setRejectionReason('');
      fetchVouchers();
    } catch (err) {
      alert(err.response?.data?.message || 'فشل في الرفض');
    }
  };

  return (
    <ProtectedRoute allowedRoles={['branch_manager', 'data_entry', 'general_accountant']}>
      <AppLayout title="السندات المالية (قبض وصرف)" subtitle="إدارة سندات القبض والصرف، دورة الاعتماد، والترحيل المحاسبي">
      {/* Top Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        {/* Filters */}
        <div className="flex items-center gap-3">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="p-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
          >
            <option value="all">جميع أنواع السندات</option>
            <option value="receipt">سندات القبض (تحصيل)</option>
            <option value="disbursement">سندات الصرف (مدفوعات)</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="p-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
          >
            <option value="all">جميع الحالات</option>
            <option value="draft">مسودة (معلق)</option>
            <option value="approved">معتمد ومرحل</option>
            <option value="rejected">مرفوض</option>
          </select>
        </div>

        {/* Action Button */}
        <button
          onClick={() => setModalOpen(true)}
          className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl flex items-center gap-2 shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>إنشاء سند مالي جديد</span>
        </button>
      </div>

      {/* Vouchers Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-8">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-6">رقم السند</th>
                <th className="py-3 px-6">النوع</th>
                <th className="py-3 px-6">المبلغ (ر.س)</th>
                <th className="py-3 px-6">طريقة الدفع</th>
                <th className="py-3 px-6">الطرف المقابل</th>
                <th className="py-3 px-6">الحالة الحالية</th>
                <th className="py-3 px-6 text-center">إجراءات الاعتماد / الطباعة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {vouchers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-400">
                    لا توجد سندات مسجلة مطابقة للبحث
                  </td>
                </tr>
              ) : (
                vouchers.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-4 px-6 font-mono font-semibold text-slate-800">{v.voucher_number}</td>
                    <td className="py-4 px-6">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded font-semibold text-[11px] ${
                          v.type === 'receipt' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {v.type === 'receipt' ? 'سند قبض' : 'سند صرف'}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-mono font-bold text-slate-900">
                      {Number(v.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-4 px-6 text-slate-600">
                      {v.payment_method === 'cash' && 'نقداً'}
                      {v.payment_method === 'bank_transfer' && 'تحويل بنكي'}
                      {v.payment_method === 'cheque' && 'شيك مصرفي'}
                    </td>
                    <td className="py-4 px-6 text-slate-700 font-medium">{v.party_name || '—'}</td>
                    <td className="py-4 px-6">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                          v.status === 'approved'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : v.status === 'rejected'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {v.status === 'approved' && 'معتمد ومرحل'}
                        {v.status === 'rejected' && 'مرفوض'}
                        {v.status === 'draft' && 'مسودة معلقة'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {v.status === 'draft' && (
                          <>
                            <button
                              onClick={() => handleApprove(v.id)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-sm transition-all"
                              title="اعتماد وترحيل"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>اعتماد</span>
                            </button>
                            <button
                              onClick={() => {
                                setSelectedVoucherId(v.id);
                                setRejectModalOpen(true);
                              }}
                              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all"
                              title="رفض السند مع ذكر السبب"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>رفض</span>
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => window.print()}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all"
                          title="طباعة السند"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>طباعة PDF</span>
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

      {/* Create Voucher Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="font-bold text-base text-slate-900 mb-1">إنشاء سند مالي جديد</h3>
            <p className="text-xs text-slate-500 mb-4">
              يحفظ السند كمسودة أولية ويخضع للمراجعة والاعتماد (Maker-Checker)
            </p>

            <form onSubmit={handleCreateVoucher} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">نوع السند</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewVoucher({ ...newVoucher, type: 'receipt' })}
                    className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                      newVoucher.type === 'receipt'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    سند قبض (تحصيل)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewVoucher({ ...newVoucher, type: 'disbursement' })}
                    className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                      newVoucher.type === 'disbursement'
                        ? 'bg-rose-50 text-rose-700 border-rose-300'
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    سند صرف (مدفوعات)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {newVoucher.type === 'receipt' ? 'اسم المستأجر / الدافع' : 'اسم المستفيد / المورد'}
                </label>
                <input
                  type="text"
                  value={newVoucher.party_name}
                  onChange={(e) => setNewVoucher({ ...newVoucher, party_name: e.target.value })}
                  placeholder="الاسم الكامل..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">المبلغ (ر.س)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newVoucher.amount}
                    onChange={(e) => setNewVoucher({ ...newVoucher, amount: e.target.value })}
                    placeholder="0.00"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">طريقة السداد</label>
                  <select
                    value={newVoucher.payment_method}
                    onChange={(e) => setNewVoucher({ ...newVoucher, payment_method: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
                  >
                    <option value="bank_transfer">تحويل بنكي</option>
                    <option value="cash">نقداً (خزينة)</option>
                    <option value="cheque">شيك مصرفي</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">البيان / الوصف</label>
                <textarea
                  value={newVoucher.description}
                  onChange={(e) => setNewVoucher({ ...newVoucher, description: e.target.value })}
                  placeholder="الغرض من السند..."
                  rows="2"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-sm"
                >
                  حفظ المسودة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mandatory Rejection Reason Modal */}
      {rejectModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h4 className="font-bold text-base text-slate-900 mb-2">رفض السند المالي</h4>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              وفقاً لسياسة الرقابة المالية، يجب ذكر سبب واضح وتفصيلي للرفض لا يقل عن 10 أحرف.
            </p>

            <form onSubmit={handleReject}>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="اكتب سبب الرفض هنا بالتفصيل (10 أحرف كحد أدنى)..."
                rows="4"
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-rose-500 mb-2 text-slate-900"
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
                  onClick={() => setRejectModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={rejectionReason.length < 10}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl disabled:opacity-40"
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

