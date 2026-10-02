import React from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import {
  LayoutDashboard,
  CalendarDays,
  UtensilsCrossed,
  ShoppingBag,
  Receipt,
  Users,
  Grid3X3,
  ChefHat,
  BarChart3,
  ShieldAlert,
  ClipboardList,
  Sparkles,
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onNavigate: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onNavigate }) => {
  const { user } = useAuth();

  // Navigation Items mapped to roles
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'manager'] },
    { id: 'orders', label: 'POS & Orders', icon: ShoppingBag, roles: ['admin', 'manager', 'cashier', 'waiter'] },
    { id: 'kitchen', label: 'Kitchen Display', icon: ChefHat, roles: ['admin', 'manager', 'kitchen'] },
    { id: 'tables', label: 'Table Layout', icon: Grid3X3, roles: ['admin', 'manager', 'waiter', 'cashier'] },
    { id: 'bookings', label: 'Table Booking', icon: CalendarDays, roles: ['admin', 'manager', 'waiter', 'cashier'] },
    { id: 'menu', label: 'Menu Catalog', icon: UtensilsCrossed, roles: ['admin', 'manager', 'kitchen', 'waiter'] },
    { id: 'billing', label: 'Billing & Cashier', icon: Receipt, roles: ['admin', 'manager', 'cashier'] },
    { id: 'customers', label: 'Customers', icon: Users, roles: ['admin', 'manager', 'cashier', 'waiter'] },
    { id: 'reports', label: 'Reports & Analytics', icon: BarChart3, roles: ['admin', 'manager'] },
    { id: 'users', label: 'Staff Management', icon: ShieldAlert, roles: ['admin', 'manager'] },
    { id: 'audit-logs', label: 'Audit Logs', icon: ClipboardList, roles: ['admin', 'manager'] },
  ];

  return (
    <aside className="w-64 bg-zinc-950 border-r border-zinc-800 flex flex-col shrink-0 h-screen sticky top-0 select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 gap-3 border-b border-zinc-800">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/20 text-zinc-950 font-black text-lg">
          <Sparkles className="w-5 h-5 fill-current" />
        </div>
        <div>
          <span className="font-extrabold text-base tracking-tight text-white flex items-center gap-1.5">
            Resto<span className="text-amber-400">Flow</span>
          </span>
          <p className="text-[10px] text-zinc-500 font-mono tracking-wider uppercase font-semibold">
            RMS Enterprise
          </p>
        </div>
      </div>

      {/* Nav List */}
      <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
          Restaurant Modules
        </div>

        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          const isPermitted = user && item.roles.includes(user.role);

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all group ${
                isActive
                  ? 'bg-amber-500 text-zinc-950 font-bold shadow-md shadow-amber-500/20'
                  : isPermitted
                  ? 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/90'
                  : 'text-zinc-600 hover:text-zinc-400 hover:bg-zinc-900/40 opacity-70'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 transition-colors ${
                    isActive ? 'text-zinc-950' : 'text-zinc-400 group-hover:text-amber-400'
                  }`}
                />
                <span>{item.label}</span>
              </div>

              {!isPermitted && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500 font-mono">
                  Locked
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer Status */}
      <div className="p-4 border-t border-zinc-800/80 bg-zinc-950 space-y-1.5">
        <div className="flex items-center justify-between p-2 rounded-xl bg-zinc-900/90 border border-zinc-800/80">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-[11px] font-medium text-zinc-300">TiDB Cloud MySQL</span>
          </div>
          <span className="text-[10px] font-mono text-emerald-400 font-bold">CONNECTED</span>
        </div>
      </div>
    </aside>
  );
};
