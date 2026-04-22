import { getInitials, showToast, openModal, closeModal, skeletonRows, formatDate, showConfirm } from '../components/ui-helpers.js';
import { ENDPOINT, PROJECT_ID, API_KEY, DATABASE_ID } from '../config/appwrite.js';

/**
 * Technicians Page — Table layout
 */
export function renderTechniciansPage() {
  return `
    <div class="toolbar">
      <div class="toolbar-left">
        <div class="search-bar" style="max-width:320px; flex:1;">
          <span class="search-icon"><span class="material-icons-outlined" style="font-size:18px;">search</span></span>
          <input type="text" placeholder="Search technicians..." id="technician-search">
        </div>
      </div>
      <div class="toolbar-right">
        <button class="btn btn-primary" id="add-technician-btn" style="background:var(--accent-emerald); border-color:var(--accent-emerald);">+ Add Technician</button>
      </div>
    </div>

    <!-- Technicians Table -->
    <div class="table-container">
      <table class="data-table" id="technicians-table">
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
        <tbody id="technicians-tbody">
          ${skeletonRows(6, 5)}
        </tbody>
      </table>
    </div>

    <!-- Add/Edit Technician Modal -->
    <div class="modal-overlay" id="technician-modal">
      <div class="modal modal-lg">
        <div class="modal-header">
          <h3 id="technician-modal-title">Add Technician</h3>
          <button class="modal-close" id="close-technician-modal">✕</button>
        </div>
        <div class="modal-body-scroll">
          <form id="technician-form">
            <input type="hidden" id="technician-doc-id">
            <input type="hidden" id="tech-role" value="technician">

            <div class="form-section-title">
              <span class="material-icons-outlined">person</span> Personal Information
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">First Name *</label>
                <input type="text" class="form-input" id="tech-firstName" required placeholder="First name">
              </div>
              <div class="form-group">
                <label class="form-label">Middle Name</label>
                <input type="text" class="form-input" id="tech-middleName" placeholder="Middle name">
              </div>
              <div class="form-group">
                <label class="form-label">Last Name *</label>
                <input type="text" class="form-input" id="tech-lastName" required placeholder="Last name">
              </div>
            </div>

            <div class="form-section-title">
              <span class="material-icons-outlined">contact_phone</span> Contact Details
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Phone *</label>
                <input type="tel" class="form-input" id="tech-phone" required placeholder="09XX XXX XXXX">
              </div>
              <div class="form-group">
                <label class="form-label">Email *</label>
                <input type="email" class="form-input" id="tech-email" required placeholder="technician@email.com">
              </div>
            </div>

            <div class="form-section-title" id="tech-login-section">
              <span class="material-icons-outlined">lock</span> Login Credentials
              <span style="font-size:0.72rem; color:var(--text-muted); margin-left:8px;">(for mobile app login)</span>
            </div>
            <div class="form-row" id="tech-password-row">
              <div class="form-group">
                <label class="form-label">Password *</label>
                <input type="password" class="form-input" id="tech-password" required minlength="8" placeholder="Min 8 characters">
              </div>
              <div class="form-group">
                <label class="form-label">Confirm Password *</label>
                <input type="password" class="form-input" id="tech-confirmPassword" required minlength="8" placeholder="Repeat password">
              </div>
            </div>

            <div class="form-section-title">
              <span class="material-icons-outlined">location_on</span> Address
            </div>
            <div class="form-group">
              <label class="form-label">Street Address</label>
              <input type="text" class="form-input" id="tech-address" placeholder="123 Main Street">
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Barangay</label>
                <input type="text" class="form-input" id="tech-barangay" placeholder="Barangay">
              </div>
              <div class="form-group">
                <label class="form-label">City</label>
                <input type="text" class="form-input" id="tech-city" placeholder="City">
              </div>
              <div class="form-group">
                <label class="form-label">Province</label>
                <input type="text" class="form-input" id="tech-province" placeholder="Province">
              </div>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" id="cancel-technician-btn">Cancel</button>
          <button class="btn btn-primary" id="save-technician-btn" style="background:var(--accent-emerald); border-color:var(--accent-emerald);">
            <span class="material-icons-outlined" style="font-size:16px;">save</span> Save Technician
          </button>
        </div>
      </div>
    </div>
  `;
}

