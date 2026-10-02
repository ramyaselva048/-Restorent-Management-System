/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { NotificationProvider } from './context/NotificationContext.tsx';
import { ToastProvider } from './context/ToastContext.tsx';
import { Header } from './components/Header.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import { LoginPage } from './pages/LoginPage.tsx';
import { DashboardPage } from './pages/DashboardPage.tsx';
import { TablesPage } from './pages/TablesPage.tsx';
import { BookingsPage } from './pages/BookingsPage.tsx';
import { MenuPage } from './pages/MenuPage.tsx';
import { OrdersPage } from './pages/OrdersPage.tsx';
import { KitchenPage } from './pages/KitchenPage.tsx';
import { BillingPage } from './pages/BillingPage.tsx';
import { CustomersPage } from './pages/CustomersPage.tsx';
import { ReportsPage } from './pages/ReportsPage.tsx';
import { UsersPage } from './pages/UsersPage.tsx';
import { AuditLogsPage } from './pages/AuditLogsPage.tsx';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

const rolePermissions: Record<string, string[]> = {
  dashboard: ['admin', 'manager'],
  tables: ['admin', 'manager', 'waiter', 'cashier'],
  bookings: ['admin', 'manager', 'waiter', 'cashier'],
  menu: ['admin', 'manager', 'kitchen', 'waiter'],
  orders: ['admin', 'manager', 'cashier', 'waiter'],
  kitchen: ['admin', 'manager', 'kitchen'],
  billing: ['admin', 'manager', 'cashier'],
  customers: ['admin', 'manager', 'cashier', 'waiter'],
  reports: ['admin', 'manager'],
  users: ['admin', 'manager'],
  'audit-logs': ['admin', 'manager'],
};

function MainLayout() {
  const { user, isLoading } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('dashboard');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-zinc-400 font-medium">Initializing RestoFlow Terminal...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const allowedRoles = rolePermissions[currentTab] || ['admin'];
  const hasAccess = allowedRoles.includes(user.role);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex font-sans antialiased selection:bg-amber-500 selection:text-zinc-950">
      {/* Sidebar Navigation */}
      <Sidebar currentTab={currentTab} onNavigate={tab => setCurrentTab(tab)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        <Header currentTab={currentTab} onNavigate={tab => setCurrentTab(tab)} />

        <main className="flex-1 pb-12">
          {!hasAccess ? (
            <div className="p-8 max-w-xl mx-auto mt-12 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 mx-auto flex items-center justify-center">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-white">Access Restricted</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Your role as <strong className="text-amber-400 uppercase font-mono">{user.role}</strong> does not have permission to view the <strong>{currentTab.replace('-', ' ')}</strong> module.
              </p>
              <div className="pt-2 flex items-center justify-center gap-3">
                <button
                  onClick={() => setCurrentTab(user.role === 'kitchen' ? 'kitchen' : user.role === 'cashier' ? 'orders' : user.role === 'waiter' ? 'tables' : 'dashboard')}
                  className="px-4 py-2 rounded-xl bg-amber-500 text-zinc-950 font-bold text-xs hover:bg-amber-400 transition-colors flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Allowed View
                </button>
              </div>
            </div>
          ) : (
            <>
              {currentTab === 'dashboard' && <DashboardPage onNavigate={setCurrentTab} />}
              {currentTab === 'tables' && <TablesPage />}
              {currentTab === 'bookings' && <BookingsPage />}
              {currentTab === 'menu' && <MenuPage />}
              {currentTab === 'orders' && <OrdersPage onNavigateToBilling={() => setCurrentTab('billing')} />}
              {currentTab === 'kitchen' && <KitchenPage />}
              {currentTab === 'billing' && <BillingPage />}
              {currentTab === 'customers' && <CustomersPage />}
              {currentTab === 'reports' && <ReportsPage />}
              {currentTab === 'users' && <UsersPage />}
              {currentTab === 'audit-logs' && <AuditLogsPage />}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <ToastProvider>
          <MainLayout />
        </ToastProvider>
      </NotificationProvider>
    </AuthProvider>
  );
}
