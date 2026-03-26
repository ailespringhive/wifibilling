import { statusBadge, formatCurrency, formatDate, getInitials } from '../components/ui-helpers.js';

/**
 * Dashboard Page — WiFi Billing System (Material Icons)
 */
export function renderDashboardPage() {
  return `
    <!-- Row 1: Customer & Billing Stats -->
    <div class="dash-stats-row">
      <div class="dash-stat-card" style="--card-accent: var(--accent-blue);">
        <div class="dash-stat-info">
          <div class="dash-stat-label">TOTAL CUSTOMERS</div>
          <div class="dash-stat-value" id="stat-customers">—</div>
        </div>
        <div class="dash-stat-icon" style="color: var(--accent-blue);"><span class="material-icons-outlined">people</span></div>
      </div>

      <div class="dash-stat-card" style="--card-accent: var(--accent-emerald);">
        <div class="dash-stat-info">
          <div class="dash-stat-label">ACTIVE SUBSCRIPTIONS</div>
          <div class="dash-stat-value" id="stat-active">—</div>
        </div>
        <div class="dash-stat-icon" style="color: var(--accent-emerald);"><span class="material-icons-outlined">wifi</span></div>
      </div>

      <div class="dash-stat-card" style="--card-accent: var(--accent-amber);">
        <div class="dash-stat-info">
          <div class="dash-stat-label">UNPAID BILLS</div>
          <div class="dash-stat-value" id="stat-unpaid">—</div>
        </div>
        <div class="dash-stat-icon" style="color: var(--accent-amber);"><span class="material-icons-outlined">credit_card</span></div>
      </div>

      <div class="dash-stat-card" style="--card-accent: var(--accent-rose);">
        <div class="dash-stat-info">
          <div class="dash-stat-label">OVERDUE</div>
          <div class="dash-stat-value" id="stat-overdue">—</div>
        </div>
        <div class="dash-stat-icon" style="color: var(--accent-rose);"><span class="material-icons-outlined">warning</span></div>
      </div>
    </div>

    <!-- Row 2: Operations Stats -->
    <div class="dash-stats-row">
      <div class="dash-stat-card" style="--card-accent: #6366f1;">
        <div class="dash-stat-info">
          <div class="dash-stat-label">TOTAL COLLECTORS</div>
          <div class="dash-stat-value" id="stat-collectors">—</div>
        </div>
        <div class="dash-stat-icon" style="color: #6366f1;"><span class="material-icons-outlined">directions_run</span></div>
      </div>

      <div class="dash-stat-card" style="--card-accent: var(--accent-cyan);">
        <div class="dash-stat-info">
          <div class="dash-stat-label">WIFI PLANS</div>
          <div class="dash-stat-value" id="stat-plans">—</div>
        </div>
        <div class="dash-stat-icon" style="color: var(--accent-cyan);"><span class="material-icons-outlined">cell_tower</span></div>
      </div>

      <div class="dash-stat-card" style="--card-accent: var(--accent-purple);">
        <div class="dash-stat-info">
          <div class="dash-stat-label">PAYMENT CONFIRMATIONS</div>
          <div class="dash-stat-value" id="stat-confirmations">—</div>
        </div>
        <div class="dash-stat-icon" style="color: var(--accent-purple);"><span class="material-icons-outlined">sync</span></div>
      </div>

      <div class="dash-stat-card" style="--card-accent: var(--accent-emerald);">
        <div class="dash-stat-info">
          <div class="dash-stat-label">TOTAL COLLECTED</div>
          <div class="dash-stat-value" id="stat-collected">—</div>
        </div>
        <div class="dash-stat-icon" style="color: var(--accent-emerald);"><span class="material-icons-outlined">payments</span></div>
      </div>
    </div>

    <!-- Bottom Section: Monthly Revenue Chart + Quick Summary -->
    <div class="dash-bottom-grid">
      <!-- Monthly Revenue -->
      <div class="card">
        <div class="card-header">
          <span class="card-title" style="color: var(--accent-blue);">Monthly Revenue</span>
        </div>
        <div class="card-body" id="income-chart-area" style="min-height: 240px; display:flex; align-items:flex-end; gap:2px; padding-bottom:12px;">
        </div>
      </div>

      <!-- Quick Summary -->
      <div class="card">
        <div class="card-header">
          <span class="card-title" style="color: var(--accent-blue);">System Overview</span>
        </div>
        <div class="card-body">
          <div class="control-panel-grid" id="control-panel">
          </div>
        </div>
      </div>
    </div>

    <!-- Recent Billing Activity -->
    <div class="card" style="margin-top: var(--space-lg);">
      <div class="card-header">
        <span class="card-title">Recent Billing Activity</span>
        <button class="btn btn-ghost btn-sm" data-page="billing">View All →</button>
      </div>
      <div class="card-body" id="recent-billing" style="padding:0;">
        <div style="padding:24px; text-align:center; color: var(--text-muted);">
          <div class="spinner" style="margin: 0 auto 12px;"></div>
          Loading...
        </div>
      </div>
    </div>
  `;
}

