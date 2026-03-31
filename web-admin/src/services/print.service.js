/**
 * Print Service — generates print-ready invoice layouts for billing records
 * Layout: consistent two-column design across all formats (A4, Dot Matrix, Thermal, Small)
 */

/**
 * Print billing records in the specified format
 * @param {Array} billings - array of billing objects to print
 * @param {string} format - 'dot', 'a4', 'thermal', 'all', 'small'
 */
export function printBillings(billings, format) {
  if (!billings || billings.length === 0) return;

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

  // Use hidden iframe to avoid popup blocker issues
  let printFrame = document.getElementById('print-frame');
  if (printFrame) printFrame.remove();

  printFrame = document.createElement('iframe');
  printFrame.id = 'print-frame';
  printFrame.style.cssText = 'position:fixed;top:-10000px;left:-10000px;width:900px;height:700px;border:none;';
  document.body.appendChild(printFrame);

  const frameDoc = printFrame.contentDocument || printFrame.contentWindow.document;
  frameDoc.open();
  frameDoc.write(content);
  frameDoc.close();

  // Wait a moment for styles to paint before printing
  setTimeout(() => {
    printFrame.contentWindow.focus();
    printFrame.contentWindow.print();
    // Do NOT automatically remove the printFrame here. 
    // modern browsers block the JS thread or close the dialog if the iframe is removed.
  }, 500);
}

function formatCurrency(amount) {
  return '₱' + Number(amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 });
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function statusLabel(s) {
  const map = { already_paid: 'Paid', not_yet_paid: 'Not yet paid', payment_confirmation: 'Pending' };
  return map[s] || s || '—';
}

function statusColor(s) {
  const map = { already_paid: '#16a34a', not_yet_paid: '#dc2626', payment_confirmation: '#d97706' };
  return map[s] || '#333';
}

function generateInvoiceNo(billing) {
  const id = billing.$id || billing.id || '';
  const date = billing.dueDate ? new Date(billing.dueDate) : new Date();
  const y = date.getFullYear().toString().slice(-2);
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const suffix = id.replace(/[^0-9]/g, '').slice(-4) || '0001';
  return `INV-${y}${m}${d}-${suffix}`;
}

