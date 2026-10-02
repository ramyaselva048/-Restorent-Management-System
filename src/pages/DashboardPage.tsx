import React, { useEffect, useState } from 'react';
import { api } from '../services/api.ts';
import { DashboardStats } from '../types/index.ts';
import { useToast } from '../context/ToastContext.tsx';
import {
  DollarSign,
  ShoppingBag,
  CalendarCheck2,
  Users,
  TrendingUp,
  Clock,
  ArrowUpRight,
  Flame,
  Plus
} from 'lucide-react';

interface DashboardPageProps {
  onNavigate: (tab: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const { error } = useToast();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const data = await api.dashboard.getStats();
      setStats(data);
    } catch (err: any) {
      error(err.message || 'Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-zinc-400 font-medium">Loading real-time restaurant analytics...</p>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const maxRevenue = Math.max(...stats.revenueTimeline.map(t => t.revenue), 100);

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Welcome & Quick Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-zinc-800">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-white">Restaurant Command Center</h2>
          <p className="text-xs text-zinc-400 mt-1">
            Real-time floor occupancy, daily revenue, active orders, and sales trends.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => onNavigate('orders')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500 text-zinc-950 font-bold text-xs hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/20"
          >
            <Plus className="w-4 h-4" />
            New Order (POS)
          </button>
          <button
            onClick={() => onNavigate('bookings')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-800 text-zinc-200 font-semibold text-xs hover:bg-zinc-700 transition-colors"
          >
            <CalendarCheck2 className="w-4 h-4 text-amber-400" />
            Book Table
          </button>
        </div>
      </div>

      {/* Top 4 KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today Revenue */}
        <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800/80 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400">Today's Revenue</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-white font-mono">
              ${stats.todayRevenue.toFixed(2)}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-400">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>+{stats.revenueChangePercent}% from yesterday</span>
          </div>
        </div>

        {/* Active Orders */}
        <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800/80 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400">Active POS Orders</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-white font-mono">
              {stats.activeOrdersCount}
            </span>
            <span className="text-xs text-zinc-500 ml-2 font-mono">
              ({stats.todayOrdersCount} total today)
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-amber-400">
            <Clock className="w-3.5 h-3.5" />
            <span>Kitchen prep in progress</span>
          </div>
        </div>

        {/* Today Bookings */}
        <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800/80 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400">Today's Reservations</span>
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <CalendarCheck2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-white font-mono">
              {stats.todayBookingsCount}
            </span>
            <span className="text-xs text-zinc-500 ml-2">Booked tables</span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-zinc-400">
            <span>Occupancy Rate: <strong className="text-zinc-200">{stats.tableOccupancyRate}%</strong></span>
          </div>
        </div>

        {/* Registered Guests */}
        <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800/80 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400">Total Guests & VIPs</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-white font-mono">
              {stats.totalCustomers}
            </span>
            <span className="text-xs text-zinc-500 ml-2">Profiles</span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-purple-400">
            <Flame className="w-3.5 h-3.5" />
            <span>Active loyalty rewards program</span>
          </div>
        </div>
      </div>

      {/* Analytics Chart & Popular Dishes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 7-Day Revenue Trend Chart */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-zinc-900 border border-zinc-800">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-bold text-white">Revenue & Orders (Past 7 Days)</h3>
              <p className="text-xs text-zinc-500">Daily sales performance breakdown</p>
            </div>
            <button
              onClick={() => onNavigate('reports')}
              className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 font-semibold"
            >
              Full Report <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-56 flex items-end justify-between gap-3 pt-4 px-2">
            {stats.revenueTimeline.map((item, idx) => {
              const heightPercent = Math.max(12, Math.round((item.revenue / maxRevenue) * 100));
              const dayName = new Date(item.date).toLocaleDateString([], { weekday: 'short' });

              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 group">
                  <div className="text-[10px] font-mono text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    ${Math.round(item.revenue)}
                  </div>
                  <div className="w-full bg-zinc-800 rounded-t-lg relative overflow-hidden flex items-end h-40">
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className="w-full bg-gradient-to-t from-amber-600 to-amber-400 rounded-t-md transition-all duration-500 group-hover:brightness-125"
                    />
                  </div>
                  <div className="text-[11px] font-semibold text-zinc-400">{dayName}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Selling Signature Items */}
        <div className="p-6 rounded-3xl bg-zinc-900 border border-zinc-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-500" />
              Popular Dishes
            </h3>
            <span className="text-[10px] text-zinc-500 font-mono">By Sales Count</span>
          </div>

          <div className="space-y-3.5">
            {stats.popularItems.map((item, idx) => (
              <div key={item.id} className="flex items-center gap-3 p-2 rounded-xl bg-zinc-950/60 border border-zinc-800/60">
                <span className="w-5 text-center text-xs font-mono font-bold text-zinc-500">
                  #{idx + 1}
                </span>
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="w-11 h-11 rounded-lg object-cover ring-1 ring-zinc-800"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-zinc-100 truncate">{item.name}</p>
                  <p className="text-[10px] text-zinc-500">{item.category}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-amber-400 font-mono">{item.salesCount} sold</p>
                  <p className="text-[10px] text-zinc-500 font-mono">${item.revenue.toFixed(0)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Live Floor Occupancy & Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Revenue Distribution */}
        <div className="p-6 rounded-3xl bg-zinc-900 border border-zinc-800">
          <h3 className="text-sm font-bold text-white mb-4">Sales by Category</h3>
          <div className="space-y-3">
            {stats.categorySales.map((cat, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-300 font-medium">{cat.category}</span>
                  <span className="text-zinc-400 font-mono">
                    ${cat.amount.toFixed(2)} ({cat.count} items)
                  </span>
                </div>
                <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-amber-500 h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, Math.max(10, (cat.amount / (stats.todayRevenue || 200)) * 100))}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live Recent Orders Feed */}
        <div className="p-6 rounded-3xl bg-zinc-900 border border-zinc-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white">Recent POS Orders</h3>
            <button
              onClick={() => onNavigate('orders')}
              className="text-xs text-amber-400 hover:text-amber-300 font-semibold"
            >
              View All Orders
            </button>
          </div>

          <div className="space-y-2.5">
            {stats.recentOrders.map(order => (
              <div
                key={order.id}
                onClick={() => onNavigate('orders')}
                className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800 flex items-center justify-between cursor-pointer hover:border-zinc-700 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-zinc-100">{order.orderNumber}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 uppercase font-mono">
                      {order.tableNumber || order.orderType}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    {order.items.length} items • {order.customerName || 'Walk-in Guest'}
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-xs font-mono font-bold text-white">
                    ${order.totalAmount.toFixed(2)}
                  </span>
                  <div className="mt-0.5">
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded-full uppercase font-bold ${
                        order.status === 'ready'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : order.status === 'preparing'
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
