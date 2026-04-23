/**
 * WiFi Billing Admin — Main Application Router
 */
import './styles/main.css';
import './styles/layout.css';
import './styles/components.css';
import './styles/pages.css';

// Services
import client, { databases, DATABASE_ID, Query, apiBypass, PROJECT_ID, ENDPOINT, API_KEY } from './config/appwrite.js';
import { AuthService } from './services/auth.service.js';
import { CustomerService } from './services/customer.service.js';
import { BillingService } from './services/billing.service.js';
import { CollectorService } from './services/collector.service.js';
import { PlanService } from './services/plan.service.js';
import { SubscriptionService } from './services/subscription.service.js';
import { MobileNotificationService } from './services/notification.service.js';

// Components
import { renderSidebar, initSidebar } from './components/sidebar.js';
import { renderHeader } from './components/header.js';
import { showToast } from './components/ui-helpers.js';

// Pages
import { renderLoginPage, initLoginPage } from './pages/login.js';
import { renderDashboardPage, initDashboardPage } from './pages/dashboard.js';
import { renderCustomersPage, initCustomersPage } from './pages/customers.js';
import { renderBillingPage, initBillingPage } from './pages/billing.js';
import { renderCollectorsPage, initCollectorsPage } from './pages/collectors.js';
import { renderPlansPage, initPlansPage } from './pages/plans.js';
import { renderCustomerDetailPage, initCustomerDetailPage } from './pages/customer-detail.js';
import { renderCollectorDetailPage, initCollectorDetailPage } from './pages/collector-detail.js';
import { renderTechniciansPage, initTechniciansPage } from './pages/technicians.js';
import { renderTicketsPage, initTicketsPage } from './pages/tickets.js';
import { renderNotificationsPage, initNotificationsPage } from './pages/notifications.js';

// Bundle services
const services = {
  auth: AuthService,
  customer: CustomerService,
  billing: BillingService,
  collector: CollectorService,
  plan: PlanService,
  subscription: SubscriptionService,
  mobileNotification: MobileNotificationService,
};

// Auto-billing: run once per browser session on first dashboard load
let _autoBillingRan = false;
function triggerAutoBilling() {
  if (_autoBillingRan) return;
  if (sessionStorage.getItem('autoBillingDone')) {
    _autoBillingRan = true;
    return;
  }
  _autoBillingRan = true;
  sessionStorage.setItem('autoBillingDone', '1');
  
  // Fire-and-forget in background
  BillingService.autoGenerateBills().then(result => {
    if (result.generated > 0) {
      console.log(`[AutoBilling] Auto-generated ${result.generated} billing record(s) on dashboard load.`);
    }
  }).catch(err => {
    console.warn('[AutoBilling] Background auto-billing failed:', err);
  });
}

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
  billing_overdue: { title: 'Billing — Overdue', subtitle: 'Bills past their due date' },
  collectors: { title: 'Collectors', subtitle: 'Manage payment collectors' },
  plans: { title: 'WiFi Plans', subtitle: 'Manage your service plans & pricing' },
  technicians: { title: 'Technicians', subtitle: 'Manage repair technicians' },
  tickets: { title: 'Tickets', subtitle: 'Manage repair and support tickets' },
  notifications: { title: 'Notifications', subtitle: 'All system notifications & alerts' },
  customer_detail: { title: 'Customer Details', subtitle: 'View customer information & payment history' },
  collector_detail: { title: 'Collector Details', subtitle: 'View collector information & assigned customers' },
};

/**
 * Initialize the app
 */
