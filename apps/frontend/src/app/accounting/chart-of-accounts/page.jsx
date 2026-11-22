'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '../../../components/AppLayout';
import ProtectedRoute from '../../../components/ProtectedRoute';
import api from '../../../services/api';
import { BookOpen, Plus, ChevronRight, ChevronDown, Folder, File, Layers, ShieldCheck } from 'lucide-react';

export default function ChartOfAccountsPage() {
  const [accounts, setAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedNodes, setExpandedNodes] = useState({});

  // Sub-account Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [parentAccount, setParentAccount] = useState(null);
  const [accountNameAr, setAccountNameAr] = useState('');
  const [accountNameEn, setAccountNameEn] = useState('');

  const fetchAccounts = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/accounts').catch(() => ({ data: { data: [] } }));
      const list = res.data.data || [];
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
    setAccountNameAr('');
    setAccountNameEn('');
    setModalOpen(true);
  };

  const handleCreateSubAccount = async (e) => {
    e.preventDefault();
    try {
      await api.post('/accounts', {
        parent_id: parentAccount.id,
        name_ar: accountNameAr,
        name_en: accountNameEn,
      });
      alert('تم إنشاء الحساب الفرعي بنجاح!');
      setModalOpen(false);
      fetchAccounts();
    } catch (err) {
      alert(err.response?.data?.message || 'فشل في إنشاء الحساب الفرعي');
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
              level === 0 ? 'bg-slate-100/60 font-bold mb-1' : 'text-xs'
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
              {node.name_en && <span className="text-slate-400 text-[10px]">({node.name_en})</span>}
            </div>

            <div className="flex items-center gap-4">
              <span className="font-mono font-bold text-slate-800 text-xs">
                {Number(node.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} ر.س
              </span>

              {level < 4 && (
                <button
                  onClick={() => handleOpenAddModal(node)}
                  className="px-2 py-1 bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-800 border border-slate-200 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-all"
                  title="إضافة حساب فرعي"
                >
                  <Plus className="w-3 h-3" />
                  <span>فرعي</span>
                </button>
              )}
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
      <AppLayout title="دليل وشجرة الحسابات (Chart of Accounts)" subtitle="الهيكل المحاسبي الشجري التوريثي للأصول والخصوم وحقوق الملكية">
      {/* Top Banner */}
      <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900">الهيكل المالي للشركة</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            مبني على 5 فئات رئيسية موروثة (الأصول 1، الخصوم 2، حقوق الملكية 3، الإيرادات 4، المصروفات 5)
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>مطابق للمعايير السعودية (SOCPA / IFRS)</span>
        </span>
      </div>

      {/* Tree Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-8">
        {isLoading ? (
          <div className="py-12 text-center text-slate-400 text-xs">جاري تحميل شجرة الحسابات...</div>
        ) : (
          <div className="space-y-1">{renderTreeNodes(tree)}</div>
        )}
      </div>

      {/* Sub Account Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h4 className="font-bold text-base text-slate-900 mb-1">إضافة حساب فرعي جديد</h4>
            <p className="text-xs text-slate-500 mb-4">
              الحساب الأب: <strong>{parentAccount?.name_ar || parentAccount?.name}</strong> ({parentAccount?.code})
            </p>

            <form onSubmit={handleCreateSubAccount} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">اسم الحساب (عربي)</label>
                <input
                  type="text"
                  value={accountNameAr}
                  onChange={(e) => setAccountNameAr(e.target.value)}
                  placeholder="مثال: البنك الأهلي السعودي"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Account Name (English)</label>
                <input
                  type="text"
                  value={accountNameEn}
                  onChange={(e) => setAccountNameEn(e.target.value)}
                  placeholder="e.g. Saudi National Bank (SNB)"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
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
                  حفظ الحساب
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

