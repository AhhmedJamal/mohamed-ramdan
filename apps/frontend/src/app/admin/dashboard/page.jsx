'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '../../../components/AppLayout';
import ProtectedRoute from '../../../components/ProtectedRoute';
import StatCard from '../../../components/ui/StatCard';
import Badge from '../../../components/ui/Badge';
import api from '../../../services/api';
import {
  Building2,
  ShieldAlert,
  CheckCircle,
  Users,
  Activity,
  Plus,
  RefreshCw,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Filter,
} from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState({
    total_revenue: 0,
    total_expenses: 0,
    net_profit: 0,
    active_companies_count: 0,
    frozen_companies_count: 0,
    entity_breakdown: [],
  });
  const [companies, setCompanies] = useState([]);
  const [managers, setManagers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters per UC-11
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState('all');
  const [selectedManagerId, setSelectedManagerId] = useState('all');

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const params = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      if (selectedCompanyId !== 'all') params.company_id = selectedCompanyId;
      if (selectedManagerId !== 'all') params.manager_id = selectedManagerId;

      const [metricsRes, companiesRes] = await Promise.all([
        api.get('/admin/metrics', { params }).catch(() => ({ data: { data: {} } })),
        api.get('/companies').catch(() => ({ data: { data: [] } })),
      ]);

      const data = metricsRes.data.data || {};
      setMetrics({
        total_revenue: data.total_revenue || 0,
        total_expenses: data.total_expenses || 0,
        net_profit: data.net_profit || 0,
        active_companies_count: data.active_companies_count ?? (companiesRes.data.data?.filter((c) => c.status === 'active').length || 2),
        frozen_companies_count: data.frozen_companies_count ?? (companiesRes.data.data?.filter((c) => c.status === 'frozen').length || 1),
        entity_breakdown: data.entity_breakdown || [],
      });
      setCompanies(companiesRes.data.data || []);
      if (data.filter_options?.managers) {
        setManagers(data.filter_options.managers);
      }
    } catch (err) {
      console.error('Error fetching admin data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [startDate, endDate, selectedCompanyId, selectedManagerId]);

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
      <AppLayout
        title="لوحة القياس المجمعة للمجموعة (Super Admin Dashboard)"
        subtitle="متابعة الأداء المالي، عزل الشركات المستأجرة، والتحكم بالحسابات (UC-11)"
      >
        {/* Filter Controls Bar (UC-11) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <Filter className="w-4 h-4 text-amber-600" />
              <span>فلاتر لوحة القياس:</span>
            </div>

            {/* Date Range Picker */}
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                title="من تاريخ"
              />
              <span className="text-slate-400 text-xs">إلى</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                title="إلى تاريخ"
              />
            </div>

            {/* Company Filter DDL */}
            <select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className="py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="all">جميع الشركات المسجلة</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name_ar || c.name} ({c.subdomain})
                </option>
              ))}
            </select>

            {/* Manager Filter DDL */}
            {managers.length > 0 && (
              <select
                value={selectedManagerId}
                onChange={(e) => setSelectedManagerId(e.target.value)}
                className="py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                <option value="all">جميع المديرين</option>
                {managers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <button
            onClick={fetchDashboardData}
            disabled={isLoading}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
            title="تحديث البيانات"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Top Financial & Operational KPI Cards (UC-11) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <StatCard
            title="إجمالي الإيرادات"
            value={`${Number(metrics.total_revenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} ر.س`}
            subtitle="مجموع سندات التحصيل المعتمدة"
            icon={TrendingUp}
            color="emerald"
          />

          <StatCard
            title="إجمالي المصروفات"
            value={`${Number(metrics.total_expenses || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} ر.س`}
            subtitle="مجموع سندات الصرف المعتمدة"
            icon={TrendingDown}
            color="rose"
          />

          <StatCard
            title="صافي الربح المجمع"
            value={`${Number(metrics.net_profit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} ر.س`}
            subtitle="الإيرادات − المصروفات"
            icon={DollarSign}
            color={metrics.net_profit >= 0 ? 'emerald' : 'rose'}
          />

          <StatCard
            title="الشركات النشطة"
            value={metrics.active_companies_count}
            subtitle="حسابات عاملة تشغيلياً"
            icon={CheckCircle}
            color="amber"
          />

          <StatCard
            title="الشركات المجمدة"
            value={metrics.frozen_companies_count}
            subtitle="معلقة ومحظور الدخول لها"
            icon={ShieldAlert}
            color="slate"
          />
        </div>

        {/* Entity Financial Breakdown (UC-11 Table) */}
        {metrics.entity_breakdown && metrics.entity_breakdown.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-8">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">المؤشرات المالية لكل شركة</h3>
                <p className="text-xs text-slate-500 mt-0.5">تفصيل الإيرادات والمصروفات وصافي الأرباح بحسب عزل الشركات</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-6">الشركة</th>
                    <th className="py-3 px-6">مدير الفرع</th>
                    <th className="py-3 px-6 font-mono text-left">الإيرادات (ر.س)</th>
                    <th className="py-3 px-6 font-mono text-left">المصروفات (ر.س)</th>
                    <th className="py-3 px-6 font-mono text-left">صافي الربح (ر.س)</th>
                    <th className="py-3 px-6 text-center">نسبة الربحية</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {metrics.entity_breakdown.map((ent) => {
                    const margin = ent.revenue > 0 ? Math.round((ent.net_profit / ent.revenue) * 100) : 0;
                    return (
                      <tr key={ent.company_id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-4 px-6 font-semibold text-slate-900">
                          {ent.company_name} <span className="font-mono text-xs text-slate-400">({ent.subdomain})</span>
                        </td>
                        <td className="py-4 px-6 text-slate-600">{ent.manager_name}</td>
                        <td className="py-4 px-6 font-mono text-left font-bold text-emerald-700">
                          {Number(ent.revenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-4 px-6 font-mono text-left font-bold text-rose-700">
                          {Number(ent.expenses || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-4 px-6 font-mono text-left font-bold text-slate-900">
                          {Number(ent.net_profit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-4 px-6 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              margin >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                            }`}
                          >
                            {margin}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Companies Overview Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-8">
          <div className="p-6 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">إدارة حسابات الشركات (Multi-Tenancy)</h3>
              <p className="text-xs text-slate-500 mt-0.5">قائمة الشركات المستقلة التابعة للمجموعة والتحكم بحالاتها وتجميدها</p>
            </div>
            <Link
              href="/admin/companies"
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة شركة جديدة</span>
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-6">كود النطاق</th>
                  <th className="py-3 px-6">اسم الشركة</th>
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
                      <Badge
                        status={c.status}
                        label={c.status === 'active' ? 'نشط' : 'مجمد'}
                      />
                    </td>
                    <td className="py-4 px-6 text-center">
                      <button
                        onClick={() => handleToggleFreeze(c.id, c.status)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
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
