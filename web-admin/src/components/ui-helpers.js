/**
 * Toast notification system
 */
let toastContainer = null;

function ensureContainer() {
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
  }
}

export function showToast(message, type = 'info', duration = 3500) {
  ensureContainer();
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  toast.innerHTML = `<span>${icons[type] || ''}</span><span>${message}</span>`;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(30px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/**
 * Modal helpers
 */
export function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add('active');
}

export function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.remove('active');
    // For static modals, removing .active fires the opacity & scale CSS transition.
    // The CSS pointer-events: none instantly blocks clicks, while the 0.4s transition plays out visually!
  }
}

/**
 * Status badge renderer
 */
export function statusBadge(status) {
  const map = {
    paid: { class: 'badge-paid', label: 'Paid' },
    unpaid: { class: 'badge-unpaid', label: 'Unpaid' },
    overdue: { class: 'badge-overdue', label: 'Overdue' },
    extended: { class: 'badge-extended', label: 'Extended' },
    no_pay_needed: { class: 'badge-no-pay', label: 'No Pay' },
    already_paid: { class: 'badge-paid', label: 'Already Paid' },
    archived_paid: { class: 'badge-paid', label: 'Already Paid' },
    not_yet_paid: { class: 'badge-unpaid', label: 'Not Yet Paid' },
    overdue: { class: 'badge-overdue', label: 'Overdue' },
    active: { class: 'badge-active', label: 'Active' },
    suspended: { class: 'badge-suspended', label: 'Suspended' },
    disconnected: { class: 'badge-suspended', label: 'Disconnected' },
  };
  const info = map[status] || { class: '', label: status };
  return `<span class="badge badge-dot ${info.class}">${info.label}</span>`;
}

/**
 * Format currency
 */
export function formatCurrency(amount) {
  return `₱${Number(amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
}

/**
 * Format date
 */
export function formatDate(dateStr, options = {}) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-PH', {
    year: 'numeric', month: 'short', day: 'numeric',
    ...options
  });
}

/**
 * Get initials from name
 */
export function getInitials(firstName, lastName) {
  return ((firstName?.[0] || '') + (lastName?.[0] || '')).toUpperCase() || '?';
}

/**
 * Loading skeleton rows
 */
export function skeletonRows(columns = 5, rows = 5) {
  let html = '';
  for (let r = 0; r < rows; r++) {
    html += '<tr>';
    for (let c = 0; c < columns; c++) {
      html += `<td><div class="skeleton" style="height:16px; width:${60 + Math.random()*40}%"></div></td>`;
    }
    html += '</tr>';
  }
  return html;
}

/**
 * Custom confirmation dialog — replaces native confirm()
 * Returns a Promise<boolean>
 */
export function showConfirm(message, { title = 'Confirm Action', confirmText = 'Yes, Delete', cancelText = 'Cancel', type = 'danger' } = {}) {
  return new Promise((resolve) => {
    const accentColor = type === 'danger' ? 'var(--accent-rose)' : 'var(--accent-amber)';
    const iconName = type === 'danger' ? 'warning' : 'help_outline';

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style.cssText = 'z-index:9000; display:flex; align-items:center; justify-content:center;';
    overlay.innerHTML = `
      <div style="
        background: var(--bg-secondary);
        border: 1px solid var(--glass-border);
        border-radius: 20px;
        padding: 32px;
        max-width: 420px;
        width: 90%;
        text-align: center;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        transform: scale(0.9);
        opacity: 0;
        transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      " id="confirm-dialog-box">
        <div style="
          width: 56px; height: 56px; border-radius: 50%;
          background: ${type === 'danger' ? 'rgba(244, 63, 94, 0.12)' : 'rgba(245, 158, 11, 0.12)'};
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 20px auto;
        ">
          <span class="material-icons-outlined" style="font-size: 28px; color: ${accentColor};">${iconName}</span>
        </div>
        <h3 style="font-size: 1.15rem; font-weight: 700; color: var(--text-primary); margin-bottom: 8px;">${title}</h3>
        <p style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 28px; line-height: 1.5;">${message}</p>
        <div style="display: flex; gap: 12px; justify-content: center;">
          <button id="confirm-cancel-btn" style="
            padding: 10px 24px; border-radius: 12px; font-weight: 600; font-size: 0.88rem;
            background: transparent; border: 1px solid var(--border-color); color: var(--text-secondary);
            cursor: pointer; font-family: inherit; transition: all 0.2s ease;
          ">${cancelText}</button>
          <button id="confirm-ok-btn" style="
            padding: 10px 24px; border-radius: 12px; font-weight: 600; font-size: 0.88rem;
            background: ${accentColor}; border: none; color: #fff;
            cursor: pointer; font-family: inherit; transition: all 0.2s ease;
          ">${confirmText}</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Animate in
    requestAnimationFrame(() => {
      overlay.classList.add('active');
      const box = document.getElementById('confirm-dialog-box');
      if (box) {
        box.style.transform = 'scale(1)';
        box.style.opacity = '1';
      }
    });

    const close = (result) => {
      const box = document.getElementById('confirm-dialog-box');
      if (box) {
        box.style.transform = 'scale(0.9)';
        box.style.opacity = '0';
      }
      overlay.classList.remove('active');
      setTimeout(() => overlay.remove(), 300);
      resolve(result);
    };

    document.getElementById('confirm-cancel-btn').addEventListener('click', () => close(false));
    document.getElementById('confirm-ok-btn').addEventListener('click', () => close(true));
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(false); });
  });
}
