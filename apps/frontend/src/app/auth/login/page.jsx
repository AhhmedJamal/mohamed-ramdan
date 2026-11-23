'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../context/AuthContext';
import { useTenant } from '../../../context/TenantContext';
import { Building2, Lock, Mail, AlertCircle, Building, CheckCircle2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login, user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { subdomain, switchTenant, isFrozen, error: tenantError } = useTenant();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // Guest redirection: if already logged in and active, go straight to dashboard
  useEffect(() => {
    if (!authLoading && isAuthenticated && user) {
      if (user.role === 'super_admin') {
        router.push('/admin/dashboard');
      } else if (user.role === 'branch_manager') {
        router.push('/company/dashboard');
      } else if (user.role === 'general_accountant') {
        router.push('/accounting/dashboard');
      } else {
        router.push('/data-entry/dashboard');
      }
    }
  }, [authLoading, isAuthenticated, user, router]);

  // Quick switch between tenants or system admin for testing/demo
  const handleTenantSelect = (val) => {
    switchTenant(val);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    // Frontend validation
    if (!email) {
      setErrorMessage('يرجى إدخال البريد الإلكتروني');
      setIsLoading(false);
      return;
    }
    if (!password) {
      setErrorMessage('يرجى إدخال كلمة المرور');
      setIsLoading(false);
      return;
    }

    try {
      const { user } = await login(email, password);

      // Role-based redirection per Section 1.6 & UC-01
      if (user.role === 'super_admin') {
        router.push('/admin/dashboard');
      } else if (user.role === 'branch_manager') {
        router.push('/company/dashboard');
      } else if (user.role === 'general_accountant') {
        router.push('/accounting/dashboard');
      } else {
        router.push('/data-entry/dashboard');
      }
    } catch (err) {
      const data = err.response?.data;
      if (err.response?.status === 403 && data?.error_code === 'COMPANY_FROZEN') {
        setErrorMessage('حساب الشركة مجمد حالياً، يرجى مراجعة إدارة المجموعة');
      } else if (data?.message) {
        setErrorMessage(data.message);
      } else if (!err.response) {
        setErrorMessage('تعذر الاتصال بالخادم (Backend API). يرجى التحقق من اتصال الشبكة.');
      } else {
        setErrorMessage('بيانات الدخول غير صحيحة');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 selection:bg-amber-500 selection:text-white" dir="rtl">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header Banner */}
        <div className="bg-slate-950 p-8 text-center border-b border-slate-800 relative">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-4 text-amber-500 font-bold text-2xl shadow-lg">
            م
          </div>
          <h2 className="text-xl font-bold text-white tracking-wide">مجموعة محمد رمضان</h2>
          <p className="text-xs text-slate-400 mt-1">نظام المحاسبة والعمليات السحابي المتكامل (ERP)</p>
        </div>

        {/* Tenant Switcher Context Header */}
        <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-slate-600 font-medium">
            <Building2 className="w-4 h-4 text-amber-600" />
            <span>الشركة المستهدفة:</span>
          </div>
          <select
            value={subdomain || ''}
            onChange={(e) => handleTenantSelect(e.target.value)}
            className="bg-white border border-slate-300 rounded-md px-2 py-1 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-amber-500"
          >
            <option value="comp1">شركة محمد رمضان للعقارات (comp1)</option>
            <option value="comp2">شركة رمضان للمقاولات (comp2)</option>
            <option value="comp3">مؤسسة التجارة والخدمات (comp3)</option>
            <option value="">مدير النظام العام (Super Admin)</option>
          </select>
        </div>

        {/* Login Form Body */}
        <div className="p-8">
          {(errorMessage || isFrozen || tenantError) && (
            <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-xs text-rose-800 leading-relaxed font-medium">
                {isFrozen
                  ? 'حساب الشركة مجمد حالياً، يرجى مراجعة إدارة المجموعة'
                  : errorMessage || tenantError?.message}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">البريد الإلكتروني</label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all text-slate-900"
                  required
                />
                <Mail className="w-4 h-4 text-slate-400 absolute right-3 top-3.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">كلمة المرور</label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all text-slate-900"
                  required
                />
                <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-3.5" />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs py-1">
              <Link
                href="/auth/forgot-password"
                className="text-amber-600 hover:text-amber-700 font-medium hover:underline transition-colors"
              >
                نسيت كلمة المرور؟
              </Link>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm rounded-xl shadow-lg shadow-slate-950/20 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
              ) : (
                <span>تسجيل الدخول</span>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials Assistant */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2.5 text-center">
              حسابات الدخول التجريبية (Demo Accounts)
            </p>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <button
                type="button"
                onClick={() => {
                  setEmail('admin@ehkam.com');
                  setPassword('Password@123');
                  switchTenant('');
                }}
                className="p-2 text-right bg-slate-50 hover:bg-amber-50 rounded-lg border border-slate-200 transition-colors"
              >
                <span className="font-bold text-slate-700 block">Super Admin</span>
                <span className="text-slate-500 text-[10px]">admin@ehkam.com</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmail('manager@comp1.com');
                  setPassword('Password@123');
                  switchTenant('comp1');
                }}
                className="p-2 text-right bg-slate-50 hover:bg-amber-50 rounded-lg border border-slate-200 transition-colors"
              >
                <span className="font-bold text-slate-700 block">Branch Manager</span>
                <span className="text-slate-500 text-[10px]">manager@comp1.com</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmail('accountant@comp1.com');
                  setPassword('Password@123');
                  switchTenant('comp1');
                }}
                className="p-2 text-right bg-slate-50 hover:bg-amber-50 rounded-lg border border-slate-200 transition-colors"
              >
                <span className="font-bold text-slate-700 block">General Accountant</span>
                <span className="text-slate-500 text-[10px]">accountant@comp1.com</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmail('dataentry@comp1.com');
                  setPassword('Password@123');
                  switchTenant('comp1');
                }}
                className="p-2 text-right bg-slate-50 hover:bg-amber-50 rounded-lg border border-slate-200 transition-colors"
              >
                <span className="font-bold text-slate-700 block">Data Entry</span>
                <span className="text-slate-500 text-[10px]">dataentry@comp1.com</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

