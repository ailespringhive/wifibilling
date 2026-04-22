import { showConfirm } from '../components/ui-helpers.js';

/**
 * Notifications Page — Full notifications list
 */
import { databases, DATABASE_ID, Query, apiBypass } from '../config/appwrite.js';
export function renderNotificationsPage() {
  return `
    <div class="notifications-page">
      <div class="card glass-card">
        <div class="card-header" id="notif-card-header" style="padding: 20px 24px; border-bottom: 1px solid var(--border-color); position:relative; overflow:hidden;">
          
          <!-- Default Header View -->
          <div id="header-default-view" style="display:flex; justify-content:space-between; align-items:center; width:100%; transition:opacity 0.2s;">
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

          <!-- Selection Header View -->
          <div id="header-selection-view" style="display:none; justify-content:space-between; align-items:center; position:absolute; top:0; left:0; right:0; bottom:0; padding:20px 24px; z-index:10;">
            <div style="display:flex; align-items:center; gap:12px;">
              <button class="btn btn-ghost btn-sm" id="cancel-selection" style="padding:4px;">
                <span class="material-icons-outlined" style="font-size:20px;">close</span>
              </button>
              <span id="selection-count" style="font-weight:600; color:var(--text-primary);">0 selected</span>
            </div>
            <div style="display:flex; gap:8px;">
              <button class="btn btn-ghost btn-sm" id="selection-mark-read">
                <span class="material-icons-outlined" style="font-size:15px;">done</span> Mark read
              </button>
              <button class="btn btn-ghost btn-sm" id="selection-delete" style="color:var(--accent-rose); border-color:var(--accent-rose);">
                <span class="material-icons-outlined" style="font-size:15px;">delete</span> Delete
              </button>
            </div>
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

        <!-- View More -->
        <div id="view-more-container" class="view-more-container" style="display:none;">
          <button class="btn btn-ghost" id="view-more-btn" style="width:100%; border:1px dashed var(--border-color);">
            View More
          </button>
        </div>
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

      /* View More Button */
      .view-more-container {
        padding: 16px;
        text-align: center;
        border-top: 1px solid var(--border-color);
      }

      /* Selection Mode */
      .notif-checkbox {
        display: none;
        width: 18px;
        height: 18px;
        border-radius: 4px;
        border: 2px solid var(--border-color);
        background: transparent;
        appearance: none;
        cursor: pointer;
        position: relative;
        flex-shrink: 0;
        margin-top: 12px;
      }
      .notif-checkbox:checked {
        background: var(--accent-purple);
        border-color: var(--accent-purple);
      }
      .notif-checkbox:checked::after {
        content: '';
        position: absolute;
        left: 5px;
        top: 2px;
        width: 4px;
        height: 8px;
        border: solid white;
        border-width: 0 2px 2px 0;
        transform: rotate(45deg);
      }
      .selection-mode .notif-checkbox { display: block; }
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

// Fetch repair status update notifications from Appwrite
async function fetchRepairNotifications() {
  try {
    const res = await databases.listDocuments(DATABASE_ID, 'notifications', [
      Query.equal('type', ['status_update']),
      Query.orderDesc('$createdAt'),
      Query.limit(50)
    ]);
    const documents = res.documents || [];
    
    // We get local copy so we don't regress read status while background updates run
    const localCopy = loadNotifications();
    
    return documents.map(doc => {
      const localMatch = localCopy.find(n => n.id === doc.$id);
      const isRead = (localMatch && localMatch.read) || (doc.isRead === true);

      return {
        id: doc.$id,
        icon: doc.title?.includes('Resolved') ? 'check_circle' : 'engineering',
        color: doc.title?.includes('Resolved') ? 'var(--accent-emerald)' : 'var(--accent-blue)',
        text: `<strong>${doc.title}</strong> — ${doc.message}`,
        time: _timeAgo(doc.$createdAt),
        read: isRead,
        fromAppwrite: true,
      };
    });
  } catch (e) {
    console.warn('Failed to fetch repair notifications:', e);
    return [];
  }
}

function _timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export async function initNotificationsPage() {
  let notifications = loadNotifications();
  let activeFilter = 'all';
  let isExpanded = false;
  let selectionMode = false;
  let selectedIds = new Set();
  let pressTimer = null;
  const maxItems = 5;

  // Fetch repair status notifications from Appwrite and merge
  const repairNotifs = await fetchRepairNotifications();
  if (repairNotifs.length > 0) {
    // Remove previously merged Appwrite notifications (by fromAppwrite flag)
    notifications = notifications.filter(n => !n.fromAppwrite);
    // Add fresh ones at the top
    notifications = [...repairNotifs, ...notifications];
  }

  function getFiltered() {
    if (activeFilter === 'unread') return notifications.filter(n => !n.read);
    if (activeFilter === 'read') return notifications.filter(n => n.read);
    return notifications;
  }

  function renderList() {
    const container = document.getElementById('full-notif-list');
    const viewMoreContainer = document.getElementById('view-more-container');
    const viewMoreBtn = document.getElementById('view-more-btn');
    const headerDefault = document.getElementById('header-default-view');
    const headerSelection = document.getElementById('header-selection-view');
    const selectionCount = document.getElementById('selection-count');
    if (!container) return;

    if (selectionMode) {
      container.classList.add('selection-mode');
      if (headerDefault) headerDefault.style.opacity = '0';
      if (headerSelection) {
        headerSelection.style.display = 'flex';
        // Need to reflow for flex animation but inline display is fine
      }
      if (selectionCount) selectionCount.textContent = `${selectedIds.size} selected`;
    } else {
      container.classList.remove('selection-mode');
      if (headerDefault) headerDefault.style.opacity = '1';
      if (headerSelection) headerSelection.style.display = 'none';
      selectedIds.clear();
    }

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
      if (viewMoreContainer) viewMoreContainer.style.display = 'none';
      return;
    }

    const itemsToShow = isExpanded ? filtered : filtered.slice(0, maxItems);

    if (filtered.length > maxItems) {
      if (viewMoreContainer) viewMoreContainer.style.display = 'block';
      if (viewMoreBtn) viewMoreBtn.textContent = isExpanded ? 'View Less' : 'View More';
    } else {
      if (viewMoreContainer) viewMoreContainer.style.display = 'none';
    }

    container.innerHTML = itemsToShow.map(n => `
      <div class="full-notif-item ${n.read ? '' : 'unread'}" data-notif-id="${n.id}">
        <input type="checkbox" class="notif-checkbox" data-checkbox-id="${n.id}" ${selectedIds.has(String(n.id)) ? 'checked' : ''} tabindex="-1">
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
        <button class="full-notif-dismiss" data-dismiss-id="${n.id}" title="Dismiss" ${selectionMode ? 'style="display:none;"' : ''}>
          <span class="material-icons-outlined" style="font-size:16px;">close</span>
        </button>
      </div>
    `).join('');

    // Item Interaction
    container.querySelectorAll('.full-notif-item').forEach(item => {
      const id = item.dataset.notifId;

      // Handle long press to enter selection mode
      const startPress = () => {
        if (selectionMode) return;
        pressTimer = setTimeout(() => {
          selectionMode = true;
          selectedIds.add(String(id));
          renderList();
        }, 600); // 600ms = long press
      };

      const cancelPress = () => {
        if (pressTimer) clearTimeout(pressTimer);
      };

      item.addEventListener('mousedown', startPress);
      item.addEventListener('touchstart', startPress, { passive: true });
      
      item.addEventListener('mouseup', cancelPress);
      item.addEventListener('mouseleave', cancelPress);
      item.addEventListener('touchend', cancelPress);
      item.addEventListener('touchcancel', cancelPress);

      // Handle Click
      item.addEventListener('click', (e) => {
        if (e.target.closest('.full-notif-dismiss')) return;

        if (selectionMode) {
          // Toggle selection
          if (selectedIds.has(String(id))) {
            selectedIds.delete(String(id));
            if (selectedIds.size === 0) selectionMode = false; // exit if none selected
          } else {
            selectedIds.add(String(id));
          }
          renderList();
        } else {
          // Normal click (mark read)
          const notif = notifications.find(n => String(n.id) === String(id));
          if (notif && !notif.read) {
            notif.read = true;
            saveNotifications(notifications);
            renderList();
          }
        }
      });
    });

    // Dismiss buttons
    container.querySelectorAll('.full-notif-dismiss').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.dataset.dismissId;
        const notifToDelete = notifications.find(n => String(n.id) === String(id));
        
        notifications = notifications.filter(n => String(n.id) !== String(id));
        saveNotifications(notifications);
        renderList();

        if (notifToDelete && notifToDelete.fromAppwrite) {
          try {
            await apiBypass.deleteDocument('notifications', id);
          } catch (err) {
            console.warn('Failed to dismiss appwrite notification', err);
          }
        }
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
      // Find unread appwrite notifications BEFORE modifying UI state
      const appwriteNotifsToUpdate = notifications.filter(n => n.fromAppwrite && !n.read);

      // Setup UI optimistic update
      notifications.forEach(n => n.read = true);
      saveNotifications(notifications);
      renderList();
      const headerBadge = document.getElementById('overdue-badge');
      if (headerBadge) headerBadge.style.display = 'none';

      // Update Appwrite in background
      Promise.allSettled(
        appwriteNotifsToUpdate.map(n => apiBypass.updateDocument('notifications', n.id, { isRead: true }))
      ).catch(e => console.warn('Failed to update appwrite notification', e));
    });
  }

  // Clear all
  const clearAllBtn = document.getElementById('notifs-clear-all');
  if (clearAllBtn) {
    clearAllBtn.addEventListener('click', async () => {
      const confirmed = await showConfirm(
        'Are you sure you want to clear all notifications? This action cannot be undone.',
        { title: 'Clear Notifications?', confirmText: 'Yes, Clear All', type: 'danger' }
      );
      if (confirmed) {
        const appwriteNotifs = notifications.filter(n => n.fromAppwrite);
        
        // Optimistic UI update
        notifications = [];
        saveNotifications(notifications);
        renderList();
        const headerBadge = document.getElementById('overdue-badge');
        if (headerBadge) headerBadge.style.display = 'none';

        // Delete from Appwrite in background
        Promise.allSettled(
          appwriteNotifs.map(n => apiBypass.deleteDocument('notifications', n.id))
        ).catch(e => console.warn('Failed to delete appwrite notification', e));
      }
    });
  }

  // View More toggle
  const viewMoreBtn = document.getElementById('view-more-btn');
  if (viewMoreBtn) {
    viewMoreBtn.addEventListener('click', () => {
      isExpanded = !isExpanded;
      renderList();
    });
  }

  // Selection Header Actions
  const cancelSelBtn = document.getElementById('cancel-selection');
  const markReadSelBtn = document.getElementById('selection-mark-read');
  const deleteSelBtn = document.getElementById('selection-delete');

  if (cancelSelBtn) cancelSelBtn.addEventListener('click', () => {
    selectionMode = false;
    renderList();
  });

  if (markReadSelBtn) markReadSelBtn.addEventListener('click', () => {
    notifications.forEach(n => {
      if (selectedIds.has(String(n.id))) n.read = true;
    });
    selectionMode = false;
    saveNotifications(notifications);
    renderList();
  });

  if (deleteSelBtn) deleteSelBtn.addEventListener('click', async () => {
    const confirmed = await showConfirm(
      `Delete ${selectedIds.size} selected notifications?`,
      { title: 'Delete Notifications?', confirmText: 'Yes, Delete', type: 'danger' }
    );
    if (!confirmed) return;

    const toDeleteAppwrite = notifications.filter(n => selectedIds.has(String(n.id)) && n.fromAppwrite);
    
    // UI Update
    notifications = notifications.filter(n => !selectedIds.has(String(n.id)));
    selectionMode = false;
    saveNotifications(notifications);
    renderList();

    // Appwrite Deletions
    for (const n of toDeleteAppwrite) {
      try {
        await apiBypass.deleteDocument('notifications', n.id);
      } catch(e) {}
    }
  });

  renderList();
}