export function initTechniciansPage(services, navigateFn) {
  let allTechnicians = [];

  loadTechnicians();

  // Add technician
  document.getElementById('add-technician-btn').addEventListener('click', () => {
    document.getElementById('technician-modal-title').textContent = 'Add Technician';
    document.getElementById('save-technician-btn').innerHTML = '<span class="material-icons-outlined" style="font-size:16px;">save</span> Save Technician';
    document.getElementById('technician-form').reset();
    document.getElementById('technician-doc-id').value = '';
    
    // Show password fields for new user
    document.getElementById('tech-login-section').style.display = '';
    document.getElementById('tech-password-row').style.display = '';
    document.getElementById('tech-password').required = true;
    document.getElementById('tech-confirmPassword').required = true;
    document.getElementById('tech-email').required = true;
    openModal('technician-modal');
  });

  document.getElementById('close-technician-modal').addEventListener('click', () => closeModal('technician-modal'));
  document.getElementById('cancel-technician-btn').addEventListener('click', () => closeModal('technician-modal'));

  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.classList.remove('active');
    });
  });

  // Search
  let searchTimeout;
  document.getElementById('technician-search').addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      const query = e.target.value.toLowerCase();
      filterTechnicians(query);
    }, 300);
  });

  // Save technician
  document.getElementById('save-technician-btn').addEventListener('click', async () => {
    const form = document.getElementById('technician-form');
    if (!form.checkValidity()) { form.reportValidity(); return; }

    const docId = document.getElementById('technician-doc-id').value;
    const isEditing = !!docId;

    // Validate passwords for new technician
    if (!isEditing) {
      const password = document.getElementById('tech-password').value;
      const confirmPassword = document.getElementById('tech-confirmPassword').value;
      if (password !== confirmPassword) {
        showToast('Passwords do not match!', 'error');
        return;
      }
      if (password.length < 8) {
        showToast('Password must be at least 8 characters!', 'error');
        return;
      }
    }

    const data = {
      firstName: document.getElementById('tech-firstName').value.trim(),
      lastName: document.getElementById('tech-lastName').value.trim(),
      phone: document.getElementById('tech-phone').value.trim(),
      email: document.getElementById('tech-email').value.trim(),
      address: document.getElementById('tech-address').value.trim(),
      barangay: document.getElementById('tech-barangay').value.trim(),
      city: document.getElementById('tech-city').value.trim(),
      province: document.getElementById('tech-province').value.trim(),
      role: 'technician'
    };

    const saveBtn = document.getElementById('save-technician-btn');
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span class="material-icons-outlined" style="font-size:16px;">hourglass_empty</span> Saving...';

    try {
      if (isEditing) {
        await services.collector.update(docId, data);
        showToast('Technician updated!', 'success');
      } else {
        // Step 1: Create Appwrite user account for mobile app login
        const password = document.getElementById('tech-password').value;
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
            userId: 'tech_' + Date.now(),
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

        // Step 2: Create profile in database
        const profileDoc = await services.collector.create(data);

        // Step 3: Grant explicit read/update permissions to the new technician using Server API
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

        showToast(`Technician added! Login: ${data.email}`, 'success');
      }
      closeModal('technician-modal');
      loadTechnicians();
    } catch (error) {
      if (typeof error.message === 'string' && (error.message.includes('Failed to fetch') || error.message.includes('fetch'))) {
        const docId = document.getElementById('technician-doc-id').value;
        if (docId) {
          const idx = allTechnicians.findIndex(c => (c.$id || c.id) === docId);
          if (idx !== -1) Object.assign(allTechnicians[idx], data);
          showToast('Technician updated (demo)', 'success');
        } else {
          data.$id = data.userId || ('demo_' + Date.now());
          allTechnicians.unshift(data);
          showToast('Technician added (demo)', 'success');
        }
        closeModal('technician-modal');
        renderTechnicianTable(allTechnicians);
      } else {
        showToast(error.message || 'Failed to save technician', 'error');
      }
    } finally {
      saveBtn.disabled = false;
      saveBtn.innerHTML = '<span class="material-icons-outlined" style="font-size:16px;">save</span> Save Technician';
    }
  });

  async function loadTechnicians() {
    try {
      const response = await services.collector.getAll();
      // Filter out only technicians
      allTechnicians = response.documents.filter(c => c.role === 'technician');
      renderTechnicianTable(allTechnicians);
    } catch (error) {
      allTechnicians = getDemoTechnicians();
      renderTechnicianTable(allTechnicians);
    }
  }

  function filterTechnicians(query) {
    if (!query) { renderTechnicianTable(allTechnicians); return; }
    const filtered = allTechnicians.filter(c =>
      `${c.firstName} ${c.lastName} ${c.phone} ${c.email}`.toLowerCase().includes(query)
    );
    renderTechnicianTable(filtered);
  }

  function renderTechnicianTable(technicians) {
    const tbody = document.getElementById('technicians-tbody');
    if (!technicians || technicians.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6">
        <div class="empty-state">
          <div class="empty-icon"><span class="material-icons-outlined" style="font-size:3rem;">engineering</span></div>
          <div class="empty-title">No technicians yet</div>
          <div class="empty-text">Add a technician to handle repair requests.</div>
        </div>
      </td></tr>`;
      return;
    }

    tbody.innerHTML = technicians.map(c => {
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
                  <span style="display:inline-block; padding:2px 6px; border-radius:4px; border:1px solid var(--accent-emerald); color:var(--accent-emerald); background:rgba(255,255,255,0.05); font-weight: 500; font-size: 0.65rem; text-transform: uppercase;">
                     Technician
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
              <button class="btn btn-ghost btn-sm btn-icon" title="View" data-view-tech="${c.$id || c.id}">
                <span class="material-icons-outlined" style="font-size:18px;">visibility</span>
              </button>
              <button class="btn btn-ghost btn-sm btn-icon" title="Edit" data-edit-tech="${c.$id || c.id}">
                <span class="material-icons-outlined" style="font-size:18px;">edit</span>
              </button>
              <button class="btn btn-ghost btn-sm btn-icon" title="Delete" data-delete-tech="${c.$id || c.id}" style="color:var(--accent-rose);">
                <span class="material-icons-outlined" style="font-size:18px;">delete</span>
              </button>
            </div>
          </td>
        </tr>`;
    }).join('');

    // View detail
    tbody.querySelectorAll('[data-view-tech]').forEach(btn => {
      btn.addEventListener('click', () => {
        // Re-use collector detail page since payload structure is identical
        navigateFn('collector_detail:' + btn.dataset.viewTech);
      });
    });

    // Edit
    tbody.querySelectorAll('[data-edit-tech]').forEach(btn => {
      btn.addEventListener('click', () => {
        const c = allTechnicians.find(x => (x.$id || x.id) === btn.dataset.editTech);
        if (!c) return;
        document.getElementById('technician-modal-title').textContent = 'Edit Technician';
        document.getElementById('technician-doc-id').value = c.$id || c.id;
        document.getElementById('tech-firstName').value = c.firstName || '';
        document.getElementById('tech-lastName').value = c.lastName || '';
        document.getElementById('tech-phone').value = c.phone || '';
        document.getElementById('tech-email').value = c.email || '';
        document.getElementById('tech-address').value = c.address || '';
        document.getElementById('tech-barangay').value = c.barangay || '';
        document.getElementById('tech-city').value = c.city || '';
        document.getElementById('tech-province').value = c.province || '';
        
        // Hide password fields when editing
        document.getElementById('tech-login-section').style.display = 'none';
        document.getElementById('tech-password-row').style.display = 'none';
        document.getElementById('tech-password').required = false;
        document.getElementById('tech-confirmPassword').required = false;
        document.getElementById('tech-email').required = false;
        openModal('technician-modal');
      });
    });

    // Delete
    tbody.querySelectorAll('[data-delete-tech]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const confirmed = await showConfirm(
          'Are you sure you want to delete this technician? This action cannot be undone.',
          { title: 'Delete Technician?', confirmText: 'Yes, Delete', type: 'danger' }
        );
        if (!confirmed) return;
        try {
          await services.collector.delete(btn.dataset.deleteTech);
          showToast('Technician removed', 'success');
          loadTechnicians();
        } catch (error) {
          allTechnicians = allTechnicians.filter(x => (x.$id || x.id) !== btn.dataset.deleteTech);
          renderTechnicianTable(allTechnicians);
          showToast('Technician removed (demo)', 'success');
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

function getDemoTechnicians() {
  return [
    { id: 't1', $id: 't1', firstName: 'Juan', lastName: 'Tech', phone: '09121112233', email: 'tech1@email.com', address: '100 Repair Ave', barangay: 'Brgy. Fix', city: 'Makati', province: 'Metro Manila', createdAt: '2026-02-05', role: 'technician' },
  ];
}
