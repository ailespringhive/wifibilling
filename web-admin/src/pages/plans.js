import { formatCurrency, showToast, openModal, closeModal, showConfirm } from '../components/ui-helpers.js';

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
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                <label class="form-label" style="margin:0;">Included Features</label>
                <button type="button" class="btn btn-ghost btn-sm" id="add-feature-btn" style="color:var(--accent-blue); padding:4px 8px; height:auto;">
                  <span class="material-icons-outlined" style="font-size:16px; margin-right:4px;">add_circle</span> Add Feature
                </button>
              </div>
              <div id="dynamic-features-list" style="display:flex; flex-direction:column; gap:8px;">
                 <!-- JS will inject dynamic rows here -->
              </div>
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
  let currentModalFeatures = []; // Array of { id: uniqueId, text: string, included: boolean }

  function renderDynamicFeatures() {
    const list = document.getElementById('dynamic-features-list');
    list.innerHTML = currentModalFeatures.map(f => `
      <div style="display:flex; align-items:center; gap:8px; background:var(--bg-card-hover); padding:6px 10px; border-radius:8px; border:1px solid var(--border-color);">
        <input type="checkbox" data-feat-id="${f.id}" class="dyn-feat-chk" ${f.included ? 'checked' : ''} title="Check if feature is included" style="accent-color:var(--accent-blue); width:16px; height:16px; cursor:pointer; flex-shrink:0;">
        <input type="text" data-feat-text="${f.id}" class="form-input" value="${f.text}" placeholder="Type feature..." style="flex:1; padding:4px 8px; font-size:0.85rem; border:none; background:transparent;">
        <button type="button" class="btn btn-ghost btn-sm btn-icon dyn-feat-del" data-feat-del="${f.id}" style="color:var(--accent-rose); min-width:24px; padding:4px; flex-shrink:0;">
          <span class="material-icons-outlined" style="font-size:16px;">delete</span>
        </button>
      </div>
    `).join('');

    // Attach listeners
    list.querySelectorAll('.dyn-feat-chk').forEach(el => {
      el.addEventListener('change', (e) => {
        const id = e.target.dataset.featId;
        const feat = currentModalFeatures.find(x => x.id === id);
        if (feat) feat.included = e.target.checked;
      });
    });
    list.querySelectorAll('[data-feat-text]').forEach(el => {
      el.addEventListener('input', (e) => {
        const id = e.target.dataset.featText;
        const feat = currentModalFeatures.find(x => x.id === id);
        if (feat) feat.text = e.target.value;
      });
    });
    list.querySelectorAll('.dyn-feat-del').forEach(el => {
      el.addEventListener('click', (e) => {
        const id = el.dataset.featDel;
        currentModalFeatures = currentModalFeatures.filter(x => x.id !== id);
        renderDynamicFeatures();
      });
    });
  }

  document.getElementById('add-feature-btn').addEventListener('click', () => {
    currentModalFeatures.push({ id: Date.now().toString(), text: '', included: true });
    renderDynamicFeatures();
  });

  document.getElementById('add-plan-btn').addEventListener('click', () => {
    document.getElementById('plan-modal-title').textContent = 'Add WiFi Plan';
    document.getElementById('plan-form').reset();
    document.getElementById('plan-doc-id').value = '';
    document.getElementById('plan-active').checked = true;
    
    // Default dynamic features for new plan
    currentModalFeatures = [
      { id: '1', text: 'Browsing & social media', included: true },
      { id: '2', text: 'Email & messaging', included: true },
      { id: '3', text: 'HD video streaming', included: false },
      { id: '4', text: 'Online gaming', included: false },
      { id: '5', text: 'Priority support', included: false }
    ];
    renderDynamicFeatures();
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

    // Map current dynamic features to be saved, filtering out empty texts
    const featuresData = currentModalFeatures
      .filter(f => f.text.trim() !== '')
      .map(f => ({ text: f.text.trim(), included: f.included }));
    const data = {
      name: document.getElementById('plan-name').value.trim(),
      speed: document.getElementById('plan-speed').value.trim(),
      monthlyRate: parseFloat(document.getElementById('plan-rate').value),
      description: document.getElementById('plan-description').value.trim(),
      isActive: document.getElementById('plan-active').checked,
      features: JSON.stringify(featuresData),
    };

    const saveBtn = document.getElementById('save-plan-btn');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';
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
      showToast('Failed to save plan: ' + (error.message || error), 'danger');
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Plan';
    }
  });

  async function loadPlans() {
    try {
      const response = await services.plan.getAll();
      allPlans = response.documents || [];
      renderPlansGrid(allPlans);
    } catch (error) {
      console.error('Failed to load plans:', error);
      showToast('Could not load WiFi Plans: ' + (error.message || error), 'danger');
      allPlans = [];
      renderPlansGrid(allPlans);
    }
  }

  function renderPlansGrid(plans) {
    const grid = document.getElementById('plans-grid');
    if (!grid) return;
    
    try {
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

      // Flexible dynamic parsing for backwards compatibility
      let savedFeatures = null;
      try { savedFeatures = p.features ? JSON.parse(p.features) : null; } catch(e) {}
      
      let featuresToRender = [];
      
      if (Array.isArray(savedFeatures)) {
         featuresToRender = savedFeatures;
      } else if (savedFeatures && Object.keys(savedFeatures).length > 0) {
         featuresToRender = [
            { text: `Up to ${p.speed || speedNum + ' Mbps'} speed`, included: true },
            { text: 'Browsing & social media', included: !!savedFeatures.browsing },
            { text: 'Email & messaging', included: !!savedFeatures.email },
            { text: 'HD video streaming', included: !!savedFeatures.hd },
            { text: 'Online gaming', included: !!savedFeatures.gaming },
            { text: 'Priority support', included: !!savedFeatures.priority }
         ];
      } else {
         featuresToRender = [
            { text: `Up to ${p.speed || speedNum + ' Mbps'} speed`, included: true },
            { text: 'Browsing & social media', included: true },
            { text: 'Email & messaging', included: true },
            { text: 'HD video streaming', included: speedNum > 25 },
            { text: 'Online gaming', included: speedNum > 25 },
            { text: 'Priority support', included: speedNum > 50 }
         ];
      }

      const featuresHTML = featuresToRender.map(f => `
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
          <div class="pricing-header" style="position:relative;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
              <h3 class="pricing-plan-name">${p.name || p.planName || ''}</h3>
              <div class="pricing-actions" style="gap:4px;">
                <button class="btn btn-ghost btn-sm btn-icon" title="Edit" data-edit-plan="${p.$id || p.id}">
                  <span class="material-icons-outlined" style="font-size:16px;">edit</span>
                </button>
                <button class="btn btn-ghost btn-sm btn-icon" title="Delete" data-delete-plan="${p.$id || p.id}" style="color:var(--accent-rose);">
                  <span class="material-icons-outlined" style="font-size:16px;">delete</span>
                </button>
              </div>
            </div>
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
        document.getElementById('plan-name').value = p.name || p.planName || '';
        document.getElementById('plan-speed').value = p.speed || '';
        document.getElementById('plan-rate').value = p.monthlyRate || '';
        document.getElementById('plan-description').value = p.description || '';
        document.getElementById('plan-active').checked = p.isActive !== false;
        // Load saved features dynamically into the modal state
        let savedFeatures = null;
        try { savedFeatures = p.features ? JSON.parse(p.features) : null; } catch(e) {}
        
        currentModalFeatures = [];
        if (Array.isArray(savedFeatures)) {
           // New dynamic array format
           currentModalFeatures = savedFeatures.map((f, i) => ({ id: i.toString(), text: f.text, included: f.included }));
        } else if (savedFeatures && typeof savedFeatures === 'object') {
           // Legacy object format fallback
           currentModalFeatures.push({ id: '1', text: 'Browsing & social media', included: !!savedFeatures.browsing });
           currentModalFeatures.push({ id: '2', text: 'Email & messaging', included: !!savedFeatures.email });
           currentModalFeatures.push({ id: '3', text: 'HD video streaming', included: !!savedFeatures.hd });
           currentModalFeatures.push({ id: '4', text: 'Online gaming', included: !!savedFeatures.gaming });
           currentModalFeatures.push({ id: '5', text: 'Priority support', included: !!savedFeatures.priority });
        } else {
           // No features saved, use standard defaults based on speed
           const speedNum = parseInt(p.speed) || 0;
           currentModalFeatures.push({ id: '1', text: 'Browsing & social media', included: true });
           currentModalFeatures.push({ id: '2', text: 'Email & messaging', included: true });
           currentModalFeatures.push({ id: '3', text: 'HD video streaming', included: speedNum > 25 });
           currentModalFeatures.push({ id: '4', text: 'Online gaming', included: speedNum > 25 });
           currentModalFeatures.push({ id: '5', text: 'Priority support', included: speedNum > 50 });
        }
        
        renderDynamicFeatures();
        openModal('plan-modal');
      });
    });

    // Delete
    grid.querySelectorAll('[data-delete-plan]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const confirmed = await showConfirm(
          'Are you sure you want to delete this plan? This action cannot be undone.',
          { title: 'Delete Plan?', confirmText: 'Yes, Delete', type: 'danger' }
        );
        if (!confirmed) return;
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
    } catch(e) {
      grid.innerHTML = `<div style="color: red; padding: 20px; font-family: monospace; white-space: pre-wrap; word-break: break-all;">CRASH IN RENDER PLAN: ${e.stack}</div>`;
      console.error(e);
    }
  }

  // Initial load
  loadPlans();
}

