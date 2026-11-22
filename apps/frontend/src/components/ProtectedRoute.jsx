'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';

export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const { user, isLoading, isAuthenticated, company, logout } = useAuth();
  const { isFrozen } = useTenant();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated || !user) {
      router.push('/auth/login');
      return;
    }

    // Check if user is deactivated (UC-15)
    if (user.status && user.status !== 'active') {
      logout();
      router.push('/auth/login?error=inactive');
      return;
    }

    // Check if company is frozen (UC-09, NFR-003) - Super Admin bypasses
    if (user.role !== 'super_admin' && (isFrozen || company?.status === 'frozen')) {
      logout();
      router.push('/auth/login?error=frozen');
      return;
    }

    // Check RBAC Permissions (Section 1.6 CRUD Matrix)
    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role) && user.role !== 'super_admin') {
      // Redirect to user's assigned dashboard
      const roleRedirects = {
        branch_manager: '/company/dashboard',
        general_accountant: '/accounting/dashboard',
        data_entry: '/data-entry/dashboard',
      };
      router.push(roleRedirects[user.role] || '/auth/login');
    }
  }, [user, isLoading, isAuthenticated, company, isFrozen, allowedRoles, router, logout]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50" dir="rtl">
        <div className="text-center">
          <div className="w-10 h-10 rounded-full border-4 border-amber-600 border-t-transparent animate-spin mx-auto mb-3" />
          <p className="text-xs font-semibold text-slate-500">جاري التحقق من الصلاحيات الأمنية...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role) && user.role !== 'super_admin') {
    return null;
  }

  return <>{children}</>;
}

