import React, { useEffect, useState } from 'react';
import { api } from '../services/api.ts';
import {
  Order,
  MenuItem,
  RestaurantTable,
  Customer,
  OrderType,
  OrderStatus,
  OrderItem
} from '../types/index.ts';
import { useToast } from '../context/ToastContext.tsx';
import {
  Plus,
  Search,
  ShoppingBag,
  Trash2,
  Clock,
  CheckCircle2,
  CreditCard,
  Minus,
  UtensilsCrossed,
  Receipt,
  UserCheck
} from 'lucide-react';

interface OrdersPageProps {
  onNavigateToBilling?: () => void;
}

export const OrdersPage: React.FC<OrdersPageProps> = ({ onNavigateToBilling }) => {
  const { success, error } = useToast();
  const [activeTab, setActiveTab] = useState<'pos' | 'orders'>('pos');

  // POS State
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  // Cart State
  const [orderType, setOrderType] = useState<OrderType>('dine-in');
  const [selectedTableId, setSelectedTableId] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [orderNotes, setOrderNotes] = useState<string>('');
  const [submittingOrder, setSubmittingOrder] = useState(false);

  // Orders List State
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderFilterStatus, setOrderFilterStatus] = useState<string>('all');
  const [orderSearch, setOrderSearch] = useState('');

  // POS Item Search
  const [itemSearch, setItemSearch] = useState('');
  const [posCategory, setPosCategory] = useState('all');

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [itemsData, tablesData, custData, ordersData] = await Promise.all([
        api.menu.getItems({ availableOnly: true }),
        api.tables.getAll(),
        api.customers.getAll(),
        api.orders.getAll(),
      ]);
      setMenuItems(itemsData);
      setTables(tablesData);
      setCustomers(custData);
      setOrders(ordersData);
      if (tablesData.length > 0) {
        setSelectedTableId(tablesData[0].id);
      }
    } catch (err: any) {
      error(err.message || 'Failed to load POS catalog');
    } finally {
      setLoading(false);
    }
  };

  // Cart operations
  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.menuItemId === item.id);
      if (existing) {
        return prev.map(i =>
          i.menuItemId === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        {
          id: 'cart-' + Date.now(),
          menuItemId: item.id,
          name: item.name,
          price: item.price,
          quantity: 1,
          dietary: item.dietary,
        },
      ];
    });
  };

  const updateCartQty = (menuItemId: string, delta: number) => {
    setCart(prev =>
      prev
        .map(i => {
          if (i.menuItemId === menuItemId) {
            const newQty = i.quantity + delta;
            return newQty > 0 ? { ...i, quantity: newQty } : null;
          }
          return i;
        })
        .filter(Boolean) as OrderItem[]
    );
  };

  const removeFromCart = (menuItemId: string) => {
    setCart(prev => prev.filter(i => i.menuItemId !== menuItemId));
  };

  // Calculations
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discountAmount = Math.round(subtotal * (discountPercent / 100) * 100) / 100;
  const taxable = Math.max(0, subtotal - discountAmount);
  const taxAmount = Math.round(taxable * 0.05 * 100) / 100; // 5%
  const serviceCharge = orderType === 'dine-in' ? Math.round(taxable * 0.10 * 100) / 100 : 0; // 10%
  const grandTotal = Math.round((taxable + taxAmount + serviceCharge) * 100) / 100;

  const handleSubmitOrder = async () => {
    if (cart.length === 0) {
      error('Please select at least one item');
      return;
    }

    try {
      setSubmittingOrder(true);
      const newOrder = await api.orders.create({
        orderType,
        tableId: orderType === 'dine-in' ? selectedTableId : undefined,
        customerName: customerName || undefined,
        customerPhone: customerPhone || undefined,
        items: cart,
        discountAmount,
        serviceChargePercent: orderType === 'dine-in' ? 10 : 0,
        taxPercent: 5,
        notes: orderNotes,
      });

      success(`Order ${newOrder.orderNumber} sent to Kitchen Display!`);
      // Clear cart
      setCart([]);
      setOrderNotes('');
      setCustomerName('');
      setCustomerPhone('');
      // Reload orders
      const updatedOrders = await api.orders.getAll();
      setOrders(updatedOrders);
      setActiveTab('orders');
    } catch (err: any) {
      error(err.message || 'Failed to place order');
    } finally {
      setSubmittingOrder(false);
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: OrderStatus) => {
    try {
      const updated = await api.orders.updateStatus(orderId, status);
      setOrders(prev => prev.map(o => (o.id === orderId ? updated : o)));
      success(`Order ${updated.orderNumber} status changed to ${status}`);
    } catch (err: any) {
      error(err.message || 'Failed to update order status');
    }
  };

  const filteredItems = menuItems.filter(item => {
    if (!item.isAvailable) return false;
    if (itemSearch) {
      const q = itemSearch.toLowerCase();
      return item.name.toLowerCase().includes(q) || item.categoryName?.toLowerCase().includes(q);
    }
    return true;
  });

  const filteredOrders = orders.filter(o => {
    if (orderFilterStatus !== 'all' && o.status !== orderFilterStatus) return false;
    if (orderSearch) {
      const q = orderSearch.toLowerCase();
      return (
        o.orderNumber.toLowerCase().includes(q) ||
        o.customerName?.toLowerCase().includes(q) ||
        o.tableNumber?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Tab Switcher */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
        <div>
          <h2 className="text-2xl font-black text-white">POS Terminal & Order Management</h2>
          <p className="text-xs text-zinc-400 mt-1">
            Fast touch billing, modifiers, kitchen routing, and live status tracking.
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-zinc-900 p-1 rounded-xl border border-zinc-800">
          <button
            onClick={() => setActiveTab('pos')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'pos'
                ? 'bg-amber-500 text-zinc-950 shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            New Order (POS)
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'orders'
                ? 'bg-amber-500 text-zinc-950 shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            All Orders ({orders.length})
          </button>
        </div>
      </div>

      {activeTab === 'pos' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Menu Catalog Section */}
          <div className="lg:col-span-7 space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search dishes to add to order..."
                value={itemSearch}
                onChange={e => setItemSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-amber-500 placeholder-zinc-500"
              />
            </div>

            {/* Menu Items Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 max-h-[680px] overflow-y-auto pr-1">
              {filteredItems.map(item => {
                const inCart = cart.find(c => c.menuItemId === item.id);
                return (
                  <div
                    key={item.id}
                    onClick={() => addToCart(item)}
                    className="p-3 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-amber-500/60 transition-all cursor-pointer flex flex-col justify-between group relative overflow-hidden"
                  >
                    <div>
                      <div className="relative h-24 w-full rounded-xl overflow-hidden mb-2">
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        {inCart && (
                          <div className="absolute top-1.5 right-1.5 bg-amber-500 text-zinc-950 font-black rounded-lg px-2 py-0.5 text-xs font-mono shadow-lg">
                            {inCart.quantity}x
                          </div>
                        )}
                      </div>
                      <h4 className="text-xs font-bold text-white line-clamp-1 leading-snug">
                        {item.name}
                      </h4>
                      <p className="text-[10px] text-zinc-500">{item.categoryName}</p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-zinc-800/80 flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-amber-400">
                        ${item.price.toFixed(2)}
                      </span>
                      <span className="w-6 h-6 rounded-lg bg-zinc-800 group-hover:bg-amber-500 group-hover:text-zinc-950 text-zinc-400 flex items-center justify-center transition-colors">
                        <Plus className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Cart & Order Configuration */}
          <div className="lg:col-span-5 bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-2xl space-y-4">
            {/* Order Type Toggle */}
            <div className="grid grid-cols-3 gap-1.5 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
              {(['dine-in', 'takeaway', 'delivery'] as OrderType[]).map(t => (
                <button
                  key={t}
                  onClick={() => setOrderType(t)}
                  className={`py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${
                    orderType === t
                      ? 'bg-amber-500 text-zinc-950 shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {t.replace('-', ' ')}
                </button>
              ))}
            </div>

            {/* Table Selection (if dine-in) */}
            {orderType === 'dine-in' && (
              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                  Assign Dining Table
                </label>
                <select
                  value={selectedTableId}
                  onChange={e => setSelectedTableId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:outline-none focus:border-amber-500 font-mono"
                >
                  {tables.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.number} ({t.capacity} Seats - {t.section}) [{t.status.toUpperCase()}]
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Guest Info */}
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Guest Name (optional)"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:outline-none focus:border-amber-500"
              />
              <input
                type="tel"
                placeholder="Phone (for loyalty points)"
                value={customerPhone}
                onChange={e => setCustomerPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Cart Items List */}
            <div className="border-t border-b border-zinc-800 py-3 space-y-2 max-h-56 overflow-y-auto">
              {cart.length === 0 ? (
                <div className="py-8 text-center text-xs text-zinc-500 flex flex-col items-center gap-2">
                  <ShoppingBag className="w-8 h-8 text-zinc-700" />
                  <span>Cart is empty. Select dishes from the menu to start order.</span>
                </div>
              ) : (
                cart.map(item => (
                  <div
                    key={item.menuItemId}
                    className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800/80 flex items-center justify-between gap-2"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{item.name}</p>
                      <p className="text-[10px] text-zinc-500 font-mono">
                        ${item.price.toFixed(2)} each
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => updateCartQty(item.menuItemId, -1)}
                        className="w-6 h-6 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center transition-colors"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center text-xs font-mono font-bold text-white">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateCartQty(item.menuItemId, 1)}
                        className="w-6 h-6 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => removeFromCart(item.menuItemId)}
                        className="ml-1 text-zinc-600 hover:text-rose-400 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Discounts & Calculations */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Order Discount</span>
                <select
                  value={discountPercent}
                  onChange={e => setDiscountPercent(Number(e.target.value))}
                  className="bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-xs text-white"
                >
                  <option value="0">No Discount</option>
                  <option value="5">5% VIP Discount</option>
                  <option value="10">10% Staff / Promo</option>
                  <option value="15">15% Special Event</option>
                  <option value="20">20% Executive Discount</option>
                </select>
              </div>

              <div className="pt-2 border-t border-zinc-800/80 space-y-1 text-zinc-400 text-[11px]">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-mono text-zinc-200">${subtotal.toFixed(2)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Discount ({discountPercent}%)</span>
                    <span className="font-mono">-${discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Sales Tax (GST 5%)</span>
                  <span className="font-mono text-zinc-200">${taxAmount.toFixed(2)}</span>
                </div>
                {orderType === 'dine-in' && (
                  <div className="flex justify-between">
                    <span>Service Charge (10%)</span>
                    <span className="font-mono text-zinc-200">${serviceCharge.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold text-white pt-1 border-t border-zinc-800">
                  <span>Grand Total</span>
                  <span className="font-mono text-amber-400">${grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Special Kitchen Notes */}
            <input
              type="text"
              placeholder="Order instructions (e.g. extra spicy, serve starters first)..."
              value={orderNotes}
              onChange={e => setOrderNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:outline-none focus:border-amber-500"
            />

            {/* Submit Order Button */}
            <button
              onClick={handleSubmitOrder}
              disabled={submittingOrder || cart.length === 0}
              className="w-full py-3 rounded-2xl bg-amber-500 text-zinc-950 font-bold text-xs hover:bg-amber-400 disabled:opacity-50 transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
            >
              <UtensilsCrossed className="w-4 h-4" />
              {submittingOrder ? 'Placing Order...' : `Send Order to Kitchen ($${grandTotal.toFixed(2)})`}
            </button>
          </div>
        </div>
      ) : (
        /* Orders List */
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search orders by number, table, or guest..."
                value={orderSearch}
                onChange={e => setOrderSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
              {['all', 'new', 'preparing', 'ready', 'served', 'completed', 'cancelled'].map(st => (
                <button
                  key={st}
                  onClick={() => setOrderFilterStatus(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold uppercase whitespace-nowrap transition-all ${
                    orderFilterStatus === st
                      ? 'bg-amber-500 text-zinc-950 font-bold shadow-sm'
                      : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredOrders.map(order => (
              <div
                key={order.id}
                className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-base font-black text-white font-mono">
                        {order.orderNumber}
                      </span>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        {order.tableNumber ? `Table ${order.tableNumber}` : 'Takeaway'} • {order.customerName}
                      </p>
                    </div>

                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        order.status === 'ready'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : order.status === 'preparing'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : order.status === 'served'
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          : order.status === 'completed'
                          ? 'bg-zinc-800 text-zinc-400'
                          : 'bg-zinc-800 text-zinc-300'
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>

                  {/* Items */}
                  <div className="mt-3 py-2 border-t border-b border-zinc-800/80 space-y-1 text-xs">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-zinc-300">
                        <span>{item.quantity}x {item.name}</span>
                        <span className="font-mono text-zinc-400">
                          ${(item.price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="text-zinc-400">Total:</span>
                    <span className="font-mono font-bold text-white text-sm">
                      ${order.totalAmount.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Status action buttons */}
                <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {order.status === 'new' && (
                      <button
                        onClick={() => handleUpdateOrderStatus(order.id, 'preparing')}
                        className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[11px] font-semibold hover:bg-amber-500/20"
                      >
                        Start Prep
                      </button>
                    )}
                    {order.status === 'preparing' && (
                      <button
                        onClick={() => handleUpdateOrderStatus(order.id, 'ready')}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-semibold hover:bg-emerald-500/20"
                      >
                        Mark Ready
                      </button>
                    )}
                    {order.status === 'ready' && (
                      <button
                        onClick={() => handleUpdateOrderStatus(order.id, 'served')}
                        className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[11px] font-semibold hover:bg-blue-500/20"
                      >
                        Serve Table
                      </button>
                    )}
                  </div>

                  {order.paymentStatus === 'unpaid' && (
                    <button
                      onClick={onNavigateToBilling}
                      className="px-3 py-1 rounded-lg bg-emerald-500 text-zinc-950 font-bold text-[11px] hover:bg-emerald-400 flex items-center gap-1"
                    >
                      <Receipt className="w-3.5 h-3.5" />
                      Bill
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
