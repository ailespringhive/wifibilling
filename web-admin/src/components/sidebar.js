/**
 * Sidebar Component — Blue gradient style with Material Icons
 */
export function renderSidebar(activePage = 'dashboard') {
  const billingPages = ['billing', 'billing_already_paid', 'billing_not_yet_paid', 'billing_payment_confirmation'];
  const isBillingActive = billingPages.includes(activePage);

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
        <div class="nav-item ${activePage === 'dashboard' ? 'active' : ''}" data-page="dashboard">
          <span class="nav-icon"><span class="material-icons-outlined">dashboard</span></span>
          <span>Home</span>
        </div>

        <div class="nav-item ${activePage === 'customers' ? 'active' : ''}" data-page="customers">
          <span class="nav-icon"><span class="material-icons-outlined">people</span></span>
          <span>Customer</span>
        </div>

        <!-- Billing with submenu -->
        <div class="nav-item ${isBillingActive ? 'active' : ''}" id="billing-toggle">
          <span class="nav-icon"><span class="material-icons-outlined">receipt_long</span></span>
          <span>Bill</span>
          <span class="nav-chevron" id="billing-chevron" style="transition: transform 0.2s ease;"><span class="material-icons-outlined" style="font-size:18px;">chevron_right</span></span>
        </div>
        <div class="nav-submenu ${isBillingActive ? 'open' : ''}" id="billing-submenu">
          <div class="nav-sub-item ${activePage === 'billing_already_paid' ? 'active' : ''}" data-page="billing_already_paid">
            Already Paid
          </div>
          <div class="nav-sub-item ${activePage === 'billing_not_yet_paid' ? 'active' : ''}" data-page="billing_not_yet_paid">
            Not Yet Paid
          </div>
          <div class="nav-sub-item ${activePage === 'billing_payment_confirmation' ? 'active' : ''}" data-page="billing_payment_confirmation">
            Payment Confirmation
          </div>
          <div class="nav-sub-item ${activePage === 'billing' ? 'active' : ''}" data-page="billing">
            All
          </div>
        </div>

        <div class="nav-item ${activePage === 'collectors' ? 'active' : ''}" data-page="collectors">
          <span class="nav-icon"><span class="material-icons-outlined">directions_run</span></span>
          <span>Collectors</span>
        </div>

        <div class="nav-item ${activePage === 'plans' ? 'active' : ''}" data-page="plans">
          <span class="nav-icon"><span class="material-icons-outlined">cell_tower</span></span>
          <span>WiFi Plans</span>
        </div>
      </nav>
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
