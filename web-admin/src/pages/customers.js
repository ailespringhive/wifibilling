import { statusBadge, formatCurrency, formatDate, getInitials, showToast, openModal, closeModal, skeletonRows } from '../components/ui-helpers.js';

/**
 * Customers Page
 */
export function renderCustomersPage() {
  return `
    <!-- Toolbar -->
    <div class="toolbar">
      <div class="toolbar-left">
        <div class="search-bar" style="max-width:320px; flex:1;">
          <span class="search-icon"><span class="material-icons-outlined" style="font-size:18px;">search</span></span>
          <input type="text" placeholder="Search customers..." id="customer-search">
        </div>
      </div>
      <div class="toolbar-right">
        <button class="btn btn-primary" id="add-customer-btn">+ Add Customer</button>
      </div>
    </div>

    <!-- Customers Table -->
    <div class="table-container">
      <table class="data-table" id="customers-table">
        <thead>
          <tr>
            <th>Customer</th>
            <th>Phone</th>
            <th>Plan</th>
            <th>Assigned Collector</th>
            <th>Address</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody id="customers-tbody">
          ${skeletonRows(6, 6)}
        </tbody>
      </table>
    </div>

    <!-- Add/Edit Customer Modal -->
    <div class="modal-overlay" id="customer-modal">
      <div class="modal modal-lg">
        <div class="modal-header">
          <h3 id="customer-modal-title">Add New Customer</h3>
          <button class="modal-close" id="close-customer-modal">✕</button>
        </div>
        <div class="modal-body">
          <form id="customer-form">
            <input type="hidden" id="customer-doc-id">
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">First Name *</label>
                <input type="text" class="form-input" id="cust-firstName" required placeholder="Juan">
              </div>
              <div class="form-group">
                <label class="form-label">Middle Name</label>
                <input type="text" class="form-input" id="cust-middleName" placeholder="Santos">
              </div>
              <div class="form-group">
                <label class="form-label">Last Name *</label>
                <input type="text" class="form-input" id="cust-lastName" required placeholder="Dela Cruz">
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Phone Number *</label>
                <input type="tel" class="form-input" id="cust-phone" required placeholder="09XX XXX XXXX">
              </div>
              <div class="form-group">
                <label class="form-label">WiFi Plan *</label>
                <select class="form-input" id="cust-plan" required>
                  <option value="" disabled selected>Select a plan</option>
                </select>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Assign Collector *</label>
              <select class="form-input" id="cust-collector" required>
                <option value="" disabled selected>Select a collector</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Street Address *</label>
              <input type="text" class="form-input" id="cust-address" required placeholder="123 Main Street">
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Barangay *</label>
                <input type="text" class="form-input" id="cust-barangay" required placeholder="Barangay 1">
              </div>
              <div class="form-group">
                <label class="form-label">City / Municipality *</label>
                <input type="text" class="form-input" id="cust-city" required placeholder="Makati">
              </div>
              <div class="form-group">
                <label class="form-label">Province *</label>
                <input type="text" class="form-input" id="cust-province" required placeholder="Metro Manila">
              </div>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" id="cancel-customer-btn">Cancel</button>
          <button class="btn btn-primary" id="save-customer-btn">Save Customer</button>
        </div>
      </div>
    </div>

    <!-- View Customer Detail Modal -->
    <div class="modal-overlay" id="customer-detail-modal">
      <div class="modal modal-lg">
        <div class="modal-header">
          <h3>Customer Details</h3>
          <button class="modal-close" id="close-detail-modal">✕</button>
        </div>
        <div class="modal-body" id="customer-detail-body">
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" id="close-detail-btn">Close</button>
          <button class="btn btn-primary" id="edit-from-detail-btn">Edit Customer</button>
        </div>
      </div>
    </div>
  `;
}

/**
 * Init customer page events
 */
