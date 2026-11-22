'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '../../components/AppLayout';
import ProtectedRoute from '../../components/ProtectedRoute';
import api from '../../services/api';
import { Key, Plus, FileText, CheckCircle2, Clock, Calendar, Building, User, Download, AlertCircle } from 'lucide-react';

export default function ContractsPage() {
  const [contracts, setContracts] = useState([]);
  const [properties, setProperties] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // New Contract Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    property_id: '',
    unit_id: '',
    tenant_id: '',
    start_date: '2026-01-01',
    end_date: '2026-12-31',
    annual_rent: 48000,
    frequency: 'quarterly', // monthly, quarterly, semi_annual, annual
  });
  const [availableUnits, setAvailableUnits] = useState([]);
  const [previewSchedule, setPreviewSchedule] = useState([]);

  // Calculate live preview schedule whenever rent, start_date or frequency changes
  useEffect(() => {
    if (!formData.annual_rent || !formData.frequency || !formData.start_date) {
      setPreviewSchedule([]);
      return;
    }

    const rent = Number(formData.annual_rent);
    let count = 1;
    let stepMonths = 12;

    if (formData.frequency === 'monthly') {
      count = 12;
      stepMonths = 1;
    } else if (formData.frequency === 'quarterly') {
      count = 4;
      stepMonths = 3;
    } else if (formData.frequency === 'semi_annual') {
      count = 2;
      stepMonths = 6;
    } else {
      count = 1;
      stepMonths = 12;
    }

    const amountPerInstallment = (rent / count).toFixed(2);
    const schedule = [];
    const baseDate = new Date(formData.start_date);

    for (let i = 1; i <= count; i++) {
      const dueDate = new Date(baseDate);
      dueDate.setMonth(baseDate.getMonth() + (i - 1) * stepMonths);
      schedule.push({
        installment_number: i,
        due_date: dueDate.toISOString().split('T')[0],
        amount: amountPerInstallment,
        status: 'pending',
      });
    }

    setPreviewSchedule(schedule);
  }, [formData.annual_rent, formData.frequency, formData.start_date]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [contractsRes, propsRes, tenantsRes] = await Promise.all([
        api.get('/contracts').catch(() => ({ data: { data: [] } })),
        api.get('/properties').catch(() => ({ data: { data: [] } })),
        api.get('/tenants').catch(() => ({ data: { data: [] } })),
      ]);
      setContracts(contractsRes.data.data || []);
      setProperties(propsRes.data.data || []);
      setTenants(tenantsRes.data.data || []);
    } catch (err) {
      console.error('Error fetching contracts data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handlePropertyChange = (propertyId) => {
    setFormData((prev) => ({ ...prev, property_id: propertyId, unit_id: '' }));
    const prop = properties.find((p) => String(p.id) === String(propertyId));
    if (prop && prop.units) {
      setAvailableUnits(prop.units.filter((u) => u.status === 'vacant'));
    } else {
      setAvailableUnits([]);
    }
  };

  const handleCreateContract = async (e) => {
    e.preventDefault();
    try {
      await api.post('/contracts', formData);
      alert('تم إنشاء عقد الإيجار وجدولة الأقساط آلياً بنجاح!');
      setModalOpen(false);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'فشل في حفظ العقد');
    }
  };

  return (
    <ProtectedRoute allowedRoles={['branch_manager', 'data_entry', 'general_accountant']}>
      <AppLayout title="عقود الإيجار وجدولة الأقساط" subtitle="تحرير العقود، تتبع الأقساط المستحقة، والمتأخرات الآلية">
      {/* Top Action Bar */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-base font-bold text-slate-900">سجل عقود الإيجار</h3>
          <p className="text-xs text-slate-500">إجمالي {contracts.length} عقد مسجل في النظام</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl flex items-center gap-2 shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>تحرير عقد إيجار جديد</span>
        </button>
      </div>

      {/* Contracts Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-8">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-6">رقم العقد</th>
                <th className="py-3 px-6">المستأجر</th>
                <th className="py-3 px-6">العقار والوحدة</th>
                <th className="py-3 px-6">فترة العقد</th>
                <th className="py-3 px-6">القيمة السنوية</th>
                <th className="py-3 px-6">دورية الدفع</th>
                <th className="py-3 px-6">الحالة</th>
                <th className="py-3 px-6 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {contracts.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-slate-400">
                    لا توجد عقود إيجار مسجلة حالياً
                  </td>
                </tr>
              ) : (
                contracts.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-4 px-6 font-mono font-semibold text-slate-800">{c.contract_number}</td>
                    <td className="py-4 px-6 font-medium text-slate-900">{c.tenant?.name || 'مستأجر تجريبي'}</td>
                    <td className="py-4 px-6 text-slate-600">
                      {c.property?.name || 'برج رمضان'} - وحدة #{c.unit?.unit_number || '101'}
                    </td>
                    <td className="py-4 px-6 text-slate-500 font-mono text-[11px]">
                      {c.start_date} إلى {c.end_date}
                    </td>
                    <td className="py-4 px-6 font-mono font-bold text-slate-900">
                      {Number(c.annual_rent).toLocaleString()} ر.س
                    </td>
                    <td className="py-4 px-6 text-slate-600">
                      {c.payment_frequency === 'monthly' && 'شهري (12 قسط)'}
                      {c.payment_frequency === 'quarterly' && 'ربع سنوي (4 أقساط)'}
                      {c.payment_frequency === 'semi_annual' && 'نصف سنوي (قسطين)'}
                      {c.payment_frequency === 'annual' && 'سنوي (دفعة واحدة)'}
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                          c.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {c.status === 'active' ? 'نشط وساري' : 'مسودة'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <button
                        onClick={() => alert(`جدول أقساط العقد ${c.contract_number} متوفر في تفاصيل العقد`)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                      >
                        عرض الأقساط
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Contract Creation Modal with Automated Installment Engine */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-8 shadow-2xl border border-slate-200 my-8">
            <h3 className="font-bold text-lg text-slate-900 mb-1">تحرير عقد إيجار جديد وجدولة الأقساط</h3>
            <p className="text-xs text-slate-500 mb-6">
              يتم إنشاء جدول الأقساط وربط مراكز التكلفة آلياً فور تحديد تفاصيل العقد
            </p>

            <form onSubmit={handleCreateContract} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Property Selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">العقار / المبنى</label>
                  <select
                    value={formData.property_id}
                    onChange={(e) => handlePropertyChange(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-amber-500"
                    required
                  >
                    <option value="">اختر العقار...</option>
                    {properties.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.address})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Unit Selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">الوحدة الشاغرة</label>
                  <select
                    value={formData.unit_id}
                    onChange={(e) => setFormData({ ...formData, unit_id: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-amber-500"
                    required
                  >
                    <option value="">اختر الوحدة...</option>
                    {availableUnits.map((u) => (
                      <option key={u.id} value={u.id}>
                        وحدة #{u.unit_number} (الدور {u.floor}) - {u.type}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Tenant Selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">المستأجر</label>
                  <select
                    value={formData.tenant_id}
                    onChange={(e) => setFormData({ ...formData, tenant_id: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-amber-500"
                    required
                  >
                    <option value="">اختر المستأجر...</option>
                    {tenants.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} (هوية: {t.national_id})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Frequency Selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">دورية سداد الأقساط</label>
                  <select
                    value={formData.frequency}
                    onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-amber-500"
                    required
                  >
                    <option value="monthly">شهري (12 قسط متساوي)</option>
                    <option value="quarterly">ربع سنوي (4 أقساط متساوية)</option>
                    <option value="semi_annual">نصف سنوي (قسطان متساويان)</option>
                    <option value="annual">سنوي (دفعة واحدة كاملة)</option>
                  </select>
                </div>

                {/* Start Date */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">تاريخ بداية العقد</label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
                    required
                  />
                </div>

                {/* Annual Rent */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">قيمة الإيجار السنوي (ر.س)</label>
                  <input
                    type="number"
                    value={formData.annual_rent}
                    onChange={(e) => setFormData({ ...formData, annual_rent: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono font-bold"
                    required
                  />
                </div>
              </div>

              {/* Live Installment Schedule Preview */}
              {previewSchedule.length > 0 && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <h4 className="text-xs font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-amber-600" />
                    <span>معاينة جدول الأقساط المولدة آلياً ({previewSchedule.length} أقساط)</span>
                  </h4>
                  <div className="max-h-48 overflow-y-auto">
                    <table className="w-full text-right text-xs">
                      <thead className="text-slate-500 font-semibold border-b border-slate-200">
                        <tr>
                          <th className="py-2 px-3">رقم القسط</th>
                          <th className="py-2 px-3">تاريخ الاستحقاق</th>
                          <th className="py-2 px-3">مبلغ القسط (ر.س)</th>
                          <th className="py-2 px-3">الحالة الأولية</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200/60">
                        {previewSchedule.map((item) => (
                          <tr key={item.installment_number}>
                            <td className="py-2 px-3 font-semibold text-slate-800">قسط #{item.installment_number}</td>
                            <td className="py-2 px-3 font-mono text-slate-600">{item.due_date}</td>
                            <td className="py-2 px-3 font-mono font-bold text-slate-900">{item.amount} ر.س</td>
                            <td className="py-2 px-3">
                              <span className="px-2 py-0.5 rounded text-[10px] bg-amber-100 text-amber-800 font-semibold">
                                قيد الاستحقاق
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-md transition-all"
                >
                  حفظ العقد وتوليد الأقساط
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

