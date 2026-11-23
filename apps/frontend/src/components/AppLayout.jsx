'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  Building2, LogOut, Shield, User, Bell, CheckCheck, RefreshCw, X, AlertCircle, FileText, CheckCircle2,
  LayoutDashboard, Building, Key, Receipt, DollarSign, BookOpen, HardHat, BarChart3, Users, Settings,
  Lock, KeyRound, Save
} from 'lucide-react';

export default function AppLayout({ title, subtitle, children }) {
  const { user, company, logout } = useAuth();
  const pathname = usePathname();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [loadingNotifs, setLoadingNotifs] = useState(false);

  // Profile Modal State (UC-05 & UC-06)
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileTab, setProfileTab] = useState('info'); // 'info' | 'password'
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState(null);
  const [profileSuccess, setProfileSuccess] = useState(null);
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    mobile: user?.mobile || '',
  });
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    new_password_confirmation: '',
  });

  const openProfileModal = async () => {
    setProfileError(null);
    setProfileSuccess(null);
    setProfileModalOpen(true);
    setProfileTab('info');
    try {
      const res = await api.get('/profile');
      if (res.data?.data) {
        setProfileData({
          name: res.data.data.name || '',
          email: res.data.data.email || '',
          mobile: res.data.data.mobile || '',
        });
      }
    } catch {
      // fallback to user in auth context
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileError(null);
    setProfileSuccess(null);
    try {
      const res = await api.put('/profile', {
        name: profileData.name,
        mobile: profileData.mobile,
      });
      setProfileSuccess(res.data?.message || 'تم تحديث البيانات الشخصية بنجاح');
      const stored = localStorage.getItem('auth_user');
      if (stored) {
        const u = JSON.parse(stored);
        u.name = profileData.name;
        u.mobile = profileData.mobile;
        localStorage.setItem('auth_user', JSON.stringify(u));
      }
    } catch (err) {
      setProfileError(err.response?.data?.message || 'حدث خطأ أثناء تحديث الملف الشخصي');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileError(null);
    setProfileSuccess(null);
    try {
      const res = await api.post('/profile/change-password', passwordData);
      setProfileSuccess(res.data?.message || 'تم تغيير كلمة المرور بنجاح. سيتم توجيهك لتسجيل الدخول.');
      setPasswordData({ current_password: '', new_password: '', new_password_confirmation: '' });
      setTimeout(() => {
        logout();
      }, 2000);
    } catch (err) {
      setProfileError(err.response?.data?.message || 'حدث خطأ أثناء تغيير كلمة المرور');
    } finally {
      setProfileLoading(false);
    }
  };

  const roleLabels = {
    super_admin: 'أدمن عام النظام',
    branch_manager: 'مدير فرع الشركة',
    general_accountant: 'المحاسب العام',
    data_entry: 'مدخل بيانات',
  };

  const fetchNotifications = async () => {
    if (!user || (user.role === 'super_admin' && !company)) return;
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data.data || []);
      setUnreadCount(res.data.unread_count || 0);
    } catch {
      // Silently catch if not on a tenant context
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Polling every 30s
    return () => clearInterval(interval);
  }, [user, company]);

  const handleMarkAsRead = async (id, e) => {
    e.stopPropagation();
    try {
      await api.post(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      console.error('Failed to mark read', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.post('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all read', err);
    }
  };

  // Role-based navigation links
  const getNavLinks = () => {
    if (!user) return [];

    if (user.role === 'super_admin') {
      return [
        { label: 'لوحة التحكم العامة', href: '/admin/dashboard', icon: LayoutDashboard },
        { label: 'إدارة الشركات المستأجرة', href: '/admin/companies', icon: Building2 },
      ];
    }

    const links = [];

    // Dashboard per role
    if (user.role === 'branch_manager') {
      links.push({ label: 'لوحة تحكم الفرع', href: '/company/dashboard', icon: LayoutDashboard });
      links.push({ label: 'الموظفون والمستخدمون', href: '/company/employees', icon: Users });
    } else if (user.role === 'general_accountant') {
      links.push({ label: 'لوحة تحكم المحاسب', href: '/accounting/dashboard', icon: LayoutDashboard });
    } else if (user.role === 'data_entry') {
      links.push({ label: 'لوحة مدخل البيانات', href: '/data-entry/dashboard', icon: LayoutDashboard });
    }

    // Operational Links (Branch Manager & Data Entry)
    if (['branch_manager', 'data_entry', 'general_accountant'].includes(user.role)) {
      links.push({ label: 'العقارات والمباني', href: '/properties', icon: Building });
      links.push({ label: 'المستأجرون', href: '/tenants', icon: Users });
      links.push({ label: 'عقود الإيجار والأقساط', href: '/contracts', icon: Key });
      links.push({ label: 'السندات المالية', href: '/vouchers', icon: Receipt });
      links.push({ label: 'المقاولات والمشاريع', href: '/contracting', icon: HardHat });
    }

    // Accounting & Governance (General Accountant & Branch Manager Read Access per Section 1.6 & UC-59..UC-63)
    if (user.role === 'general_accountant' || user.role === 'branch_manager') {
      links.push({ label: 'شجرة الحسابات (COA)', href: '/accounting/chart-of-accounts', icon: BookOpen });
      links.push({ label: 'مراكز التكلفة', href: '/accounting/cost-centers', icon: Shield });
      links.push({ label: 'القيود اليومية', href: '/accounting/journal-entries', icon: FileText });
      if (user.role === 'general_accountant') {
        links.push({ label: 'السنوات المالية', href: '/accounting/fiscal-years', icon: Settings });
      }
      links.push({ label: 'التقارير والقوائم المالية', href: '/reports', icon: BarChart3 });
    }

    return links;
  };

  const navLinks = getNavLinks();

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans antialiased overflow-hidden" dir="rtl">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col justify-between shadow-xl z-20 shrink-0">
        <div>
          {/* Brand Header */}
          <div className="p-5 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 font-bold text-xl shadow-inner">
                م
              </div>
              <div>
                <h1 className="font-bold text-base leading-tight text-white tracking-wide">مجموعة محمد رمضان</h1>
                <p className="text-xs text-slate-400 mt-0.5">نظام ERP السحابي v1.0</p>
              </div>
            </div>
          </div>

          {/* Company Badge Context */}
          {company && (
            <div className="mx-4 mt-4 p-3 rounded-lg bg-slate-800/80 border border-slate-700/60 flex items-center gap-2.5">
              <Building2 className="w-4 h-4 text-amber-400 shrink-0" />
              <div className="truncate">
                <p className="text-xs text-slate-400 font-medium">الشركة الحالية:</p>
                <p className="text-xs font-semibold text-slate-200 truncate">{company.name_ar || company.name}</p>
              </div>
            </div>
          )}

          {/* Navigation Links */}
          <nav className="p-3 space-y-1 mt-2 overflow-y-auto max-h-[calc(100vh-280px)]">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Info & Logout Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/60">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-bold text-xs shrink-0">
                {user?.name?.charAt(0) || <User className="w-4 h-4 text-slate-400" />}
              </div>
              <div className="min-w-0 truncate">
                <p className="text-xs font-semibold text-white truncate">{user?.name || 'المستخدم'}</p>
                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-amber-400 border border-amber-500/20 font-medium">
                  {roleLabels[user?.role] || user?.role}
                </span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <Link
              href="/profile"
              className="flex items-center justify-center gap-1.5 px-2.5 py-2 text-[11px] font-medium text-slate-200 hover:text-white hover:bg-slate-800 rounded-lg border border-slate-700 transition-colors"
            >
              <User className="w-3.5 h-3.5 text-amber-400" />
              <span>الملف الشخصي</span>
            </Link>
            <button
              onClick={logout}
              className="flex items-center justify-center gap-1.5 px-2.5 py-2 text-[11px] font-medium text-rose-300 hover:text-white hover:bg-rose-950/40 rounded-lg border border-rose-900/40 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>تسجيل الخروج</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0 shadow-sm z-10">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{title}</h2>
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>

          <div className="flex items-center gap-4">
            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="relative p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                title="الإشعارات والتنبيهات"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center shadow-sm">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown Panel */}
              {notifOpen && (
                <div className="absolute left-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden">
                  <div className="p-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                    <span className="font-semibold text-xs text-slate-800">التنبيهات والإشعارات</span>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllAsRead}
                        className="text-[11px] text-amber-600 hover:text-amber-800 font-medium"
                      >
                        تحديد الكل كمقروء
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-400">لا توجد إشعارات حالياً</div>
                    ) : (
                      notifications.slice(0, 10).map((n) => (
                        <div
                          key={n.id}
                          className={`p-3 text-xs transition-colors cursor-pointer ${
                            n.is_read ? 'bg-white hover:bg-slate-50' : 'bg-amber-50/50 hover:bg-amber-50'
                          }`}
                          onClick={(e) => !n.is_read && handleMarkAsRead(n.id, e)}
                        >
                          <p className="font-semibold text-slate-800 mb-1">{n.title}</p>
                          <p className="text-slate-600 leading-relaxed text-[11px]">{n.message}</p>
                          <span className="text-[10px] text-slate-400 block mt-1.5">{n.created_at_human || 'الآن'}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto p-8">{children}</main>
      </div>

      {/* User Profile & Password Modal (UC-05 & UC-06) */}
      {profileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-md overflow-hidden">
            {/* Header */}
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 font-bold text-sm">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">إدارة الملف الشخصي</h3>
                  <p className="text-[10px] text-slate-400">تعديل البيانات وكلمة المرور (UC-05 & UC-06)</p>
                </div>
              </div>
              <button
                onClick={() => setProfileModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-50 text-xs">
              <button
                onClick={() => {
                  setProfileTab('info');
                  setProfileError(null);
                  setProfileSuccess(null);
                }}
                className={`flex-1 py-3 font-bold text-center border-b-2 transition-all ${
                  profileTab === 'info'
                    ? 'border-amber-500 text-amber-600 bg-white'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                البيانات الشخصية
              </button>
              <button
                onClick={() => {
                  setProfileTab('password');
                  setProfileError(null);
                  setProfileSuccess(null);
                }}
                className={`flex-1 py-3 font-bold text-center border-b-2 transition-all ${
                  profileTab === 'password'
                    ? 'border-amber-500 text-amber-600 bg-white'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                تغيير كلمة المرور
              </button>
            </div>

            <div className="p-6">
              {profileError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
                  <span>{profileError}</span>
                </div>
              )}

              {profileSuccess && (
                <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500 mt-0.5" />
                  <span>{profileSuccess}</span>
                </div>
              )}

              {/* TAB 1: Profile Info (UC-05) */}
              {profileTab === 'info' && (
                <form onSubmit={handleUpdateProfile} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">الاسم الكامل *</label>
                    <input
                      type="text"
                      required
                      minLength={3}
                      maxLength={100}
                      value={profileData.name}
                      onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:bg-white text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">البريد الإلكتروني (غير قابل للتعديل)</label>
                    <input
                      type="email"
                      readOnly
                      disabled
                      value={profileData.email}
                      className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-500 font-mono cursor-not-allowed"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">وفقاً لوثيقة SRS: يتم تعديل البريد فقط عبر مدير النظام.</p>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">رقم الجوال (05xxxxxxxx) *</label>
                    <input
                      type="text"
                      required
                      maxLength={10}
                      value={profileData.mobile}
                      onChange={(e) => setProfileData({ ...profileData, mobile: e.target.value })}
                      placeholder="05XXXXXXXX"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-amber-500 focus:bg-white text-slate-900"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setProfileModalOpen(false)}
                      className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 text-xs"
                    >
                      إلغاء
                    </button>
                    <button
                      type="submit"
                      disabled={profileLoading}
                      className="flex items-center gap-1.5 px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-xs shadow transition-colors disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{profileLoading ? 'جاري الحفظ...' : 'حفظ التعديلات'}</span>
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 2: Change Password (UC-06) */}
              {profileTab === 'password' && (
                <form onSubmit={handleChangePassword} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">كلمة المرور الحالية *</label>
                    <input
                      type="password"
                      required
                      value={passwordData.current_password}
                      onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:bg-white text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">كلمة المرور الجديدة (8 أحرف على الأقل) *</label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={passwordData.new_password}
                      onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:bg-white text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">تأكيد كلمة المرور الجديدة *</label>
                    <input
                      type="password"
                      required
                      value={passwordData.new_password_confirmation}
                      onChange={(e) => setPasswordData({ ...passwordData, new_password_confirmation: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:bg-white text-slate-900"
                    />
                  </div>

                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 leading-relaxed">
                    <span className="font-bold">تنبيه أمني (UC-06):</span> سيؤدي تغيير كلمة المرور إلى إنهاء كافة الجلسات النشطة للمستخدم على جميع الأجهزة فوراً وتسجيل الخروج.
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setProfileModalOpen(false)}
                      className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 text-xs"
                    >
                      إلغاء
                    </button>
                    <button
                      type="submit"
                      disabled={profileLoading}
                      className="flex items-center gap-1.5 px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl text-xs shadow transition-colors disabled:opacity-50"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>{profileLoading ? 'جاري التغيير...' : 'تغيير كلمة المرور'}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