function billingPeriodLabel(month) {
  if (!month) return '—';
  const [y, m] = month.split('-');
  const date = new Date(y, parseInt(m) - 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

// ===================== SHARED STYLES =====================
const invoiceBaseStyles = `
  /* Fix 1: strictly remove browser-injected header/footer (date, title, URL) */
  @page { 
    margin: 0mm !important; 
    size: auto; 
  }

  * { margin:0; padding:0; box-sizing:border-box; }
  body { 
    font-family: 'Segoe UI', Arial, sans-serif; 
    color: #1a1a2e; 
    margin: 0; 
    padding: 0; 
    background: white;
  }
  
  .invoice-page { 
    width: 100%; max-width: 820px; margin: 0 auto; padding: 28px 32px; 
    page-break-after: always; 
  }
  .invoice-page:last-child { page-break-after: auto; }

  /* ---- Two-column master layout ---- */
  .inv-master { display: flex; gap: 0; }
  .inv-left { width: 35%; padding-right: 24px; border-right: 2px solid #3b82f6; }
  .inv-right { width: 65%; padding-left: 24px; }

  /* Left column — company & summary */
  .inv-company { text-align: center; margin-bottom: 20px; }
  .inv-company h2 { font-size: 18px; font-weight: 800; color: #1a1a2e; margin-bottom: 2px; }
  .inv-company p { font-size: 11px; color: #475569; line-height: 1.5; }

  .inv-summary-block { margin-bottom: 12px; }
  .inv-field { display: flex; justify-content: space-between; padding: 5px 0; font-size: 12px; border-bottom: 1px dotted #e2e8f0; }
  .inv-field:last-child { border-bottom: none; }
  .inv-field-label { color: #475569; font-weight: 600; }
  .inv-field-value { color: #1a1a2e; font-weight: 700; text-align: right; }
  .inv-status { font-weight: 800; }

  .inv-bill-total { text-align: center; margin-top: 16px; padding: 12px; background: #f1f5f9; border-radius: 6px; }
  .inv-bill-total .label { font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
  .inv-bill-total .amount { font-size: 22px; font-weight: 800; color: #1a1a2e; margin-top: 2px; }

  /* Right column — header & tables */
  .inv-right-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid #3b82f6; }
  .inv-wifi-icon { width: 48px; height: 48px; background: #3b82f6; border-radius: 8px; display: flex; align-items: center; justify-content: center; }
  .inv-wifi-icon svg { width: 28px; height: 28px; fill: white; }
  .inv-right-brand h3 { font-size: 16px; font-weight: 800; color: #1a1a2e; }
  .inv-right-brand p { font-size: 10px; color: #64748b; line-height: 1.4; }

  /* Tables */
  .inv-table { width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 12px; }
  .inv-table th { background: #f1f5f9; padding: 7px 10px; text-align: left; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #475569; border-bottom: 2px solid #cbd5e1; }
  .inv-table td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; }
  .inv-table th:last-child, .inv-table td:last-child { text-align: right; }

  /* Totals */
  .inv-totals-table { width: 100%; border-collapse: collapse; }
  .inv-totals-table td { padding: 5px 10px; font-size: 12px; }
  .inv-totals-table td:first-child { text-align: right; color: #475569; font-weight: 600; }
  .inv-totals-table td:last-child { text-align: right; font-weight: 700; width: 100px; }
  .inv-totals-table .final td { font-size: 13px; font-weight: 800; color: #1a1a2e; border-top: 2px solid #1a1a2e; padding-top: 8px; }

  /* Responsive */
  @media (max-width: 600px) {
    .inv-master { flex-direction: column; }
    .inv-left { width: 100%; padding-right: 0; border-right: none; border-bottom: 2px solid #3b82f6; padding-bottom: 16px; margin-bottom: 16px; }
    .inv-right { width: 100%; padding-left: 0; }
    .inv-bill-total .amount { font-size: 18px; }
    .inv-table th, .inv-table td { padding: 5px 6px; font-size: 10px; }
    .inv-table th { font-size: 9px; }
    .invoice-page { padding: 16px; }
  }

  @media print {
    /* Force exact color printing */
    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      background: white !important;
    }
    body {
      padding: 15mm 15mm !important; /* Move contents away from the physical paper edge */
    }
    .invoice-page { 
      padding: 0 !important; /* Use body padding instead to guarantee internal margin */
      margin: 0 !important;
      max-width: 100% !important;
    }
    @page { 
      margin: 0 !important; 
    }
  }
`;

const wifiSvgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 18c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1zm-4.24-3.66a.996.996 0 1 0 1.41 1.41A4.48 4.48 0 0 1 12 14.5c1.21 0 2.31.49 3.11 1.28.39.39 1.02.39 1.41 0s.39-1.02 0-1.41A6.49 6.49 0 0 0 12 12.5a6.49 6.49 0 0 0-4.24 1.84zM4.93 11.34a.996.996 0 1 0 1.41 1.41A8.96 8.96 0 0 1 12 10c2.08 0 4.15.79 5.66 2.34.39.39 1.02.39 1.41 0s.39-1.02 0-1.41C17.22 9.08 14.7 8 12 8s-5.22 1.08-7.07 3.34zm-2.83-2.83a.996.996 0 1 0 1.41 1.41C5.93 7.5 8.93 6 12 6s6.07 1.5 8.49 3.92c.39.39 1.02.39 1.41 0s.39-1.02 0-1.41C19.08 5.69 15.63 4 12 4S4.92 5.69 2.1 8.51z"/></svg>`;

// ===================== SHARED INVOICE BODY BUILDER =====================
function buildInvoicePage(b) {
  const invoiceNo = generateInvoiceNo(b);
  const period = billingPeriodLabel(b.billingMonth);
  const amount = Number(b.amount || 0);
  const vat = Math.round(amount * 0.12 * 100) / 100;

  return `
  <div class="invoice-page">
    <div class="inv-master">
      <!-- LEFT COLUMN: Company info + Summary -->
      <div class="inv-left">
        <div class="inv-company">
          <h2>WiFi Billing</h2>
          <p>Internet Service Provider</p>
        </div>

        <div class="inv-summary-block">
          <div class="inv-field"><span class="inv-field-label">Account No.</span><span class="inv-field-value">${b.customerId || '—'}</span></div>
          <div class="inv-field"><span class="inv-field-label">Name</span><span class="inv-field-value">${b.customerName || b.customerId || '—'}</span></div>
          <div class="inv-field"><span class="inv-field-label">Period</span><span class="inv-field-value">${period}</span></div>
          <div class="inv-field"><span class="inv-field-label">Due Date</span><span class="inv-field-value">${formatDate(b.dueDate)}</span></div>
          <div class="inv-field"><span class="inv-field-label">Paid Date</span><span class="inv-field-value">${b.paidDate ? formatDate(b.paidDate) : '—'}</span></div>
          <div class="inv-field"><span class="inv-field-label">Status</span><span class="inv-field-value inv-status" style="color:${statusColor(b.paymentStatus)}">${statusLabel(b.paymentStatus)}</span></div>
        </div>

        <div class="inv-bill-total">
          <div class="label">Total Bill</div>
          <div class="amount">${formatCurrency(amount)}</div>
        </div>
      </div>

      <!-- RIGHT COLUMN: Header + Tables -->
      <div class="inv-right">
        <div class="inv-right-header">
          <div class="inv-wifi-icon">${wifiSvgIcon}</div>
          <div class="inv-right-brand">
            <h3>WiFi Billing</h3>
            <p>Internet Service Provider</p>
          </div>
        </div>

        <!-- Account Info Table -->
        <table class="inv-table">
          <thead><tr>
            <th>Account No.</th>
            <th>Customer Name</th>
            <th>Period</th>
          </tr></thead>
          <tbody><tr>
            <td>${b.customerId || '—'}</td>
            <td>${b.customerName || b.customerId || '—'}</td>
            <td style="text-align:right;">${period}</td>
          </tr></tbody>
        </table>

        <!-- Billing Details Table -->
        <table class="inv-table">
          <thead><tr>
            <th>Bill No.</th>
            <th>Due Date</th>
            <th>Period</th>
          </tr></thead>
          <tbody><tr>
            <td>${invoiceNo}</td>
            <td>${formatDate(b.dueDate)}</td>
            <td style="text-align:right;">${period}</td>
          </tr></tbody>
        </table>

        <!-- Items Table -->
        <table class="inv-table">
          <thead><tr>
            <th style="width:35px;">No</th>
            <th>Item</th>
            <th style="width:40px; text-align:center;">Qty</th>
            <th style="text-align:right; width:90px;">Price</th>
            <th style="text-align:right; width:90px;">Discount</th>
            <th style="text-align:right; width:90px;">Total</th>
          </tr></thead>
          <tbody>
            <tr>
              <td>1</td>
              <td>WiFi Service — ${period}</td>
              <td style="text-align:center;">1</td>
              <td style="text-align:right;">${formatCurrency(amount)}</td>
              <td style="text-align:right;">—</td>
              <td style="text-align:right;">${formatCurrency(amount)}</td>
            </tr>
          </tbody>
        </table>

        <!-- Totals -->
        <table class="inv-totals-table">
          <tr><td>VAT (12%)</td><td>${formatCurrency(vat)}</td></tr>
          <tr class="final"><td>Total Bill</td><td>${formatCurrency(amount)}</td></tr>
        </table>
      </div>
    </div>
  </div>`;
}

// ===================== A4 FORMAT =====================
function generateA4(billings) {
  const pages = billings.map(b => buildInvoicePage(b)).join('');

  return `<!DOCTYPE html><html><head><title>WiFi Billing</title>
  <style>${invoiceBaseStyles}</style></head><body>${pages}</body></html>`;
}

// ===================== DOT MATRIX FORMAT =====================
function generateDotMatrix(billings) {
  const pages = billings.map(b => buildInvoicePage(b)).join('');

  const dotStyles = invoiceBaseStyles.replace(
    "font-family: 'Segoe UI', Arial, sans-serif;",
    "font-family: 'Courier New', Courier, monospace;"
  );

  return `<!DOCTYPE html><html><head><title>WiFi Billing</title>
  <style>${dotStyles}</style></head><body>${pages}</body></html>`;
}

// ===================== THERMAL FORMAT =====================
function generateThermal(billings) {
  const pages = billings.map(b => buildInvoicePage(b)).join('');

  const thermalStyles = invoiceBaseStyles
    .replace("max-width: 820px;", "max-width: 380px;")
    .replace("padding: 28px 32px;", "padding: 10px 12px;")
    .replace("font-family: 'Segoe UI', Arial, sans-serif;", "font-family: 'Courier New', Courier, monospace;")
    .replace("font-size: 18px; font-weight: 800; color: #1a1a2e; margin-bottom: 2px;", "font-size: 13px; font-weight: 800; color: #1a1a2e; margin-bottom: 2px;")
    .replace("font-size: 16px; font-weight: 800; color: #1a1a2e;", "font-size: 12px; font-weight: 800; color: #1a1a2e;")
    .replace("width: 48px; height: 48px;", "width: 32px; height: 32px;")
    .replace("width: 28px; height: 28px;", "width: 18px; height: 18px;")
    .replace("font-size: 22px; font-weight: 800;", "font-size: 16px; font-weight: 800;")
    + `
    .inv-left { width: 38%; padding-right: 10px; }
    .inv-right { width: 62%; padding-left: 10px; }
    .inv-field { padding: 3px 0; font-size: 10px; }
    .inv-table th, .inv-table td { padding: 4px 5px; font-size: 9px; }
    .inv-table th { font-size: 8px; }
    .inv-totals-table td { font-size: 10px; padding: 3px 5px; }
    .inv-right-header { gap: 6px; margin-bottom: 8px; padding-bottom: 6px; }
    .inv-right-brand p { font-size: 8px; }
    .inv-bill-total { padding: 8px; margin-top: 10px; }
    @media print { .invoice-page { max-width: 72mm; padding: 5px; } }
  `;

  return `<!DOCTYPE html><html><head><title>WiFi Billing</title>
  <style>${thermalStyles}</style></head><body>${pages}</body></html>`;
}

// ===================== SMALL FORMAT =====================
function generateSmall(billings) {
  const pages = billings.map(b => buildInvoicePage(b)).join('');

  const smallStyles = invoiceBaseStyles
    .replace("max-width: 820px;", "max-width: 500px;")
    .replace("padding: 28px 32px;", "padding: 16px 18px;")
    + `
    .inv-company h2 { font-size: 15px; }
    .inv-company p { font-size: 10px; }
    .inv-field { padding: 4px 0; font-size: 11px; }
    .inv-bill-total .amount { font-size: 18px; }
    .inv-right-brand h3 { font-size: 13px; }
    .inv-wifi-icon { width: 36px; height: 36px; }
    .inv-wifi-icon svg { width: 22px; height: 22px; }
    .inv-table th, .inv-table td { padding: 5px 6px; font-size: 10px; }
    .inv-table th { font-size: 9px; }
    .inv-totals-table td { font-size: 11px; }
    @media print { .invoice-page { max-width: 100%; padding: 10px; } }
  `;

  return `<!DOCTYPE html><html><head><title>WiFi Billing</title>
  <style>${smallStyles}</style></head><body>${pages}</body></html>`;
}
