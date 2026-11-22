'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '../../../components/AppLayout';
import ProtectedRoute from '../../../components/ProtectedRoute';
import api from '../../../services/api';
import { Building, Key, Users, AlertCircle, TrendingUp, CheckCircle2, ArrowUpRight, Plus } from 'lucide-react';
import Link from 'next/link';

export default function CompanyDashboard() {
  const [metrics, setMetrics] = useState({
    total_properties: 5,
    total_units: 42,
    vacant_units: 8,
    rented_units: 34,
    occupancy_rate: 81,
    active_contracts: 34,
    overdue_installments: 3,
    overdue_amount: 14500,
  });
  const [recentContracts, setRecentContracts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCompanyData = async () => {
      try {
        const [propRes, contractRes] = await Promise.all([
          api.get('/properties').catch(() => ({ data: { data: [] } })),
          api.get('/contracts').catch(() => ({ data: { data: [] } })),
        ]);

        const props = propRes.data.data || [];
        const contracts = contractRes.data.data || [];
        setRecentContracts(contracts.slice(0, 5));
      } catch (err) {
        console.error('Failed to load company dashboard data', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCompanyData();
  }, []);

  return (
    <ProtectedRoute allowedRoles={['branch_manager']}>
      <AppLayout title="لوحة تحكم مدير الفرع" subtitle="المؤشرات التشغيلية للعقارات والوحدات وعقود الإيجار">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">نسبة الإشغال العام</p>
            <p className="text-2xl font-bold text-slate-900 mt-2">{metrics.occupancy_rate}%</p>
            <p className="text-[11px] text-emerald-600 font-semibold mt-1">
              {metrics.rented_units} مؤجرة من إجمالي {metrics.total_units} وحدة
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">العقارات والمباني</p>
            <p className="text-2xl font-bold text-slate-900 mt-2">{metrics.total_properties}</p>
            <p className="text-[11px] text-slate-500 mt-1">{metrics.total_units} وحدة سكنية وتجارية</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
            <Building className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">عقود الإيجار النشطة</p>
            <p className="text-2xl font-bold text-emerald-600 mt-2">{metrics.active_contracts}</p>
            <p className="text-[11px] text-emerald-600 font-semibold mt-1">سارية ومجدولة</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <Key className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">الأقساط المتأخرة</p>
            <p className="text-2xl font-bold text-rose-600 mt-2">{metrics.overdue_installments} أقساط</p>
            <p className="text-[11px] text-rose-600 font-semibold mt-1">
              {Number(metrics.overdue_amount).toLocaleString()} ر.س
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
            <AlertCircle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Operational Actions & Shortcuts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Link
          href="/contracts"
          className="p-6 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl shadow-sm hover:shadow-md transition-all group flex items-center justify-between"
        >
          <div>
            <h4 className="font-bold text-base mb-1 flex items-center gap-2">
              <span>إدارة عقود الإيجار</span>
              <ArrowUpRight className="w-4 h-4 text-amber-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </h4>
            <p className="text-xs text-slate-300">تحرير العقود، جدولة الأقساط الآلية وطباعة العقود</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-amber-400">
            <Key className="w-5 h-5" />
          </div>
        </Link>

        <Link
          href="/properties"
          className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm hover:border-slate-300 transition-all group flex items-center justify-between"
        >
          <div>
            <h4 className="font-bold text-base text-slate-900 mb-1 flex items-center gap-2">
              <span>العقارات والوحدات</span>
              <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </h4>
            <p className="text-xs text-slate-500">حالات الوحدات (شاغرة، مؤجرة، صيانة) ومراكز التكلفة</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
            <Building className="w-5 h-5" />
          </div>
        </Link>

        <Link
          href="/tenants"
          className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm hover:border-slate-300 transition-all group flex items-center justify-between"
        >
          <div>
            <h4 className="font-bold text-base text-slate-900 mb-1 flex items-center gap-2">
              <span>سجل المستأجرين</span>
              <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </h4>
            <p className="text-xs text-slate-500">بيانات الأفراد والشركات وحساباتهم المالية</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
            <Users className="w-5 h-5" />
          </div>
        </Link>
      </div>
    </AppLayout>
  </ProtectedRoute>
  );
}

