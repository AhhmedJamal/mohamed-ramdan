import axios from 'axios';

// Base API configuration
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Helper to determine active tenant subdomain
export const getActiveSubdomain = () => {
  if (typeof window === 'undefined') return null;
  
  // 1. Check localStorage override first (useful for dev and tenant switcher)
  const storedTenant = localStorage.getItem('tenant_subdomain');
  if (storedTenant) {
    return storedTenant;
  }

  // 2. Derive from hostname (e.g. comp1.ehkam.com or comp1.localhost)
  const hostname = window.location.hostname;
  // Ignore IP addresses (e.g. 127.0.0.1) and localhost
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname) || hostname === 'localhost') {
    return null;
  }

  const parts = hostname.split('.');
  if (parts.length > 2 && parts[0] !== 'www' && parts[0] !== 'api') {
    return parts[0];
  }

  return null;
};

// Request interceptor: Inject Tenant Subdomain, Bearer Token, and Language
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const subdomain = getActiveSubdomain();
      if (subdomain) {
        config.headers['X-Tenant-Subdomain'] = subdomain;
      }

      const token = localStorage.getItem('auth_token');
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }

      const locale = localStorage.getItem('app_locale') || 'ar';
      config.headers['Accept-Language'] = locale;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Handle standard API errors (401 unauth, 403 frozen company, 404 tenant missing)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && typeof window !== 'undefined') {
      const { status, data } = error.response;

      if (status === 401) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        localStorage.removeItem('auth_company');
        if (!window.location.pathname.includes('/auth/login')) {
          window.location.href = '/auth/login';
        }
      }

      if (status === 403 && data?.error_code === 'COMPANY_FROZEN') {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        localStorage.removeItem('auth_company');
        if (!window.location.pathname.includes('/auth/login')) {
          window.location.href = '/auth/login?error=frozen';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;

