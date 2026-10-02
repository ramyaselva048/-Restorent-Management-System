import React, { useEffect, useState } from 'react';
import { api } from '../services/api.ts';
import { User, UserRole } from '../types/index.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from '../context/ToastContext.tsx';
import {
  ShieldAlert,
  Plus,
  Shield,
  ChefHat,
  CreditCard,
  UserCheck,
  Sparkles,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  X
} from 'lucide-react';

export const UsersPage: React.FC = () => {
  const { user: currentUser, hasRole } = useAuth();
  const { success, error } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('waiter');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await api.users.getAll();
      setUsers(data);
    } catch (err: any) {
      error(err.message || 'Failed to load staff roster');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (user: User) => {
    if (user.id === currentUser?.id) {
      error('You cannot deactivate your own account');
      return;
    }

    try {
      const res = await api.users.toggleStatus(user.id);
      setUsers(prev => prev.map(u => (u.id === user.id ? { ...u, isActive: res.isActive } : u)));
      success(`User ${user.name} is now ${res.isActive ? 'Active' : 'Deactivated'}`);
    } catch (err: any) {
      error(err.message || 'Failed to toggle account status');
    }
  };

  const openCreateModal = () => {
    setEditingUser(null);
    setName('');
    setEmail('');
    setPassword('');
    setRole('waiter');
    setPhone('');
    setShowModal(true);
  };

  const openEditModal = (u: User) => {
    setEditingUser(u);
    setName(u.name);
    setEmail(u.email);
    setPassword('');
    setRole(u.role);
    setPhone(u.phone || '');
    setShowModal(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    try {
      setSubmitting(true);
      if (editingUser) {
        const payload: any = { name, email, role, phone };
        if (password) payload.password = password;
        const updated = await api.users.update(editingUser.id, payload);
        setUsers(prev => prev.map(u => (u.id === editingUser.id ? updated : u)));
        success(`Staff member ${updated.name} updated`);
      } else {
        if (!password) {
          error('Password is required for new accounts');
          return;
        }
        const created = await api.users.create({ name, email, password, role, phone });
        setUsers(prev => [...prev, created]);
        success(`Staff account for ${created.name} (${created.role.toUpperCase()}) created`);
      }
      setShowModal(false);
    } catch (err: any) {
      error(err.message || 'Failed to save staff member');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (u: User) => {
    if (u.id === currentUser?.id) {
      error('You cannot delete your own account');
      return;
    }
    if (!confirm(`Are you sure you want to permanently delete ${u.name}?`)) return;

    try {
      await api.users.delete(u.id);
      setUsers(prev => prev.filter(item => item.id !== u.id));
      success(`Staff account for ${u.name} removed`);
    } catch (err: any) {
      error(err.message || 'Failed to delete user');
    }
  };

  const roleBadges: Record<UserRole, { bg: string; text: string; icon: any }> = {
    admin: { bg: 'bg-rose-500/10 border-rose-500/30', text: 'text-rose-400', icon: Shield },
    manager: { bg: 'bg-amber-500/10 border-amber-500/30', text: 'text-amber-400', icon: Sparkles },
    cashier: { bg: 'bg-emerald-500/10 border-emerald-500/30', text: 'text-emerald-400', icon: CreditCard },
    waiter: { bg: 'bg-blue-500/10 border-blue-500/30', text: 'text-blue-400', icon: UserCheck },
    kitchen: { bg: 'bg-purple-500/10 border-purple-500/30', text: 'text-purple-400', icon: ChefHat },
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-zinc-800">
        <div>
          <h2 className="text-2xl font-black text-white">Staff & Role-Based Access Control</h2>
          <p className="text-xs text-zinc-400 mt-1">
            Manage restaurant staff accounts, assign granular role permissions, and track active statuses.
          </p>
        </div>

        {hasRole(['admin']) && (
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500 text-zinc-950 font-bold text-xs hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/20"
          >
            <Plus className="w-4 h-4" />
            Add Staff Member
          </button>
        )}
      </div>

      {/* Staff List */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-950/80 border-b border-zinc-800 text-zinc-400 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-6">Staff Member</th>
                <th className="py-3.5 px-4">Contact</th>
                <th className="py-3.5 px-4">System Role</th>
                <th className="py-3.5 px-4">Account Status</th>
                <th className="py-3.5 px-4">Created Date</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {users.map(u => {
                const badge = roleBadges[u.role] || roleBadges.waiter;
                const RoleIcon = badge.icon;

                return (
                  <tr key={u.id} className="hover:bg-zinc-850/50 transition-colors">
                    <td className="py-4 px-6 flex items-center gap-3">
                      <img
                        src={u.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'}
                        alt={u.name}
                        className="w-9 h-9 rounded-xl object-cover ring-1 ring-zinc-700"
                      />
                      <div>
                        <span className="font-bold text-white text-sm block">{u.name}</span>
                        <span className="text-[11px] text-zinc-500">{u.email}</span>
                      </div>
                    </td>

                    <td className="py-4 px-4 text-zinc-300">
                      {u.phone || '—'}
                    </td>

                    <td className="py-4 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${badge.bg} ${badge.text}`}
                      >
                        <RoleIcon className="w-3.5 h-3.5" />
                        {u.role}
                      </span>
                    </td>

                    <td className="py-4 px-4">
                      <button
                        onClick={() => handleToggleStatus(u)}
                        disabled={!hasRole(['admin']) || u.id === currentUser?.id}
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          u.isActive
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {u.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>

                    <td className="py-4 px-4 text-zinc-500 font-mono text-[11px]">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>

                    <td className="py-4 px-6 text-right space-x-1">
                      {hasRole(['admin']) && (
                        <>
                          <button
                            onClick={() => openEditModal(u)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                            title="Edit User"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {u.id !== currentUser?.id && (
                            <button
                              onClick={() => handleDeleteUser(u)}
                              className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 transition-colors"
                              title="Delete User"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit User Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800 mb-4">
              <h3 className="text-base font-bold text-white">
                {editingUser ? 'Edit Staff Member' : 'Add New Staff Member'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  placeholder="e.g. john.doe@restoflow.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  {editingUser ? 'New Password (leave empty to keep current)' : 'Account Password *'}
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:outline-none focus:border-amber-500"
                  required={!editingUser}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    System Role *
                  </label>
                  <select
                    value={role}
                    onChange={e => setRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:outline-none focus:border-amber-500 uppercase font-semibold"
                  >
                    <option value="admin">Admin</option>
                    <option value="manager">Manager</option>
                    <option value="cashier">Cashier</option>
                    <option value="waiter">Waiter</option>
                    <option value="kitchen">Kitchen Staff</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Phone (Optional)
                  </label>
                  <input
                    type="tel"
                    placeholder="+1 (555) ..."
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
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
                  {submitting ? 'Saving...' : editingUser ? 'Save Staff Details' : 'Create Staff User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
