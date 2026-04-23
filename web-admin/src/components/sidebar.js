/**
 * Sidebar Component — Premium design with colored icon badges
 */
export function renderSidebar(activePage = 'dashboard', currentUser = null) {
  const billingPages = ['billing', 'billing_already_paid', 'billing_not_yet_paid', 'billing_overdue'];
  const isBillingActive = billingPages.includes(activePage);
  const isCustomerDetail = activePage.startsWith('customer_detail');

  return `
    <aside class="sidebar sidebar-floating" id="sidebar">
      <div class="sidebar-brand">
        <div class="brand-icon">
          <div class="wifi-animated">
            <div class="wifi-arc wifi-arc1"></div>
            <div class="wifi-arc wifi-arc2"></div>
            <div class="wifi-arc wifi-arc3"></div>
            <div class="wifi-dot"></div>
          </div>
        </div>
        <div style="margin-left:8px;">
          <div class="brand-text" style="font-size: 1.1rem; font-weight: 700; letter-spacing: 0.05em; margin-bottom: 2px;">WIFI BILLING</div>
        </div>
        <!-- Collapse Toggle Arrow -->
        <button class="sidebar-collapse-btn" id="sidebar-collapse-btn">
          <span class="material-icons-outlined">chevron_left</span>
        </button>
      </div>

      <nav class="sidebar-nav">
        <div class="nav-item ${activePage === 'dashboard' ? 'active' : ''}" data-page="dashboard">
          <div class="nav-icon-wrapper"><span class="material-icons-outlined nav-icon">grid_view</span></div>
          <span class="nav-text">Dashboard</span>
        </div>

        <div class="nav-item ${activePage === 'customers' || isCustomerDetail ? 'active' : ''}" data-page="customers">
          <div class="nav-icon-wrapper"><span class="material-icons-outlined nav-icon">groups</span></div>
          <span class="nav-text">Customers</span>
        </div>

        <!-- Billing -->
        <div class="nav-item ${isBillingActive ? 'active' : ''}" id="billing-toggle">
          <div class="nav-icon-wrapper"><span class="material-icons-outlined nav-icon">receipt_long</span></div>
          <span class="nav-text">Billing</span>
        </div>
        <div class="nav-submenu ${isBillingActive ? 'open' : ''}" id="billing-submenu">
          <div class="nav-sub-item ${activePage === 'billing' ? 'active' : ''}" data-page="billing">
            <span class="nav-text">All Bills</span>
          </div>
          <div class="nav-sub-item ${activePage === 'billing_already_paid' ? 'active' : ''}" data-page="billing_already_paid">
            <span class="nav-text">Already Paid</span>
          </div>
          <div class="nav-sub-item ${activePage === 'billing_not_yet_paid' ? 'active' : ''}" data-page="billing_not_yet_paid">
            <span class="nav-text">Not Yet Paid</span>
          </div>
          <div class="nav-sub-item ${activePage === 'billing_overdue' ? 'active' : ''}" data-page="billing_overdue">
            <span class="nav-text">Overdue</span>
          </div>
        </div>

        <div class="nav-item ${activePage === 'collectors' ? 'active' : ''}" data-page="collectors">
          <div class="nav-icon-wrapper"><span class="material-icons-outlined nav-icon">account_balance_wallet</span></div>
          <span class="nav-text">Collectors</span>
        </div>

        <div class="nav-item ${activePage === 'technicians' ? 'active' : ''}" data-page="technicians">
          <div class="nav-icon-wrapper"><span class="material-icons-outlined nav-icon">engineering</span></div>
          <span class="nav-text">Technicians</span>
        </div>

        <div class="nav-item ${activePage === 'tickets' ? 'active' : ''}" data-page="tickets">
          <div class="nav-icon-wrapper"><span class="material-icons-outlined nav-icon">assignment</span></div>
          <span class="nav-text">Tickets</span>
        </div>

        <div class="nav-item ${activePage === 'plans' ? 'active' : ''}" data-page="plans">
          <div class="nav-icon-wrapper"><span class="material-icons-outlined nav-icon">router</span></div>
          <span class="nav-text">WiFi Plans</span>
        </div>

        <div class="nav-item ${activePage === 'notifications' ? 'active' : ''}" data-page="notifications">
          <div class="nav-icon-wrapper"><span class="material-icons-outlined nav-icon">notifications</span></div>
          <span class="nav-text">Notifications</span>
        </div>
      </nav>

      <div class="sidebar-bottom">
        <div class="sidebar-profile-pill">
          <div id="sidebar-bottom-profile-btn" class="sidebar-profile-btn" title="View Admin Profile">
            <div id="sidebar-bottom-avatar" class="sidebar-avatar">
              ${(() => {
                const name = currentUser?.profile 
                  ? `${currentUser.profile.firstName || ''} ${currentUser.profile.lastName || ''}`.trim()
                  : currentUser?.user?.name || 'Admin';
                const avatarUrl = currentUser?.profile?.profileImage;
                if (avatarUrl) {
                  return `<img src="${avatarUrl}" style="width:100%; height:100%; border-radius:50%; object-fit:cover; background:white; display:block;" />`;
                }
                return (name || 'A').charAt(0).toUpperCase();
              })()}
            </div>
            <div class="sidebar-profile-text nav-text">
              <span id="sidebar-bottom-name" class="sidebar-profile-name">
                ${currentUser?.profile ? `${currentUser.profile.firstName || ''} ${currentUser.profile.lastName || ''}`.trim() : (currentUser?.user?.name || 'Admin')}
              </span>
              <span class="sidebar-profile-role">
                ${currentUser?.profile?.role === 'collector' ? 'Collector' : 'Admin'}
              </span>
            </div>
          </div>
          <div class="logout-action" title="Logout">
            <span class="material-icons-outlined">logout</span>
          </div>
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
    });
  }

  // Billing sub-items
  document.querySelectorAll('.nav-sub-item').forEach(item => {
    item.addEventListener('click', () => {
      const page = item.dataset.page;
      navigateFn(page);
    });
  });

  // Sidebar Floating Collapse Toggle
  const sidebar = document.getElementById('sidebar');
  const collapseBtn = document.getElementById('sidebar-collapse-btn');
  const mainContent = document.querySelector('.main-content');
  
  if (collapseBtn) {
    collapseBtn.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
      if (mainContent) {
        if (sidebar.classList.contains('collapsed')) {
          document.body.classList.add('sidebar-is-collapsed');
        } else {
          document.body.classList.remove('sidebar-is-collapsed');
        }
      }
    });
  }

  // Mobile toggle
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
