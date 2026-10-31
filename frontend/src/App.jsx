import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense, useEffect, useState } from 'react';

import Layout from './components/Layout';
import { PageSkeleton } from './components/Skeleton';

const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Customers = lazy(() => import('./pages/Customers'));
const CustomerDetail = lazy(() => import('./pages/CustomerDetail'));
const Payments = lazy(() => import('./pages/Payments'));
const Reports = lazy(() => import('./pages/Reports'));
const Users = lazy(() => import('./pages/Users'));
const UnpaidCustomers = lazy(() => import('./pages/UnpaidCustomers'));
const ErrorPage = lazy(() => import('./pages/ErrorPage'));
const VerifyPayment = lazy(() => import('./pages/VerifyPayment'));

function App() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <HashRouter>
      {!isOnline && (
        <div className="bg-red-500 text-white text-center py-2 text-sm font-semibold fixed top-0 w-full z-50">
          Anda sedang OFFLINE. Data akan disinkronisasi saat koneksi kembali.
        </div>
      )}
      <div className={!isOnline ? "mt-8" : ""}>
        <Suspense fallback={
          <div className="min-h-dvh bg-gray-50 dark:bg-slate-900 p-4 md:p-8">
            <PageSkeleton />
          </div>
        }>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/error" element={<ErrorPage />} />
            <Route path="/verify" element={<VerifyPayment />} />
            <Route path="/" element={<Layout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="customers" element={<Customers />} />
              <Route path="customers/:id" element={<CustomerDetail />} />
              <Route path="payments" element={<Payments />} />
              <Route path="reports" element={<Reports />} />
              <Route path="users" element={<Users />} />
              <Route path="unpaid" element={<UnpaidCustomers />} />
            </Route>
          </Routes>
        </Suspense>
      </div>
    </HashRouter>
  );
}

export default App;
