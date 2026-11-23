'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '../../../components/AppLayout';
import ProtectedRoute from '../../../components/ProtectedRoute';
import api from '../../../services/api';
import StatCard from '../../../components/ui/StatCard';
import Badge from '../../../components/ui/Badge';
import { Building, Key, Users, AlertCircle, TrendingUp, CheckCircle2, ArrowUpRight, Plus, DollarSign } from 'lucide-react';
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

        const props = propRes.data.data || propRes.data.properties || [];
        const contracts = contractRes.data.data || contractRes.data.contracts || [];
        setRecentContracts(contracts.slice(0, 5));

        let totalUnits = 0;
        let vacantUnits = 0;
        let rentedUnits = 0;
        props.forEach((p) => {
          totalUnits += (p.units_count ?? p.total_units ?? (p.units?.length || 0));
          vacantUnits += (p.vacant_units_count ?? 0);
          rentedUnits += (p.occupied_units_count ?? 0);
        });

        const activeContracts = contracts.filter((c) => c.status === 'active');
        const overdueContracts = contracts.filter((c) => c.status === 'overdue');
        const occRate = totalUnits > 0 ? Math.round((rentedUnits / totalUnits) * 100) : 0;

        setMetrics({
          total_properties: props.length,
          total_units: totalUnits,
          vacant_units: vacantUnits,
          rented_units: rentedUnits,
          occupancy_rate: occRate,
          active_contracts: activeContracts.length,
          overdue_installments: overdueContracts.length,
          overdue_amount: overdueContracts.reduce((sum, c) => sum + (parseFloat(c.annual_rent || c.total_amount) || 0), 0),
        });
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="نسبة الإشغال العام"
          value={`${metrics.occupancy_rate}%`}
          subtitle={`${metrics.rented_units} مؤجرة من إجمالي ${metrics.total_units} وحدة`}
          icon={TrendingUp}
          color="amber"
        />

        <StatCard
          title="العقارات والمباني"
          value={metrics.total_properties}
          subtitle={`${metrics.total_units} وحدة سكنية وتجارية`}
          icon={Building}
          color="slate"
        />

        <StatCard
          title="عقود الإيجار النشطة"
          value={metrics.active_contracts}
          subtitle="سارية ومجدولة الأقساط"
          icon={Key}
          color="emerald"
        />

        <StatCard
          title="الأقساط المتأخرة"
          value={`${metrics.overdue_installments} أقساط`}
          subtitle={`${Number(metrics.overdue_amount).toLocaleString()} ر.س مستحقة التحصيل`}
          icon={AlertCircle}
          color={metrics.overdue_installments > 0 ? 'rose' : 'slate'}
        />
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

