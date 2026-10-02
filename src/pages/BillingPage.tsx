import React, { useEffect, useState } from 'react';
import { api } from '../services/api.ts';
import { Bill, Order, PaymentMethod } from '../types/index.ts';
import { useToast } from '../context/ToastContext.tsx';
import { ReceiptModal } from '../components/ReceiptModal.tsx';
import {
  Receipt,
  CreditCard,
  Banknote,
  Smartphone,
  Download,
  Printer,
  CheckCircle2,
  Clock,
  Search,
  DollarSign,
  X
} from 'lucide-react';

export const BillingPage: React.FC = () => {
  const { success, error } = useToast();
  const [bills, setBills] = useState<Bill[]>([]);
  const [unpaidOrders, setUnpaidOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // Active View Tab
  const [activeTab, setActiveTab] = useState<'orders' | 'bills'>('orders');

  // Modals
  const [selectedBillForReceipt, setSelectedBillForReceipt] = useState<Bill | null>(null);
  const [payingBill, setPayingBill] = useState<Bill | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('credit_card');
  const [tipAmount, setTipAmount] = useState('0');
  const [cashTendered, setCashTendered] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Search
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [allBills, allOrders] = await Promise.all([
        api.billing.getAll(),
        api.orders.getAll({ status: undefined }),
      ]);
      setBills(allBills);
      setUnpaidOrders(allOrders.filter(o => o.paymentStatus === 'unpaid' && o.status !== 'cancelled'));
    } catch (err: any) {
      error(err.message || 'Failed to load billing records');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateBill = async (order: Order) => {
    try {
      const generated = await api.billing.generate(order.id);
      setBills(prev => [generated, ...prev]);
      setUnpaidOrders(prev => prev.filter(o => o.id !== order.id));
      success(`Invoice ${generated.billNumber} generated! Ready for payment.`);
      setPayingBill(generated);
    } catch (err: any) {
      error(err.message || 'Failed to generate bill');
    }
  };

  const handleProcessPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingBill) return;

    try {
      setSubmittingPayment(true);
      const paid = await api.billing.pay(payingBill.id, paymentMethod, Number(tipAmount));
      setBills(prev => prev.map(b => (b.id === paid.id ? paid : b)));
      success(`Payment settled for ${paid.billNumber} ($${paid.totalAmount.toFixed(2)})`);
      setPayingBill(null);
      setSelectedBillForReceipt(paid);
      loadData();
    } catch (err: any) {
      error(err.message || 'Failed to process payment');
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleExportAllCSV = () => {
    const headers = ['Invoice No', 'Order Ref', 'Table', 'Guest', 'Subtotal', 'Tax', 'Discount', 'Total', 'Payment Method', 'Status', 'Date'];
    const rows = bills.map(b => [
      b.billNumber,
      b.orderNumber,
      b.tableNumber || 'N/A',
      `"${b.customerName || 'Walk-in'}"`,
      b.subtotal.toFixed(2),
      b.taxAmount.toFixed(2),
      b.discountAmount.toFixed(2),
      b.totalAmount.toFixed(2),
      b.paymentMethod || 'PENDING',
      b.paymentStatus,
      new Date(b.createdAt).toLocaleString(),
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map(e => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `restoflow-invoices-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredBills = bills.filter(b => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      b.billNumber.toLowerCase().includes(q) ||
      b.orderNumber.toLowerCase().includes(q) ||
      b.customerName?.toLowerCase().includes(q) ||
      b.tableNumber?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-zinc-800">
        <div>
          <h2 className="text-2xl font-black text-white">Cashier & Invoicing System</h2>
          <p className="text-xs text-zinc-400 mt-1">
            Automated bill settlement, payment processing, thermal receipts, and GST tax invoicing.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportAllCSV}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 font-semibold text-xs hover:bg-zinc-800 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export Invoices CSV
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'orders'
              ? 'bg-amber-500 text-zinc-950 shadow-sm'
              : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white'
          }`}
        >
          <Clock className="w-4 h-4" />
          Pending Checkout Orders ({unpaidOrders.length})
        </button>
        <button
          onClick={() => setActiveTab('bills')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'bills'
              ? 'bg-amber-500 text-zinc-950 shadow-sm'
              : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white'
          }`}
        >
          <Receipt className="w-4 h-4" />
          Completed & Paid Invoices ({bills.filter(b => b.paymentStatus === 'paid').length})
        </button>
      </div>

      {activeTab === 'orders' ? (
        /* Unpaid Orders awaiting billing */
        <div className="space-y-4">
          {loading ? (
            <div className="p-12 text-center text-xs text-zinc-500">Loading pending checkout orders...</div>
          ) : unpaidOrders.length === 0 ? (
            <div className="p-16 text-center text-xs text-zinc-500 bg-zinc-900 rounded-3xl border border-zinc-800">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-60" />
              All dining tables and orders are currently settled and up to date!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {unpaidOrders.map(order => (
                <div
                  key={order.id}
                  className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between pb-3 border-b border-zinc-800">
                      <div>
                        <span className="text-base font-black text-white font-mono">
                          {order.orderNumber}
                        </span>
                        <p className="text-xs font-bold text-amber-400">
                          {order.tableNumber ? `Table ${order.tableNumber}` : 'Takeaway'}
                        </p>
                      </div>

                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        {order.status}
                      </span>
                    </div>

                    <p className="text-xs text-zinc-400 mt-2">
                      Guest: <strong className="text-zinc-200">{order.customerName}</strong>
                    </p>

                    <div className="mt-3 py-2 space-y-1 text-xs border-t border-zinc-800/80">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-zinc-300">
                          <span>{item.quantity}x {item.name}</span>
                          <span className="font-mono text-zinc-400">
                            ${(item.price * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-3 pt-2 border-t border-zinc-800 flex justify-between text-sm font-bold text-white">
                      <span>Total Due:</span>
                      <span className="font-mono text-amber-400">${order.totalAmount.toFixed(2)}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleGenerateBill(order)}
                    className="mt-4 w-full py-2.5 rounded-xl bg-amber-500 text-zinc-950 font-bold text-xs hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/10 flex items-center justify-center gap-2"
                  >
                    <Receipt className="w-4 h-4" />
                    Generate & Settle Bill
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Invoices List */
        <div className="space-y-4">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search invoices by number, table, or guest..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-950/80 border-b border-zinc-800 text-zinc-400 font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3.5 px-6">Invoice</th>
                    <th className="py-3.5 px-4">Order Ref</th>
                    <th className="py-3.5 px-4">Table / Guest</th>
                    <th className="py-3.5 px-4">Total Amount</th>
                    <th className="py-3.5 px-4">Payment Method</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {filteredBills.map(bill => (
                    <tr key={bill.id} className="hover:bg-zinc-850/50 transition-colors">
                      <td className="py-4 px-6 font-mono font-bold text-white">
                        {bill.billNumber}
                        <p className="text-[10px] text-zinc-500 font-normal">
                          {new Date(bill.createdAt).toLocaleDateString()}
                        </p>
                      </td>

                      <td className="py-4 px-4 font-mono text-zinc-400">
                        {bill.orderNumber}
                      </td>

                      <td className="py-4 px-4">
                        <span className="font-semibold text-zinc-200">
                          {bill.tableNumber ? `Table ${bill.tableNumber}` : 'Takeaway'}
                        </span>
                        {bill.customerName && (
                          <p className="text-[11px] text-zinc-500">{bill.customerName}</p>
                        )}
                      </td>

                      <td className="py-4 px-4 font-mono font-bold text-white text-sm">
                        ${bill.totalAmount.toFixed(2)}
                      </td>

                      <td className="py-4 px-4 uppercase text-[11px] font-mono font-bold text-zinc-300">
                        {bill.paymentMethod ? bill.paymentMethod.replace('_', ' ') : 'PENDING'}
                      </td>

                      <td className="py-4 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            bill.paymentStatus === 'paid'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {bill.paymentStatus}
                        </span>
                      </td>

                      <td className="py-4 px-6 text-right space-x-2">
                        {bill.paymentStatus === 'pending' ? (
                          <button
                            onClick={() => setPayingBill(bill)}
                            className="px-3 py-1.5 rounded-xl bg-amber-500 text-zinc-950 font-bold text-xs hover:bg-amber-400"
                          >
                            Pay Bill
                          </button>
                        ) : (
                          <button
                            onClick={() => setSelectedBillForReceipt(bill)}
                            className="px-3 py-1.5 rounded-xl bg-zinc-800 text-zinc-200 font-semibold text-xs hover:bg-zinc-700 inline-flex items-center gap-1.5"
                          >
                            <Printer className="w-3.5 h-3.5 text-amber-400" />
                            Receipt
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Process Payment Modal */}
      {payingBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800 mb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-emerald-400" />
                  Settle Bill {payingBill.billNumber}
                </h3>
                <p className="text-xs text-zinc-400">Total Due: ${payingBill.totalAmount.toFixed(2)}</p>
              </div>
              <button onClick={() => setPayingBill(null)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleProcessPayment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-2">
                  Choose Payment Method
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'credit_card', label: 'Credit Card', icon: CreditCard },
                    { id: 'cash', label: 'Cash Tender', icon: Banknote },
                    { id: 'upi', label: 'UPI / QR', icon: Smartphone },
                    { id: 'debit_card', label: 'Debit Card', icon: CreditCard },
                  ].map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setPaymentMethod(id as PaymentMethod)}
                      className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all ${
                        paymentMethod === id
                          ? 'bg-amber-500/10 border-amber-500 text-amber-400 shadow-sm'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Cash tender calculator if cash */}
              {paymentMethod === 'cash' && (
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Cash Tendered ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder={`e.g. ${Math.ceil(payingBill.totalAmount)}`}
                    value={cashTendered}
                    onChange={e => setCashTendered(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs font-mono"
                  />
                  {Number(cashTendered) > payingBill.totalAmount && (
                    <p className="text-xs text-emerald-400 mt-1 font-mono font-bold">
                      Change Due to Customer: ${(Number(cashTendered) - payingBill.totalAmount).toFixed(2)}
                    </p>
                  )}
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setPayingBill(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPayment}
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 text-zinc-950 font-bold text-xs hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20"
                >
                  {submittingPayment ? 'Processing...' : `Confirm & Settle ($${payingBill.totalAmount.toFixed(2)})`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Thermal Receipt Print Modal */}
      {selectedBillForReceipt && (
        <ReceiptModal
          bill={selectedBillForReceipt}
          onClose={() => setSelectedBillForReceipt(null)}
        />
      )}
    </div>
  );
};