/**
 * Load dashboard data
 */
export async function initDashboardPage(services) {
  try {
    const [customerCount, activeCount, statusCounts, collectorCount] = await Promise.all([
      services.customer.getCount(),
      services.subscription.getActiveCount(),
      services.billing.getStatusCounts(),
      services.collector.getCount(),
    ]);

    document.getElementById('stat-customers').textContent = customerCount;
    document.getElementById('stat-active').textContent = activeCount;
    document.getElementById('stat-unpaid').textContent = statusCounts.unpaid || 0;
    document.getElementById('stat-overdue').textContent = statusCounts.overdue || 0;
    document.getElementById('stat-collectors').textContent = collectorCount;
    document.getElementById('stat-plans').textContent = '—';
    document.getElementById('stat-confirmations').textContent = statusCounts.confirmation || 0;
    document.getElementById('stat-collected').textContent = formatCurrency(statusCounts.totalPaid || 0);

    renderControlPanel(customerCount, activeCount, collectorCount, statusCounts);
    renderIncomeChart();

    const recent = await services.billing.getAll(null, 8, 0);
    renderRecentBilling(recent.documents, services);

  } catch (error) {
    console.warn('Appwrite not connected, showing demo data:', error.message);
    loadDemoData();
  }
}

function renderControlPanel(customers, active, collectors, statusCounts) {
  const panel = document.getElementById('control-panel');
  const tiles = [
    { value: customers || 24, label: 'Customers', icon: 'people', color: 'var(--accent-blue)' },
    { value: active || 21, label: 'Active Subs', icon: 'wifi', color: 'var(--accent-emerald)' },
    { value: collectors || 4, label: 'Collectors', icon: 'directions_run', color: '#6366f1' },
    { value: (statusCounts?.paid || 16), label: 'Paid', icon: 'check_circle', color: 'var(--accent-emerald)' },
  ];

  panel.innerHTML = tiles.map(t => `
    <div class="control-tile">
      <div class="control-tile-value">${t.value}</div>
      <div class="control-tile-icon" style="color: ${t.color};"><span class="material-icons-outlined">${t.icon}</span></div>
      <div class="control-tile-label">${t.label}</div>
    </div>
  `).join('');
}

