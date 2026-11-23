'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '../../components/AppLayout';
import ProtectedRoute from '../../components/ProtectedRoute';
import api from '../../services/api';
import {
  Plus,
  FileText,
  Calendar,
  Building,
  User,
  Printer,
  Paperclip,
  Trash2,
  Eye,
  Check,
  Ban,
  AlertCircle,
  X,
  Upload,
  Search,
  Clock,
  CheckCircle2,
  DollarSign,
  Info
} from 'lucide-react';

export default function ContractsPage() {
  const [contracts, setContracts] = useState([]);
  const [properties, setProperties] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState('');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [propertyFilter, setPropertyFilter] = useState('');

  // Modal States
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [scheduleModalContract, setScheduleModalContract] = useState(null);
  const [printModalContract, setPrintModalContract] = useState(null);
  const [attachmentsModalContract, setAttachmentsModalContract] = useState(null);
  const [cancelRequestContract, setCancelRequestContract] = useState(null);
  const [rejectCancelContract, setRejectCancelContract] = useState(null);
  const [approveCancelContract, setApproveCancelContract] = useState(null);

  // Form States
  const [formData, setFormData] = useState({
    property_id: '',
    unit_id: '',
    tenant_id: '',
    contract_type: 'company_to_tenant', // company_to_tenant or owner_to_company
    start_date: '2026-01-01',
    end_date: '2026-12-31',
    duration_months: 12,
    total_rent: 48000,
    collection_cycle: 'quarterly', // monthly, quarterly, semi_annual, annual
    first_payment: 0,
    notes: '',
  });
  const [availableUnits, setAvailableUnits] = useState([]);
  const [previewSchedule, setPreviewSchedule] = useState([]);

  // Cancellation reasons
  const [cancellationReason, setCancellationReason] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  // Attachments form
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);

  // Detect user role
  useEffect(() => {
    try {
      const stored = localStorage.getItem('auth_user');
      if (stored) {
        const u = JSON.parse(stored);
        const role = u.active_role || u.role || '';
        setUserRole(role);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Live preview schedule calculation for new contract modal
  useEffect(() => {
    if (!formData.total_rent || !formData.collection_cycle || !formData.start_date) {
      setPreviewSchedule([]);
      return;
    }

    const rent = Number(formData.total_rent);
    let count = 1;
    let stepMonths = 12;

    if (formData.collection_cycle === 'monthly') {
      count = 12;
      stepMonths = 1;
    } else if (formData.collection_cycle === 'quarterly') {
      count = 4;
      stepMonths = 3;
    } else if (formData.collection_cycle === 'semi_annual') {
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
      dueDate.setMonth(baseDate.getMonth() + i * stepMonths); // UC-38 rule: start_date + cycle
      schedule.push({
        installment_number: i,
        due_date: dueDate.toISOString().split('T')[0],
        amount: amountPerInstallment,
        status: 'due',
      });
    }

    setPreviewSchedule(schedule);
  }, [formData.total_rent, formData.collection_cycle, formData.start_date]);

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
      alert('تم إنشاء عقد الإيجار وجدولة الأقساط آلياً وتحديث حالة الوحدة بنجاح!');
      setCreateModalOpen(false);
      setFormData({
        property_id: '',
        unit_id: '',
        tenant_id: '',
        contract_type: 'company_to_tenant',
        start_date: '2026-01-01',
        end_date: '2026-12-31',
        duration_months: 12,
        total_rent: 48000,
        collection_cycle: 'quarterly',
        first_payment: 0,
        notes: '',
      });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'فشل في حفظ العقد');
    }
  };

  // UC-41A: Request Cancellation
  const handleRequestCancellation = async (e) => {
    e.preventDefault();
    if (cancellationReason.trim().length < 10) {
      alert('يجب إدخال سبب الإلغاء بحيث لا يقل عن 10 أحرف (UC-41A)');
      return;
    }
    try {
      await api.post(`/contracts/${cancelRequestContract.id}/request-cancellation`, {
        cancellation_reason: cancellationReason,
      });
      alert('تم إرسال طلب إلغاء العقد لمدير الشركة للموافقة بنجاح');
      setCancelRequestContract(null);
      setCancellationReason('');
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'فشل في إرسال طلب الإلغاء');
    }
  };

  // UC-42: Approve Cancellation (Branch Manager)
  const handleApproveCancellation = async () => {
    if (!approveCancelContract) return;
    try {
      await api.post(`/contracts/${approveCancelContract.id}/approve-cancellation`);
      alert('تمت الموافقة على إلغاء العقد وإتاحة الوحدة كشاغرة بنجاح (UC-42)');
      setApproveCancelContract(null);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'فشل في اعتماد الإلغاء');
    }
  };

  // UC-42: Reject Cancellation (Branch Manager)
  const handleRejectCancellation = async (e) => {
    e.preventDefault();
    if (rejectionReason.trim().length < 10) {
      alert('يجب إدخال سبب الرفض بحيث لا يقل عن 10 أحرف (UC-42)');
      return;
    }
    try {
      await api.post(`/contracts/${rejectCancelContract.id}/reject-cancellation`, {
        rejection_reason: rejectionReason,
      });
      alert('تم رفض طلب إلغاء العقد وإعادته للحالة السارية');
      setRejectCancelContract(null);
      setRejectionReason('');
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'فشل في رفض طلب الإلغاء');
    }
  };

  // UC-41: Upload Attachment
  const handleUploadAttachment = async (e) => {
    e.preventDefault();
    if (!attachmentFile) {
      alert('يرجى اختيار ملف لرفعه');
      return;
    }
    if (attachmentFile.size > 5 * 1024 * 1024) {
      alert('حجم الملف يجب ألا يتجاوز 5 ميجابايت (UC-41)');
      return;
    }
    const data = new FormData();
    data.append('file', attachmentFile);

    setIsUploadingAttachment(true);
    try {
      await api.post(`/contracts/${attachmentsModalContract.id}/attachments`, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      alert('تم رفع المستند المرفق بنجاح');
      setAttachmentFile(null);
      // Refresh single contract attachments
      const res = await api.get(`/contracts/${attachmentsModalContract.id}`);
      setAttachmentsModalContract(res.data.data);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'فشل في رفع المستند');
    } finally {
      setIsUploadingAttachment(false);
    }
  };

  // UC-41: Delete Attachment
  const handleDeleteAttachment = async (attachmentId) => {
    if (!confirm('هل أنت متأكد من حذف هذا المستند المرفق؟')) return;
    try {
      await api.delete(`/contracts/${attachmentsModalContract.id}/attachments/${attachmentId}`);
      alert('تم حذف المستند بنجاح');
      const res = await api.get(`/contracts/${attachmentsModalContract.id}`);
      setAttachmentsModalContract(res.data.data);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'فشل في حذف المستند');
    }
  };

  // Filtered contracts
  const filteredContracts = contracts.filter((c) => {
    const matchSearch =
      searchTerm === '' ||
      c.contract_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.tenant?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.property?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.unit?.unit_number?.toString().includes(searchTerm);

    const matchStatus = statusFilter === 'all' || c.status === statusFilter;
    const matchProperty = !propertyFilter || String(c.property_id) === String(propertyFilter);

    return matchSearch && matchStatus && matchProperty;
  });

  const pendingCancellationCount = contracts.filter((c) => c.status === 'pending_cancellation').length;

  return (
    <ProtectedRoute allowedRoles={['branch_manager', 'data_entry', 'general_accountant', 'super_admin']}>
      <AppLayout
        title="عقود الإيجار وجدولة الأقساط (UC-37 - UC-42)"
        subtitle="تحرير العقود، جدول الأقساط الآلي، دورة طلب واعتماد الإلغاء، والمرفقات"
      >
        {/* Pending Cancellations Banner for Branch Manager */}
        {pendingCancellationCount > 0 && (userRole === 'branch_manager' || userRole === 'super_admin') && (
          <div className="mb-6 p-4 bg-amber-500/10 border border-amber-300 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600" />
              <div>
                <h4 className="text-sm font-bold text-amber-900">
                  تنبيه إداري: يوجد {pendingCancellationCount} طلب إلغاء عقد بانتظار موافقتك (UC-42)
                </h4>
                <p className="text-xs text-amber-700">
                  يمكنك مراجعة أسباب الإلغاء والموافقة لتحرير الوحدات أو الرفض مع ذكر السبب الإلزامي.
                </p>
              </div>
            </div>
            <button
              onClick={() => setStatusFilter('pending_cancellation')}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl transition-all shadow-sm"
            >
              عرض الطلبات المعلقة
            </button>
          </div>
        )}

        {/* Top Control Bar: Search, Filters & Action Button */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Search */}
            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 absolute right-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="بحث برقم العقد، المستأجر، الوحدة..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-3 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-slate-900 focus:outline-none"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-slate-900 focus:outline-none"
            >
              <option value="all">جميع الحالات ({contracts.length})</option>
              <option value="active">ساري (Active)</option>
              <option value="pending_cancellation">طلب إلغاء معلق ({pendingCancellationCount})</option>
              <option value="overdue">متأخر (Overdue)</option>
              <option value="expired">منتهي (Expired)</option>
              <option value="cancelled">ملغي (Cancelled)</option>
            </select>

            {/* Property Filter */}
            <select
              value={propertyFilter}
              onChange={(e) => setPropertyFilter(e.target.value)}
              className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-slate-900 focus:outline-none"
            >
              <option value="">جميع العقارات</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Create Button (Data Entry & Super Admin only per Section 1.6) */}
          {(userRole === 'data_entry' || userRole === 'super_admin' || !userRole) && (
            <button
              onClick={() => setCreateModalOpen(true)}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl flex items-center gap-2 shadow-sm transition-all whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>تحرير عقد إيجار جديد (UC-38)</span>
            </button>
          )}
        </div>

        {/* Contracts Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-8">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-6">رقم العقد</th>
                  <th className="py-3.5 px-6">المستأجر</th>
                  <th className="py-3.5 px-6">العقار والوحدة</th>
                  <th className="py-3.5 px-6">فترة العقد</th>
                  <th className="py-3.5 px-6">القيمة السنوية</th>
                  <th className="py-3.5 px-6">دورية التحصيل</th>
                  <th className="py-3.5 px-6">الحالة</th>
                  <th className="py-3.5 px-6 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan="8" className="py-12 text-center text-slate-400">
                      جاري تحميل بيانات عقود الإيجار...
                    </td>
                  </tr>
                ) : filteredContracts.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="py-12 text-center text-slate-400">
                      لا توجد عقود إيجار مطابقة للبحث أو الفلتر
                    </td>
                  </tr>
                ) : (
                  filteredContracts.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-4 px-6 font-mono font-bold text-slate-900">{c.contract_number}</td>
                      <td className="py-4 px-6 font-medium text-slate-900">
                        <div>{c.tenant?.name || 'غير محدد'}</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {c.tenant?.national_id_or_cr || c.tenant?.mobile}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-slate-700">
                        <div className="font-semibold">{c.property?.name || 'عقار غير محدد'}</div>
                        <div className="text-[11px] text-slate-500">
                          وحدة #{c.unit?.unit_number} (الدور {c.unit?.floor || 1})
                        </div>
                      </td>
                      <td className="py-4 px-6 text-slate-500 font-mono text-[11px]">
                        <div>من: {c.start_date}</div>
                        <div>إلى: {c.end_date}</div>
                      </td>
                      <td className="py-4 px-6 font-mono font-bold text-slate-900">
                        {Number(c.total_rent || c.annual_rent).toLocaleString()} ر.س
                      </td>
                      <td className="py-4 px-6 text-slate-600">
                        {c.collection_cycle === 'monthly' && 'شهري (12 قسط)'}
                        {c.collection_cycle === 'quarterly' && 'ربع سنوي (4 أقساط)'}
                        {c.collection_cycle === 'semi_annual' && 'نصف سنوي (قسطين)'}
                        {c.collection_cycle === 'annual' && 'سنوي (دفعة واحدة)'}
                      </td>
                      <td className="py-4 px-6">
                        {c.status === 'active' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>ساري</span>
                          </span>
                        )}
                        {c.status === 'pending_cancellation' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-300">
                            <Clock className="w-3 h-3 text-amber-600" />
                            <span>طلب إلغاء معلق</span>
                          </span>
                        )}
                        {c.status === 'overdue' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            <AlertCircle className="w-3 h-3" />
                            <span>متأخر السداد</span>
                          </span>
                        )}
                        {c.status === 'expired' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                            <span>منتهي</span>
                          </span>
                        )}
                        {c.status === 'cancelled' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200">
                            <Ban className="w-3 h-3" />
                            <span>ملغي</span>
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          {/* Installments Schedule Button */}
                          <button
                            onClick={() => setScheduleModalContract(c)}
                            title="عرض جدول الأقساط"
                            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                          >
                            <Calendar className="w-3.5 h-3.5" />
                            <span>الأقساط ({c.installments?.length || 0})</span>
                          </button>

                          {/* Attachments Button (UC-41) */}
                          <button
                            onClick={() => setAttachmentsModalContract(c)}
                            title="المستندات المرفقة"
                            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 relative"
                          >
                            <Paperclip className="w-3.5 h-3.5" />
                            <span>المرفقات</span>
                            {(c.attachments?.length || 0) > 0 && (
                              <span className="bg-slate-800 text-white text-[10px] rounded-full w-4 h-4 inline-flex items-center justify-center">
                                {c.attachments.length}
                              </span>
                            )}
                          </button>

                          {/* Print Contract Button (UC-40) */}
                          <button
                            onClick={() => setPrintModalContract(c)}
                            title="طباعة العقد"
                            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>طباعة</span>
                          </button>

                          {/* UC-41A: Request Cancellation (Data Entry on active/overdue) */}
                          {(userRole === 'data_entry' || userRole === 'super_admin' || !userRole) &&
                            (c.status === 'active' || c.status === 'overdue') && (
                              <button
                                onClick={() => {
                                  setCancelRequestContract(c);
                                  setCancellationReason('');
                                }}
                                title="طلب إلغاء العقد"
                                className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold transition-colors"
                              >
                                طلب إلغاء
                              </button>
                            )}

                          {/* UC-42: Branch Manager Cancellation Actions (pending_cancellation) */}
                          {(userRole === 'branch_manager' || userRole === 'super_admin') &&
                            c.status === 'pending_cancellation' && (
                              <>
                                <button
                                  onClick={() => setApproveCancelContract(c)}
                                  className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-all flex items-center gap-1"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>موافقة</span>
                                </button>
                                <button
                                  onClick={() => {
                                    setRejectCancelContract(c);
                                    setRejectionReason('');
                                  }}
                                  className="px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold transition-all flex items-center gap-1"
                                >
                                  <Ban className="w-3.5 h-3.5" />
                                  <span>رفض</span>
                                </button>
                              </>
                            )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* MODAL 1: Installments Schedule Modal (UC-38, UC-39) */}
        {scheduleModalContract && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 my-8">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
                <div>
                  <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-slate-700" />
                    <span>جدول أقساط العقد: {scheduleModalContract.contract_number}</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    المستأجر: {scheduleModalContract.tenant?.name} | العقار:{' '}
                    {scheduleModalContract.property?.name} - وحدة #{scheduleModalContract.unit?.unit_number}
                  </p>
                </div>
                <button
                  onClick={() => setScheduleModalContract(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <span className="text-[11px] font-semibold text-slate-500">إجمالي قيمة العقد</span>
                  <div className="text-base font-bold font-mono text-slate-900 mt-1">
                    {Number(scheduleModalContract.total_rent || scheduleModalContract.annual_rent).toLocaleString()} ر.س
                  </div>
                </div>
                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200">
                  <span className="text-[11px] font-semibold text-emerald-700">المبلغ المسدد</span>
                  <div className="text-base font-bold font-mono text-emerald-800 mt-1">
                    {Number(scheduleModalContract.total_paid || 0).toLocaleString()} ر.س
                  </div>
                </div>
                <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
                  <span className="text-[11px] font-semibold text-amber-700">المستحق الحالي</span>
                  <div className="text-base font-bold font-mono text-amber-800 mt-1">
                    {Number(scheduleModalContract.total_due || 0).toLocaleString()} ر.س
                  </div>
                </div>
                <div className="bg-rose-50 p-4 rounded-xl border border-rose-200">
                  <span className="text-[11px] font-semibold text-rose-700">المتأخرات</span>
                  <div className="text-base font-bold font-mono text-rose-800 mt-1">
                    {Number(scheduleModalContract.total_overdue || 0).toLocaleString()} ر.س
                  </div>
                </div>
              </div>

              {/* Installments Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden mb-6">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">#</th>
                      <th className="py-3 px-4">رقم القسط</th>
                      <th className="py-3 px-4">تاريخ الاستحقاق</th>
                      <th className="py-3 px-4">قيمة القسط</th>
                      <th className="py-3 px-4">المدفوع</th>
                      <th className="py-3 px-4">المتبقي</th>
                      <th className="py-3 px-4 text-center">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {!scheduleModalContract.installments || scheduleModalContract.installments.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="py-6 text-center text-slate-400">
                          لا توجد أقساط مسجلة لهذا العقد
                        </td>
                      </tr>
                    ) : (
                      scheduleModalContract.installments.map((inst, idx) => {
                        const remaining = Math.max(0, Number(inst.amount) - Number(inst.paid_amount || 0));
                        return (
                          <tr key={inst.id || idx} className="hover:bg-slate-50">
                            <td className="py-3 px-4 text-slate-400 font-mono">{idx + 1}</td>
                            <td className="py-3 px-4 font-semibold text-slate-800">
                              قسط #{inst.installment_number}
                            </td>
                            <td className="py-3 px-4 font-mono text-slate-600">{inst.due_date}</td>
                            <td className="py-3 px-4 font-mono font-bold text-slate-900">
                              {Number(inst.amount).toLocaleString()} ر.س
                            </td>
                            <td className="py-3 px-4 font-mono text-emerald-700 font-semibold">
                              {Number(inst.paid_amount || 0).toLocaleString()} ر.س
                            </td>
                            <td className="py-3 px-4 font-mono text-slate-700">
                              {remaining.toLocaleString()} ر.س
                            </td>
                            <td className="py-3 px-4 text-center">
                              {inst.status === 'paid' && (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                                  مسدد بالكامل
                                </span>
                              )}
                              {inst.status === 'due' && (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800">
                                  مستحق
                                </span>
                              )}
                              {inst.status === 'overdue' && (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-800">
                                  متأخر السداد
                                </span>
                              )}
                              {inst.status === 'cancelled' && (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">
                                  ملغي
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setScheduleModalContract(null)}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 2: Attachments Management Modal (UC-41) */}
        {attachmentsModalContract && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 my-8">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
                <div>
                  <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                    <Paperclip className="w-5 h-5 text-slate-700" />
                    <span>المستندات المرفقة للعقد (UC-41): {attachmentsModalContract.contract_number}</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    الحد الأقصى 10 ملفات، حجم كل ملف حتى 5MB، بصيغ PNG, JPEG, PDF
                  </p>
                </div>
                <button
                  onClick={() => setAttachmentsModalContract(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Upload Form (Data Entry only) */}
              {(userRole === 'data_entry' || userRole === 'super_admin' || !userRole) && (
                <form
                  onSubmit={handleUploadAttachment}
                  className="mb-6 p-4 bg-slate-50 rounded-xl border border-dashed border-slate-300"
                >
                  <label className="block text-xs font-bold text-slate-800 mb-2">
                    رفع مستند جديد (عقد ورقي، هوية، سندات استلام)
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="file"
                      accept=".png,.jpg,.jpeg,.pdf"
                      onChange={(e) => setAttachmentFile(e.target.files[0])}
                      className="block w-full text-xs text-slate-500 file:mr-0 file:ml-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-900 file:text-white hover:file:bg-slate-800"
                    />
                    <button
                      type="submit"
                      disabled={isUploadingAttachment || !attachmentFile}
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 whitespace-nowrap shadow-sm"
                    >
                      <Upload className="w-4 h-4" />
                      <span>{isUploadingAttachment ? 'جاري الرفع...' : 'رفع المستند'}</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Attachments List */}
              <div className="border border-slate-200 rounded-xl overflow-hidden mb-6">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">اسم المستند</th>
                      <th className="py-3 px-4">النوع</th>
                      <th className="py-3 px-4">الحجم</th>
                      <th className="py-3 px-4 text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {!attachmentsModalContract.attachments || attachmentsModalContract.attachments.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="py-8 text-center text-slate-400">
                          لا توجد مستندات مرفقة لهذا العقد بعد
                        </td>
                      </tr>
                    ) : (
                      attachmentsModalContract.attachments.map((att) => (
                        <tr key={att.id} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-medium text-slate-800 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-slate-400" />
                            <span>{att.file_name}</span>
                          </td>
                          <td className="py-3 px-4 uppercase font-mono text-slate-500 text-[11px]">
                            {att.file_type}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-500">
                            {(att.file_size / 1024).toFixed(1)} KB
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <a
                                href={`http://127.0.0.1:8000/storage/${att.file_path}`}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs"
                                title="عرض وتحميل"
                              >
                                <Eye className="w-4 h-4" />
                              </a>
                              {(userRole === 'data_entry' || userRole === 'super_admin' || !userRole) && (
                                <button
                                  onClick={() => handleDeleteAttachment(att.id)}
                                  className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs"
                                  title="حذف المستند"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setAttachmentsModalContract(null)}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 3: UC-41A Request Cancellation Modal (Data Entry) */}
        {cancelRequestContract && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-rose-600" />
                  <span>طلب إلغاء عقد إيجار (UC-41A)</span>
                </h3>
                <button
                  onClick={() => setCancelRequestContract(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 mb-4 space-y-1">
                <p className="font-bold">قواعد العمل وفقاً لـ SRS (Section 4.2 / UC-41A):</p>
                <p>• يتحول العقد إلى حالة &quot;طلب إلغاء معلق&quot; فور الإرسال.</p>
                <p>• تظل الوحدة &quot;مشغولة&quot; حتى اعتماد الإلغاء من قِبل مدير الشركة.</p>
                <p>• يجب إدخال سبب الإلغاء بحيث لا يقل عن 10 أحرف إلزامياً.</p>
              </div>

              <div className="mb-4 text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                <div>
                  <span className="font-bold">رقم العقد:</span> {cancelRequestContract.contract_number}
                </div>
                <div>
                  <span className="font-bold">المستأجر:</span> {cancelRequestContract.tenant?.name}
                </div>
                <div>
                  <span className="font-bold">العقار والوحدة:</span> {cancelRequestContract.property?.name} - وحدة #
                  {cancelRequestContract.unit?.unit_number}
                </div>
              </div>

              <form onSubmit={handleRequestCancellation} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-800">
                      سبب الإلغاء (إلزامي - 10 أحرف على الأقل) *
                    </label>
                    <span
                      className={`text-[11px] font-mono ${
                        cancellationReason.length < 10 ? 'text-rose-600 font-bold' : 'text-emerald-600'
                      }`}
                    >
                      {cancellationReason.length} / 10 أحرف كحد أدنى
                    </span>
                  </div>
                  <textarea
                    rows={4}
                    value={cancellationReason}
                    onChange={(e) => setCancellationReason(e.target.value)}
                    placeholder="اكتب بالتفصيل سبب طلب الإلغاء وإنهاء العلاقة الإيجارية..."
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-slate-900 focus:outline-none"
                    required
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setCancelRequestContract(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
                  >
                    تراجع
                  </button>
                  <button
                    type="submit"
                    disabled={cancellationReason.trim().length < 10}
                    className="px-5 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-sm"
                  >
                    إرسال طلب الإلغاء
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 4: UC-42 Approve Cancellation Confirmation (Branch Manager) */}
        {approveCancelContract && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Check className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">اعتماد وإلغاء العقد نهائياً (UC-42)</h3>
                  <p className="text-xs text-slate-500">العقد: {approveCancelContract.contract_number}</p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 mb-4 space-y-1.5">
                <p>
                  <span className="font-bold">سبب الإلغاء المقدم:</span>{' '}
                  {approveCancelContract.cancellation_reason || 'غير محدد'}
                </p>
                <div className="pt-2 border-t border-slate-200 text-emerald-800 text-[11px] font-semibold">
                  ✓ سيتحول العقد إلى حالة &quot;ملغي&quot;.
                  <br />
                  ✓ ستتحول الوحدة عقارياً إلى حالة &quot;شاغرة&quot; فوراً لإعادة تأجيرها.
                  <br />✓ سيتم إلغاء جميع الأقساط غير المسددة.
                </div>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setApproveCancelContract(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleApproveCancellation}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-sm"
                >
                  تأكيد الموافقة والإلغاء
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 5: UC-42 Reject Cancellation Modal (Branch Manager) */}
        {rejectCancelContract && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Ban className="w-5 h-5 text-red-600" />
                  <span>رفض طلب إلغاء العقد (UC-42)</span>
                </h3>
                <button
                  onClick={() => setRejectCancelContract(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-4 text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                <div>
                  <span className="font-bold">العقد:</span> {rejectCancelContract.contract_number}
                </div>
                <div>
                  <span className="font-bold">سبب الإلغاء الأصلي:</span> {rejectCancelContract.cancellation_reason}
                </div>
              </div>

              <form onSubmit={handleRejectCancellation} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-800">
                      سبب الرفض (إلزامي - 10 أحرف على الأقل) *
                    </label>
                    <span
                      className={`text-[11px] font-mono ${
                        rejectionReason.length < 10 ? 'text-rose-600 font-bold' : 'text-emerald-600'
                      }`}
                    >
                      {rejectionReason.length} / 10 أحرف كحد أدنى
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="اكتب سبب رفض طلب الإلغاء (يتم إشعار مدخل البيانات به)..."
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-slate-900 focus:outline-none"
                    required
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setRejectCancelContract(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
                  >
                    تراجع
                  </button>
                  <button
                    type="submit"
                    disabled={rejectionReason.trim().length < 10}
                    className="px-5 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-sm"
                  >
                    تأكيد رفض الطلب
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 6: UC-40 Formal Printable Contract Modal */}
        {printModalContract && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto print:p-0 print:bg-white print:fixed print:inset-0">
            <div className="bg-white rounded-2xl max-w-4xl w-full p-8 shadow-2xl border border-slate-200 my-8 print:border-none print:shadow-none print:p-0 print:my-0">
              {/* Header controls (hidden during print) */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-6 print:hidden">
                <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  <Printer className="w-5 h-5 text-slate-700" />
                  <span>معاينة طباعة العقد الرسمي (UC-40)</span>
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => window.print()}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-sm"
                  >
                    <Printer className="w-4 h-4" />
                    <span>طباعة الآن (Print / PDF)</span>
                  </button>
                  <button
                    onClick={() => setPrintModalContract(null)}
                    className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Official Printable Sheet */}
              <div className="print-content text-slate-900 font-sans border-2 border-slate-800 p-8 rounded-xl bg-white">
                {/* Official Header */}
                <div className="text-center border-b-2 border-slate-800 pb-6 mb-6">
                  <div className="text-xs text-slate-500 font-semibold mb-1">المملكة العربية السعودية</div>
                  <h2 className="text-xl font-black text-slate-900 mb-1">مجموعة محمد رمضان للاستثمار العقاري والمقاولات</h2>
                  <div className="inline-block px-4 py-1 bg-slate-900 text-white font-bold text-sm rounded-lg mt-2">
                    عقد إيجار عقاري موحد
                  </div>
                  <div className="mt-3 text-xs font-mono font-semibold text-slate-600">
                    رقم العقد: {printModalContract.contract_number} | تاريخ التحرير: {printModalContract.start_date}
                  </div>
                </div>

                {/* Contract Parties */}
                <div className="grid grid-cols-2 gap-6 mb-6 pb-6 border-b border-slate-200">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-1.5">
                    <h4 className="font-bold text-sm text-slate-900 border-b border-slate-200 pb-1 mb-2">
                      الطرف الأول (المؤجر)
                    </h4>
                    <p>
                      <span className="font-semibold">الاسم:</span> شركة محمد رمضان للتطوير العقاري
                    </p>
                    <p>
                      <span className="font-semibold">الصفة:</span> المالك / المدير العقاري
                    </p>
                    <p>
                      <span className="font-semibold">السجل التجاري / الرقم الضريبي:</span> 310988776600003
                    </p>
                    <p>
                      <span className="font-semibold">العنوان:</span> الرياض - المملكة العربية السعودية
                    </p>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-1.5">
                    <h4 className="font-bold text-sm text-slate-900 border-b border-slate-200 pb-1 mb-2">
                      الطرف الثاني (المستأجر)
                    </h4>
                    <p>
                      <span className="font-semibold">الاسم:</span> {printModalContract.tenant?.name}
                    </p>
                    <p>
                      <span className="font-semibold">الهوية الوطنية / السجل:</span>{' '}
                      {printModalContract.tenant?.national_id_or_cr || '10XXXXXXXX'}
                    </p>
                    <p>
                      <span className="font-semibold">رقم الجوال:</span> {printModalContract.tenant?.mobile}
                    </p>
                    <p>
                      <span className="font-semibold">البريد الإلكتروني:</span> {printModalContract.tenant?.email}
                    </p>
                  </div>
                </div>

                {/* Leased Unit Specifications */}
                <div className="mb-6 pb-6 border-b border-slate-200 text-xs space-y-2">
                  <h4 className="font-bold text-sm text-slate-900 mb-2">بيانات العين المؤجرة والقيمة التعاقدية</h4>
                  <div className="grid grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div>
                      <span className="text-slate-500 block">العقار / المبنى:</span>
                      <span className="font-bold text-slate-900">{printModalContract.property?.name}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">رقم الوحدة:</span>
                      <span className="font-bold text-slate-900">وحدة #{printModalContract.unit?.unit_number}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">فترة العقد:</span>
                      <span className="font-bold text-slate-900">
                        من {printModalContract.start_date} إلى {printModalContract.end_date}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">القيمة الإجمالية:</span>
                      <span className="font-bold text-slate-900">
                        {Number(printModalContract.total_rent || printModalContract.annual_rent).toLocaleString()} ر.س
                      </span>
                    </div>
                  </div>
                </div>

                {/* Installments Table */}
                <div className="mb-8">
                  <h4 className="font-bold text-sm text-slate-900 mb-2">جدول استحقاق الأقساط والدفعات الإيجارية</h4>
                  <table className="w-full text-right text-xs border border-slate-300">
                    <thead className="bg-slate-100 font-bold border-b border-slate-300">
                      <tr>
                        <th className="py-2 px-3 border-l border-slate-300">رقم القسط</th>
                        <th className="py-2 px-3 border-l border-slate-300">تاريخ الاستحقاق</th>
                        <th className="py-2 px-3 border-l border-slate-300">مبلغ القسط</th>
                        <th className="py-2 px-3">حالة السداد</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {(printModalContract.installments || []).map((i) => (
                        <tr key={i.id}>
                          <td className="py-2 px-3 border-l border-slate-200 font-semibold">
                            قسط رقم ({i.installment_number})
                          </td>
                          <td className="py-2 px-3 border-l border-slate-200 font-mono">{i.due_date}</td>
                          <td className="py-2 px-3 border-l border-slate-200 font-mono font-bold">
                            {Number(i.amount).toLocaleString()} ر.س
                          </td>
                          <td className="py-2 px-3">
                            {i.status === 'paid' ? 'مسدد' : 'قيد الاستحقاق'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Signatures & Seal */}
                <div className="grid grid-cols-2 gap-12 pt-8 border-t-2 border-slate-800 text-xs">
                  <div className="text-center space-y-8">
                    <p className="font-bold text-sm">توقيع الطرف الأول (المؤجر)</p>
                    <div className="h-16 flex items-center justify-center text-slate-300 font-serif italic text-lg">
                      [ الختم الرسمي والتوقيع المعتمد ]
                    </div>
                    <div className="border-t border-dashed border-slate-400 pt-2 text-slate-500">
                      شركة محمد رمضان للاستثمار العقاري
                    </div>
                  </div>

                  <div className="text-center space-y-8">
                    <p className="font-bold text-sm">توقيع الطرف الثاني (المستأجر)</p>
                    <div className="h-16 flex items-center justify-center text-slate-300 font-serif italic text-lg">
                      [ توقيع المستأجر بالاستلام والالتزام ]
                    </div>
                    <div className="border-t border-dashed border-slate-400 pt-2 text-slate-500">
                      الاسم: {printModalContract.tenant?.name}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 7: Contract Creation Modal with Automated Installment Engine (UC-38) */}
        {createModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-3xl w-full p-8 shadow-2xl border border-slate-200 my-8">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
                <div>
                  <h3 className="font-bold text-lg text-slate-900">تحرير عقد إيجار جديد وجدولة الأقساط (UC-38)</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    يتم إنشاء جدول الأقساط آلياً وتحديث حالة الوحدة العقارية إلى &quot;مشغولة&quot; فور الحفظ
                  </p>
                </div>
                <button
                  onClick={() => setCreateModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateContract} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Property Selector */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">العقار / المبنى *</label>
                    <select
                      value={formData.property_id}
                      onChange={(e) => handlePropertyChange(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-slate-900 focus:outline-none"
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

                  {/* Unit Selector (Vacant Units Only - UC-38) */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      الوحدة العقارية الشاغرة *
                    </label>
                    <select
                      value={formData.unit_id}
                      onChange={(e) => setFormData({ ...formData, unit_id: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-slate-900 focus:outline-none"
                      required
                    >
                      <option value="">
                        {availableUnits.length > 0 ? 'اختر الوحدة الشاغرة...' : 'لا توجد وحدات شاغرة بالعقار'}
                      </option>
                      {availableUnits.map((u) => (
                        <option key={u.id} value={u.id}>
                          وحدة #{u.unit_number} (الدور {u.floor}) - {u.type}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Tenant Selector */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">المستأجر *</label>
                    <select
                      value={formData.tenant_id}
                      onChange={(e) => setFormData({ ...formData, tenant_id: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-slate-900 focus:outline-none"
                      required
                    >
                      <option value="">اختر المستأجر...</option>
                      {tenants.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} (هوية: {t.national_id_or_cr || t.mobile})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Contract Type (UC-38) */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">نوع العقد *</label>
                    <select
                      value={formData.contract_type}
                      onChange={(e) => setFormData({ ...formData, contract_type: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-slate-900 focus:outline-none"
                      required
                    >
                      <option value="company_to_tenant">بين الشركة والمستأجر النهائي</option>
                      <option value="owner_to_company">بين المالك والشركة</option>
                    </select>
                  </div>

                  {/* Frequency / Collection Cycle */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">دورية التحصيل *</label>
                    <select
                      value={formData.collection_cycle}
                      onChange={(e) => setFormData({ ...formData, collection_cycle: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-slate-900 focus:outline-none"
                      required
                    >
                      <option value="monthly">شهري (12 قسط في السنة)</option>
                      <option value="quarterly">ربع سنوي (4 أقساط في السنة)</option>
                      <option value="semi_annual">نصف سنوي (دفعتان في السنة)</option>
                      <option value="annual">سنوي (دفعة واحدة في السنة)</option>
                    </select>
                  </div>

                  {/* Start Date */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">تاريخ بداية العقد *</label>
                    <input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-slate-900 focus:outline-none font-mono"
                      required
                    />
                  </div>

                  {/* End Date */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">تاريخ نهاية العقد *</label>
                    <input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-slate-900 focus:outline-none font-mono"
                      required
                    />
                  </div>

                  {/* Total Rent */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      قيمة الإيجار السنوي الإجمالية (ر.س) *
                    </label>
                    <input
                      type="number"
                      value={formData.total_rent}
                      onChange={(e) => setFormData({ ...formData, total_rent: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono font-bold focus:ring-2 focus:ring-slate-900 focus:outline-none"
                      required
                    />
                  </div>
                </div>

                {/* Live Installment Schedule Preview */}
                {previewSchedule.length > 0 && (
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <h4 className="text-xs font-bold text-slate-800 mb-3 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-slate-700" />
                      <span>
                        معاينة جدول الأقساط المولدة آلياً ({previewSchedule.length} أقساط وفقاً لـ UC-38)
                      </span>
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
                              <td className="py-2 px-3 font-semibold text-slate-800">
                                قسط #{item.installment_number}
                              </td>
                              <td className="py-2 px-3 font-mono text-slate-600">{item.due_date}</td>
                              <td className="py-2 px-3 font-mono font-bold text-slate-900">
                                {Number(item.amount).toLocaleString()} ر.س
                              </td>
                              <td className="py-2 px-3">
                                <span className="px-2 py-0.5 rounded text-[10px] bg-amber-100 text-amber-800 font-semibold">
                                  مستحق
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
                    onClick={() => setCreateModalOpen(false)}
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
