/**
 * Notifications Page — Full notifications list
 */
export function renderNotificationsPage() {
  return `
    <div class="notifications-page">
      <div class="card glass-card">
        <div class="card-header" style="padding: 20px 24px; border-bottom: 1px solid var(--border-color);">
          <span class="card-title">
            <span class="material-icons-outlined" style="font-size:20px; vertical-align:-4px; margin-right:8px; color:var(--accent-purple);">notifications</span>
            All Notifications
          </span>
          <div style="display:flex; gap:8px;">
            <button class="btn btn-ghost btn-sm" id="notifs-mark-all-read">
              <span class="material-icons-outlined" style="font-size:15px;">done_all</span>
              Mark all read
            </button>
            <button class="btn btn-ghost btn-sm" id="notifs-clear-all" style="color:var(--accent-rose); border-color:var(--accent-rose);">
              <span class="material-icons-outlined" style="font-size:15px;">delete_sweep</span>
              Clear all
            </button>
          </div>
        </div>

        <!-- Filter Tabs -->
        <div style="display:flex; gap:0; border-bottom:1px solid var(--border-color); padding: 0 16px;">
          <button class="notif-tab active" data-filter="all" id="tab-all">All</button>
          <button class="notif-tab" data-filter="unread" id="tab-unread">Unread <span class="notif-tab-badge" id="unread-count-badge"></span></button>
          <button class="notif-tab" data-filter="read" id="tab-read">Read</button>
        </div>

        <!-- Notifications List -->
        <div id="full-notif-list" style="min-height:300px;"></div>
      </div>
    </div>

    <style>
      .notifications-page { width: 100%; }
      .notif-tab {
        background: none;
        border: none;
        border-bottom: 2px solid transparent;
        padding: 12px 20px;
        font-size: 0.85rem;
        font-weight: 600;
        color: var(--text-muted);
        cursor: pointer;
        transition: all 0.2s;
        margin-bottom: -1px;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .notif-tab:hover { color: var(--text-primary); }
      .notif-tab.active {
        color: var(--accent-purple);
        border-bottom-color: var(--accent-purple);
      }
      .notif-tab-badge {
        background: var(--accent-purple);
        color: white;
        border-radius: 999px;
        font-size: 0.68rem;
        font-weight: 700;
        padding: 1px 6px;
        min-width: 18px;
        text-align: center;
      }
      .full-notif-item {
        display: flex;
        align-items: flex-start;
        gap: 14px;
        padding: 16px 24px;
        border-bottom: 1px solid var(--border-color);
        cursor: pointer;
        transition: background 0.15s;
        position: relative;
      }
      .full-notif-item:last-child { border-bottom: none; }
      .full-notif-item:hover { background: var(--bg-secondary); }
      .full-notif-item.unread { background: rgba(99,102,241,0.04); }
      .full-notif-item.unread::before {
        content: '';
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 3px;
        background: var(--accent-purple);
        border-radius: 0 3px 3px 0;
      }
      .full-notif-icon {
        width: 42px;
        height: 42px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        background: var(--bg-secondary);
      }
      .full-notif-content { flex: 1; min-width: 0; }
      .full-notif-text { font-size: 0.88rem; color: var(--text-primary); line-height: 1.5; }
      .full-notif-text strong { font-weight: 700; }
      .full-notif-meta {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-top: 4px;
      }
      .full-notif-time { font-size: 0.75rem; color: var(--text-muted); }
      .full-notif-unread-dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: var(--accent-purple);
        flex-shrink: 0;
      }
      .full-notif-dismiss {
        background: none;
        border: none;
        color: var(--text-muted);
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        opacity: 0;
        transition: opacity 0.15s;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .full-notif-item:hover .full-notif-dismiss { opacity: 1; }
      .full-notif-dismiss:hover { background: var(--bg-tertiary); color: var(--accent-rose); }
      .notif-page-empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 60px 24px;
        color: var(--text-muted);
        gap: 12px;
        text-align: center;
      }
      .notif-page-empty .material-icons-outlined { font-size: 3rem; opacity: 0.5; }
      .notif-page-empty p { font-size: 0.9rem; margin: 0; }
    </style>
  `;
}

