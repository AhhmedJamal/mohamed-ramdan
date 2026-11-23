'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '../../components/AppLayout';
import ProtectedRoute from '../../components/ProtectedRoute';
import api from '../../services/api';
import {
  Users, Plus, Search, RefreshCw, Phone, Mail, Building,
  CreditCard, Edit2, Trash2, AlertTriangle, CheckCircle2, UserCheck,
  Eye, FileText, X
} from 'lucide-react';

export default function TenantsMasterPage() {
  const [tenants, setTenants] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);
  const [selectedTenantDetails, setSelectedTenantDetails] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [formError, setFormError] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    type: 'individual',
    national_id_or_cr: '',
    mobile: '',
    email: '',
    address: '',
    notes: '',
  });

  const fetchTenants = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/tenants');
      const data = res.data.data || res.data.tenants || [];
      setTenants(data);
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
    if (!formData.national_id_or_cr || formData.national_id_or_cr.trim().length === 0) {
      setFormError('رقم الهوية / السجل التجاري إلزامي');
      setActionLoading(false);
      return;
    }

    if (!formData.mobile || !/^05[0-9]{8}$/.test(formData.mobile)) {
      setFormError('يرجى إدخال رقم جوال صحيح يبدأ بـ 05 ويتكون من 10 أرقام');
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
        name: '',
        type: 'individual',
        national_id_or_cr: '',
        mobile: '',
        email: '',
        address: '',
        notes: '',
      });
      await fetchTenants();
    } catch (err) {
      setFormError(err.response?.data?.message || 'حدث خطأ أثناء حفظ بيانات المستأجر');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (tenant) => {
    if (!window.confirm(`هل أنت متأكد من حذف المستأجر "${tenant.name || tenant.full_name}"؟`)) return;

    try {
      await api.delete(`/tenants/${tenant.id}`);
      await fetchTenants();
    } catch (err) {
      alert(err.response?.data?.message || 'لا يمكن حذف المستأجر لوجود عقود إيجار مرتبطة به');
    }
  };

  const openAddModal = () => {
    setEditingTenant(null);
    setFormData({
      name: '',
      type: 'individual',
      national_id_or_cr: '',
      mobile: '',
      email: '',
      address: '',
      notes: '',
    });
    setFormError(null);
    setShowAddModal(true);
  };

  const openEditModal = (tenant) => {
    setEditingTenant(tenant);
    setFormData({
      name: tenant.name || tenant.full_name || '',
      type: tenant.type || (tenant.is_corporate ? 'company' : 'individual'),
      national_id_or_cr: tenant.national_id_or_cr || tenant.national_id || '',
      mobile: tenant.mobile || '',
      email: tenant.email || '',
      address: tenant.address || '',
      notes: tenant.notes || '',
    });
    setFormError(null);
    setShowAddModal(true);
  };

  const openDetailsModal = async (tenant) => {
    try {
      const res = await api.get(`/tenants/${tenant.id}`);
      setSelectedTenantDetails(res.data.data || res.data.tenant || tenant);
    } catch (err) {
      setSelectedTenantDetails(tenant);
    }
  };

  const filteredTenants = tenants.filter((t) => {
    const q = searchQuery.toLowerCase();
    const name = (t.name || t.full_name || '').toLowerCase();
    const idNum = (t.national_id_or_cr || t.national_id || '');
    const mob = t.mobile || '';
    const em = (t.email || '').toLowerCase();

    const matchesSearch =
      name.includes(q) ||
      idNum.includes(q) ||
      mob.includes(q) ||
      em.includes(q);

    const matchesType =
      filterType === 'all'
        ? true
        : filterType === 'company'
        ? t.type === 'company' || t.is_corporate
        : t.type === 'individual' || !t.is_corporate;

    return matchesSearch && matchesType;
  });

  return (
    <ProtectedRoute allowedRoles={['branch_manager', 'data_entry', 'general_accountant']}>
      <AppLayout
        title="إدارة المستأجرين (Tenants Management)"
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
                placeholder="البحث بالاسم أو رقم الهوية أو الجوال..."
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
              <option value="individual">أفراد (شخص طبيعي)</option>
              <option value="company">شركات ومؤسسات (جهة اعتبارية)</option>
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
              onClick={openAddModal}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة مستأجر جديد (UC-34)</span>
            </button>
          </div>
        </div>

        {/* Tenants Table (UC-33) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                <tr>
                  <th className="py-3.5 px-4">اسم المستأجر</th>
                  <th className="py-3.5 px-4">نوع المستأجر</th>
                  <th className="py-3.5 px-4">رقم الهوية / السجل التجاري</th>
                  <th className="py-3.5 px-4">رقم الجوال</th>
                  <th className="py-3.5 px-4">البريد الإلكتروني</th>
                  <th className="py-3.5 px-4">العقود النشطة</th>
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
                        <div className="font-bold text-slate-900">{tenant.name || tenant.full_name}</div>
                        {tenant.address && (
                          <span className="text-[10px] text-slate-400 block mt-0.5">{tenant.address}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {tenant.type === 'company' || tenant.is_corporate ? (
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
                        <div className="font-semibold text-slate-800">{tenant.national_id_or_cr || tenant.national_id}</div>
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
                          {tenant.active_contracts_count ?? tenant.contracts_count ?? 0} عقود
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => openDetailsModal(tenant)}
                            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors"
                            title="عرض تفاصيل المستأجر والعقود (UC-33)"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => openEditModal(tenant)}
                            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors"
                            title="تعديل بيانات المستأجر (UC-35)"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(tenant)}
                            className="p-1.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 transition-colors"
                            title="حذف المستأجر (UC-36)"
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

        {/* Add/Edit Modal (UC-34 / UC-35) */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-lg overflow-hidden">
              <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-500" />
                  <span>{editingTenant ? 'تعديل مستأجر (UC-35)' : 'إضافة مستأجر جديد (UC-34)'}</span>
                </h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateOrUpdate} className="p-6 space-y-4 text-xs">
                {formError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1">اسم المستأجر *</label>
                    <input
                      type="text"
                      required
                      minLength={3}
                      maxLength={100}
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="مثال: عبدالله محمد الشمري أو شركة الأفق للمقاولات"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:bg-white"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1">نوع المستأجر *</label>
                    <div className="flex items-center gap-6 mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="tenant_type"
                          value="individual"
                          checked={formData.type === 'individual'}
                          onChange={() => setFormData({ ...formData, type: 'individual' })}
                          className="text-amber-600 focus:ring-amber-500"
                        />
                        <span className="font-semibold text-slate-800">فرد</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="tenant_type"
                          value="company"
                          checked={formData.type === 'company'}
                          onChange={() => setFormData({ ...formData, type: 'company' })}
                          className="text-amber-600 focus:ring-amber-500"
                        />
                        <span className="font-semibold text-slate-800">شركة</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      {formData.type === 'company' ? 'رقم السجل التجاري (فريد) *' : 'رقم الهوية الوطنية / الإقامة (فريد) *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.national_id_or_cr}
                      onChange={(e) => setFormData({ ...formData, national_id_or_cr: e.target.value })}
                      placeholder="10 أرقام"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-amber-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">رقم الجوال (10 أرقام يبدأ بـ 05) *</label>
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

                  <div className="col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1">البريد الإلكتروني *</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="tenant@domain.com"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:bg-white"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1">العنوان (اختياري)</label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="المدينة، الحي، الشارع"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:bg-white"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1">ملاحظات (اختياري - حد أقصى 500 حرف)</label>
                    <textarea
                      rows={2}
                      maxLength={500}
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="أي ملاحظات إضافية بخصوص المستأجر..."
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

        {/* View Details & Contracts Modal (UC-33) */}
        {selectedTenantDetails && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-2xl overflow-hidden">
              <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-500" />
                  <span>تفاصيل المستأجر وسجل العقود (UC-33)</span>
                </h3>
                <button
                  onClick={() => setSelectedTenantDetails(null)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-slate-500 block">اسم المستأجر:</span>
                    <span className="font-bold text-slate-900 text-sm">{selectedTenantDetails.name || selectedTenantDetails.full_name}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">نوع الكيان:</span>
                    <span className="font-semibold text-slate-800">
                      {selectedTenantDetails.type === 'company' || selectedTenantDetails.is_corporate ? 'شركة / مؤسسة' : 'فرد'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">رقم الهوية / السجل:</span>
                    <span className="font-mono font-bold text-slate-900">{selectedTenantDetails.national_id_or_cr || selectedTenantDetails.national_id}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">رقم الجوال:</span>
                    <span className="font-mono text-slate-800">{selectedTenantDetails.mobile}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">البريد الإلكتروني:</span>
                    <span className="font-mono text-slate-800">{selectedTenantDetails.email || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">العنوان:</span>
                    <span className="text-slate-800">{selectedTenantDetails.address || '—'}</span>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-amber-600" />
                    <span>سجل العقود المرتبطة ({selectedTenantDetails.contracts?.length || 0})</span>
                  </h4>

                  {(!selectedTenantDetails.contracts || selectedTenantDetails.contracts.length === 0) ? (
                    <div className="p-4 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl">
                      لا توجد عقود إيجارية مسجلة لهذا المستأجر
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-slate-200 rounded-xl">
                      <table className="w-full text-right text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                          <tr>
                            <th className="py-2.5 px-3">رقم العقد</th>
                            <th className="py-2.5 px-3">العقار / الوحدة</th>
                            <th className="py-2.5 px-3">القيمة السنوية</th>
                            <th className="py-2.5 px-3">الفترة</th>
                            <th className="py-2.5 px-3">الحالة</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {selectedTenantDetails.contracts.map((c) => (
                            <tr key={c.id}>
                              <td className="py-2.5 px-3 font-mono font-bold text-slate-900">#{c.contract_number}</td>
                              <td className="py-2.5 px-3 text-slate-700">{c.property?.name} - وحدة {c.unit?.unit_number}</td>
                              <td className="py-2.5 px-3 font-mono font-bold">{Number(c.annual_rent || c.total_amount || 0).toLocaleString()} ر.س</td>
                              <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">{c.start_date} إلى {c.end_date}</td>
                              <td className="py-2.5 px-3">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                  c.status === 'active' ? 'bg-emerald-50 text-emerald-700' :
                                  c.status === 'overdue' ? 'bg-red-50 text-red-700' :
                                  c.status === 'cancelled' ? 'bg-rose-50 text-rose-700' :
                                  'bg-slate-100 text-slate-700'
                                }`}>
                                  {c.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-4 border-t border-slate-100">
                  <button
                    onClick={() => setSelectedTenantDetails(null)}
                    className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold"
                  >
                    إغلاق
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
