'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '../../../components/AppLayout';
import ProtectedRoute from '../../../components/ProtectedRoute';
import api from '../../../services/api';
import {
  Building2, Plus, ShieldAlert, CheckCircle, RefreshCw,
  Search, Lock, Unlock, Users, AlertTriangle, ExternalLink
} from 'lucide-react';

export default function CompaniesManagementPage() {
  const [companies, setCompanies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [freezeModalCompany, setFreezeModalCompany] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [formError, setFormError] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    trade_activity: '',
    address: '',
    country: 'السعودية',
    city: 'الرياض',
    tax_number: '',
    subdomain: '',
  });

  const fetchCompanies = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/companies');
      setCompanies(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch companies', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const handleCreateCompany = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setFormError(null);

    try {
      await api.post('/companies', formData);
      setShowAddModal(false);
      setFormData({
        name: '',
        trade_activity: '',
        address: '',
        country: 'السعودية',
        city: 'الرياض',
        tax_number: '',
        subdomain: '',
      });
      fetchCompanies();
    } catch (err) {
      setFormError(err.response?.data?.message || 'حدث خطأ أثناء إضافة الشركة');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleFreeze = async (company) => {
    setActionLoading(true);
    try {
      const action = company.status === 'active' ? 'freeze' : 'unfreeze';
      await api.post(`/companies/${company.id}/${action}`);
      setFreezeModalCompany(null);
      fetchCompanies();
    } catch (err) {
      alert(err.response?.data?.message || 'حدث خطأ أثناء تعديل حالة تجميد الشركة');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredCompanies = companies.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      c.name?.toLowerCase().includes(q) ||
      c.subdomain?.toLowerCase().includes(q) ||
      c.trade_activity?.toLowerCase().includes(q) ||
      c.tax_number?.includes(q)
    );
  });

  return (
    <ProtectedRoute allowedRoles={['super_admin']}>
      <AppLayout
        title="إدارة الشركات المستأجرة"
        subtitle="حصر الشركات التابعة لمجموعة محمد رمضان، إدارة النطاقات، وتجميد/تفعيل الحسابات (UC-07 إلى UC-11)"
      >
        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
          <div className="relative w-full sm:w-80">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="البحث باسم الشركة أو النطاق أو الرقم الضريبي..."
              className="w-full pl-3 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm"
            />
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              onClick={fetchCompanies}
              disabled={isLoading}
              className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 shadow-sm transition-colors"
              title="تحديث البيانات"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة شركة جديدة</span>
            </button>
          </div>
        </div>

        {/* Companies Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                <tr>
                  <th className="py-3.5 px-4">اسم الشركة</th>
                  <th className="py-3.5 px-4">النطاق الفرعي (Subdomain)</th>
                  <th className="py-3.5 px-4">النشاط التجاري</th>
                  <th className="py-3.5 px-4">المدينة / الدولة</th>
                  <th className="py-3.5 px-4">الرقم الضريبي (VAT)</th>
                  <th className="py-3.5 px-4">قاعدة البيانات</th>
                  <th className="py-3.5 px-4">الحالة</th>
                  <th className="py-3.5 px-4 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {isLoading ? (
                  <tr>
                    <td colSpan="8" className="py-12 text-center text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-500" />
                      جاري تحميل الشركات...
                    </td>
                  </tr>
                ) : filteredCompanies.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="py-12 text-center text-slate-400">
                      لا توجد شركات مطابقة للبحث
                    </td>
                  </tr>
                ) : (
                  filteredCompanies.map((comp) => (
                    <tr key={comp.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>{comp.name}</span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600">
                        <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[11px]">
                          {comp.subdomain}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">{comp.trade_activity}</td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {comp.city} - {comp.country}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600">{comp.tax_number || '—'}</td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">{comp.db_name || 'tenant_db'}</td>
                      <td className="py-3.5 px-4">
                        {comp.status === 'active' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle className="w-3.5 h-3.5" />
                            نشطة
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200">
                            <ShieldAlert className="w-3.5 h-3.5" />
                            مجمدة
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setFreezeModalCompany(comp)}
                            className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-colors ${
                              comp.status === 'active'
                                ? 'bg-red-50 hover:bg-red-100 text-red-700 border-red-200'
                                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                            }`}
                            title={comp.status === 'active' ? 'تجميد الشركة' : 'إلغاء التجميد والتفعيل'}
                          >
                            {comp.status === 'active' ? (
                              <>
                                <Lock className="w-3.5 h-3.5" />
                                <span>تجميد</span>
                              </>
                            ) : (
                              <>
                                <Unlock className="w-3.5 h-3.5" />
                                <span>تفعيل</span>
                              </>
                            )}
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

        {/* Add Company Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-lg overflow-hidden">
              <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-amber-500" />
                  <span>إضافة شركة جديدة للمجموعة (UC-07)</span>
                </h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateCompany} className="p-6 space-y-4 text-xs">
                {formError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1">اسم الشركة *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="مثال: شركة رمضان للتطوير العقاري"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">النطاق الفرعي (Subdomain) *</label>
                    <input
                      type="text"
                      required
                      value={formData.subdomain}
                      onChange={(e) => setFormData({ ...formData, subdomain: e.target.value.toLowerCase().trim() })}
                      placeholder="comp4"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-amber-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">الرقم الضريبي (15 رقم) *</label>
                    <input
                      type="text"
                      required
                      maxLength={15}
                      value={formData.tax_number}
                      onChange={(e) => setFormData({ ...formData, tax_number: e.target.value })}
                      placeholder="300000000400003"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-amber-500 focus:bg-white"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1">النشاط التجاري *</label>
                    <input
                      type="text"
                      required
                      value={formData.trade_activity}
                      onChange={(e) => setFormData({ ...formData, trade_activity: e.target.value })}
                      placeholder="تطوير وإدارة الأملاك العقارية والمجمعات السكنية"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">المدينة *</label>
                    <input
                      type="text"
                      required
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">الدولة *</label>
                    <input
                      type="text"
                      required
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:bg-white"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1">العنوان التفصيلي *</label>
                    <input
                      type="text"
                      required
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="طريق الملك عبدالعزيز، حي الياسمين"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:bg-white"
                    />
                  </div>
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
                    {actionLoading ? 'جاري الإنشاء...' : 'حفظ وإنشاء الشركة'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Freeze/Unfreeze Confirmation Modal */}
        {freezeModalCompany && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-md overflow-hidden">
              <div className={`p-5 text-white flex items-center gap-3 ${
                freezeModalCompany.status === 'active' ? 'bg-red-700' : 'bg-emerald-700'
              }`}>
                {freezeModalCompany.status === 'active' ? (
                  <ShieldAlert className="w-6 h-6 shrink-0" />
                ) : (
                  <CheckCircle className="w-6 h-6 shrink-0" />
                )}
                <div>
                  <h3 className="font-bold text-sm">
                    {freezeModalCompany.status === 'active' ? 'تجميد حساب الشركة' : 'إلغاء تجميد الشركة'}
                  </h3>
                  <p className="text-xs opacity-90">{freezeModalCompany.name}</p>
                </div>
              </div>

              <div className="p-6 text-xs text-slate-700 space-y-3">
                {freezeModalCompany.status === 'active' ? (
                  <>
                    <p className="font-semibold text-red-600 leading-relaxed">
                      تحذير أمني هام (UC-09 & NFR-003):
                    </p>
                    <p className="leading-relaxed">
                      عند تجميد الشركة، سيتم فوراً إبطال جميع الجلسات النشطة لجميع موظفي هذه الشركة وطردهم من النظام،
                      ولن يتمكن أي مستخدم تابع لها من تسجيل الدخول حتى يتم إلغاء التجميد من قبل الأدمن العام.
                    </p>
                  </>
                ) : (
                  <p className="leading-relaxed">
                    سيتم تفعيل حساب الشركة والسماح لموظفيها بتسجيل الدخول ومتابعة العمليات المحاسبية والتشغيلية المعتادة.
                  </p>
                )}

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    onClick={() => setFreezeModalCompany(null)}
                    disabled={actionLoading}
                    className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={() => handleToggleFreeze(freezeModalCompany)}
                    disabled={actionLoading}
                    className={`px-5 py-2 text-white font-semibold rounded-xl shadow disabled:opacity-50 ${
                      freezeModalCompany.status === 'active'
                        ? 'bg-red-700 hover:bg-red-800'
                        : 'bg-emerald-700 hover:bg-emerald-800'
                    }`}
                  >
                    {actionLoading
                      ? 'جاري التنفيذ...'
                      : freezeModalCompany.status === 'active'
                      ? 'تأكيد التجميد الآن'
                      : 'تأكيد التفعيل'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </AppLayout>
    </ProtectedRoute>
  );
}

