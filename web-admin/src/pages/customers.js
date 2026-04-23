import { statusBadge, formatCurrency, formatDate, getInitials, showToast, openModal, closeModal, skeletonRows, showAlert } from '../components/ui-helpers.js';
import { MobileNotificationService } from '../services/notification.service.js';
import { ENDPOINT, PROJECT_ID, API_KEY, DATABASE_ID } from '../config/appwrite.js';

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
            <th>Status</th>
            <th>Address</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody id="customers-tbody">
          ${skeletonRows(6, 5)}
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
            <div class="form-group" style="max-width: 300px; margin-bottom: 12px;">
              <label class="form-label">Customer ID</label>
              <input type="text" class="form-input" id="cust-userId" placeholder="Auto-generated if empty">
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
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Phone Number *</label>
                <input type="tel" class="form-input" id="cust-phone" required placeholder="09XX XXX XXXX">
              </div>
              <div class="form-group">
                <label class="form-label">Facebook Profile URL</label>
                <input type="url" class="form-input" id="cust-facebook" placeholder="https://facebook.com/...">
              </div>
            </div>

            <div class="form-section-title">
              <span class="material-icons-outlined">receipt_long</span> Billing
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">WiFi Plan *</label>
                <select class="form-input" id="cust-plan" required>
                  <option value="" disabled selected>Select a plan</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Billing Date *</label>
                <input type="date" class="form-input" id="cust-billingDate" required>
              </div>
            </div>

            <div class="form-section-title">
              <span class="material-icons-outlined">wifi</span> Subscription Details
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">PPPoE Account</label>
                <input type="text" class="form-input" id="cust-pppoeAccount" placeholder="e.g. user_123">
              </div>
              <div class="form-group">
                <label class="form-label">PPPoE Password</label>
                <input type="text" class="form-input" id="cust-pppoePassword" placeholder="...">
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">WiFi Name</label>
                <input type="text" class="form-input" id="cust-wifiName" placeholder="Network name">
              </div>
              <div class="form-group">
                <label class="form-label">WiFi Password</label>
                <input type="text" class="form-input" id="cust-wifiPassword" placeholder="Network password">
              </div>
            </div>

            <div class="form-section-title">
              <span class="material-icons-outlined">router</span> Facility
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Napbox</label>
                <input type="text" class="form-input" id="cust-napbox" placeholder="e.g. NB-01">
              </div>
              <div class="form-group">
                <label class="form-label">Port</label>
                <input type="text" class="form-input" id="cust-wifiPort" placeholder="e.g. Port 3">
              </div>
            </div>

            <div class="form-section-title">
              <span class="material-icons-outlined">photo_camera</span> House Location Photos
            </div>
            <div class="form-group">
              <div id="cust-photos-grid" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(100px, 1fr)); gap:10px;"></div>
              <input type="file" id="cust-imageFile" accept="image/*" multiple style="display:none;">
              <input type="hidden" id="cust-profileImage">
              <p style="font-size:0.72rem; color:var(--text-muted); margin-top:8px;">You can select multiple photos at once.</p>
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
            <span class="material-icons-outlined" style="font-size:16px;">save</span> <span id="save-btn-text">💾 Save Customer Info</span>
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
      const activeOptions = allPlans.filter(p => p.isActive !== false && !p.name.startsWith('[ARCHIVED]'));
      if (activeOptions.length === 0) {
        select.innerHTML = '<option value="" disabled selected>No plans available — add one in WiFi Plans</option>';
        return;
      }
    } catch (e) {
      console.error('Could not load plans:', e);
      allPlans = [];
    }
    
    const activeOptions = allPlans.filter(p => p.isActive !== false && !p.name.startsWith('[ARCHIVED]'));
    select.innerHTML = '<option value="" disabled selected>Select a plan</option>' +
      activeOptions.map(p => `<option value="${p.$id || p.id}">₱${(p.monthlyRate || 0).toLocaleString()} — ${p.name || p.planName || '(Unnamed Plan)'}</option>`).join('');
  }

  async function loadCollectors() {
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

    const technicians = allCollectors.filter(c => c.role === 'technician');
    // Store technicians for notification broadcast
    window.__allTechnicians = technicians;
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

    const userIdInput = document.getElementById('cust-userId');
    if (userIdInput) {
      // Auto-generate ID on modal open
      const randomNum = Math.floor(100000 + Math.random() * 900000);
      userIdInput.value = 'CUST-' + randomNum;
      userIdInput.readOnly = true;
      userIdInput.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
    }

    // Reset multi-photo grid
    window.__custPhotos = [];
    renderCustPhotosGrid();
    document.getElementById('cust-profileImage').value = '';
    // Reset location
    document.getElementById('cust-latitude').value = '';
    document.getElementById('cust-longitude').value = '';
    openModal('customer-modal');
    initCustMap();
  });

  // Multi-photo state
  if (!window.__custPhotos) window.__custPhotos = [];

  function renderCustPhotosGrid() {
    const grid = document.getElementById('cust-photos-grid');
    if (!grid) return;

    // Photo thumbnails + inline "+" add button
    const photoTiles = window.__custPhotos.map((url, i) => `
      <div style="position:relative;border-radius:10px;overflow:hidden;border:1px solid rgba(255,255,255,0.1);aspect-ratio:1;">
        <img src="${url}" style="width:100%;height:100%;object-fit:cover;display:block;" />
        <button data-remove-photo="${i}" style="position:absolute;top:4px;right:4px;width:20px;height:20px;border-radius:50%;background:rgba(0,0,0,0.7);border:1px solid rgba(255,255,255,0.2);color:white;font-size:11px;cursor:pointer;display:flex;align-items:center;justify-content:center;line-height:1;transition:background 0.2s;" onmouseover="this.style.background='var(--accent-rose)'" onmouseout="this.style.background='rgba(0,0,0,0.7)'">\u2715</button>
      </div>
    `).join('');

    // "+" add tile (always shown at end)
    const addTile = `
      <div id="cust-add-tile" style="aspect-ratio:1;border-radius:10px;border:2px dashed rgba(255,255,255,0.12);display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;background:rgba(255,255,255,0.02);transition:border-color 0.2s, background 0.2s;" onmouseover="this.style.borderColor='var(--accent-blue)';this.style.background='rgba(74,144,255,0.06)'" onmouseout="this.style.borderColor='rgba(255,255,255,0.12)';this.style.background='rgba(255,255,255,0.02)'">
        <span class="material-icons-outlined" style="font-size:24px;color:rgba(255,255,255,0.3);">add</span>
      </div>
    `;

    grid.innerHTML = photoTiles + addTile;

    // "+" tile click
    document.getElementById('cust-add-tile')?.addEventListener('click', () => {
      document.getElementById('cust-imageFile').click();
    });

    // Remove buttons
    grid.querySelectorAll('[data-remove-photo]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.removePhoto);
        window.__custPhotos.splice(idx, 1);
        renderCustPhotosGrid();
        syncCustProfileImage();
      });
    });
  }

  function syncCustProfileImage() {
    const input = document.getElementById('cust-profileImage');
    // Only include real URLs (exclude data: URLs that are still uploading)
    const realUrls = window.__custPhotos.filter(u => !u.startsWith('data:'));
    if (realUrls.length === 0) {
      input.value = '';
    } else if (realUrls.length === 1) {
      input.value = realUrls[0];
    } else {
      // For multiple URLs, extract fileIds to save space since limit is 500 chars
      const fileIds = realUrls.map(url => {
        const match = url.match(/\/files\/([^/]+)\/view/);
        return match ? match[1] : url;
      });
      input.value = JSON.stringify(fileIds);
    }
  }

  // Expose globally for edit pre-fill
  window.renderCustPhotosGrid = renderCustPhotosGrid;
  window.syncCustProfileImage = syncCustProfileImage;

  // Initial render (shows the "+" tile)
  renderCustPhotosGrid();

  // Image upload handler (multi-photo, multi-select)
  document.getElementById('cust-imageFile').addEventListener('change', async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    for (const file of files) {
      // Show local preview immediately via data URL
      const dataUrl = await new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = (ev) => resolve(ev.target.result);
        reader.readAsDataURL(file);
      });
      const previewIdx = window.__custPhotos.length;
      window.__custPhotos.push(dataUrl);
      renderCustPhotosGrid();

      // Upload to Appwrite Storage
      try {
        const formData = new FormData();
        formData.append('fileId', 'unique()');
        formData.append('file', file);
        formData.append('permissions[]', 'read("any")');

        const uploadRes = await fetch(`${ENDPOINT}/storage/buckets/customer_images/files`, {
          method: 'POST',
          headers: {
            'X-Appwrite-Project': PROJECT_ID,
            'X-Appwrite-Key': API_KEY,
          },
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (uploadRes.ok) {
          const imageUrl = `${ENDPOINT}/storage/buckets/customer_images/files/${uploadData.$id}/view?project=${PROJECT_ID}`;
          // Replace the data URL with the real URL
          window.__custPhotos[previewIdx] = imageUrl;
          renderCustPhotosGrid();
          syncCustProfileImage();
        } else {
          showToast('Image upload failed: ' + (uploadData.message || 'Unknown error'), 'error');
          window.__custPhotos.splice(previewIdx, 1);
          renderCustPhotosGrid();
        }
      } catch (err) {
        showToast('Image upload failed', 'error');
        window.__custPhotos.splice(previewIdx, 1);
        renderCustPhotosGrid();
      }
    }
    syncCustProfileImage();
    // Reset file input so the same files can be selected again
    e.target.value = '';
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

  document.getElementById('save-customer-btn').addEventListener('click', async () => {
    const form = document.getElementById('customer-form');
    
    // Explicit manual validation to guarantee feedback
    const requiredFields = [
      { id: 'cust-firstName', name: 'First Name' },
      { id: 'cust-lastName', name: 'Last Name' },
      { id: 'cust-phone', name: 'Phone Number' },
      { id: 'cust-plan', name: 'WiFi Plan' },
      { id: 'cust-billingDate', name: 'Billing Date' },
      { id: 'cust-address', name: 'Street Address' },
      { id: 'cust-barangay', name: 'Barangay' },
      { id: 'cust-city', name: 'City / Municipality' },
      { id: 'cust-province', name: 'Province' }
    ];

    for (const field of requiredFields) {
      const el = document.getElementById(field.id);
      if (!el || !el.value.trim()) {
        showAlert(`❌ Please fill in the required field: ${field.name}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
    }

    const planId = document.getElementById('cust-plan').value;

    // Ensure profileImage hidden input is synced before save
    if (window.syncCustProfileImage) syncCustProfileImage();

    const data = {
      firstName: document.getElementById('cust-firstName').value.trim(),
      middleName: document.getElementById('cust-middleName').value.trim(),
      lastName: document.getElementById('cust-lastName').value.trim(),
      phone: document.getElementById('cust-phone').value.trim(),
      facebookUrl: document.getElementById('cust-facebook').value.trim(),
      pppoeUser: document.getElementById('cust-pppoeAccount').value.trim(),
      pppoePassword: document.getElementById('cust-pppoePassword').value.trim(),
      wifiName: document.getElementById('cust-wifiName').value.trim(),
      wifiPassword: document.getElementById('cust-wifiPassword').value.trim(),
      planId: planId,
      billingStartDate: document.getElementById('cust-billingDate').value.trim(),
      napbox: document.getElementById('cust-napbox').value.trim(),
      wifiPort: document.getElementById('cust-wifiPort').value.trim(),
      profileImage: document.getElementById('cust-profileImage').value || '',
      address: document.getElementById('cust-address').value.trim(),
      barangay: document.getElementById('cust-barangay').value.trim(),
      city: document.getElementById('cust-city').value.trim(),
      province: document.getElementById('cust-province').value.trim(),
      latitude: parseFloat(document.getElementById('cust-latitude').value) || 0,
      longitude: parseFloat(document.getElementById('cust-longitude').value) || 0,
    };

    const saveBtn = document.getElementById('save-customer-btn');
    const saveBtnText = document.getElementById('save-btn-text');
    saveBtn.disabled = true;
    if (saveBtnText) saveBtnText.textContent = 'Saving...';
    else saveBtn.textContent = 'Saving...';

    // Debug: log the data being sent
    console.log('Saving customer data:', JSON.stringify(data, null, 2));

    try {
      const docId = document.getElementById('customer-doc-id').value;
      if (docId) {
        // Update existing customer
        await services.customer.update(docId, data);
        const customerName = `${data.firstName} ${data.lastName}`.trim();

        // Update or create subscription (no collector assignment)
        const existingSub = customerSubscriptions[allCustomers.find(c => (c.$id || c.id) === docId)?.userId];
        if (existingSub) {
          await services.subscription.update(existingSub.$id || existingSub.id, {
            planId: planId,
            startDate: data.billingStartDate
          });
        } else {
          const customer = allCustomers.find(c => (c.$id || c.id) === docId);
          if (customer) {
            await services.subscription.create({
              customerId: customer.userId,
              planId: planId,
              collectorId: '',
              status: 'active',
              startDate: data.billingStartDate
            });
          }
        }
        showToast('Customer updated successfully!', 'success');
      } else {
        // Create new customer
        const customUserId = document.getElementById('cust-userId') ? document.getElementById('cust-userId').value.trim() : '';
        data.userId = customUserId || ('usr_' + Date.now());
        console.log('Creating new customer with userId:', data.userId);
        const newCustomer = await services.customer.create(data);
        console.log('Customer created:', newCustomer);
        
        // Force auto-bill catch-up to run next time Billing tab is opened
        sessionStorage.removeItem('autoBillingDone');

        // Auto-create subscription (visible to all collectors)
        try {
          await services.subscription.create({
            customerId: data.userId,
            planId: planId,
            collectorId: '',
            status: 'active',
            startDate: data.billingStartDate
          });
        } catch (subErr) {
          console.warn('Subscription creation failed:', subErr);
        }

        // Auto-create first billing record for the selected date
        try {
          const plan = allPlans.find(p => (p.$id || p.id) === planId);
          const planRate = plan ? (plan.monthlyRate || 0) : 0;
          
          let billDate = new Date();
          if (data.billingStartDate) {
            billDate = new Date(data.billingStartDate);
          }
          const y = billDate.getFullYear();
          const m = String(billDate.getMonth() + 1).padStart(2, '0');
          const d = String(billDate.getDate()).padStart(2, '0');
          
          // Store as YYYY-MM (consistent with auto-billing format)
          const billingMonth = `${y}-${m}`;
          // Due date = exactly 1 month from chosen billing date
          const dueDate = new Date(billDate.getFullYear(), billDate.getMonth() + 1, billDate.getDate());
          
          const customerName = `${data.firstName} ${data.lastName}`.trim();
          await services.billing.create({
            customerId: data.userId,
            customerName: customerName,
            subscriptionId: '',
            billingMonth: billingMonth,
            amount: planRate,
            dueDate: dueDate.toISOString(),
            paymentStatus: 'not_yet_paid',
            paidDate: null,
            collectedBy: null,
            notes: '',
          });
          console.log(`[AutoBilling] First bill created for ${customerName} — ${billingMonth} — ₱${planRate}`);
        } catch (billErr) {
          console.warn('First billing record creation failed:', billErr);
        }

        showToast('Customer added successfully!', 'success');
      }
      closeModal('customer-modal');
      loadCustomers();
    } catch (error) {
      console.error('Customer save failed:', error);
      // Demo Fallback Mode for Vercel Previews
      if (typeof error.message === 'string' && (error.message.includes('Failed to fetch') || error.message.includes('fetch'))) {
        const docId = document.getElementById('customer-doc-id').value;
        if (docId) {
          const idx = allCustomers.findIndex(c => (c.$id || c.id) === docId);
          if (idx !== -1) Object.assign(allCustomers[idx], data);
          showToast('Customer updated (demo)', 'success');
        } else {
          data.$id = data.userId || ('demo_' + Date.now());
          allCustomers.unshift(data);
          showToast('Customer added (demo)', 'success');
        }
        closeModal('customer-modal');
        renderCustomerTable(allCustomers);
      } else {
        let msg = 'Failed to save customer';
        if (typeof error === 'string') msg = error;
        else if (error && error.message) msg = error.message;
        else if (error && typeof error === 'object') msg = JSON.stringify(error);
        showAlert('Save Error: ' + String(msg)); // Fallback alert
        if (typeof showToast !== 'undefined') showToast(msg, 'error');
      }
    } finally {
      saveBtn.disabled = false;
      if (saveBtnText) saveBtnText.textContent = '💾 Save Customer Info';
      else saveBtn.textContent = 'Save Customer';
    }
  });

  // Load customers
  async function loadCustomers() {
    try {
      const response = await services.customer.getAll(50, 0);
      allCustomers = response.documents || [];
    } catch (error) {
      console.error('Failed to load customers:', error.message);
      allCustomers = [];
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
      tbody.innerHTML = `<tr><td colspan="5">
        <div class="empty-state">
          <div class="empty-icon"><span class="material-icons-outlined" style="font-size:3rem;">people</span></div>
          <div class="empty-title">No customers yet</div>
          <div class="empty-text">Click "Add Customer" to add your first customer.</div>
        </div>
      </td></tr>`;
      return;
    }

    tbody.innerHTML = customers.map(c => {
      return `
      <tr>
        <td>
          <div style="display:flex; align-items:center; gap:10px;">
            <div class="avatar avatar-sm" style="background:linear-gradient(135deg, hsl(${hashCode(c.firstName || '')},70%,55%), hsl(${hashCode(c.lastName || '')},60%,45%));">
              ${getInitials(c.firstName, c.lastName)}
            </div>
            <div>
              <div style="color:var(--text-primary); font-weight:500; display:flex; align-items:center;">
                ${c.firstName || ''} ${c.lastName || ''}
                <span style="font-size:0.7rem; color:var(--text-muted); margin-left:8px; font-family:monospace; background:rgba(255,255,255,0.05); padding:2px 6px; border-radius:4px; border:1px solid rgba(255,255,255,0.05);">${c.userId || ''}</span>
              </div>
              <div style="font-size:0.72rem; color:var(--text-muted);">${c.middleName ? c.middleName + ' • ' : ''}${c.barangay || ''}${c.napbox ? ' • ' + c.napbox : ''}</div>
            </div>
          </div>
        </td>
        <td>${c.phone || '—'}</td>
        <td>${(() => { const p = allPlans.find(x => (x.$id || x.id) === c.planId); if (p) { const planName = (p.name || '(Unnamed)').replace('[ARCHIVED] ', ''); const rate = (p.monthlyRate || 0).toLocaleString(); return planName + ' — ₱' + rate; } return c.planId ? '—' : '—'; })()}</td>
        <td>
          <select class="form-input btn-sm table-status-select" data-customer-id="${c.$id || c.id}" style="width: auto; padding: 4px 24px 4px 8px; font-size: 0.75rem; border-color: rgba(255,255,255,0.1); background: rgba(0,0,0,0.2);" onclick="event.stopPropagation();">
            <option value="active" ${c.status === 'active' || !c.status ? 'selected' : ''}>Active</option>
            <option value="inactive" ${c.status === 'inactive' ? 'selected' : ''}>Inactive</option>
            <option value="disable" ${c.status === 'disable' ? 'selected' : ''}>Disable</option>
          </select>
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

    // Handle status dropdown changes directly in the table
    tbody.querySelectorAll('.table-status-select').forEach(select => {
      select.addEventListener('change', async (e) => {
        const newStatus = e.target.value;
        const customerId = e.target.dataset.customerId;
        e.target.disabled = true;
        try {
          await services.customer.update(customerId, { status: newStatus });
          
          // Also sync with the underlying subscription if it exists
          const customer = allCustomers.find(c => (c.$id || c.id) === customerId);
          if (customer && customer.userId) {
            const existingSub = customerSubscriptions[customer.userId];
            if (existingSub) {
              await services.subscription.update(existingSub.$id || existingSub.id, { status: newStatus });
              existingSub.status = newStatus;
            }
            customer.status = newStatus; // Sync local memory
          }

          showToast('Status updated', 'success');
        } catch (error) {
          console.error(error);
          showToast('Failed to update status', 'error');
        } finally {
          e.target.disabled = false;
        }
      });
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
      return `${c.firstName} ${c.middleName} ${c.lastName} ${c.phone} ${planName} ${c.address} ${c.barangay} ${c.city} ${c.napbox || ''}`
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
        // Don't navigate if clicking action buttons or selects
        if (e.target.closest('.table-actions') || e.target.closest('select')) return;
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
    
    const userIdInput = document.getElementById('cust-userId');
    if (userIdInput) {
      userIdInput.value = c.userId || '';
      userIdInput.readOnly = true;
      userIdInput.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
    }

    document.getElementById('cust-firstName').value = c.firstName || '';
    document.getElementById('cust-middleName').value = c.middleName || '';
    document.getElementById('cust-lastName').value = c.lastName || '';
    document.getElementById('cust-phone').value = c.phone || '';
    document.getElementById('cust-facebook').value = c.facebookUrl || '';
    document.getElementById('cust-pppoeAccount').value = c.pppoeAccount || '';
    document.getElementById('cust-pppoePassword').value = c.pppoePassword || '';
    document.getElementById('cust-wifiName').value = c.wifiName || '';
    document.getElementById('cust-wifiPassword').value = c.wifiPassword || '';
    document.getElementById('cust-plan').value = c.planId || '';
    document.getElementById('cust-billingDate').value = c.billingStartDate || '';
    document.getElementById('cust-napbox').value = c.napbox || '';
    document.getElementById('cust-wifiPort').value = c.wifiPort || '';
    document.getElementById('cust-profileImage').value = c.profileImage || '';

    // Pre-fill existing photos into multi-photo grid
    if (c.profileImage) {
      try {
        const trimmed = c.profileImage.trim();
        let arr = [];
        if (trimmed.startsWith('[')) {
          arr = JSON.parse(trimmed).filter(u => u && u.length > 0);
        } else {
          arr = [trimmed];
        }
        window.__custPhotos = arr.map(item => {
          if (item.startsWith('http') || item.startsWith('data:')) return item;
          return `${ENDPOINT}/storage/buckets/customer_images/files/${item}/view?project=${PROJECT_ID}`;
        });
      } catch (_) {
        let fallback = c.profileImage;
        if (!fallback.startsWith('http') && !fallback.startsWith('data:')) {
           fallback = `${ENDPOINT}/storage/buckets/customer_images/files/${fallback}/view?project=${PROJECT_ID}`;
        }
        window.__custPhotos = [fallback];
      }
    } else {
      window.__custPhotos = [];
    }
    if (window.renderCustPhotosGrid) renderCustPhotosGrid();

    document.getElementById('cust-address').value = c.address || '';
    document.getElementById('cust-barangay').value = c.barangay || '';
    document.getElementById('cust-city').value = c.city || '';
    document.getElementById('cust-province').value = c.province || '';

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
    const message = document.getElementById('repair-message').value;

    if (!message) {
      showToast('Please describe the issue.', 'error');
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

      // 1. Create repair ticket document (broadcast — no technician assigned)
      const endpoint = ENDPOINT;
      const projectId = PROJECT_ID;
      const apiKey = API_KEY;
      const dbId = DATABASE_ID;

      const ticketPerms = [`read("any")`, `update("any")`];

      const ticketRes = await fetch(`${endpoint}/databases/${dbId}/collections/repair_tickets/documents`, {
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
            technicianId: '',
            status: 'pending',
            priority: 'medium',
            issue: message,
            notes: ''
          },
          permissions: ticketPerms
        })
      });

      if (!ticketRes.ok) {
          throw new Error('Failed to create repair ticket');
      }

      // 2. Notify ALL technicians
      const technicians = window.__allTechnicians || [];
      let notifCount = 0;
      for (const tech of technicians) {
        const techId = tech.$id || tech.id;
        try {
          const sent = await MobileNotificationService.sendToTechnician(
            techId,
            `New Repair: ${custName}`,
            fullMessage,
            'repair'
          );
          if (sent) notifCount++;
        } catch (_) {}
      }

      if (notifCount > 0) {
        showToast(`Repair ticket created & ${notifCount} technician(s) notified!`, 'success');
      } else if (technicians.length === 0) {
        showToast('Repair ticket created! (No technicians found to notify)', 'success');
      } else {
        showToast('Repair ticket created! (Notifications may have failed)', 'success');
      }
      
      closeModal('repair-modal');
    } catch (e) {
      console.error('Submit Repair Error:', e);
      showAlert('FAILED to create Repair Ticket! Appwrite Error: ' + e.message);
      showToast('Error: ' + e.message, 'danger');
    } finally {
      btn.disabled = false;
      btn.innerHTML = `<span class="material-icons-outlined" style="font-size:16px; margin-right:6px;">build</span> Send Request`;
    }
  });

  async function deleteCustomer(id) {
    const customer = allCustomers.find(c => (c.$id || c.id) === id);
    const custName = customer ? `${customer.firstName || ''} ${customer.lastName || ''}`.trim() : id;

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.zIndex = '500';
    modal.innerHTML = `
      <div class="modal" style="max-width:400px;">
        <div class="modal-header">
          <h3>Delete Customer</h3>
          <button class="modal-close" id="close-cust-del">✕</button>
        </div>
        <div class="modal-body" style="text-align:center; padding:24px;">
          <span class="material-icons-outlined" style="font-size:3rem; color:var(--accent-rose); display:block; margin-bottom:12px;">person_remove</span>
          <p style="color:var(--text-primary); font-weight:600; margin-bottom:4px;">Delete this customer?</p>
          <p style="color:var(--text-muted); font-size:0.85rem;">${custName}</p>
          <p style="color:var(--text-muted); font-size:0.8rem; margin-top:8px;">This will permanently remove the customer and cannot be undone.</p>
        </div>
        <div class="modal-footer" style="justify-content:center; gap:12px;">
          <button class="btn btn-ghost" id="cancel-cust-del">Cancel</button>
          <button class="btn btn-primary" id="confirm-cust-del" style="background:var(--accent-rose); border-color:var(--accent-rose);">
            <span class="material-icons-outlined" style="font-size:16px;">delete</span> Delete
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    void modal.offsetWidth;
    modal.classList.add('active');

    const closeCustDelModal = () => {
      modal.classList.remove('active');
      setTimeout(() => modal.remove(), 400);
    };

    modal.querySelector('#close-cust-del').addEventListener('click', closeCustDelModal);
    modal.querySelector('#cancel-cust-del').addEventListener('click', closeCustDelModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeCustDelModal(); });

    modal.querySelector('#confirm-cust-del').addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      btn.disabled = true;
      btn.innerHTML = `<span class="material-icons-outlined" style="font-size:16px;">hourglass_empty</span> Deleting...`;
      try {
        const custUserId = customer?.userId;

        // 1. Delete ALL billing records for this customer (paginated)
        if (custUserId) {
          try {
            let offset = 0;
            let hasMore = true;
            while (hasMore) {
              const billingRes = await services.billing.getAll(null, 100, offset);
              const allBills = billingRes.documents || [];
              const customerBills = allBills.filter(b => b.customerId === custUserId || b.customerName === custName);
              for (const bill of customerBills) {
                try { await services.billing.delete(bill.$id || bill.id); } catch (_) {}
              }
              hasMore = allBills.length === 100;
              offset += 100;
            }
          } catch (billErr) {
            console.warn('Could not delete billing records:', billErr);
          }

          // 2. Delete ALL subscriptions for this customer (any status)
          try {
            const subsRes = await services.subscription.getAll(null, 200);
            const custSubs = (subsRes.documents || []).filter(s => s.customerId === custUserId);
            for (const sub of custSubs) {
              try { await services.subscription.delete(sub.$id || sub.id); } catch (_) {}
            }
          } catch (subErr) {
            console.warn('Could not delete subscriptions:', subErr);
          }
        }

        // 3. Delete the customer profile document
        await services.customer.delete(id);
        showToast('Customer, billing & subscription records deleted', 'success');
      } catch (error) {
        console.warn('API delete failed, removing locally:', error);
        showToast('Customer removed from view', 'success');
      } finally {
        allCustomers = allCustomers.filter(c => (c.$id || c.id) !== id);
        closeCustDelModal();
        renderCustomerTable(allCustomers);
      }
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

