import { statusBadge, formatCurrency, formatDate, getInitials, showToast, openModal, closeModal, skeletonRows } from '../components/ui-helpers.js';
import { MobileNotificationService } from '../services/notification.service.js';

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
        <div class="modal-body-scroll">
          <form id="customer-form">
            <input type="hidden" id="customer-doc-id">

            <div class="form-section-title">
              <span class="material-icons-outlined">person</span> Personal Information
            </div>
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

            <div class="form-section-title">
              <span class="material-icons-outlined">wifi</span> Subscription Details
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

            <div class="form-section-title">
              <span class="material-icons-outlined">router</span> WiFi Equipment
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">WiFi Port</label>
                <input type="text" class="form-input" id="cust-wifiPort" placeholder="e.g. Port 3, Slot 2">
              </div>
              <div class="form-group">
                <label class="form-label">WiFi Type</label>
                <select class="form-input" id="cust-wifiType">
                  <option value="" disabled selected>Select WiFi type</option>
                  <option value="Fiber">Fiber (FTTH)</option>
                  <option value="DSL">DSL</option>
                  <option value="Cable">Cable</option>
                  <option value="Fixed Wireless">Fixed Wireless</option>
                  <option value="Satellite">Satellite</option>
                  <option value="LTE/5G">LTE / 5G</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div class="form-section-title">
              <span class="material-icons-outlined">photo_camera</span> House Location Photo
            </div>
            <div class="form-group">
              <div id="cust-image-preview" style="width:100%;min-height:100px;border:2px dashed rgba(255,255,255,0.1);border-radius:12px;display:flex;align-items:center;justify-content:center;cursor:pointer;overflow:hidden;position:relative;background:rgba(255,255,255,0.02);transition:border-color 0.2s;" onclick="document.getElementById('cust-imageFile').click()">
                <div id="cust-image-placeholder" style="text-align:center;padding:20px;">
                  <span class="material-icons-outlined" style="font-size:36px;color:rgba(255,255,255,0.2);">add_a_photo</span>
                  <p style="color:rgba(255,255,255,0.3);font-size:13px;margin-top:8px;">Click to upload house location photo</p>
                </div>
                <img id="cust-image-thumb" src="" alt="" style="display:none;max-width:100%;max-height:200px;border-radius:10px;">
              </div>
              <input type="file" id="cust-imageFile" accept="image/*" style="display:none;">
              <input type="hidden" id="cust-profileImage">
            </div>

            <div class="form-section-title">
              <span class="material-icons-outlined">my_location</span> Pin Location
            </div>
            <div class="form-group">
              <div id="cust-map-container" style="width:100%;height:280px;border-radius:12px;border:1px solid var(--border-color);overflow:hidden;position:relative;background:var(--bg-secondary);"></div>
              <div class="form-row" style="margin-top:10px;">
                <div class="form-group">
                  <label class="form-label">Latitude</label>
                  <input type="number" step="any" class="form-input" id="cust-latitude" placeholder="14.5995" readonly>
                </div>
                <div class="form-group">
                  <label class="form-label">Longitude</label>
                  <input type="number" step="any" class="form-input" id="cust-longitude" placeholder="120.9842" readonly>
                </div>
              </div>
              <p style="font-size:0.72rem; color:var(--text-muted); margin-top:4px;">Click on the map to pin the customer's location.</p>
            </div>

            <div class="form-section-title">
              <span class="material-icons-outlined">location_on</span> Address
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
          <button class="btn btn-primary" id="save-customer-btn">
            <span class="material-icons-outlined" style="font-size:16px;">save</span> Save Customer
          </button>
        </div>
      </div>
    </div>

    <!-- Request Repair Modal -->
    <div class="modal-overlay" id="repair-modal">
      <div class="modal modal-md">
        <div class="modal-header">
          <h3 id="repair-modal-title">Request Repair</h3>
          <button class="modal-close" id="close-repair-modal">✕</button>
        </div>
        <div class="modal-body">
          <form id="repair-form">
            <input type="hidden" id="repair-customer-id">
            <p id="repair-customer-name" style="font-size:0.9rem; color:var(--text-secondary); margin-bottom:16px;"></p>
            <div class="form-group">
              <label class="form-label">Assign Technician *</label>
              <select class="form-input" id="repair-technician" required>
                <option value="" disabled selected>Select a technician...</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Issue Details *</label>
              <textarea class="form-input" id="repair-message" rows="4" required placeholder="Describe the connection issue..."></textarea>
            </div>
          </form>
        </div>
        <div class="modal-footer" style="justify-content:flex-end;">
          <button type="button" class="btn btn-ghost" id="cancel-repair-btn">Cancel</button>
          <button type="button" class="btn btn-primary" id="send-repair-btn" style="background:var(--accent-amber); color:#000;">
            <span class="material-icons-outlined" style="font-size:16px;">build</span> Send Request
          </button>
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
  let custMap = null;
  let custMarker = null;

  // Load all data
  loadCustomers();
  loadPlans();
  loadCollectors();

  function initCustMap(lat = 14.5995, lng = 120.9842) {
    setTimeout(() => {
      const container = document.getElementById('cust-map-container');
      if (!container) return;

      // Destroy existing map
      if (custMap) {
        custMap.remove();
        custMap = null;
        custMarker = null;
      }

      custMap = L.map(container).setView([lat, lng], 13);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
      }).addTo(custMap);

      // Place marker if lat/lng provided
      if (lat !== 14.5995 || lng !== 120.9842) {
        custMarker = L.marker([lat, lng]).addTo(custMap);
        document.getElementById('cust-latitude').value = lat;
        document.getElementById('cust-longitude').value = lng;
      }

      custMap.on('click', (e) => {
        const { lat, lng } = e.latlng;
        if (custMarker) {
          custMarker.setLatLng([lat, lng]);
        } else {
          custMarker = L.marker([lat, lng]).addTo(custMap);
        }
        document.getElementById('cust-latitude').value = lat.toFixed(6);
        document.getElementById('cust-longitude').value = lng.toFixed(6);
      });

      // Fix map tiles not rendering in modal
      setTimeout(() => custMap.invalidateSize(), 300);
    }, 200);
  }

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
    const custSelect = document.getElementById('cust-collector');
    const techSelect = document.getElementById('repair-technician');
    try {
      const response = await services.collector.getAll(50, 0);
      allCollectors = response.documents || [];
    } catch (e) {
      allCollectors = [
        { $id: 'col1', id: 'col1', firstName: 'Ricardo', lastName: 'Mendoza', userId: 'col_usr1', role: 'collector' },
        { $id: 'col2', id: 'col2', firstName: 'Fernando', lastName: 'Aquino', userId: 'col_usr2', role: 'technician' },
      ];
    }
    const validCollectors = allCollectors.filter(c => c.role === 'collector');
    custSelect.innerHTML = '<option value="" disabled selected>Select a collector</option>' +
      validCollectors.map(c => `<option value="${c.$id || c.id}">${c.firstName || ''} ${c.lastName || ''}</option>`).join('');

    const technicians = allCollectors.filter(c => c.role === 'technician');
    if (techSelect) {
      techSelect.innerHTML = '<option value="" disabled selected>Select a technician...</option>' +
        technicians.map(c => `<option value="${c.$id || c.id}">${c.firstName || ''} ${c.lastName || ''}</option>`).join('');
    }
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
    // Reset image preview
    document.getElementById('cust-image-thumb').style.display = 'none';
    document.getElementById('cust-image-placeholder').style.display = 'block';
    document.getElementById('cust-profileImage').value = '';
    // Reset location
    document.getElementById('cust-latitude').value = '';
    document.getElementById('cust-longitude').value = '';
    openModal('customer-modal');
    initCustMap();
  });

  // Image upload handler
  document.getElementById('cust-imageFile').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const thumb = document.getElementById('cust-image-thumb');
    const placeholder = document.getElementById('cust-image-placeholder');
    const previewBox = document.getElementById('cust-image-preview');

    // Show local preview immediately
    const reader = new FileReader();
    reader.onload = (ev) => {
      thumb.src = ev.target.result;
      thumb.style.display = 'block';
      placeholder.style.display = 'none';
    };
    reader.readAsDataURL(file);

    // Upload to Appwrite Storage
    previewBox.style.borderColor = 'var(--accent-blue)';
    try {
      const formData = new FormData();
      formData.append('fileId', 'unique()');
      formData.append('file', file);
      formData.append('permissions[]', 'read("any")');

      const uploadRes = await fetch(`${import.meta.env.VITE_APPWRITE_ENDPOINT}/storage/buckets/customer_images/files`, {
        method: 'POST',
        headers: {
          'X-Appwrite-Project': import.meta.env.VITE_APPWRITE_PROJECT_ID,
          'X-Appwrite-Key': import.meta.env.VITE_APPWRITE_API_KEY,
        },
        body: formData,
      });
      const uploadData = await uploadRes.json();
      if (uploadRes.ok) {
        const imageUrl = `${import.meta.env.VITE_APPWRITE_ENDPOINT}/storage/buckets/customer_images/files/${uploadData.$id}/view?project=${import.meta.env.VITE_APPWRITE_PROJECT_ID}`;
        document.getElementById('cust-profileImage').value = imageUrl;
        previewBox.style.borderColor = 'var(--accent-emerald)';
        setTimeout(() => { previewBox.style.borderColor = 'rgba(255,255,255,0.1)'; }, 2000);
      } else {
        showToast('Image upload failed: ' + (uploadData.message || 'Unknown error'), 'error');
        previewBox.style.borderColor = 'var(--accent-rose)';
      }
    } catch (err) {
      showToast('Image upload failed', 'error');
      previewBox.style.borderColor = 'var(--accent-rose)';
    }
  });

  // Close modals
  document.getElementById('close-customer-modal').addEventListener('click', () => closeModal('customer-modal'));
  document.getElementById('cancel-customer-btn').addEventListener('click', () => closeModal('customer-modal'));

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
      wifiPort: document.getElementById('cust-wifiPort').value.trim(),
      wifiType: document.getElementById('cust-wifiType').value,
      profileImage: document.getElementById('cust-profileImage').value || '',
      address: document.getElementById('cust-address').value.trim(),
      barangay: document.getElementById('cust-barangay').value.trim(),
      city: document.getElementById('cust-city').value.trim(),
      province: document.getElementById('cust-province').value.trim(),
      latitude: parseFloat(document.getElementById('cust-latitude').value) || 0,
      longitude: parseFloat(document.getElementById('cust-longitude').value) || 0,
    };

    const saveBtn = document.getElementById('save-customer-btn');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    try {
      const docId = document.getElementById('customer-doc-id').value;
      if (docId) {
        // Update existing customer
        await services.customer.update(docId, data);
        const customerName = `${data.firstName} ${data.lastName}`.trim();

        // Update or create subscription with the assigned collector
        const existingSub = customerSubscriptions[allCustomers.find(c => (c.$id || c.id) === docId)?.userId];
        if (existingSub) {
          const oldCollectorId = existingSub.collectorId;
          await services.subscription.update(existingSub.$id || existingSub.id, {
            collectorId: collectorDocId,
            planId: planId,
          });
          
          if (collectorDocId && oldCollectorId !== collectorDocId) {
             await services.mobileNotification.send(
               collectorDocId,
               'New Customer Assigned',
               `You have been assigned to collect from ${customerName}.`,
               'assignment'
             );
          } else if (collectorDocId) {
             await services.mobileNotification.send(
               collectorDocId,
               'Customer Info Updated',
               `Information for ${customerName} was updated by admin.`,
               'update'
             );
          }
        } else {
          const customer = allCustomers.find(c => (c.$id || c.id) === docId);
          if (customer) {
            await services.subscription.create({
              customerId: customer.userId,
              planId: planId,
              collectorId: collectorDocId,
            });
            if (collectorDocId) {
               await services.mobileNotification.send(
                 collectorDocId,
                 'New Customer Assigned',
                 `You have been assigned to collect from ${customerName}.`,
                 'assignment'
               );
            }
          }
        }
        showToast('Customer updated successfully!', 'success');
      } else {
        // Create new customer
        data.userId = 'usr_' + Date.now();
        const newCustomer = await services.customer.create(data);
        const customerName = `${data.firstName} ${data.lastName}`.trim();

        // Auto-create subscription with the selected collector
        try {
          await services.subscription.create({
            customerId: data.userId,
            planId: planId,
            collectorId: collectorDocId,
          });
          if (collectorDocId) {
             await services.mobileNotification.send(
               collectorDocId,
               'New Customer Assigned',
               `You have been assigned to collect from ${customerName}.`,
               'assignment'
             );
          }
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
              <div style="font-size:0.72rem; color:var(--text-muted);">${c.middleName ? c.middleName + ' • ' : ''}${c.barangay || ''}${c.wifiType ? ' • ' + c.wifiType : ''}</div>
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
        <td style="max-width:200px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
          <div style="font-size:0.85rem; color:var(--text-primary);">${[c.address, c.barangay, c.city].filter(Boolean).join(', ')}</div>
          ${c.latitude && c.longitude ? `<a href="https://www.google.com/maps?q=${c.latitude},${c.longitude}" target="_blank" style="font-size:0.75rem; color:var(--accent-blue); text-decoration:none; display:inline-flex; align-items:center; gap:4px; margin-top:4px;" onclick="event.stopPropagation();"><span class="material-icons-outlined" style="font-size:14px;">place</span>View Map</a>` : `<span style="font-size:0.75rem; color:var(--text-muted); display:block; margin-top:4px;">No pinned location</span>`}
        </td>
        <td>
          <div class="table-actions">
            <button class="btn btn-ghost btn-sm btn-icon" title="Request Repair" data-repair="${c.$id || c.id}" style="color:var(--accent-amber);"><span class="material-icons-outlined" style="font-size:18px;">build</span></button>
            <button class="btn btn-ghost btn-sm btn-icon" title="View" data-view="${c.$id || c.id}"><span class="material-icons-outlined" style="font-size:18px;">visibility</span></button>
            <button class="btn btn-ghost btn-sm btn-icon" title="Delete" data-delete="${c.$id || c.id}" style="color:var(--accent-rose);"><span class="material-icons-outlined" style="font-size:18px;">delete</span></button>
          </div>
        </td>
      </tr>
    `}).join('');

    // Clicking view or row → navigate to detail page
    tbody.querySelectorAll('[data-view]').forEach(btn => {
      btn.addEventListener('click', () => navigateFn('customer_detail:' + btn.dataset.view));
    });

    tbody.querySelectorAll('[data-delete]').forEach(btn => {
      btn.addEventListener('click', (e) => { e.stopPropagation(); deleteCustomer(btn.dataset.delete); });
    });

    tbody.querySelectorAll('[data-repair]').forEach(btn => {
      btn.addEventListener('click', (e) => { e.stopPropagation(); openRepairModal(btn.dataset.repair); });
    });

    // Make entire rows clickable
    makeRowsClickable();
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

  // Make entire customer row clickable (except action buttons)
  function makeRowsClickable() {
    const tbody = document.getElementById('customers-tbody');
    if (!tbody) return;
    tbody.querySelectorAll('tr').forEach(row => {
      const viewBtn = row.querySelector('[data-view]');
      if (!viewBtn) return;
      row.style.cursor = 'pointer';
      row.addEventListener('click', (e) => {
        // Don't navigate if clicking action buttons
        if (e.target.closest('.table-actions')) return;
        navigateFn('customer_detail:' + viewBtn.dataset.view);
      });
    });
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
    document.getElementById('cust-wifiPort').value = c.wifiPort || '';
    document.getElementById('cust-wifiType').value = c.wifiType || '';
    document.getElementById('cust-profileImage').value = c.profileImage || '';
    document.getElementById('cust-address').value = c.address || '';
    document.getElementById('cust-barangay').value = c.barangay || '';
    document.getElementById('cust-city').value = c.city || '';
    document.getElementById('cust-province').value = c.province || '';

    // Show existing image if any
    const thumb = document.getElementById('cust-image-thumb');
    const placeholder = document.getElementById('cust-image-placeholder');
    if (c.profileImage) {
      thumb.src = c.profileImage;
      thumb.style.display = 'block';
      placeholder.style.display = 'none';
    } else {
      thumb.style.display = 'none';
      placeholder.style.display = 'block';
    }

    // Pre-select the assigned collector from subscription
    const sub = customerSubscriptions[c.userId];
    const collectorSelect = document.getElementById('cust-collector');
    if (sub && sub.collectorId) {
      collectorSelect.value = sub.collectorId;
    } else {
      collectorSelect.value = '';
    }

    // Pre-fill location
    const lat = c.latitude || 0;
    const lng = c.longitude || 0;
    document.getElementById('cust-latitude').value = lat || '';
    document.getElementById('cust-longitude').value = lng || '';

    openModal('customer-modal');
    initCustMap(lat || 14.5995, lng || 120.9842);
  }

  function openRepairModal(customerId) {
    const customer = allCustomers.find(c => (c.$id || c.id) === customerId);
    if (!customer) return;
    
    document.getElementById('repair-customer-id').value = customerId;
    document.getElementById('repair-customer-name').textContent = `Customer: ${customer.firstName || ''} ${customer.lastName || ''} - ${customer.address || ''}`;
    document.getElementById('repair-form').reset();
    openModal('repair-modal');
  }

  document.getElementById('cancel-repair-btn').addEventListener('click', () => closeModal('repair-modal'));
  document.getElementById('close-repair-modal').addEventListener('click', () => closeModal('repair-modal'));

  document.getElementById('send-repair-btn').addEventListener('click', async () => {
    const custId = document.getElementById('repair-customer-id').value;
    const techId = document.getElementById('repair-technician').value;
    const message = document.getElementById('repair-message').value;

    if (!techId || !message) {
      showToast('Please select a technician and describe the issue.', 'error');
      return;
    }

    const btn = document.getElementById('send-repair-btn');
    btn.disabled = true;
    btn.textContent = 'Sending...';

    try {
      const customer = allCustomers.find(c => (c.$id || c.id) === custId);
      const custName = customer ? `${customer.firstName || ''} ${customer.lastName || ''}`.trim() : 'Unknown Customer';
      const custAddress = customer ? [customer.address, customer.barangay, customer.city, customer.province].filter(Boolean).join(', ') : 'Unknown Location';
      const fullMessage = `Location: ${custAddress}\nIssue: ${message}`;

      // 1. Send notification to technician
      await services.mobileNotification.sendToTechnician(
         techId,
         `Repair: ${custName}`,
         fullMessage,
         'repair'
      );

      // 2. Create repair ticket document
      const endpoint = import.meta.env.VITE_APPWRITE_ENDPOINT;
      const projectId = import.meta.env.VITE_APPWRITE_PROJECT_ID;
      const apiKey = import.meta.env.VITE_APPWRITE_API_KEY;
      const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;

      // Get technician's auth userId for permissions
      let techAuthUserId = null;
      try {
        const techProfileRes = await fetch(`${endpoint}/databases/${dbId}/collections/users_profile/documents/${techId}`, {
          headers: { 'X-Appwrite-Project': projectId, 'X-Appwrite-Key': apiKey }
        });
        if (techProfileRes.ok) {
          const techProfile = await techProfileRes.json();
          techAuthUserId = techProfile.userId;
        }
      } catch (_) {}

      const ticketPerms = techAuthUserId ? [
        `read("user:${techAuthUserId}")`,
        `update("user:${techAuthUserId}")`,
        `read("any")`,
        `update("any")`
      ] : [`read("any")`, `update("any")`];

      await fetch(`${endpoint}/databases/${dbId}/collections/repair_tickets/documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Appwrite-Project': projectId,
          'X-Appwrite-Key': apiKey,
        },
        body: JSON.stringify({
          documentId: 'unique()',
          data: {
            customerId: custId,
            customerName: custName,
            customerAddress: custAddress,
            technicianId: techId,
            status: 'pending',
            priority: 'medium',
            issue: message,
            notes: '',
            latitude: customer?.latitude || 0,
            longitude: customer?.longitude || 0,
          },
          permissions: ticketPerms
        })
      });

      // Notify the assigned technician
      try {
        await MobileNotificationService.sendToTechnician(
          techId,
          'New Repair Ticket',
          `You have a new repair request for ${custName}: ${message}`,
          'ticket_assigned'
        );
      } catch (notifErr) {
        console.warn('Failed to notify technician:', notifErr);
      }

      showToast('Repair ticket created & technician notified!', 'success');
      closeModal('repair-modal');
    } catch (e) {
      showToast('Failed to send request. Local demo mode applied.', 'success');
      closeModal('repair-modal');
    } finally {
      btn.disabled = false;
      btn.innerHTML = `<span class="material-icons-outlined" style="font-size:16px; margin-right:6px;">build</span> Send Request`;
    }
  });

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
