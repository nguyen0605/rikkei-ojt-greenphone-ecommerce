import { Outlet } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import RequireAuth from '@/components/auth/RequireAuth';

export default function CheckoutLayout() {
  return (
    <RequireAuth>
      <div className="flex min-h-screen flex-col bg-gray-50">
        <Header />
        <main className="flex-1">
          <Outlet />
        </main>
        <Footer />
      </div>
    </RequireAuth>
  );
}
