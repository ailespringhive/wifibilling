import { formatCurrency, showToast, openModal, closeModal } from '../components/ui-helpers.js';

/**
 * WiFi Plans Page — Pricing card layout inspired by reference
 */
export function renderPlansPage() {
  return `
    <div class="toolbar">
      <div class="toolbar-left">
        <p class="text-secondary text-sm">Manage your WiFi service plans and pricing.</p>
      </div>
      <div class="toolbar-right">
        <button class="btn btn-primary" id="add-plan-btn"><span class="material-icons-outlined" style="font-size:16px;">add</span> Add Plan</button>
      </div>
    </div>

    <!-- Plans Grid -->
    <div class="pricing-grid" id="plans-grid">
    </div>

    <!-- Add/Edit Plan Modal -->
    <div class="modal-overlay" id="plan-modal">
      <div class="modal">
        <div class="modal-header">
          <h3 id="plan-modal-title">Add WiFi Plan</h3>
          <button class="modal-close" id="close-plan-modal">✕</button>
        </div>
        <div class="modal-body">
          <form id="plan-form">
            <input type="hidden" id="plan-doc-id">
            <div class="form-group">
              <label class="form-label">Plan Name *</label>
              <input type="text" class="form-input" id="plan-name" required placeholder="e.g. Basic 25Mbps">
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Speed *</label>
                <input type="text" class="form-input" id="plan-speed" required placeholder="e.g. 25 Mbps">
              </div>
              <div class="form-group">
                <label class="form-label">Monthly Rate (₱) *</label>
                <input type="number" class="form-input" id="plan-rate" required min="0" step="0.01" placeholder="999.00">
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Description</label>
              <textarea class="form-textarea" id="plan-description" placeholder="Plan features and details..."></textarea>
            </div>
            <div class="form-group">
              <label class="form-label">
                <input type="checkbox" id="plan-active" checked style="margin-right:8px;">
                Active (visible to customers)
              </label>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" id="cancel-plan-btn">Cancel</button>
          <button class="btn btn-primary" id="save-plan-btn">Save Plan</button>
        </div>
      </div>
    </div>
  `;
}

// Feature sets per plan tier
function getPlanFeatures(speedNum) {
  if (speedNum <= 25) {
    return [
      { text: 'Up to 25 Mbps speed', included: true },
      { text: 'Browsing & social media', included: true },
      { text: 'Email & messaging', included: true },
      { text: 'HD video streaming', included: false },
      { text: 'Online gaming', included: false },
      { text: 'Priority support', included: false },
    ];
  } else if (speedNum <= 50) {
    return [
      { text: 'Up to 50 Mbps speed', included: true },
      { text: 'Browsing & social media', included: true },
      { text: 'Email & messaging', included: true },
      { text: 'HD video streaming', included: true },
      { text: 'Online gaming', included: true },
      { text: 'Priority support', included: false },
    ];
  } else if (speedNum <= 100) {
    return [
      { text: 'Up to 100 Mbps speed', included: true },
      { text: 'Browsing & social media', included: true },
      { text: 'Email & messaging', included: true },
      { text: 'HD video streaming', included: true },
      { text: 'Online gaming', included: true },
      { text: 'Priority support', included: true },
    ];
  } else {
    return [
      { text: 'Up to ' + speedNum + ' Mbps speed', included: true },
      { text: 'Unlimited devices', included: true },
      { text: 'HD & 4K streaming', included: true },
      { text: 'Online gaming', included: true },
      { text: 'Priority support', included: true },
      { text: 'Dedicated bandwidth', included: true },
    ];
  }
}

