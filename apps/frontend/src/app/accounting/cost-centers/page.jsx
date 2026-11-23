'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '../../../components/AppLayout';
import ProtectedRoute from '../../../components/ProtectedRoute';
import api from '../../../services/api';
import {
  Shield, Plus, Search, RefreshCw, FolderTree, CheckCircle,
  XCircle, Link2, Trash2, Edit2, AlertTriangle, ChevronDown, ChevronLeft,
  X, Building2, Hammer
} from 'lucide-react';

export default function CostCentersPage() {
  const [costCenters, setCostCenters] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [editingCenter, setEditingCenter] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [formError, setFormError] = useState(null);

  // Form States (UC-20)
  const [formData, setFormData] = useState({
    name: '',
    type: 'property', // property or contracting_project
    description: '',
    status: 'active', // active or inactive
  });

  // Link Account State (UC-23)
  const [linkData, setLinkData] = useState({
    account_id: '',
    is_mandatory: true,
    allowed_cost_center_ids: [],
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [ccRes, accRes] = await Promise.all([
        api.get('/cost-centers'),
        api.get('/accounts').catch(() => ({ data: { data: [] } })),
      ]);
      setCostCenters(ccRes.data.data || ccRes.data.cost_centers || []);
      setAccounts(accRes.data.data || accRes.data.flat || []);
    } catch (err) {
      console.error('Failed to load cost centers', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // UC-20: Create Cost Center
  const handleCreate = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setFormError(null);

    try {
      await api.post('/cost-centers', formData);
      alert('تم إنشاء مركز التكلفة بنجاح (UC-20)');
      setShowAddModal(false);
      setFormData({ name: '', type: 'property', description: '', status: 'active' });
      fetchData();
    } catch (err) {
      setFormError(err.response?.data?.message || err.response?.data?.errors?.name?.[0] || 'فشل في إضافة مركز التكلفة');
    } finally {
      setActionLoading(false);
    }
  };

  // UC-21: Update Cost Center
  const handleUpdate = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setFormError(null);

    try {
      await api.put(`/cost-centers/${editingCenter.id}`, {
        name: editingCenter.name,
        description: editingCenter.description,
        status: editingCenter.status,
      });
      alert('تم تحديث بيانات مركز التكلفة بنجاح (UC-21)');
      setShowEditModal(false);
      fetchData();
    } catch (err) {
      setFormError(err.response?.data?.message || 'فشل في تحديث مركز التكلفة');
    } finally {
      setActionLoading(false);
    }
  };

  // Toggle Status
  const handleToggleStatus = async (center) => {
    try {
      await api.post(`/cost-centers/${center.id}/toggle-status`);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'حدث خطأ أثناء تغيير حالة مركز التكلفة');
    }
  };

  // UC-22: Delete Cost Center
  const handleDelete = async (center) => {
    if (!window.confirm(`هل أنت متأكد من حذف مركز التكلفة "${center.name}"؟`)) return;

    try {
      await api.delete(`/cost-centers/${center.id}`);
      alert('تم حذف مركز التكلفة بنجاح (UC-22)');
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'لا يمكن حذف مركز التكلفة لوجود قيود مالية أو عقود مرتبطة به (UC-22 Alternative 1)');
    }
  };

  // UC-23: Link Account to Cost Center
  const handleLinkAccount = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await api.post('/cost-centers/link-account', {
        account_id: linkData.account_id,
        is_cost_center_mandatory: linkData.is_mandatory,
        allowed_cost_center_ids: linkData.allowed_cost_center_ids,
      });
      alert('تم حفظ إعدادات ربط الحساب بمراكز التكلفة بنجاح (UC-23)');
      setShowLinkModal(false);
      setLinkData({ account_id: '', is_mandatory: true, allowed_cost_center_ids: [] });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'حدث خطأ أثناء ربط الحساب بمركز التكلفة');
    } finally {
      setActionLoading(false);
    }
  };

  // Filtered list
  const filteredCenters = costCenters.filter((cc) => {
    const q = searchQuery.toLowerCase();
    const matchSearch =
      cc.name?.toLowerCase().includes(q) ||
      cc.code?.toLowerCase().includes(q) ||
      cc.description?.toLowerCase().includes(q);

    const matchType = typeFilter === 'all' || cc.type === typeFilter;
    const matchStatus = statusFilter === 'all' || cc.status === statusFilter;

    return matchSearch && matchType && matchStatus;
  });

  return (
    <ProtectedRoute allowedRoles={['general_accountant', 'branch_manager']}>
      <AppLayout
        title="إدارة مراكز التكلفة (Cost Centers) - UC-19B إلى UC-23"
        subtitle="الهيكل التحليلي لمراكز التكلفة (عقارات ومشاريع مقاولات)، ربطها بالحسابات وشجرة COA"
      >
        {/* Actions Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="relative min-w-[240px]">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="البحث بالرمز أو الاسم أو الوصف..."
                className="w-full pl-3 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-slate-900 shadow-sm"
              />
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
            </div>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="py-2 px-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
            >
              <option value="all">جميع الأنواع</option>
              <option value="property">عقارات / عمائر</option>
              <option value="contracting_project">مشاريع مقاولات</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="py-2 px-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
            >
              <option value="all">جميع الحالات</option>
              <option value="active">نشط</option>
              <option value="inactive">معطّل</option>
            </select>
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
            <button
              onClick={() => setShowLinkModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 shadow-sm transition-colors"
            >
              <Link2 className="w-4 h-4 text-slate-500" />
              <span>ربط حساب بمركز تكلفة (UC-23)</span>
            </button>
            <button
              onClick={() => {
                setFormError(null);
                setShowAddModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة مركز تكلفة (UC-20)</span>
            </button>
          </div>
        </div>

        {/* Cost Centers Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-8">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <tr>
                  <th className="py-3.5 px-6">كود المركز</th>
                  <th className="py-3.5 px-6">اسم مركز التكلفة</th>
                  <th className="py-3.5 px-6">النوع (UC-20)</th>
                  <th className="py-3.5 px-6">الوصف</th>
                  <th className="py-3.5 px-6">الحالة</th>
                  <th className="py-3.5 px-6 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {isLoading ? (
                  <tr>
                    <td colSpan="6" className="py-12 text-center text-slate-400">
                      جاري تحميل مراكز التكلفة...
                    </td>
                  </tr>
                ) : filteredCenters.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-12 text-center text-slate-400">
                      لا توجد مراكز تكلفة مسجلة مطابقة للبحث
                    </td>
                  </tr>
                ) : (
                  filteredCenters.map((cc) => (
                    <tr key={cc.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-4 px-6 font-mono font-bold text-slate-900">{cc.code}</td>
                      <td className="py-4 px-6 font-semibold text-slate-900">{cc.name}</td>
                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                            cc.type === 'property'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {cc.type === 'property' ? (
                            <>
                              <Building2 className="w-3 h-3" />
                              <span>عقار</span>
                            </>
                          ) : (
                            <>
                              <Hammer className="w-3 h-3" />
                              <span>مشروع مقاولات</span>
                            </>
                          )}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-slate-500 max-w-xs truncate">{cc.description || '—'}</td>
                      <td className="py-4 px-6">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                            cc.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {cc.status === 'active' ? 'نشط' : 'معطّل'}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => {
                              setEditingCenter({ ...cc });
                              setShowEditModal(true);
                            }}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs"
                            title="تعديل مركز التكلفة (UC-21)"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(cc)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs"
                            title="تفعيل / تعطيل"
                          >
                            {cc.status === 'active' ? (
                              <XCircle className="w-3.5 h-3.5 text-slate-500" />
                            ) : (
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                            )}
                          </button>
                          <button
                            onClick={() => handleDelete(cc)}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-xs"
                            title="حذف مركز التكلفة (UC-22)"
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

        {/* MODAL 1: Add Cost Center (UC-20) */}
        {showAddModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <h3 className="font-bold text-base text-slate-900">إضافة مركز تكلفة جديد (UC-20)</h3>
                <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {formError && (
                <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
                  {formError}
                </div>
              )}

              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    اسم مركز التكلفة (فريد - 3 إلى 100 حرف) *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="مثال: عمارة اليرموك السكنية أو مشروع فيلا الياسمين"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-slate-900 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    النوع (عقار / مشروع مقاولات - UC-20) *
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  >
                    <option value="property">عقار (عمارة / مبنى)</option>
                    <option value="contracting_project">مشروع مقاولات</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">الوصف (اختياري)</label>
                  <textarea
                    rows={2}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="وصف تفصيلي أو عنوان الموقع..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">الحالة الأولية *</label>
                  <div className="flex items-center gap-4 text-xs font-semibold">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        checked={formData.status === 'active'}
                        onChange={() => setFormData({ ...formData, status: 'active' })}
                      />
                      <span>نشط</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        checked={formData.status === 'inactive'}
                        onChange={() => setFormData({ ...formData, status: 'inactive' })}
                      />
                      <span>معطّل</span>
                    </label>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-sm disabled:opacity-50"
                  >
                    حفظ مركز التكلفة (UC-20)
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 2: Edit Cost Center (UC-21) */}
        {showEditModal && editingCenter && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <h3 className="font-bold text-base text-slate-900">تعديل مركز التكلفة (UC-21): {editingCenter.code}</h3>
                <button onClick={() => setShowEditModal(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleUpdate} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">اسم مركز التكلفة *</label>
                  <input
                    type="text"
                    value={editingCenter.name}
                    onChange={(e) => setEditingCenter({ ...editingCenter, name: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">النوع (ثابت)</label>
                  <input
                    type="text"
                    disabled
                    value={editingCenter.type === 'property' ? 'عقار (ثابت لا يمكن تغييره لوجود قيود)' : 'مشروع مقاولات (ثابت)'}
                    className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-500 cursor-not-allowed font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">الوصف</label>
                  <textarea
                    rows={2}
                    value={editingCenter.description || ''}
                    onChange={(e) => setEditingCenter({ ...editingCenter, description: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-sm"
                  >
                    حفظ التعديلات (UC-21)
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 3: Link Account to Cost Center (UC-23) */}
        {showLinkModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <h3 className="font-bold text-base text-slate-900">ربط حساب بمركز تكلفة (UC-23)</h3>
                <button onClick={() => setShowLinkModal(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleLinkAccount} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">الحساب من شجرة COA *</label>
                  <select
                    value={linkData.account_id}
                    onChange={(e) => setLinkData({ ...linkData, account_id: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
                    required
                  >
                    <option value="">اختر الحساب...</option>
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.code} - {acc.name} ({acc.nature === 'debit' ? 'مدين' : 'دائن'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-900">
                    <input
                      type="checkbox"
                      checked={linkData.is_mandatory}
                      onChange={(e) => setLinkData({ ...linkData, is_mandatory: e.target.checked })}
                    />
                    <span>إلزامي الربط بمركز تكلفة عند إنشاء القيود (UC-23)</span>
                  </label>
                  <p className="text-[11px] text-slate-500 mt-1">
                    إذا كان مفعّلاً، لن يقبل النظام حفظ أي قيد يومية على هذا الحساب دون تحديد مركز تكلفة.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowLinkModal(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-sm"
                  >
                    حفظ إعدادات الربط (UC-23)
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
