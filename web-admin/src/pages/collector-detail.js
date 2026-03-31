import { formatDate, getInitials, showToast } from '../components/ui-helpers.js';

/**
 * Collector Detail Page — Full page view matching Customer Detail layout
 */
export function renderCollectorDetailPage() {
  return `
    <div class="customer-detail-page">
      <div class="detail-page-loading" id="detail-loading">
        <div class="spinner" style="margin:60px auto;"></div>
        <p style="text-align:center; color:var(--text-muted); margin-top:16px;">Loading collector details...</p>
      </div>
      <div id="detail-content" style="display:none;"></div>
    </div>
  `;
}

export function initCollectorDetailPage(services, navigateFn, collectorId) {
  loadCollectorDetail(collectorId);

  async function loadCollectorDetail(id) {
    let collector = null;
    let assignedCustomers = [];

    // Load collector
    try {
      const resp = await services.collector.getAll(100, 0);
      const collectors = resp.documents || [];
      collector = collectors.find(c => (c.$id || c.id) === id);
    } catch (e) {
      collector = getDemoCollectors().find(c => (c.$id || c.id) === id);
    }

    if (!collector) {
      document.getElementById('detail-loading').innerHTML =
        '<div class="empty-state"><div class="empty-icon">😕</div><div class="empty-title">Collector not found</div></div>';
      return;
    }

    // Load assigned customers via subscriptions
    try {
      const subResp = await services.subscription.getAll('active', 200);
      const subs = (subResp.documents || []).filter(s => s.collectorId === (collector.userId || collector.$id || collector.id));
      const customerIds = subs.map(s => s.customerId);

      if (customerIds.length > 0) {
        const custResp = await services.customer.getAll(200, 0);
        const allCustomers = custResp.documents || [];
        assignedCustomers = allCustomers.filter(c => customerIds.includes(c.userId));
      }
    } catch (e) {
      assignedCustomers = getDemoAssignedCustomers();
    }

    // Render
    document.getElementById('detail-loading').style.display = 'none';
    const content = document.getElementById('detail-content');
    content.style.display = 'block';

    const hue1 = hashCode(collector.firstName || '');
    const hue2 = hashCode(collector.lastName || '');
    const fullName = `${collector.firstName || ''} ${collector.middleName || ''} ${collector.lastName || ''}`.trim();

    content.innerHTML = `
      <!-- Back Button -->
      <button class="btn btn-ghost detail-back-btn" id="back-to-collectors">
        <span class="material-icons-outlined" style="font-size:20px;">arrow_back</span>
        Back to Collectors
      </button>

      <!-- Collector Header Card -->
      <div class="detail-header-card">
        <div class="detail-header-left">
          <div class="detail-avatar" style="background:linear-gradient(135deg, hsl(${hue1},70%,55%), hsl(${hue2},60%,45%));">
            ${getInitials(collector.firstName, collector.lastName)}
          </div>
          <div class="detail-header-info">
            <h1 class="detail-customer-name">${fullName}</h1>
            <div class="detail-customer-meta">
              <span><span class="material-icons-outlined" style="font-size:16px;">phone</span> ${collector.phone || '—'}</span>
              <span><span class="material-icons-outlined" style="font-size:16px;">badge</span> Collector</span>
              <span><span class="material-icons-outlined" style="font-size:16px;">calendar_today</span> Since ${formatDate(collector.createdAt || collector.$createdAt)}</span>
            </div>
          </div>
        </div>
        <div class="detail-header-actions">
          <button class="btn btn-primary" id="detail-edit-btn">
            <span class="material-icons-outlined" style="font-size:18px;">edit</span> Edit
          </button>
          <button class="btn btn-danger" id="detail-delete-btn">
            <span class="material-icons-outlined" style="font-size:18px;">delete</span> Delete
          </button>
        </div>
      </div>

      <!-- Info Grid -->
      <div class="detail-info-grid">
        <!-- Personal Info Card -->
        <div class="card glass-card">
          <div class="card-header">
            <span class="card-title"><span class="material-icons-outlined" style="font-size:18px; vertical-align:-3px; margin-right:8px;">person</span>Personal Information</span>
          </div>
          <div class="card-body" style="padding:0;">
            <ul class="info-list">
              <li><span class="info-label">Full Name</span><span class="info-value">${fullName}</span></li>
              <li><span class="info-label">Phone</span><span class="info-value">${collector.phone || '—'}</span></li>
              <li><span class="info-label">Email</span><span class="info-value">${collector.email || '—'}</span></li>
              <li><span class="info-label">Role</span><span class="info-value"><span class="badge badge-paid" style="font-size:0.7rem;">Collector</span></span></li>
              <li><span class="info-label">Collector ID</span><span class="info-value" style="font-size:0.75rem; font-family:monospace;">${collector.userId || collector.$id || collector.id || '—'}</span></li>
              <li><span class="info-label">Registered</span><span class="info-value">${formatDate(collector.createdAt || collector.$createdAt)}</span></li>
            </ul>
          </div>
        </div>

        <!-- Address Card -->
        <div class="card glass-card">
          <div class="card-header">
            <span class="card-title"><span class="material-icons-outlined" style="font-size:18px; vertical-align:-3px; margin-right:8px;">location_on</span>Address</span>
          </div>
          <div class="card-body" style="padding:0;">
            <ul class="info-list">
              <li><span class="info-label">Street</span><span class="info-value">${collector.address || '—'}</span></li>
              <li><span class="info-label">Barangay</span><span class="info-value">${collector.barangay || '—'}</span></li>
              <li><span class="info-label">City / Municipality</span><span class="info-value">${collector.city || '—'}</span></li>
              <li><span class="info-label">Province</span><span class="info-value">${collector.province || '—'}</span></li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Assigned Customers Table -->
      <div class="card glass-card" style="margin-top:24px;">
        <div class="card-header">
          <span class="card-title"><span class="material-icons-outlined" style="font-size:18px; vertical-align:-3px; margin-right:8px;">people</span>Assigned Customers</span>
          <span class="badge" style="background:rgba(59,130,246,0.1); color:var(--accent-blue); border:1px solid rgba(59,130,246,0.2);">${assignedCustomers.length} Customers</span>
        </div>
        <div style="overflow-x:auto;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Phone</th>
                <th>Address</th>
                <th>Registered</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${assignedCustomers.length === 0
                ? `<tr><td colspan="5">
                    <div class="empty-state" style="padding:40px 20px;">
                      <div class="empty-icon" style="font-size:2.5rem;">📋</div>
                      <div class="empty-title">No customers assigned</div>
                      <div class="empty-text">Assign customers to this collector from the Customers page.</div>
                    </div>
                  </td></tr>`
                : assignedCustomers.map(c => {
                    const ch = hashCode(c.firstName || '');
                    const cName = `${c.firstName || ''} ${c.lastName || ''}`.trim();
                    const loc = [c.barangay, c.city].filter(Boolean).join(', ');
                    return `
                      <tr>
                        <td>
                          <div style="display:flex; align-items:center; gap:12px;">
                            <div class="avatar" style="background:linear-gradient(135deg, hsl(${ch},70%,55%), hsl(${ch + 60},60%,45%));">
                              ${getInitials(c.firstName, c.lastName)}
                            </div>
                            <div style="font-weight:600; color:var(--text-primary);">${cName}</div>
                          </div>
                        </td>
                        <td>${c.phone || '—'}</td>
                        <td style="max-width:200px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${loc || '—'}</td>
                        <td>${formatDate(c.createdAt || c.$createdAt)}</td>
                        <td>
                          <button class="btn btn-ghost btn-sm btn-icon" title="View Customer" data-view-cust="${c.$id || c.id}">
                            <span class="material-icons-outlined" style="font-size:18px;">visibility</span>
                          </button>
                        </td>
                      </tr>`;
                  }).join('')
              }
            </tbody>
          </table>
        </div>
      </div>
    `;

    // ── Event Listeners ──

    // Back button
    document.getElementById('back-to-collectors').addEventListener('click', () => {
      navigateFn('collectors');
    });

    // View assigned customer
    content.querySelectorAll('[data-view-cust]').forEach(btn => {
      btn.addEventListener('click', () => {
        navigateFn('customer_detail:' + btn.dataset.viewCust);
      });
    });

    // Edit button
    document.getElementById('detail-edit-btn').addEventListener('click', () => {
      const infoGrid = document.querySelector('.detail-info-grid');
      infoGrid.innerHTML = `
        <!-- Personal Info (Edit) -->
        <div class="card glass-card">
          <div class="card-header">
            <span class="card-title"><span class="material-icons-outlined" style="font-size:18px; vertical-align:-3px; margin-right:8px;">edit</span>Edit Personal Information</span>
          </div>
          <div class="card-body" style="padding:0;">
            <ul class="info-list edit-mode">
              <li><span class="info-label">First Name</span><input type="text" class="form-input form-input-inline" id="edit-firstName" value="${collector.firstName || ''}"></li>
              <li><span class="info-label">Middle Name</span><input type="text" class="form-input form-input-inline" id="edit-middleName" value="${collector.middleName || ''}"></li>
              <li><span class="info-label">Last Name</span><input type="text" class="form-input form-input-inline" id="edit-lastName" value="${collector.lastName || ''}"></li>
              <li><span class="info-label">Phone</span><input type="tel" class="form-input form-input-inline" id="edit-phone" value="${collector.phone || ''}"></li>
              <li><span class="info-label">Email</span><input type="email" class="form-input form-input-inline" id="edit-email" value="${collector.email || ''}"></li>
            </ul>
          </div>
        </div>

        <!-- Address (Edit) -->
        <div class="card glass-card">
          <div class="card-header">
            <span class="card-title"><span class="material-icons-outlined" style="font-size:18px; vertical-align:-3px; margin-right:8px;">edit_location</span>Edit Address</span>
          </div>
          <div class="card-body" style="padding:0;">
            <ul class="info-list edit-mode">
              <li><span class="info-label">Street</span><input type="text" class="form-input form-input-inline" id="edit-address" value="${collector.address || ''}"></li>
              <li><span class="info-label">Barangay</span><input type="text" class="form-input form-input-inline" id="edit-barangay" value="${collector.barangay || ''}"></li>
              <li><span class="info-label">City</span><input type="text" class="form-input form-input-inline" id="edit-city" value="${collector.city || ''}"></li>
              <li><span class="info-label">Province</span><input type="text" class="form-input form-input-inline" id="edit-province" value="${collector.province || ''}"></li>
            </ul>
          </div>
        </div>
      `;

      // Swap buttons
      const actionsDiv = document.querySelector('.detail-header-actions');
      actionsDiv.innerHTML = `
        <button class="btn btn-ghost" id="cancel-edit-btn">
          <span class="material-icons-outlined" style="font-size:18px;">close</span> Cancel
        </button>
        <button class="btn btn-primary" id="save-edit-btn">
          <span class="material-icons-outlined" style="font-size:18px;">save</span> Save Changes
        </button>
      `;

      document.getElementById('cancel-edit-btn').addEventListener('click', () => {
        navigateFn('collector_detail:' + id);
      });

      document.getElementById('save-edit-btn').addEventListener('click', async () => {
        const updatedData = {
          firstName: document.getElementById('edit-firstName').value.trim(),
          middleName: document.getElementById('edit-middleName').value.trim(),
          lastName: document.getElementById('edit-lastName').value.trim(),
          phone: document.getElementById('edit-phone').value.trim(),
          email: document.getElementById('edit-email').value.trim(),
          address: document.getElementById('edit-address').value.trim(),
          barangay: document.getElementById('edit-barangay').value.trim(),
          city: document.getElementById('edit-city').value.trim(),
          province: document.getElementById('edit-province').value.trim(),
        };

        try {
          await services.collector.update(id, updatedData);
          showToast('Collector updated successfully!', 'success');
        } catch (e) {
          Object.assign(collector, updatedData);
          showToast('Collector updated (demo)', 'success');
        }
        navigateFn('collector_detail:' + id);
      });
    });

    // Delete button
    document.getElementById('detail-delete-btn').addEventListener('click', async () => {
      if (!confirm(`Delete ${collector.firstName} ${collector.lastName}? This cannot be undone.`)) return;
      try {
        await services.collector.delete(id);
        showToast('Collector deleted', 'success');
      } catch (e) {
        showToast('Collector removed', 'success');
      }
      navigateFn('collectors');
    });
  }
}

