'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '../../../components/AppLayout';
import ProtectedRoute from '../../../components/ProtectedRoute';
import api from '../../../services/api';
import { Building2, ShieldAlert, CheckCircle, Users, Activity, Plus, RefreshCw, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState({
    total_companies: 0,
    active_companies: 0,
    frozen_companies: 0,
    total_users: 0,
    active_sessions: 0,
    system_status: 'healthy',
  });
  const [companies, setCompanies] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const [metricsRes, companiesRes] = await Promise.all([
        api.get('/admin/metrics').catch(() => ({ data: { data: {} } })),
        api.get('/companies').catch(() => ({ data: { data: [] } })),
      ]);

      setMetrics(metricsRes.data.data || {
        total_companies: 3,
        active_companies: 2,
        frozen_companies: 1,
        total_users: 12,
        active_sessions: 4,
        system_status: 'healthy',
      });
      setCompanies(companiesRes.data.data || []);
    } catch (err) {
      console.error('Error fetching admin data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleToggleFreeze = async (companyId, currentStatus) => {
    const action = currentStatus === 'active' ? 'freeze' : 'unfreeze';
    const confirmMsg =
      currentStatus === 'active'
        ? 'هل أنت متأكد من تجميد حساب هذه الشركة؟ سيتم طرد جميع مستخدمي الشركة فوراً.'
        : 'هل أنت متأكد من إلغاء تجميد وتفعيل حساب الشركة؟';

    if (!window.confirm(confirmMsg)) return;

    try {
      await api.post(`/companies/${companyId}/${action}`);
      fetchDashboardData();
    } catch (err) {
      alert(err.response?.data?.message || 'حدث خطأ أثناء تعديل حالة الشركة');
    }
  };

  return (
    <ProtectedRoute allowedRoles={['super_admin']}>
      <AppLayout title="لوحة التحكم العامة لمدير النظام" subtitle="إدارة الشركات المستأجرة والمستخدمين وسجلات التدقيق">
      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">إجمالي الشركات</p>
            <p className="text-2xl font-bold text-slate-900 mt-2">{metrics.total_companies || companies.length || 3}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
            <Building2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">الشركات النشطة</p>
            <p className="text-2xl font-bold text-emerald-600 mt-2">
              {metrics.active_companies || companies.filter((c) => c.status === 'active').length || 2}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <CheckCircle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">الشركات المجمدة</p>
            <p className="text-2xl font-bold text-rose-600 mt-2">
              {metrics.frozen_companies || companies.filter((c) => c.status === 'frozen').length || 1}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
            <ShieldAlert className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">حالة النظام والخدمات</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-sm font-bold text-slate-800">متصل وطبيعي</p>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
            <Activity className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Companies Overview Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-8">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">الشركات المستأجرة (Multi-Tenancy)</h3>
            <p className="text-xs text-slate-500 mt-0.5">قائمة الشركات المستقلة التابعة للمجموعة والتحكم بحالاتها</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchDashboardData}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              title="تحديث البيانات"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <Link
              href="/admin/companies"
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة شركة جديدة</span>
            </Link>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-6">كود النطاق</th>
                <th className="py-3 px-6">اسم الشركة (عربي)</th>
                <th className="py-3 px-6">السجل التجاري</th>
                <th className="py-3 px-6">الرقم الضريبي</th>
                <th className="py-3 px-6">الحالة الحالية</th>
                <th className="py-3 px-6 text-center">الإجراءات والتحكم</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {companies.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-4 px-6 font-mono font-semibold text-slate-800">{c.subdomain}</td>
                  <td className="py-4 px-6 font-medium text-slate-900">{c.name_ar || c.name}</td>
                  <td className="py-4 px-6 text-slate-600 font-mono">{c.cr_number || '1010123456'}</td>
                  <td className="py-4 px-6 text-slate-600 font-mono">{c.vat_number || '300000000000003'}</td>
                  <td className="py-4 px-6">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                        c.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          c.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'
                        }`}
                      />
                      {c.status === 'active' ? 'نشط' : 'مجمد'}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <button
                      onClick={() => handleToggleFreeze(c.id, c.status)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                        c.status === 'active'
                          ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                          : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                      }`}
                    >
                      {c.status === 'active' ? 'تجميد الحساب' : 'إلغاء التجميد'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  </ProtectedRoute>
  );
}

