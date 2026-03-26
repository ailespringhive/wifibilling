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
  if (modal) modal.classList.remove('active');
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
    not_yet_paid: { class: 'badge-unpaid', label: 'Not Yet Paid' },
    payment_confirmation: { class: 'badge-extended', label: 'Payment Confirmation' },
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
export function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-PH', {
    year: 'numeric', month: 'short', day: 'numeric'
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
