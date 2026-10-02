import React, { useEffect, useState } from 'react';
import { api } from '../services/api.ts';
import { Order, OrderStatus } from '../types/index.ts';
import { useToast } from '../context/ToastContext.tsx';
import {
  ChefHat,
  Clock,
  CheckCircle2,
  Flame,
  AlertTriangle,
  RotateCw
} from 'lucide-react';

export const KitchenPage: React.FC = () => {
  const { success, error } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 6000); // 6s live polling for KDS
    return () => clearInterval(interval);
  }, []);

  const loadOrders = async () => {
    try {
      const data = await api.kitchen.getOrders();
      if (Array.isArray(data)) {
        setOrders(data);
      }
    } catch {
      // Gracefully retry on next interval
    } finally {
      setLoading(false);
    }
  };

  const handleAdvanceStatus = async (orderId: string, nextStatus: OrderStatus) => {
    try {
      const updated = await api.orders.updateStatus(orderId, nextStatus);
      setOrders(prev =>
        prev
          .map(o => (o.id === orderId ? updated : o))
          .filter(o => ['new', 'preparing', 'ready'].includes(o.status))
      );
      success(`Ticket ${updated.orderNumber} advanced to ${nextStatus.toUpperCase()}`);
    } catch (err: any) {
      error(err.message || 'Failed to update ticket');
    }
  };

  const getElapsedMinutes = (dateStr: string) => {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    return Math.floor(diffMs / 60000);
  };

  const newOrders = orders.filter(o => o.status === 'new');
  const prepOrders = orders.filter(o => o.status === 'preparing');
  const readyOrders = orders.filter(o => o.status === 'ready');

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* KDS Header */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-2.5">
            <ChefHat className="w-7 h-7 text-amber-500" />
            Kitchen Display System (KDS)
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Real-time ticket routing, order prep timers, and expedite management.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadOrders}
            className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-colors"
            title="Refresh KDS"
          >
            <RotateCw className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-400">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            <span>KDS Active ({orders.length} tickets)</span>
          </div>
        </div>
      </div>

      {/* 3-Column KDS Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {/* Column 1: New Tickets */}
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300">
            <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              Incoming Tickets
            </span>
            <span className="text-xs font-mono font-black">{newOrders.length}</span>
          </div>

          <div className="space-y-4">
            {newOrders.map(order => {
              const elapsed = getElapsedMinutes(order.createdAt);
              const isUrgent = elapsed > 12;

              return (
                <div
                  key={order.id}
                  className={`p-5 rounded-2xl bg-zinc-900 border shadow-lg flex flex-col justify-between ${
                    isUrgent ? 'border-rose-500 ring-1 ring-rose-500/50' : 'border-zinc-800'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between pb-3 border-b border-zinc-800">
                      <div>
                        <span className="text-lg font-black text-white font-mono">
                          {order.orderNumber}
                        </span>
                        <p className="text-xs font-bold text-amber-400">
                          {order.tableNumber ? `Table ${order.tableNumber}` : 'Takeaway'}
                        </p>
                      </div>

                      <div
                        className={`flex items-center gap-1 text-xs font-mono font-bold px-2 py-0.5 rounded-lg ${
                          isUrgent ? 'bg-rose-500 text-white animate-pulse' : 'bg-zinc-800 text-zinc-300'
                        }`}
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>{elapsed}m</span>
                      </div>
                    </div>

                    {/* Ticket Items */}
                    <div className="py-3 space-y-2">
                      {order.items.map((it, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs">
                          <span className="w-5 font-mono font-black text-amber-400 text-sm">
                            {it.quantity}x
                          </span>
                          <div className="flex-1">
                            <p className="font-semibold text-zinc-100">{it.name}</p>
                            {it.notes && (
                              <p className="text-[11px] text-amber-300/80 italic font-mono">
                                ↳ {it.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {order.notes && (
                      <div className="p-2 rounded-xl bg-zinc-950 border border-zinc-800 text-[11px] text-zinc-400">
                        <strong className="text-zinc-300">Ticket Note:</strong> {order.notes}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => handleAdvanceStatus(order.id, 'preparing')}
                    className="mt-4 w-full py-2.5 rounded-xl bg-amber-500 text-zinc-950 font-bold text-xs hover:bg-amber-400 transition-colors shadow-md flex items-center justify-center gap-1.5"
                  >
                    <Flame className="w-4 h-4" />
                    Start Cooking
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Column 2: In Preparation */}
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300">
            <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              In Preparation
            </span>
            <span className="text-xs font-mono font-black">{prepOrders.length}</span>
          </div>

          <div className="space-y-4">
            {prepOrders.map(order => {
              const elapsed = getElapsedMinutes(order.createdAt);
              const isUrgent = elapsed > 20;

              return (
                <div
                  key={order.id}
                  className={`p-5 rounded-2xl bg-zinc-900 border shadow-lg flex flex-col justify-between ${
                    isUrgent ? 'border-rose-500 ring-1 ring-rose-500/50' : 'border-amber-500/40'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between pb-3 border-b border-zinc-800">
                      <div>
                        <span className="text-lg font-black text-white font-mono">
                          {order.orderNumber}
                        </span>
                        <p className="text-xs font-bold text-amber-400">
                          {order.tableNumber ? `Table ${order.tableNumber}` : 'Takeaway'}
                        </p>
                      </div>

                      <div
                        className={`flex items-center gap-1 text-xs font-mono font-bold px-2 py-0.5 rounded-lg ${
                          isUrgent ? 'bg-rose-500 text-white animate-pulse' : 'bg-amber-500/20 text-amber-400'
                        }`}
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>{elapsed}m</span>
                      </div>
                    </div>

                    {/* Ticket Items */}
                    <div className="py-3 space-y-2">
                      {order.items.map((it, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs">
                          <span className="w-5 font-mono font-black text-amber-400 text-sm">
                            {it.quantity}x
                          </span>
                          <div className="flex-1">
                            <p className="font-semibold text-zinc-100">{it.name}</p>
                            {it.notes && (
                              <p className="text-[11px] text-amber-300/80 italic font-mono">
                                ↳ {it.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => handleAdvanceStatus(order.id, 'ready')}
                    className="mt-4 w-full py-2.5 rounded-xl bg-emerald-500 text-zinc-950 font-bold text-xs hover:bg-emerald-400 transition-colors shadow-md flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Ready to Plate / Serve
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Column 3: Ready for Waiter */}
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
            <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Ready to Expedite
            </span>
            <span className="text-xs font-mono font-black">{readyOrders.length}</span>
          </div>

          <div className="space-y-4">
            {readyOrders.map(order => (
              <div
                key={order.id}
                className="p-5 rounded-2xl bg-zinc-900 border border-emerald-500/40 shadow-lg flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between pb-3 border-b border-zinc-800">
                    <div>
                      <span className="text-lg font-black text-white font-mono">
                        {order.orderNumber}
                      </span>
                      <p className="text-xs font-bold text-emerald-400">
                        {order.tableNumber ? `Table ${order.tableNumber}` : 'Takeaway'}
                      </p>
                    </div>

                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 font-mono text-[10px] font-bold uppercase">
                      Pass Ready
                    </span>
                  </div>

                  <div className="py-3 space-y-1.5 text-xs text-zinc-300">
                    {order.items.map((it, idx) => (
                      <div key={idx} className="flex justify-between">
                        <span>{it.quantity}x {it.name}</span>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => handleAdvanceStatus(order.id, 'served')}
                  className="mt-4 w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  Expedited & Picked Up
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
