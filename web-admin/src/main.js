/**
 * WiFi Billing Admin — Main Application Router
 */
import './styles/main.css';
import './styles/layout.css';
import './styles/components.css';
import './styles/pages.css';

// Services
import { AuthService } from './services/auth.service.js';
import { CustomerService } from './services/customer.service.js';
import { BillingService } from './services/billing.service.js';
import { CollectorService } from './services/collector.service.js';
import { PlanService } from './services/plan.service.js';
import { SubscriptionService } from './services/subscription.service.js';

// Components
import { renderSidebar, initSidebar } from './components/sidebar.js';
import { renderHeader } from './components/header.js';

// Pages
import { renderLoginPage, initLoginPage } from './pages/login.js';
import { renderDashboardPage, initDashboardPage } from './pages/dashboard.js';
import { renderCustomersPage, initCustomersPage } from './pages/customers.js';
import { renderBillingPage, initBillingPage } from './pages/billing.js';
import { renderCollectorsPage, initCollectorsPage } from './pages/collectors.js';
import { renderPlansPage, initPlansPage } from './pages/plans.js';
import { renderCustomerDetailPage, initCustomerDetailPage } from './pages/customer-detail.js';
import { renderCollectorDetailPage, initCollectorDetailPage } from './pages/collector-detail.js';
import { renderNotificationsPage, initNotificationsPage } from './pages/notifications.js';

// Bundle services
const services = {
  auth: AuthService,
  customer: CustomerService,
  billing: BillingService,
  collector: CollectorService,
  plan: PlanService,
  subscription: SubscriptionService,
};

// Current state
let currentPage = 'dashboard';
let isLoggedIn = false;
let currentUser = null;

// Page metadata
const PAGE_META = {
  dashboard: { title: 'Dashboard', subtitle: 'Overview of your WiFi billing system' },
  customers: { title: 'Customers', subtitle: 'Manage your customer accounts' },
  billing: { title: 'Billing', subtitle: 'Track payments and billing status' },
  billing_already_paid: { title: 'Billing — Already Paid', subtitle: 'Customers who have already paid' },
  billing_not_yet_paid: { title: 'Billing — Not Yet Paid', subtitle: 'Customers who have not yet paid' },
  billing_payment_confirmation: { title: 'Billing — Payment Confirmation', subtitle: 'Payments awaiting confirmation' },
  collectors: { title: 'Collectors', subtitle: 'Manage payment collectors' },
  plans: { title: 'WiFi Plans', subtitle: 'Manage your service plans & pricing' },
  notifications: { title: 'Notifications', subtitle: 'All system notifications & alerts' },
  customer_detail: { title: 'Customer Details', subtitle: 'View customer information & payment history' },
  collector_detail: { title: 'Collector Details', subtitle: 'View collector information & assigned customers' },
};

/**
 * Initialize the app
 */
async function init() {
  const isAdminPath = window.location.pathname.startsWith('/admin');

  // Check for saved demo session first
  const savedSession = localStorage.getItem('wifi_admin_session');
  if (savedSession) {
    try {
      currentUser = JSON.parse(savedSession);
      // If collector session is saved and we're NOT on /admin/, redirect to collector
      if (currentUser.profile && currentUser.profile.role === 'collector' && !isAdminPath) {
        window.location.href = '/collector/';
        return;
      }
      // If collector session on admin path, clear it and show admin login
      if (currentUser.profile && currentUser.profile.role === 'collector' && isAdminPath) {
        localStorage.removeItem('wifi_admin_session');
        showLogin();
        return;
      }
      isLoggedIn = true;
      navigateTo(currentPage);
      return;
    } catch (e) {
      localStorage.removeItem('wifi_admin_session');
    }
  }

  // No saved session — show login immediately (avoids hanging on Appwrite connection)
  showLogin();
}

/**
 * Show login page
 */
