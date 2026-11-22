'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '../../../components/AppLayout';
import ProtectedRoute from '../../../components/ProtectedRoute';
import api from '../../../services/api';
import { FileText, Plus, CheckCircle2, AlertCircle, Trash2, ArrowRight } from 'lucide-react';

export default function JournalEntriesPage() {
  const [entries, setEntries] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // New Journal Entry Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [entryDate, setEntryDate] = useState('2026-11-22');
  const [entryDescription, setEntryDescription] = useState('');
  const [lines, setLines] = useState([
    { account_id: '', debit: '', credit: '', memo: '' },
    { account_id: '', debit: '', credit: '', memo: '' },
  ]);

  const fetchEntries = async () => {
    setIsLoading(true);
    try {
      const [entriesRes, accountsRes] = await Promise.all([
        api.get('/journal-entries').catch(() => ({ data: { data: [] } })),
        api.get('/accounts').catch(() => ({ data: { data: [] } })),
      ]);
      setEntries(entriesRes.data.data || []);
      setAccounts(accountsRes.data.data || []);
    } catch (err) {
      console.error('Failed to load journal entries', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  const handleAddLine = () => {
    setLines([...lines, { account_id: '', debit: '', credit: '', memo: '' }]);
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

  // Math totals calculation
  const totalDebit = lines.reduce((acc, l) => acc + (parseFloat(l.debit) || 0), 0);
  const totalCredit = lines.reduce((acc, l) => acc + (parseFloat(l.credit) || 0), 0);
  const difference = Math.abs(totalDebit - totalCredit);
  const isBalanced = difference < 0.001 && totalDebit > 0;

  const handleCreateEntry = async (e) => {
    e.preventDefault();
    if (!isBalanced) {
      alert('لا يمكن ترحيل القيد! يجب أن يكون إجمالي المدين مساوياً لإجمالي الدائن تماماً (الفرق = 0).');
      return;
    }

    try {
      await api.post('/journal-entries', {
        entry_date: entryDate,
        description: entryDescription,
        lines: lines.map((l) => ({
          account_id: l.account_id,
          debit: parseFloat(l.debit) || 0,
          credit: parseFloat(l.credit) || 0,
          memo: l.memo,
        })),
      });

      alert('تم ترحيل القيد المحاسبي المتوازن إلى دفتر الأستاذ بنجاح!');
      setModalOpen(false);
      setEntryDescription('');
      setLines([
        { account_id: '', debit: '', credit: '', memo: '' },
        { account_id: '', debit: '', credit: '', memo: '' },
      ]);
      fetchEntries();
    } catch (err) {
      alert(err.response?.data?.message || 'فشل في حفظ القيد');
    }
  };

  return (
    <ProtectedRoute allowedRoles={['general_accountant', 'branch_manager']}>
      <AppLayout title="دفتر القيود اليومية (General Journal)" subtitle="القيود المحاسبية المتوازنة والترحيل المباشر للأستاذ العام">
      {/* Top Bar */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-base font-bold text-slate-900">سجل القيود اليومية المرحلة</h3>
          <p className="text-xs text-slate-500">القيود معتمدة وغير قابلة للتعديل بعد الترحيل وفقاً لمبدأ Immutability</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl flex items-center gap-2 shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>إنشاء قيد يدوي متوازن</span>
        </button>
      </div>

      {/* Entries Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-8">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-6">رقم القيد</th>
                <th className="py-3 px-6">تاريخ القيد</th>
                <th className="py-3 px-6">البيان العام</th>
                <th className="py-3 px-6">المصدر / المرجع</th>
                <th className="py-3 px-6">إجمالي المدين (ر.س)</th>
                <th className="py-3 px-6">إجمالي الدائن (ر.س)</th>
                <th className="py-3 px-6">حالة الترحيل</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {entries.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-400">
                    لا توجد قيود يومية مسجلة حالياً
                  </td>
                </tr>
              ) : (
                entries.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-4 px-6 font-mono font-semibold text-slate-800">{item.entry_number}</td>
                    <td className="py-4 px-6 font-mono text-slate-600">{item.entry_date}</td>
                    <td className="py-4 px-6 text-slate-900 font-medium">{item.description}</td>
                    <td className="py-4 px-6 text-slate-500 font-mono text-[11px]">{item.source_type || 'قيد يدوي'}</td>
                    <td className="py-4 px-6 font-mono font-bold text-slate-900">
                      {Number(item.total_debit).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-4 px-6 font-mono font-bold text-slate-900">
                      {Number(item.total_credit).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>مرحل للأستاذ</span>
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Balanced Entry Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-8 shadow-2xl border border-slate-200 my-8">
            <h3 className="font-bold text-lg text-slate-900 mb-1">تحرير قيد محاسبي يدوي متوازن</h3>
            <p className="text-xs text-slate-500 mb-6">
              يجب أن يتطابق إجمالي المدين مع إجمالي الدائن تماماً ليتم الترحيل إلى دفتر الأستاذ
            </p>

            <form onSubmit={handleCreateEntry} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">تاريخ القيد</label>
                  <input
                    type="date"
                    value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">البيان العام للقيد</label>
                  <input
                    type="text"
                    value={entryDescription}
                    onChange={(e) => setEntryDescription(e.target.value)}
                    placeholder="مثال: تسوية مصروفات تشغيلية..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
                    required
                  />
                </div>
              </div>

              {/* Multi-line Entry Grid */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-semibold">
                    <tr>
                      <th className="py-3 px-4">الحساب المالي</th>
                      <th className="py-3 px-4 w-36">المدين (Dr)</th>
                      <th className="py-3 px-4 w-36">الدائن (Cr)</th>
                      <th className="py-3 px-4">البيان التفصيلي للسطر</th>
                      <th className="py-3 px-2 w-12 text-center">حذف</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {lines.map((line, idx) => (
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
                          <input
                            type="number"
                            step="0.01"
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
                    ))}
                  </tbody>
                  {/* Footer Balance Checker */}
                  <tfoot className="bg-slate-50 border-t-2 border-slate-200 font-bold">
                    <tr>
                      <td className="py-3 px-4">
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
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={!isBalanced}
                  className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-md transition-all disabled:opacity-40"
                >
                  ترحيل القيد للأستاذ العام
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

