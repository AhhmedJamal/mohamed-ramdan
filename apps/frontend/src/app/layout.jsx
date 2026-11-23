import '../styles/globals.css';
import { AuthProvider } from '../context/AuthContext';
import { TenantProvider } from '../context/TenantContext';

export const metadata = {
  title: 'مجموعة محمد رمضان | نظام السحاب المحاسبي والتشغيلي (ERP)',
  description: 'نظام إدارة العقارات والمقاولات والحسابات العامة للمجموعة',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body suppressHydrationWarning className="antialiased">
        <AuthProvider>
          <TenantProvider>
            {children}
          </TenantProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