const DEFAULT_NOTIFICATIONS = [
  { id: 1, icon: 'warning', color: 'var(--accent-rose)', text: '<strong>Juan Dela Cruz</strong> bill is overdue (Mar 15)', time: '2 hours ago', read: false },
  { id: 2, icon: 'credit_card', color: 'var(--accent-amber)', text: '<strong>Pedro Reyes</strong> has an unpaid bill of ₱699', time: '5 hours ago', read: false },
  { id: 3, icon: 'sync', color: 'var(--accent-purple)', text: '<strong>Ana Garcia</strong> submitted a payment confirmation', time: '1 day ago', read: false },
  { id: 4, icon: 'check_circle', color: 'var(--accent-emerald)', text: '<strong>Maria Santos</strong> payment received ₱1,499', time: '1 day ago', read: true },
  { id: 5, icon: 'person_add', color: 'var(--accent-blue)', text: 'New customer <strong>Elena Cruz</strong> added', time: '2 days ago', read: true },
];

function loadNotifications() {
  try {
    const saved = localStorage.getItem('wifi_admin_notifications');
    return saved ? JSON.parse(saved) : DEFAULT_NOTIFICATIONS;
  } catch {
    return DEFAULT_NOTIFICATIONS;
  }
}

function saveNotifications(notifications) {
  localStorage.setItem('wifi_admin_notifications', JSON.stringify(notifications));
}

export function initNotificationsPage() {
  let notifications = loadNotifications();
  let activeFilter = 'all';

  function getFiltered() {
    if (activeFilter === 'unread') return notifications.filter(n => !n.read);
    if (activeFilter === 'read') return notifications.filter(n => n.read);
    return notifications;
  }

  function renderList() {
    const container = document.getElementById('full-notif-list');
    if (!container) return;

    const filtered = getFiltered();
    const unreadCount = notifications.filter(n => !n.read).length;

    // Update badge
    const badge = document.getElementById('unread-count-badge');
    if (badge) {
      badge.textContent = unreadCount;
      badge.style.display = unreadCount > 0 ? 'inline-block' : 'none';
    }

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="notif-page-empty">
          <span class="material-icons-outlined">notifications_off</span>
          <p>${activeFilter === 'unread' ? 'No unread notifications' : activeFilter === 'read' ? 'No read notifications' : 'No notifications'}</p>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map(n => `
      <div class="full-notif-item ${n.read ? '' : 'unread'}" data-notif-id="${n.id}">
        <div class="full-notif-icon">
          <span class="material-icons-outlined" style="color:${n.color}; font-size:20px;">${n.icon}</span>
        </div>
        <div class="full-notif-content">
          <div class="full-notif-text">${n.text}</div>
          <div class="full-notif-meta">
            ${!n.read ? '<span class="full-notif-unread-dot"></span>' : ''}
            <span class="full-notif-time">${n.time}</span>
            ${!n.read ? '<span style="font-size:0.72rem; color:var(--accent-purple); font-weight:600;">Unread</span>' : ''}
          </div>
        </div>
        <button class="full-notif-dismiss" data-dismiss-id="${n.id}" title="Dismiss">
          <span class="material-icons-outlined" style="font-size:16px;">close</span>
        </button>
      </div>
    `).join('');

    // Click to mark as read
    container.querySelectorAll('.full-notif-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.closest('.full-notif-dismiss')) return;
        const id = parseInt(item.dataset.notifId);
        const notif = notifications.find(n => n.id === id);
        if (notif && !notif.read) {
          notif.read = true;
          saveNotifications(notifications);
          renderList();
        }
      });
    });

    // Dismiss buttons
    container.querySelectorAll('.full-notif-dismiss').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = parseInt(btn.dataset.dismissId);
        notifications = notifications.filter(n => n.id !== id);
        saveNotifications(notifications);
        renderList();
      });
    });
  }

  // Tab switching
  document.querySelectorAll('.notif-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.notif-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeFilter = tab.dataset.filter;
      renderList();
    });
  });

  // Mark all read
  const markAllBtn = document.getElementById('notifs-mark-all-read');
  if (markAllBtn) {
    markAllBtn.addEventListener('click', () => {
      notifications.forEach(n => n.read = true);
      saveNotifications(notifications);
      renderList();
      // Also sync header badge
      const headerBadge = document.getElementById('overdue-badge');
      if (headerBadge) headerBadge.style.display = 'none';
    });
  }

  // Clear all
  const clearAllBtn = document.getElementById('notifs-clear-all');
  if (clearAllBtn) {
    clearAllBtn.addEventListener('click', () => {
      if (confirm('Clear all notifications?')) {
        notifications = [];
        saveNotifications(notifications);
        renderList();
        const headerBadge = document.getElementById('overdue-badge');
        if (headerBadge) headerBadge.style.display = 'none';
      }
    });
  }

  renderList();
}
