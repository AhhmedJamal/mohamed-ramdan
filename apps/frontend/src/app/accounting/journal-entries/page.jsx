'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '../../../components/AppLayout';
import ProtectedRoute from '../../../components/ProtectedRoute';
import api from '../../../services/api';
import {
  FileText, Plus, CheckCircle2, AlertCircle, Trash2, ArrowRight,
  Eye, RefreshCw, Search, X, Calendar, Edit2, Layers
} from 'lucide-react';

export default function JournalEntriesPage() {
  const [entries, setEntries] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [costCenters, setCostCenters] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Create / Edit Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [entryExplanation, setEntryExplanation] = useState('');
  const [lines, setLines] = useState([
    { account_id: '', cost_center_id: '', debit: '', credit: '', memo: '' },
    { account_id: '', cost_center_id: '', debit: '', credit: '', memo: '' },
  ]);
  const [actionLoading, setActionLoading] = useState(false);
  const [formError, setFormError] = useState(null);

  // View Details Modal state (UC-51)
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);

  const fetchEntries = async () => {
    setIsLoading(true);
    try {
      const params = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (fromDate) params.from_date = fromDate;
      if (toDate) params.to_date = toDate;
      if (searchQuery) params.search = searchQuery;

      const [entriesRes, accountsRes, costCentersRes] = await Promise.all([
        api.get('/journal-entries', { params }).catch(() => ({ data: { data: [] } })),
        api.get('/accounts').catch(() => ({ data: { data: [] } })),
        api.get('/cost-centers').catch(() => ({ data: { data: [] } })),
      ]);

      setEntries(entriesRes.data.data || entriesRes.data.entries || []);
      setAccounts(accountsRes.data.data || []);
      setCostCenters(costCentersRes.data.data || costCentersRes.data.cost_centers || []);
    } catch (err) {
      console.error('Failed to load journal entries', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, [statusFilter, fromDate, toDate]);

  const handleAddLine = () => {
    setLines([...lines, { account_id: '', cost_center_id: '', debit: '', credit: '', memo: '' }]);
  };

  const handleRemoveLine = (idx) => {
    if (lines.length <= 2) return;
    setLines(lines.filter((_, i) => i !== idx));
  };

  const handleLineChange = (index, field, value) => {
    const updated = [...lines];
    updated[index][field] = value;
    setLines(updated);
  };

  // Math totals calculation (Equation: Total Debit - Total Credit = 0)
  const totalDebit = lines.reduce((acc, l) => acc + (parseFloat(l.debit) || 0), 0);
  const totalCredit = lines.reduce((acc, l) => acc + (parseFloat(l.credit) || 0), 0);
  const difference = Math.abs(totalDebit - totalCredit);
  const isBalanced = difference < 0.001 && totalDebit > 0;

  const openCreateModal = () => {
    setEditingEntry(null);
    setEntryDate(new Date().toISOString().split('T')[0]);
    setEntryExplanation('');
    setLines([
      { account_id: '', cost_center_id: '', debit: '', credit: '', memo: '' },
      { account_id: '', cost_center_id: '', debit: '', credit: '', memo: '' },
    ]);
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (entry) => {
    setEditingEntry(entry);
    setEntryDate(entry.date || entry.entry_date || '');
    setEntryExplanation(entry.explanation || entry.description || '');
    const entryItems = entry.items || entry.lines || [];
    if (entryItems.length >= 2) {
      setLines(entryItems.map((item) => ({
        account_id: item.account_id,
        cost_center_id: item.cost_center_id || '',
        debit: item.debit,
        credit: item.credit,
        memo: item.line_note || item.memo || '',
      })));
    }
    setFormError(null);
    setModalOpen(true);
  };

  const openViewModal = async (entry) => {
    try {
      const res = await api.get(`/journal-entries/${entry.id}`);
      setSelectedEntry(res.data.data || entry);
    } catch (err) {
      setSelectedEntry(entry);
    }
    setViewModalOpen(true);
  };

  // UC-49: Create or Update Journal Entry
  const handleSubmitEntry = async (e, shouldPost = true) => {
    if (e) e.preventDefault();
    setFormError(null);

    if (shouldPost && !isBalanced) {
      setFormError('القيد غير متوازن، إجمالي المدين يجب أن يساوي إجمالي الدائن تماماً (الفرق = 0).');
      return;
    }

    if (entryExplanation.trim().length < 10) {
      setFormError('الإيضاح يجب أن يكون 10 أحرف على الأقل');
      return;
    }

    // Check cost center mandatory rule
    for (const line of lines) {
      const acct = accounts.find((a) => a.id === parseInt(line.account_id, 10));
      if (acct && acct.is_cost_center_mandatory && !line.cost_center_id) {
        setFormError(`الحساب [${acct.name_ar || acct.name}] يتطلب تحديد مركز تكلفة إلزامي`);
        return;
      }
    }

    setActionLoading(true);

    try {
      const payload = {
        date: entryDate,
        explanation: entryExplanation,
        is_posted: shouldPost,
        items: lines.map((l) => ({
          account_id: parseInt(l.account_id, 10),
          cost_center_id: l.cost_center_id ? parseInt(l.cost_center_id, 10) : null,
          debit: parseFloat(l.debit) || 0,
          credit: parseFloat(l.credit) || 0,
          line_note: l.memo || null,
        })),
      };

      if (editingEntry) {
        await api.put(`/journal-entries/${editingEntry.id}`, payload);
      } else {
        await api.post('/journal-entries', payload);
      }

      setModalOpen(false);
      setEditingEntry(null);
      await fetchEntries();
    } catch (err) {
      setFormError(err.response?.data?.message || 'فشل في حفظ القيد اليومي');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteDraft = async (entry) => {
    if (!window.confirm(`هل أنت متأكد من حذف مسودة القيد "${entry.entry_number}"؟`)) return;

    try {
      await api.delete(`/journal-entries/${entry.id}`);
      await fetchEntries();
    } catch (err) {
      alert(err.response?.data?.message || 'لا يمكن حذف القيد');
    }
  };

  const filteredEntries = entries.filter((item) => {
    const q = searchQuery.toLowerCase();
    const num = (item.entry_number || '').toLowerCase();
    const exp = (item.explanation || item.description || '').toLowerCase();
    return num.includes(q) || exp.includes(q);
  });

  return (
    <ProtectedRoute allowedRoles={['general_accountant', 'branch_manager', 'super_admin']}>
      <AppLayout
        title="دفتر القيود اليومية (General Journal)"
        subtitle="إدارة وتسجيل القيود المحاسبية المتوازنة والترحيل المباشر للأستاذ العام (UC-49 إلى UC-51)"
      >
        {/* Top Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="البحث برقم القيد أو الإيضاح..."
                className="w-full pl-3 pr-9 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 shadow-sm"
              />
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="py-2 px-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 shadow-sm"
            >
              <option value="all">كافة الحالات</option>
              <option value="posted">مرحّل (Posted)</option>
              <option value="draft">مسودة (Draft)</option>
            </select>

            <div className="flex items-center gap-2">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="py-2 px-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 shadow-sm"
                title="من تاريخ"
              />
              <span className="text-slate-400 text-xs">إلى</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="py-2 px-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 shadow-sm"
                title="إلى تاريخ"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              onClick={fetchEntries}
              disabled={isLoading}
              className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 shadow-sm transition-colors"
              title="تحديث البيانات"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={openCreateModal}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl flex items-center gap-2 shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>إنشاء قيد يدوي متوازن (UC-49)</span>
            </button>
          </div>
        </div>

        {/* Entries Table (UC-50) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-8">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">رقم القيد</th>
                  <th className="py-3.5 px-4">تاريخ القيد</th>
                  <th className="py-3.5 px-4">البيان / الإيضاح</th>
                  <th className="py-3.5 px-4 font-mono">إجمالي المدين (ر.س)</th>
                  <th className="py-3.5 px-4 font-mono">إجمالي الدائن (ر.س)</th>
                  <th className="py-3.5 px-4">حالة القيد</th>
                  <th className="py-3.5 px-4 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {isLoading ? (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-500" />
                      جاري تحميل القيود اليومية...
                    </td>
                  </tr>
                ) : filteredEntries.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-slate-400">
                      لا توجد قيود يومية مطابقة للبحث
                    </td>
                  </tr>
                ) : (
                  filteredEntries.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {item.entry_number}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600">
                        {item.date || item.entry_date}
                      </td>
                      <td className="py-3.5 px-4 text-slate-900 font-medium">
                        {item.explanation || item.description}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {Number(item.total_debit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {Number(item.total_credit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4">
                        {item.status === 'posted' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>مرحّل للأستاذ</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            <AlertCircle className="w-3 h-3 text-amber-600" />
                            <span>مسودة (Draft)</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => openViewModal(item)}
                            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors"
                            title="عرض تفاصيل القيد (UC-51)"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {item.status === 'draft' && (
                            <>
                              <button
                                onClick={() => openEditModal(item)}
                                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors"
                                title="تعديل مسودة القيد (UC-50)"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteDraft(item)}
                                className="p-1.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 transition-colors"
                                title="حذف مسودة القيد"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
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

        {/* Manual Balanced Entry Modal (UC-49) */}
        {modalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 my-8">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    {editingEntry ? `تعديل مسودة القيد #${editingEntry.entry_number}` : 'تحرير قيد محاسبي يدوي متوازن (UC-49)'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    معادلة التوازن المحاسبي: إجمالي المدين − إجمالي الدائن = 0
                  </p>
                </div>
                <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {formError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={(e) => handleSubmitEntry(e, true)} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">تاريخ القيد *</label>
                    <input
                      type="date"
                      required
                      value={entryDate}
                      onChange={(e) => setEntryDate(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">البيان / الإيضاح العام (10-500 حرف) *</label>
                    <input
                      type="text"
                      required
                      minLength={10}
                      maxLength={500}
                      value={entryExplanation}
                      onChange={(e) => setEntryExplanation(e.target.value)}
                      placeholder="مثال: تسوية مصروفات تشغيلية لمشروع برج الياسمين..."
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
                    />
                  </div>
                </div>

                {/* Multi-line Entry Grid */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-semibold">
                      <tr>
                        <th className="py-2.5 px-3">الحساب المالي *</th>
                        <th className="py-2.5 px-3">مركز التكلفة</th>
                        <th className="py-2.5 px-3 w-32 font-mono">المدين (Dr)</th>
                        <th className="py-2.5 px-3 w-32 font-mono">الدائن (Cr)</th>
                        <th className="py-2.5 px-3">إيضاح السطر</th>
                        <th className="py-2.5 px-2 w-10 text-center">حذف</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {lines.map((line, idx) => {
                        const selectedAcct = accounts.find((a) => a.id === parseInt(line.account_id, 10));
                        const isCostCenterReq = selectedAcct?.is_cost_center_mandatory;

                        return (
                          <tr key={idx} className="bg-white">
                            <td className="p-2">
                              <select
                                value={line.account_id}
                                onChange={(e) => handleLineChange(idx, 'account_id', e.target.value)}
                                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900"
                                required
                              >
                                <option value="">اختر الحساب...</option>
                                {accounts.map((a) => (
                                  <option key={a.id} value={a.id}>
                                    {a.code} - {a.name_ar || a.name}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="p-2">
                              <select
                                value={line.cost_center_id}
                                onChange={(e) => handleLineChange(idx, 'cost_center_id', e.target.value)}
                                className={`w-full p-2 bg-slate-50 border rounded-lg text-xs text-slate-900 ${
                                  isCostCenterReq && !line.cost_center_id ? 'border-amber-400 ring-1 ring-amber-300' : 'border-slate-200'
                                }`}
                              >
                                <option value="">{isCostCenterReq ? 'إلزامي لهذا الحساب *' : 'مركز التكلفة (اختياري)'}</option>
                                {costCenters.map((cc) => (
                                  <option key={cc.id} value={cc.id}>
                                    {cc.code} - {cc.name}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={line.debit}
                                onChange={(e) => handleLineChange(idx, 'debit', e.target.value)}
                                placeholder="0.00"
                                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-900 text-left"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={line.credit}
                                onChange={(e) => handleLineChange(idx, 'credit', e.target.value)}
                                placeholder="0.00"
                                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-900 text-left"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={line.memo}
                                onChange={(e) => handleLineChange(idx, 'memo', e.target.value)}
                                placeholder="ملاحظة السطر..."
                                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900"
                              />
                            </td>
                            <td className="p-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveLine(idx)}
                                disabled={lines.length <= 2}
                                className="p-1.5 text-slate-400 hover:text-rose-600 rounded disabled:opacity-20"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    {/* Footer Balance Checker */}
                    <tfoot className="bg-slate-50 border-t-2 border-slate-200 font-bold">
                      <tr>
                        <td colSpan="2" className="py-3 px-4">
                          <button
                            type="button"
                            onClick={handleAddLine}
                            className="text-xs text-amber-600 hover:text-amber-800 font-bold flex items-center gap-1"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>إضافة سطر محاسبي جديد</span>
                          </button>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-900 text-left">
                          {totalDebit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-900 text-left">
                          {totalCredit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td colSpan="2" className="py-3 px-4">
                          <div className="flex items-center justify-end gap-2">
                            {isBalanced ? (
                              <span className="inline-flex items-center gap-1 text-emerald-600 font-bold text-xs bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200">
                                <CheckCircle2 className="w-4 h-4" />
                                <span>القيد متوازن (الفرق: 0.00)</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-rose-600 font-bold text-xs bg-rose-50 px-2 py-1 rounded-md border border-rose-200">
                                <AlertCircle className="w-4 h-4" />
                                <span>
                                  القيد غير متوازن! الفرق: {difference.toLocaleString(undefined, { minimumFractionDigits: 2 })} ر.س
                                </span>
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50"
                  >
                    إلغاء
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleSubmitEntry(e, false)}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-xl transition-colors"
                  >
                    {actionLoading ? 'جاري الحفظ...' : 'حفظ كمسودة (Draft)'}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleSubmitEntry(e, true)}
                    disabled={!isBalanced || actionLoading}
                    className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl shadow disabled:opacity-40"
                  >
                    {actionLoading ? 'جاري الترحيل...' : 'حفظ وترحيل للأستاذ العام'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* View Details Modal (UC-51) */}
        {viewModalOpen && selectedEntry && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 my-8 text-xs">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-amber-600" />
                  <h3 className="font-bold text-base text-slate-900">
                    تفاصيل القيد المحاسبي #{selectedEntry.entry_number} (UC-51)
                  </h3>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                    selectedEntry.status === 'posted' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                  }`}>
                    {selectedEntry.status_label || selectedEntry.status}
                  </span>
                </div>
                <button onClick={() => setViewModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 mb-4">
                <div>
                  <span className="text-slate-500 block">تاريخ القيد:</span>
                  <span className="font-mono font-bold text-slate-900">{selectedEntry.date || selectedEntry.entry_date}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">السنة المالية:</span>
                  <span className="font-bold text-slate-800">{selectedEntry.fiscal_year?.name || '—'}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500 block">الإيضاح العام:</span>
                  <span className="text-slate-900 font-medium">{selectedEntry.explanation || selectedEntry.description}</span>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden mb-4">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">كود واسم الحساب</th>
                      <th className="py-2.5 px-3">مركز التكلفة</th>
                      <th className="py-2.5 px-3 font-mono">المدين (ر.س)</th>
                      <th className="py-2.5 px-3 font-mono">الدائن (ر.س)</th>
                      <th className="py-2.5 px-3">إيضاح السطر</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(selectedEntry.items || selectedEntry.lines || []).map((item, idx) => (
                      <tr key={idx} className="bg-white">
                        <td className="py-2.5 px-3 font-semibold text-slate-800">
                          {item.account?.code ? `[${item.account.code}] ` : ''}
                          {item.account?.name_ar || item.account?.name || item.account_id}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
                          {item.cost_center?.name || item.costCenter?.name || '—'}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                          {Number(item.debit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                          {Number(item.credit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                          {item.line_note || item.memo || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 border-t-2 border-slate-200 font-bold">
                    <tr>
                      <td colSpan="2" className="py-2.5 px-3 text-slate-700">الإجمالي المحاسبي</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                        {Number(selectedEntry.total_debit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                        {Number(selectedEntry.total_credit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-3 text-emerald-600 font-semibold">
                        متوازن
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="flex justify-end pt-3 border-t border-slate-100">
                <button
                  onClick={() => setViewModalOpen(false)}
                  className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        )}
      </AppLayout>
    </ProtectedRoute>
  );
}
