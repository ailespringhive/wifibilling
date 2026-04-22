import { getInitials, showToast, openModal, closeModal, skeletonRows, formatDate, showConfirm } from '../components/ui-helpers.js';
import { ENDPOINT, PROJECT_ID, API_KEY, DATABASE_ID } from '../config/appwrite.js';

/**
 * Collectors Page — Table layout matching Customers page
 */
export function renderCollectorsPage() {
  return `
    <div class="toolbar">
      <div class="toolbar-left">
        <div class="search-bar" style="max-width:320px; flex:1;">
          <span class="search-icon"><span class="material-icons-outlined" style="font-size:18px;">search</span></span>
          <input type="text" placeholder="Search collectors..." id="collector-search">
        </div>
      </div>
      <div class="toolbar-right">
        <button class="btn btn-primary" id="add-collector-btn">+ Add Collector</button>
      </div>
    </div>

    <!-- Collectors Table -->
    <div class="table-container">
      <table class="data-table" id="collectors-table">
        <thead>
          <tr>
            <th>PERSONNEL</th>
            <th>PHONE</th>
            <th>EMAIL</th>
            <th>ADDRESS</th>
            <th>CREATED</th>
            <th>ACTIONS</th>
          </tr>
        </thead>
        <tbody id="collectors-tbody">
          ${skeletonRows(6, 5)}
        </tbody>
      </table>
    </div>

    <!-- Add/Edit Collector Modal -->
    <div class="modal-overlay" id="collector-modal">
      <div class="modal modal-lg">
        <div class="modal-header">
          <h3 id="collector-modal-title">Add Collector</h3>
          <button class="modal-close" id="close-collector-modal">✕</button>
        </div>
        <div class="modal-body-scroll">
          <form id="collector-form">
            <input type="hidden" id="collector-doc-id">
            <input type="hidden" id="col-role" value="collector">

            <div class="form-section-title">
              <span class="material-icons-outlined">person</span> Personal Information
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">First Name *</label>
                <input type="text" class="form-input" id="col-firstName" required placeholder="First name">
              </div>
              <div class="form-group">
                <label class="form-label">Middle Name</label>
                <input type="text" class="form-input" id="col-middleName" placeholder="Middle name">
              </div>
              <div class="form-group">
                <label class="form-label">Last Name *</label>
                <input type="text" class="form-input" id="col-lastName" required placeholder="Last name">
              </div>
            </div>

            <div class="form-section-title">
              <span class="material-icons-outlined">contact_phone</span> Contact Details
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Phone *</label>
                <input type="tel" class="form-input" id="col-phone" required placeholder="09XX XXX XXXX">
              </div>
              <div class="form-group">
                <label class="form-label">Email *</label>
                <input type="email" class="form-input" id="col-email" required placeholder="collector@email.com">
              </div>
            </div>

            <div class="form-section-title" id="col-login-section">
              <span class="material-icons-outlined">lock</span> Login Credentials
              <span style="font-size:0.72rem; color:var(--text-muted); margin-left:8px;">(for mobile app login)</span>
            </div>
            <div class="form-row" id="col-password-row">
              <div class="form-group">
                <label class="form-label">Password *</label>
                <input type="password" class="form-input" id="col-password" required minlength="8" placeholder="Min 8 characters">
              </div>
              <div class="form-group">
                <label class="form-label">Confirm Password *</label>
                <input type="password" class="form-input" id="col-confirmPassword" required minlength="8" placeholder="Repeat password">
              </div>
            </div>

            <div class="form-section-title">
              <span class="material-icons-outlined">location_on</span> Address
            </div>
            <div class="form-group">
              <label class="form-label">Street Address</label>
              <input type="text" class="form-input" id="col-address" placeholder="123 Main Street">
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Barangay</label>
                <input type="text" class="form-input" id="col-barangay" placeholder="Barangay">
              </div>
              <div class="form-group">
                <label class="form-label">City</label>
                <input type="text" class="form-input" id="col-city" placeholder="City">
              </div>
              <div class="form-group">
                <label class="form-label">Province</label>
                <input type="text" class="form-input" id="col-province" placeholder="Province">
              </div>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" id="cancel-collector-btn">Cancel</button>
          <button class="btn btn-primary" id="save-collector-btn">
            <span class="material-icons-outlined" style="font-size:16px;">save</span> Save Collector
          </button>
        </div>
      </div>
    </div>
  `;
}

