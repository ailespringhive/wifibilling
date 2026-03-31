import { statusBadge, formatCurrency, formatDate, getInitials } from '../components/ui-helpers.js';

/**
 * Dashboard Page — Premium Redesign with Gradient Cards
 */
export function renderDashboardPage() {
  return `
    <!-- Greeting -->
    <div class="dash-greeting" id="dash-greeting">
      <h2>Good morning, Admin 👋</h2>
      <p>Here's what's happening with your WiFi business today.</p>
    </div>

    <!-- Row 1: Key Metrics -->
    <div class="dash-stats-row">
      <div class="dash-stat-card dash-stat-blue">
        <div class="dash-stat-bg-icon"><span class="material-icons-outlined">people</span></div>
        <div class="dash-stat-info">
          <div class="dash-stat-label">Total Customers</div>
          <div class="dash-stat-value" id="stat-customers">—</div>
        </div>
        <div class="dash-stat-icon"><span class="material-icons-outlined">people</span></div>
      </div>

      <div class="dash-stat-card dash-stat-emerald">
        <div class="dash-stat-bg-icon"><span class="material-icons-outlined">wifi</span></div>
        <div class="dash-stat-info">
          <div class="dash-stat-label">Active Subscriptions</div>
          <div class="dash-stat-value" id="stat-active">—</div>
        </div>
        <div class="dash-stat-icon"><span class="material-icons-outlined">wifi</span></div>
      </div>

      <div class="dash-stat-card dash-stat-amber">
        <div class="dash-stat-bg-icon"><span class="material-icons-outlined">credit_card</span></div>
        <div class="dash-stat-info">
          <div class="dash-stat-label">Unpaid Bills</div>
          <div class="dash-stat-value" id="stat-unpaid">—</div>
        </div>
        <div class="dash-stat-icon"><span class="material-icons-outlined">credit_card</span></div>
      </div>

      <div class="dash-stat-card dash-stat-rose">
        <div class="dash-stat-bg-icon"><span class="material-icons-outlined">warning</span></div>
        <div class="dash-stat-info">
          <div class="dash-stat-label">Overdue</div>
          <div class="dash-stat-value" id="stat-overdue">—</div>
        </div>
        <div class="dash-stat-icon"><span class="material-icons-outlined">warning</span></div>
      </div>
    </div>

    <!-- Row 2: Operations Stats -->
    <div class="dash-stats-row">
      <div class="dash-stat-card dash-stat-purple">
        <div class="dash-stat-bg-icon"><span class="material-icons-outlined">directions_run</span></div>
        <div class="dash-stat-info">
          <div class="dash-stat-label">Total Collectors</div>
          <div class="dash-stat-value" id="stat-collectors">—</div>
        </div>
        <div class="dash-stat-icon"><span class="material-icons-outlined">directions_run</span></div>
      </div>

      <div class="dash-stat-card dash-stat-cyan">
        <div class="dash-stat-bg-icon"><span class="material-icons-outlined">cell_tower</span></div>
        <div class="dash-stat-info">
          <div class="dash-stat-label">WiFi Plans</div>
          <div class="dash-stat-value" id="stat-plans">—</div>
        </div>
        <div class="dash-stat-icon"><span class="material-icons-outlined">cell_tower</span></div>
      </div>

      <div class="dash-stat-card dash-stat-violet">
        <div class="dash-stat-bg-icon"><span class="material-icons-outlined">sync</span></div>
        <div class="dash-stat-info">
          <div class="dash-stat-label">Payment Confirmations</div>
          <div class="dash-stat-value" id="stat-confirmations">—</div>
        </div>
        <div class="dash-stat-icon"><span class="material-icons-outlined">sync</span></div>
      </div>

      <div class="dash-stat-card dash-stat-green">
        <div class="dash-stat-bg-icon"><span class="material-icons-outlined">payments</span></div>
        <div class="dash-stat-info">
          <div class="dash-stat-label">Total Collected</div>
          <div class="dash-stat-value" id="stat-collected">—</div>
        </div>
        <div class="dash-stat-icon"><span class="material-icons-outlined">payments</span></div>
      </div>
    </div>

    <!-- Bottom Section: Monthly Revenue Chart + Quick Summary -->
    <div class="dash-bottom-grid">
      <!-- Monthly Revenue -->
      <div class="card glass-card">
        <div class="card-header">
          <span class="card-title"><span class="material-icons-outlined" style="font-size:18px; vertical-align:-3px; margin-right:6px; color:var(--accent-blue);">bar_chart</span> Monthly Revenue</span>
        </div>
        <div class="card-body" id="income-chart-area" style="min-height: 240px; display:flex; align-items:flex-end; gap:2px; padding-bottom:12px;">
        </div>
      </div>

      <!-- Quick Summary -->
      <div class="card glass-card">
        <div class="card-header">
          <span class="card-title"><span class="material-icons-outlined" style="font-size:18px; vertical-align:-3px; margin-right:6px; color:var(--accent-emerald);">analytics</span> System Overview</span>
        </div>
        <div class="card-body">
          <div class="control-panel-grid" id="control-panel">
          </div>
        </div>
      </div>
    </div>

    <!-- Recent Billing Activity -->
    <div class="card glass-card" style="margin-top: var(--space-lg);">
      <div class="card-header">
        <span class="card-title"><span class="material-icons-outlined" style="font-size:18px; vertical-align:-3px; margin-right:6px; color:var(--accent-purple);">receipt_long</span> Recent Billing Activity</span>
        <div style="display:flex; align-items:center; gap:10px;">
          <span id="billing-page-info" style="font-size:0.75rem; color:var(--text-muted);"></span>
          <button class="btn btn-ghost btn-sm" data-page="billing">View All →</button>
        </div>
      </div>
      <div id="recent-billing" style="padding:0;">
        <div style="padding:24px; text-align:center; color: var(--text-muted);">
          <div class="spinner" style="margin: 0 auto 12px;"></div>
          Loading...
        </div>
      </div>
      <div id="recent-billing-pagination" style="display:none; padding:12px 16px; border-top:1px solid var(--border-color); display:flex; align-items:center; justify-content:flex-start; gap:8px; flex-wrap:wrap;"></div>
    </div>
  `;
}