// Simple hash for avatar colors
function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash % 360);
}

function getDemoCollectors() {
  return [
    { id: 'col1', $id: 'col1', firstName: 'Ricardo', lastName: 'Mendoza', phone: '09171111111', email: 'ricardo@demo.com', address: '123 Collector St', barangay: 'Brgy. Centro', city: 'Manila', province: 'Metro Manila', userId: 'col_usr1', createdAt: '2026-01-10' },
    { id: 'col2', $id: 'col2', firstName: 'Fernando', lastName: 'Aquino', phone: '09172222222', email: 'fernando@demo.com', address: '456 Billing Ave', barangay: 'Brgy. Norte', city: 'Quezon City', province: 'Metro Manila', userId: 'col_usr2', createdAt: '2026-01-20' },
    { id: 'col3', $id: 'col3', firstName: 'Lorna', lastName: 'Bautista', phone: '09173333333', email: 'lorna@demo.com', address: '789 Collector Rd', barangay: 'Brgy. Sur', city: 'Pasig', province: 'Metro Manila', userId: 'col_usr3', createdAt: '2026-02-05' },
    { id: 'col4', $id: 'col4', firstName: 'Dennis', lastName: 'Torres', phone: '09174444444', email: 'dennis@demo.com', address: '321 Route St', barangay: 'Brgy. East', city: 'Makati', province: 'Metro Manila', userId: 'col_usr4', createdAt: '2026-02-15' },
  ];
}

function getDemoAssignedCustomers() {
  return [
    { id: '1', $id: '1', firstName: 'Juan', lastName: 'Dela Cruz', phone: '09171234567', barangay: 'Brgy. Poblacion', city: 'Makati', userId: 'usr1', createdAt: '2026-01-15' },
    { id: '2', $id: '2', firstName: 'Maria', lastName: 'Santos', phone: '09189876543', barangay: 'Brgy. San Antonio', city: 'Pasig', userId: 'usr2', createdAt: '2026-02-01' },
  ];
}
