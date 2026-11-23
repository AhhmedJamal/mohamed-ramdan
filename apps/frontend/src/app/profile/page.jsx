'use client';

import React, { useState, useEffect } from 'react';
import ProtectedRoute from '../../components/ProtectedRoute';
import AppLayout from '../../components/AppLayout';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import {
  User,
  Phone,
  Mail,
  Building2,
  Shield,
  KeyRound,
  Lock,
  Save,
  AlertCircle,
  CheckCircle2,
  Smartphone,
  LogOut,
} from 'lucide-react';

export default function ProfilePage() {
  const { user, company, logout } = useAuth();

  const [activeTab, setActiveTab] = useState('general'); // 'general' | 'security'
  const [loading, setLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(null);
  const [profileError, setProfileError] = useState(null);

  const [passwordSuccess, setPasswordSuccess] = useState(null);
  const [passwordError, setPasswordError] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile: '',
  });

  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    new_password_confirmation: '',
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await api.get('/profile');
      if (res.data?.data) {
        setFormData({
          name: res.data.data.name || '',
          email: res.data.data.email || '',
          mobile: res.data.data.mobile || '',
        });
      }
    } catch {
      if (user) {
        setFormData({
          name: user.name || '',
          email: user.email || '',
          mobile: user.mobile || '',
        });
      }
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setProfileError(null);
    setProfileSuccess(null);

    // Validation per UC-05: mobile must start with 05 and be 10 digits
    if (!formData.name || formData.name.length < 3) {
      setProfileError('الاسم يجب ألا يقل عن 3 أحرف');
      setLoading(false);
      return;
    }

    if (!/^05[0-9]{8}$/.test(formData.mobile)) {
      setProfileError('رقم الجوال يجب أن يتكون من 10 أرقام ويبدأ بـ 05 (مثال: 0501234567)');
      setLoading(false);
      return;
    }

    try {
      const res = await api.put('/profile', {
        name: formData.name,
        mobile: formData.mobile,
      });

      setProfileSuccess(res.data?.message || 'تم تحديث الملف الشخصي بنجاح');

      // Update local storage
      const stored = localStorage.getItem('auth_user');
      if (stored) {
        const u = JSON.parse(stored);
        u.name = formData.name;
        u.mobile = formData.mobile;
        localStorage.setItem('auth_user', JSON.stringify(u));
      }
    } catch (err) {
      setProfileError(err.response?.data?.message || 'حدث خطأ أثناء تحديث الملف الشخصي');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setPasswordError(null);
    setPasswordSuccess(null);

    // Validation per UC-06
    if (!passwordData.current_password) {
      setPasswordError('يرجى إدخال كلمة المرور الحالية');
      setLoading(false);
      return;
    }

    if (!passwordData.new_password || passwordData.new_password.length < 8) {
      setPasswordError('كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل');
      setLoading(false);
      return;
    }

    if (passwordData.new_password !== passwordData.new_password_confirmation) {
      setPasswordError('كلمات المرور غير متطابقة');
      setLoading(false);
      return;
    }

    try {
      const res = await api.post('/profile/change-password', passwordData);
      setPasswordSuccess(
        res.data?.message || 'تم تغيير كلمة المرور بنجاح، تم إنهاء جميع الجلسات النشطة، يرجى تسجيل الدخول مجدداً'
      );
      setPasswordData({ current_password: '', new_password: '', new_password_confirmation: '' });

      // Evict active sessions and redirect per UC-06
      setTimeout(() => {
        logout();
      }, 2500);
    } catch (err) {
      setPasswordError(err.response?.data?.message || 'حدث خطأ أثناء تغيير كلمة المرور');
    } finally {
      setLoading(false);
    }
  };

  const roleLabels = {
    super_admin: 'مدير النظام العام (Super Admin)',
    branch_manager: 'مدير فرع الشركة (Branch Manager)',
    general_accountant: 'المحاسب العام (General Accountant)',
    data_entry: 'مدخل بيانات (Data Entry)',
  };

  return (
    <ProtectedRoute>
      <AppLayout
        title="الملف الشخصي وإعدادات الحساب"
        subtitle="إدارة بياناتك الشخصية وأمان الحساب (UC-05 & UC-06)"
      >
        <div className="max-w-4xl mx-auto space-y-6">
          {/* User Profile Summary Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col sm:flex-row items-center gap-6">
            <div className="w-20 h-20 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 font-bold text-3xl shrink-0 shadow-inner">
              {formData.name ? formData.name.charAt(0) : 'م'}
            </div>
            <div className="text-center sm:text-right flex-1 space-y-1">
              <h2 className="text-xl font-bold text-slate-900">{formData.name || user?.name}</h2>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs text-slate-500 pt-1">
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  {formData.email || user?.email}
                </span>
                <span className="flex items-center gap-1">
                  <Smartphone className="w-3.5 h-3.5 text-slate-400" />
                  <span dir="ltr">{formData.mobile || user?.mobile}</span>
                </span>
                <span className="flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5 text-amber-500" />
                  <span className="font-semibold text-slate-700">{roleLabels[user?.role] || user?.role}</span>
                </span>
                {company && (
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-blue-500" />
                    <span>{company.name_ar || company.name}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-200">
            <button
              onClick={() => setActiveTab('general')}
              className={`pb-3 px-4 text-sm font-semibold transition-all relative ${
                activeTab === 'general'
                  ? 'text-amber-600 border-b-2 border-amber-600'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span>البيانات الأساسية</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`pb-3 px-4 text-sm font-semibold transition-all relative ${
                activeTab === 'security'
                  ? 'text-amber-600 border-b-2 border-amber-600'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4" />
                <span>الأمان وكلمة المرور</span>
              </div>
            </button>
          </div>

          {/* Tab 1: General Info (UC-05) */}
          {activeTab === 'general' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
              <div className="mb-6">
                <h3 className="text-base font-bold text-slate-900">تحديث البيانات الشخصية</h3>
                <p className="text-xs text-slate-500 mt-1">
                  يمكنك تعديل اسمك ورقم الجوال المعتمد لاستلام رسائل الـ SMS والتنبيهات
                </p>
              </div>

              {profileSuccess && (
                <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-start gap-3 text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{profileSuccess}</span>
                </div>
              )}

              {profileError && (
                <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-3 text-sm">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <span>{profileError}</span>
                </div>
              )}

              <form onSubmit={handleUpdateProfile} className="space-y-5 max-w-lg">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    الاسم بالكامل <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all text-slate-900"
                      required
                    />
                    <User className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">البريد الإلكتروني</label>
                  <div className="relative">
                    <input
                      type="email"
                      value={formData.email}
                      disabled
                      className="w-full pl-3 pr-10 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-500 cursor-not-allowed"
                    />
                    <Mail className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">البريد الإلكتروني ثابت ومحدد من قبل إدارة النظام</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    رقم الجوال <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      dir="ltr"
                      value={formData.mobile}
                      onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                      placeholder="05XXXXXXXX"
                      maxLength={10}
                      className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all text-slate-900 text-right"
                      required
                    />
                    <Phone className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    يجب أن يبدأ بـ 05 ويتكون من 10 أرقام (يُرسل إشعار تأكيد فوري عند التغيير)
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    {loading ? (
                      <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>حفظ التعديلات</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Tab 2: Security & Password (UC-06) */}
          {activeTab === 'security' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
              <div className="mb-6">
                <h3 className="text-base font-bold text-slate-900">تغيير كلمة المرور</h3>
                <p className="text-xs text-slate-500 mt-1">
                  وفقاً لمعايير الأمان (UC-06)، تغيير كلمة المرور يؤدي لإنهاء كافة الجلسات النشطة على جميع الأجهزة
                </p>
              </div>

              {passwordSuccess && (
                <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-start gap-3 text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{passwordSuccess}</span>
                </div>
              )}

              {passwordError && (
                <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-3 text-sm">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <span>{passwordError}</span>
                </div>
              )}

              <form onSubmit={handleChangePassword} className="space-y-5 max-w-lg">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    كلمة المرور الحالية <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      value={passwordData.current_password}
                      onChange={(e) =>
                        setPasswordData({ ...passwordData, current_password: e.target.value })
                      }
                      placeholder="••••••••"
                      className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all text-slate-900"
                      required
                    />
                    <Lock className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    كلمة المرور الجديدة <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      value={passwordData.new_password}
                      onChange={(e) =>
                        setPasswordData({ ...passwordData, new_password: e.target.value })
                      }
                      placeholder="••••••••"
                      minLength={8}
                      maxLength={25}
                      className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all text-slate-900"
                      required
                    />
                    <KeyRound className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">يجب أن تتكون من 8 إلى 25 حرفاً ورقم</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    تأكيد كلمة المرور الجديدة <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      value={passwordData.new_password_confirmation}
                      onChange={(e) =>
                        setPasswordData({ ...passwordData, new_password_confirmation: e.target.value })
                      }
                      placeholder="••••••••"
                      className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all text-slate-900"
                      required
                    />
                    <KeyRound className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    {loading ? (
                      <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    ) : (
                      <>
                        <Shield className="w-4 h-4" />
                        <span>تأكيد وتغيير كلمة المرور</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