export function initCustomersPage(services, navigateFn) {
  let allCustomers = [];
  let allPlans = [];
  let allCollectors = [];
  let customerSubscriptions = {}; // customerId -> subscription (with collectorId)
  let editingId = null;

  // Load all data
  loadCustomers();
  loadPlans();
  loadCollectors();

  async function loadPlans() {
    const select = document.getElementById('cust-plan');
    try {
      const response = await services.plan.getAll();
      allPlans = response.documents || [];
    } catch (e) {
      allPlans = [
        { $id: 'basic', name: 'Basic', monthlyRate: 699 },
        { $id: 'standard', name: 'Standard', monthlyRate: 999 },
        { $id: 'premium', name: 'Premium', monthlyRate: 1499 },
        { $id: 'enterprise', name: 'Enterprise', monthlyRate: 2499 },
      ];
    }
    select.innerHTML = '<option value="" disabled selected>Select a plan</option>' +
      allPlans.map(p => `<option value="${p.$id || p.id}">\u20B1${(p.monthlyRate || 0).toLocaleString()} — ${p.name}</option>`).join('');
  }

  async function loadCollectors() {
    const select = document.getElementById('cust-collector');
    try {
      const response = await services.collector.getAll(50, 0);
      allCollectors = response.documents || [];
    } catch (e) {
      allCollectors = [
        { $id: 'col1', id: 'col1', firstName: 'Ricardo', lastName: 'Mendoza', userId: 'col_usr1' },
        { $id: 'col2', id: 'col2', firstName: 'Fernando', lastName: 'Aquino', userId: 'col_usr2' },
        { $id: 'col3', id: 'col3', firstName: 'Lorna', lastName: 'Bautista', userId: 'col_usr3' },
        { $id: 'col4', id: 'col4', firstName: 'Dennis', lastName: 'Torres', userId: 'col_usr4' },
      ];
    }
    select.innerHTML = '<option value="" disabled selected>Select a collector</option>' +
      allCollectors.map(c => `<option value="${c.$id || c.id}">${c.firstName || ''} ${c.lastName || ''}</option>`).join('');
  }

  async function loadSubscriptions() {
    try {
      const response = await services.subscription.getAll('active', 100);
      const subs = response.documents || [];
      customerSubscriptions = {};
      subs.forEach(s => {
        customerSubscriptions[s.customerId] = s;
      });
    } catch (e) {
      customerSubscriptions = {};
    }
  }

  // Add customer button
  document.getElementById('add-customer-btn').addEventListener('click', () => {
    editingId = null;
    document.getElementById('customer-modal-title').textContent = 'Add New Customer';
    document.getElementById('customer-form').reset();
    document.getElementById('customer-doc-id').value = '';
    document.getElementById('cust-collector').value = '';
    openModal('customer-modal');
  });

  // Close modals
  document.getElementById('close-customer-modal').addEventListener('click', () => closeModal('customer-modal'));
  document.getElementById('cancel-customer-btn').addEventListener('click', () => closeModal('customer-modal'));
  document.getElementById('close-detail-modal').addEventListener('click', () => closeModal('customer-detail-modal'));
  document.getElementById('close-detail-btn').addEventListener('click', () => closeModal('customer-detail-modal'));

  // Close modals on overlay click
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.classList.remove('active');
    });
  });

  // Search
  let searchTimeout;
  document.getElementById('customer-search').addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      const query = e.target.value.toLowerCase();
      filterCustomers(query);
    }, 300);
  });

  // Save customer
  document.getElementById('save-customer-btn').addEventListener('click', async () => {
    const form = document.getElementById('customer-form');
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const collectorDocId = document.getElementById('cust-collector').value;
    const planId = document.getElementById('cust-plan').value;

    const data = {
      firstName: document.getElementById('cust-firstName').value.trim(),
      middleName: document.getElementById('cust-middleName').value.trim(),
      lastName: document.getElementById('cust-lastName').value.trim(),
      phone: document.getElementById('cust-phone').value.trim(),
      planId: planId,
      address: document.getElementById('cust-address').value.trim(),
      barangay: document.getElementById('cust-barangay').value.trim(),
      city: document.getElementById('cust-city').value.trim(),
      province: document.getElementById('cust-province').value.trim(),
    };

    const saveBtn = document.getElementById('save-customer-btn');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    try {
      const docId = document.getElementById('customer-doc-id').value;
      if (docId) {
        // Update existing customer
        await services.customer.update(docId, data);

        // Update or create subscription with the assigned collector
        const existingSub = customerSubscriptions[allCustomers.find(c => (c.$id || c.id) === docId)?.userId];
        if (existingSub) {
          await services.subscription.update(existingSub.$id || existingSub.id, {
            collectorId: collectorDocId,
            planId: planId,
          });
        } else {
          const customer = allCustomers.find(c => (c.$id || c.id) === docId);
          if (customer) {
            await services.subscription.create({
              customerId: customer.userId,
              planId: planId,
              collectorId: collectorDocId,
            });
          }
        }
        showToast('Customer updated successfully!', 'success');
      } else {
        // Create new customer
        data.userId = 'usr_' + Date.now();
        const newCustomer = await services.customer.create(data);

        // Auto-create subscription with the selected collector
        try {
          await services.subscription.create({
            customerId: data.userId,
            planId: planId,
            collectorId: collectorDocId,
          });
        } catch (subErr) {
          console.warn('Subscription creation failed:', subErr);
        }
        showToast('Customer added & collector assigned!', 'success');
      }
      closeModal('customer-modal');
      loadCustomers();
    } catch (error) {
      showToast(error.message || 'Failed to save customer', 'error');
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Customer';
    }
  });

  // Load customers
  async function loadCustomers() {
    try {
      const response = await services.customer.getAll(50, 0);
      allCustomers = response.documents;
    } catch (error) {
      console.warn('Using demo data for customers:', error.message);
      allCustomers = getDemoCustomers();
    }
    // Load subscriptions to map collectors
    await loadSubscriptions();
    renderCustomerTable(allCustomers);
  }

  function getCollectorForCustomer(customer) {
    const sub = customerSubscriptions[customer.userId];
    if (!sub) return null;
    const collector = allCollectors.find(c =>
      (c.$id || c.id) === sub.collectorId ||
      c.userId === sub.collectorId
    );
    return collector || null;
  }

  function renderCustomerTable(customers) {
    const tbody = document.getElementById('customers-tbody');
    if (!customers || customers.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6">
        <div class="empty-state">
          <div class="empty-icon"><span class="material-icons-outlined" style="font-size:3rem;">people</span></div>
          <div class="empty-title">No customers yet</div>
          <div class="empty-text">Click "Add Customer" to add your first customer.</div>
        </div>
      </td></tr>`;
      return;
    }

    tbody.innerHTML = customers.map(c => {
      const collector = getCollectorForCustomer(c);
      const collectorName = collector ? `${collector.firstName || ''} ${collector.lastName || ''}` : null;

      return `
      <tr>
        <td>
          <div style="display:flex; align-items:center; gap:10px;">
            <div class="avatar avatar-sm" style="background:linear-gradient(135deg, hsl(${hashCode(c.firstName || '')},70%,55%), hsl(${hashCode(c.lastName || '')},60%,45%));">
              ${getInitials(c.firstName, c.lastName)}
            </div>
            <div>
              <div style="color:var(--text-primary); font-weight:500;">${c.firstName || ''} ${c.lastName || ''}</div>
              <div style="font-size:0.72rem; color:var(--text-muted);">${c.middleName ? c.middleName + ' • ' : ''}${c.barangay || ''}</div>
            </div>
          </div>
        </td>
        <td>${c.phone || '—'}</td>
        <td>${(() => { const p = allPlans.find(x => (x.$id || x.id) === c.planId); return p ? p.name : '—'; })()}</td>
        <td>
          ${collectorName
            ? `<div style="display:flex; align-items:center; gap:8px;">
                <div class="avatar avatar-sm" style="width:24px; height:24px; font-size:0.6rem; background:linear-gradient(135deg, hsl(${hashCode(collectorName)},70%,50%), hsl(${hashCode(collectorName)+40},60%,40%));">
                  ${getInitials(collector.firstName, collector.lastName)}
                </div>
                <span style="font-size:0.82rem; color:var(--text-primary);">${collectorName}</span>
              </div>`
            : `<span style="font-size:0.78rem; color:var(--accent-amber);">⚠ Unassigned</span>`
          }
        </td>
        <td style="max-width:180px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
          ${c.address || ''}, ${c.barangay || ''}, ${c.city || ''}
        </td>
        <td>
          <div class="table-actions">
            <button class="btn btn-ghost btn-sm btn-icon" title="View" data-view="${c.$id || c.id}"><span class="material-icons-outlined" style="font-size:18px;">visibility</span></button>
            <button class="btn btn-ghost btn-sm btn-icon" title="Edit" data-edit="${c.$id || c.id}"><span class="material-icons-outlined" style="font-size:18px;">edit</span></button>
            <button class="btn btn-ghost btn-sm btn-icon" title="Delete" data-delete="${c.$id || c.id}" style="color:var(--accent-rose);"><span class="material-icons-outlined" style="font-size:18px;">delete</span></button>
          </div>
        </td>
      </tr>
    `}).join('');

    // Attach row events
    tbody.querySelectorAll('[data-view]').forEach(btn => {
      btn.addEventListener('click', () => viewCustomer(btn.dataset.view));
    });
    tbody.querySelectorAll('[data-edit]').forEach(btn => {
      btn.addEventListener('click', () => editCustomer(btn.dataset.edit));
    });
    tbody.querySelectorAll('[data-delete]').forEach(btn => {
      btn.addEventListener('click', () => deleteCustomer(btn.dataset.delete));
    });
  }

  function filterCustomers(query) {
    if (!query) {
      renderCustomerTable(allCustomers);
      return;
    }
    const filtered = allCustomers.filter(c => {
      const plan = allPlans.find(x => (x.$id || x.id) === c.planId);
      const planName = plan ? plan.name : '';
      const collector = getCollectorForCustomer(c);
      const collectorName = collector ? `${collector.firstName} ${collector.lastName}` : '';
      return `${c.firstName} ${c.middleName} ${c.lastName} ${c.phone} ${planName} ${collectorName} ${c.address} ${c.barangay} ${c.city}`
        .toLowerCase().includes(query);
    });
    renderCustomerTable(filtered);
  }

  function viewCustomer(id) {
    const c = allCustomers.find(x => (x.$id || x.id) === id);
    if (!c) return;
    const collector = getCollectorForCustomer(c);
    const collectorName = collector ? `${collector.firstName || ''} ${collector.lastName || ''}` : 'Unassigned';
    const body = document.getElementById('customer-detail-body');
    body.innerHTML = `
      <div style="display:flex; align-items:center; gap:16px; margin-bottom:24px;">
        <div class="avatar avatar-xl" style="background:linear-gradient(135deg, hsl(${hashCode(c.firstName || '')},70%,55%), hsl(${hashCode(c.lastName || '')},60%,45%));">
          ${getInitials(c.firstName, c.lastName)}
        </div>
        <div>
          <h2 style="font-size:1.3rem; font-weight:700;">${c.firstName || ''} ${c.middleName || ''} ${c.lastName || ''}</h2>
          <p style="color:var(--text-muted); font-size:0.85rem;">Customer</p>
        </div>
      </div>
      <div class="detail-grid">
        <div class="card">
          <div class="card-header"><span class="card-title">Personal Information</span></div>
          <div class="card-body">
            <ul class="info-list">
              <li><span class="info-label">Phone</span><span class="info-value">${c.phone || '—'}</span></li>
              <li><span class="info-label">WiFi Plan</span><span class="info-value">${(() => { const p = allPlans.find(x => (x.$id || x.id) === c.planId); return p ? `${p.name} (₱${(p.monthlyRate || 0).toLocaleString()}/mo)` : '—'; })()}</span></li>
              <li>
                <span class="info-label">Assigned Collector</span>
                <span class="info-value" style="color: ${collector ? 'var(--accent-emerald)' : 'var(--accent-amber)'};">
                  ${collector ? `<span class="material-icons-outlined" style="font-size:14px; vertical-align:-2px;">person</span> ${collectorName}` : '⚠ Unassigned'}
                </span>
              </li>
              <li><span class="info-label">User ID</span><span class="info-value" style="font-size:0.75rem;">${c.userId || '—'}</span></li>
              <li><span class="info-label">Registered</span><span class="info-value">${formatDate(c.createdAt || c.$createdAt)}</span></li>
            </ul>
          </div>
        </div>
        <div class="card">
          <div class="card-header"><span class="card-title">Address</span></div>
          <div class="card-body">
            <ul class="info-list">
              <li><span class="info-label">Street</span><span class="info-value">${c.address || '—'}</span></li>
              <li><span class="info-label">Barangay</span><span class="info-value">${c.barangay || '—'}</span></li>
              <li><span class="info-label">City</span><span class="info-value">${c.city || '—'}</span></li>
              <li><span class="info-label">Province</span><span class="info-value">${c.province || '—'}</span></li>
            </ul>
          </div>
        </div>
      </div>
    `;

    // Bind edit from detail
    document.getElementById('edit-from-detail-btn').onclick = () => {
      closeModal('customer-detail-modal');
      editCustomer(id);
    };

    openModal('customer-detail-modal');
  }

  function editCustomer(id) {
    const c = allCustomers.find(x => (x.$id || x.id) === id);
    if (!c) return;
    editingId = id;
    document.getElementById('customer-modal-title').textContent = 'Edit Customer';
    document.getElementById('customer-doc-id').value = id;
    document.getElementById('cust-firstName').value = c.firstName || '';
    document.getElementById('cust-middleName').value = c.middleName || '';
    document.getElementById('cust-lastName').value = c.lastName || '';
    document.getElementById('cust-phone').value = c.phone || '';
    document.getElementById('cust-plan').value = c.planId || '';
    document.getElementById('cust-address').value = c.address || '';
    document.getElementById('cust-barangay').value = c.barangay || '';
    document.getElementById('cust-city').value = c.city || '';
    document.getElementById('cust-province').value = c.province || '';

    // Pre-select the assigned collector from subscription
    const sub = customerSubscriptions[c.userId];
    const collectorSelect = document.getElementById('cust-collector');
    if (sub && sub.collectorId) {
      collectorSelect.value = sub.collectorId;
    } else {
      collectorSelect.value = '';
    }

    openModal('customer-modal');
  }

  async function deleteCustomer(id) {
    if (!confirm('Are you sure you want to delete this customer?')) return;
    try {
      await services.customer.delete(id);
      showToast('Customer deleted', 'success');
      loadCustomers();
    } catch (error) {
      // Demo mode — remove from local array
      allCustomers = allCustomers.filter(c => (c.$id || c.id) !== id);
      renderCustomerTable(allCustomers);
      showToast('Customer removed', 'success');
    }
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
    { id: '1', $id: '1', firstName: 'Juan', middleName: 'Santos', lastName: 'Dela Cruz', phone: '09171234567', email: 'juan@email.com', address: '123 Main St', barangay: 'Brgy. Poblacion', city: 'Makati', province: 'Metro Manila', userId: 'usr1', planId: 'standard', createdAt: '2026-01-15' },
    { id: '2', $id: '2', firstName: 'Maria', middleName: '', lastName: 'Santos', phone: '09189876543', email: 'maria@email.com', address: '456 Rizal Ave', barangay: 'Brgy. San Antonio', city: 'Pasig', province: 'Metro Manila', userId: 'usr2', planId: 'premium', createdAt: '2026-02-01' },
    { id: '3', $id: '3', firstName: 'Pedro', middleName: 'Andrade', lastName: 'Reyes', phone: '09201112222', email: '', address: '789 Mabini St', barangay: 'Brgy. Guadalupe', city: 'Cebu City', province: 'Cebu', userId: 'usr3', planId: 'basic', createdAt: '2026-02-10' },
    { id: '4', $id: '4', firstName: 'Ana', middleName: '', lastName: 'Garcia', phone: '09223334444', email: 'ana.garcia@email.com', address: '321 Luna St', barangay: 'Brgy. Bagumbayan', city: 'Quezon City', province: 'Metro Manila', userId: 'usr4', planId: 'standard', createdAt: '2026-02-20' },
    { id: '5', $id: '5', firstName: 'Jose', middleName: 'Miguel', lastName: 'Rivera', phone: '09255556666', email: 'jose.r@email.com', address: '654 Del Pilar St', barangay: 'Brgy. Santa Cruz', city: 'Manila', province: 'Metro Manila', userId: 'usr5', planId: 'premium', createdAt: '2026-03-01' },
    { id: '6', $id: '6', firstName: 'Rosa', middleName: '', lastName: 'Mabini', phone: '09267778888', email: '', address: '987 Bonifacio Blvd', barangay: 'Brgy. Pag-asa', city: 'Taguig', province: 'Metro Manila', userId: 'usr6', planId: 'basic', createdAt: '2026-03-10' },
  ];
}
