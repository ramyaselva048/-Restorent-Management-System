import React, { useState } from 'react';
import { Bill } from '../types/index.ts';
import { Printer, Download, X, CheckCircle2, FileText } from 'lucide-react';

interface ReceiptModalProps {
  bill: Bill;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ bill, onClose }) => {
  const [printing, setPrinting] = useState(false);

  const getReceiptHtml = () => {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Receipt - ${bill.billNumber}</title>
          <style>
            @page {
              size: 80mm auto;
              margin: 4mm;
            }
            @media print {
              body { margin: 0; padding: 0; }
            }
            body {
              font-family: 'Courier New', Courier, monospace;
              font-size: 12px;
              line-height: 1.35;
              color: #000;
              background: #fff;
              margin: 0;
              padding: 8px;
              width: 74mm;
            }
            .text-center { text-align: center; }
            .font-bold { font-weight: bold; }
            .divider { border-top: 1px dashed #444; margin: 8px 0; }
            .double-divider { border-top: 2px dashed #000; margin: 8px 0; }
            .row { display: flex; justify-content: space-between; margin-bottom: 3px; font-size: 11px; }
            .item-row { display: flex; justify-content: space-between; margin: 4px 0; font-size: 11px; }
            .desc { width: 50%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
            .qty { width: 14%; text-align: center; }
            .price { width: 18%; text-align: right; }
            .amt { width: 18%; text-align: right; font-weight: bold; }
            .total-row { font-size: 14px; font-weight: 900; margin-top: 6px; }
            .barcode { letter-spacing: 4px; font-size: 14px; margin: 10px 0 4px; }
          </style>
        </head>
        <body>
          <div class="text-center">
            <h2 style="margin: 0; font-size: 16px; font-weight: 900;">RESTOFLOW GOURMET</h2>
            <div style="font-size: 10px; color: #333; margin-top: 2px;">742 Evergreen Terrace, Springfield</div>
            <div style="font-size: 9px; color: #444;">GST Reg: 29AABCU9603R1ZM | Tel: (555) 019-2831</div>
            <div style="font-size: 11px; font-weight: bold; margin-top: 6px;">TAX INVOICE / CASH MEMO</div>
          </div>

          <div class="divider"></div>

          <div class="row"><span>Invoice:</span><span class="font-bold">${bill.billNumber}</span></div>
          <div class="row"><span>Order Ref:</span><span>${bill.orderNumber}</span></div>
          <div class="row"><span>Date/Time:</span><span>${new Date(bill.createdAt).toLocaleString()}</span></div>
          <div class="row"><span>Table:</span><span class="font-bold">${bill.tableNumber || 'Takeaway'}</span></div>
          ${bill.customerName ? `<div class="row"><span>Guest:</span><span>${bill.customerName}</span></div>` : ''}
          <div class="row"><span>Cashier:</span><span>${bill.cashierName || 'Staff'}</span></div>

          <div class="divider"></div>

          <div class="item-row font-bold" style="border-bottom: 1px solid #000; padding-bottom: 2px;">
            <span class="desc">Item Description</span>
            <span class="qty">Qty</span>
            <span class="price">Price</span>
            <span class="amt">Amt</span>
          </div>

          ${bill.items.map(i => `
            <div class="item-row">
              <span class="desc">${i.name}</span>
              <span class="qty">${i.quantity}</span>
              <span class="price">$${i.price.toFixed(2)}</span>
              <span class="amt">$${(i.quantity * i.price).toFixed(2)}</span>
            </div>
          `).join('')}

          <div class="double-divider"></div>

          <div class="row"><span>Subtotal:</span><span>$${bill.subtotal.toFixed(2)}</span></div>
          ${bill.discountAmount > 0 ? `<div class="row"><span>Discount (${bill.discountReason || 'Promo'}):</span><span>-$${bill.discountAmount.toFixed(2)}</span></div>` : ''}
          <div class="row"><span>CGST / SGST (5%):</span><span>$${bill.taxAmount.toFixed(2)}</span></div>
          ${bill.serviceCharge > 0 ? `<div class="row"><span>Service Charge (10%):</span><span>$${bill.serviceCharge.toFixed(2)}</span></div>` : ''}
          
          <div class="divider"></div>
          <div class="row total-row">
            <span>TOTAL DUE:</span>
            <span>$${bill.totalAmount.toFixed(2)}</span>
          </div>
          <div class="row" style="margin-top: 4px; font-size: 10px;">
            <span>Payment Method:</span>
            <span class="font-bold" style="text-transform: uppercase;">${bill.paymentMethod ? bill.paymentMethod.replace('_', ' ') : 'PAID'}</span>
          </div>

          <div class="divider"></div>
          <div class="text-center" style="font-size: 10px; margin-top: 10px;">
            <div class="font-bold">Thank you for dining with RestoFlow!</div>
            <div style="font-size: 9px; margin-top: 2px;">Please visit again | Wi-Fi: RestoFlowGuest (PW: welcome2026)</div>
            <div class="barcode">||| | ||||| || |||||| | |||| ||</div>
          </div>
        </body>
      </html>
    `;
  };

  const handlePrint = () => {
    setPrinting(true);

    try {
      // Create hidden iframe for isolated clean printer dialog
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(getReceiptHtml());
        doc.close();

        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } catch {
            window.print();
          } finally {
            setTimeout(() => {
              if (document.body.contains(iframe)) {
                document.body.removeChild(iframe);
              }
              setPrinting(false);
            }, 1500);
          }
        }, 300);
      } else {
        window.print();
        setPrinting(false);
      }
    } catch {
      window.print();
      setPrinting(false);
    }
  };

  const handleDownloadHTMLReceipt = () => {
    const html = getReceiptHtml();
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Invoice-${bill.billNumber}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadCSV = () => {
    const headers = ['Item', 'Quantity', 'Unit Price', 'Total'];
    const rows = bill.items.map(i => [
      `"${i.name}"`,
      i.quantity,
      i.price.toFixed(2),
      (i.quantity * i.price).toFixed(2),
    ]);

    rows.push(['Subtotal', '', '', bill.subtotal.toFixed(2)]);
    rows.push(['Discount', '', '', `-${bill.discountAmount.toFixed(2)}`]);
    rows.push(['Tax (5%)', '', '', bill.taxAmount.toFixed(2)]);
    rows.push(['Service Charge (10%)', '', '', bill.serviceCharge.toFixed(2)]);
    rows.push(['GRAND TOTAL', '', '', bill.totalAmount.toFixed(2)]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [`Invoice Number: ${bill.billNumber}`, `Date: ${new Date(bill.createdAt).toLocaleString()}`, `Table: ${bill.tableNumber || 'N/A'}`].join('\n') +
      '\n\n' +
      [headers.join(','), ...rows.map(e => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${bill.billNumber}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header Controls */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">Bill & Tax Invoice</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Thermal Receipt Body */}
        <div
          id="printable-receipt"
          className="p-6 overflow-y-auto flex-1 bg-white text-zinc-950 font-mono text-xs select-text"
        >
          <div className="text-center pb-4 border-b-2 border-dashed border-zinc-300">
            <h2 className="text-base font-black tracking-tight">RESTOFLOW GOURMET</h2>
            <p className="text-[11px] text-zinc-600">742 Evergreen Terrace, Springfield</p>
            <p className="text-[10px] text-zinc-500">GST Reg: 29AABCU9603R1ZM | Tel: (555) 019-2831</p>
            <p className="text-[11px] font-bold mt-2 text-zinc-800">TAX INVOICE / CASH MEMO</p>
          </div>

          <div className="py-3 border-b border-dashed border-zinc-300 space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span className="text-zinc-500">Invoice:</span>
              <span className="font-bold">{bill.billNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Order Ref:</span>
              <span>{bill.orderNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Date/Time:</span>
              <span>{new Date(bill.createdAt).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Table:</span>
              <span className="font-bold">{bill.tableNumber || 'Takeaway'}</span>
            </div>
            {bill.customerName && (
              <div className="flex justify-between">
                <span className="text-zinc-500">Guest:</span>
                <span>{bill.customerName}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-zinc-500">Cashier:</span>
              <span>{bill.cashierName || 'Staff'}</span>
            </div>
          </div>

          {/* Line Items */}
          <div className="py-3 border-b-2 border-dashed border-zinc-300">
            <div className="flex justify-between font-bold pb-1 text-[11px] border-b border-zinc-200">
              <span className="w-1/2">Item Description</span>
              <span className="w-1/6 text-center">Qty</span>
              <span className="w-1/6 text-right">Price</span>
              <span className="w-1/6 text-right">Amt</span>
            </div>
            <div className="py-2 space-y-1.5">
              {bill.items.map((item, idx) => (
                <div key={idx} className="flex justify-between text-[11px]">
                  <span className="w-1/2 truncate font-medium">{item.name}</span>
                  <span className="w-1/6 text-center">{item.quantity}</span>
                  <span className="w-1/6 text-right">${item.price.toFixed(2)}</span>
                  <span className="w-1/6 text-right font-semibold">
                    ${(item.quantity * item.price).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="py-3 border-b-2 border-dashed border-zinc-300 space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span className="text-zinc-600">Subtotal</span>
              <span>${bill.subtotal.toFixed(2)}</span>
            </div>
            {bill.discountAmount > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Discount ({bill.discountReason || 'Promo'})</span>
                <span>-${bill.discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-zinc-600">
              <span>CGST / SGST (5%)</span>
              <span>${bill.taxAmount.toFixed(2)}</span>
            </div>
            {bill.serviceCharge > 0 && (
              <div className="flex justify-between text-zinc-600">
                <span>Service Charge (10%)</span>
                <span>${bill.serviceCharge.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-black pt-1 border-t border-zinc-300 text-zinc-950">
              <span>TOTAL DUE</span>
              <span>${bill.totalAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[10px] text-zinc-600 pt-1">
              <span>Paid via:</span>
              <span className="font-bold uppercase tracking-wider">
                {bill.paymentMethod ? bill.paymentMethod.replace('_', ' ') : 'PAID'}
              </span>
            </div>
          </div>

          {/* Footer Note */}
          <div className="text-center pt-4 space-y-1 text-[10px] text-zinc-500">
            <p className="font-bold text-zinc-700">Thank you for dining with RestoFlow!</p>
            <p>Please visit again | Wi-Fi: RestoFlowGuest (PW: welcome2026)</p>
            <div className="py-2 flex justify-center tracking-widest text-zinc-400 text-xs font-mono">
              ||| | ||||| || |||||| | |||| ||
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 bg-zinc-950 border-t border-zinc-800 flex flex-col sm:flex-row items-center gap-2.5">
          <button
            onClick={handlePrint}
            disabled={printing}
            className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-amber-500 text-zinc-950 font-bold text-xs flex items-center justify-center gap-2 hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/20 active:scale-95"
          >
            <Printer className="w-4 h-4" />
            {printing ? 'Opening Printer Dialog...' : 'Print Receipt (Laptop / POS)'}
          </button>
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleDownloadHTMLReceipt}
              className="flex-1 sm:flex-initial py-2.5 px-3 rounded-xl bg-zinc-800 text-zinc-200 font-semibold text-xs flex items-center justify-center gap-1.5 hover:bg-zinc-700 transition-colors"
              title="Save printable Invoice file"
            >
              <FileText className="w-4 h-4 text-amber-400" />
              Save File
            </button>
            <button
              onClick={handleDownloadCSV}
              className="flex-1 sm:flex-initial py-2.5 px-3 rounded-xl bg-zinc-800 text-zinc-200 font-semibold text-xs flex items-center justify-center gap-1.5 hover:bg-zinc-700 transition-colors"
              title="Export CSV"
            >
              <Download className="w-4 h-4" />
              CSV
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