export function initCollectorsPage(services, navigateFn) {
  let allCollectors = [];

  loadCollectors();

  // Add collector
  document.getElementById('add-collector-btn').addEventListener('click', () => {
    document.getElementById('collector-modal-title').textContent = 'Add Collector';
    document.getElementById('save-collector-btn').innerHTML = '<span class="material-icons-outlined" style="font-size:16px;">save</span> Save Collector';
    document.getElementById('collector-form').reset();
    document.getElementById('collector-doc-id').value = '';
    document.getElementById('col-role').value = 'collector';
    
    // Show password fields for new collector
    document.getElementById('col-login-section').style.display = '';
    document.getElementById('col-password-row').style.display = '';
    document.getElementById('col-password').required = true;
    document.getElementById('col-confirmPassword').required = true;
    document.getElementById('col-email').required = true;
    openModal('collector-modal');
  });

  document.getElementById('close-collector-modal').addEventListener('click', () => closeModal('collector-modal'));
  document.getElementById('cancel-collector-btn').addEventListener('click', () => closeModal('collector-modal'));

  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.classList.remove('active');
    });
  });

  // Search
  let searchTimeout;
  document.getElementById('collector-search').addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      const query = e.target.value.toLowerCase();
      filterCollectors(query);
    }, 300);
  });

  // Save collector
  document.getElementById('save-collector-btn').addEventListener('click', async () => {
    const form = document.getElementById('collector-form');
    if (!form.checkValidity()) { form.reportValidity(); return; }

    const docId = document.getElementById('collector-doc-id').value;
    const isEditing = !!docId;

    // Validate passwords for new collector
    if (!isEditing) {
      const password = document.getElementById('col-password').value;
      const confirmPassword = document.getElementById('col-confirmPassword').value;
      if (password !== confirmPassword) {
        showToast('Passwords do not match!', 'error');
        return;
      }
      if (password.length < 8) {
        showToast('Password must be at least 8 characters!', 'error');
        return;
      }
    }

    const role = document.getElementById('col-role').value;
    const data = {
      firstName: document.getElementById('col-firstName').value.trim(),
      lastName: document.getElementById('col-lastName').value.trim(),
      phone: document.getElementById('col-phone').value.trim(),
      email: document.getElementById('col-email').value.trim(),
      address: document.getElementById('col-address').value.trim(),
      barangay: document.getElementById('col-barangay').value.trim(),
      city: document.getElementById('col-city').value.trim(),
      province: document.getElementById('col-province').value.trim(),
      role: role
    };

    const saveBtn = document.getElementById('save-collector-btn');
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span class="material-icons-outlined" style="font-size:16px;">hourglass_empty</span> Saving...';

    try {
      if (isEditing) {
        await services.collector.update(docId, data);
        showToast('Collector updated!', 'success');
      } else {
        // Step 1: Create Appwrite user account for mobile app login
        const password = document.getElementById('col-password').value;
        const fullName = `${data.firstName} ${data.lastName}`.trim();
        
        // Use Server API to create user account
        const userRes = await fetch(`${ENDPOINT}/users`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Appwrite-Project': PROJECT_ID,
            'X-Appwrite-Key': API_KEY,
          },
          body: JSON.stringify({
            userId: 'col_' + Date.now(),
            email: data.email,
            password: password,
            name: fullName,
          }),
        });

        if (!userRes.ok) {
          const err = await userRes.json();
          throw new Error(err.message || 'Failed to create user account');
        }

        const newUser = await userRes.json();
        data.userId = newUser.$id;

        // Step 2: Create collector profile in database
        const profileDoc = await services.collector.create(data);

        // Step 3: Grant explicit read/update permissions to the new collector using Server API
        await fetch(`${ENDPOINT}/databases/${DATABASE_ID}/collections/users_profile/documents/${profileDoc.$id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'X-Appwrite-Project': PROJECT_ID,
            'X-Appwrite-Key': API_KEY,
          },
          body: JSON.stringify({
            permissions: [
              `read("any")`,
              `update("user:${data.userId}")`,
              `read("user:admin001")`,
              `update("user:admin001")`,
              `delete("user:admin001")`
            ]
          })
        });

        showToast(`${role === 'technician' ? 'Technician' : 'Collector'} added! Login: ${data.email}`, 'success');
      }
      closeModal('collector-modal');
      loadCollectors();
    } catch (error) {
      if (typeof error.message === 'string' && (error.message.includes('Failed to fetch') || error.message.includes('fetch'))) {
        const docId = document.getElementById('collector-doc-id').value;
        if (docId) {
          const idx = allCollectors.findIndex(c => (c.$id || c.id) === docId);
          if (idx !== -1) Object.assign(allCollectors[idx], data);
          showToast('Collector updated (demo)', 'success');
        } else {
          data.$id = data.userId || ('demo_' + Date.now());
          allCollectors.unshift(data);
          showToast('Collector added (demo)', 'success');
        }
        closeModal('collector-modal');
        renderCollectorTable(allCollectors);
      } else {
        showToast(error.message || 'Failed to save collector', 'error');
      }
    } finally {
      saveBtn.disabled = false;
      saveBtn.innerHTML = '<span class="material-icons-outlined" style="font-size:16px;">save</span> Save Collector';
    }
  });

  async function loadCollectors() {
    try {
      const response = await services.collector.getAll();
      allCollectors = response.documents.filter(c => c.role === 'collector');
      renderCollectorTable(allCollectors);
    } catch (error) {
      allCollectors = getDemoCollectors();
      renderCollectorTable(allCollectors);
    }
  }

  function filterCollectors(query) {
    if (!query) { renderCollectorTable(allCollectors); return; }
    const filtered = allCollectors.filter(c =>
      `${c.firstName} ${c.lastName} ${c.phone} ${c.email}`.toLowerCase().includes(query)
    );
    renderCollectorTable(filtered);
  }

  function renderCollectorTable(collectors) {
    const tbody = document.getElementById('collectors-tbody');
    if (!collectors || collectors.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6">
        <div class="empty-state">
          <div class="empty-icon"><span class="material-icons-outlined" style="font-size:3rem;">directions_run</span></div>
          <div class="empty-title">No collectors yet</div>
          <div class="empty-text">Add a collector to assign them customers for payment collection.</div>
        </div>
      </td></tr>`;
      return;
    }

    tbody.innerHTML = collectors.map(c => {
      const h = hashCode(c.firstName || '');
      const fullName = `${c.firstName || ''} ${c.lastName || ''}`.trim();
      const location = [c.barangay, c.city].filter(Boolean).join(', ');
      const address = c.address || location || '—';

      return `
        <tr>
          <td>
            <div style="display:flex; align-items:center; gap:12px;">
              ${c.profileImage 
                ? `<div class="avatar" style="background-image:url('${c.profileImage}'); background-size:cover; background-position:center; border: 1px solid rgba(255,255,255,0.1);"></div>`
                : `<div class="avatar" style="background:linear-gradient(135deg, hsl(${h},70%,55%), hsl(${h + 60},60%,45%));">${getInitials(c.firstName, c.lastName)}</div>`
              }
              <div>
                <div style="font-weight:600; color:var(--text-primary);">${fullName}</div>
                <div style="font-size:0.75rem; color:var(--text-muted); display:flex; align-items:center; gap:6px; margin-top:4px;">
                  <span style="display:inline-block; padding:2px 6px; border-radius:4px; border:1px solid var(--accent-blue); color:var(--accent-blue); background:rgba(255,255,255,0.05); font-weight: 500; font-size: 0.65rem; text-transform: uppercase;">
                     Collector
                  </span>
                  ${location ? `<span>${location}</span>` : ''}
                </div>
              </div>
            </div>
          </td>
          <td>${c.phone || '—'}</td>
          <td>${c.email || '—'}</td>
          <td style="max-width:200px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${address}</td>
          <td>${formatDate(c.createdAt || c.$createdAt)}</td>
          <td>
            <div class="table-actions">
              <button class="btn btn-ghost btn-sm btn-icon" title="View" data-view-col="${c.$id || c.id}">
                <span class="material-icons-outlined" style="font-size:18px;">visibility</span>
              </button>
              <button class="btn btn-ghost btn-sm btn-icon" title="Edit" data-edit-col="${c.$id || c.id}">
                <span class="material-icons-outlined" style="font-size:18px;">edit</span>
              </button>
              <button class="btn btn-ghost btn-sm btn-icon" title="Delete" data-delete-col="${c.$id || c.id}" style="color:var(--accent-rose);">
                <span class="material-icons-outlined" style="font-size:18px;">delete</span>
              </button>
            </div>
          </td>
        </tr>`;
    }).join('');

    // View detail — navigate to full page
    tbody.querySelectorAll('[data-view-col]').forEach(btn => {
      btn.addEventListener('click', () => {
        navigateFn('collector_detail:' + btn.dataset.viewCol);
      });
    });

    // Edit
    tbody.querySelectorAll('[data-edit-col]').forEach(btn => {
      btn.addEventListener('click', () => {
        const c = allCollectors.find(x => (x.$id || x.id) === btn.dataset.editCol);
        if (!c) return;
        document.getElementById('collector-modal-title').textContent = 'Edit Collector';
        document.getElementById('collector-doc-id').value = c.$id || c.id;
        document.getElementById('col-role').value = c.role || 'collector';
        document.getElementById('col-firstName').value = c.firstName || '';
        document.getElementById('col-lastName').value = c.lastName || '';
        document.getElementById('col-phone').value = c.phone || '';
        document.getElementById('col-email').value = c.email || '';
        document.getElementById('col-address').value = c.address || '';
        document.getElementById('col-barangay').value = c.barangay || '';
        document.getElementById('col-city').value = c.city || '';
        document.getElementById('col-province').value = c.province || '';
        // Hide password fields when editing
        document.getElementById('col-login-section').style.display = 'none';
        document.getElementById('col-password-row').style.display = 'none';
        document.getElementById('col-password').required = false;
        document.getElementById('col-confirmPassword').required = false;
        document.getElementById('col-email').required = false;
        openModal('collector-modal');
      });
    });

    // Delete
    tbody.querySelectorAll('[data-delete-col]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const confirmed = await showConfirm(
          'Are you sure you want to delete this collector? This action cannot be undone.',
          { title: 'Delete Collector?', confirmText: 'Yes, Delete', type: 'danger' }
        );
        if (!confirmed) return;
        try {
          await services.collector.delete(btn.dataset.deleteCol);
          showToast('Collector removed', 'success');
          loadCollectors();
        } catch (error) {
          allCollectors = allCollectors.filter(x => (x.$id || x.id) !== btn.dataset.deleteCol);
          renderCollectorTable(allCollectors);
          showToast('Collector removed (demo)', 'success');
        }
      });
    });
  }
}

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return Math.abs(hash % 360);
}