function renderIncomeChart() {
  const container = document.getElementById('income-chart-area');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const currentMonth = new Date().getMonth();

  const values = months.map((_, i) => i <= currentMonth ? Math.floor(Math.random() * 80000 + 20000) : 0);
  const maxVal = Math.max(...values, 1);

  container.innerHTML = `
    <div style="display:flex; flex-direction:column; width:100%; gap:8px;">
      <div style="display:flex; align-items:flex-end; gap:6px; height:200px; padding:0 4px;">
        ${values.map((v, i) => {
          const h = maxVal > 0 ? Math.max((v / maxVal) * 100, 2) : 2;
          const isActive = i <= currentMonth;
          return `
            <div style="flex:1; display:flex; flex-direction:column; align-items:center; gap:4px;">
              <div style="width:100%; height:${h}%; min-height:4px; border-radius:4px 4px 0 0;
                background:${isActive ? 'linear-gradient(180deg, var(--accent-blue), #2563eb)' : 'var(--border-color)'};
                opacity:${isActive ? 1 : 0.3}; transition:height 0.3s;"></div>
            </div>`;
        }).join('')}
      </div>
      <div style="display:flex; gap:6px; padding:0 4px;">
        ${months.map((m, i) => `
          <div style="flex:1; text-align:center; font-size:0.65rem; color:${i <= currentMonth ? 'var(--text-secondary)' : 'var(--text-muted)'}; font-weight:${i === currentMonth ? '700' : '400'};">
            ${m}
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderRecentBilling(billings) {
  const container = document.getElementById('recent-billing');
  if (!billings || billings.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon"><span class="material-icons-outlined" style="font-size:3rem;">receipt_long</span></div>
        <div class="empty-title">No billing records yet</div>
        <div class="empty-text">Billing records will appear here once you start billing customers.</div>
      </div>
    `;
    return;
  }

  let html = '<table class="data-table"><thead><tr>';
  html += '<th>Customer</th><th>Month</th><th>Amount</th><th>Status</th><th>Due</th>';
  html += '</tr></thead><tbody>';

  billings.forEach(bill => {
    html += `<tr>
      <td style="color:var(--text-primary); font-weight:500;">${bill.customerName || bill.customerId?.substring(0, 8) || '—'}</td>
      <td>${bill.billingMonth || '—'}</td>
      <td>${formatCurrency(bill.amount)}</td>
      <td>${statusBadge(bill.paymentStatus)}</td>
      <td>${formatDate(bill.dueDate)}</td>
    </tr>`;
  });

  html += '</tbody></table>';
  container.innerHTML = html;
}

function loadDemoData() {
  document.getElementById('stat-customers').textContent = '24';
  document.getElementById('stat-active').textContent = '21';
  document.getElementById('stat-unpaid').textContent = '8';
  document.getElementById('stat-overdue').textContent = '3';
  document.getElementById('stat-collectors').textContent = '4';
  document.getElementById('stat-plans').textContent = '5';
  document.getElementById('stat-confirmations').textContent = '2';
  document.getElementById('stat-collected').textContent = '₱48,750';

  renderControlPanel(24, 21, 4, { paid: 16 });
  renderIncomeChart();

  const container = document.getElementById('recent-billing');
  const demoData = [
    { name: 'Juan Dela Cruz', month: '2026-03', amount: 999, status: 'not_yet_paid', due: '2026-03-15' },
    { name: 'Maria Santos', month: '2026-03', amount: 1499, status: 'already_paid', due: '2026-03-15' },
    { name: 'Pedro Reyes', month: '2026-03', amount: 699, status: 'not_yet_paid', due: '2026-03-15' },
    { name: 'Ana Garcia', month: '2026-03', amount: 999, status: 'payment_confirmation', due: '2026-03-30' },
    { name: 'Jose Rivera', month: '2026-03', amount: 1499, status: 'already_paid', due: '2026-03-15' },
    { name: 'Rosa Mabini', month: '2026-02', amount: 699, status: 'already_paid', due: '2026-02-15' },
  ];

  let html = '<table class="data-table"><thead><tr>';
  html += '<th>Customer</th><th>Month</th><th>Amount</th><th>Status</th><th>Due Date</th>';
  html += '</tr></thead><tbody>';
  demoData.forEach(d => {
    html += `<tr>
      <td style="color:var(--text-primary); font-weight:500;">${d.name}</td>
      <td>${d.month}</td>
      <td>${formatCurrency(d.amount)}</td>
      <td>${statusBadge(d.status)}</td>
      <td>${formatDate(d.due)}</td>
    </tr>`;
  });
  html += '</tbody></table>';
  container.innerHTML = html;
}
