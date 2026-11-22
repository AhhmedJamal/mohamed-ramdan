'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api, { getActiveSubdomain } from '../services/api';

const TenantContext = createContext(null);

export const TenantProvider = ({ children }) => {
  const [subdomain, setSubdomain] = useState(null);
  const [tenantInfo, setTenantInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFrozen, setIsFrozen] = useState(false);

  useEffect(() => {
    setSubdomain(getActiveSubdomain() || 'comp1');
  }, []);

  // Fetch tenant info from backend whenever subdomain changes
  const fetchTenantInfo = useCallback(async (targetSubdomain) => {
    if (!targetSubdomain) {
      setTenantInfo(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    setIsFrozen(false);

    try {
      const response = await api.get('/tenant/info', {
        headers: { 'X-Tenant-Subdomain': targetSubdomain },
      });
      setTenantInfo(response.data.data);
      setIsFrozen(false);
    } catch (err) {
      const status = err.response?.status;
      const data = err.response?.data;

      if (status === 403 && data?.error_code === 'COMPANY_FROZEN') {
        setIsFrozen(true);
        setError({
          status: 403,
          code: 'COMPANY_FROZEN',
          message: data.message || 'الشركة مجمدة، يرجى مراجعة الإدارة',
        });
      } else if (status === 404) {
        setError({
          status: 404,
          code: 'TENANT_NOT_FOUND',
          message: data?.message || 'الشركة غير موجودة في النظام',
        });
      } else {
        setError({
          status: status || 500,
          code: 'CONNECTION_ERROR',
          message: 'تعذر الاتصال بقاعدة بيانات الشركة',
        });
      }
      setTenantInfo(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (subdomain) {
      fetchTenantInfo(subdomain);
    }
  }, [subdomain, fetchTenantInfo]);

  // Switch tenant context manually (for dev / testing multi-tenancy)
  const switchTenant = (newSubdomain) => {
    if (typeof window !== 'undefined') {
      if (newSubdomain) {
        localStorage.setItem('tenant_subdomain', newSubdomain);
      } else {
        localStorage.removeItem('tenant_subdomain');
      }
    }
    setSubdomain(newSubdomain);
  };

  return (
    <TenantContext.Provider
      value={{
        subdomain,
        tenantInfo,
        isLoading,
        error,
        isFrozen,
        switchTenant,
        refreshTenant: () => fetchTenantInfo(subdomain),
      }}
    >
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};

export default TenantContext;