const PAGE_SIZE = 5;

/**
 * Load dashboard data
 */
export async function initDashboardPage(services, navigateFn) {
  // Set time-based greeting
  const hour = new Date().getHours();
  let greeting = 'Good morning';
  if (hour >= 12 && hour < 18) greeting = 'Good afternoon';
  else if (hour >= 18) greeting = 'Good evening';
  const greetEl = document.getElementById('dash-greeting');
  if (greetEl) greetEl.querySelector('h2').textContent = `${greeting}, Admin 👋`;

  try {
    const [customerCount, activeCount, statusCounts, collectorCount] = await Promise.all([
      services.customer.getCount(),
      services.subscription.getActiveCount(),
      services.billing.getStatusCounts(),
      services.collector.getCount(),
    ]);

    animateCounter('stat-customers', customerCount);
    animateCounter('stat-active', activeCount);
    animateCounter('stat-unpaid', statusCounts.unpaid || 0);
    animateCounter('stat-overdue', statusCounts.overdue || 0);
    animateCounter('stat-collectors', collectorCount);
    document.getElementById('stat-plans').textContent = '—';
    animateCounter('stat-confirmations', statusCounts.confirmation || 0);
    document.getElementById('stat-collected').textContent = formatCurrency(statusCounts.totalPaid || 0);

    renderControlPanel(customerCount, activeCount, collectorCount, statusCounts);
    renderIncomeChart();

    // Paginated billing — server-side via Appwrite offset
    let currentPage = 1;
    let totalCount = 0;

    async function loadBillingPage(page) {
      const container = document.getElementById('recent-billing');
      container.innerHTML = `<div style="padding:24px; text-align:center; color:var(--text-muted);"><div class="spinner" style="margin:0 auto 12px;"></div>Loading...</div>`;

      const offset = (page - 1) * PAGE_SIZE;
      const result = await services.billing.getAll(null, PAGE_SIZE, offset);
      totalCount = result.total || result.documents.length;
      currentPage = page;

      renderRecentBilling(result.documents);
      renderBillingPagination(currentPage, totalCount, loadBillingPage);
    }

    await loadBillingPage(1);

  } catch (error) {
    console.warn('Appwrite not connected, showing demo data:', error.message);
    loadDemoData();
  }
}

