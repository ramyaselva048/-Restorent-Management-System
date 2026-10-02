import React, { useEffect, useState } from 'react';
import { api } from '../services/api.ts';
import { AuditLog } from '../types/index.ts';
import { useToast } from '../context/ToastContext.tsx';
import {
  ClipboardList,
  Search,
  Download,
  Shield,
  Activity,
  User,
  Clock
} from 'lucide-react';

export const AuditLogsPage: React.FC = () => {
  const { error } = useToast();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [moduleFilter, setModuleFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadLogs();
  }, [moduleFilter]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const data = await api.auditLogs.getAll({
        module: moduleFilter === 'all' ? undefined : moduleFilter,
      });
      setLogs(data);
    } catch (err: any) {
      error(err.message || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    const headers = ['Timestamp', 'User', 'Role', 'Module', 'Action', 'Details', 'IP Address'];
    const rows = logs.map(l => [
      new Date(l.timestamp).toLocaleString(),
      `"${l.userName}"`,
      l.userRole,
      l.module,
      l.action,
      `"${l.details.replace(/"/g, '""')}"`,
      l.ipAddress || '127.0.0.1',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map(e => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `audit-trail-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredLogs = logs.filter(l => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      l.userName.toLowerCase().includes(q) ||
      l.action.toLowerCase().includes(q) ||
      l.details.toLowerCase().includes(q) ||
      l.module.toLowerCase().includes(q)
    );
  });

  const modules = ['all', 'Authentication', 'Orders', 'Billing', 'Tables', 'Bookings', 'Menu', 'Users', 'System'];

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-zinc-800">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-2.5">
            <ClipboardList className="w-6 h-6 text-amber-500" />
            System Audit Trail & Security Logs
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Immutable tracking of financial actions, price adjustments, cancellations, and staff activities.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 font-semibold text-xs hover:bg-zinc-800 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          Export Audit Trail CSV
        </button>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search actions, staff, or details..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1">
          {modules.map(mod => (
            <button
              key={mod}
              onClick={() => setModuleFilter(mod)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap capitalize transition-all ${
                moduleFilter === mod
                  ? 'bg-amber-500 text-zinc-950 font-bold shadow-sm'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
              }`}
            >
              {mod}
            </button>
          ))}
        </div>
      </div>

      {/* Log Feed Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-xs text-zinc-500">Loading audit trail...</div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-xs text-zinc-500">No logs match the criteria.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-950/80 border-b border-zinc-800 text-zinc-400 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3.5 px-6">Timestamp</th>
                  <th className="py-3.5 px-4">Staff Member</th>
                  <th className="py-3.5 px-4">Module</th>
                  <th className="py-3.5 px-4">Action</th>
                  <th className="py-3.5 px-6">Event Details</th>
                  <th className="py-3.5 px-4">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-mono text-[11px]">
                {filteredLogs.map(l => (
                  <tr key={l.id} className="hover:bg-zinc-850/50 transition-colors">
                    <td className="py-3.5 px-6 text-zinc-400">
                      {new Date(l.timestamp).toLocaleString()}
                    </td>

                    <td className="py-3.5 px-4 font-sans">
                      <span className="font-bold text-white block">{l.userName}</span>
                      <span className="text-[10px] text-amber-400 uppercase font-mono font-semibold">
                        {l.userRole}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-sans font-semibold text-zinc-300">
                      {l.module}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 text-[10px] font-bold">
                        {l.action}
                      </span>
                    </td>

                    <td className="py-3.5 px-6 font-sans text-zinc-300">
                      {l.details}
                    </td>

                    <td className="py-3.5 px-4 text-zinc-500">
                      {l.ipAddress || '127.0.0.1'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
