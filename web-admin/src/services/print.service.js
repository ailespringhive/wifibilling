/**
 * Print Service — generates print-ready windows for billing records
 */

/**
 * Print billing records in the specified format
 * @param {Array} billings - array of billing objects to print
 * @param {string} format - 'dot', 'a4', 'thermal', 'all', 'small'
 */
export function printBillings(billings, format) {
  if (!billings || billings.length === 0) return;

  const printWindow = window.open('', '_blank', 'width=900,height=700');
  if (!printWindow) {
    alert('Please allow pop-ups to print.');
    return;
  }

  let content = '';
  switch (format) {
    case 'dot':
      content = generateDotMatrix(billings);
      break;
    case 'a4':
      content = generateA4(billings);
      break;
    case 'thermal':
      content = generateThermal(billings);
      break;
    case 'small':
      content = generateSmall(billings);
      break;
    case 'all':
    default:
      content = generateA4(billings);
      break;
  }

  printWindow.document.write(content);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => printWindow.print(), 400);
}

function formatCurrency(amount) {
  return '₱' + Number(amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 });
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function statusLabel(s) {
  const map = { already_paid: 'PAID', not_yet_paid: 'UNPAID', payment_confirmation: 'PENDING' };
  return map[s] || s || '—';
}

// ===================== A4 FORMAT =====================
function generateA4(billings) {
  const rows = billings.map(b => `
    <tr>
      <td>${b.customerName || b.customerId || '—'}</td>
      <td>${b.billingMonth || '—'}</td>
      <td style="text-align:right;">${formatCurrency(b.amount)}</td>
      <td style="text-align:center;">${statusLabel(b.paymentStatus)}</td>
      <td>${formatDate(b.dueDate)}</td>
      <td>${b.paidDate ? formatDate(b.paidDate) : '—'}</td>
    </tr>
  `).join('');

  const total = billings.reduce((s, b) => s + Number(b.amount || 0), 0);

  return `<!DOCTYPE html><html><head><title>WiFi Billing — A4 Print</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, sans-serif; padding: 30px; color: #1a1a1a; }
  .header { text-align: center; margin-bottom: 24px; border-bottom: 2px solid #333; padding-bottom: 16px; }
  .header h1 { font-size: 20px; margin-bottom: 4px; }
  .header p { font-size: 12px; color: #666; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; }
  th { background: #f0f0f0; padding: 8px 10px; text-align: left; font-size: 11px; text-transform: uppercase; border-bottom: 2px solid #333; }
  td { padding: 8px 10px; font-size: 12px; border-bottom: 1px solid #ddd; }
  .total-row { border-top: 2px solid #333; font-weight: bold; }
  .total-row td { padding-top: 12px; }
  .footer { margin-top: 24px; text-align: center; font-size: 10px; color: #999; }
  @media print { body { padding: 15px; } }
</style></head><body>
  <div class="header">
    <h1>WiFi Billing Statement</h1>
    <p>Generated: ${new Date().toLocaleString()} &nbsp;|&nbsp; Records: ${billings.length}</p>
  </div>
  <table>
    <thead><tr>
      <th>Customer</th><th>Month</th><th style="text-align:right;">Amount</th>
      <th style="text-align:center;">Status</th><th>Due Date</th><th>Paid Date</th>
    </tr></thead>
    <tbody>${rows}
      <tr class="total-row">
        <td colspan="2">TOTAL</td>
        <td style="text-align:right;">${formatCurrency(total)}</td>
        <td colspan="3"></td>
      </tr>
    </tbody>
  </table>
  <div class="footer">WiFi Billing Admin System</div>
</body></html>`;
}

