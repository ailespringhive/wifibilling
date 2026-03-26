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
};

/**
 * Initialize the app
 */
async function init() {
  // Check for saved demo session first
  const savedSession = localStorage.getItem('wifi_admin_session');
  if (savedSession) {
    try {
      currentUser = JSON.parse(savedSession);
      isLoggedIn = true;
      navigateTo(currentPage);
      return;
    } catch (e) {
      localStorage.removeItem('wifi_admin_session');
    }
  }

  // Check if user is logged in via Appwrite (with timeout so demo mode works)
  try {
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000));
    const session = await Promise.race([services.auth.getCurrentUser(), timeout]);
    if (session && session.user) {
      currentUser = session;
      isLoggedIn = true;
      navigateTo(currentPage);
    } else {
      showLogin();
    }
  } catch (error) {
    showLogin();
  }
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
      currentUser = result;
      isLoggedIn = true;
      navigateTo('dashboard');
    } catch (error) {
      // Demo mode: allow demo login
      if (email === 'admin@demo.com' && password === 'demo1234') {
        currentUser = { user: { name: 'Demo Admin', email: 'admin@demo.com' }, profile: { firstName: 'Demo', lastName: 'Admin', role: 'admin' } };
        isLoggedIn = true;
        localStorage.setItem('wifi_admin_session', JSON.stringify(currentUser));
        navigateTo('dashboard');
      } else if (error.message && error.message.includes('Access denied')) {
        throw error;
      } else {
        // Try demo login hint
        throw new Error('Login failed. Use admin@demo.com / demo1234 for demo mode, or configure Appwrite for production.');
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
  const meta = PAGE_META[page] || { title: page, subtitle: '' };
  const app = document.getElementById('app');

  // Determine the actual page component to render
  const basePage = page.startsWith('billing') ? 'billing' : page;

  // Build layout
  let pageContent = '';
  switch (basePage) {
    case 'dashboard': pageContent = renderDashboardPage(); break;
    case 'customers': pageContent = renderCustomersPage(); break;
    case 'billing': pageContent = renderBillingPage(); break;
    case 'collectors': pageContent = renderCollectorsPage(); break;
    case 'plans': pageContent = renderPlansPage(); break;
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
      navigateTo('billing');
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
          <div class="modal-body">
            <div style="display:flex; align-items:center; gap:16px; margin-bottom:24px; padding:16px; background:var(--bg-secondary); border-radius:var(--radius-lg); border:1px solid var(--border-color);">
              <div style="width:56px; height:56px; border-radius:50%; background:linear-gradient(135deg, var(--accent-blue), var(--accent-cyan)); display:flex; align-items:center; justify-content:center; font-size:1.4rem; font-weight:700; color:white; flex-shrink:0;">
                ${firstName.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style="font-size:1.1rem; font-weight:700; color:var(--text-primary);">${firstName} ${lastName}</div>
                <div style="font-size:0.8rem; color:var(--text-muted);">${role.charAt(0).toUpperCase() + role.slice(1)}</div>
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
    case 'dashboard': initDashboardPage(services); break;
    case 'customers': initCustomersPage(services, navigateTo); break;
    case 'billing': initBillingPage(services, billingPreFilter); break;
    case 'collectors': initCollectorsPage(services); break;
    case 'plans': initPlansPage(services); break;
  }

  // Close mobile sidebar
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (sidebar) sidebar.classList.remove('open');
  if (overlay) overlay.classList.remove('active');
}

// Boot
init();
