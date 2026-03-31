import { getInitials, showToast, openModal, closeModal, skeletonRows, formatDate } from '../components/ui-helpers.js';

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
            <th>COLLECTOR</th>
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
                <label class="form-label">Email</label>
                <input type="email" class="form-input" id="col-email" placeholder="collector@email.com">
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
    document.getElementById('collector-form').reset();
    document.getElementById('collector-doc-id').value = '';
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

    const data = {
      firstName: document.getElementById('col-firstName').value.trim(),
      lastName: document.getElementById('col-lastName').value.trim(),
      phone: document.getElementById('col-phone').value.trim(),
      email: document.getElementById('col-email').value.trim(),
      address: document.getElementById('col-address').value.trim(),
      barangay: document.getElementById('col-barangay').value.trim(),
      city: document.getElementById('col-city').value.trim(),
      province: document.getElementById('col-province').value.trim(),
      middleName: document.getElementById('col-middleName').value.trim(),
    };

    try {
      const docId = document.getElementById('collector-doc-id').value;
      if (docId) {
        await services.collector.update(docId, data);
        showToast('Collector updated!', 'success');
      } else {
        data.userId = 'col_' + Date.now();
        await services.collector.create(data);
        showToast('Collector added!', 'success');
      }
      closeModal('collector-modal');
      loadCollectors();
    } catch (error) {
      allCollectors.push({ ...data, id: 'col_' + Date.now(), $id: 'col_' + Date.now(), assignedCount: 0, createdAt: new Date().toISOString() });
      renderCollectorTable(allCollectors);
      closeModal('collector-modal');
      showToast('Collector added (demo)', 'success');
    }
  });

  async function loadCollectors() {
    try {
      const response = await services.collector.getAll();
      allCollectors = response.documents;
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
              <div class="avatar" style="background:linear-gradient(135deg, hsl(${h},70%,55%), hsl(${h + 60},60%,45%));">
                ${getInitials(c.firstName, c.lastName)}
              </div>
              <div>
                <div style="font-weight:600; color:var(--text-primary);">${fullName}</div>
                <div style="font-size:0.75rem; color:var(--text-muted);">${location || '—'}</div>
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
        document.getElementById('col-firstName').value = c.firstName || '';
        document.getElementById('col-lastName').value = c.lastName || '';
        document.getElementById('col-phone').value = c.phone || '';
        document.getElementById('col-email').value = c.email || '';
        document.getElementById('col-address').value = c.address || '';
        document.getElementById('col-barangay').value = c.barangay || '';
        document.getElementById('col-city').value = c.city || '';
        document.getElementById('col-province').value = c.province || '';
        openModal('collector-modal');
      });
    });

    // Delete
    tbody.querySelectorAll('[data-delete-col]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Delete this collector?')) return;
        try {
          await services.collector.delete(btn.dataset.deleteCol);
          showToast('Collector removed', 'success');
          loadCollectors();
        } catch (error) {
          allCollectors = allCollectors.filter(c => (c.$id || c.id) !== btn.dataset.deleteCol);
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
