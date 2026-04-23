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
    pending: { class: 'badge-unpaid', label: 'Pending' },
    in_progress: { class: 'badge-active', label: 'In Progress' },
    resolved: { class: 'badge-paid', label: 'Resolved' },
    cancelled: { class: 'badge-suspended', label: 'Cancelled' },
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
 * Custom Alert Dialog — replaces native alert()
 * Supports 5 animation types: 'success', 'error', 'warning', 'info', 'loading'
 */
export function showAlert(message, { title, buttonText = 'OK', type = 'info' } = {}) {
  return new Promise((resolve) => {
    // 1. Setup the 5 icon types and animations
    let accentColor, iconName, bgOpacity, animationClass;

    if (type === 'error') {
      accentColor = 'var(--accent-rose)'; iconName = 'close'; bgOpacity = 'rgba(244, 63, 94, 0.12)'; animationClass = 'anim-shake';
      if (!title) title = 'Error';
    } else if (type === 'success') {
      accentColor = 'var(--accent-emerald)'; iconName = 'check'; bgOpacity = 'rgba(16, 185, 129, 0.12)'; animationClass = 'anim-bounce-in';
      if (!title) title = 'Success';
    } else if (type === 'warning') {
      accentColor = 'var(--accent-amber)'; iconName = 'priority_high'; bgOpacity = 'rgba(245, 158, 11, 0.12)'; animationClass = 'anim-pulse';
      if (!title) title = 'Warning';
    } else if (type === 'loading') {
      accentColor = 'var(--accent-blue)'; iconName = 'sync'; bgOpacity = 'rgba(56, 189, 248, 0.12)'; animationClass = 'anim-spin'; buttonText = 'Please Wait...';
      if (!title) title = 'Processing';
    } else {
      // default info
      accentColor = 'var(--accent-indigo)'; iconName = 'info_outline'; bgOpacity = 'rgba(99, 102, 241, 0.12)'; animationClass = 'anim-float';
      if (!title) title = 'Information';
    }

    // 2. Inject CSS animations globally (once)
    const styleId = 'modal-5-animations-style';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.innerHTML = `
        @keyframes anim-shake { 0%, 100% { transform: translateX(0); } 20% { transform: translateX(-6px); } 40% { transform: translateX(6px); } 60% { transform: translateX(-4px); } 80% { transform: translateX(4px); } }
        @keyframes anim-bounce-in { 0% { transform: scale(0); opacity: 0; } 50% { transform: scale(1.3); } 100% { transform: scale(1); opacity: 1; } }
        @keyframes anim-pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.15); opacity: 0.8; } }
        @keyframes anim-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        @keyframes anim-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .anim-shake { animation: anim-shake 0.4s ease-in-out; }
        .anim-bounce-in { animation: anim-bounce-in 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) both; }
        .anim-pulse { animation: anim-pulse 1.5s infinite ease-in-out; }
        .anim-float { animation: anim-float 2s infinite ease-in-out; }
        .anim-spin { animation: anim-spin 1.2s linear infinite; }
      `;
      document.head.appendChild(style);
    }

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style.cssText = 'z-index:9000; display:flex; align-items:center; justify-content:center;';
    overlay.innerHTML = `
      <div style="
        background: var(--bg-secondary);
        border: 1px solid var(--glass-border);
        border-radius: 20px;
        padding: 32px;
        max-width: 400px;
        width: 90%;
        text-align: center;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        transform: scale(0.9);
        opacity: 0;
        transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      " id="alert-dialog-box">
        <div style="
          width: 64px; height: 64px; border-radius: 50%;
          background: ${bgOpacity};
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 20px auto;
        ">
          <span class="material-icons-outlined ${animationClass}" style="font-size: 32px; color: ${accentColor};">${iconName}</span>
        </div>
        <h3 style="font-size: 1.15rem; font-weight: 700; color: var(--text-primary); margin-bottom: 8px;">${title}</h3>
        <p style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 28px; line-height: 1.5;">${message}</p>
        <button id="alert-ok-btn" style="
          padding: 10px 32px; border-radius: 12px; font-weight: 600; font-size: 0.88rem;
          background: ${accentColor}; border: none; color: #fff; width: 100%;
          cursor: ${type === 'loading' ? 'not-allowed' : 'pointer'}; font-family: inherit; transition: all 0.2s ease;
          opacity: ${type === 'loading' ? '0.7' : '1'};
        " ${type === 'loading' ? 'disabled' : ''}>${buttonText}</button>
      </div>
    `;

    document.body.appendChild(overlay);

    requestAnimationFrame(() => {
      overlay.classList.add('active');
      const box = document.getElementById('alert-dialog-box');
      if (box) {
        box.style.transform = 'scale(1)';
        box.style.opacity = '1';
      }
    });

    const close = () => {
      if (type === 'loading') return; // Cannot manually close loading
      const box = document.getElementById('alert-dialog-box');
      if (box) {
        box.style.transform = 'scale(0.9)';
        box.style.opacity = '0';
      }
      overlay.classList.remove('active');
      setTimeout(() => overlay.remove(), 300);
      resolve();
    };

    document.getElementById('alert-ok-btn').addEventListener('click', close);
  });
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