function getDemoCollectors() {
  return [
    { id: 'c1', $id: 'c1', firstName: 'Ricardo', lastName: 'Mendoza', phone: '09171112233', email: 'rico@email.com', address: '100 Ayala Ave', barangay: 'Brgy. San Lorenzo', city: 'Makati', province: 'Metro Manila', createdAt: '2026-01-05', assignedCount: 8 },
    { id: 'c2', $id: 'c2', firstName: 'Fernando', lastName: 'Aquino', phone: '09182223344', email: 'fernando@email.com', address: '200 Ortigas Blvd', barangay: 'Brgy. Ugong', city: 'Pasig', province: 'Metro Manila', createdAt: '2026-01-20', assignedCount: 6 },
    { id: 'c3', $id: 'c3', firstName: 'Lorna', lastName: 'Bautista', phone: '09193334455', email: '', address: '300 Shaw Blvd', barangay: 'Brgy. Wack-Wack', city: 'Mandaluyong', province: 'Metro Manila', createdAt: '2026-02-15', assignedCount: 10 },
    { id: 'c4', $id: 'c4', firstName: 'Dennis', lastName: 'Torres', phone: '09204445566', email: 'dennis.t@email.com', address: '400 Taft Ave', barangay: 'Brgy. Paco', city: 'Manila', province: 'Metro Manila', createdAt: '2026-03-01', assignedCount: 5 },
  ];
}
