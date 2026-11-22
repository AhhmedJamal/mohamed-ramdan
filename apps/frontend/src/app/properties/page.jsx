'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '../../components/AppLayout';
import ProtectedRoute from '../../components/ProtectedRoute';
import api from '../../services/api';
import {
  Building, Plus, Search, RefreshCw, Key, Home, Trash2, Edit2,
  AlertTriangle, Layers, MapPin, FileCheck, CheckCircle2, ChevronRight
} from 'lucide-react';

export default function PropertiesManagementPage() {
  const [properties, setProperties] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [units, setUnits] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [unitsLoading, setUnitsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddPropertyModal, setShowAddPropertyModal] = useState(false);
  const [showAddUnitModal, setShowAddUnitModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [formError, setFormError] = useState(null);

  const [propForm, setPropForm] = useState({
    name: '',
    property_type: 'residential',
    building_number: '',
    street: '',
    district: '',
    city: 'الرياض',
    postal_code: '',
    total_floors: 3,
    total_units: 12,
    deed_number: '',
  });

  const [unitForm, setUnitForm] = useState({
    unit_number: '',
    floor_number: 1,
    unit_type: 'apartment',
    rooms_count: 3,
    bathrooms_count: 2,
    area_sqm: 120,
    annual_rent: 45000,
    electricity_meter: '',
    status: 'vacant',
  });

  const fetchProperties = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/properties');
      const data = res.data.data || [];
      setProperties(data);
      if (data.length > 0 && !selectedProperty) {
        setSelectedProperty(data[0]);
      }
    } catch (err) {
      console.error('Failed to load properties', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUnits = async (propertyId) => {
    if (!propertyId) return;
    setUnitsLoading(true);
    try {
      const res = await api.get(`/properties/${propertyId}/units`);
      setUnits(res.data.data || []);
    } catch (err) {
      console.error('Failed to load units', err);
    } finally {
      setUnitsLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  useEffect(() => {
    if (selectedProperty) {
      fetchUnits(selectedProperty.id);
    }
  }, [selectedProperty]);

  const handleCreateProperty = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setFormError(null);

    try {
      const res = await api.post('/properties', propForm);
      setShowAddPropertyModal(false);
      setPropForm({
        name: '',
        property_type: 'residential',
        building_number: '',
        street: '',
        district: '',
        city: 'الرياض',
        postal_code: '',
        total_floors: 3,
        total_units: 12,
        deed_number: '',
      });
      await fetchProperties();
      if (res.data.data) {
        setSelectedProperty(res.data.data);
      }
    } catch (err) {
      setFormError(err.response?.data?.message || 'حدث خطأ أثناء إضافة العقار');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateUnit = async (e) => {
    e.preventDefault();
    if (!selectedProperty) return;
    setActionLoading(true);
    setFormError(null);

    try {
      await api.post(`/properties/${selectedProperty.id}/units`, unitForm);
      setShowAddUnitModal(false);
      setUnitForm({
        unit_number: '',
        floor_number: 1,
        unit_type: 'apartment',
        rooms_count: 3,
        bathrooms_count: 2,
        area_sqm: 120,
        annual_rent: 45000,
        electricity_meter: '',
        status: 'vacant',
      });
      fetchUnits(selectedProperty.id);
    } catch (err) {
      setFormError(err.response?.data?.message || 'حدث خطأ أثناء إضافة الوحدة العقارية');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteProperty = async (prop) => {
    if (!window.confirm(`هل أنت متأكد من حذف العقار "${prop.name}"؟`)) return;
    try {
      await api.delete(`/properties/${prop.id}`);
      setSelectedProperty(null);
      fetchProperties();
    } catch (err) {
      alert(err.response?.data?.message || 'لا يمكن حذف العقار لوجود عقود أو وحدات مرتبطة به');
    }
  };

  const filteredProperties = properties.filter((p) => {
    const q = searchQuery.toLowerCase();
    return (
      p.name?.toLowerCase().includes(q) ||
      p.district?.toLowerCase().includes(q) ||
      p.deed_number?.includes(q)
    );
  });

  return (
    <ProtectedRoute allowedRoles={['branch_manager', 'data_entry', 'general_accountant']}>
      <AppLayout
        title="إدارة العقارات والوحدات السكنية والتجارية"
        subtitle="سجل المباني والمجمعات العقارية، إدارة الوحدات، وتتبع الإشغال وحالات الصيانة (UC-25 إلى UC-32)"
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Properties List Column */}
          <div className="lg:col-span-1 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Building className="w-4 h-4 text-amber-600" />
                <span>قائمة العقارات ({properties.length})</span>
              </h3>
              <button
                onClick={() => {
                  setFormError(null);
                  setShowAddPropertyModal(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>عقار جديد</span>
              </button>
            </div>

            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="البحث باسم العقار أو الصك أو الحي..."
                className="w-full pl-3 pr-9 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 shadow-sm"
              />
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100 max-h-[calc(100vh-280px)] overflow-y-auto">
              {isLoading ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-500" />
                  جاري تحميل العقارات...
                </div>
              ) : filteredProperties.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  لا توجد عقارات مسجلة
                </div>
              ) : (
                filteredProperties.map((prop) => (
                  <div
                    key={prop.id}
                    onClick={() => setSelectedProperty(prop)}
                    className={`p-4 cursor-pointer transition-all ${
                      selectedProperty?.id === prop.id
                        ? 'bg-amber-50/70 border-r-4 border-amber-600'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-xs text-slate-900">{prop.name}</h4>
                        <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span>{prop.district}، {prop.city}</span>
                        </p>
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {prop.property_type === 'residential' ? 'سكني' : prop.property_type === 'commercial' ? 'تجاري' : 'مختلط'}
                      </span>
                    </div>

                    <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100/80 pt-2">
                      <span>رقم الصك: {prop.deed_number || '—'}</span>
                      <span className="font-bold text-slate-700">{prop.units_count || prop.total_units || 0} وحدة</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Units Details Column */}
          <div className="lg:col-span-2 space-y-4">
            {selectedProperty ? (
              <>
                {/* Property Header Banner */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-base text-slate-900">{selectedProperty.name}</h3>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-semibold">
                        صك #{selectedProperty.deed_number || 'غير محدد'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{selectedProperty.street}، حي {selectedProperty.district}، {selectedProperty.city}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setFormError(null);
                        setShowAddUnitModal(true);
                      }}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>إضافة وحدة جديدة</span>
                    </button>
                    <button
                      onClick={() => handleDeleteProperty(selectedProperty)}
                      className="p-2 border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-colors"
                      title="حذف العقار"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Units Grid / Table */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                    <h4 className="font-bold text-xs text-slate-900 flex items-center gap-2">
                      <Layers className="w-4 h-4 text-amber-600" />
                      <span>الوحدات العقارية التابعة للعقار ({units.length})</span>
                    </h4>
                    <button
                      onClick={() => fetchUnits(selectedProperty.id)}
                      disabled={unitsLoading}
                      className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${unitsLoading ? 'animate-spin' : ''}`} />
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                        <tr>
                          <th className="py-3 px-4">رقم الوحدة</th>
                          <th className="py-3 px-4">الدور</th>
                          <th className="py-3 px-4">النوع والمواصفات</th>
                          <th className="py-3 px-4">المساحة</th>
                          <th className="py-3 px-4">الإيجار السنوي</th>
                          <th className="py-3 px-4">عداد الكهرباء</th>
                          <th className="py-3 px-4">الحالة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {unitsLoading ? (
                          <tr>
                            <td colSpan="7" className="py-10 text-center text-slate-400">
                              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-500" />
                              جاري تحميل الوحدات...
                            </td>
                          </tr>
                        ) : units.length === 0 ? (
                          <tr>
                            <td colSpan="7" className="py-10 text-center text-slate-400">
                              لا توجد وحدات مضافة بعد في هذا العقار
                            </td>
                          </tr>
                        ) : (
                          units.map((unit) => (
                            <tr key={unit.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3 px-4 font-bold text-slate-900 font-mono">
                                #{unit.unit_number}
                              </td>
                              <td className="py-3 px-4 text-slate-600">الدور {unit.floor_number}</td>
                              <td className="py-3 px-4">
                                <span className="font-semibold text-slate-800">
                                  {unit.unit_type === 'apartment' ? 'شقة' : unit.unit_type === 'shop' ? 'محل تجاري' : 'مكتب'}
                                </span>
                                <span className="text-[10px] text-slate-400 block">
                                  {unit.rooms_count || 0} غرف • {unit.bathrooms_count || 0} دورات مياه
                                </span>
                              </td>
                              <td className="py-3 px-4 font-mono">{unit.area_sqm} م²</td>
                              <td className="py-3 px-4 font-bold text-slate-900 font-mono">
                                {Number(unit.annual_rent || 0).toLocaleString()} ر.س
                              </td>
                              <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                                {unit.electricity_meter || '—'}
                              </td>
                              <td className="py-3 px-4">
                                {unit.status === 'vacant' ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    شاغرة
                                  </span>
                                ) : unit.status === 'rented' ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                    مؤجرة
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                    تحت الصيانة
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-white p-12 rounded-2xl border border-slate-200 shadow-sm text-center text-slate-400">
                <Building className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                <p className="font-semibold text-sm text-slate-600">اختر عقاراً من القائمة الجانبية لعرض وحداته</p>
                <p className="text-xs text-slate-400 mt-1">أو أضف عقاراً جديداً للبدء</p>
              </div>
            )}
          </div>
        </div>

        {/* Add Property Modal */}
        {showAddPropertyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-lg overflow-hidden">
              <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <Building className="w-4 h-4 text-amber-500" />
                  <span>إضافة عقار جديد (UC-25)</span>
                </h3>
                <button
                  onClick={() => setShowAddPropertyModal(false)}
                  className="text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateProperty} className="p-6 space-y-4 text-xs">
                {formError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1">اسم العقار / المبنى *</label>
                    <input
                      type="text"
                      required
                      value={propForm.name}
                      onChange={(e) => setPropForm({ ...propForm, name: e.target.value })}
                      placeholder="مثال: برج الياسمين السكني"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">نوع العقار *</label>
                    <select
                      value={propForm.property_type}
                      onChange={(e) => setPropForm({ ...propForm, property_type: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:bg-white"
                    >
                      <option value="residential">سكني</option>
                      <option value="commercial">تجاري</option>
                      <option value="mixed">مختلط (سكني وتجاري)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">رقم الصك العقاري *</label>
                    <input
                      type="text"
                      required
                      value={propForm.deed_number}
                      onChange={(e) => setPropForm({ ...propForm, deed_number: e.target.value })}
                      placeholder="مثال: 3101020045"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-amber-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">المدينة *</label>
                    <input
                      type="text"
                      required
                      value={propForm.city}
                      onChange={(e) => setPropForm({ ...propForm, city: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">الحي *</label>
                    <input
                      type="text"
                      required
                      value={propForm.district}
                      onChange={(e) => setPropForm({ ...propForm, district: e.target.value })}
                      placeholder="حي الملقا"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">الشارع *</label>
                    <input
                      type="text"
                      required
                      value={propForm.street}
                      onChange={(e) => setPropForm({ ...propForm, street: e.target.value })}
                      placeholder="طريق أنس بن مالك"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">رقم المبنى</label>
                    <input
                      type="text"
                      value={propForm.building_number}
                      onChange={(e) => setPropForm({ ...propForm, building_number: e.target.value })}
                      placeholder="7254"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-amber-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">عدد الأدوار</label>
                    <input
                      type="number"
                      min={1}
                      value={propForm.total_floors}
                      onChange={(e) => setPropForm({ ...propForm, total_floors: parseInt(e.target.value) || 1 })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-amber-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">إجمالي الوحدات المستهدفة</label>
                    <input
                      type="number"
                      min={1}
                      value={propForm.total_units}
                      onChange={(e) => setPropForm({ ...propForm, total_units: parseInt(e.target.value) || 1 })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-amber-500 focus:bg-white"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowAddPropertyModal(false)}
                    className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl shadow disabled:opacity-50"
                  >
                    {actionLoading ? 'جاري الإنشاء...' : 'حفظ العقار'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add Unit Modal */}
        {showAddUnitModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-lg overflow-hidden">
              <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <Layers className="w-4 h-4 text-amber-500" />
                  <span>إضافة وحدة جديدة في ({selectedProperty?.name})</span>
                </h3>
                <button
                  onClick={() => setShowAddUnitModal(false)}
                  className="text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateUnit} className="p-6 space-y-4 text-xs">
                {formError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">رقم الوحدة *</label>
                    <input
                      type="text"
                      required
                      value={unitForm.unit_number}
                      onChange={(e) => setUnitForm({ ...unitForm, unit_number: e.target.value })}
                      placeholder="مثال: 101 أو S-02"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-amber-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">رقم الدور *</label>
                    <input
                      type="number"
                      required
                      value={unitForm.floor_number}
                      onChange={(e) => setUnitForm({ ...unitForm, floor_number: parseInt(e.target.value) || 1 })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-amber-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">نوع الوحدة *</label>
                    <select
                      value={unitForm.unit_type}
                      onChange={(e) => setUnitForm({ ...unitForm, unit_type: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:bg-white"
                    >
                      <option value="apartment">شقة سكنية</option>
                      <option value="shop">محل تجاري</option>
                      <option value="office">مكتب إداري</option>
                      <option value="villa">فيلا</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">المساحة (م²) *</label>
                    <input
                      type="number"
                      required
                      value={unitForm.area_sqm}
                      onChange={(e) => setUnitForm({ ...unitForm, area_sqm: parseFloat(e.target.value) || 0 })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-amber-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">عدد الغرف</label>
                    <input
                      type="number"
                      value={unitForm.rooms_count}
                      onChange={(e) => setUnitForm({ ...unitForm, rooms_count: parseInt(e.target.value) || 0 })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-amber-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">دورات المياه</label>
                    <input
                      type="number"
                      value={unitForm.bathrooms_count}
                      onChange={(e) => setUnitForm({ ...unitForm, bathrooms_count: parseInt(e.target.value) || 0 })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-amber-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">الإيجار السنوي التقديري (ر.س) *</label>
                    <input
                      type="number"
                      required
                      value={unitForm.annual_rent}
                      onChange={(e) => setUnitForm({ ...unitForm, annual_rent: parseFloat(e.target.value) || 0 })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-amber-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">رقم عداد الكهرباء</label>
                    <input
                      type="text"
                      value={unitForm.electricity_meter}
                      onChange={(e) => setUnitForm({ ...unitForm, electricity_meter: e.target.value })}
                      placeholder="MTR-9008"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-amber-500 focus:bg-white"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowAddUnitModal(false)}
                    className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl shadow disabled:opacity-50"
                  >
                    {actionLoading ? 'جاري الحفظ...' : 'حفظ الوحدة'}
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