export function initPlansPage(services) {
  let allPlans = [];

  loadPlans();

  document.getElementById('add-plan-btn').addEventListener('click', () => {
    document.getElementById('plan-modal-title').textContent = 'Add WiFi Plan';
    document.getElementById('plan-form').reset();
    document.getElementById('plan-doc-id').value = '';
    document.getElementById('plan-active').checked = true;
    openModal('plan-modal');
  });

  document.getElementById('close-plan-modal').addEventListener('click', () => closeModal('plan-modal'));
  document.getElementById('cancel-plan-btn').addEventListener('click', () => closeModal('plan-modal'));

  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.classList.remove('active');
    });
  });

  document.getElementById('save-plan-btn').addEventListener('click', async () => {
    const form = document.getElementById('plan-form');
    if (!form.checkValidity()) { form.reportValidity(); return; }

    const data = {
      planName: document.getElementById('plan-name').value.trim(),
      speed: document.getElementById('plan-speed').value.trim(),
      monthlyRate: parseFloat(document.getElementById('plan-rate').value),
      description: document.getElementById('plan-description').value.trim(),
      isActive: document.getElementById('plan-active').checked,
    };

    try {
      const docId = document.getElementById('plan-doc-id').value;
      if (docId) {
        await services.plan.update(docId, data);
        showToast('Plan updated!', 'success');
      } else {
        await services.plan.create(data);
        showToast('Plan created!', 'success');
      }
      closeModal('plan-modal');
      loadPlans();
    } catch (error) {
      allPlans.push({ ...data, $id: 'plan_' + Date.now(), id: 'plan_' + Date.now() });
      renderPlansGrid(allPlans);
      closeModal('plan-modal');
      showToast('Plan added (demo)', 'success');
    }
  });

  async function loadPlans() {
    try {
      const response = await services.plan.getAll();
      allPlans = response.documents;
      renderPlansGrid(allPlans);
    } catch (error) {
      allPlans = getDemoPlans();
      renderPlansGrid(allPlans);
    }
  }

  function renderPlansGrid(plans) {
    const grid = document.getElementById('plans-grid');
    if (!plans || plans.length === 0) {
      grid.innerHTML = `<div class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-icon"><span class="material-icons-outlined" style="font-size:3rem;">cell_tower</span></div>
        <div class="empty-title">No plans yet</div>
        <div class="empty-text">Create WiFi service plans to assign to customers.</div>
      </div>`;
      return;
    }

    // Find the "recommended" plan (highest active plan that's not the most expensive)
    const activePlans = plans.filter(p => p.isActive !== false);
    const sortedByRate = [...activePlans].sort((a, b) => a.monthlyRate - b.monthlyRate);
    const recommendedId = sortedByRate.length >= 2 ? (sortedByRate[Math.floor(sortedByRate.length / 2)].$id || sortedByRate[Math.floor(sortedByRate.length / 2)].id) : null;

    grid.innerHTML = plans.map(p => {
      const isActive = p.isActive !== false;
      const speedNum = parseInt(p.speed) || 50;
      const isRecommended = (p.$id || p.id) === recommendedId;
      const features = getPlanFeatures(speedNum);

      const featuresHTML = features.map(f => `
        <li class="pricing-feature ${f.included ? '' : 'pricing-feature-disabled'}">
          <span class="material-icons-outlined" style="font-size:16px; color:${f.included ? 'var(--accent-blue)' : 'var(--text-muted)'};">
            ${f.included ? 'check' : 'close'}
          </span>
          <span ${!f.included ? 'style="text-decoration:line-through; opacity:0.5;"' : ''}>${f.text}</span>
        </li>
      `).join('');

      return `
        <div class="pricing-card ${isRecommended ? 'pricing-recommended' : ''} ${!isActive ? 'pricing-inactive' : ''}">
          ${isRecommended ? '<div class="pricing-badge">Recommended</div>' : ''}
          <div class="pricing-header">
            <h3 class="pricing-plan-name">${p.planName}</h3>
            <div class="pricing-price">
              <span class="pricing-amount">₱${Number(p.monthlyRate).toLocaleString('en-PH')}</span>
              <span class="pricing-period">/month</span>
            </div>
            <p class="pricing-desc">${p.description || p.speed + ' connection speed'}</p>
          </div>
          <ul class="pricing-features">
            ${featuresHTML}
          </ul>
          <div class="pricing-footer">
            <button class="pricing-btn ${isRecommended ? 'pricing-btn-primary' : ''}" data-toggle-plan="${p.$id || p.id}">
              ${isActive ? (isRecommended ? 'Popular Plan' : 'Active Plan') : 'Enable Plan'}
            </button>
            <div class="pricing-actions">
              <button class="btn btn-ghost btn-sm btn-icon" title="Edit" data-edit-plan="${p.$id || p.id}">
                <span class="material-icons-outlined" style="font-size:16px;">edit</span>
              </button>
              <button class="btn btn-ghost btn-sm btn-icon" title="Delete" data-delete-plan="${p.$id || p.id}" style="color:var(--accent-rose);">
                <span class="material-icons-outlined" style="font-size:16px;">delete</span>
              </button>
            </div>
          </div>
        </div>`;
    }).join('');

    // Toggle
    grid.querySelectorAll('[data-toggle-plan]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const p = allPlans.find(x => (x.$id || x.id) === btn.dataset.togglePlan);
        if (!p) return;
        const newState = p.isActive === false ? true : false;
        try {
          await services.plan.toggleActive(p.$id || p.id, newState);
          showToast(`Plan ${newState ? 'enabled' : 'disabled'}`, 'success');
          loadPlans();
        } catch {
          p.isActive = newState;
          renderPlansGrid(allPlans);
          showToast(`Plan ${newState ? 'enabled' : 'disabled'} (demo)`, 'success');
        }
      });
    });

    // Edit
    grid.querySelectorAll('[data-edit-plan]').forEach(btn => {
      btn.addEventListener('click', () => {
        const p = allPlans.find(x => (x.$id || x.id) === btn.dataset.editPlan);
        if (!p) return;
        document.getElementById('plan-modal-title').textContent = 'Edit WiFi Plan';
        document.getElementById('plan-doc-id').value = p.$id || p.id;
        document.getElementById('plan-name').value = p.planName || '';
        document.getElementById('plan-speed').value = p.speed || '';
        document.getElementById('plan-rate').value = p.monthlyRate || '';
        document.getElementById('plan-description').value = p.description || '';
        document.getElementById('plan-active').checked = p.isActive !== false;
        openModal('plan-modal');
      });
    });

    // Delete
    grid.querySelectorAll('[data-delete-plan]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Delete this plan?')) return;
        try {
          await services.plan.delete(btn.dataset.deletePlan);
          showToast('Plan deleted', 'success');
          loadPlans();
        } catch {
          allPlans = allPlans.filter(p => (p.$id || p.id) !== btn.dataset.deletePlan);
          renderPlansGrid(allPlans);
          showToast('Plan removed (demo)', 'success');
        }
      });
    });
  }
}

function getDemoPlans() {
  return [
    { id: 'p1', $id: 'p1', planName: 'Basic', speed: '25 Mbps', monthlyRate: 699, description: 'Perfect for browsing and social media.', isActive: true },
    { id: 'p2', $id: 'p2', planName: 'Standard', speed: '50 Mbps', monthlyRate: 999, description: 'Great for streaming and online gaming.', isActive: true },
    { id: 'p3', $id: 'p3', planName: 'Premium', speed: '100 Mbps', monthlyRate: 1499, description: 'Ultra-fast for heavy usage and work from home.', isActive: true },
    { id: 'p4', $id: 'p4', planName: 'Enterprise', speed: '200 Mbps', monthlyRate: 2499, description: 'Business-grade connection with priority support.', isActive: false },
  ];
}