// ===================== DOT MATRIX FORMAT =====================
function generateDotMatrix(billings) {
  const lines = billings.map(b =>
    `${(b.customerName || '—').padEnd(20)} ${(b.billingMonth || '—').padEnd(10)} ${formatCurrency(b.amount).padStart(12)} ${statusLabel(b.paymentStatus).padEnd(10)} ${formatDate(b.dueDate)}`
  ).join('\n');

  const total = billings.reduce((s, b) => s + Number(b.amount || 0), 0);

  return `<!DOCTYPE html><html><head><title>WiFi Billing — Dot Matrix</title>
<style>
  * { margin:0; padding:0; }
  body { font-family: 'Courier New', monospace; padding: 20px; font-size: 12px; }
  pre { white-space: pre-wrap; line-height: 1.6; }
  @media print { body { padding: 10px; } }
</style></head><body><pre>
================================================================
                     WIFI BILLING STATEMENT
                  ${new Date().toLocaleDateString()}
================================================================

${'CUSTOMER'.padEnd(20)} ${'MONTH'.padEnd(10)} ${'AMOUNT'.padStart(12)} ${'STATUS'.padEnd(10)} DUE DATE
${''.padEnd(70, '-')}
${lines}
${''.padEnd(70, '-')}
${'TOTAL'.padEnd(20)} ${''.padEnd(10)} ${formatCurrency(total).padStart(12)}
================================================================
Records: ${billings.length}
================================================================
</pre></body></html>`;
}

// ===================== THERMAL FORMAT =====================
function generateThermal(billings) {
  const items = billings.map(b => `
    <div class="item">
      <div class="item-name">${b.customerName || '—'}</div>
      <div class="item-detail">${b.billingMonth || '—'} | ${statusLabel(b.paymentStatus)}</div>
      <div class="item-amount">${formatCurrency(b.amount)}</div>
    </div>
  `).join('');

  const total = billings.reduce((s, b) => s + Number(b.amount || 0), 0);

  return `<!DOCTYPE html><html><head><title>WiFi Billing — Thermal</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: 'Courier New', monospace; width: 280px; margin: 0 auto; padding: 10px; font-size: 11px; }
  .center { text-align: center; }
  .line { border-bottom: 1px dashed #000; margin: 8px 0; }
  .title { font-size: 14px; font-weight: bold; }
  .item { margin: 6px 0; }
  .item-name { font-weight: bold; }
  .item-detail { font-size: 10px; color: #555; }
  .item-amount { text-align: right; font-weight: bold; }
  .total { display: flex; justify-content: space-between; font-weight: bold; font-size: 13px; margin-top: 4px; }
  .footer { font-size: 9px; color: #888; margin-top: 8px; }
  @media print { body { width: 72mm; padding: 5px; } }
</style></head><body>
  <div class="center title">WIFI BILLING</div>
  <div class="center" style="font-size:10px;">${new Date().toLocaleString()}</div>
  <div class="line"></div>
  ${items}
  <div class="line"></div>
  <div class="total"><span>TOTAL</span><span>${formatCurrency(total)}</span></div>
  <div class="center" style="font-size:10px; margin-top:4px;">Records: ${billings.length}</div>
  <div class="line"></div>
  <div class="center footer">Thank you!</div>
</body></html>`;
}

// ===================== SMALL FORMAT =====================
function generateSmall(billings) {
  const items = billings.map(b => `
    <tr>
      <td>${b.customerName || '—'}</td>
      <td style="text-align:right;">${formatCurrency(b.amount)}</td>
      <td style="text-align:center;">${statusLabel(b.paymentStatus)}</td>
    </tr>
  `).join('');

  const total = billings.reduce((s, b) => s + Number(b.amount || 0), 0);

  return `<!DOCTYPE html><html><head><title>WiFi Billing — Small Print</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, sans-serif; width: 400px; margin: 0 auto; padding: 15px; font-size: 11px; }
  h2 { font-size: 14px; text-align:center; margin-bottom:8px; }
  .date { text-align:center; font-size:10px; color:#888; margin-bottom:10px; }
  table { width:100%; border-collapse:collapse; }
  th { font-size:9px; text-transform:uppercase; border-bottom:1px solid #333; padding:4px 6px; text-align:left; }
  td { padding:4px 6px; font-size:11px; border-bottom:1px solid #eee; }
  .total { font-weight:bold; border-top:2px solid #333; }
  @media print { body { width:100%; padding:10px; } }
</style></head><body>
  <h2>WiFi Billing</h2>
  <div class="date">${new Date().toLocaleString()}</div>
  <table>
    <thead><tr><th>Customer</th><th style="text-align:right;">Amount</th><th style="text-align:center;">Status</th></tr></thead>
    <tbody>${items}
      <tr class="total"><td>TOTAL (${billings.length})</td><td style="text-align:right;">${formatCurrency(total)}</td><td></td></tr>
    </tbody>
  </table>
</body></html>`;
}
