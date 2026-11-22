'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '../../../components/AppLayout';
import ProtectedRoute from '../../../components/ProtectedRoute';
import api from '../../../services/api';
import {
  Users, Plus, Search, RefreshCw, CheckCircle, XCircle,
  AlertTriangle, Trash2, Edit2, Shield, Phone, Mail, Lock
} from 'lucide-react';

export default function EmployeesManagementPage() {
  const [employees, setEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [formError, setFormError] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile: '',
    role: 'data_entry',
    temporary_password: '',
  });

  const fetchEmployees = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/company/employees');
      setEmployees(res.data.data || []);
    } catch (err) {
      console.error('Failed to load employees', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleCreateOrUpdate = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setFormError(null);

    try {
      if (editingEmployee) {
        await api.put(`/company/employees/${editingEmployee.id}`, {
          name: formData.name,
          email: formData.email,
          mobile: formData.mobile,
          role: formData.role,
        });
      } else {
        await api.post('/company/employees', formData);
      }

      setShowAddModal(false);
      setEditingEmployee(null);
      setFormData({
        name: '',
        email: '',
        mobile: '',
        role: 'data_entry',
        temporary_password: '',
      });
      fetchEmployees();
    } catch (err) {
      setFormError(err.response?.data?.message || 'حدث خطأ أثناء حفظ بيانات الموظف');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = async (employee) => {
    const isDeactivating = employee.status === 'active';
    const confirmMsg = isDeactivating
      ? `هل أنت متأكد من تعطيل حساب "${employee.name}"؟ سيتم فوراً إنهاء جميع جلساته النشطة وطرده من النظام (UC-15).`
      : `هل تريد تفعيل حساب "${employee.name}"؟`;

    if (!window.confirm(confirmMsg)) return;

    try {
      await api.post(`/company/employees/${employee.id}/toggle-status`);
      fetchEmployees();
    } catch (err) {
      alert(err.response?.data?.message || 'حدث خطأ أثناء تعديل حالة الموظف');
    }
  };

  const handleDelete = async (employee) => {
    if (!window.confirm(`هل أنت متأكد من حذف الموظف "${employee.name}" من الشركة؟ لا يمكن التراجع.`)) return;

    try {
      await api.delete(`/company/employees/${employee.id}`);
      fetchEmployees();
    } catch (err) {
      alert(err.response?.data?.message || 'لا يمكن حذف الموظف لوجود قيود أو سندات محاسبية مرتبطة به');
    }
  };

  const openEditModal = (employee) => {
    setEditingEmployee(employee);
    setFormData({
      name: employee.name,
      email: employee.email,
      mobile: employee.mobile,
      role: employee.role,
      temporary_password: '',
    });
    setFormError(null);
    setShowAddModal(true);
  };

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.mobile?.includes(searchQuery);

    const matchesRole = roleFilter === 'all' || emp.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  return (
    <ProtectedRoute allowedRoles={['branch_manager']}>
      <AppLayout
        title="إدارة موظفي ومستخدمي الفرع"
        subtitle="إضافة وتعديل صلاحيات المحاسبين ومدخلي البيانات، وتفعيل/تعطيل الحسابات مع الإخلاء الفوري للجلسات (UC-12 إلى UC-15)"
      >
        {/* Controls Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-72">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="البحث بالاسم أو البريد أو الجوال..."
                className="w-full pl-3 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 shadow-sm"
              />
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
            </div>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="py-2.5 px-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 shadow-sm focus:ring-2 focus:ring-amber-500"
            >
              <option value="all">كافة الأدوار</option>
              <option value="general_accountant">المحاسب العام</option>
              <option value="data_entry">مدخل البيانات</option>
            </select>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              onClick={fetchEmployees}
              disabled={isLoading}
              className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 shadow-sm transition-colors"
              title="تحديث البيانات"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => {
                setEditingEmployee(null);
                setFormData({
                  name: '',
                  email: '',
                  mobile: '',
                  role: 'data_entry',
                  temporary_password: '',
                });
                setFormError(null);
                setShowAddModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة موظف جديد</span>
            </button>
          </div>
        </div>

        {/* Employees Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                <tr>
                  <th className="py-3.5 px-4">اسم الموظف</th>
                  <th className="py-3.5 px-4">البريد الإلكتروني</th>
                  <th className="py-3.5 px-4">رقم الجوال</th>
                  <th className="py-3.5 px-4">الدور الوظيفي (الصلاحيات)</th>
                  <th className="py-3.5 px-4">حالة الحساب</th>
                  <th className="py-3.5 px-4 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {isLoading ? (
                  <tr>
                    <td colSpan="6" className="py-12 text-center text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-500" />
                      جاري تحميل بيانات الموظفين...
                    </td>
                  </tr>
                ) : filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-12 text-center text-slate-400">
                      لا يوجد موظفون مطابقون
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {emp.name}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-mono flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span>{emp.email}</span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-mono">
                        <span className="inline-flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {emp.mobile}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {emp.role === 'general_accountant' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            <Shield className="w-3 h-3" />
                            محاسب عام (اعتماد القيود والسندات)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            <Users className="w-3 h-3" />
                            مدخل بيانات (العقارات والعقود والسندات)
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {emp.status === 'active' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle className="w-3 h-3" />
                            نشط
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200">
                            <XCircle className="w-3 h-3" />
                            معطل (جلسات ملغاة)
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => openEditModal(emp)}
                            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors"
                            title="تعديل بيانات الموظف"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleToggleStatus(emp)}
                            className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-colors ${
                              emp.status === 'active'
                                ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
                                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
                            }`}
                            title={emp.status === 'active' ? 'تعطيل الحساب فوراً' : 'تفعيل الحساب'}
                          >
                            {emp.status === 'active' ? 'تعطيل' : 'تفعيل'}
                          </button>

                          <button
                            onClick={() => handleDelete(emp)}
                            className="p-1.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 transition-colors"
                            title="حذف الموظف من الشركة"
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
            <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-md overflow-hidden">
              <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-500" />
                  <span>{editingEmployee ? 'تعديل بيانات الموظف (UC-14)' : 'إضافة موظف جديد (UC-13)'}</span>
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

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">اسم الموظف الكامل *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="مثال: صالح الأحمد"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">البريد الإلكتروني *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="emp@company.com"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">رقم الجوال السعودي (10 أرقام يبدأ بـ 05) *</label>
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
                  <label className="block font-semibold text-slate-700 mb-1">الدور الوظيفي والصلاحيات *</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500 focus:bg-white"
                  >
                    <option value="data_entry">مدخل بيانات (Data Entry) - إدخال العقارات والمستأجرين والعقود والسندات</option>
                    <option value="general_accountant">محاسب عام (General Accountant) - مراجعة واعتماد السندات والقيود والتقارير المالية</option>
                  </select>
                </div>

                {!editingEmployee && (
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">كلمة المرور المؤقتة</label>
                    <input
                      type="text"
                      value={formData.temporary_password}
                      onChange={(e) => setFormData({ ...formData, temporary_password: e.target.value })}
                      placeholder="اتركه فارغاً للتوليد التلقائي (8-25 خانة)"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-amber-500 focus:bg-white"
                    />
                  </div>
                )}

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
                    {actionLoading ? 'جاري الحفظ...' : editingEmployee ? 'تحديث البيانات' : 'حفظ الموظف'}
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

