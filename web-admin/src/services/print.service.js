export function printBillings(billings) {
  if (!billings || billings.length === 0) return;

  const pages = billings.map(b => buildReceiptHtml(b)).join('');

  const content = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Receipt</title>
<style>
  @page { margin: 0; size: 58mm auto; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Courier New', monospace; width: 58mm; margin: 0 auto; padding: 4mm; font-size: 9px; color: #000; }
  .center { text-align: center; }
  .bold { font-weight: bold; }
  .title { font-size: 14px; font-weight: bold; }
  .subtitle { font-size: 8px; color: #666; }
  .divider { border-top: 1px dashed #aaa; margin: 6px 0; }
  .row { display: flex; justify-content: space-between; margin: 2px 0; }
  .row .label { color: #666; }
  .row .value { font-weight: bold; text-align: right; flex: 1; margin-left: 8px; }
  .amount { font-size: 18px; font-weight: bold; text-align: center; margin: 6px 0; }
  .amount-label { font-size: 8px; color: #666; text-align: center; letter-spacing: 1.5px; }
  .footer { font-size: 8px; color: #666; text-align: center; margin-top: 8px; }
  .receipt-page { page-break-after: always; margin-bottom: 24px; position: relative; overflow: hidden; }
  .receipt-page:last-child { page-break-after: auto; margin-bottom: 0; }
  .paid-stamp-overlay { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-22deg); z-index: 10; pointer-events: none; opacity: 0.18; }
  .paid-stamp-img { width: 160px; height: auto; }
</style>
</head>
<body>
  ${pages}
</body>
</html>`;

  // Use hidden iframe to avoid popup blocker issues
  let printFrame = document.getElementById('print-frame');
  if (printFrame) printFrame.remove();

  printFrame = document.createElement('iframe');
  printFrame.id = 'print-frame';
  printFrame.style.cssText = 'position:fixed;top:-10000px;left:-10000px;width:300px;height:700px;border:none;';
  document.body.appendChild(printFrame);

  const frameDoc = printFrame.contentDocument || printFrame.contentWindow.document;
  frameDoc.open();
  frameDoc.write(content);
  frameDoc.close();

  setTimeout(() => {
    printFrame.contentWindow.focus();
    printFrame.contentWindow.print();
  }, 500);
}

function formatCurrency(amount) {
  return '₱' + Number(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-US', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(',', '');
}

function generateInvoiceNo(billing) {
  const id = billing.$id || billing.id || '';
  const date = billing.dueDate ? new Date(billing.dueDate) : new Date();
  const y = date.getFullYear().toString().slice(-2);
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const suffix = id.replace(/[^0-9]/g, '').slice(-4) || '0001';
  return `RCP-${y}${m}${d}-${suffix.padStart(4, '0')}`;
}

function billingPeriodLabel(month) {
  if (!month) return '—';
  if (month.includes(' ') && !month.includes('-')) return month;
  const parts = month.split('-');
  if (parts.length < 2) return month;
  const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function buildReceiptHtml(b) {
  const invoiceNo = generateInvoiceNo(b);
  const receiptDate = b.paidDate && b.amountPaid > 0 ? formatDate(b.paidDate) : formatDate(new Date());
  const period = billingPeriodLabel(b.billingMonth);
  const planRate = b.amount || 0;
  
  const isPaid = b.paymentStatus === 'already_paid' || (b.amountPaid && b.amountPaid > 0);
  const amountPaid = b.amountPaid ? parseFloat(b.amountPaid) : (isPaid ? planRate : 0);
  const status = isPaid ? 'PAID' : (b.paymentStatus === 'overdue' ? 'OVERDUE' : 'NOT PAID');

  let collectedByHtml = '';
  if (b.collectedBy) {
    collectedByHtml = `<div class="row"><span class="label">Collected By</span><span class="value">${b.collectedBy}</span></div>`;
  }
  
  const customerName = b.customerName || b.customerId || '—';

  // Paid stamp overlay (only shown when status is PAID)
  const paidStampHtml = isPaid ? `<div class="paid-stamp-overlay"><img src="/paid-stamp.png" alt="PAID" class="paid-stamp-img" /></div>` : '';

  return `
  <div class="receipt-page" style="position:relative;overflow:hidden;">
    ${paidStampHtml}
    <div class="center">
      <div class="title">WiFi Billing</div>
      <div class="subtitle">Internet Service Provider</div>
    </div>
    <div class="divider"></div>
    <div class="row"><span class="label">Receipt #</span><span class="value">${invoiceNo}</span></div>
    <div class="row"><span class="label">Date</span><span class="value">${receiptDate}</span></div>
    <div class="divider"></div>
    <div class="row"><span class="label">Customer</span><span class="value">${customerName}</span></div>
    <div class="row"><span class="label">Account No.</span><span class="value">${b.customerId || '—'}</span></div>
    <div class="divider"></div>
    <div class="row"><span class="label">Period</span><span class="value">${period}</span></div>
    <div class="row"><span class="label">Plan Rate</span><span class="value">${formatCurrency(planRate)}</span></div>
    <div class="divider"></div>
    <div class="amount-label">AMOUNT PAID</div>
    <div class="amount">${formatCurrency(amountPaid)}</div>
    <div class="divider"></div>
    <div class="row"><span class="label">Status</span><span class="value">${status}</span></div>
    ${collectedByHtml}
    <div class="divider"></div>
    <div class="footer">
      <div class="bold">Thank you for your payment!</div>
      <div>Keep this receipt for your records.</div>
    </div>
  </div>`;
}

export function getReceiptPreviewHtml(billing) {
  const content = buildReceiptHtml(billing);
  return `
    <style>
      .receipt-preview-wrapper { 
         font-family: 'Courier New', monospace; 
         width: 100%; max-width: 320px; margin: 0 auto; 
         background: #fff; color: #000; 
         padding: 24px 20px; font-size: 11px;
         border-radius: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.1);
      }
      .receipt-preview-wrapper .center { text-align: center; }
      .receipt-preview-wrapper .bold { font-weight: bold; }
      .receipt-preview-wrapper .title { font-size: 16px; font-weight: bold; }
      .receipt-preview-wrapper .subtitle { font-size: 10px; color: #666; }
      .receipt-preview-wrapper .divider { border-top: 1px dashed #aaa; margin: 8px 0; }
      .receipt-preview-wrapper .row { display: flex; justify-content: space-between; margin: 4px 0; }
      .receipt-preview-wrapper .row .label { color: #666; }
      .receipt-preview-wrapper .row .value { font-weight: bold; text-align: right; flex: 1; margin-left: 8px; word-break: break-all; }
      .receipt-preview-wrapper .amount { font-size: 24px; font-weight: bold; text-align: center; margin: 10px 0; }
      .receipt-preview-wrapper .amount-label { font-size: 10px; color: #666; text-align: center; letter-spacing: 1.5px; }
      .receipt-preview-wrapper .footer { font-size: 10px; color: #666; text-align: center; margin-top: 12px; }
      .receipt-preview-wrapper .receipt-page { border: none !important; margin: 0 !important; padding: 0 !important; box-shadow: none !important; page-break-after: unset; position: relative; overflow: hidden; }
      .receipt-preview-wrapper .paid-stamp-overlay { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-22deg); z-index: 10; pointer-events: none; opacity: 0.18; }
      .receipt-preview-wrapper .paid-stamp-img { width: 200px; height: auto; }
    </style>
    <div class="receipt-preview-wrapper">
      ${content}
    </div>
  `;
}
