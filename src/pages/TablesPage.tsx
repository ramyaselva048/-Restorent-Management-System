import React, { useEffect, useState } from 'react';
import { api } from '../services/api.ts';
import { RestaurantTable, TableStatus, TableSection } from '../types/index.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from '../context/ToastContext.tsx';
import {
  Plus,
  Users,
  Utensils,
  CheckCircle2,
  Clock,
  Sparkles,
  Trash2,
  X
} from 'lucide-react';

interface TablesPageProps {
  onSelectTableForOrder?: (tableId: string) => void;
  onSelectTableForBooking?: (tableId: string) => void;
}

export const TablesPage: React.FC<TablesPageProps> = ({ onSelectTableForOrder, onSelectTableForBooking }) => {
  const { hasRole } = useAuth();
  const { success, error } = useToast();
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSection, setSelectedSection] = useState<string>('All');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [newNumber, setNewNumber] = useState('');
  const [newCapacity, setNewCapacity] = useState('4');
  const [newSection, setNewSection] = useState<TableSection>('Main Dining');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadTables();
  }, []);

  const loadTables = async () => {
    try {
      setLoading(true);
      const data = await api.tables.getAll();
      setTables(data);
    } catch (err: any) {
      error(err.message || 'Failed to load tables');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: TableStatus) => {
    try {
      const updated = await api.tables.updateStatus(id, newStatus);
      setTables(prev => prev.map(t => (t.id === id ? updated : t)));
      success(`Table ${updated.number} status updated to ${newStatus}`);
    } catch (err: any) {
      error(err.message || 'Failed to update table status');
    }
  };

  const handleCreateTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNumber.trim()) return;

    try {
      setSubmitting(true);
      const created = await api.tables.create({
        number: newNumber.trim(),
        capacity: Number(newCapacity),
        section: newSection,
      });
      setTables(prev => [...prev, created]);
      success(`Table ${created.number} created successfully`);
      setShowAddModal(false);
      setNewNumber('');
    } catch (err: any) {
      error(err.message || 'Failed to create table');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTable = async (id: string, number: string) => {
    if (!confirm(`Are you sure you want to remove table ${number}?`)) return;
    try {
      await api.tables.delete(id);
      setTables(prev => prev.filter(t => t.id !== id));
      success(`Table ${number} deleted`);
    } catch (err: any) {
      error(err.message || 'Failed to delete table');
    }
  };

  const sections = ['All', 'Main Dining', 'Patio Garden', 'Rooftop Lounge', 'VIP Room'];
  const filteredTables = selectedSection === 'All' ? tables : tables.filter(t => t.section === selectedSection);

  const statusColors: Record<TableStatus, { bg: string; text: string; border: string; label: string }> = {
    available: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30', label: 'Available' },
    reserved: { bg: 'bg-sky-500/10', text: 'text-sky-400', border: 'border-sky-500/30', label: 'Reserved' },
    occupied: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30', label: 'Occupied' },
    cleaning: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30', label: 'Cleaning' },
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-zinc-800">
        <div>
          <h2 className="text-2xl font-black text-white">Floor & Table Layout</h2>
          <p className="text-xs text-zinc-400 mt-1">
            Real-time table seating availability, waiter assignments, and floor management.
          </p>
        </div>

        {hasRole(['admin', 'manager']) && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500 text-zinc-950 font-bold text-xs hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/20"
          >
            <Plus className="w-4 h-4" />
            Add Table
          </button>
        )}
      </div>

      {/* Section Filter Tabs & Status Legend */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {sections.map(sec => (
            <button
              key={sec}
              onClick={() => setSelectedSection(sec)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedSection === sec
                  ? 'bg-amber-500 text-zinc-950 shadow-sm'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
              }`}
            >
              {sec}
            </button>
          ))}
        </div>

        {/* Status Legend */}
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Available ({tables.filter(t => t.status === 'available').length})
          </span>
          <span className="flex items-center gap-1.5 text-amber-400">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Occupied ({tables.filter(t => t.status === 'occupied').length})
          </span>
          <span className="flex items-center gap-1.5 text-sky-400">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500" /> Reserved ({tables.filter(t => t.status === 'reserved').length})
          </span>
          <span className="flex items-center gap-1.5 text-purple-400">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500" /> Cleaning ({tables.filter(t => t.status === 'cleaning').length})
          </span>
        </div>
      </div>

      {/* Tables Grid */}
      {loading ? (
        <div className="p-12 text-center text-xs text-zinc-500">Loading tables...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredTables.map(table => {
            const style = statusColors[table.status];

            return (
              <div
                key={table.id}
                className={`p-5 rounded-2xl bg-zinc-900 border transition-all duration-200 flex flex-col justify-between relative ${style.border}`}
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xl font-black text-white font-mono tracking-tight">
                        {table.number}
                      </span>
                      <p className="text-[11px] text-zinc-400">{table.section}</p>
                    </div>

                    <span
                      className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border ${style.bg} ${style.text} ${style.border}`}
                    >
                      {style.label}
                    </span>
                  </div>

                  <div className="mt-4 flex items-center gap-4 text-xs text-zinc-400">
                    <span className="flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-zinc-500" />
                      {table.capacity} Seats
                    </span>
                    {table.assignedWaiter && (
                      <span className="text-[11px] text-amber-400/90 font-medium">
                        Waiter: {table.assignedWaiter}
                      </span>
                    )}
                  </div>
                </div>

                {/* Status Toggle Buttons */}
                <div className="mt-5 pt-4 border-t border-zinc-800/80 flex flex-col gap-2">
                  <div className="grid grid-cols-2 gap-1.5">
                    {table.status !== 'available' && (
                      <button
                        onClick={() => handleStatusChange(table.id, 'available')}
                        className="py-1.5 px-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-semibold hover:bg-emerald-500/20 transition-colors flex items-center justify-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Available
                      </button>
                    )}
                    {table.status !== 'occupied' && (
                      <button
                        onClick={() => handleStatusChange(table.id, 'occupied')}
                        className="py-1.5 px-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[11px] font-semibold hover:bg-amber-500/20 transition-colors flex items-center justify-center gap-1"
                      >
                        <Utensils className="w-3.5 h-3.5" />
                        Seat Guests
                      </button>
                    )}
                    {table.status !== 'cleaning' && (
                      <button
                        onClick={() => handleStatusChange(table.id, 'cleaning')}
                        className="py-1.5 px-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[11px] font-semibold hover:bg-purple-500/20 transition-colors flex items-center justify-center gap-1"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        Cleaning
                      </button>
                    )}
                    {table.status !== 'reserved' && (
                      <button
                        onClick={() => handleStatusChange(table.id, 'reserved')}
                        className="py-1.5 px-2 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20 text-[11px] font-semibold hover:bg-sky-500/20 transition-colors flex items-center justify-center gap-1"
                      >
                        <Clock className="w-3.5 h-3.5" />
                        Reserved
                      </button>
                    )}
                  </div>

                  {hasRole(['admin']) && (
                    <button
                      onClick={() => handleDeleteTable(table.id, table.number)}
                      className="text-zinc-600 hover:text-rose-400 text-[10px] self-end pt-1 transition-colors flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      Remove
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Table Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800 mb-4">
              <h3 className="text-base font-bold text-white">Add New Dining Table</h3>
              <button onClick={() => setShowAddModal(false)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTable} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Table Number / Identifier
                </label>
                <input
                  type="text"
                  placeholder="e.g. T-11 or PAT-03"
                  value={newNumber}
                  onChange={e => setNewNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Guest Capacity (Seats)
                </label>
                <select
                  value={newCapacity}
                  onChange={e => setNewCapacity(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:outline-none focus:border-amber-500"
                >
                  <option value="2">2 Guests (Couple)</option>
                  <option value="4">4 Guests (Standard)</option>
                  <option value="6">6 Guests (Family)</option>
                  <option value="8">8 Guests (Large Group)</option>
                  <option value="10">10+ Guests (VIP Banquet)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Dining Section
                </label>
                <select
                  value={newSection}
                  onChange={e => setNewSection(e.target.value as TableSection)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:outline-none focus:border-amber-500"
                >
                  <option value="Main Dining">Main Dining</option>
                  <option value="Patio Garden">Patio Garden</option>
                  <option value="Rooftop Lounge">Rooftop Lounge</option>
                  <option value="VIP Room">VIP Room</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-amber-500 text-zinc-950 font-bold text-xs hover:bg-amber-400 disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Table'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