async function init() {
  // Initialize Theme Tracking
  const savedTheme = localStorage.getItem('wifi_admin_theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  document.body.setAttribute('data-theme', savedTheme);
  document.body.classList.toggle('dark-theme', savedTheme === 'dark');

  const isAdminPath = window.location.pathname.startsWith('/admin');

  // ── Force-login: clear ALL session state so login screen always shows ──
  // Triggered when navigating from the public /report/ page via ?force_login=1
  if (new URLSearchParams(window.location.search).get('force_login') === '1') {
    localStorage.removeItem('wifi_admin_session');
    // Also destroy Appwrite cookie session (fire-and-forget)
    services.auth.logout().catch(() => {});
    // Clean the URL so a page refresh won't re-trigger this
    window.history.replaceState({}, '', window.location.pathname);
    showLogin();
    return;
  }

  // FAST PATH: Check localStorage first for instant UI (no network call)
  const savedSession = localStorage.getItem('wifi_admin_session');
  if (savedSession) {
    try {
      currentUser = JSON.parse(savedSession);
      if (currentUser.profile && currentUser.profile.role === 'collector' && isAdminPath) {
        localStorage.removeItem('wifi_admin_session');
        showLogin();
        return;
      }
      isLoggedIn = true;
      navigateTo(currentPage);

      // Validate Appwrite session in background (non-blocking)
      services.auth.getCurrentUser().then(existing => {
        if (existing && existing.user && existing.profile) {
          currentUser = existing;
          localStorage.setItem('wifi_admin_session', JSON.stringify(currentUser));
        }
      }).catch(() => { /* localStorage session is fine as fallback */ });
      return;
    } catch (e) {
      localStorage.removeItem('wifi_admin_session');
    }
  }

  // No localStorage — try Appwrite session (requires network)
  try {
    const existing = await services.auth.getCurrentUser();
    if (existing && existing.user && existing.profile) {
      const role = existing.profile.role;
      if (role === 'collector' && isAdminPath) {
        await services.auth.logout();
        localStorage.removeItem('wifi_admin_session');
        showLogin();
        return;
      }
      if (role === 'collector' && !isAdminPath) {
        window.location.href = '/collector/';
        return;
      }
      currentUser = existing;
      isLoggedIn = true;
      localStorage.setItem('wifi_admin_session', JSON.stringify(currentUser));
      navigateTo(currentPage);
      return;
    }
  } catch (_) { /* no active Appwrite session */ }

  // No session — show login
  showLogin();
}

/**
 * Show login page
 */
function showLogin() {
  isLoggedIn = false;
  localStorage.removeItem('wifi_admin_session');
  const app = document.getElementById('app');
  app.innerHTML = renderLoginPage();
  initLoginPage(async (email, password) => {
    try {
      const result = await services.auth.login(email, password);
      const role = result.profile?.role;

      // Route based on role
      if (role === 'collector') {
        localStorage.setItem('wifi_admin_session', JSON.stringify(result));
        window.location.href = '/collector/';
        return;
      }

      // Admin — stay on admin dashboard
      currentUser = result;
      isLoggedIn = true;
      localStorage.setItem('wifi_admin_session', JSON.stringify(currentUser));
      navigateTo('dashboard');
    } catch (error) {
      throw new Error(error.message || 'Login failed. Please check your credentials.');
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
    case 'technicians': pageContent = renderTechniciansPage(); break;
    case 'tickets': pageContent = renderTicketsPage(); break;
    case 'plans': pageContent = renderPlansPage(); break;
    case 'notifications': pageContent = renderNotificationsPage(); break;
    default: pageContent = renderDashboardPage(); break;
  }

  app.innerHTML = `
    ${renderSidebar(page, currentUser)}
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
    const sidebarBottomAvatar = document.getElementById('sidebar-bottom-avatar');
    const sidebarBottomName = document.getElementById('sidebar-bottom-name');

    const name = currentUser.profile
      ? `${currentUser.profile.firstName || ''} ${currentUser.profile.lastName || ''}`.trim()
      : currentUser.user?.name || 'Admin';
    const avatarUrl = currentUser.profile?.profileImage;

    if (nameEl) nameEl.textContent = name;
    if (dropdownName) dropdownName.textContent = name;
    
    // Update dashboard header title to "Welcome, Name"
    if (currentPage === 'dashboard') {
      const dynTitle = document.getElementById('header-dynamic-title');
      if (dynTitle) dynTitle.textContent = `Welcome, ${name.split(' ')[0]}`;
    }

    const renderHeaderAvatar = (el) => {
      if (!el) return;
      if (avatarUrl) {
        el.innerHTML = `<img src="${avatarUrl}" style="width:100%; height:100%; border-radius:50%; object-fit:cover; background:white; display:block;" />`;
        el.style.background = 'transparent';
      } else {
        el.innerHTML = name.charAt(0).toUpperCase();
        el.style.background = 'linear-gradient(135deg, var(--accent-blue), var(--accent-cyan))';
      }
    };

    renderHeaderAvatar(avatarEl);
    renderHeaderAvatar(dropdownAvatar);
    renderHeaderAvatar(sidebarBottomAvatar);
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
  // Fetch repair status notifications from Appwrite
  async function fetchRepairNotifs() {
    try {
      const res = await databases.listDocuments(DATABASE_ID, 'notifications', [
        Query.equal('type', ['status_update']),
        Query.orderDesc('$createdAt'),
        Query.limit(20)
      ]);
      const docs = res.documents || [];

      // Fetch a global snapshot of all profiles to build ID and Name dictionaries
      // This heals historically broken notifications sent by mobile apps with hardcoded IDs
      const profilesRes = await databases.listDocuments(DATABASE_ID, 'users_profile', [Query.limit(200)]);
      const profileMap = {};
      const nameMap = {};
      profilesRes.documents.forEach(p => {
        profileMap[p.userId] = p;
        profileMap[p.$id] = p;
        const fullName = `${(p.firstName || '').toLowerCase()} ${(p.lastName || '')}`.trim().toLowerCase();
        nameMap[fullName] = p;
        // Also map just the first names or combined aliases if needed
        nameMap[`${(p.firstName || '').toLowerCase()}`.trim()] = p;
      });

      const repairNotifs = docs.map(doc => {
        const diff = Date.now() - new Date(doc.$createdAt).getTime();
        const mins = Math.floor(diff / 60000);
        let timeStr;
        if (mins < 60) timeStr = `${mins}m ago`;
        else if (mins < 1440) timeStr = `${Math.floor(mins/60)}h ago`;
        else timeStr = `${Math.floor(mins/1440)}d ago`;

        const localMatch = notifications.find(n => n.id === doc.$id);
        const isRead = (localMatch && localMatch.read) || (doc.isRead === true);
        const senderId = doc.senderId || doc.collectorId || doc.technicianId;
        let senderProfile = senderId ? (profileMap[senderId] || null) : null;
        
        // Fallback: If mobile app posted a hardcoded ID, extract name from message and cross-reference our nameMap!
        // Example: "Jerald niii updated repair for..."
        if (!senderProfile && doc.message) {
          const match = doc.message.match(/^(.+?) (updated|resolved|collected)/i);
          if (match) {
            const extractedName = match[1].trim().toLowerCase();
            senderProfile = nameMap[extractedName] || null;
          }
        }
        
        let initials = null;
        if (senderProfile && (senderProfile.firstName || senderProfile.lastName)) {
          initials = ((senderProfile.firstName?.[0] || '') + (senderProfile.lastName?.[0] || '')).toUpperCase();
        } else if (doc.message) {
          // Absolute last resort fallback parsing from natural language message
          const words = doc.message.replace(/[^a-zA-Z ]/g, "").split(' ').filter(Boolean);
          if (words.length >= 2) initials = (words[0][0] + words[1][0]).toUpperCase();
        }

        // Determine icon and color based on notification title
        let icon = 'engineering';
        let color = 'var(--accent-blue)';
        if (doc.title?.includes('Payment Received') || doc.title?.includes('Payment')) {
          icon = 'payments';
          color = 'var(--accent-emerald)';
        } else if (doc.title?.includes('Resolved')) {
          icon = 'check_circle';
          color = 'var(--accent-emerald)';
        }

        return {
          id: doc.$id,
          icon,
          color,
          text: `<strong>${doc.title || 'Update'}</strong> — ${doc.message || ''}`,
          time: timeStr,
          read: isRead,
          fromAppwrite: true,
          senderImage: senderProfile?.profileImage || senderProfile?.image || null,
          initials: initials,
        };
      });
      if (repairNotifs.length > 0) {
        notifications = [...repairNotifs, ...notifications.filter(n => !n.fromAppwrite)];
        saveNotifications();
        renderNotifications();
      }
    } catch (e) {
      console.warn('Could not fetch appwrite notifications', e);
    }
  }

  // Set up realtime sync for new notifications
  try {
    client.subscribe(`databases.${DATABASE_ID}.collections.notifications.documents`, response => {
      // Any new document triggers a re-fetch
      if (response.events.includes('databases.*.collections.*.documents.*.create')) {
        fetchRepairNotifs();
      }
    });
  } catch (e) {
    console.warn('Could not subscribe to realtime', e);
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

    notifList.innerHTML = notifications.map(n => {
      let avatarHtml;
      if (n.senderImage) {
        avatarHtml = `<img src="${n.senderImage}" style="width:36px; height:36px; border-radius:50%; object-fit:cover; flex-shrink:0; border:2px solid ${n.color}; background: var(--bg-secondary);" />`;
      } else if (n.initials) {
        avatarHtml = `<div style="width:36px; height:36px; border-radius:50%; background:linear-gradient(135deg, ${n.color}, var(--bg-secondary)); color:white; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:14px; flex-shrink:0; border:2px solid rgba(255,255,255,0.1); text-shadow: 0 1px 3px rgba(0,0,0,0.5);">${n.initials}</div>`;
      } else {
        avatarHtml = `<div class="notif-item-icon" style="color:${n.color};"><span class="material-icons-outlined">${n.icon}</span></div>`;
      }

      return `
      <div class="notif-item ${n.read ? '' : 'unread'}" data-notif-id="${n.id}">
        ${avatarHtml}
        <div class="notif-item-content">
          <div class="notif-item-text">${n.text}</div>
          <div class="notif-item-time">${n.time}</div>
        </div>
      </div>`;
    }).join('');

    // Mark individual as read on click
    notifList.querySelectorAll('.notif-item').forEach(item => {
      item.addEventListener('click', () => {
        const id = item.dataset.notifId;
        const notif = notifications.find(n => String(n.id) === String(id));
        if (notif) notif.read = true;
        saveNotifications();
        renderNotifications();
      });
    });
  }

  renderNotifications();
  fetchRepairNotifs();

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
      // Extract the ones that actually need updating BEFORE making them read
      const appwriteNotifsToUpdate = notifications.filter(n => n.fromAppwrite && !n.read);

      notifications.forEach(n => n.read = true);
      saveNotifications();
      renderNotifications();

      // Also update Appwrite notifications so the notifications page stays in sync
      Promise.allSettled(
        appwriteNotifsToUpdate.map(n => apiBypass.updateDocument('notifications', n.id, { isRead: true }))
      ).catch(e => console.warn('Failed to mark appwrite notification as read:', e));
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

  // Logout buttons (Header & Sidebar)
  document.querySelectorAll('.logout-action').forEach(btn => {
    btn.addEventListener('click', () => navigateTo('logout'));
  });

  // Profile modal
  const profileBtn = document.getElementById('profile-btn');
  if (profileBtn) {
    profileBtn.addEventListener('click', () => {
      userDropdown.classList.remove('open');
      showProfileModal();
    });
  }
  
  const sidebarProfileBtn = document.getElementById('sidebar-bottom-profile-btn');
  if (sidebarProfileBtn) {
    sidebarProfileBtn.addEventListener('click', () => {
      const sidebar = document.getElementById('sidebar');
      const overlay = document.getElementById('sidebar-overlay');
      if (sidebar) sidebar.classList.remove('open');
      if (overlay) overlay.classList.remove('active');
      showProfileModal();
    });
  }

  // Theme Toggle Listener (Header)
  const themeToggle = document.getElementById('theme-toggle');
  const sidebarThemeToggle = document.getElementById('sidebar-theme-toggle-btn');
  const currentTheme = localStorage.getItem('wifi_admin_theme') || 'light';
  
  if (themeToggle) {
    themeToggle.checked = currentTheme === 'dark';
    themeToggle.addEventListener('change', (e) => toggleTheme(e.target.checked ? 'dark' : 'light'));
  }
  
  if (sidebarThemeToggle) {
    sidebarThemeToggle.addEventListener('click', () => {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      toggleTheme(isDark ? 'light' : 'dark');
      if (themeToggle) themeToggle.checked = !isDark;
    });
  }

  function toggleTheme(newTheme) {
    document.documentElement.classList.add('theme-transitioning');
    console.log('[Theme] Toggled to:', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    document.body.setAttribute('data-theme', newTheme);
    document.body.classList.toggle('dark-theme', newTheme === 'dark');
    localStorage.setItem('wifi_admin_theme', newTheme);
    
    // Manage active state of new sidebar buttons visually if needed
    // (We handle colors via CSS variables primarily)
    
    setTimeout(() => {
      document.documentElement.classList.remove('theme-transitioning');
    }, 50);
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

    const initial = firstName.charAt(0).toUpperCase();
    const fullName = `${firstName} ${lastName}`.trim();
    const activeAvatar = profile.profileImage || null;

    const AVATAR_OPTIONS = [
      'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&backgroundColor=b6e3f4',
      'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka&backgroundColor=c0aede',
      'https://api.dicebear.com/7.x/avataaars/svg?seed=Jack&backgroundColor=ffdfbf',
      'https://api.dicebear.com/7.x/avataaars/svg?seed=Lily&backgroundColor=d1d4f9',
      'https://api.dicebear.com/7.x/avataaars/svg?seed=Chloe&backgroundColor=ffd5dc',
      'https://api.dicebear.com/7.x/avataaars/svg?seed=Leo&backgroundColor=c0ebba',
      'https://api.dicebear.com/7.x/avataaars/svg?seed=Nolan&backgroundColor=fbe7c6',
      'https://api.dicebear.com/7.x/avataaars/svg?seed=Arthur&backgroundColor=b4d1c6',
    ];

    let selectedAvatarUrl = activeAvatar;

    function renderSidebarAvatar(url) {
      if (url) {
        return `<img src="${url}" style="width: 72px; height: 72px; border-radius: 50%; border: 3px solid var(--accent-blue); object-fit: cover; margin: 0 auto 16px auto; display: block; background:white;" />`;
      }
      return `<div style="width: 72px; height: 72px; border-radius: 50%; background: linear-gradient(135deg, var(--accent-blue), var(--accent-cyan)); display: flex; align-items: center; justify-content: center; font-size: 28px; font-weight: 700; color: white; margin: 0 auto 16px auto;">${initial}</div>`;
    }

    // Create modal
    const modalHTML = `
      <div class="modal-overlay" id="profile-modal" style="z-index:9999;">
        <div class="modal" style="max-width: 900px; width: 90%; padding: 0; background: var(--bg-secondary); overflow: hidden; height: 80vh; max-height: 700px; display: flex; flex-direction: column;">
          <div class="modal-header" style="border-bottom: 1px solid var(--border-color); padding: 16px 24px;">
            <h3 style="font-size: 1.1rem; font-weight: 700; color: var(--text-primary); margin: 0;">Admin Profile</h3>
            <button class="modal-close" id="close-profile-modal" style="margin-top: -5px; padding: 5px;">✕</button>
          </div>
          <div style="display: flex; flex-direction: row; flex: 1; overflow: hidden; position: relative;">
            
            <!-- Sidebar -->
            <aside style="width: 280px; border-right: 1px solid var(--border-color); display: flex; flex-direction: column; background: var(--bg-card);">
              <div style="padding: 32px 24px 24px 24px; text-align: center;">
                <div id="sidebar-avatar-container" title="Click to change avatar" style="position:relative; cursor: pointer; display: inline-block; transition: transform 0.2s;">
                  ${renderSidebarAvatar(activeAvatar)}
                  <div style="position:absolute; bottom:16px; right:0; width:26px; height:26px; background:var(--accent-blue); border-radius:50%; border:2px solid var(--bg-card); display:flex; align-items:center; justify-content:center; color:#fff; box-shadow:0 2px 4px rgba(0,0,0,0.2);">
                    <span class="material-icons-outlined" style="font-size:14px;">photo_camera</span>
                  </div>
                </div>
                <h2 style="font-size: 1.1rem; font-weight: 700; color: var(--text-primary); margin: 0 0 4px 0;">${fullName}</h2>
                <span style="font-size: 0.85rem; color: var(--text-muted); font-weight: 500;">${role.charAt(0).toUpperCase() + role.slice(1)}</span>
              </div>
              <nav style="display: flex; flex-direction: column; gap: 8px; padding: 0 16px;">
                <a href="javascript:void(0)" class="nav-item active" id="modal-nav-personal" style="border-radius: 8px;">
                  <span class="material-icons-outlined">person</span> Personal Information
                </a>
                <a href="javascript:void(0)" class="nav-item" id="modal-nav-password" style="border-radius: 8px;">
                  <span class="material-icons-outlined">lock</span> Password
                </a>
              </nav>
            </aside>

            <!-- Main Content -->
            <main style="flex: 1; padding: 32px; overflow-y: auto; background: var(--bg-secondary);">
              
              <div id="modal-tab-personal" style="display: block;">
                <h3 style="font-size: 1.25rem; font-weight: 700; color: var(--text-primary); margin: 0 0 24px 0;">Personal Information</h3>
                
                <div class="form-group" style="margin-bottom: 24px; display: none; overflow: hidden;" id="avatar-picker-section">
                  <label style="color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 12px; display: block;">Profile Avatar</label>
                  <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;" id="avatar-picker-container">
                    <div class="avatar-option" data-avatar="" style="width: 50px; height: 50px; border-radius: 50%; cursor: pointer; transition: transform 0.2s; border: 2px solid ${!activeAvatar ? 'var(--accent-amber)' : 'transparent'};">
                      <div style="width:100%; height:100%; border-radius:50%; background: linear-gradient(135deg, var(--accent-blue), var(--accent-cyan)); display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 700; color: white;">${initial}</div>
                    </div>
                    ${AVATAR_OPTIONS.map(url => `
                      <div class="avatar-option" data-avatar="${url}" style="width: 50px; height: 50px; border-radius: 50%; cursor: pointer; transition: transform 0.2s; border: 2px solid ${activeAvatar === url ? 'var(--accent-amber)' : 'transparent'}; background:white;">
                        <img src="${url}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;" />
                      </div>
                    `).join('')}
                    <!-- Custom upload button -->
                    <div id="avatar-upload-btn" style="width: 50px; height: 50px; border-radius: 50%; cursor: pointer; border: 2px dashed var(--border-color); display: flex; align-items: center; justify-content: center; transition: all 0.2s;" onmouseover="this.style.borderColor='var(--accent-amber)'" onmouseout="this.style.borderColor='var(--border-color)'" title="Upload Custom Avatar">
                      <span class="material-icons-outlined" style="font-size:24px; color:var(--text-muted);">file_upload</span>
                    </div>
                    <!-- Avatar Builder Button -->
                    <div id="avatar-builder-btn" style="height: 50px; border-radius: 25px; padding: 0 16px; cursor: pointer; border: 2px dashed var(--accent-emerald); display: flex; align-items: center; justify-content: center; transition: all 0.2s; gap: 6px; background: rgba(16, 185, 129, 0.05);" onmouseover="this.style.background='rgba(16, 185, 129, 0.15)'" onmouseout="this.style.background='rgba(16, 185, 129, 0.05)'" title="Open Avatar Builder">
                      <span class="material-icons-outlined" style="font-size:20px; color:var(--accent-emerald);">face_retouching_natural</span>
                      <span style="font-size: 0.8rem; font-weight: 600; color:var(--accent-emerald);">Avatar Builder</span>
                    </div>
                  </div>
                </div>

                <form id="profile-form">
                  <div class="form-row" style="gap: 20px; margin-bottom: 20px;">
                    <div class="form-group" style="flex: 1;">
                      <label style="color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 8px; display: block;">First Name</label>
                      <input type="text" class="form-input" id="profile-firstName" value="${firstName}" style="background: var(--bg-input); border: 1px solid var(--border-color); border-radius: 10px; width: 100%;">
                    </div>
                    <div class="form-group" style="flex: 1;">
                      <label style="color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 8px; display: block;">Last Name</label>
                      <input type="text" class="form-input" id="profile-lastName" value="${lastName}" style="background: var(--bg-input); border: 1px solid var(--border-color); border-radius: 10px; width: 100%;">
                    </div>
                  </div>
                  <div class="form-row" style="gap: 20px; margin-bottom: 20px;">
                    <div class="form-group" style="flex: 1; position: relative;">
                      <label style="color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 8px; display: block;">Email</label>
                      <input type="email" class="form-input" id="profile-email" value="${email}" style="background: var(--bg-input); border: 1px solid var(--border-color); border-radius: 10px; width: 100%; padding-right: 90px;">
                      <span style="position: absolute; right: 14px; top: 38px; color: var(--accent-emerald); font-size: 0.75rem; font-weight: 600; display: flex; align-items: center; gap: 4px;"><span class="material-icons-outlined" style="font-size: 14px;">check_circle</span> Verified</span>
                    </div>
                    <div class="form-group" style="flex: 1;">
                      <label style="color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 8px; display: block;">Phone</label>
                      <input type="tel" class="form-input" id="profile-phone" value="${phone}" placeholder="09XX XXX XXXX" style="background: var(--bg-input); border: 1px solid var(--border-color); border-radius: 10px; width: 100%;">
                    </div>
                  </div>
                  <div class="form-group" style="margin-bottom: 32px;">
                    <label style="color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 8px; display: block;">Role</label>
                    <select class="form-select" id="profile-role" style="background: var(--bg-input); border: 1px solid var(--border-color); border-radius: 10px; width: 100%;">
                      <option value="admin" ${role === 'admin' ? 'selected' : ''}>Administrator</option>
                      <option value="manager" ${role === 'manager' ? 'selected' : ''}>Manager</option>
                      <option value="staff" ${role === 'staff' ? 'selected' : ''}>Staff</option>
                    </select>
                  </div>
                  <div style="display: flex; justify-content: flex-end; gap: 12px;">
                    <button type="button" class="btn btn-ghost" id="cancel-profile-btn" style="border: 1px solid var(--border-color); border-radius: 10px; padding: 10px 24px;">Cancel</button>
                    <button type="button" class="btn btn-primary" id="save-profile-btn" style="background: var(--accent-amber); border-color: var(--accent-amber); color: #000; border-radius: 10px; padding: 10px 32px;">Save Changes</button>
                  </div>
                </form>
              </div>

              <div id="modal-tab-password" style="display: none;">
                <h3 style="font-size: 1.25rem; font-weight: 700; color: var(--text-primary); margin: 0 0 8px 0;">Password</h3>
                <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 24px;">Update your admin account password. You'll need to enter your current password for security.</p>
                <form id="password-form">
                  <div class="form-group" style="margin-bottom: 20px;">
                    <label style="color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 8px; display: block;">Current Password</label>
                    <input type="password" class="form-input" id="profile-current-password" placeholder="Enter current password" style="background: var(--bg-input); border: 1px solid var(--border-color); border-radius: 10px; width: 100%;">
                  </div>
                  <div class="form-row" style="gap: 20px; margin-bottom: 32px;">
                    <div class="form-group" style="flex: 1;">
                      <label style="color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 8px; display: block;">New Password</label>
                      <input type="password" class="form-input" id="profile-new-password" placeholder="Minimum 8 characters" style="background: var(--bg-input); border: 1px solid var(--border-color); border-radius: 10px; width: 100%;">
                    </div>
                    <div class="form-group" style="flex: 1;">
                      <label style="color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 8px; display: block;">Confirm New Password</label>
                      <input type="password" class="form-input" id="profile-confirm-password" placeholder="Repeat new password" style="background: var(--bg-input); border: 1px solid var(--border-color); border-radius: 10px; width: 100%;">
                    </div>
                  </div>
                  <div style="display: flex; justify-content: flex-end;">
                    <button type="button" class="btn btn-primary" id="change-password-btn" style="background: var(--accent-amber); border-color: var(--accent-amber); color: #000; border-radius: 10px; padding: 10px 32px;">Update Password</button>
                  </div>
                </form>
              </div>

            </main>
          </div>
        </div>
      </div>
    `;

    // Append modal to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modal = document.getElementById('profile-modal');
    
    // Sidebar Avatar Click Toggle
    const sideAvatar = document.getElementById('sidebar-avatar-container');
    const pickerSec = document.getElementById('avatar-picker-section');
    if (sideAvatar && pickerSec) {
      sideAvatar.addEventListener('mouseenter', () => sideAvatar.style.transform = 'scale(1.05)');
      sideAvatar.addEventListener('mouseleave', () => sideAvatar.style.transform = 'scale(1)');
      sideAvatar.addEventListener('click', () => {
        // Ensure Personal Info tab is active
        const navP = document.getElementById('modal-nav-personal');
        const tabP = document.getElementById('modal-tab-personal');
        const navPw = document.getElementById('modal-nav-password');
        const tabPw = document.getElementById('modal-tab-password');
        if (navP) navP.classList.add('active');
        if (navPw) navPw.classList.remove('active');
        if (tabP) tabP.style.display = 'block';
        if (tabPw) tabPw.style.display = 'none';

        // Toggle visibility
        if (pickerSec.style.display === 'none') {
          pickerSec.style.display = 'block';
          // Small scroll animation if needed
          setTimeout(() => pickerSec.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
        } else {
          pickerSec.style.display = 'none';
        }
      });
    }

    // Custom Upload Logic
    const avatarUploadBtn = document.getElementById('avatar-upload-btn');
    const avatarUploadInput = document.getElementById('avatar-upload-input');
    if (avatarUploadBtn && avatarUploadInput) {
      avatarUploadBtn.addEventListener('click', () => avatarUploadInput.click());
      avatarUploadInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const dataUrl = await new Promise(res => { const r = new FileReader(); r.onload=ev=>res(ev.target.result); r.readAsDataURL(file); });
        const container = document.getElementById('avatar-picker-container');
        
        const newEl = document.createElement('div');
        newEl.className = 'avatar-option';
        newEl.dataset.avatar = dataUrl;
        newEl.style.cssText = 'width: 50px; height: 50px; flex-shrink: 0; border-radius: 50%; cursor: pointer; transition: transform 0.2s; border: 2px solid var(--accent-amber); background:white;';
        newEl.innerHTML = `<img src="${dataUrl}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;" />`;
        
        container.querySelectorAll('.avatar-option').forEach(o => o.style.borderColor = 'transparent');
        container.insertBefore(newEl, avatarUploadBtn);
        
        selectedAvatarUrl = dataUrl;
        const sideC = document.getElementById('sidebar-avatar-container');
        if (sideC) sideC.innerHTML = renderSidebarAvatar(selectedAvatarUrl);
        
        newEl.addEventListener('click', () => {
          container.querySelectorAll('.avatar-option').forEach(o => o.style.borderColor = 'transparent');
          newEl.style.borderColor = 'var(--accent-amber)';
          selectedAvatarUrl = newEl.dataset.avatar;
          if (sideC) sideC.innerHTML = renderSidebarAvatar(selectedAvatarUrl);
        });

        const uploadSpinner = document.createElement('div');
        uploadSpinner.style.cssText = 'position:absolute; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; border-radius:50%;';
        uploadSpinner.innerHTML = '<span class="spinner" style="width:20px;height:20px;border-width:2px;border-color:white;border-right-color:transparent;"></span>';
        newEl.style.position = 'relative';
        newEl.appendChild(uploadSpinner);

        try {
          const formData = new FormData();
          formData.append('fileId', 'unique()');
          formData.append('file', file);
          formData.append('permissions[]', 'read("any")');
          const res = await fetch(`${ENDPOINT}/storage/buckets/customer_images/files`, {
            method: 'POST',
            headers: { 'X-Appwrite-Project': PROJECT_ID, 'X-Appwrite-Key': API_KEY },
            body: formData
          });
          if(res.ok) {
             const uData = await res.json();
             const realUrl = `${ENDPOINT}/storage/buckets/customer_images/files/${uData.$id}/view?project=${PROJECT_ID}`;
             newEl.dataset.avatar = realUrl;
             if (selectedAvatarUrl === dataUrl) selectedAvatarUrl = realUrl;
          } else {
             showToast('Image upload failed to finish', 'error');
          }
        } catch(err) {
          showToast('Image upload error', 'error');
        } finally {
          if (uploadSpinner.parentNode) uploadSpinner.parentNode.removeChild(uploadSpinner);
        }
      });
    }

    // Native Avatar Builder Logic
    const builderBtn = document.getElementById('avatar-builder-btn');
    if (builderBtn) {
      builderBtn.addEventListener('click', () => {
        let state = {
          seed: currentUser?.user?.name || 'Admin',
          gender: 'male',
          top: 'shortFlat',
          facialHair: '',
          hairColor: '2c1b18',
          skinColor: 'f8d25c',
          clothing: 'blazerAndShirt',
          clothingColor: '3c4f5c',
          mouth: 'smile',
          eyes: 'happy'
        };

        const topsMale = ['shortFlat', 'shortRound', 'shortWaved', 'sides', 'frizzle', 'dreads01', 'dreads02', 'shaggy'];
        const topsFemale = ['bigHair', 'bob', 'bun', 'curly', 'straight01', 'straight02'];
        const facialHairs = ['', 'beardMedium', 'beardLight', 'beardMajestic', 'moustaceMagnum', 'moustacheFancy'];
        const hairColors = ['2c1b18', 'd6b370', 'a55728', 'c93305', '000000', 'e8e1e1'];
        const skinColors = ['f8d25c', 'ffdbb4', 'edb98a', 'd08b5b', 'ae5d29', '614335'];
        const clothesMale = ['blazerAndShirt', 'blazerAndSweater', 'collarAndSweater', 'graphicShirt', 'hoodie', 'shirtCrewNeck', 'shirtVNeck'];
        const clothesFemale = ['blazerAndShirt', 'blazerAndSweater', 'graphicShirt', 'hoodie', 'overall', 'shirtCrewNeck', 'shirtScoopNeck', 'shirtVNeck'];

        function getUrl() {
          return `https://api.dicebear.com/7.x/avataaars/svg?seed=${state.seed}&top=${state.top}&facialHair=${state.facialHair}&hairColor=${state.hairColor}&skinColor=${state.skinColor}&clothing=${state.clothing}&clothingColor=${state.clothingColor}&mouth=${state.mouth}&eyes=${state.eyes}&backgroundColor=b6e3f4`;
        }

        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; z-index:10000; background:rgba(0,0,0,0.7); display:flex; align-items:center; justify-content:center; animation: fade-in 0.2s forwards; backdrop-filter:blur(4px);';
        
        const modal = document.createElement('div');
        modal.style.cssText = 'width:90%; max-width:400px; background:var(--bg-card); border-radius:24px; overflow:hidden; display:flex; flex-direction:column; box-shadow:0 24px 48px rgba(0,0,0,0.2);';

        // Header
        const header = document.createElement('div');
        header.style.cssText = 'padding:16px 24px; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-color);';
        header.innerHTML = `
          <h3 style="margin:0; font-size:1.1rem; color:var(--text-primary);"><span class="material-icons-outlined" style="vertical-align:middle; margin-right:8px; color:var(--accent-amber);">face_retouching_natural</span> Avatar Builder</h3>
          <button id="builder-close" style="background:none; border:none; color:var(--text-muted); cursor:pointer;"><span class="material-icons-outlined">close</span></button>
        `;

        // Gender Toggle
        const genderToggle = document.createElement('div');
        genderToggle.style.cssText = 'padding: 12px 24px; background:var(--bg-card); display:flex; gap:12px; justify-content:center; border-bottom:1px solid var(--border-color);';
        genderToggle.innerHTML = `
          <button id="gender-male" style="flex:1; padding:8px; border-radius:8px; border:2px solid var(--accent-blue); background:rgba(59,130,246,0.1); color:var(--accent-blue); font-weight:bold; cursor:pointer; transition:all 0.2s;">Male</button>
          <button id="gender-female" style="flex:1; padding:8px; border-radius:8px; border:2px solid transparent; background:var(--bg-input); color:var(--text-secondary); font-weight:bold; cursor:pointer; transition:all 0.2s;">Female</button>
        `;

        // Preview Area
        const preview = document.createElement('div');
        preview.style.cssText = 'padding:24px; background:var(--bg-secondary); display:flex; justify-content:center;';
        preview.innerHTML = `<img id="builder-img" src="${getUrl()}" style="width:120px; height:120px; border-radius:50%; background:white; box-shadow:0 8px 24px rgba(0,0,0,0.1);" />`;

        // Tabs
        const tabs = document.createElement('div');
        tabs.style.cssText = 'display:flex; border-bottom:1px solid var(--border-color); overflow-x:auto; scrollbar-width:none;';
        
        function getTabList() {
          return state.gender === 'male' 
            ? ['Hairstyle', 'Facial Hair', 'Hair Color', 'Skin Color', 'Outfit']
            : ['Hairstyle', 'Hair Color', 'Skin Color', 'Outfit'];
        }
        let activeTab = 'Hairstyle';
        
        const optionsArea = document.createElement('div');
        optionsArea.style.cssText = 'padding:20px; height:220px; overflow-y:auto; display:flex; flex-wrap:wrap; gap:12px; align-content:flex-start;';

        function renderOptions() {
          optionsArea.innerHTML = '';
          let list = [];
          let key = '';
          if (activeTab === 'Hairstyle') { list = state.gender === 'male' ? topsMale : topsFemale; key = 'top'; }
          else if (activeTab === 'Facial Hair') { list = facialHairs; key = 'facialHair'; }
          else if (activeTab === 'Hair Color') { list = hairColors; key = 'hairColor'; }
          else if (activeTab === 'Skin Color') { list = skinColors; key = 'skinColor'; }
          else if (activeTab === 'Outfit') { list = state.gender === 'male' ? clothesMale : clothesFemale; key = 'clothing'; }

          if (list.length === 0) return;

          list.forEach(val => {
            const isActive = state[key] === val;
            
            const wrapper = document.createElement('div');
            wrapper.style.cssText = 'display:flex; flex-direction:column; align-items:center; gap:6px; cursor:pointer; width:64px;';

            const btn = document.createElement('div');
            // Make the tile look like the screenshot: soft rounded rects, light grey bg
            btn.style.cssText = `width:100%; height:64px; border-radius:16px; display:flex; align-items:center; justify-content:center; border: 2px solid ${isActive ? 'var(--accent-blue)' : 'transparent'}; background:${isActive ? 'rgba(59,130,246,0.05)' : 'var(--bg-input)'}; transition:all 0.2s; overflow:hidden; position:relative;`;
            
            if (activeTab.includes('Color')) {
              const colorCircle = document.createElement('div');
              colorCircle.style.cssText = `width:40px; height:40px; border-radius:50%; background:#${val}; border:2px solid rgba(0,0,0,0.1);`;
              btn.appendChild(colorCircle);
            } else {
              const miniTop = activeTab === 'Hairstyle' ? val : state.top;
              const miniFacial = activeTab === 'Facial Hair' ? val : state.facialHair;
              const miniClothes = activeTab === 'Outfit' ? val : state.clothing;
              
              const miniUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${state.seed}&top=${miniTop}&facialHair=${miniFacial}&hairColor=${state.hairColor}&skinColor=${state.skinColor}&clothing=${miniClothes}&clothingColor=${state.clothingColor}&mouth=${state.mouth}&eyes=${state.eyes}&backgroundColor=transparent`;
              
              // Extremely specific zooms to isolate the hair or outfit exactly like the screenshot
              let zoomLevel = 'width:180%; height:180%; margin-top:-50px;';
              if (activeTab === 'Hairstyle') zoomLevel = 'width:260%; height:260%; margin-top:80px;';
              if (activeTab === 'Facial Hair') zoomLevel = 'width:250%; height:250%; margin-top:10px;';
              
              if (val === '' && activeTab === 'Facial Hair') {
                btn.innerHTML = '<span class="material-icons-outlined" style="color:var(--text-muted); font-size:28px;">do_not_disturb</span>';
              } else {
                btn.innerHTML = `<img src="${miniUrl}" style="pointer-events:none; ${zoomLevel} object-fit:cover; object-position:top;" />`;
              }
            }

            const check = document.createElement('div');
            check.innerHTML = isActive ? '&#10003;' : '';
            check.style.cssText = `color: ${isActive ? 'var(--accent-blue)' : 'transparent'}; font-size: 14px; font-weight: 900; line-height: 1; height: 14px; transition: color 0.2s;`;

            wrapper.onclick = () => {
              state[key] = val;
              document.getElementById('builder-img').src = getUrl();
              renderOptions();
            };
            
            wrapper.appendChild(btn);
            wrapper.appendChild(check);
            optionsArea.appendChild(wrapper);
          });
        }

        function renderTabs() {
          tabs.innerHTML = '';
          getTabList().forEach(t => {
            const btn = document.createElement('button');
            const isActive = activeTab === t;
            btn.innerText = t;
            btn.style.cssText = `padding:12px 16px; background:none; border:none; cursor:pointer; font-weight:600; font-size:0.85rem; color:${isActive ? 'var(--accent-amber)' : 'var(--text-muted)'}; border-bottom:3px solid ${isActive ? 'var(--accent-amber)' : 'transparent'}; transition:all 0.2s; white-space:nowrap;`;
            btn.onclick = () => { activeTab = t; renderTabs(); renderOptions(); };
            tabs.appendChild(btn);
          });
        }

        function updateGenderUI() {
          const btnM = document.getElementById('gender-male');
          const btnF = document.getElementById('gender-female');
          if (state.gender === 'male') {
            btnM.style.border = '2px solid var(--accent-blue)';
            btnM.style.background = 'rgba(59,130,246,0.1)';
            btnM.style.color = 'var(--accent-blue)';
            btnF.style.border = '2px solid transparent';
            btnF.style.background = 'var(--bg-input)';
            btnF.style.color = 'var(--text-secondary)';
          } else {
            btnF.style.border = '2px solid var(--accent-rose)';
            btnF.style.background = 'rgba(244,63,94,0.1)';
            btnF.style.color = 'var(--accent-rose)';
            btnM.style.border = '2px solid transparent';
            btnM.style.background = 'var(--bg-input)';
            btnM.style.color = 'var(--text-secondary)';
          }
          document.getElementById('builder-img').src = getUrl();
          activeTab = 'Hairstyle';
          renderTabs();
          renderOptions();
        }

        // Footer Done
        const footer = document.createElement('div');
        footer.style.cssText = 'padding:16px 24px; border-top:1px solid var(--border-color); display:flex; justify-content:flex-end;';
        const doneBtn = document.createElement('button');
        doneBtn.innerText = 'Save Avatar';
        doneBtn.style.cssText = 'padding:10px 24px; background:var(--accent-amber); color:#000; font-weight:700; border:none; border-radius:12px; cursor:pointer;';
        
        doneBtn.onclick = () => {
          const finalUrl = getUrl();
          document.body.removeChild(overlay);
          
          const container = document.getElementById('avatar-picker-container');
          const newEl = document.createElement('div');
          newEl.className = 'avatar-option';
          newEl.dataset.avatar = finalUrl;
          newEl.style.cssText = 'width: 50px; height: 50px; flex-shrink: 0; border-radius: 50%; cursor: pointer; transition: transform 0.2s; border: 2px solid var(--accent-amber); background:white;';
          newEl.innerHTML = `<img src="${finalUrl}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;" />`;
          
          container.querySelectorAll('.avatar-option').forEach(o => o.style.borderColor = 'transparent');
          container.insertBefore(newEl, avatarUploadBtn);
          
          selectedAvatarUrl = finalUrl;
          const sideC = document.getElementById('sidebar-avatar-container');
          if (sideC) sideC.innerHTML = renderSidebarAvatar(selectedAvatarUrl);
          
          newEl.addEventListener('click', () => {
            container.querySelectorAll('.avatar-option').forEach(o => o.style.borderColor = 'transparent');
            newEl.style.borderColor = 'var(--accent-amber)';
            selectedAvatarUrl = newEl.dataset.avatar;
            if (sideC) sideC.innerHTML = renderSidebarAvatar(selectedAvatarUrl);
          });
        };

        footer.appendChild(doneBtn);
        modal.appendChild(header);
        modal.appendChild(genderToggle);
        modal.appendChild(preview);
        modal.appendChild(tabs);
        modal.appendChild(optionsArea);
        modal.appendChild(footer);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        document.getElementById('builder-close').onclick = () => document.body.removeChild(overlay);
        
        document.getElementById('gender-male').onclick = () => { 
          state.gender = 'male'; 
          state.top = topsMale[0];
          state.facialHair = '';
          state.clothing = clothesMale[0];
          updateGenderUI(); 
        };
        document.getElementById('gender-female').onclick = () => { 
          state.gender = 'female'; 
          state.top = topsFemale[0];
          state.facialHair = '';
          state.clothing = clothesFemale[0];
          updateGenderUI(); 
        };

        updateGenderUI();
      });
    }

    // Avatar Selection Logic
    document.querySelectorAll('.avatar-option').forEach(opt => {
      opt.addEventListener('click', () => {
        // Remove selection outline from all
        document.querySelectorAll('.avatar-option').forEach(o => o.style.borderColor = 'transparent');
        // Add to clicked
        opt.style.borderColor = 'var(--accent-amber)';
        
        selectedAvatarUrl = opt.dataset.avatar || null;
        
        // Update sidebar preview immediately
        const sideC = document.getElementById('sidebar-avatar-container');
        if (sideC) sideC.innerHTML = renderSidebarAvatar(selectedAvatarUrl);
      });
    });

    // Force a DOM reflow so the browser registers the initial opacity:0 state
    void modal.offsetWidth;

    // Trigger entrance animation
    modal.classList.add('active');

    // ── Tab Switching ──
    const navPersonal = document.getElementById('modal-nav-personal');
    const navPassword = document.getElementById('modal-nav-password');
    const tabPersonal = document.getElementById('modal-tab-personal');
    const tabPassword = document.getElementById('modal-tab-password');

    if (navPersonal && navPassword && tabPersonal && tabPassword) {
      navPersonal.addEventListener('click', () => {
        navPersonal.classList.add('active');
        navPassword.classList.remove('active');
        tabPersonal.style.display = 'block';
        tabPassword.style.display = 'none';
      });

      navPassword.addEventListener('click', () => {
        navPassword.classList.add('active');
        navPersonal.classList.remove('active');
        tabPassword.style.display = 'block';
        tabPersonal.style.display = 'none';
      });
    }

    // Helper to close with animation
    const closeModal = () => {
      modal.classList.remove('active');
      setTimeout(() => modal.remove(), 400);
    };

    // Close handlers
    document.getElementById('close-profile-modal').addEventListener('click', closeModal);
    document.getElementById('cancel-profile-btn').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

    // Save handler
    document.getElementById('save-profile-btn').addEventListener('click', async () => {
      const btn = document.getElementById('save-profile-btn');
      const originalText = btn.innerHTML;
      
      const newFirstName = document.getElementById('profile-firstName').value.trim();
      const newLastName = document.getElementById('profile-lastName').value.trim();
      const newEmail = document.getElementById('profile-email').value.trim();
      const newPhone = document.getElementById('profile-phone').value.trim();
      const newRole = document.getElementById('profile-role').value;

      if (!newFirstName || !newEmail) {
        showToast('First Name and Email are required.', 'error');
        return;
      }

      btn.disabled = true;
      btn.innerHTML = '<span class="spinner" style="width:16px;height:16px;border-width:2px;margin-right:8px;"></span> Saving...';

      try {
        const updateData = {
          firstName: newFirstName,
          lastName: newLastName,
          email: newEmail,
          phone: newPhone,
          role: newRole,
          profileImage: selectedAvatarUrl
        };

        // 1. Update in Database
        if (profile.$id) {
          await services.auth.updateUserProfile(profile.$id, updateData);
        }

        // 2. Update local state
        currentUser.profile = { ...currentUser.profile, ...updateData };
        currentUser.user = { 
          ...currentUser.user, 
          name: `${newFirstName} ${newLastName}`.trim(), 
          email: newEmail 
        };

        // 3. Persist to localStorage
        localStorage.setItem('wifi_admin_session', JSON.stringify(currentUser));

        // 4. Update UI instantly
        const name = `${newFirstName} ${newLastName}`.trim();
        const headerName = document.getElementById('header-user-name');
        const headerAvatar = document.getElementById('user-avatar');
        const dropdownName = document.getElementById('dropdown-name');
        const dropdownAvatar = document.getElementById('dropdown-avatar');
        const sidebarBottomAvatar = document.getElementById('sidebar-bottom-avatar');
        const sidebarBottomName = document.getElementById('sidebar-bottom-name');
        
        if (headerName) headerName.textContent = name;
        if (dropdownName) dropdownName.textContent = name;
        if (sidebarBottomName) sidebarBottomName.textContent = name;
        
        if (currentPage === 'dashboard') {
          const dynTitle = document.getElementById('header-dynamic-title');
          if (dynTitle) dynTitle.textContent = `Welcome, ${newFirstName}`;
        }

        const refreshAvatar = (el) => {
          if (!el) return;
          if (selectedAvatarUrl) {
            el.innerHTML = `<img src="${selectedAvatarUrl}" style="width:100%; height:100%; border-radius:50%; object-fit:cover; background:white; display:block;" />`;
            el.style.background = 'transparent';
          } else {
            el.innerHTML = name.charAt(0).toUpperCase();
            el.style.background = 'linear-gradient(135deg, var(--accent-blue), var(--accent-cyan))';
          }
        };

        refreshAvatar(headerAvatar);
        refreshAvatar(dropdownAvatar);
        refreshAvatar(sidebarBottomAvatar);

        closeModal();
        showToast('Profile updated successfully!', 'success');
      } catch (err) {
        console.error('Profile update failed:', err);
        showToast('Failed to save profile to database.', 'error');
      } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
      }
    });

    // Change password handler
    document.getElementById('change-password-btn').addEventListener('click', async (e) => {
      const currentPw = document.getElementById('profile-current-password').value;
      const newPw = document.getElementById('profile-new-password').value;
      const confirmPw = document.getElementById('profile-confirm-password').value;

      if (!currentPw || !newPw || !confirmPw) {
        showToast('Please fill in all password fields.', 'error');
        return;
      }
      if (newPw !== confirmPw) {
        showToast('New passwords do not match.', 'error');
        return;
      }
      if (newPw.length < 8) {
        showToast('New password must be at least 8 characters.', 'error');
        return;
      }

      const btn = document.getElementById('change-password-btn');
      const originalText = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<span class="material-icons-outlined" style="font-size:16px;">hourglass_empty</span> Updating...';

      try {
        await services.auth.updatePassword(newPw, currentPw);
        showToast('Password updated successfully!', 'success');
        document.getElementById('password-form').reset();
      } catch (err) {
        showToast('Failed to update password: ' + (err.message || 'Check your current password'), 'error');
      } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
      }
    });
  }

  // Init page-specific logic
  // For billing sub-pages, extract the filter from the page name
  const billingFilterMap = {
    billing_already_paid: 'already_paid',
    billing_not_yet_paid: 'not_yet_paid',
    billing_overdue: 'overdue',
  };
  const billingPreFilter = billingFilterMap[page] || null;

  switch (basePage) {
    case 'dashboard': initDashboardPage(services, navigateTo); triggerAutoBilling(); break;
    case 'customers': initCustomersPage(services, navigateTo); break;
    case 'customer_detail': initCustomerDetailPage(services, navigateTo, pageParam); break;
    case 'billing': initBillingPage(services, billingPreFilter); break;
    case 'collectors': initCollectorsPage(services, navigateTo); break;
    case 'collector_detail': initCollectorDetailPage(services, navigateTo, pageParam); break;
    case 'technicians': initTechniciansPage(services, navigateTo); break;
    case 'tickets': initTicketsPage(services, navigateTo); break;
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
