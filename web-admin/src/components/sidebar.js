/**
 * Sidebar Component — Premium design with colored icon badges
 */
export function renderSidebar(activePage = 'dashboard', currentUser = null) {
  const billingPages = ['billing', 'billing_already_paid', 'billing_not_yet_paid', 'billing_overdue'];
  const isBillingActive = billingPages.includes(activePage);
  const isCustomerDetail = activePage.startsWith('customer_detail');

  return `
    <aside class="sidebar" id="sidebar">
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
      </div>

      <nav class="sidebar-nav" style="padding: 24px 16px;">
        <div class="nav-item ${activePage === 'dashboard' ? 'active' : ''}" data-page="dashboard">
          <span class="material-icons-outlined nav-icon">space_dashboard</span>
          <span>Dashboard</span>
        </div>

        <div class="nav-item ${activePage === 'customers' || isCustomerDetail ? 'active' : ''}" data-page="customers">
          <span class="material-icons-outlined nav-icon">groups</span>
          <span>Customers</span>
        </div>

        <!-- Billing with submenu -->
        <div class="nav-item ${isBillingActive ? 'active' : ''}" id="billing-toggle">
          <span class="material-icons-outlined nav-icon">receipt_long</span>
          <span>Billing</span>
          <span class="nav-chevron" id="billing-chevron" style="transition: transform 0.25s ease; margin-left:auto;${isBillingActive ? ' transform:rotate(180deg);' : ''}"><span class="material-icons-outlined" style="font-size:16px;">expand_more</span></span>
        </div>
        <div class="nav-submenu ${isBillingActive ? 'open' : ''}" id="billing-submenu">
          <div class="nav-sub-item ${activePage === 'billing' ? 'active' : ''}" data-page="billing">
            All Bills
          </div>
          <div class="nav-sub-item ${activePage === 'billing_already_paid' ? 'active' : ''}" data-page="billing_already_paid">
            Already Paid
          </div>
          <div class="nav-sub-item ${activePage === 'billing_not_yet_paid' ? 'active' : ''}" data-page="billing_not_yet_paid">
            Not Yet Paid
          </div>
          <div class="nav-sub-item ${activePage === 'billing_overdue' ? 'active' : ''}" data-page="billing_overdue">
            Overdue
          </div>
        </div>

        <div class="nav-item ${activePage === 'collectors' ? 'active' : ''}" data-page="collectors">
          <span class="material-icons-outlined nav-icon">badge</span>
          <span>Collectors</span>
        </div>

        <div class="nav-item ${activePage === 'technicians' ? 'active' : ''}" data-page="technicians">
          <span class="material-icons-outlined nav-icon">engineering</span>
          <span>Technicians</span>
        </div>


        <div class="nav-item ${activePage === 'plans' ? 'active' : ''}" data-page="plans">
          <span class="material-icons-outlined nav-icon">router</span>
          <span>WiFi Plans</span>
        </div>

        <div class="nav-item ${activePage === 'notifications' ? 'active' : ''}" data-page="notifications">
          <span class="material-icons-outlined nav-icon">notifications</span>
          <span>Notifications</span>
        </div>
      </nav>

      <div style="padding: 24px 16px; margin-top: auto;">
        <div class="sidebar-profile-pill" style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.05); border-radius: 14px; padding: 10px 14px; display:flex; align-items:center; gap:12px; transition: all 0.2s ease;" onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='rgba(255,255,255,0.06)'">
          <div id="sidebar-bottom-profile-btn" style="display:flex; align-items:center; gap:12px; flex-grow:1; cursor:pointer;" title="View Admin Profile">
            <div id="sidebar-bottom-avatar" style="width:38px; height:38px; border-radius:50%; flex-shrink:0; display:flex; align-items:center; justify-content:center; overflow:hidden; font-weight:bold; font-size:15px; background:linear-gradient(135deg, var(--accent-emerald, #10b981), var(--accent-teal, #14b8a6)); color:#fff; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
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
            <div style="display:flex; flex-direction:column; line-height:1.25; overflow:hidden; flex-grow:1;">
              <span id="sidebar-bottom-name" style="font-size:0.85rem; font-weight:600; color:#ffffff; white-space:nowrap; text-overflow:ellipsis; overflow:hidden;">
                ${currentUser?.profile ? `${currentUser.profile.firstName || ''} ${currentUser.profile.lastName || ''}`.trim() : (currentUser?.user?.name || 'Admin')}
              </span>
              <span style="font-size:0.7rem; font-weight: 500; color:rgba(255,255,255,0.5); margin-top:2px; white-space:nowrap; text-overflow:ellipsis; overflow:hidden;">
                ${currentUser?.profile?.role === 'collector' ? 'Collector' : 'Admin'} &mdash; ${currentUser?.user?.$id ? currentUser.user.$id.substring(0,4).toUpperCase() : '1974'}
              </span>
            </div>
          </div>
          <div class="logout-action" title="Logout" style="color:var(--accent-rose); cursor:pointer; display:flex; align-items:center; justify-content:center; padding:4px; border-radius:6px;" onmouseover="this.style.background='rgba(244,63,94,0.15)'" onmouseout="this.style.background='transparent'">
            <span class="material-icons-outlined" style="font-size:20px;">logout</span>
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
      billingChevron.style.transform = billingSubmenu.classList.contains('open') ? 'rotate(180deg)' : 'rotate(0deg)';
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
