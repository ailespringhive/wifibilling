/**
 * Sidebar Component — Premium design with colored icon badges
 */
export function renderSidebar(activePage = 'dashboard') {
  const billingPages = ['billing', 'billing_already_paid', 'billing_not_yet_paid', 'billing_payment_confirmation'];
  const isBillingActive = billingPages.includes(activePage);
  const isCustomerDetail = activePage.startsWith('customer_detail');

  return `
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-brand">
        <div class="brand-icon"><span class="material-icons-outlined">wifi</span></div>
        <div>
          <div class="brand-text">WiFi Billing</div>
          <div class="brand-sub">Admin Panel</div>
        </div>
      </div>

      <nav class="sidebar-nav">
        <div class="nav-section-label">MAIN</div>
        <div class="nav-item ${activePage === 'dashboard' ? 'active' : ''}" data-page="dashboard">
          <span class="nav-icon-badge" style="--icon-color: var(--accent-blue); --icon-bg: rgba(59,130,246,0.12);">
            <span class="material-icons-outlined">space_dashboard</span>
          </span>
          <span>Dashboard</span>
        </div>

        <div class="nav-item ${activePage === 'customers' || isCustomerDetail ? 'active' : ''}" data-page="customers">
          <span class="nav-icon-badge" style="--icon-color: var(--accent-emerald); --icon-bg: rgba(16,185,129,0.12);">
            <span class="material-icons-outlined">groups</span>
          </span>
          <span>Customers</span>
        </div>

        <div class="nav-section-label" style="margin-top:16px;">BILLING</div>
        <!-- Billing with submenu -->
        <div class="nav-item ${isBillingActive ? 'active' : ''}" id="billing-toggle">
          <span class="nav-icon-badge" style="--icon-color: var(--accent-amber); --icon-bg: rgba(245,158,11,0.12);">
            <span class="material-icons-outlined">receipt_long</span>
          </span>
          <span>Billing</span>
          <span class="nav-chevron" id="billing-chevron" style="transition: transform 0.25s ease;${isBillingActive ? ' transform:rotate(90deg);' : ''}"><span class="material-icons-outlined" style="font-size:18px;">chevron_right</span></span>
        </div>
        <div class="nav-submenu ${isBillingActive ? 'open' : ''}" id="billing-submenu">
          <div class="nav-sub-item ${activePage === 'billing_already_paid' ? 'active' : ''}" data-page="billing_already_paid">
            <span class="sub-dot" style="background: var(--accent-emerald);"></span>
            Already Paid
          </div>
          <div class="nav-sub-item ${activePage === 'billing_not_yet_paid' ? 'active' : ''}" data-page="billing_not_yet_paid">
            <span class="sub-dot" style="background: var(--accent-rose);"></span>
            Not Yet Paid
          </div>
          <div class="nav-sub-item ${activePage === 'billing_payment_confirmation' ? 'active' : ''}" data-page="billing_payment_confirmation">
            <span class="sub-dot" style="background: var(--accent-purple);"></span>
            Pending Confirmation
          </div>
          <div class="nav-sub-item ${activePage === 'billing' ? 'active' : ''}" data-page="billing">
            <span class="sub-dot" style="background: var(--accent-cyan);"></span>
            All Bills
          </div>
        </div>

        <div class="nav-section-label" style="margin-top:16px;">MANAGEMENT</div>
        <div class="nav-item ${activePage === 'collectors' ? 'active' : ''}" data-page="collectors">
          <span class="nav-icon-badge" style="--icon-color: var(--accent-purple); --icon-bg: rgba(168,85,247,0.12);">
            <span class="material-icons-outlined">badge</span>
          </span>
          <span>Collectors</span>
        </div>

        <div class="nav-item ${activePage === 'technicians' ? 'active' : ''}" data-page="technicians">
          <span class="nav-icon-badge" style="--icon-color: var(--accent-emerald); --icon-bg: rgba(16,185,129,0.12);">
            <span class="material-icons-outlined">engineering</span>
          </span>
          <span>Technicians</span>
        </div>

        <div class="nav-item ${activePage === 'plans' ? 'active' : ''}" data-page="plans">
          <span class="nav-icon-badge" style="--icon-color: var(--accent-cyan); --icon-bg: rgba(6,182,212,0.12);">
            <span class="material-icons-outlined">router</span>
          </span>
          <span>WiFi Plans</span>
        </div>

        <div class="nav-item ${activePage === 'notifications' ? 'active' : ''}" data-page="notifications">
          <span class="nav-icon-badge" style="--icon-color: var(--accent-purple); --icon-bg: rgba(168,85,247,0.12);">
            <span class="material-icons-outlined">notifications</span>
          </span>
          <span>Notifications</span>
        </div>
      </nav>

      <div class="sidebar-footer">
        <div class="sidebar-footer-content">
          <span class="material-icons-outlined" style="font-size:16px; color:var(--accent-emerald);">circle</span>
          <span>System Online</span>
        </div>
      </div>
    </aside>
    <div class="sidebar-overlay" id="sidebar-overlay"></div>
  `;
}

/**
 * Attach sidebar event listeners
 */
export function initSidebar(navigateFn) {
  // Regular nav items (not billing)
  document.querySelectorAll('.nav-item[data-page]').forEach(item => {
    item.addEventListener('click', () => {
      const page = item.dataset.page;
      navigateFn(page);
    });
  });

  // Billing toggle
  const billingToggle = document.getElementById('billing-toggle');
  const billingSubmenu = document.getElementById('billing-submenu');
  const billingChevron = document.getElementById('billing-chevron');

  if (billingToggle) {
    billingToggle.addEventListener('click', () => {
      billingSubmenu.classList.toggle('open');
      billingChevron.style.transform = billingSubmenu.classList.contains('open') ? 'rotate(90deg)' : 'rotate(0deg)';
    });
  }

  // Billing sub-items
  document.querySelectorAll('.nav-sub-item').forEach(item => {
    item.addEventListener('click', () => {
      const page = item.dataset.page;
      navigateFn(page);
    });
  });

  // Mobile toggle
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const menuToggle = document.getElementById('menu-toggle');

  if (menuToggle) {
    menuToggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      overlay.classList.toggle('active');
    });
  }

  if (overlay) {
    overlay.addEventListener('click', () => {
      sidebar.classList.remove('open');
      overlay.classList.remove('active');
    });
  }
}