function showLogin() {
  isLoggedIn = false;
  const app = document.getElementById('app');
  app.innerHTML = renderLoginPage();
  initLoginPage(async (email, password) => {
    try {
      const result = await services.auth.login(email, password);
      const role = result.profile?.role;

      // Route based on role
      if (role === 'collector') {
        // Redirect to the collector mobile app
        window.location.href = '/collector/';
        return;
      }

      // Admin — stay on admin dashboard
      currentUser = result;
      isLoggedIn = true;
      navigateTo('dashboard');
    } catch (error) {
      // Demo mode: allow demo login for both roles
      if (email === 'admin@demo.com' && password === 'demo1234') {
        currentUser = { user: { name: 'Demo Admin', email: 'admin@demo.com' }, profile: { firstName: 'Demo', lastName: 'Admin', role: 'admin' } };
        isLoggedIn = true;
        localStorage.setItem('wifi_admin_session', JSON.stringify(currentUser));
        navigateTo('dashboard');
      } else if (email === 'collector@demo.com' && password === 'demo1234') {
        localStorage.setItem('wifi_admin_session', JSON.stringify({
          user: { name: 'Demo Collector', email: 'collector@demo.com' },
          profile: { firstName: 'Demo', lastName: 'Collector', role: 'collector' }
        }));
        window.location.href = '/collector/';
      } else {
        throw new Error(error.message || 'Login failed. Please check your credentials.');
      }
    }
  });
}

/**
 * Navigate to a page
 */
