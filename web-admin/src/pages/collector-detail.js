import { formatDate, getInitials, showToast, showConfirm } from '../components/ui-helpers.js';
import { ENDPOINT, PROJECT_ID, API_KEY } from '../config/appwrite.js';

/**
 * Collector Detail Page — Full page view matching Customer Detail layout
 */
export function renderCollectorDetailPage() {
  return `
    <div class="customer-detail-page" style="display:flex; flex-direction:column; flex:1; height:100%; overflow:hidden;">
      <div class="detail-page-loading" id="detail-loading">
        <div class="spinner" style="margin:60px auto;"></div>
        <p style="text-align:center; color:var(--text-muted); margin-top:16px;">Loading collector details...</p>
      </div>
      <div id="detail-content" style="display:none; flex:1; overflow:hidden; display:flex; flex-direction:column;"></div>
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
        '<div class="empty-state"><div class="empty-icon">😕</div><div class="empty-title">Not found</div></div>';
      return;
    }

    // Render
    document.getElementById('detail-loading').style.display = 'none';
    const content = document.getElementById('detail-content');
    content.style.display = 'flex';
    content.style.flexDirection = 'column';

    const hue1 = hashCode(collector.firstName || '');
    const hue2 = hashCode(collector.lastName || '');
    const fullName = `${collector.firstName || ''} ${collector.middleName || ''} ${collector.lastName || ''}`.trim();
    
    const roleTitle = collector.role === 'technician' ? 'Technician' : 'Collector';

    // Update main header dynamically
    const pageTitleEl = document.querySelector('.page-title');
    const pageSubtitleEl = document.querySelector('.page-subtitle');
    if (pageTitleEl) pageTitleEl.textContent = `${roleTitle} Details`;
    if (pageSubtitleEl) pageSubtitleEl.textContent = `View ${roleTitle.toLowerCase()} information`;

    content.innerHTML = `
      <div class="settings-layout">
        <!-- Sidebar -->
        <aside class="settings-sidebar card glass-card">
          <div class="sidebar-profile">
            ${collector.profileImage
              ? `<div class="sidebar-avatar" style="background-image:url('${collector.profileImage}'); background-size:cover; background-position:center; border: 1px solid rgba(255,255,255,0.1);"></div>`
              : `<div class="sidebar-avatar" style="background:linear-gradient(135deg, hsl(${hue1},70%,55%), hsl(${hue2},60%,45%));">
                  ${getInitials(collector.firstName, collector.lastName)}
                 </div>`
            }
            <h2 class="sidebar-name">${fullName || 'Unnamed'}</h2>
            <span class="sidebar-role">${roleTitle}</span>
          </div>

          <nav class="sidebar-nav">
            <a href="javascript:void(0)" class="nav-item active" id="nav-item-personal">
              <span class="material-icons-outlined">person</span> Personal Information
            </a>
            <a href="javascript:void(0)" class="nav-item" id="nav-item-password">
              <span class="material-icons-outlined">lock</span> Password
            </a>
          </nav>

          <div style="margin-top:auto; padding: 0 20px;">
             <!-- Subtle delete integration -->
             <button class="btn btn-ghost" id="detail-delete-btn" style="width:100%; justify-content:center; font-weight: 600; font-size: 0.85rem; color: var(--accent-rose); border: 1px dashed rgba(244, 63, 94, 0.4); margin-bottom: 20px;">
              <span class="material-icons-outlined" style="margin-right:8px; font-size: 16px;">delete_outline</span> Delete ${roleTitle}
             </button>
          </div>
        </aside>

        <!-- Main Form -->
        <main class="settings-main card glass-card" style="padding: 40px;">
          <h3 id="main-tab-title" style="margin-bottom: 30px;">Personal Information</h3>

          <div id="tab-content-personal" style="display: block;">
            <form id="collector-settings-form">
              <div class="form-row" style="gap:24px; margin-bottom:20px;">
                <div class="form-group" style="flex:1;">
                  <label style="color:var(--text-secondary); font-size: 0.85rem; margin-bottom: 8px; display:block;">First Name</label>
                  <input type="text" class="form-input" id="set-firstName" value="${collector.firstName || ''}" style="background:var(--bg-input); border:1px solid var(--border-color); border-radius:12px; padding: 14px 16px; width:100%;">
                </div>
                <div class="form-group" style="flex:1;">
                  <label style="color:var(--text-secondary); font-size: 0.85rem; margin-bottom: 8px; display:block;">Last Name</label>
                  <input type="text" class="form-input" id="set-lastName" value="${collector.lastName || ''}" style="background:var(--bg-input); border:1px solid var(--border-color); border-radius:12px; padding: 14px 16px; width:100%;">
                </div>
              </div>

              <div class="form-group" style="position: relative; margin-bottom:20px;">
                <label style="color:var(--text-secondary); font-size: 0.85rem; margin-bottom: 8px; display:block;">Email</label>
                <input type="email" class="form-input" id="set-email" value="${collector.email || ''}" style="background:var(--bg-input); border:1px solid var(--border-color); border-radius:12px; padding: 14px 16px; padding-right: 100px; width:100%;">
                <span style="position: absolute; right: 16px; top: 40px; color: var(--accent-emerald); font-size: 0.8rem; font-weight: 600; display:flex; align-items:center; gap:4px;"><span class="material-icons-outlined" style="font-size:16px;">check_circle</span> Verified</span>
              </div>

              <div class="form-group" style="margin-bottom:20px;">
                <label style="color:var(--text-secondary); font-size: 0.85rem; margin-bottom: 8px; display:block;">Address</label>
                <input type="text" class="form-input" id="set-address" value="${collector.address || ''}" style="background:var(--bg-input); border:1px solid var(--border-color); border-radius:12px; padding: 14px 16px; width:100%;">
              </div>

              <div class="form-row" style="gap:24px; margin-bottom:20px;">
                <div class="form-group" style="flex:1;">
                  <label style="color:var(--text-secondary); font-size: 0.85rem; margin-bottom: 8px; display:block;">Phone Number</label>
                  <input type="text" class="form-input" id="set-phone" value="${collector.phone || ''}" style="background:var(--bg-input); border:1px solid var(--border-color); border-radius:12px; padding: 14px 16px; width:100%;">
                </div>
                <div class="form-group" style="flex:1;">
                  <label style="color:var(--text-secondary); font-size: 0.85rem; margin-bottom: 8px; display:block;">Barangay</label>
                  <input type="text" class="form-input" id="set-barangay" value="${collector.barangay || ''}" style="background:var(--bg-input); border:1px solid var(--border-color); border-radius:12px; padding: 14px 16px; width:100%;">
                </div>
              </div>

              <div class="form-row" style="gap:24px; margin-bottom:20px;">
                <div class="form-group" style="flex:1;">
                  <label style="color:var(--text-secondary); font-size: 0.85rem; margin-bottom: 8px; display:block;">Location (City)</label>
                  <input type="text" class="form-input" id="set-city" value="${collector.city || ''}" style="background:var(--bg-input); border:1px solid var(--border-color); border-radius:12px; padding: 14px 16px; width:100%;">
                </div>
                <div class="form-group" style="flex:1;">
                  <label style="color:var(--text-secondary); font-size: 0.85rem; margin-bottom: 8px; display:block;">Province / Postal</label>
                  <input type="text" class="form-input" id="set-province" value="${collector.province || ''}" style="background:var(--bg-input); border:1px solid var(--border-color); border-radius:12px; padding: 14px 16px; width:100%;">
                </div>
              </div>

              <div class="settings-actions" style="margin-top: 40px;">
                <button type="button" class="btn btn-ghost" id="discard-changes-btn" style="border: 1px solid var(--accent-amber); color: var(--accent-amber); border-radius: 12px; padding: 10px 24px; font-weight: 600;">Discard Changes</button>
                <button type="button" class="btn btn-primary" id="save-changes-btn" style="background: var(--accent-amber); border-color: var(--accent-amber); color: #000; border-radius: 12px; padding: 10px 36px; font-weight: 600;">Save Changes</button>
              </div>
            </form>
          </div>

          <div id="tab-content-password" style="display: none;">
            <p style="color:var(--text-muted); font-size:0.9rem; margin-bottom:24px;">Reset the password for this account. They will be able to log in to the mobile application with the new password.</p>
            <form id="collector-password-form">
              <div class="form-group" style="margin-bottom:20px;">
                <label style="color:var(--text-secondary); font-size: 0.85rem; margin-bottom: 8px; display:block;">New Password</label>
                <input type="password" class="form-input" id="set-new-password" placeholder="Minimum 8 characters" style="background:var(--bg-input); border:1px solid var(--border-color); border-radius:12px; padding: 14px 16px; width:100%;">
              </div>
              <div class="form-group" style="margin-bottom:20px;">
                <label style="color:var(--text-secondary); font-size: 0.85rem; margin-bottom: 8px; display:block;">Confirm New Password</label>
                <input type="password" class="form-input" id="set-confirm-password" placeholder="Repeat new password" style="background:var(--bg-input); border:1px solid var(--border-color); border-radius:12px; padding: 14px 16px; width:100%;">
              </div>

              <div class="settings-actions" style="margin-top: 40px;">
                <button type="button" class="btn btn-primary" id="save-password-btn" style="background: var(--accent-amber); border-color: var(--accent-amber); color: #000; border-radius: 12px; padding: 10px 36px; font-weight: 600;">Update Password</button>
              </div>
            </form>
          </div>
        </main>
      </div>
    `;

    // ── Tab Behavior ──
    const navPersonal = document.getElementById('nav-item-personal');
    const navPassword = document.getElementById('nav-item-password');
    const tabPersonal = document.getElementById('tab-content-personal');
    const tabPassword = document.getElementById('tab-content-password');
    const mainTitle = document.getElementById('main-tab-title');

    navPersonal.addEventListener('click', () => {
      navPersonal.classList.add('active');
      navPassword.classList.remove('active');
      tabPersonal.style.display = 'block';
      tabPassword.style.display = 'none';
      mainTitle.textContent = 'Personal Information';
    });

    navPassword.addEventListener('click', () => {
      navPassword.classList.add('active');
      navPersonal.classList.remove('active');
      tabPassword.style.display = 'block';
      tabPersonal.style.display = 'none';
      mainTitle.textContent = 'Password';
    });

    // ── Event Listeners ──

    document.getElementById('discard-changes-btn').addEventListener('click', () => {
      // Navigate back to the collectors/technicians list
      navigateFn(collector.role === 'technician' ? 'technicians' : 'collectors');
    });

    // Save Password logic using Appwrite Server API
    document.getElementById('save-password-btn').addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      const pwd = document.getElementById('set-new-password').value;
      const confirmPwd = document.getElementById('set-confirm-password').value;
      
      if (!pwd || pwd.length < 8) {
        showToast('Password must be at least 8 characters.', 'error');
        return;
      }
      if (pwd !== confirmPwd) {
        showToast('Passwords do not match.', 'error');
        return;
      }

      if (!collector.userId) {
        showToast('Cannot update password. User account not linked.', 'error');
        return;
      }

      const originalText = btn.innerHTML;
      btn.innerHTML = `<span class="material-icons-outlined" style="font-size:16px;">hourglass_empty</span> Updating...`;
      btn.disabled = true;

      try {
        const res = await fetch(`${ENDPOINT}/users/${collector.userId}/password`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'X-Appwrite-Project': PROJECT_ID,
            'X-Appwrite-Key': API_KEY,
          },
          body: JSON.stringify({ password: pwd })
        });
        
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.message || 'Failed to update password');
        }
        
        showToast('Password updated successfully!', 'success');
        document.getElementById('collector-password-form').reset();
      } catch (err) {
        showToast(err.message || 'Error communicating with server', 'error');
      } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
      }
    });

    document.getElementById('save-changes-btn').addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      const originalText = btn.innerHTML;
      btn.innerHTML = `<span class="material-icons-outlined" style="font-size:16px;">hourglass_empty</span> Saving...`;
      btn.disabled = true;

      const updatedData = {
        firstName: document.getElementById('set-firstName').value.trim(),
        lastName: document.getElementById('set-lastName').value.trim(),
        phone: document.getElementById('set-phone').value.trim(),
        email: document.getElementById('set-email').value.trim(),
        address: document.getElementById('set-address').value.trim(),
        barangay: document.getElementById('set-barangay').value.trim(),
        city: document.getElementById('set-city').value.trim(),
        province: document.getElementById('set-province').value.trim(),
      };

      try {
        await services.collector.update(id, updatedData);
        showToast(`${roleTitle} updated successfully!`, 'success');
      } catch (err) {
        Object.assign(collector, updatedData);
        showToast(`${roleTitle} updated (demo)`, 'success');
      }
      navigateFn('collector_detail:' + id);
    });

    document.getElementById('detail-delete-btn').addEventListener('click', async () => {
      const confirmed = await showConfirm(
        `Are you sure you want to delete ${fullName}? This action cannot be undone.`,
        { title: `Delete ${roleTitle}?`, confirmText: 'Yes, Delete', type: 'danger' }
      );
      if (!confirmed) return;
      try {
        await services.collector.delete(id);
        showToast(`${roleTitle} deleted`, 'success');
      } catch (err) {
        showToast(`${roleTitle} removed`, 'success');
      }
      navigateFn(collector.role === 'technician' ? 'technicians' : 'collectors');
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
