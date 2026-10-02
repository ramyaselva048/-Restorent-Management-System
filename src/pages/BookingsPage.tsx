import React, { useEffect, useState } from 'react';
import { api } from '../services/api.ts';
import { Booking, RestaurantTable, BookingStatus } from '../types/index.ts';
import { useToast } from '../context/ToastContext.tsx';
import {
  CalendarDays,
  Plus,
  Search,
  Phone,
  Clock,
  Users,
  CheckCircle2,
  XCircle,
  Utensils,
  Download,
  X
} from 'lucide-react';
import { CreatableSelect } from '../components/CreatableSelect.tsx';

export const BookingsPage: React.FC = () => {
  const { success, error } = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [tableId, setTableId] = useState('');
  const [guestCount, setGuestCount] = useState(2);
  const [bookingDate, setBookingDate] = useState(new Date().toISOString().split('T')[0]);
  const [bookingTime, setBookingTime] = useState('19:00');
  const [durationMinutes, setDurationMinutes] = useState(90);
  const [specialRequests, setSpecialRequests] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, [selectedDate, selectedStatus]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [bookingsData, tablesData] = await Promise.all([
        api.bookings.getAll({
          date: selectedDate || undefined,
          status: selectedStatus === 'all' ? undefined : selectedStatus,
        }),
        api.tables.getAll(),
      ]);
      setBookings(bookingsData);
      setTables(tablesData);
      if (tablesData.length > 0 && !tableId) {
        setTableId(tablesData[0].id);
      }
    } catch (err: any) {
      error(err.message || 'Failed to load reservations');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !customerPhone || !tableId) return;

    try {
      setSubmitting(true);
      const created = await api.bookings.create({
        customerName,
        customerPhone,
        customerEmail: customerEmail || undefined,
        tableId,
        guestCount,
        bookingDate,
        bookingTime,
        durationMinutes,
        specialRequests: specialRequests || undefined,
      });

      success(`Reservation confirmed for ${created.customerName} on Table ${created.tableNumber}`);
      setShowModal(false);
      resetForm();
      loadData();
    } catch (err: any) {
      // Highlights double-booking prevention message
      error(err.message || 'Double booking error: Table is occupied at this time');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (id: string, status: BookingStatus) => {
    try {
      const updated = await api.bookings.updateStatus(id, status);
      setBookings(prev => prev.map(b => (b.id === id ? updated : b)));
      success(`Booking status changed to ${status}`);
    } catch (err: any) {
      error(err.message || 'Failed to update reservation');
    }
  };

  const resetForm = () => {
    setCustomerName('');
    setCustomerPhone('');
    setCustomerEmail('');
    setGuestCount(2);
    setBookingTime('19:00');
    setSpecialRequests('');
  };

  const handleExportCSV = () => {
    const headers = ['Booking Code', 'Guest Name', 'Phone', 'Table', 'Guests', 'Date', 'Time', 'Status'];
    const rows = bookings.map(b => [
      b.bookingCode,
      `"${b.customerName}"`,
      b.customerPhone,
      b.tableNumber,
      b.guestCount,
      b.bookingDate,
      b.bookingTime,
      b.status,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map(e => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `bookings-${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredBookings = bookings.filter(b => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      b.customerName.toLowerCase().includes(q) ||
      b.customerPhone.includes(q) ||
      b.bookingCode.toLowerCase().includes(q) ||
      b.tableNumber.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-zinc-800">
        <div>
          <h2 className="text-2xl font-black text-white">Table Reservations & Bookings</h2>
          <p className="text-xs text-zinc-400 mt-1">
            Intelligent timeslot scheduling with automated conflict detection & double-booking prevention.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 font-semibold text-xs hover:bg-zinc-800 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500 text-zinc-950 font-bold text-xs hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/20"
          >
            <Plus className="w-4 h-4" />
            New Reservation
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {/* Search */}
        <div className="relative md:col-span-2">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by guest name, phone, or reservation code..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-amber-500 placeholder-zinc-500"
          />
        </div>

        {/* Date Selector */}
        <div>
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-amber-500 font-mono"
          />
        </div>

        {/* Status Filter */}
        <div>
          <CreatableSelect
            options={[
              { value: 'all', label: 'All Reservation Statuses' },
              { value: 'confirmed', label: 'Confirmed' },
              { value: 'seated', label: 'Seated' },
              { value: 'completed', label: 'Completed' },
              { value: 'cancelled', label: 'Cancelled' },
            ]}
            value={selectedStatus}
            onChange={val => setSelectedStatus(val)}
            allowCreate={false}
            placeholder="Filter reservation status..."
            searchPlaceholder="Search status..."
          />
        </div>
      </div>

      {/* Bookings List Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-xs text-zinc-500">Loading bookings...</div>
        ) : filteredBookings.length === 0 ? (
          <div className="p-12 text-center text-xs text-zinc-500">
            No bookings found for the selected criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-950/80 border-b border-zinc-800 text-zinc-400 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3.5 px-6">Code & Guest</th>
                  <th className="py-3.5 px-4">Contact</th>
                  <th className="py-3.5 px-4">Table</th>
                  <th className="py-3.5 px-4">Party Size</th>
                  <th className="py-3.5 px-4">Schedule</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {filteredBookings.map(b => (
                  <tr key={b.id} className="hover:bg-zinc-850/50 transition-colors">
                    <td className="py-4 px-6">
                      <div className="font-bold text-white flex items-center gap-2">
                        {b.customerName}
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-amber-400">
                          {b.bookingCode}
                        </span>
                      </div>
                      {b.specialRequests && (
                        <p className="text-[11px] text-zinc-400 mt-0.5 italic">
                          "{b.specialRequests}"
                        </p>
                      )}
                    </td>

                    <td className="py-4 px-4">
                      <div className="flex items-center gap-1.5 text-zinc-300">
                        <Phone className="w-3.5 h-3.5 text-zinc-500" />
                        <span>{b.customerPhone}</span>
                      </div>
                      {b.customerEmail && (
                        <p className="text-[11px] text-zinc-500 mt-0.5">{b.customerEmail}</p>
                      )}
                    </td>

                    <td className="py-4 px-4 font-mono font-bold text-white">
                      {b.tableNumber}
                    </td>

                    <td className="py-4 px-4">
                      <span className="flex items-center gap-1 text-zinc-300">
                        <Users className="w-3.5 h-3.5 text-zinc-500" />
                        {b.guestCount} Guests
                      </span>
                    </td>

                    <td className="py-4 px-4">
                      <div className="flex items-center gap-1.5 text-zinc-200 font-mono">
                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                        <span>{b.bookingTime}</span>
                        <span className="text-zinc-500 text-[10px]">({b.durationMinutes}m)</span>
                      </div>
                      <p className="text-[10px] text-zinc-500 font-mono mt-0.5">{b.bookingDate}</p>
                    </td>

                    <td className="py-4 px-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          b.status === 'confirmed'
                            ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                            : b.status === 'seated'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : b.status === 'completed'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {b.status}
                      </span>
                    </td>

                    <td className="py-4 px-6 text-right space-x-2">
                      {b.status === 'confirmed' && (
                        <button
                          onClick={() => handleStatusChange(b.id, 'seated')}
                          className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[11px] font-semibold hover:bg-amber-500/20 transition-colors inline-flex items-center gap-1"
                        >
                          <Utensils className="w-3.5 h-3.5" />
                          Seat Table
                        </button>
                      )}
                      {b.status === 'seated' && (
                        <button
                          onClick={() => handleStatusChange(b.id, 'completed')}
                          className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[11px] font-semibold hover:bg-emerald-500/20 transition-colors inline-flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Complete
                        </button>
                      )}
                      {b.status !== 'cancelled' && b.status !== 'completed' && (
                        <button
                          onClick={() => handleStatusChange(b.id, 'cancelled')}
                          className="px-2 py-1 rounded-lg text-rose-400/80 hover:bg-rose-500/10 text-[11px] font-semibold transition-colors inline-flex items-center gap-1"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Reservation Modal with Collision Prevention */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800 mb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-amber-400" />
                  New Table Reservation
                </h3>
                <p className="text-[11px] text-zinc-400">Automatic double-booking detection active</p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBooking} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Guest Full Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Eleanor Vance"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
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
                    placeholder="e.g. +1 (555) 019-2831"
                    value={customerPhone}
                    onChange={e => setCustomerPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Email Address (Optional)
                </label>
                <input
                  type="email"
                  placeholder="e.g. eleanor@example.com"
                  value={customerEmail}
                  onChange={e => setCustomerEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Select Table *
                  </label>
                  <CreatableSelect
                    options={tables.map(t => ({
                      value: t.id,
                      label: `${t.number} (${t.capacity}p - ${t.section})`,
                      subLabel: `Status: ${t.status.toUpperCase()}`,
                    }))}
                    value={tableId}
                    onChange={val => setTableId(val)}
                    allowCreate={false}
                    placeholder="Search or pick table..."
                    searchPlaceholder="Type table number..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Number of Guests *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={guestCount}
                    onChange={e => setGuestCount(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:outline-none focus:border-amber-500 font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Duration
                  </label>
                  <CreatableSelect
                    options={[
                      { value: '45', label: '45 mins' },
                      { value: '60', label: '60 mins (1 hr)' },
                      { value: '90', label: '90 mins (1.5 hrs)' },
                      { value: '120', label: '120 mins (2 hrs)' },
                      { value: '180', label: '180 mins (3 hrs)' },
                      { value: '240', label: '240 mins (4 hrs)' },
                    ]}
                    value={String(durationMinutes)}
                    onChange={val => setDurationMinutes(Number(val) || 90)}
                    placeholder="Select duration..."
                    searchPlaceholder="Type duration in mins..."
                    createLabelPrefix="Set duration (mins):"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Booking Date *
                  </label>
                  <input
                    type="date"
                    value={bookingDate}
                    onChange={e => setBookingDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:outline-none focus:border-amber-500 font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Timeslot (HH:mm) *
                  </label>
                  <input
                    type="time"
                    value={bookingTime}
                    onChange={e => setBookingTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:outline-none focus:border-amber-500 font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Special Notes / Diet Restrictions
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Birthday cake presentation, booth seating preference..."
                  value={specialRequests}
                  onChange={e => setSpecialRequests(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:outline-none focus:border-amber-500 placeholder-zinc-600"
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
                  {submitting ? 'Checking Availability...' : 'Confirm Reservation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
