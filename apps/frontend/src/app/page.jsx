'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push('/auth/login');
      } else {
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
    }
  }, [user, isLoading, router]);

  return (
    <div className="flex h-screen items-center justify-center bg-slate-50" dir="rtl">
      <div className="text-center">
        <div className="w-12 h-12 rounded-full border-4 border-amber-600 border-t-transparent animate-spin mx-auto mb-4" />
        <p className="text-sm font-medium text-slate-600">جاري تحميل النظام...</p>
      </div>
    </div>
  );
}

