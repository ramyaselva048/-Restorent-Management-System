import React, { useEffect, useState } from 'react';
import { api } from '../services/api.ts';
import { useToast } from '../context/ToastContext.tsx';
import {
  BarChart3,
  DollarSign,
  ShoppingBag,
  TrendingUp,
  Percent,
  Download,
  CreditCard,
  Banknote,
  Smartphone,
  Clock
} from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const { error } = useToast();
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReports();
  }, [period]);

  const loadReports = async () => {
    try {
      setLoading(true);
      const data = await api.dashboard.getReports(period);
      setReportData(data);
    } catch (err: any) {
      error(err.message || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!reportData) return;

    const summary = [
      ['Metric', 'Value'],
      ['Reporting Period', period.toUpperCase()],
      ['Gross Revenue', `$${reportData.totalRevenue.toFixed(2)}`],
      ['Total Completed Orders', reportData.totalOrders],
      ['Total Table Bookings', reportData.totalBookings],
      ['Average Order Value', `$${reportData.avgOrderValue.toFixed(2)}`],
      ['Total GST Taxes Collected', `$${reportData.totalTax.toFixed(2)}`],
      ['Total Discounts Issued', `$${reportData.totalDiscounts.toFixed(2)}`],
    ];

    const paymentRows = [
      [],
      ['Payment Method', 'Amount ($)'],
      ['Credit Card', reportData.paymentBreakdown?.credit_card || 0],
      ['Cash', reportData.paymentBreakdown?.cash || 0],
      ['UPI / Wallet', reportData.paymentBreakdown?.upi || 0],
    ];

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [...summary.map(e => e.join(',')), ...paymentRows.map(e => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `restoflow-financial-report-${period}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-zinc-800">
        <div>
          <h2 className="text-2xl font-black text-white">Financial Reports & Auditing</h2>
          <p className="text-xs text-zinc-400 mt-1">
            Revenue breakdown, tax compliance records, average ticket metrics, and peak dining velocity.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-xl border border-zinc-800">
            {(['daily', 'weekly', 'monthly'] as const).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                  period === p
                    ? 'bg-amber-500 text-zinc-950 shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 font-semibold text-xs hover:bg-zinc-800 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {loading || !reportData ? (
        <div className="p-12 text-center text-xs text-zinc-500">Generating analytics...</div>
      ) : (
        <div className="space-y-6">
          {/* Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800">
              <span className="text-xs font-semibold text-zinc-400">Total Net Revenue</span>
              <p className="text-2xl font-black text-white font-mono mt-2">
                ${reportData.totalRevenue.toFixed(2)}
              </p>
              <span className="text-[11px] text-emerald-400 mt-1 block">
                All settled and verified invoices
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800">
              <span className="text-xs font-semibold text-zinc-400">Average Ticket Size</span>
              <p className="text-2xl font-black text-white font-mono mt-2">
                ${reportData.avgOrderValue.toFixed(2)}
              </p>
              <span className="text-[11px] text-zinc-400 mt-1 block">
                Across {reportData.totalOrders} total orders
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800">
              <span className="text-xs font-semibold text-zinc-400">GST Taxes Collected</span>
              <p className="text-2xl font-black text-white font-mono mt-2">
                ${reportData.totalTax.toFixed(2)}
              </p>
              <span className="text-[11px] text-sky-400 mt-1 block">
                5% Statutory sales tax
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800">
              <span className="text-xs font-semibold text-zinc-400">Discounts & Promo</span>
              <p className="text-2xl font-black text-white font-mono mt-2">
                ${reportData.totalDiscounts.toFixed(2)}
              </p>
              <span className="text-[11px] text-amber-400 mt-1 block">
                Member loyalty & staff concessions
              </span>
            </div>
          </div>

          {/* Payment Method Breakdown & Peak Dining Hours */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Payment Method Breakdown */}
            <div className="p-6 rounded-3xl bg-zinc-900 border border-zinc-800">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-amber-400" />
                Payment Channels Distribution
              </h3>

              <div className="space-y-4">
                {[
                  { label: 'Credit Card', icon: CreditCard, amount: reportData.paymentBreakdown.credit_card || 0, color: 'bg-amber-500' },
                  { label: 'Cash Tender', icon: Banknote, amount: reportData.paymentBreakdown.cash || 0, color: 'bg-emerald-500' },
                  { label: 'UPI / Digital Wallets', icon: Smartphone, amount: reportData.paymentBreakdown.upi || 0, color: 'bg-sky-500' },
                ].map(({ label, icon: Icon, amount, color }) => {
                  const share = reportData.totalRevenue > 0 ? Math.round((amount / reportData.totalRevenue) * 100) : 0;
                  return (
                    <div key={label} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-2 text-zinc-300 font-medium">
                          <Icon className="w-4 h-4 text-zinc-500" />
                          {label}
                        </span>
                        <span className="font-mono text-white font-bold">
                          ${amount.toFixed(2)} ({share}%)
                        </span>
                      </div>
                      <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                        <div
                          className={`${color} h-full rounded-full transition-all duration-500`}
                          style={{ width: `${share}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Peak Dining Hours */}
            <div className="p-6 rounded-3xl bg-zinc-900 border border-zinc-800">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                Dining Rush Velocity by Hour
              </h3>

              <div className="h-48 flex items-end justify-between gap-2 pt-4 px-2">
                {Object.entries(reportData.hourlyOrders as Record<string, number>).map(([hour, count]) => {
                  const maxOrders = Math.max(...Object.values(reportData.hourlyOrders as Record<string, number>));
                  const heightPercent = Math.max(10, Math.round((count / maxOrders) * 100));

                  return (
                    <div key={hour} className="flex-1 flex flex-col items-center gap-2 group">
                      <div className="text-[9px] font-mono text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        {count}
                      </div>
                      <div className="w-full bg-zinc-800 rounded-t-lg relative overflow-hidden flex items-end h-32">
                        <div
                          style={{ height: `${heightPercent}%` }}
                          className="w-full bg-gradient-to-t from-amber-600 to-amber-400 rounded-t-sm group-hover:brightness-125 transition-all"
                        />
                      </div>
                      <span className="text-[10px] font-mono text-zinc-500">{hour.split(':')[0]}h</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
