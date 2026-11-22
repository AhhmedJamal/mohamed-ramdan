'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '../../../components/AppLayout';
import ProtectedRoute from '../../../components/ProtectedRoute';
import api from '../../../services/api';
import {
  Shield, Plus, Search, RefreshCw, FolderTree, CheckCircle,
  XCircle, Link2, Trash2, Edit2, AlertTriangle, ChevronDown, ChevronLeft
} from 'lucide-react';

export default function CostCentersPage() {
  const [costCenters, setCostCenters] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [selectedCenter, setSelectedCenter] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [formError, setFormError] = useState(null);

  const [formData, setFormData] = useState({
    code: '',
    name_ar: '',
    name_en: '',
    parent_id: '',
  });

  const [linkData, setLinkData] = useState({
    account_id: '',
    cost_center_id: '',
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [ccRes, accRes] = await Promise.all([
        api.get('/cost-centers'),
        api.get('/accounts').catch(() => ({ data: { data: [] } })),
      ]);
      setCostCenters(ccRes.data.data || []);
      setAccounts(accRes.data.data || []);
    } catch (err) {
      console.error('Failed to load cost centers', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setFormError(null);

    try {
      await api.post('/cost-centers', {
        code: formData.code,
        name_ar: formData.name_ar,
        name_en: formData.name_en,
        parent_id: formData.parent_id || null,
      });

      setShowAddModal(false);
      setFormData({ code: '', name_ar: '', name_en: '', parent_id: '' });
      fetchData();
    } catch (err) {
      setFormError(err.response?.data?.message || 'حدث خطأ أثناء إضافة مركز التكلفة');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = async (center) => {
    try {
      await api.post(`/cost-centers/${center.id}/toggle-status`);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'حدث خطأ أثناء تغيير حالة مركز التكلفة');
    }
  };

  const handleLinkAccount = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await api.post('/cost-centers/link-account', linkData);
      setShowLinkModal(false);
      setLinkData({ account_id: '', cost_center_id: '' });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'حدث خطأ أثناء ربط الحساب بمركز التكلفة');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (center) => {
    if (!window.confirm(`هل أنت متأكد من حذف مركز التكلفة "${center.name_ar}"؟`)) return;

    try {
      await api.delete(`/cost-centers/${center.id}`);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'لا يمكن حذف مركز التكلفة لوجود حركات مالية مرتبطة به');
    }
  };

  const filteredCenters = costCenters.filter((cc) => {
    const q = searchQuery.toLowerCase();
    return (
      cc.name_ar?.toLowerCase().includes(q) ||
      cc.name_en?.toLowerCase().includes(q) ||
      cc.code?.includes(q)
    );
  });

  return (
    <ProtectedRoute allowedRoles={['general_accountant', 'branch_manager']}>
      <AppLayout
        title="دليل مراكز التكلفة (Cost Centers Tree)"
        subtitle="الهيكل الهرمي لمراكز التكلفة، ربطها بالحسابات وشجرة الحسابات COA، وتتبع المصروفات والإيرادات (UC-19B إلى UC-23)"
      >
        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
          <div className="relative w-full sm:w-80">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="البحث بالرمز أو اسم مركز التكلفة..."
              className="w-full pl-3 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 shadow-sm"
            />
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              onClick={fetchData}
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
              <span>إضافة مركز تكلفة جديد</span>
            </button>
          </div>
        </div>

        {/* Cost Centers Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                <tr>
                  <th className="py-3.5 px-4">رمز المركز</th>
                  <th className="py-3.5 px-4">اسم مركز التكلفة (عربي)</th>
                  <th className="py-3.5 px-4">الاسم بالإنجليزية</th>
                  <th className="py-3.5 px-4">المركز الرئيسي الأب</th>
                  <th className="py-3.5 px-4">المستوى الهرمي</th>
                  <th className="py-3.5 px-4">الحالة</th>
                  <th className="py-3.5 px-4 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {isLoading ? (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-500" />
                      جاري تحميل دليل مراكز التكلفة...
                    </td>
                  </tr>
                ) : filteredCenters.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-slate-400">
                      لا توجد مراكز تكلفة مسجلة
                    </td>
                  </tr>
                ) : (
                  filteredCenters.map((cc) => (
                    <tr key={cc.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                          {cc.code}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center gap-2">
                        <FolderTree className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>{cc.name_ar}</span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">{cc.name_en || '—'}</td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {cc.parent ? (
                          <span className="font-semibold text-slate-700">{cc.parent.name_ar}</span>
                        ) : (
                          <span className="text-slate-400">مركز رئيسي (Root)</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600">
                        مستوى {cc.level || (cc.parent_id ? 2 : 1)}
                      </td>
                      <td className="py-3.5 px-4">
                        {cc.is_active ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle className="w-3 h-3" />
                            نشط
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200">
                            <XCircle className="w-3 h-3" />
                            معطل
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedCenter(cc);
                              setLinkData({ cost_center_id: cc.id, account_id: '' });
                              setShowLinkModal(true);
                            }}
                            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors"
                            title="ربط بحساب من شجرة الحسابات"
                          >
                            <Link2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(cc)}
                            className={`px-2 py-1 rounded-lg border text-[11px] font-semibold transition-colors ${
                              cc.is_active
                                ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
                                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
                            }`}
                          >
                            {cc.is_active ? 'تعطيل' : 'تفعيل'}
                          </button>
                          <button
                            onClick={() => handleDelete(cc)}
                            className="p-1.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 transition-colors"
                            title="حذف مركز التكلفة"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

        {/* Add Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-md overflow-hidden">
              <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <Shield className="w-4 h-4 text-amber-500" />
                  <span>إضافة مركز تكلفة جديد (UC-20)</span>
                </h3>
                <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">✕</button>
              </div>

              <form onSubmit={handleCreate} className="p-6 space-y-4 text-xs">
                {formError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
                    <span>{formError}</span>
                  </div>
                )}

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">رمز مركز التكلفة *</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="مثال: CC-101"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-amber-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">اسم مركز التكلفة (بالعربية) *</label>
                  <input
                    type="text"
                    required
                    value={formData.name_ar}
                    onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                    placeholder="مثال: مشروع برج الياسمين - صيانة وتشغيل"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">الاسم بالإنجليزية (اختياري)</label>
                  <input
                    type="text"
                    value={formData.name_en}
                    onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                    placeholder="e.g. Yasmin Tower Maintenance"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">المركز الأب (إن وجد)</label>
                  <select
                    value={formData.parent_id}
                    onChange={(e) => setFormData({ ...formData, parent_id: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:bg-white"
                  >
                    <option value="">بدون مركز أب (مركز رئيسي جذر)</option>
                    {costCenters.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code} - {c.name_ar}
                      </option>
                    ))}
                  </select>
                </div>

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
                    {actionLoading ? 'جاري الحفظ...' : 'حفظ مركز التكلفة'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Link Account Modal */}
        {showLinkModal && selectedCenter && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-md overflow-hidden">
              <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-amber-500" />
                  <span>ربط مركز التكلفة ({selectedCenter.name_ar}) بحساب</span>
                </h3>
                <button onClick={() => setShowLinkModal(false)} className="text-slate-400 hover:text-white">✕</button>
              </div>

              <form onSubmit={handleLinkAccount} className="p-6 space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">اختر الحساب من شجرة الحسابات (COA) *</label>
                  <select
                    required
                    value={linkData.account_id}
                    onChange={(e) => setLinkData({ ...linkData, account_id: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:bg-white"
                  >
                    <option value="">-- اختر الحساب المطلوب ربطه --</option>
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.code} - {acc.name_ar} ({acc.root_type})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowLinkModal(false)}
                    className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl shadow disabled:opacity-50"
                  >
                    {actionLoading ? 'جاري الربط...' : 'تأكيد الربط'}
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