function animateCounter(id, target) {
  const el = document.getElementById(id);
  if (!el || typeof target !== 'number') { if (el) el.textContent = target; return; }
  let start = 0;
  const duration = 800;
  const step = (timestamp) => {
    if (!start) start = timestamp;
    const progress = Math.min((timestamp - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.floor(eased * target);
    if (progress < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
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
          const h = maxVal > 0 ? Math.max((v / maxVal) * 100, 4) : 4;
          const isActive = i <= currentMonth;
          const isCurrent = i === currentMonth;
          return `
            <div style="flex:1; display:flex; flex-direction:column; align-items:center; gap:4px;">
              <div style="width:100%; height:${h}%; min-height:6px; border-radius:6px 6px 2px 2px;
                background:${isActive ? (isCurrent ? 'linear-gradient(180deg, #818cf8, #6366f1)' : 'linear-gradient(180deg, var(--accent-blue), #2563eb)') : 'rgba(100,116,139,0.15)'};
                opacity:${isActive ? 1 : 0.3};
                transition: height 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
                box-shadow: ${isCurrent ? '0 4px 12px rgba(99,102,241,0.4)' : 'none'};"></div>
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
    // Hide pagination
    const pg = document.getElementById('recent-billing-pagination');
    if (pg) pg.style.display = 'none';
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

function renderBillingPagination(currentPage, total, onPageChange) {
  const pg = document.getElementById('recent-billing-pagination');
  const pageInfo = document.getElementById('billing-page-info');
  if (!pg) return;

  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Update info text
  const from = (currentPage - 1) * PAGE_SIZE + 1;
  const to = Math.min(currentPage * PAGE_SIZE, total);
  if (pageInfo) pageInfo.textContent = total > 0 ? `${from}–${to} of ${total}` : '';

  // Hide pagination bar if only 1 page
  if (totalPages <= 1) {
    pg.style.display = 'none';
    return;
  }

  pg.style.display = 'flex';

  // Build page number pills (show max 5 around current)
  const maxPills = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxPills / 2));
  let endPage = Math.min(totalPages, startPage + maxPills - 1);
  if (endPage - startPage < maxPills - 1) startPage = Math.max(1, endPage - maxPills + 1);

  let pillsHtml = '';
  if (startPage > 1) pillsHtml += `<button class="pg-pill" data-pg="1">1</button>${startPage > 2 ? '<span class="pg-ellipsis">…</span>' : ''}`;
  for (let i = startPage; i <= endPage; i++) {
    pillsHtml += `<button class="pg-pill ${i === currentPage ? 'active' : ''}" data-pg="${i}">${i}</button>`;
  }
  if (endPage < totalPages) pillsHtml += `${endPage < totalPages - 1 ? '<span class="pg-ellipsis">…</span>' : ''}<button class="pg-pill" data-pg="${totalPages}">${totalPages}</button>`;

  pg.innerHTML = `
    <div style="display:flex; align-items:center; gap:4px;">
      <button class="pg-btn" id="pg-prev" ${currentPage === 1 ? 'disabled' : ''} data-pg="${currentPage - 1}">
        <span class="material-icons-outlined" style="font-size:16px;">chevron_left</span> Prev
      </button>
      ${pillsHtml}
      <button class="pg-btn" id="pg-next" ${currentPage === totalPages ? 'disabled' : ''} data-pg="${currentPage + 1}">
        Next <span class="material-icons-outlined" style="font-size:16px;">chevron_right</span>
      </button>
    </div>
  `;

  // Wire up clicks
  pg.querySelectorAll('[data-pg]').forEach(btn => {
    btn.addEventListener('click', () => {
      const page = parseInt(btn.dataset.pg);
      if (!btn.disabled && page >= 1 && page <= totalPages) {
        onPageChange(page);
        // Scroll card into view smoothly
        document.getElementById('recent-billing')?.closest('.glass-card')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
  });
}

function loadDemoData() {
  animateCounter('stat-customers', 24);
  animateCounter('stat-active', 21);
  animateCounter('stat-unpaid', 8);
  animateCounter('stat-overdue', 3);
  animateCounter('stat-collectors', 4);
  animateCounter('stat-plans', 5);
  animateCounter('stat-confirmations', 2);
  document.getElementById('stat-collected').textContent = '₱48,750';

  renderControlPanel(24, 21, 4, { paid: 16 });
  renderIncomeChart();

  // Extended demo data to showcase pagination
  const allDemoData = [
    { customerName: 'Juan Dela Cruz',  billingMonth: '2026-03', amount: 999,  paymentStatus: 'not_yet_paid',       dueDate: '2026-03-15' },
    { customerName: 'Maria Santos',    billingMonth: '2026-03', amount: 1499, paymentStatus: 'already_paid',       dueDate: '2026-03-15' },
    { customerName: 'Pedro Reyes',     billingMonth: '2026-03', amount: 699,  paymentStatus: 'not_yet_paid',       dueDate: '2026-03-15' },
    { customerName: 'Ana Garcia',      billingMonth: '2026-03', amount: 999,  paymentStatus: 'payment_confirmation', dueDate: '2026-03-30' },
    { customerName: 'Jose Rivera',     billingMonth: '2026-03', amount: 1499, paymentStatus: 'already_paid',       dueDate: '2026-03-15' },
    { customerName: 'Rosa Mabini',     billingMonth: '2026-02', amount: 699,  paymentStatus: 'already_paid',       dueDate: '2026-02-15' },
    { customerName: 'Carlos Diaz',     billingMonth: '2026-02', amount: 999,  paymentStatus: 'not_yet_paid',       dueDate: '2026-02-15' },
    { customerName: 'Elena Reyes',     billingMonth: '2026-02', amount: 1499, paymentStatus: 'already_paid',       dueDate: '2026-02-15' },
    { customerName: 'Fernando Lopez',  billingMonth: '2026-02', amount: 699,  paymentStatus: 'overdue',            dueDate: '2026-02-15' },
    { customerName: 'Gloria Torres',   billingMonth: '2026-01', amount: 999,  paymentStatus: 'already_paid',       dueDate: '2026-01-15' },
    { customerName: 'Hector Villanueva', billingMonth: '2026-01', amount: 1499, paymentStatus: 'already_paid',   dueDate: '2026-01-15' },
    { customerName: 'Isabel Cruz',     billingMonth: '2026-01', amount: 699,  paymentStatus: 'not_yet_paid',       dueDate: '2026-01-15' },
  ];

  let currentPage = 1;

  function showDemoPage(page) {
    currentPage = page;
    const start = (page - 1) * PAGE_SIZE;
    const slice = allDemoData.slice(start, start + PAGE_SIZE);
    renderRecentBilling(slice);
    renderBillingPagination(currentPage, allDemoData.length, showDemoPage);
  }

  showDemoPage(1);
}
