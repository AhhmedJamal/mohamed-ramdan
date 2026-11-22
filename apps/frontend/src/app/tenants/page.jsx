'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '../../components/AppLayout';
import ProtectedRoute from '../../components/ProtectedRoute';
import api from '../../services/api';
import {
  Users, Plus, Search, RefreshCw, Phone, Mail, Building,
  CreditCard, Edit2, Trash2, AlertTriangle, CheckCircle2, UserCheck
} from 'lucide-react';

export default function TenantsMasterPage() {
  const [tenants, setTenants] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [formError, setFormError] = useState(null);

  const [formData, setFormData] = useState({
    full_name: '',
    id_type: 'national_id',
    national_id: '',
    mobile: '',
    email: '',
    is_corporate: false,
    cr_number: '',
    company_name: '',
  });

  const fetchTenants = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/tenants');
      setTenants(res.data.data || []);
    } catch (err) {
      console.error('Failed to load tenants', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  const handleCreateOrUpdate = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setFormError(null);

    // Validation per SRS UC-34
    if (!formData.national_id || formData.national_id.length !== 10) {
      setFormError('رقم الهوية الوطنية / الإقامة يجب أن يتكون من 10 أرقام');
      setActionLoading(false);
      return;
    }

    if (!formData.mobile || !/^05[0-9]{8}$/.test(formData.mobile)) {
      setFormError('رقم الجوال يجب أن يتكون من 10 أرقام ويبدأ بـ 05');
      setActionLoading(false);
      return;
    }

    if (formData.is_corporate && !formData.cr_number) {
      setFormError('رقم السجل التجاري إلزامي للمستأجرين من الشركات والمؤسسات');
      setActionLoading(false);
      return;
    }

    try {
      if (editingTenant) {
        await api.put(`/tenants/${editingTenant.id}`, formData);
      } else {
        await api.post('/tenants', formData);
      }

      setShowAddModal(false);
      setEditingTenant(null);
      setFormData({
        full_name: '',
        id_type: 'national_id',
        national_id: '',
        mobile: '',
        email: '',
        is_corporate: false,
        cr_number: '',
        company_name: '',
      });
      fetchTenants();
    } catch (err) {
      setFormError(err.response?.data?.message || 'حدث خطأ أثناء حفظ بيانات المستأجر');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (tenant) => {
    if (!window.confirm(`هل أنت متأكد من حذف المستأجر "${tenant.full_name}"؟`)) return;

    try {
      await api.delete(`/tenants/${tenant.id}`);
      fetchTenants();
    } catch (err) {
      alert(err.response?.data?.message || 'لا يمكن حذف المستأجر لوجود عقود إيجارية أو سندات مالية مرتبطة به');
    }
  };

  const openEditModal = (tenant) => {
    setEditingTenant(tenant);
    setFormData({
      full_name: tenant.full_name,
      id_type: tenant.id_type || 'national_id',
      national_id: tenant.national_id,
      mobile: tenant.mobile,
      email: tenant.email,
      is_corporate: Boolean(tenant.is_corporate),
      cr_number: tenant.cr_number || '',
      company_name: tenant.company_name || '',
    });
    setFormError(null);
    setShowAddModal(true);
  };

  const filteredTenants = tenants.filter((t) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      t.full_name?.toLowerCase().includes(q) ||
      t.national_id?.includes(q) ||
      t.mobile?.includes(q) ||
      t.company_name?.toLowerCase().includes(q);

    const matchesType =
      filterType === 'all'
        ? true
        : filterType === 'corporate'
        ? t.is_corporate
        : !t.is_corporate;

    return matchesSearch && matchesType;
  });

  return (
    <ProtectedRoute allowedRoles={['branch_manager', 'data_entry', 'general_accountant']}>
      <AppLayout
        title="سجل المستأجرين الرئيسي (Tenants Master Registry)"
        subtitle="حصر بيانات المستأجرين من الأفراد والشركات، التحقق من الهوية والسجل التجاري، ومتابعة العقود (UC-33 إلى UC-36)"
      >
        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-80">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="البحث بالاسم أو رقم الهوية أو الجوال أو السجل..."
                className="w-full pl-3 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 shadow-sm"
              />
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
            </div>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="py-2.5 px-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 shadow-sm focus:ring-2 focus:ring-amber-500"
            >
              <option value="all">كافة المستأجرين</option>
              <option value="individual">أفراد (هوية / إقامة)</option>
              <option value="corporate">شركات ومؤسسات (سجل تجاري)</option>
            </select>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              onClick={fetchTenants}
              disabled={isLoading}
              className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 shadow-sm transition-colors"
              title="تحديث البيانات"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => {
                setEditingTenant(null);
                setFormData({
                  full_name: '',
                  id_type: 'national_id',
                  national_id: '',
                  mobile: '',
                  email: '',
                  is_corporate: false,
                  cr_number: '',
                  company_name: '',
                });
                setFormError(null);
                setShowAddModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة مستأجر جديد</span>
            </button>
          </div>
        </div>

        {/* Tenants Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                <tr>
                  <th className="py-3.5 px-4">اسم المستأجر</th>
                  <th className="py-3.5 px-4">نوع الكيان</th>
                  <th className="py-3.5 px-4">رقم الهوية / الإقامة / السجل</th>
                  <th className="py-3.5 px-4">رقم الجوال</th>
                  <th className="py-3.5 px-4">البريد الإلكتروني</th>
                  <th className="py-3.5 px-4">العقود المرتبطة</th>
                  <th className="py-3.5 px-4 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {isLoading ? (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-500" />
                      جاري تحميل بيانات المستأجرين...
                    </td>
                  </tr>
                ) : filteredTenants.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-slate-400">
                      لا يوجد مستأجرون مطابقون للبحث
                    </td>
                  </tr>
                ) : (
                  filteredTenants.map((tenant) => (
                    <tr key={tenant.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{tenant.full_name}</div>
                        {tenant.is_corporate && tenant.company_name && (
                          <span className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <Building className="w-3 h-3 text-slate-400" />
                            {tenant.company_name}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {tenant.is_corporate ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                            شركة / مؤسسة
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            فرد (شخص طبيعي)
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono">
                        <div className="font-semibold text-slate-800">{tenant.national_id}</div>
                        {tenant.is_corporate && tenant.cr_number && (
                          <div className="text-[10px] text-slate-400">س.ت: {tenant.cr_number}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600">
                        <span className="inline-flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {tenant.mobile}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-mono">
                        {tenant.email ? (
                          <span className="inline-flex items-center gap-1">
                            <Mail className="w-3 h-3 text-slate-400" />
                            {tenant.email}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-800 font-mono">
                          {tenant.contracts_count || 0} عقود
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => openEditModal(tenant)}
                            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors"
                            title="تعديل بيانات المستأجر"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(tenant)}
                            className="p-1.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 transition-colors"
                            title="حذف المستأجر"
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

        {/* Add/Edit Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-lg overflow-hidden">
              <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-500" />
                  <span>{editingTenant ? 'تعديل بيانات المستأجر (UC-35)' : 'إضافة مستأجر جديد (UC-34)'}</span>
                </h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateOrUpdate} className="p-6 space-y-4 text-xs">
                {formError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-800">هل المستأجر جهة اعتبارية (شركة / مؤسسة)؟</p>
                    <p className="text-[11px] text-slate-500">تفعيل هذا الخيار يوجب إدخال رقم السجل التجاري</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.is_corporate}
                    onChange={(e) => setFormData({ ...formData, is_corporate: e.target.checked })}
                    className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1">
                      {formData.is_corporate ? 'اسم المفوض / الممثل النظامي *' : 'اسم المستأجر الكامل *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      placeholder="مثال: عبدالله محمد الشمري"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:bg-white"
                    />
                  </div>

                  {formData.is_corporate && (
                    <>
                      <div className="col-span-2">
                        <label className="block font-semibold text-slate-700 mb-1">اسم المنشأة أو الشركة *</label>
                        <input
                          type="text"
                          required
                          value={formData.company_name}
                          onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                          placeholder="مثال: شركة آفاق التقنية للتجارة والمقاولات"
                          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:bg-white"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">رقم السجل التجاري (CR) *</label>
                        <input
                          type="text"
                          required
                          value={formData.cr_number}
                          onChange={(e) => setFormData({ ...formData, cr_number: e.target.value })}
                          placeholder="1010xxxxxx"
                          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-amber-500 focus:bg-white"
                        />
                      </div>
                    </>
                  )}

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">نوع الهوية *</label>
                    <select
                      value={formData.id_type}
                      onChange={(e) => setFormData({ ...formData, id_type: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:bg-white"
                    >
                      <option value="national_id">هوية وطنية سعودية</option>
                      <option value="iqama">إقامة نظامية</option>
                      <option value="cr">سجل تجاري</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">رقم الهوية الوطنية / الإقامة (10 أرقام) *</label>
                    <input
                      type="text"
                      required
                      maxLength={10}
                      value={formData.national_id}
                      onChange={(e) => setFormData({ ...formData, national_id: e.target.value })}
                      placeholder="10xxxxxxxx أو 20xxxxxxxx"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-amber-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">رقم الجوال السعودي (10 أرقام) *</label>
                    <input
                      type="text"
                      required
                      maxLength={10}
                      value={formData.mobile}
                      onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                      placeholder="05xxxxxxxx"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-amber-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">البريد الإلكتروني</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="tenant@domain.com"
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
                    {actionLoading ? 'جاري الحفظ...' : editingTenant ? 'تحديث البيانات' : 'حفظ المستأجر'}
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