function navigateTo(page) {
  if (page === 'logout') {
    services.auth.logout().catch(() => {});
    localStorage.removeItem('wifi_admin_session');
    showLogin();
    return;
  }

  if (!isLoggedIn) {
    showLogin();
    return;
  }

  currentPage = page;

  // Extract base page and params (e.g., customer_detail:abc123)
  let basePage = page;
  let pageParam = null;
  if (page.includes(':')) {
    const parts = page.split(':');
    basePage = parts[0];
    pageParam = parts[1];
  } else if (page.startsWith('billing')) {
    basePage = 'billing';
  }

  const meta = PAGE_META[basePage] || { title: basePage, subtitle: '' };
  const app = document.getElementById('app');

  // Build layout
  let pageContent = '';
  switch (basePage) {
    case 'dashboard': pageContent = renderDashboardPage(); break;
    case 'customers': pageContent = renderCustomersPage(); break;
    case 'customer_detail': pageContent = renderCustomerDetailPage(); break;
    case 'billing': pageContent = renderBillingPage(); break;
    case 'collectors': pageContent = renderCollectorsPage(); break;
    case 'collector_detail': pageContent = renderCollectorDetailPage(); break;
    case 'plans': pageContent = renderPlansPage(); break;
    case 'notifications': pageContent = renderNotificationsPage(); break;
    default: pageContent = renderDashboardPage(); break;
  }

  app.innerHTML = `
    ${renderSidebar(page)}
    <main class="main-content">
      ${renderHeader(meta.title, meta.subtitle)}
      <div class="page-content">
        ${pageContent}
      </div>
    </main>
  `;

  // Init sidebar
  initSidebar(navigateTo);

  // Set user info in header
  if (currentUser) {
    const nameEl = document.getElementById('header-user-name');
    const avatarEl = document.getElementById('user-avatar');
    const dropdownName = document.getElementById('dropdown-name');
    const dropdownAvatar = document.getElementById('dropdown-avatar');
    const name = currentUser.profile
      ? `${currentUser.profile.firstName || ''} ${currentUser.profile.lastName || ''}`.trim()
      : currentUser.user?.name || 'Admin';
    if (nameEl) nameEl.textContent = name;
    if (avatarEl) avatarEl.textContent = name.charAt(0).toUpperCase();
    if (dropdownName) dropdownName.textContent = name;
    if (dropdownAvatar) dropdownAvatar.textContent = name.charAt(0).toUpperCase();
  }

  // Notification dropdown
  const notifDropdown = document.getElementById('header-notif-dropdown');
  const notifBtn = document.getElementById('header-notif-btn');
  const notifList = document.getElementById('notif-list');
  const badge = document.getElementById('overdue-badge');

  // Demo notifications — load from localStorage if available
  const defaultNotifs = [
    { id: 1, icon: 'warning', color: 'var(--accent-rose)', text: '<strong>Juan Dela Cruz</strong> bill is overdue (Mar 15)', time: '2 hours ago', read: false },
    { id: 2, icon: 'credit_card', color: 'var(--accent-amber)', text: '<strong>Pedro Reyes</strong> has an unpaid bill of ₱699', time: '5 hours ago', read: false },
    { id: 3, icon: 'sync', color: 'var(--accent-purple)', text: '<strong>Ana Garcia</strong> submitted a payment confirmation', time: '1 day ago', read: false },
    { id: 4, icon: 'check_circle', color: 'var(--accent-emerald)', text: '<strong>Maria Santos</strong> payment received ₱1,499', time: '1 day ago', read: true },
    { id: 5, icon: 'person_add', color: 'var(--accent-blue)', text: 'New customer <strong>Elena Cruz</strong> added', time: '2 days ago', read: true },
  ];

  let notifications;
  try {
    const saved = localStorage.getItem('wifi_admin_notifications');
    notifications = saved ? JSON.parse(saved) : defaultNotifs;
  } catch (e) {
    notifications = defaultNotifs;
  }

  function saveNotifications() {
    localStorage.setItem('wifi_admin_notifications', JSON.stringify(notifications));
  }

  function renderNotifications() {
    const unread = notifications.filter(n => !n.read).length;
    if (badge) {
      badge.textContent = unread;
      badge.style.display = unread > 0 ? 'inline-block' : 'none';
    }

    if (!notifList) return;
    if (notifications.length === 0) {
      notifList.innerHTML = '<div class="notif-empty"><span class="material-icons-outlined" style="font-size:2rem; display:block; margin-bottom:8px;">notifications_off</span>No notifications</div>';
      return;
    }

    notifList.innerHTML = notifications.map(n => `
      <div class="notif-item ${n.read ? '' : 'unread'}" data-notif-id="${n.id}">
        <div class="notif-item-icon" style="color:${n.color};"><span class="material-icons-outlined">${n.icon}</span></div>
        <div class="notif-item-content">
          <div class="notif-item-text">${n.text}</div>
          <div class="notif-item-time">${n.time}</div>
        </div>
      </div>
    `).join('');

    // Mark individual as read on click
    notifList.querySelectorAll('.notif-item').forEach(item => {
      item.addEventListener('click', () => {
        const id = parseInt(item.dataset.notifId);
        const notif = notifications.find(n => n.id === id);
        if (notif) notif.read = true;
        saveNotifications();
        renderNotifications();
      });
    });
  }

  renderNotifications();

  if (notifBtn && notifDropdown) {
    notifBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      notifDropdown.classList.toggle('open');
      // Close user dropdown if open
      userDropdown?.classList.remove('open');
    });
  }

  const markAllBtn = document.getElementById('mark-all-read-btn');
  if (markAllBtn) {
    markAllBtn.addEventListener('click', () => {
      notifications.forEach(n => n.read = true);
      saveNotifications();
      renderNotifications();
    });
  }

  const viewAllBtn = document.getElementById('view-all-notifs-btn');
  if (viewAllBtn) {
    viewAllBtn.addEventListener('click', () => {
      notifDropdown.classList.remove('open');
      userDropdown?.classList.remove('open');
      navigateTo('notifications');
    });
  }

  // User dropdown toggle
  const userDropdown = document.getElementById('header-user-dropdown');
  const userBtn = document.getElementById('header-user-btn');
  if (userBtn && userDropdown) {
    userBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      userDropdown.classList.toggle('open');
      // Close notif dropdown if open
      notifDropdown?.classList.remove('open');
    });
  }

  // Close all dropdowns on outside click
  document.addEventListener('click', () => {
    userDropdown?.classList.remove('open');
    notifDropdown?.classList.remove('open');
  });

  // Logout button
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => navigateTo('logout'));
  }

  // Profile modal
  const profileBtn = document.getElementById('profile-btn');
  if (profileBtn) {
    profileBtn.addEventListener('click', () => {
      userDropdown.classList.remove('open');
      showProfileModal();
    });
  }

  function showProfileModal() {
    // Get current profile data
    const profile = currentUser?.profile || {};
    const user = currentUser?.user || {};
    const firstName = profile.firstName || user.name?.split(' ')[0] || 'Admin';
    const lastName = profile.lastName || user.name?.split(' ').slice(1).join(' ') || '';
    const email = user.email || profile.email || 'admin@demo.com';
    const phone = profile.phone || '';
    const role = profile.role || 'admin';

    // Create modal
    const modalHTML = `
      <div class="modal-overlay active" id="profile-modal" style="z-index:300;">
        <div class="modal">
          <div class="modal-header">
            <h3>Admin Profile</h3>
            <button class="modal-close" id="close-profile-modal">✕</button>
          </div>
          <div class="modal-body-scroll">
            <div style="display:flex; align-items:center; gap:14px; margin-bottom:16px; padding:12px; background:var(--bg-secondary); border-radius:var(--radius-lg); border:1px solid var(--border-color);">
              <div style="width:48px; height:48px; border-radius:50%; background:linear-gradient(135deg, var(--accent-blue), var(--accent-cyan)); display:flex; align-items:center; justify-content:center; font-size:1.2rem; font-weight:700; color:white; flex-shrink:0;">
                ${firstName.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style="font-size:1rem; font-weight:700; color:var(--text-primary);">${firstName} ${lastName}</div>
                <div style="font-size:0.78rem; color:var(--text-muted);">${role.charAt(0).toUpperCase() + role.slice(1)}</div>
              </div>
            </div>
            <form id="profile-form">
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">First Name</label>
                  <input type="text" class="form-input" id="profile-firstName" value="${firstName}" placeholder="First name">
                </div>
                <div class="form-group">
                  <label class="form-label">Last Name</label>
                  <input type="text" class="form-input" id="profile-lastName" value="${lastName}" placeholder="Last name">
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Email</label>
                  <input type="email" class="form-input" id="profile-email" value="${email}" placeholder="admin@email.com">
                </div>
                <div class="form-group">
                  <label class="form-label">Phone</label>
                  <input type="tel" class="form-input" id="profile-phone" value="${phone}" placeholder="09XX XXX XXXX">
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Role</label>
                <select class="form-select" id="profile-role">
                  <option value="admin" ${role === 'admin' ? 'selected' : ''}>Administrator</option>
                  <option value="manager" ${role === 'manager' ? 'selected' : ''}>Manager</option>
                  <option value="staff" ${role === 'staff' ? 'selected' : ''}>Staff</option>
                </select>
              </div>
            </form>

            <!-- Password Change Section -->
            <div style="margin-top:14px; padding-top:14px; border-top:1px solid var(--border-color);">
              <div style="display:flex; align-items:center; gap:8px; margin-bottom:12px;">
                <span class="material-icons-outlined" style="font-size:16px; color:var(--accent-amber);">lock</span>
                <span style="font-size:0.88rem; font-weight:700; color:var(--text-primary);">Change Password</span>
              </div>
              <form id="password-form">
                <div class="form-group">
                  <label class="form-label">Current Password</label>
                  <input type="password" class="form-input" id="profile-current-password" placeholder="Enter current password">
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label class="form-label">New Password</label>
                    <input type="password" class="form-input" id="profile-new-password" placeholder="Enter new password">
                  </div>
                  <div class="form-group">
                    <label class="form-label">Confirm New Password</label>
                    <input type="password" class="form-input" id="profile-confirm-password" placeholder="Re-enter new password">
                  </div>
                </div>
                <button type="button" class="btn btn-ghost" id="change-password-btn" style="margin-top:4px; border-color:var(--accent-amber); color:var(--accent-amber);">
                  <span class="material-icons-outlined" style="font-size:16px;">vpn_key</span> Update Password
                </button>
              </form>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" id="cancel-profile-btn">Cancel</button>
            <button class="btn btn-primary" id="save-profile-btn">
              <span class="material-icons-outlined" style="font-size:16px;">save</span> Save Changes
            </button>
          </div>
        </div>
      </div>
    `;

    // Append modal to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Close handlers
    const modal = document.getElementById('profile-modal');
    document.getElementById('close-profile-modal').addEventListener('click', () => modal.remove());
    document.getElementById('cancel-profile-btn').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

    // Save handler
    document.getElementById('save-profile-btn').addEventListener('click', () => {
      const newFirstName = document.getElementById('profile-firstName').value.trim();
      const newLastName = document.getElementById('profile-lastName').value.trim();
      const newEmail = document.getElementById('profile-email').value.trim();
      const newPhone = document.getElementById('profile-phone').value.trim();
      const newRole = document.getElementById('profile-role').value;

      // Update current user
      currentUser.profile = {
        ...currentUser.profile,
        firstName: newFirstName,
        lastName: newLastName,
        email: newEmail,
        phone: newPhone,
        role: newRole,
      };
      currentUser.user = { ...currentUser.user, name: `${newFirstName} ${newLastName}`.trim(), email: newEmail };

      // Persist to localStorage
      localStorage.setItem('wifi_admin_session', JSON.stringify(currentUser));

      // Update header display
      const name = `${newFirstName} ${newLastName}`.trim();
      const headerName = document.getElementById('header-user-name');
      const headerAvatar = document.getElementById('user-avatar');
      if (headerName) headerName.textContent = name;
      if (headerAvatar) headerAvatar.textContent = name.charAt(0).toUpperCase();

      modal.remove();

      // Show success toast if available
      const toast = document.createElement('div');
      toast.className = 'toast toast-success';
      toast.textContent = 'Profile updated successfully!';
      toast.style.cssText = 'position:fixed;top:20px;right:20px;padding:12px 20px;background:var(--accent-emerald);color:white;border-radius:8px;font-size:0.85rem;font-weight:600;z-index:9999;animation:fadeIn 0.3s;';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    });

    // Change password handler
    document.getElementById('change-password-btn').addEventListener('click', async () => {
      const currentPw = document.getElementById('profile-current-password').value;
      const newPw = document.getElementById('profile-new-password').value;
      const confirmPw = document.getElementById('profile-confirm-password').value;

      if (!currentPw || !newPw || !confirmPw) {
        alert('Please fill in all password fields.');
        return;
      }
      if (newPw !== confirmPw) {
        alert('New passwords do not match.');
        return;
      }
      if (newPw.length < 8) {
        alert('New password must be at least 8 characters.');
        return;
      }

      const btn = document.getElementById('change-password-btn');
      btn.disabled = true;
      btn.textContent = 'Updating...';

      try {
        await services.auth.updatePassword(newPw, currentPw);
        const successToast = document.createElement('div');
        successToast.style.cssText = 'position:fixed;top:20px;right:20px;padding:12px 20px;background:var(--accent-emerald);color:white;border-radius:8px;font-size:0.85rem;font-weight:600;z-index:9999;animation:fadeIn 0.3s;';
        successToast.textContent = 'Password updated successfully!';
        document.body.appendChild(successToast);
        setTimeout(() => successToast.remove(), 3000);
        document.getElementById('password-form').reset();
      } catch (err) {
        alert('Failed to update password: ' + (err.message || 'Check your current password'));
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<span class="material-icons-outlined" style="font-size:16px;">vpn_key</span> Update Password';
      }
    });
  }

  // Init page-specific logic
  // For billing sub-pages, extract the filter from the page name
  const billingFilterMap = {
    billing_already_paid: 'already_paid',
    billing_not_yet_paid: 'not_yet_paid',
    billing_payment_confirmation: 'payment_confirmation',
  };
  const billingPreFilter = billingFilterMap[page] || null;

  switch (basePage) {
    case 'dashboard': initDashboardPage(services, navigateTo); break;
    case 'customers': initCustomersPage(services, navigateTo); break;
    case 'customer_detail': initCustomerDetailPage(services, navigateTo, pageParam); break;
    case 'billing': initBillingPage(services, billingPreFilter); break;
    case 'collectors': initCollectorsPage(services, navigateTo); break;
    case 'collector_detail': initCollectorDetailPage(services, navigateTo, pageParam); break;
    case 'plans': initPlansPage(services); break;
    case 'notifications': initNotificationsPage(); break;
  }

  // Fix 4: Wire up any "View All" / "data-page" buttons inside page content via event delegation
  const pageContentEl = document.querySelector('.page-content');
  if (pageContentEl) {
    pageContentEl.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-page]');
      if (btn) {
        const target = btn.dataset.page;
        if (target) navigateTo(target);
      }
    });
  }

  // Close mobile sidebar
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (sidebar) sidebar.classList.remove('open');
  if (overlay) overlay.classList.remove('active');
}

// Boot
init();
