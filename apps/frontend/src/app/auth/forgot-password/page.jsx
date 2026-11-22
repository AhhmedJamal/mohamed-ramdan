'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import api from '../../../services/api';
import { Mail, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    if (!email) {
      setErrorMessage('يرجى إدخال البريد الإلكتروني');
      setIsLoading(false);
      return;
    }

    try {
      await api.post('/auth/forgot-password', { email });
      setIsSuccess(true);
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message || 'حدث خطأ أثناء إرسال رابط استعادة كلمة المرور'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 selection:bg-amber-500 selection:text-white" dir="rtl">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header Banner */}
        <div className="bg-slate-950 p-8 text-center border-b border-slate-800">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-4 text-amber-500 font-bold text-2xl shadow-lg">
            م
          </div>
          <h2 className="text-xl font-bold text-white tracking-wide">استعادة كلمة المرور</h2>
          <p className="text-xs text-slate-400 mt-1">مجموعة محمد رمضان - نظام ERP السحابي</p>
        </div>

        <div className="p-8">
          {isSuccess ? (
            <div className="text-center py-4">
              <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-200">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">تم إرسال رابط الاستعادة</h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-6">
                إذا كان البريد الإلكتروني مسجلاً لدينا، فستتلقى رسالة تحتوي على رابط ورمز لإعادة تعيين كلمة المرور الخاصة بك.
              </p>
              <div className="space-y-3">
                <Link
                  href="/auth/reset-password"
                  className="block w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow transition-colors text-center"
                >
                  الانتقال إلى شاشة تعيين كلمة المرور الجديدة
                </Link>
                <Link
                  href="/auth/login"
                  className="block w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors text-center"
                >
                  العودة لتسجيل الدخول
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                أدخل عنوان بريدك الإلكتروني المسجل في النظام وسنرسل لك رمزاً مخصصاً لتعيين كلمة مرور جديدة.
              </p>

              {errorMessage && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-700">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

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

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm rounded-xl shadow-lg shadow-slate-950/20 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                ) : (
                  <span>إرسال رابط الاستعادة</span>
                )}
              </button>

              <div className="text-center pt-2">
                <Link
                  href="/auth/login"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 hover:text-amber-700 hover:underline"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>العودة لصفحة تسجيل الدخول</span>
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

