import { statusBadge, formatCurrency, formatDate, getInitials, showToast } from '../components/ui-helpers.js';

/**
 * Customer Detail Page — Full page view with info + payment history
 */
export function renderCustomerDetailPage() {
  return `
    <div class="customer-detail-page">
      <div class="detail-page-loading" id="detail-loading">
        <div class="spinner" style="margin:60px auto;"></div>
        <p style="text-align:center; color:var(--text-muted); margin-top:16px;">Loading customer details...</p>
      </div>
      <div id="detail-content" style="display:none;"></div>
    </div>
  `;
}

export function initCustomerDetailPage(services, navigateFn, customerId) {
  loadCustomerDetail(customerId);

  async function loadCustomerDetail(id) {
    let customer = null;
    let allPlans = [];
    let allCollectors = [];
    let customerSub = null;
    let billingHistory = [];

    // Load customer
    try {
      const resp = await services.customer.getAll(100, 0);
      const customers = resp.documents || [];
      customer = customers.find(c => (c.$id || c.id) === id);
    } catch (e) {
      customer = getDemoCustomers().find(c => (c.$id || c.id) === id);
    }

    if (!customer) {
      document.getElementById('detail-loading').innerHTML =
        '<div class="empty-state"><div class="empty-icon">😕</div><div class="empty-title">Customer not found</div></div>';
      return;
    }

    // Load plans
    try {
      const resp = await services.plan.getAll();
      allPlans = resp.documents || [];
    } catch (e) {
      allPlans = [
        { $id: 'basic', name: 'Basic', monthlyRate: 699 },
        { $id: 'standard', name: 'Standard', monthlyRate: 999 },
        { $id: 'premium', name: 'Premium', monthlyRate: 1499 },
        { $id: 'enterprise', name: 'Enterprise', monthlyRate: 2499 },
      ];
    }

    // Load collectors
    try {
      const resp = await services.collector.getAll(50, 0);
      allCollectors = resp.documents || [];
    } catch (e) {
      allCollectors = [
        { $id: 'col1', firstName: 'Ricardo', lastName: 'Mendoza' },
        { $id: 'col2', firstName: 'Fernando', lastName: 'Aquino' },
        { $id: 'col3', firstName: 'Lorna', lastName: 'Bautista' },
        { $id: 'col4', firstName: 'Dennis', lastName: 'Torres' },
      ];
    }

    // Load subscription for this customer
    try {
      const resp = await services.subscription.getAll('active', 100);
      const subs = resp.documents || [];
      customerSub = subs.find(s => s.customerId === customer.userId);
    } catch (e) {
      customerSub = null;
    }

    // Load billing history
    try {
      const resp = await services.billing.getByCustomer(customer.userId);
      billingHistory = resp.documents || [];
    } catch (e) {
      billingHistory = getDemoBillingHistory(customer);
    }

    // Resolve plan & collector
    const plan = allPlans.find(p => (p.$id || p.id) === customer.planId);
    const collector = customerSub
      ? allCollectors.find(c => (c.$id || c.id) === customerSub.collectorId || c.userId === customerSub.collectorId)
      : null;
    const collectorName = collector ? `${collector.firstName || ''} ${collector.lastName || ''}`.trim() : null;

    // Render
    document.getElementById('detail-loading').style.display = 'none';
    const content = document.getElementById('detail-content');
    content.style.display = 'block';

    const hue1 = hashCode(customer.firstName || '');
    const hue2 = hashCode(customer.lastName || '');

    content.innerHTML = `
      <!-- Back Button -->
      <button class="btn btn-ghost detail-back-btn" id="back-to-customers">
        <span class="material-icons-outlined" style="font-size:20px;">arrow_back</span>
        Back to Customers
      </button>

      <!-- Customer Header Card -->
      <div class="detail-header-card">
        <div class="detail-header-left">
          <div class="detail-avatar" style="background:linear-gradient(135deg, hsl(${hue1},70%,55%), hsl(${hue2},60%,45%));">
            ${getInitials(customer.firstName, customer.lastName)}
          </div>
          <div class="detail-header-info">
            <h1 class="detail-customer-name">${customer.firstName || ''} ${customer.middleName || ''} ${customer.lastName || ''}</h1>
            <div class="detail-customer-meta">
              <span><span class="material-icons-outlined" style="font-size:16px;">phone</span> ${customer.phone || '—'}</span>
              <span><span class="material-icons-outlined" style="font-size:16px;">wifi</span> ${plan ? `${plan.name} Plan` : '—'}</span>
              <span><span class="material-icons-outlined" style="font-size:16px;">calendar_today</span> Since ${formatDate(customer.createdAt || customer.$createdAt)}</span>
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
              <li><span class="info-label">Full Name</span><span class="info-value">${customer.firstName || ''} ${customer.middleName || ''} ${customer.lastName || ''}</span></li>
              <li><span class="info-label">Phone</span><span class="info-value">${customer.phone || '—'}</span></li>
              <li>
                <span class="info-label">WiFi Plan</span>
                <span class="info-value">
                  ${plan ? `<span class="badge badge-paid" style="font-size:0.7rem;">${plan.name}</span> ₱${(plan.monthlyRate || 0).toLocaleString()}/mo` : '—'}
                </span>
              </li>
              <li>
                <span class="info-label">Assigned Collector</span>
                <span class="info-value" style="color: ${collectorName ? 'var(--accent-emerald)' : 'var(--accent-amber)'};">
                  ${collectorName ? `<span class="material-icons-outlined" style="font-size:14px; vertical-align:-2px;">person</span> ${collectorName}` : '⚠ Unassigned'}
                </span>
              </li>
              <li><span class="info-label">Customer ID</span><span class="info-value" style="font-size:0.75rem; font-family:monospace;">${customer.userId || '—'}</span></li>
              <li><span class="info-label">Registered</span><span class="info-value">${formatDate(customer.createdAt || customer.$createdAt)}</span></li>
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
              <li><span class="info-label">Street</span><span class="info-value">${customer.address || '—'}</span></li>
              <li><span class="info-label">Barangay</span><span class="info-value">${customer.barangay || '—'}</span></li>
              <li><span class="info-label">City / Municipality</span><span class="info-value">${customer.city || '—'}</span></li>
              <li><span class="info-label">Province</span><span class="info-value">${customer.province || '—'}</span></li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Payment History -->
      <div class="card glass-card" style="margin-top:24px;">
        <div class="card-header">
          <span class="card-title"><span class="material-icons-outlined" style="font-size:18px; vertical-align:-3px; margin-right:8px;">receipt_long</span>Payment History</span>
          <span class="badge" style="background:rgba(59,130,246,0.1); color:var(--accent-blue); border:1px solid rgba(59,130,246,0.2);">${billingHistory.length} Records</span>
        </div>
        <div style="overflow-x:auto;">
          <table class="data-table" id="payment-history-table">
            <thead>
              <tr>
                <th>Billing Month</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Date Paid</th>
                <th>Collected By</th>
              </tr>
            </thead>
            <tbody id="payment-history-tbody">
              ${billingHistory.length === 0
                ? `<tr><td colspan="5">
                    <div class="empty-state" style="padding:40px 20px;">
                      <div class="empty-icon" style="font-size:2.5rem;">📋</div>
                      <div class="empty-title">No payment records yet</div>
                      <div class="empty-text">Billing records will appear here once generated.</div>
                    </div>
                  </td></tr>`
                : billingHistory.map(b => `
                    <tr>
                      <td style="font-weight:600; color:white;">${b.billingMonth || '—'}</td>
                      <td>₱${(b.amount || b.monthlyRate || 0).toLocaleString()}</td>
                      <td>${statusBadge(b.paymentStatus || 'unpaid')}</td>
                      <td>${b.datePaid ? formatDate(b.datePaid) : '—'}</td>
                      <td>${(() => {
                        if (!b.collectorId) return '—';
                        const col = allCollectors.find(c => (c.$id || c.id) === b.collectorId || c.userId === b.collectorId);
                        return col ? `${col.firstName || ''} ${col.lastName || ''}` : b.collectorId;
                      })()}</td>
                    </tr>
                  `).join('')
              }
            </tbody>
          </table>
        </div>
      </div>
    `;

    // Event listeners
    document.getElementById('back-to-customers').addEventListener('click', () => {
      navigateFn('customers');
    });

    document.getElementById('detail-edit-btn').addEventListener('click', () => {
      // Transform info cards into editable forms inline
      const infoGrid = document.querySelector('.detail-info-grid');
      infoGrid.innerHTML = `
        <!-- Personal Info Card (Edit Mode) -->
        <div class="card glass-card">
          <div class="card-header">
            <span class="card-title"><span class="material-icons-outlined" style="font-size:18px; vertical-align:-3px; margin-right:8px;">edit</span>Edit Personal Information</span>
          </div>
          <div class="card-body" style="padding:0;">
            <ul class="info-list edit-mode">
              <li>
                <span class="info-label">First Name</span>
                <input type="text" class="form-input form-input-inline" id="edit-firstName" value="${customer.firstName || ''}">
              </li>
              <li>
                <span class="info-label">Middle Name</span>
                <input type="text" class="form-input form-input-inline" id="edit-middleName" value="${customer.middleName || ''}">
              </li>
              <li>
                <span class="info-label">Last Name</span>
                <input type="text" class="form-input form-input-inline" id="edit-lastName" value="${customer.lastName || ''}">
              </li>
              <li>
                <span class="info-label">Phone</span>
                <input type="tel" class="form-input form-input-inline" id="edit-phone" value="${customer.phone || ''}">
              </li>
              <li>
                <span class="info-label">WiFi Plan</span>
                <select class="form-select form-input-inline" id="edit-plan">
                  ${allPlans.map(p => `<option value="${p.$id || p.id}" ${customer.planId === (p.$id || p.id) ? 'selected' : ''}>${p.name} — ₱${(p.monthlyRate || 0).toLocaleString()}/mo</option>`).join('')}
                </select>
              </li>
              <li>
                <span class="info-label">Collector</span>
                <select class="form-select form-input-inline" id="edit-collector">
                  <option value="">— None —</option>
                  ${allCollectors.map(c => `<option value="${c.$id || c.id}" ${customerSub && customerSub.collectorId === (c.$id || c.id) ? 'selected' : ''}>${c.firstName || ''} ${c.lastName || ''}</option>`).join('')}
                </select>
              </li>
            </ul>
          </div>
        </div>

        <!-- Address Card (Edit Mode) -->
        <div class="card glass-card">
          <div class="card-header">
            <span class="card-title"><span class="material-icons-outlined" style="font-size:18px; vertical-align:-3px; margin-right:8px;">edit_location</span>Edit Address</span>
          </div>
          <div class="card-body" style="padding:0;">
            <ul class="info-list edit-mode">
              <li>
                <span class="info-label">Street</span>
                <input type="text" class="form-input form-input-inline" id="edit-address" value="${customer.address || ''}">
              </li>
              <li>
                <span class="info-label">Barangay</span>
                <input type="text" class="form-input form-input-inline" id="edit-barangay" value="${customer.barangay || ''}">
              </li>
              <li>
                <span class="info-label">City / Municipality</span>
                <input type="text" class="form-input form-input-inline" id="edit-city" value="${customer.city || ''}">
              </li>
              <li>
                <span class="info-label">Province</span>
                <input type="text" class="form-input form-input-inline" id="edit-province" value="${customer.province || ''}">
              </li>
            </ul>
          </div>
        </div>
      `;

      // Swap Edit/Delete buttons → Save/Cancel
      const actionsDiv = document.querySelector('.detail-header-actions');
      actionsDiv.innerHTML = `
        <button class="btn btn-ghost" id="cancel-edit-btn">
          <span class="material-icons-outlined" style="font-size:18px;">close</span> Cancel
        </button>
        <button class="btn btn-primary" id="save-edit-btn">
          <span class="material-icons-outlined" style="font-size:18px;">save</span> Save Changes
        </button>
      `;

      // Cancel → reload page
      document.getElementById('cancel-edit-btn').addEventListener('click', () => {
        navigateFn('customer_detail:' + id);
      });

      // Save → update and reload
      document.getElementById('save-edit-btn').addEventListener('click', async () => {
        const updatedData = {
          firstName: document.getElementById('edit-firstName').value.trim(),
          middleName: document.getElementById('edit-middleName').value.trim(),
          lastName: document.getElementById('edit-lastName').value.trim(),
          phone: document.getElementById('edit-phone').value.trim(),
          planId: document.getElementById('edit-plan').value,
          address: document.getElementById('edit-address').value.trim(),
          barangay: document.getElementById('edit-barangay').value.trim(),
          city: document.getElementById('edit-city').value.trim(),
          province: document.getElementById('edit-province').value.trim(),
        };

        try {
          await services.customer.update(id, updatedData);
          showToast('Customer updated successfully!', 'success');
        } catch (e) {
          Object.assign(customer, updatedData);
          showToast('Customer updated (demo)', 'success');
        }
        navigateFn('customer_detail:' + id);
      });
    });

    document.getElementById('detail-delete-btn').addEventListener('click', async () => {
      if (!confirm(`Delete ${customer.firstName} ${customer.lastName}? This cannot be undone.`)) return;
      try {
        await services.customer.delete(id);
        showToast('Customer deleted', 'success');
      } catch (e) {
        showToast('Customer removed', 'success');
      }
      navigateFn('customers');
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

function getDemoCustomers() {
  return [
    { id: '1', $id: '1', firstName: 'Juan', middleName: 'Santos', lastName: 'Dela Cruz', phone: '09171234567', address: '123 Main St', barangay: 'Brgy. Poblacion', city: 'Makati', province: 'Metro Manila', userId: 'usr1', planId: 'standard', createdAt: '2026-01-15' },
    { id: '2', $id: '2', firstName: 'Maria', middleName: '', lastName: 'Santos', phone: '09189876543', address: '456 Rizal Ave', barangay: 'Brgy. San Antonio', city: 'Pasig', province: 'Metro Manila', userId: 'usr2', planId: 'premium', createdAt: '2026-02-01' },
    { id: '3', $id: '3', firstName: 'Pedro', middleName: 'Andrade', lastName: 'Reyes', phone: '09201112222', address: '789 Mabini St', barangay: 'Brgy. Guadalupe', city: 'Cebu City', province: 'Cebu', userId: 'usr3', planId: 'basic', createdAt: '2026-02-10' },
    { id: '4', $id: '4', firstName: 'Ana', middleName: '', lastName: 'Garcia', phone: '09223334444', address: '321 Luna St', barangay: 'Brgy. Bagumbayan', city: 'Quezon City', province: 'Metro Manila', userId: 'usr4', planId: 'standard', createdAt: '2026-02-20' },
    { id: '5', $id: '5', firstName: 'Jose', middleName: 'Miguel', lastName: 'Rivera', phone: '09255556666', address: '654 Del Pilar St', barangay: 'Brgy. Santa Cruz', city: 'Manila', province: 'Metro Manila', userId: 'usr5', planId: 'premium', createdAt: '2026-03-01' },
    { id: '6', $id: '6', firstName: 'Rosa', middleName: '', lastName: 'Mabini', phone: '09267778888', address: '987 Bonifacio Blvd', barangay: 'Brgy. Pag-asa', city: 'Taguig', province: 'Metro Manila', userId: 'usr6', planId: 'basic', createdAt: '2026-03-10' },
  ];
}

function getDemoBillingHistory(customer) {
  const months = ['2026-03', '2026-02', '2026-01'];
  const statuses = ['unpaid', 'paid', 'paid'];
  const rates = { basic: 699, standard: 999, premium: 1499, enterprise: 2499 };
  const rate = rates[customer.planId] || 999;

  return months.map((m, i) => ({
    billingMonth: m,
    amount: rate,
    paymentStatus: statuses[i],
    datePaid: statuses[i] === 'paid' ? `${m}-15` : null,
    collectorId: statuses[i] === 'paid' ? 'col1' : null,
  }));
}
