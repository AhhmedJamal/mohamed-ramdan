'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '../../../components/AppLayout';
import ProtectedRoute from '../../../components/ProtectedRoute';
import api from '../../../services/api';
import {
  BookOpen,
  Plus,
  ChevronRight,
  ChevronDown,
  Folder,
  File,
  Layers,
  ShieldCheck,
  Edit2,
  Trash2,
  X,
  AlertCircle,
  Search,
  DollarSign
} from 'lucide-react';

export default function ChartOfAccountsPage() {
  const [accounts, setAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedNodes, setExpandedNodes] = useState({});
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [parentAccount, setParentAccount] = useState(null);
  const [editingAccount, setEditingAccount] = useState(null);

  // Form State (UC-17 / UC-18)
  const [formData, setFormData] = useState({
    name: '',
    parent_id: '',
    root_type: 'assets',
    account_type: 'sub',
    opening_date: new Date().toISOString().split('T')[0],
    opening_balance: 0,
    depreciation_method: 'straight_line',
    purchase_price: '',
    depreciation_rate: '',
    useful_life_years: '',
    scrap_value: '',
  });

  const fetchAccounts = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/accounts').catch(() => ({ data: { data: [] } }));
      const list = res.data.data || res.data.flat || [];
      setAccounts(list);

      // Expand root nodes by default
      const initialExpanded = {};
      list.forEach((acc) => {
        if (!acc.parent_id) initialExpanded[acc.id] = true;
      });
      setExpandedNodes(initialExpanded);
    } catch (err) {
      console.error('Failed to load accounts', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const toggleExpand = (id) => {
    setExpandedNodes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleOpenAddModal = (parent) => {
    setParentAccount(parent);
    setFormData({
      name: '',
      parent_id: parent.id,
      root_type: parent.root_type || 'assets',
      account_type: 'sub',
      opening_date: new Date().toISOString().split('T')[0],
      opening_balance: 0,
      depreciation_method: 'straight_line',
      purchase_price: '',
      depreciation_rate: '',
      useful_life_years: '',
      scrap_value: '',
    });
    setModalOpen(true);
  };

  const handleOpenEditModal = (account) => {
    setEditingAccount(account);
    setFormData({
      name: account.name_ar || account.name,
      parent_id: account.parent_id,
      root_type: account.root_type,
      account_type: account.account_type,
      opening_date: account.opening_date || new Date().toISOString().split('T')[0],
      opening_balance: account.opening_balance || 0,
      depreciation_method: account.depreciation_method || 'straight_line',
      purchase_price: account.purchase_price || '',
      depreciation_rate: account.depreciation_rate || '',
      useful_life_years: account.useful_life_years || '',
      scrap_value: account.scrap_value || '',
    });
    setEditModalOpen(true);
  };

  // UC-17: Add Sub Account
  const handleCreateSubAccount = async (e) => {
    e.preventDefault();
    try {
      await api.post('/accounts', {
        ...formData,
        parent_id: parentAccount?.id,
        root_type: parentAccount?.root_type,
      });
      alert('تم إنشاء الحساب بنجاح وتوريث طبيعته المحاسبية آلياً (UC-17)');
      setModalOpen(false);
      fetchAccounts();
    } catch (err) {
      alert(err.response?.data?.message || err.response?.data?.errors?.name?.[0] || 'فشل في إنشاء الحساب');
    }
  };

  // UC-18: Update Account
  const handleUpdateAccount = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/accounts/${editingAccount.id}`, formData);
      alert('تم تحديث بيانات الحساب بنجاح (UC-18)');
      setEditModalOpen(false);
      fetchAccounts();
    } catch (err) {
      alert(err.response?.data?.message || 'فشل في تحديث الحساب');
    }
  };

  // UC-19: Delete Account
  const handleDeleteAccount = async (account) => {
    if (account.is_fixed_root || account.account_type === 'root') {
      alert('لا يمكن حذف الحساب الرئيسي الثابت (UC-19 Alternative 2)');
      return;
    }
    if (!window.confirm(`هل أنت متأكد من حذف الحساب "${account.name}"؟`)) return;

    try {
      await api.delete(`/accounts/${account.id}`);
      alert('تم حذف الحساب بنجاح (UC-19)');
      fetchAccounts();
    } catch (err) {
      alert(err.response?.data?.message || 'لا يمكن حذف الحساب لوجود قيود يومية مرتبطة به (UC-19 Alternative 1)');
    }
  };

  // Build recursive tree
  const buildTree = (parentId = null) => {
    return accounts
      .filter((a) => (parentId === null ? !a.parent_id : a.parent_id === parentId))
      .map((acc) => ({
        ...acc,
        children: buildTree(acc.id),
      }));
  };

  const tree = buildTree(null);

  const renderTreeNodes = (nodes, level = 0) => {
    return nodes.map((node) => {
      const hasChildren = node.children && node.children.length > 0;
      const isExpanded = expandedNodes[node.id];

      return (
        <div key={node.id} className="select-none">
          <div
            className={`flex items-center justify-between p-3 rounded-xl border border-transparent hover:border-slate-200 hover:bg-slate-50 transition-colors ${
              level === 0 ? 'bg-slate-100/70 font-bold mb-1' : 'text-xs'
            }`}
            style={{ paddingRight: `${level * 1.5 + 0.75}rem` }}
          >
            <div className="flex items-center gap-2.5">
              {hasChildren ? (
                <button
                  type="button"
                  onClick={() => toggleExpand(node.id)}
                  className="p-1 text-slate-500 hover:text-slate-800 rounded transition-colors"
                >
                  {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
              ) : (
                <span className="w-4 inline-block" />
              )}

              {level === 0 ? (
                <Layers className="w-4 h-4 text-amber-600" />
              ) : hasChildren ? (
                <Folder className="w-4 h-4 text-slate-500" />
              ) : (
                <File className="w-4 h-4 text-slate-400" />
              )}

              <span className="font-mono font-bold text-slate-800 bg-slate-200/80 px-2 py-0.5 rounded text-[11px]">
                {node.code}
              </span>
              <span className="text-slate-900 font-semibold">{node.name_ar || node.name}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-slate-200 text-slate-700">
                {node.nature === 'debit' ? 'طبيعة: مدين' : 'طبيعة: دائن'}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="font-mono font-bold text-slate-800 text-xs">
                {Number(node.current_balance ?? node.balance ?? 0).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })}{' '}
                ر.س
              </span>

              {/* Actions */}
              <div className="flex items-center gap-1">
                {level < 5 && (
                  <button
                    onClick={() => handleOpenAddModal(node)}
                    className="px-2 py-1 bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-800 border border-slate-200 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-all"
                    title="إضافة حساب فرعي موروث (UC-17)"
                  >
                    <Plus className="w-3 h-3" />
                    <span>فرعي</span>
                  </button>
                )}

                {!node.is_fixed_root && node.account_type !== 'root' && (
                  <>
                    <button
                      onClick={() => handleOpenEditModal(node)}
                      className="p-1 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-lg text-xs"
                      title="تعديل بيانات الحساب (UC-18)"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteAccount(node)}
                      className="p-1 bg-white hover:bg-rose-50 text-rose-600 border border-slate-200 rounded-lg text-xs"
                      title="حذف الحساب (UC-19)"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {hasChildren && isExpanded && (
            <div className="border-r border-slate-200 mr-4 pr-1">{renderTreeNodes(node.children, level + 1)}</div>
          )}
        </div>
      );
    });
  };

  return (
    <ProtectedRoute allowedRoles={['general_accountant', 'branch_manager']}>
      <AppLayout
        title="دليل وشجرة الحسابات (Chart of Accounts) - UC-16 إلى UC-19"
        subtitle="الهيكل المحاسبي الشجري التوريثي للأصول والخصوم وحقوق الملكية، وإدارة الحسابات الفرعية"
      >
        {/* Top Banner */}
        <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">الهيكل المالي وشجرة الحسابات COA</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              تُورث طبيعة الحساب (مدين/دائن) تلقائياً من الحساب الرئيسي الثابت، مع منع حذف الحسابات المرتبطة بقيود
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>مطابق لمعايير المحاسبة السعودية (SOCPA)</span>
          </span>
        </div>

        {/* Tree Container */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-8">
          {isLoading ? (
            <div className="py-12 text-center text-slate-400 text-xs">جاري تحميل شجرة الحسابات...</div>
          ) : accounts.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">لم يتم إنشاء حسابات بعد (UC-16 Alternative 1)</div>
          ) : (
            <div className="space-y-1">{renderTreeNodes(tree)}</div>
          )}
        </div>

        {/* Modal: Add Sub-Account (UC-17) */}
        {modalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 my-8">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <h4 className="font-bold text-base text-slate-900">إضافة حساب فرعي جديد (UC-17)</h4>
                <button onClick={() => setModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 mb-4">
                <div>
                  <strong>الحساب الأب:</strong> {parentAccount?.name_ar || parentAccount?.name} ({parentAccount?.code})
                </div>
                <div className="mt-1">
                  <strong>طبيعة الحساب الموروثة:</strong>{' '}
                  <span className="font-bold text-slate-900">
                    {parentAccount?.nature === 'debit' ? 'مدين (Debit)' : 'دائن (Credit)'}
                  </span>
                </div>
              </div>

              <form onSubmit={handleCreateSubAccount} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">اسم الحساب *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="اسم الحساب الجديد (3 إلى 100 حرف)..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-slate-900 focus:outline-none"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">الرصيد الافتتاحي (ر.س)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.opening_balance}
                      onChange={(e) => setFormData({ ...formData, opening_balance: e.target.value })}
                      placeholder="0.00"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">تاريخ فتح الحساب</label>
                    <input
                      type="date"
                      value={formData.opening_date}
                      onChange={(e) => setFormData({ ...formData, opening_date: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900"
                    />
                  </div>
                </div>

                {/* Asset Depreciation Fields (UC-17) */}
                {parentAccount?.root_type === 'assets' && (
                  <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl space-y-3">
                    <span className="text-xs font-bold text-amber-900 block">بيانات إهلاك الأصول (UC-17)</span>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block text-slate-700 mb-1">طريقة الإهلاك</label>
                        <select
                          value={formData.depreciation_method}
                          onChange={(e) => setFormData({ ...formData, depreciation_method: e.target.value })}
                          className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                        >
                          <option value="straight_line">قسط ثابت</option>
                          <option value="declining_balance">قسط متناقص</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-slate-700 mb-1">نسبة الإهلاك (%)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.depreciation_rate}
                          onChange={(e) => setFormData({ ...formData, depreciation_rate: e.target.value })}
                          placeholder="مثال: 5"
                          className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-mono"
                        />
                      </div>
                    </div>
                  </div>
                )}

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
                    حفظ الحساب الفرعي (UC-17)
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Edit Account (UC-18) */}
        {editModalOpen && editingAccount && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 my-8">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <h4 className="font-bold text-base text-slate-900">تعديل بيانات الحساب (UC-18): {editingAccount.code}</h4>
                <button onClick={() => setEditModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleUpdateAccount} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">اسم الحساب *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">طبيعة الحساب</label>
                    <input
                      type="text"
                      disabled
                      value={editingAccount.nature === 'debit' ? 'مدين (ثابت)' : 'دائن (ثابت)'}
                      className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-500 cursor-not-allowed font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">الرصيد الافتتاحي</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.opening_balance}
                      onChange={(e) => setFormData({ ...formData, opening_balance: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setEditModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-sm"
                  >
                    حفظ التعديلات (UC-18)
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
