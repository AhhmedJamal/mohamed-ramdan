'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '../../components/AppLayout';
import ProtectedRoute from '../../components/ProtectedRoute';
import api from '../../services/api';
import {
  Building, Plus, Search, RefreshCw, Layers, MapPin, Trash2, Edit2,
  AlertTriangle, CheckCircle2, ChevronRight, X, ShieldAlert
} from 'lucide-react';

export default function PropertiesManagementPage() {
  const [properties, setProperties] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [units, setUnits] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [unitsLoading, setUnitsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [showAddPropertyModal, setShowAddPropertyModal] = useState(false);
  const [showEditPropertyModal, setShowEditPropertyModal] = useState(false);
  const [showAddUnitModal, setShowAddUnitModal] = useState(false);
  const [showEditUnitModal, setShowEditUnitModal] = useState(false);
  const [editingUnit, setEditingUnit] = useState(null);

  const [actionLoading, setActionLoading] = useState(false);
  const [formError, setFormError] = useState(null);

  // Property Form (UC-26, UC-27)
  const [propForm, setPropForm] = useState({
    name: '',
    type: 'residential',
    address: '',
    units_count: 4,
    unit_type: 'apartment',
    default_area_sqm: 100,
  });

  // Edit Property Form
  const [editPropForm, setEditPropForm] = useState({
    name: '',
    type: 'residential',
    address: '',
  });

  // Unit Form (UC-30, UC-31)
  const [unitForm, setUnitForm] = useState({
    unit_number: '',
    type: 'apartment',
    area_sqm: 100,
    status: 'vacant',
  });

  const fetchProperties = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/properties');
      const data = res.data.data || res.data.properties || [];
      setProperties(data);
      if (data.length > 0 && !selectedProperty) {
        setSelectedProperty(data[0]);
      } else if (selectedProperty) {
        const found = data.find((p) => p.id === selectedProperty.id);
        if (found) setSelectedProperty(found);
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
      const data = res.data.data || res.data.units || [];
      setUnits(data);
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
  }, [selectedProperty?.id]);

  // UC-26: Add Property
  const handleCreateProperty = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setFormError(null);

    try {
      const res = await api.post('/properties', {
        name: propForm.name,
        address: propForm.address,
        type: propForm.type,
        units_count: parseInt(propForm.units_count, 10),
        unit_type: propForm.unit_type,
        default_area_sqm: parseFloat(propForm.default_area_sqm) || null,
      });

      setShowAddPropertyModal(false);
      setPropForm({
        name: '',
        type: 'residential',
        address: '',
        units_count: 4,
        unit_type: 'apartment',
        default_area_sqm: 100,
      });

      await fetchProperties();
      const newProp = res.data.data || res.data.property;
      if (newProp) {
        setSelectedProperty(newProp);
      }
    } catch (err) {
      setFormError(err.response?.data?.message || err.response?.data?.errors?.name?.[0] || 'حدث خطأ أثناء إضافة العقار');
    } finally {
      setActionLoading(false);
    }
  };

  // UC-27: Update Property
  const handleUpdateProperty = async (e) => {
    e.preventDefault();
    if (!selectedProperty) return;
    setActionLoading(true);
    setFormError(null);

    try {
      const res = await api.put(`/properties/${selectedProperty.id}`, editPropForm);
      setShowEditPropertyModal(false);
      await fetchProperties();
      const updated = res.data.data || res.data.property;
      if (updated) setSelectedProperty(updated);
    } catch (err) {
      setFormError(err.response?.data?.message || 'حدث خطأ أثناء تعديل العقار');
    } finally {
      setActionLoading(false);
    }
  };

  // UC-28: Delete Property
  const handleDeleteProperty = async (prop) => {
    if (!window.confirm(`هل أنت متأكد من حذف العقار "${prop.name}"؟ سيتم حذف جميع الوحدات ومركز التكلفة المرتبط.`)) {
      return;
    }

    try {
      await api.delete(`/properties/${prop.id}`);
      setSelectedProperty(null);
      await fetchProperties();
    } catch (err) {
      alert(err.response?.data?.message || 'لا يمكن حذف العقار لوجود عقود إيجار نشطة مرتبطة به');
    }
  };

  // UC-30: Add Unit
  const handleCreateUnit = async (e) => {
    e.preventDefault();
    if (!selectedProperty) return;
    setActionLoading(true);
    setFormError(null);

    try {
      await api.post(`/properties/${selectedProperty.id}/units`, {
        unit_number: unitForm.unit_number,
        type: unitForm.type,
        area_sqm: parseFloat(unitForm.area_sqm) || null,
        status: unitForm.status,
      });

      setShowAddUnitModal(false);
      setUnitForm({
        unit_number: '',
        type: 'apartment',
        area_sqm: 100,
        status: 'vacant',
      });
      await fetchUnits(selectedProperty.id);
      await fetchProperties();
    } catch (err) {
      setFormError(err.response?.data?.message || 'حدث خطأ أثناء إضافة الوحدة العقارية');
    } finally {
      setActionLoading(false);
    }
  };

  // UC-31: Update Unit
  const handleUpdateUnit = async (e) => {
    e.preventDefault();
    if (!selectedProperty || !editingUnit) return;
    setActionLoading(true);
    setFormError(null);

    try {
      await api.put(`/properties/${selectedProperty.id}/units/${editingUnit.id}`, {
        unit_number: unitForm.unit_number,
        type: unitForm.type,
        area_sqm: parseFloat(unitForm.area_sqm) || null,
        status: unitForm.status,
      });

      setShowEditUnitModal(false);
      setEditingUnit(null);
      await fetchUnits(selectedProperty.id);
    } catch (err) {
      setFormError(err.response?.data?.message || 'حدث خطأ أثناء تعديل بيانات الوحدة');
    } finally {
      setActionLoading(false);
    }
  };

  // UC-32: Delete Unit
  const handleDeleteUnit = async (unit) => {
    if (!window.confirm(`هل أنت متأكد من حذف الوحدة رقم "${unit.unit_number}"؟`)) {
      return;
    }

    try {
      await api.delete(`/properties/${selectedProperty.id}/units/${unit.id}`);
      await fetchUnits(selectedProperty.id);
      await fetchProperties();
    } catch (err) {
      alert(err.response?.data?.message || 'لا يمكن حذف الوحدة لوجود عقد إيجار نشط');
    }
  };

  const openEditPropertyModal = () => {
    if (!selectedProperty) return;
    setEditPropForm({
      name: selectedProperty.name || '',
      type: selectedProperty.type || 'residential',
      address: selectedProperty.address || '',
    });
    setFormError(null);
    setShowEditPropertyModal(true);
  };

  const openEditUnitModal = (unit) => {
    setEditingUnit(unit);
    setUnitForm({
      unit_number: unit.unit_number || '',
      type: unit.type || 'apartment',
      area_sqm: unit.area_sqm || '',
      status: unit.status || 'vacant',
    });
    setFormError(null);
    setShowEditUnitModal(true);
  };

  const filteredProperties = properties.filter((p) => {
    const q = searchQuery.toLowerCase();
    return (
      p.name?.toLowerCase().includes(q) ||
      p.address?.toLowerCase().includes(q)
    );
  });

  return (
    <ProtectedRoute allowedRoles={['branch_manager', 'data_entry', 'general_accountant']}>
      <AppLayout
        title="إدارة العقارات والوحدات (Properties & Units)"
        subtitle="سجل المباني والمجمعات العقارية، إدارة الوحدات الشاغرة والمؤجرة، وتأسيس مراكز التكلفة تلقائياً (UC-25 إلى UC-32)"
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
                placeholder="البحث باسم العقار أو العنوان..."
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
                          <span>{prop.address || 'لا يوجد عنوان مسجل'}</span>
                        </p>
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {prop.type_label || (prop.type === 'residential' ? 'سكني' : prop.type === 'commercial' ? 'تجاري' : 'مختلط')}
                      </span>
                    </div>

                    <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100/80 pt-2">
                      <span className="font-mono text-amber-700">
                        مركز تكلفة: {prop.cost_center?.name || prop.name}
                      </span>
                      <span className="font-bold text-slate-700">{prop.units_count ?? prop.total_units ?? 0} وحدة</span>
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
                        {selectedProperty.type_label || (selectedProperty.type === 'residential' ? 'سكني' : selectedProperty.type === 'commercial' ? 'تجاري' : 'مختلط')}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{selectedProperty.address || 'العنوان غير مسجل'}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={openEditPropertyModal}
                      className="p-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl transition-colors"
                      title="تعديل بيانات العقار (UC-27)"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setFormError(null);
                        setShowAddUnitModal(true);
                      }}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>إضافة وحدة (UC-30)</span>
                    </button>
                    <button
                      onClick={() => handleDeleteProperty(selectedProperty)}
                      className="p-2 border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-colors"
                      title="حذف العقار (UC-28)"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Units Grid / Table (UC-29) */}
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
                          <th className="py-3 px-4">النوع</th>
                          <th className="py-3 px-4">المساحة (م²)</th>
                          <th className="py-3 px-4">الحالة</th>
                          <th className="py-3 px-4">المستأجر الحالي</th>
                          <th className="py-3 px-4 text-center">الإجراءات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {unitsLoading ? (
                          <tr>
                            <td colSpan="6" className="py-10 text-center text-slate-400">
                              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-500" />
                              جاري تحميل الوحدات...
                            </td>
                          </tr>
                        ) : units.length === 0 ? (
                          <tr>
                            <td colSpan="6" className="py-10 text-center text-slate-400">
                              لا توجد وحدات مضافة بعد في هذا العقار
                            </td>
                          </tr>
                        ) : (
                          units.map((unit) => (
                            <tr key={unit.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3 px-4 font-bold text-slate-900 font-mono">
                                #{unit.unit_number}
                              </td>
                              <td className="py-3 px-4">
                                <span className="font-semibold text-slate-800">
                                  {unit.type_label || (unit.type === 'apartment' ? 'شقة' : unit.type === 'shop' ? 'محل' : unit.type === 'office' ? 'مكتب' : 'مستودع')}
                                </span>
                              </td>
                              <td className="py-3 px-4 font-mono">{unit.area_sqm ? `${unit.area_sqm} م²` : '—'}</td>
                              <td className="py-3 px-4">
                                {unit.status === 'vacant' ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    شاغرة
                                  </span>
                                ) : unit.status === 'occupied' ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                    مشغولة
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                    تحت الصيانة
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-slate-600">
                                {unit.current_tenant_name ? (
                                  <span className="font-semibold text-slate-800">{unit.current_tenant_name}</span>
                                ) : (
                                  <span className="text-slate-400">لا يوجد مستأجر</span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    onClick={() => openEditUnitModal(unit)}
                                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
                                    title="تعديل بيانات الوحدة (UC-31)"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteUnit(unit)}
                                    className="p-1.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-600"
                                    title="حذف الوحدة (UC-32)"
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

        {/* Add Property Modal (UC-26) */}
        {showAddPropertyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-lg overflow-hidden">
              <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <Building className="w-4 h-4 text-amber-500" />
                  <span>إضافة عقار/عمارة جديد (UC-26)</span>
                </h3>
                <button
                  onClick={() => setShowAddPropertyModal(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
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
                    <label className="block font-semibold text-slate-700 mb-1">اسم العقار / العمارة *</label>
                    <input
                      type="text"
                      required
                      minLength={3}
                      maxLength={100}
                      value={propForm.name}
                      onChange={(e) => setPropForm({ ...propForm, name: e.target.value })}
                      placeholder="مثال: عمارة اليرموك السكنية"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:bg-white"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1">العنوان *</label>
                    <input
                      type="text"
                      required
                      value={propForm.address}
                      onChange={(e) => setPropForm({ ...propForm, address: e.target.value })}
                      placeholder="مثال: الرياض، حي الملقا، طريق أنس بن مالك"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">نوع العقار *</label>
                    <select
                      value={propForm.type}
                      onChange={(e) => setPropForm({ ...propForm, type: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:bg-white"
                    >
                      <option value="residential">سكني</option>
                      <option value="commercial">تجاري</option>
                      <option value="mixed">مختلط</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">عدد الوحدات الإبتدائية *</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={propForm.units_count}
                      onChange={(e) => setPropForm({ ...propForm, units_count: parseInt(e.target.value, 10) || 1 })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-amber-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">نوع الوحدات *</label>
                    <select
                      value={propForm.unit_type}
                      onChange={(e) => setPropForm({ ...propForm, unit_type: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:bg-white"
                    >
                      <option value="apartment">شقة</option>
                      <option value="shop">محل</option>
                      <option value="office">مكتب</option>
                      <option value="warehouse">مستودع</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">المساحة التقديرية (م²)</label>
                    <input
                      type="number"
                      min={0}
                      value={propForm.default_area_sqm}
                      onChange={(e) => setPropForm({ ...propForm, default_area_sqm: parseFloat(e.target.value) || 0 })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-amber-500 focus:bg-white"
                    />
                  </div>
                </div>

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800">
                  سيتم إنشاء مركز تكلفة تلقائياً بنفس اسم العقار، وسيتم ترقيم الوحدات من 1 إلى {propForm.units_count} بحالة "شاغرة" افتراضياً.
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

        {/* Edit Property Modal (UC-27) */}
        {showEditPropertyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-lg overflow-hidden">
              <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <Edit2 className="w-4 h-4 text-amber-500" />
                  <span>تعديل بيانات العقار (UC-27)</span>
                </h3>
                <button
                  onClick={() => setShowEditPropertyModal(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleUpdateProperty} className="p-6 space-y-4 text-xs">
                {formError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">اسم العقار *</label>
                    <input
                      type="text"
                      required
                      minLength={3}
                      maxLength={100}
                      value={editPropForm.name}
                      onChange={(e) => setEditPropForm({ ...editPropForm, name: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">نوع العقار *</label>
                    <select
                      value={editPropForm.type}
                      onChange={(e) => setEditPropForm({ ...editPropForm, type: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:bg-white"
                    >
                      <option value="residential">سكني</option>
                      <option value="commercial">تجاري</option>
                      <option value="mixed">مختلط</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">العنوان *</label>
                    <input
                      type="text"
                      required
                      value={editPropForm.address}
                      onChange={(e) => setEditPropForm({ ...editPropForm, address: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:bg-white"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowEditPropertyModal(false)}
                    className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl shadow disabled:opacity-50"
                  >
                    {actionLoading ? 'جاري الحفظ...' : 'تحديث العقار'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add Unit Modal (UC-30) */}
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
                  <X className="w-5 h-5" />
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
                      placeholder="مثال: 101 أو محل 2"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-amber-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">نوع الوحدة *</label>
                    <select
                      value={unitForm.type}
                      onChange={(e) => setUnitForm({ ...unitForm, type: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:bg-white"
                    >
                      <option value="apartment">شقة</option>
                      <option value="shop">محل</option>
                      <option value="office">مكتب</option>
                      <option value="warehouse">مستودع</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">المساحة (م²)</label>
                    <input
                      type="number"
                      min={0}
                      value={unitForm.area_sqm}
                      onChange={(e) => setUnitForm({ ...unitForm, area_sqm: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-amber-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">حالة الوحدة *</label>
                    <select
                      value={unitForm.status}
                      onChange={(e) => setUnitForm({ ...unitForm, status: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:bg-white"
                    >
                      <option value="vacant">شاغرة</option>
                      <option value="under_maintenance">تحت الصيانة</option>
                    </select>
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

        {/* Edit Unit Modal (UC-31) */}
        {showEditUnitModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-lg overflow-hidden">
              <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <Edit2 className="w-4 h-4 text-amber-500" />
                  <span>تعديل بيانات الوحدة #{editingUnit?.unit_number} (UC-31)</span>
                </h3>
                <button
                  onClick={() => setShowEditUnitModal(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleUpdateUnit} className="p-6 space-y-4 text-xs">
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
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-amber-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">نوع الوحدة *</label>
                    <select
                      value={unitForm.type}
                      onChange={(e) => setUnitForm({ ...unitForm, type: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:bg-white"
                    >
                      <option value="apartment">شقة</option>
                      <option value="shop">محل</option>
                      <option value="office">مكتب</option>
                      <option value="warehouse">مستودع</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">المساحة (م²)</label>
                    <input
                      type="number"
                      min={0}
                      value={unitForm.area_sqm}
                      onChange={(e) => setUnitForm({ ...unitForm, area_sqm: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-amber-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">الحالة *</label>
                    <select
                      value={unitForm.status}
                      onChange={(e) => setUnitForm({ ...unitForm, status: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:bg-white"
                    >
                      <option value="vacant">شاغرة</option>
                      <option value="occupied">مشغولة</option>
                      <option value="under_maintenance">تحت الصيانة</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowEditUnitModal(false)}
                    className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl shadow disabled:opacity-50"
                  >
                    {actionLoading ? 'جاري الحفظ...' : 'تحديث الوحدة'}
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
