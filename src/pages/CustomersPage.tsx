import React, { useEffect, useState } from 'react';
import { api } from '../services/api.ts';
import { Customer, Order, Booking } from '../types/index.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from '../context/ToastContext.tsx';
import {
  Users,
  Plus,
  Search,
  Phone,
  Mail,
  Award,
  Crown,
  History,
  Edit2,
  Trash2,
  X
} from 'lucide-react';

export const CustomersPage: React.FC = () => {
  const { hasRole } = useAuth();
  const { success, error } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Selected Profile View
  const [selectedCustomer, setSelectedCustomer] = useState<(Customer & { orderHistory: Order[]; bookingHistory: Booking[] }) | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  // Add / Edit Modal
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [isVIP, setIsVIP] = useState(false);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const data = await api.customers.getAll();
      setCustomers(data);
    } catch (err: any) {
      error(err.message || 'Failed to load customer directory');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenProfile = async (id: string) => {
    try {
      setLoadingProfile(true);
      const profile = await api.customers.getById(id);
      setSelectedCustomer(profile);
    } catch (err: any) {
      error(err.message || 'Failed to load customer profile');
    } finally {
      setLoadingProfile(false);
    }
  };

  const openCreateModal = () => {
    setEditingCustomer(null);
    setName('');
    setPhone('');
    setEmail('');
    setAddress('');
    setIsVIP(false);
    setNotes('');
    setShowModal(true);
  };

  const openEditModal = (c: Customer) => {
    setEditingCustomer(c);
    setName(c.name);
    setPhone(c.phone);
    setEmail(c.email);
    setAddress(c.address || '');
    setIsVIP(c.isVIP);
    setNotes(c.notes || '');
    setShowModal(true);
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;

    try {
      setSubmitting(true);
      const payload = {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        address: address.trim(),
        isVIP,
        notes: notes.trim(),
      };

      if (editingCustomer) {
        const updated = await api.customers.update(editingCustomer.id, payload);
        setCustomers(prev => prev.map(c => (c.id === editingCustomer.id ? updated : c)));
        success(`Customer ${updated.name} updated`);
      } else {
        const created = await api.customers.create(payload);
        setCustomers(prev => [created, ...prev]);
        success(`Customer ${created.name} registered with 50 Welcome Loyalty Points!`);
      }

      setShowModal(false);
    } catch (err: any) {
      error(err.message || 'Failed to save customer');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCustomer = async (c: Customer) => {
    if (!confirm(`Are you sure you want to remove customer ${c.name}?`)) return;
    try {
      await api.customers.delete(c.id);
      setCustomers(prev => prev.filter(item => item.id !== c.id));
      if (selectedCustomer?.id === c.id) setSelectedCustomer(null);
      success(`Customer ${c.name} removed`);
    } catch (err: any) {
      error(err.message || 'Failed to delete customer');
    }
  };

  const filteredCustomers = customers.filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.phone.includes(q) || c.email.toLowerCase().includes(q);
  });

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-zinc-800">
        <div>
          <h2 className="text-2xl font-black text-white">Guest & Customer CRM</h2>
          <p className="text-xs text-zinc-400 mt-1">
            Guest loyalty points, dietary preferences, lifetime spend, and dining history.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500 text-zinc-950 font-bold text-xs hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/20"
        >
          <Plus className="w-4 h-4" />
          Register Guest
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
        <input
          type="text"
          placeholder="Search by guest name, phone, or email address..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-amber-500 placeholder-zinc-500"
        />
      </div>

      {/* Directory Grid */}
      {loading ? (
        <div className="p-12 text-center text-xs text-zinc-500">Loading guests directory...</div>
      ) : filteredCustomers.length === 0 ? (
        <div className="p-12 text-center text-xs text-zinc-500 bg-zinc-900 rounded-3xl border border-zinc-800">
          No guests match your search.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCustomers.map(c => (
            <div
              key={c.id}
              className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 flex flex-col justify-between hover:border-zinc-700 transition-colors"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-base text-white">{c.name}</span>
                    {c.isVIP && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold uppercase flex items-center gap-1 border border-amber-500/30">
                        <Crown className="w-3 h-3 fill-current" />
                        VIP
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(c)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
                      title="Edit Profile"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {hasRole(['admin', 'manager']) && (
                      <button
                        onClick={() => handleDeleteCustomer(c)}
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-zinc-800"
                        title="Delete Profile"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-3 space-y-1 text-xs text-zinc-400">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-zinc-500" />
                    <span>{c.phone}</span>
                  </div>
                  {c.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-zinc-500" />
                      <span className="truncate">{c.email}</span>
                    </div>
                  )}
                </div>

                {c.notes && (
                  <p className="mt-3 p-2 rounded-xl bg-zinc-950 text-[11px] text-zinc-400 italic">
                    "{c.notes}"
                  </p>
                )}
              </div>

              {/* Stats & History Action */}
              <div className="mt-5 pt-3 border-t border-zinc-800/80 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase block font-semibold">
                    Lifetime Spend
                  </span>
                  <span className="text-sm font-bold text-white font-mono">
                    ${c.totalSpend.toFixed(2)}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-zinc-500 uppercase block font-semibold">
                    Loyalty Points
                  </span>
                  <span className="text-xs font-bold text-amber-400 font-mono flex items-center gap-1">
                    <Award className="w-3.5 h-3.5" />
                    {c.loyaltyPoints} pts
                  </span>
                </div>

                <button
                  onClick={() => handleOpenProfile(c.id)}
                  className="px-2.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition-colors flex items-center gap-1"
                >
                  <History className="w-3.5 h-3.5 text-amber-400" />
                  History
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Guest Profile & Order History Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-4 border-b border-zinc-800 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-white">{selectedCustomer.name}</h3>
                  {selectedCustomer.isVIP && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold uppercase border border-amber-500/30">
                      VIP Member
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {selectedCustomer.phone} • {selectedCustomer.email || 'No email registered'}
                </p>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profile Metrics */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="p-3 rounded-2xl bg-zinc-950 border border-zinc-800 text-center">
                <span className="text-[10px] text-zinc-500 uppercase font-bold">Total Dining Visits</span>
                <p className="text-xl font-black text-white font-mono mt-1">
                  {selectedCustomer.totalVisits}
                </p>
              </div>
              <div className="p-3 rounded-2xl bg-zinc-950 border border-zinc-800 text-center">
                <span className="text-[10px] text-zinc-500 uppercase font-bold">Lifetime Total Spend</span>
                <p className="text-xl font-black text-emerald-400 font-mono mt-1">
                  ${selectedCustomer.totalSpend.toFixed(2)}
                </p>
              </div>
              <div className="p-3 rounded-2xl bg-zinc-950 border border-zinc-800 text-center">
                <span className="text-[10px] text-zinc-500 uppercase font-bold">Loyalty Reward Points</span>
                <p className="text-xl font-black text-amber-400 font-mono mt-1">
                  {selectedCustomer.loyaltyPoints}
                </p>
              </div>
            </div>

            {/* Past Orders History */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Dining & Order History ({selectedCustomer.orderHistory.length})
              </h4>
              {selectedCustomer.orderHistory.length === 0 ? (
                <p className="text-xs text-zinc-500 py-3">No previous orders recorded for this guest.</p>
              ) : (
                <div className="space-y-2">
                  {selectedCustomer.orderHistory.map(ord => (
                    <div
                      key={ord.id}
                      className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-white">{ord.orderNumber}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 uppercase">
                            {ord.tableNumber || ord.orderType}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-500 mt-0.5">
                          {new Date(ord.createdAt).toLocaleDateString()} • {ord.items.length} dishes
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="font-mono font-bold text-white">
                          ${ord.totalAmount.toFixed(2)}
                        </span>
                        <span
                          className={`block text-[10px] font-bold uppercase ${
                            ord.paymentStatus === 'paid' ? 'text-emerald-400' : 'text-amber-400'
                          }`}
                        >
                          {ord.paymentStatus}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Customer Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800 mb-4">
              <h3 className="text-base font-bold text-white">
                {editingCustomer ? 'Edit Guest Profile' : 'Register New Guest'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Victoria Sterling"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  placeholder="e.g. +1 (555) 789-0123"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="e.g. guest@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="vip-checkbox"
                  checked={isVIP}
                  onChange={e => setIsVIP(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-500 bg-zinc-950 border-zinc-800 focus:ring-0"
                />
                <label htmlFor="vip-checkbox" className="text-xs font-semibold text-zinc-300 cursor-pointer">
                  Tag as VIP Guest (Priority reservations & special perks)
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Dietary Preferences / Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Allergic to peanuts, prefers corner booths..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 text-zinc-950 font-bold text-xs hover:bg-amber-400 disabled:opacity-50 transition-colors shadow-lg shadow-amber-500/20"
                >
                  {submitting ? 'Saving...' : editingCustomer ? 'Save Changes' : 'Register Guest'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
