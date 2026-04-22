import { statusBadge, formatCurrency, formatDate, getInitials, showToast, showConfirm } from '../components/ui-helpers.js';
import { printBillings, getReceiptPreviewHtml } from '../services/print.service.js';
import html2canvas from 'html2canvas';
import { ENDPOINT, PROJECT_ID, API_KEY } from '../config/appwrite.js';
import { ticketService } from '../services/ticket.service.js';

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
      console.error('Failed to load customer:', e);
      customer = null;
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
      console.error('Failed to load plans:', e);
      allPlans = [];
    }

    // Load collectors
    try {
      const resp = await services.collector.getAll(50, 0);
      allCollectors = resp.documents || [];
    } catch (e) {
      console.error('Failed to load collectors:', e);
      allCollectors = [];
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
      console.error('Failed to load billing history:', e);
      billingHistory = [];
    }

    // Load repair history
    let repairHistory = [];
    try {
      repairHistory = await ticketService.getCustomerTickets(customer.userId);
    } catch (e) {
      console.error('Failed to load repair history:', e);
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
      <!-- Customer Header Card -->
      <div class="card glass-card" style="margin-top: 8px; padding: 16px 20px; display: flex; align-items: center; justify-content: space-between;">
        <div style="display: flex; align-items: center; gap: 16px; flex-grow: 1;">
          <div class="detail-avatar" style="background:linear-gradient(135deg, hsl(${hue1},70%,55%), hsl(${hue2},60%,45%)); width: 56px; height: 56px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: bold; color: white; flex-shrink: 0;">
            ${getInitials(customer.firstName, customer.lastName)}
          </div>
          <div>
            <h1 class="detail-customer-name" style="margin: 0; font-size: 1.15rem; font-weight: 700; color: var(--text-primary);">${customer.firstName || ''} ${customer.middleName || ''} ${customer.lastName || ''}</h1>
            <div style="color: var(--accent-blue); font-size: 0.8rem; margin-top: 4px; display: flex; align-items: center; gap: 6px;">
              <span class="material-icons-outlined" style="font-size:14px;">wifi</span> ${plan ? plan.name : 'No Plan'} <span style="color: var(--text-muted);">| Since ${formatDate(customer.createdAt || customer.$createdAt)}</span>
            </div>
          </div>
        </div>

        <div style="width: 1px; height: 40px; background: rgba(255,255,255,0.1); margin: 0 24px;"></div>

        <div style="display: grid; grid-template-columns: minmax(160px, auto) minmax(160px, auto); column-gap: 24px; row-gap: 8px; flex-grow: 2;">
          <div style="display: flex; font-size: 0.8rem;"><span style="color:var(--text-muted); width: 80px;">Customer ID:</span> <strong style="color: var(--text-primary);">${customer.userId || '—'}</strong></div>
          <div style="display: flex; font-size: 0.8rem;"><span style="color:var(--text-muted); width: 90px;">Phone number:</span> <strong style="color: var(--text-primary);">${customer.phone || '—'}</strong></div>
        </div>

        <div class="detail-header-actions" style="display: flex; gap: 8px; margin-left: 16px; padding-left: 16px; border-left: 1px solid rgba(255,255,255,0.1);">
          <button class="btn btn-outline" id="detail-report-issue-btn" style="min-width: 100px; padding: 6px 12px; justify-content: center; font-size: 0.8rem; border-color: var(--accent-amber); color: var(--accent-amber);">
            <span class="material-icons-outlined" style="font-size:16px;">report_problem</span> Report Issue
          </button>
          <button class="btn btn-primary" id="detail-edit-btn" style="min-width: 80px; padding: 6px 12px; justify-content: center; font-size: 0.8rem;">
            <span class="material-icons-outlined" style="font-size:16px;">edit</span> Edit
          </button>
          <button class="btn btn-danger" id="detail-delete-btn" style="min-width: 80px; padding: 6px 12px; justify-content: center; font-size: 0.8rem;">
            <span class="material-icons-outlined" style="font-size:16px;">delete</span> Delete
          </button>
        </div>
      </div>

      <!-- Info Grid -->
      <div class="detail-info-grid" style="display:grid; grid-template-columns: 1fr 1fr; gap:16px; align-items:stretch; margin-top:16px; min-height: max(500px, calc(100vh - 180px));">
        
        <!-- Left Column: Personal + Address -->
        <div style="display:flex; flex-direction:column; gap:16px;">
          <!-- Personal Info Card -->
          <div class="card glass-card" style="margin:0; padding:16px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; border-bottom:1px solid var(--border-color); padding-bottom:8px;">
              <span class="card-title" style="margin:0; font-size:0.95rem; font-weight:600;"><span class="material-icons-outlined" style="font-size:16px; vertical-align:-3px; margin-right:6px; color:var(--text-muted);">person</span>Personal information</span>
              <span class="material-icons-outlined" style="cursor:pointer; color:var(--text-muted); font-size:16px; transition: color 0.2s;" onmouseover="this.style.color='var(--accent-blue)'" onmouseout="this.style.color='var(--text-muted)'" onclick="document.getElementById('detail-edit-btn').click();">edit</span>
            </div>
            <div style="display:grid; grid-template-columns: 1fr 1fr; row-gap:12px; column-gap:16px;">
              <div style="display:flex; flex-direction:column; gap:4px;">
                <span style="font-size:0.75rem; color:var(--text-muted);">Full Name</span>
                <span style="font-size:0.9rem; font-weight:600; color:var(--text-primary);">${customer.firstName || ''} ${customer.middleName || ''} ${customer.lastName || ''}</span>
              </div>
              <div style="display:flex; flex-direction:column; gap:4px;">
                <span style="font-size:0.75rem; color:var(--text-muted);">Phone</span>
                <span style="font-size:0.9rem; font-weight:600; color:var(--text-primary);">${customer.phone || '—'}</span>
              </div>
              <div style="display:flex; flex-direction:column; gap:4px;">
                <span style="font-size:0.75rem; color:var(--text-muted);">WiFi Plan</span>
                <span style="font-size:0.9rem; font-weight:600; color:var(--text-primary);">${plan ? plan.name : '—'}</span>
              </div>
              <div style="display:flex; flex-direction:column; gap:4px;">
                <span style="font-size:0.75rem; color:var(--text-muted);">Monthly Rate</span>
                <span style="font-size:0.9rem; font-weight:600; color:var(--text-primary);">${plan ? `₱${(plan.monthlyRate || 0).toLocaleString()}` : '—'}</span>
              </div>
              <div style="display:flex; flex-direction:column; gap:4px;">
                <span style="font-size:0.75rem; color:var(--text-muted);">Identify code</span>
                <span style="font-size:0.9rem; font-weight:600; color:var(--text-primary);">${customer.userId || '—'}</span>
              </div>
              <div style="display:flex; flex-direction:column; gap:4px;">
                <span style="font-size:0.75rem; color:var(--text-muted);">Registered Date</span>
                <span style="font-size:0.9rem; font-weight:600; color:var(--text-primary);">${formatDate(customer.billingStartDate || customer.createdAt || customer.$createdAt, { month: 'long' })}</span>
              </div>
            </div>
          </div>
          
          <!-- Address Card -->
          <div class="card glass-card" style="margin:0; padding:16px; flex-grow:1; display:flex; flex-direction:column;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; border-bottom:1px solid var(--border-color); padding-bottom:8px;">
              <span class="card-title" style="margin:0; font-size:0.95rem; font-weight:600;"><span class="material-icons-outlined" style="font-size:16px; vertical-align:-3px; margin-right:6px; color:var(--text-muted);">location_on</span>Address information</span>
              <span class="material-icons-outlined" style="cursor:pointer; color:var(--text-muted); font-size:16px; transition: color 0.2s;" onmouseover="this.style.color='var(--accent-blue)'" onmouseout="this.style.color='var(--text-muted)'" onclick="document.getElementById('detail-edit-btn').click();">edit</span>
            </div>
            <div style="display:grid; grid-template-columns: 1fr 1fr; row-gap:12px; column-gap:16px; flex-grow:1; align-content:start;">
              <div style="display:flex; flex-direction:column; gap:4px; grid-column: 1 / -1;">
                <span style="font-size:0.75rem; color:var(--text-muted);">Street / House</span>
                <span style="font-size:0.9rem; font-weight:600; color:var(--text-primary);">${customer.address || '—'}</span>
              </div>
              <div style="display:flex; flex-direction:column; gap:4px;">
                <span style="font-size:0.75rem; color:var(--text-muted);">Barangay</span>
                <span style="font-size:0.9rem; font-weight:600; color:var(--text-primary);">${customer.barangay || '—'}</span>
              </div>
              <div style="display:flex; flex-direction:column; gap:4px;">
                <span style="font-size:0.75rem; color:var(--text-muted);">City / Municipality</span>
                <span style="font-size:0.9rem; font-weight:600; color:var(--text-primary);">${customer.city || '—'}</span>
              </div>
              <div style="display:flex; flex-direction:column; gap:4px;">
                <span style="font-size:0.75rem; color:var(--text-muted);">Province</span>
                <span style="font-size:0.9rem; font-weight:600; color:var(--text-primary);">${customer.province || '—'}</span>
              </div>
              
              <!-- Location Map/Photo -->
              <div style="grid-column: 1 / -1; margin-top:4px; display: grid; grid-template-columns: 1fr 1fr; gap: 16px; flex-grow:1; align-items:stretch;">
                ${(() => {
                  let photos = [];
                  if (customer.profileImage) {
                    try {
                      const trimmed = customer.profileImage.trim();
                      let arr = trimmed.startsWith('[') ? JSON.parse(trimmed) : [trimmed];
                      photos = arr.filter(u => u).map(item => item.startsWith('http') ? item : `${ENDPOINT}/storage/buckets/customer_images/files/${item}/view?project=${PROJECT_ID}`);
                    } catch (_) { 
                      photos = [customer.profileImage.startsWith('http') ? customer.profileImage : `${ENDPOINT}/storage/buckets/customer_images/files/${customer.profileImage}/view?project=${PROJECT_ID}`];
                    }
                  }

                  let photoHtml = '';
                  if (photos.length > 0) {
                    photoHtml = `
                    <div style="display:flex; flex-direction:column;">
                      <span style="font-size:0.7rem; color:var(--text-muted); display:block; margin-bottom:4px;">Location Photo</span>
                      <div style="width:100%; flex-grow:1; min-height:130px; border-radius:8px; overflow:hidden; border:1px solid var(--border-color);">
                        <img src="${photos[0]}" alt="Location" style="width:100%; height:100%; object-fit:cover; display:block;" />
                      </div>
                    </div>`;
                  } else {
                     photoHtml = `
                     <div style="display:flex; flex-direction:column;">
                       <span style="font-size:0.7rem; color:var(--text-muted); display:block; margin-bottom:4px;">Location Photo</span>
                       <div style="width:100%; flex-grow:1; min-height:130px; border-radius:8px; background:rgba(255,255,255,0.02); border:1px solid var(--border-color); display:flex; align-items:center; justify-content:center; color:var(--text-muted); font-size:0.8rem;">No photo recorded</div>
                     </div>`;
                  }

                  return `
                    ${photoHtml}
                    <div style="display:flex; flex-direction:column;">
                      <span style="font-size:0.7rem; color:var(--text-muted); display:block; margin-bottom:4px;">Map Preview</span>
                      <div id="map-preview" style="width:100%; flex-grow:1; min-height:130px; border-radius:8px; background:rgba(255,255,255,0.02); border:1px solid var(--border-color); display:flex; align-items:center; justify-content:center; color:var(--text-muted); font-size:0.8rem; overflow:hidden;">
                        ${customer.latitude && customer.longitude ? 'Loading map...' : 'No location recorded'}
                      </div>
                    </div>
                  `;
                })()}
              </div>
            </div>
          </div>
        </div>

        <!-- Right Column: Creds + Facility -->
        <div style="display:flex; flex-direction:column; gap:16px;">
          
          <!-- Credentials Card -->
          <div class="card glass-card" style="margin:0; padding:16px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; border-bottom:1px solid var(--border-color); padding-bottom:8px;">
              <span class="card-title" style="margin:0; font-size:0.95rem; font-weight:600;"><span class="material-icons-outlined" style="font-size:16px; vertical-align:-3px; margin-right:6px; color:var(--text-muted);">lock</span>Credentials information</span>
              <span class="material-icons-outlined" style="cursor:pointer; color:var(--text-muted); font-size:16px; transition: color 0.2s;" onmouseover="this.style.color='var(--accent-blue)'" onmouseout="this.style.color='var(--text-muted)'" onclick="document.getElementById('detail-edit-btn').click();">edit</span>
            </div>
            <div style="display:grid; grid-template-columns: 1fr 1fr; row-gap:12px; column-gap:16px;">
              <div style="display:flex; flex-direction:column; gap:4px;">
                <span style="font-size:0.75rem; color:var(--text-muted);">PPPoE Account</span>
                <span style="font-size:0.9rem; font-weight:600; color:var(--text-primary);">${customer.pppoeUser || '—'}</span>
              </div>
              <div style="display:flex; flex-direction:column; gap:4px;">
                <span style="font-size:0.75rem; color:var(--text-muted);">PPPoE Password</span>
                <span style="font-size:0.9rem; font-weight:600; color:var(--text-primary); font-family:monospace;">${customer.pppoePassword || '—'}</span>
              </div>
              <div style="display:flex; flex-direction:column; gap:4px;">
                <span style="font-size:0.75rem; color:var(--text-muted);">WiFi Name (SSID)</span>
                <span style="font-size:0.9rem; font-weight:600; color:var(--text-primary);">${customer.wifiName || '—'}</span>
              </div>
              <div style="display:flex; flex-direction:column; gap:4px;">
                <span style="font-size:0.75rem; color:var(--text-muted);">WiFi Password</span>
                <span style="font-size:0.9rem; font-weight:600; color:var(--text-primary); font-family:monospace;">${customer.wifiPassword || '—'}</span>
              </div>
              <div style="display:flex; flex-direction:column; gap:4px;">
                <span style="font-size:0.75rem; color:var(--text-muted);">Billing Date</span>
                <span style="font-size:0.9rem; font-weight:600; color:var(--text-primary);">${customer.billingStartDate || '—'}</span>
              </div>
              <div style="display:flex; flex-direction:column; gap:4px;">
                <span style="font-size:0.75rem; color:var(--text-muted);">Facebook</span>
                <span style="font-size:0.9rem; font-weight:600; color:var(--accent-blue);">${customer.facebookUrl ? `<a href="${customer.facebookUrl}" target="_blank" style="color:var(--accent-blue); text-decoration:none;">View Profile</a>` : '—'}</span>
              </div>
            </div>
          </div>
          
          <!-- Facility Card -->
          <div class="card glass-card" style="margin:0; padding:16px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; border-bottom:1px solid var(--border-color); padding-bottom:8px;">
              <span class="card-title" style="margin:0; font-size:0.95rem; font-weight:600;"><span class="material-icons-outlined" style="font-size:16px; vertical-align:-3px; margin-right:6px; color:var(--text-muted);">router</span>Facility information</span>
              <span class="material-icons-outlined" style="cursor:pointer; color:var(--text-muted); font-size:16px; transition: color 0.2s;" onmouseover="this.style.color='var(--accent-blue)'" onmouseout="this.style.color='var(--text-muted)'" onclick="document.getElementById('detail-edit-btn').click();">edit</span>
            </div>
            <div style="display:grid; grid-template-columns: 1fr 1fr; row-gap:12px; column-gap:16px;">
              <div style="display:flex; flex-direction:column; gap:4px;">
                <span style="font-size:0.75rem; color:var(--text-muted);">Napbox Assignment</span>
                <span style="font-size:0.9rem; font-weight:600; color:var(--text-primary);">${customer.napbox || '—'}</span>
              </div>
              <div style="display:flex; flex-direction:column; gap:4px;">
                <span style="font-size:0.75rem; color:var(--text-muted);">Port Allocation</span>
                <span style="font-size:0.9rem; font-weight:600; color:var(--text-primary);">${customer.wifiPort || '—'}</span>
              </div>
            </div>
          </div>
          
          <!-- Payment History -->
          <div class="card glass-card" style="margin:0; padding:16px; flex-grow:1; display:flex; flex-direction:column;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:8px;">
              <span class="card-title" style="margin:0; font-size:0.95rem; font-weight:600;"><span class="material-icons-outlined" style="font-size:16px; vertical-align:-3px; margin-right:6px; color:var(--text-muted);">receipt_long</span>Payment History</span>
              <span class="badge" style="background:rgba(59,130,246,0.1); color:var(--accent-blue); border:1px solid rgba(59,130,246,0.2); font-size:0.75rem; padding:2px 6px;">${billingHistory.length} Records</span>
            </div>
            <div style="overflow-x:auto; flex-grow:1;">
              <table class="data-table" id="payment-history-table" style="font-size:0.8rem;">
                <thead>
                  <tr>
                    <th style="padding:6px 8px;">Month</th>
                    <th style="padding:6px 8px;">Amount</th>
                    <th style="padding:6px 8px;">Status</th>
                    <th style="padding:6px 8px;">Date Paid</th>
                    <th style="padding:6px 8px; width:80px;">Actions</th>
                  </tr>
                </thead>
                <tbody id="payment-history-tbody">
                  <!-- Rendered via JS pagination -->
                </tbody>
              </table>
            </div>
            <div id="payment-history-pagination" style="display:flex; justify-content:space-between; align-items:center; margin-top:16px; font-size:0.8rem; color:var(--text-muted);">
              <!-- Pagination controls -->
            </div>
          </div>

        </div>
      </div>

      <!-- Repair History -->
      <div class="card glass-card" style="margin-top:16px; padding:16px;">
         <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:8px;">
            <span class="card-title" style="margin:0; font-size:0.95rem; font-weight:600;"><span class="material-icons-outlined" style="font-size:16px; vertical-align:-3px; margin-right:6px; color:var(--text-muted);">build</span>Repair History</span>
            <span class="badge" style="background:rgba(59,130,246,0.1); color:var(--accent-blue); border:1px solid rgba(59,130,246,0.2); font-size:0.75rem; padding:2px 6px;">${repairHistory.length} Tickets</span>
         </div>
         <div style="overflow-x:auto;">
            <table class="data-table" style="font-size:0.8rem; width:100%;">
               <thead>
                  <tr>
                    <th style="padding:6px 8px;">Date</th>
                    <th style="padding:6px 8px;">Issue</th>
                    <th style="padding:6px 8px;">Status</th>
                    <th style="padding:6px 8px;">Priority</th>
                    <th style="padding:6px 8px;">Proof of Work</th>
                  </tr>
               </thead>
               <tbody>
                  ${repairHistory.length > 0 ? repairHistory.map(ticket => `
                     <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
                        <td style="padding:6px 8px;">${formatDate(ticket.$createdAt)}</td>
                        <td style="padding:6px 8px;">${ticket.issue || '—'}</td>
                        <td style="padding:6px 8px;">${statusBadge(ticket.status || 'pending')}</td>
                        <td style="padding:6px 8px; text-transform:capitalize;">${ticket.priority || '—'}</td>
                        <td style="padding:6px 8px;">
                           ${Array.isArray(ticket.imageUrls) && ticket.imageUrls.length > 0
                              ? `<a href="${ticket.imageUrls[ticket.imageUrls.length - 1]}" target="_blank" style="color:var(--accent-blue); text-decoration:none; font-weight:600; display:flex; align-items:center; gap:4px;"><span class="material-icons-outlined" style="font-size:14px;">photo_camera</span>View Photo</a>`
                              : `<span style="color:var(--text-muted);">—</span>`}
                        </td>
                     </tr>
                  `).join('') : `
                     <tr><td colspan="5" style="text-align:center; padding:20px; color:var(--text-muted);">No repair tickets on record</td></tr>
                  `}
               </tbody>
            </table>
         </div>
      </div>
    `;

    // Render Leaflet map securely after DOM injected
    if (customer.latitude && customer.longitude && window.L) {
      setTimeout(() => {
        const mapDiv = document.getElementById('map-preview');
        if (mapDiv) {
          mapDiv.innerHTML = '';
          const lat = parseFloat(customer.latitude);
          const lng = parseFloat(customer.longitude);
          const map = window.L.map(mapDiv).setView([lat, lng], 16);
          window.L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; OpenStreetMap'
          }).addTo(map);
          window.L.marker([lat, lng]).addTo(map)
           .bindPopup(`<b>${customer.firstName} ${customer.lastName}</b><br>${customer.address || ''}`).openPopup();
        }
      }, 100);
    }

    // Init photo carousel if present
    setTimeout(() => {
      const carousel = document.getElementById('photo-carousel');
      const track = document.getElementById('carousel-track');
      const dotsContainer = document.getElementById('carousel-dots');
      if (!carousel || !track) return;

      const slides = track.children;
      const count = slides.length;
      if (count < 2) return;

      let current = 0;
      let autoTimer = null;

      function goTo(idx) {
        current = ((idx % count) + count) % count;
        track.style.transform = `translateX(-${current * 100}%)`;
        renderDots();
      }

      function renderDots() {
        if (!dotsContainer) return;
        dotsContainer.innerHTML = Array.from({ length: count }, (_, i) =>
          `<span data-dot="${i}" style="width:${i === current ? '18px' : '7px'};height:7px;border-radius:4px;background:${i === current ? 'var(--accent-blue)' : 'var(--text-muted)'}; opacity:${i === current ? '1' : '0.4'}; cursor:pointer; transition:all 0.3s;"></span>`
        ).join('');
        dotsContainer.querySelectorAll('[data-dot]').forEach(d => {
          d.addEventListener('click', () => goTo(parseInt(d.dataset.dot)));
        });
      }

      function startAuto() {
        stopAuto();
        autoTimer = setInterval(() => goTo(current + 1), 4000);
      }
      function stopAuto() {
        if (autoTimer) clearInterval(autoTimer);
      }

      document.getElementById('carousel-prev')?.addEventListener('click', () => { goTo(current - 1); startAuto(); });
      document.getElementById('carousel-next')?.addEventListener('click', () => { goTo(current + 1); startAuto(); });
      carousel.addEventListener('mouseenter', stopAuto);
      carousel.addEventListener('mouseleave', startAuto);

      renderDots();
      startAuto();
    }, 200);

    // Payment History Pagination Logic
    let currentPaymentPage = 1;
    const paymentsPerPage = 5;

    window.renderPaymentHistoryPage = function(page) {
      if (billingHistory.length === 0) {
        document.getElementById('payment-history-tbody').innerHTML = `
          <tr><td colspan="5">
            <div class="empty-state" style="padding:20px 10px; text-align:center;">
              <div class="empty-icon" style="font-size:2rem; margin-bottom:8px;">📋</div>
              <div class="empty-title" style="font-size:0.9rem; color:var(--text-muted);">No payment records yet</div>
            </div>
          </td></tr>`;
        document.getElementById('payment-history-pagination').innerHTML = '';
        return;
      }

      const totalPages = Math.ceil(billingHistory.length / paymentsPerPage);
      currentPaymentPage = Math.min(Math.max(1, page), totalPages);

      const start = (currentPaymentPage - 1) * paymentsPerPage;
      const pageData = billingHistory.slice(start, start + paymentsPerPage);

      document.getElementById('payment-history-tbody').innerHTML = pageData.map(b => {
        let printMonth = '—';
        if (b.billingMonth) {
          try {
            if (b.dueDate) {
              const end = new Date(b.dueDate);
              const start = new Date(end.getFullYear(), end.getMonth() - 1, end.getDate());
              printMonth = start.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
            } else {
              const [y, m] = b.billingMonth.split('-');
              const dObj = new Date(y, parseInt(m) - 1, 1);
              printMonth = dObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            }
          } catch(e) { printMonth = b.billingMonth; }
        }

        const isPaid = (b.paymentStatus === 'paid' || b.paymentStatus === 'already_paid' || b.paidDate);

        return `
        <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
          <td style="font-weight:600; color:var(--text-primary); padding:6px 8px;">${printMonth}</td>
          <td style="padding:6px 8px;">₱${(b.amountPaid || b.amount || b.monthlyRate || 0).toLocaleString()}</td>
          <td style="padding:6px 8px;">${statusBadge(b.paymentStatus || 'unpaid')}</td>
          <td style="padding:6px 8px;">${isPaid && b.paidDate ? formatDate(b.paidDate) : '—'}</td>
          <td style="padding:6px 8px;">
             ${isPaid 
               ? `<button class="btn btn-ghost btn-sm" onclick="window.viewCustomerReceipt('${b.$id || b.id}')" style="background:rgba(255,255,255,0.05); border:1px solid var(--border-color); color:var(--text-primary); border-radius:6px; display:flex; align-items:center; justify-content:center; gap:6px; padding:4px 8px; font-size:0.75rem;"><span class="material-icons-outlined" style="font-size:14px;">receipt</span> Receipt</button>` 
               : `<span style="font-size:0.75rem; font-weight:600; color:var(--text-muted);">—</span>`
             }
          </td>
        </tr>
        `;
      }).join('');

      document.getElementById('payment-history-pagination').innerHTML = `
        <span>Showing ${start + 1}-${Math.min(start + pageData.length, billingHistory.length)} of ${billingHistory.length}</span>
        <div style="display:flex; gap:8px;">
          <button class="btn btn-ghost" style="padding:4px 8px; font-size:0.8rem;" onclick="window.renderPaymentHistoryPage(${currentPaymentPage - 1})" ${currentPaymentPage === 1 ? 'disabled' : ''}>Prev</button>
          <span style="padding:4px 8px; background:rgba(255,255,255,0.05); border-radius:4px;">${currentPaymentPage} / ${totalPages}</span>
          <button class="btn btn-ghost" style="padding:4px 8px; font-size:0.8rem;" onclick="window.renderPaymentHistoryPage(${currentPaymentPage + 1})" ${currentPaymentPage === totalPages ? 'disabled' : ''}>Next</button>
        </div>
      `;
    };

    const triggerReceiptModal = (billingObj) => {
      const modal = document.createElement('div');
      modal.className = 'modal-overlay';
      modal.style.zIndex = '9999';
      modal.innerHTML = `
        <div class="modal" style="max-width: 400px; background: transparent; box-shadow: none;">
          <div class="receipt-capture-area" style="background: var(--bg-panel); border-radius: 12px; padding: 24px; margin-bottom: 16px; border: 1px solid var(--border-color-hover);">
             ${getReceiptPreviewHtml(billingObj)}
          </div>
          <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
            <button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()" style="background: var(--bg-panel); color: var(--text-primary); border-radius: 20px; border: 1px solid var(--border-color-hover);">Close</button>
            <button class="btn btn-ghost receipt-share-btn" style="border-radius: 20px; background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.2); color: var(--accent-blue);">
              <span class="material-icons-outlined" style="font-size: 18px; margin-right: 4px; vertical-align: middle;">open_in_new</span> Share
            </button>
            <button class="btn btn-primary receipt-print-btn" style="border-radius: 20px; background: var(--accent-emerald); border-color: var(--accent-emerald);">
              <span class="material-icons-outlined" style="font-size: 18px;">print</span> Print
            </button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      void modal.offsetWidth;
      modal.classList.add('active');
      modal.querySelector('.receipt-print-btn').addEventListener('click', () => printBillings([billingObj]));
      const shareBtn = modal.querySelector('.receipt-share-btn');
      shareBtn.addEventListener('click', async () => {
         const fbUrl = customer.facebookUrl || '';
         const captureArea = modal.querySelector('.receipt-capture-area');
         
         const originalText = shareBtn.innerHTML;
         shareBtn.innerHTML = '<span class="material-icons-outlined" style="font-size: 18px; margin-right: 4px; vertical-align: middle;">hourglass_empty</span> Copying...';
         shareBtn.style.opacity = '0.7';
         shareBtn.disabled = true;

         try {
           const canvas = await html2canvas(captureArea, {
             backgroundColor: '#1E2330', // match the panel background
             scale: 2 // better resolution
           });
           
           canvas.toBlob(async (blob) => {
             try {
               await navigator.clipboard.write([
                 new ClipboardItem({ 'image/png': blob })
               ]);
               showToast('Receipt copied! Paste it in the chat.', 'success');
               
               // Wait a brief moment so they see the toast
               setTimeout(() => {
                 let url = fbUrl || 'https://www.messenger.com/';
                 if (url.includes('facebook.com')) {
                   const messengerUrl = url.replace('www.facebook.com', 'm.me').replace('facebook.com', 'm.me');
                   url = messengerUrl;
                 }
                 window.open(url, '_blank');
               }, 800);
             } catch(err) {
               console.error('Clipboard error:', err);
               showToast('Failed to copy receipt to clipboard.', 'error');
             } finally {
               shareBtn.innerHTML = originalText;
               shareBtn.style.opacity = '1';
               shareBtn.disabled = false;
             }
           }, 'image/png');
         } catch (err) {
           console.error('Canvas capture error:', err);
           showToast('Failed to generate receipt image.', 'error');
           shareBtn.innerHTML = originalText;
           shareBtn.style.opacity = '1';
           shareBtn.disabled = false;
         }
      });
    };

    window.spawnFullReceipt = function(billId) {
      const b = billingHistory.find(x => (x.$id || x.id) === billId);
      if (b) triggerReceiptModal(b);
    };

    window.spawnPartialReceipt = function(billId, idx) {
      const b = billingHistory.find(x => (x.$id || x.id) === billId);
      if (!b) return;
      let payments = [];
      try { payments = JSON.parse(b.notes || '[]'); } catch(e) { payments = []; }
      const p = payments[idx];
      if (!p) return;
      
      const paymentB = {
        ...b,
        amountPaid: p.amount,
        paidDate: p.date,
        collectedBy: p.collector || 'Admin',
        paymentStatus: 'already_paid'
      };
      triggerReceiptModal(paymentB);
    };

    window.viewCustomerReceipt = function(billId) {
      const b = billingHistory.find(x => (x.$id || x.id) === billId);
      if (!b) return;
      
      const planRate = b.amount || 0;
      let payments = [];
      try { payments = JSON.parse(b.notes || '[]'); } catch(e) { payments = []; }
      if (!Array.isArray(payments)) payments = [];
      
      const totalPaid = payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
      const remainingBalance = Math.max(0, planRate - totalPaid);
      
      const printMonth = (() => {
        if (!b.billingMonth) return '—';
        try {
          const [y, m] = b.billingMonth.split('-');
          const dObj = new Date(y, parseInt(m) - 1, 1);
          return dObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        } catch(e) { return b.billingMonth; }
      })();

      const modal = document.createElement('div');
      modal.className = 'modal-overlay';
      modal.style.zIndex = '9999';
      modal.innerHTML = `
        <div class="modal" style="max-width:440px; max-height: 80vh; display: flex; flex-direction: column; border-radius: 16px;">
          <div class="modal-header" style="flex-shrink: 0; padding: 16px 20px; border-bottom: 1px solid var(--border-color);">
            <div>
              <h3 style="margin:0;">Billing Details</h3>
              <div style="font-size:0.8rem; color:var(--text-muted); margin-top:4px;">${printMonth} &bull; ${formatCurrency(planRate)}</div>
            </div>
            <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
          </div>
          <div style="overflow-y: auto; flex: 1; padding: 20px;">
            ${payments.length > 0 ? `
              <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; text-align: center;">Payment History</div>
              ${payments.map((p, i) => `
                <div style="border: 1px solid var(--border-color-hover); border-radius: 12px; padding: 14px 16px; background: var(--bg-surface-hover, rgba(255,255,255,0.03)); margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between;">
                  <div>
                    <div style="font-weight: 700; color: var(--accent-emerald); font-size: 1.1rem;">${formatCurrency(p.amount)}</div>
                    <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">${p.date ? new Date(p.date).toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric', hour:'numeric', minute:'2-digit'}) : '—'} • ${p.collector || 'Admin'}</div>
                  </div>
                  <div style="display: flex; gap: 6px;">
                    <button class="btn btn-ghost btn-sm" onclick="window.spawnPartialReceipt('${billId}', ${i})" style="border: 1px solid var(--border-color-hover); border-radius: 8px; color: var(--text-primary); font-size: 0.75rem; padding: 4px 10px;">
                      <span class="material-icons-outlined" style="font-size: 14px; vertical-align: middle;">receipt_long</span> Receipt
                    </button>
                  </div>
                </div>
              `).join('')}
              ${remainingBalance > 0 ? `<div style="text-align: center; font-size: 0.8rem; color: var(--accent-rose); margin-top: 12px;">Remaining Balance: ${formatCurrency(remainingBalance)}</div>` : ''}
            ` : `
               <div style="margin-top: 10px; border: 1px solid var(--border-color-hover); border-radius: 16px; padding: 20px; background: var(--bg-surface-hover, rgba(255,255,255,0.03)); text-align: center;">
                 <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">Amount Paid</div>
                 <div style="font-size: 1.5rem; font-weight: 700; color: var(--accent-emerald);">${formatCurrency(b.amountPaid || 0)}</div>
                 ${remainingBalance > 0 && b.paymentStatus !== 'already_paid' ? `<div style="font-size: 0.8rem; color: var(--accent-rose); margin-top: 6px;">Balance: ${formatCurrency(remainingBalance)}</div>` : ''}
               </div>
            `}
          </div>
          <div class="modal-footer" style="flex-shrink: 0; border-top: 1px solid var(--border-color); padding: 12px 20px; justify-content: space-between;">
            <button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()" style="color:var(--text-muted);">Close</button>
            <button class="btn btn-ghost" onclick="window.spawnFullReceipt('${billId}')" style="border: 1px solid var(--border-color-hover); color:var(--text-primary); border-radius: 10px;"><span class="material-icons-outlined" style="font-size:16px; vertical-align: middle; margin-right: 4px;">receipt_long</span> Full Receipt</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      void modal.offsetWidth;
      modal.classList.add('active');
    };

    setTimeout(() => {
      if (document.getElementById('payment-history-tbody')) {
        window.renderPaymentHistoryPage(1);
      }
    }, 100);

    // Event listeners


    document.getElementById('detail-edit-btn').addEventListener('click', () => {
      // Transform info cards into editable forms inline
      const infoGrid = document.querySelector('.detail-info-grid');
      infoGrid.innerHTML = `
        <!-- Left Column -->
        <div style="display:flex; flex-direction:column; gap:16px;">
          <!-- Personal Info Card (Edit Mode) -->
          <div class="card glass-card" style="margin:0; padding:16px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; border-bottom:1px solid var(--border-color); padding-bottom:8px;">
              <span class="card-title" style="margin:0; font-size:0.95rem; font-weight:600;"><span class="material-icons-outlined" style="font-size:16px; vertical-align:-3px; margin-right:6px; color:var(--text-muted);">edit</span>Edit Personal Information</span>
            </div>
            <div style="display:grid; grid-template-columns: 1fr 1fr; row-gap:12px; column-gap:16px; align-items:center;">
              <div style="display:flex; flex-direction:column; gap:4px; grid-column:1/-1;">
                <span style="font-size:0.75rem; color:var(--text-muted);">Customer ID</span>
                <span style="font-size:0.9rem; font-weight:600; color:var(--text-primary); font-family:monospace;">${customer.userId || '—'}</span>
              </div>
              <div style="display:flex; flex-direction:column; gap:4px;">
                <span style="font-size:0.75rem; color:var(--text-muted);">First Name</span>
                <input type="text" class="form-input" id="edit-firstName" value="${customer.firstName || ''}" style="height:32px; padding:0 8px; font-size:0.8rem; background:rgba(0,0,0,0.2) !important;">
              </div>
              <div style="display:flex; flex-direction:column; gap:4px;">
                <span style="font-size:0.75rem; color:var(--text-muted);">Middle Name</span>
                <input type="text" class="form-input" id="edit-middleName" value="${customer.middleName || ''}" style="height:32px; padding:0 8px; font-size:0.8rem; background:rgba(0,0,0,0.2) !important;">
              </div>
              <div style="display:flex; flex-direction:column; gap:4px;">
                <span style="font-size:0.75rem; color:var(--text-muted);">Last Name</span>
                <input type="text" class="form-input" id="edit-lastName" value="${customer.lastName || ''}" style="height:32px; padding:0 8px; font-size:0.8rem; background:rgba(0,0,0,0.2) !important;">
              </div>
              <div style="display:flex; flex-direction:column; gap:4px;">
                <span style="font-size:0.75rem; color:var(--text-muted);">Phone</span>
                <input type="tel" class="form-input" id="edit-phone" value="${customer.phone || ''}" style="height:32px; padding:0 8px; font-size:0.8rem; background:rgba(0,0,0,0.2) !important;">
              </div>
              <div style="display:flex; flex-direction:column; gap:4px; grid-column:1/-1;">
                <span style="font-size:0.75rem; color:var(--text-muted);">WiFi Plan</span>
                <select class="form-select" id="edit-plan" style="height:32px; padding:0 8px; font-size:0.8rem; background:rgba(0,0,0,0.2) !important;">
                  ${allPlans.map(p => `<option value="${p.$id || p.id}" ${customer.planId === (p.$id || p.id) ? 'selected' : ''}>${p.name} — ₱${(p.monthlyRate || 0).toLocaleString()}/mo</option>`).join('')}
                </select>
              </div>
            </div>
          </div>

          <!-- Address Card (Edit Mode) -->
          <div class="card glass-card" style="margin:0; padding:16px; flex-grow:1;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; border-bottom:1px solid var(--border-color); padding-bottom:8px;">
              <span class="card-title" style="margin:0; font-size:0.95rem; font-weight:600;"><span class="material-icons-outlined" style="font-size:16px; vertical-align:-3px; margin-right:6px; color:var(--text-muted);">edit_location</span>Edit Address</span>
            </div>
            <div style="display:grid; grid-template-columns: 1fr 1fr; row-gap:12px; column-gap:16px;">
              <div style="display:flex; flex-direction:column; gap:4px; grid-column:1/-1;">
                <span style="font-size:0.75rem; color:var(--text-muted);">Street</span>
                <input type="text" class="form-input" id="edit-address" value="${customer.address || ''}" style="height:32px; padding:0 8px; font-size:0.8rem; background:rgba(0,0,0,0.2) !important;">
              </div>
              <div style="display:flex; flex-direction:column; gap:4px;">
                <span style="font-size:0.75rem; color:var(--text-muted);">Barangay</span>
                <input type="text" class="form-input" id="edit-barangay" value="${customer.barangay || ''}" style="height:32px; padding:0 8px; font-size:0.8rem; background:rgba(0,0,0,0.2) !important;">
              </div>
              <div style="display:flex; flex-direction:column; gap:4px;">
                <span style="font-size:0.75rem; color:var(--text-muted);">City / Municipality</span>
                <input type="text" class="form-input" id="edit-city" value="${customer.city || ''}" style="height:32px; padding:0 8px; font-size:0.8rem; background:rgba(0,0,0,0.2) !important;">
              </div>
              <div style="display:flex; flex-direction:column; gap:4px; grid-column:1/-1;">
                <span style="font-size:0.75rem; color:var(--text-muted);">Province</span>
                <input type="text" class="form-input" id="edit-province" value="${customer.province || ''}" style="height:32px; padding:0 8px; font-size:0.8rem; background:rgba(0,0,0,0.2) !important;">
              </div>
            </div>
            
            <!-- Map & Photo Edit Section -->
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:16px; margin-top:16px; padding-top:16px; border-top:1px solid var(--border-color);">
              <div style="display:flex; flex-direction:column; gap:4px;">
                <span style="font-size:0.75rem; color:var(--text-muted);">Location Photos (<span style="color:var(--text-primary); cursor:pointer;" onclick="document.getElementById('edit-imageFile').click()">+ Add</span>)</span>
                <div id="edit-photos-grid" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(60px, 1fr)); gap:6px; min-height:60px;"></div>
                <input type="file" id="edit-imageFile" accept="image/*" multiple style="display:none;">
                <input type="hidden" id="edit-profileImage" value="${(customer.profileImage || '').replace(/"/g, '&quot;')}">
              </div>
              <div style="display:flex; flex-direction:column; gap:4px;">
                <span style="font-size:0.75rem; color:var(--text-muted);">Pin Location <span style="font-size:0.65rem;">(Click map to update)</span></span>
                <div id="edit-map-container" style="width:100%; height:120px; border-radius:6px; border:1px solid var(--border-color); z-index:1;"></div>
                <div style="display:flex; gap:8px; margin-top:4px;">
                  <input type="number" step="any" readonly class="form-input" id="edit-latitude" value="${customer.latitude || ''}" placeholder="Lat" style="height:24px; font-size:0.7rem; background:rgba(0,0,0,0.1) !important;">
                  <input type="number" step="any" readonly class="form-input" id="edit-longitude" value="${customer.longitude || ''}" placeholder="Lng" style="height:24px; font-size:0.7rem; background:rgba(0,0,0,0.1) !important;">
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Column -->
        <div style="display:flex; flex-direction:column; gap:16px;">
          <!-- Credentials Card (Edit Mode) -->
          <div class="card glass-card" style="margin:0; padding:16px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; border-bottom:1px solid var(--border-color); padding-bottom:8px;">
              <span class="card-title" style="margin:0; font-size:0.95rem; font-weight:600;"><span class="material-icons-outlined" style="font-size:16px; vertical-align:-3px; margin-right:6px; color:var(--text-muted);">edit</span>Edit Credentials & Billing</span>
            </div>
            <div style="display:grid; grid-template-columns: 1fr 1fr; row-gap:12px; column-gap:16px;">
              <div style="display:flex; flex-direction:column; gap:4px; grid-column:1/-1;">
                <span style="font-size:0.75rem; color:var(--text-muted);">Facebook URL</span>
                <input type="url" class="form-input" id="edit-facebook" value="${customer.facebookUrl || ''}" style="height:32px; padding:0 8px; font-size:0.8rem; background:rgba(0,0,0,0.2) !important;">
              </div>
              <div style="display:flex; flex-direction:column; gap:4px;">
                <span style="font-size:0.75rem; color:var(--text-muted);">PPPoE Account</span>
                <input type="text" class="form-input" id="edit-pppoeAccount" value="${customer.pppoeUser || ''}" style="height:32px; padding:0 8px; font-size:0.8rem; background:rgba(0,0,0,0.2) !important;">
              </div>
              <div style="display:flex; flex-direction:column; gap:4px;">
                <span style="font-size:0.75rem; color:var(--text-muted);">PPPoE Password</span>
                <input type="text" class="form-input" id="edit-pppoePassword" value="${customer.pppoePassword || ''}" style="height:32px; padding:0 8px; font-size:0.8rem; background:rgba(0,0,0,0.2) !important;">
              </div>
              <div style="display:flex; flex-direction:column; gap:4px;">
                <span style="font-size:0.75rem; color:var(--text-muted);">WiFi Name</span>
                <input type="text" class="form-input" id="edit-wifiName" value="${customer.wifiName || ''}" style="height:32px; padding:0 8px; font-size:0.8rem; background:rgba(0,0,0,0.2) !important;">
              </div>
              <div style="display:flex; flex-direction:column; gap:4px;">
                <span style="font-size:0.75rem; color:var(--text-muted);">WiFi Password</span>
                <input type="text" class="form-input" id="edit-wifiPassword" value="${customer.wifiPassword || ''}" style="height:32px; padding:0 8px; font-size:0.8rem; background:rgba(0,0,0,0.2) !important;">
              </div>
              <div style="display:flex; flex-direction:column; gap:4px; grid-column:1/-1;">
                <span style="font-size:0.75rem; color:var(--text-muted);">Billing Date</span>
                <input type="date" class="form-input" id="edit-billingDate" value="${customer.billingStartDate || ''}" style="height:32px; padding:0 8px; font-size:0.8rem; background:rgba(0,0,0,0.2) !important;">
              </div>
            </div>
          </div>

          <!-- Facility Card (Edit Mode) -->
          <div class="card glass-card" style="margin:0; padding:16px; flex-grow:1;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; border-bottom:1px solid var(--border-color); padding-bottom:8px;">
              <span class="card-title" style="margin:0; font-size:0.95rem; font-weight:600;"><span class="material-icons-outlined" style="font-size:16px; vertical-align:-3px; margin-right:6px; color:var(--text-muted);">edit</span>Edit Facility</span>
            </div>
            <div style="display:grid; grid-template-columns: 1fr 1fr; row-gap:12px; column-gap:16px;">
              <div style="display:flex; flex-direction:column; gap:4px;">
                <span style="font-size:0.75rem; color:var(--text-muted);">Napbox</span>
                <select class="form-select" id="edit-napbox" style="height:32px; padding:0 8px; font-size:0.8rem; background:rgba(0,0,0,0.2) !important;">
                  <option value="" ${!customer.napbox ? 'selected' : ''}>— None —</option>
                  <option value="NB-01" ${customer.napbox === 'NB-01' ? 'selected' : ''}>NB-01</option>
                  <option value="NB-02" ${customer.napbox === 'NB-02' ? 'selected' : ''}>NB-02</option>
                  <option value="NB-03" ${customer.napbox === 'NB-03' ? 'selected' : ''}>NB-03</option>
                  <option value="NB-04" ${customer.napbox === 'NB-04' ? 'selected' : ''}>NB-04</option>
                  <option value="NB-05" ${customer.napbox === 'NB-05' ? 'selected' : ''}>NB-05</option>
                  <option value="NB-06" ${customer.napbox === 'NB-06' ? 'selected' : ''}>NB-06</option>
                  <option value="NB-07" ${customer.napbox === 'NB-07' ? 'selected' : ''}>NB-07</option>
                  <option value="NB-08" ${customer.napbox === 'NB-08' ? 'selected' : ''}>NB-08</option>
                  <option value="NB-09" ${customer.napbox === 'NB-09' ? 'selected' : ''}>NB-09</option>
                  <option value="NB-10" ${customer.napbox === 'NB-10' ? 'selected' : ''}>NB-10</option>
                </select>
              </div>
              <div style="display:flex; flex-direction:column; gap:4px;">
                <span style="font-size:0.75rem; color:var(--text-muted);">Port</span>
                <input type="text" class="form-input" id="edit-wifiPort" value="${customer.wifiPort || ''}" placeholder="e.g. Port 3" style="height:32px; padding:0 8px; font-size:0.8rem; background:rgba(0,0,0,0.2) !important;">
              </div>
            </div>
          </div>
        </div>
      `;

      // Swap Edit/Delete buttons → Save/Discard
      const actionsDiv = document.querySelector('.detail-header-actions');
      if (actionsDiv) {
        actionsDiv.innerHTML = `
          <button class="btn" id="cancel-edit-btn" style="min-width: 80px; padding: 6px 12px; justify-content: center; font-size: 0.8rem; background:rgba(239,68,68,0.1); color:#ef4444; border:1px solid rgba(239,68,68,0.2);">
            <span class="material-icons-outlined" style="font-size:16px;">close</span> Discard changes
          </button>
          <button class="btn btn-primary" id="save-edit-btn" style="min-width: 80px; padding: 6px 12px; justify-content: center; font-size: 0.8rem;">
            <span class="material-icons-outlined" style="font-size:16px;">save</span> Save Changes
          </button>
        `;
      }

      // Init Map for Edit Mode
      setTimeout(() => {
        if (window.L) {
          const container = document.getElementById('edit-map-container');
          if (container) {
            let lat = parseFloat(customer.latitude) || 14.5995;
            let lng = parseFloat(customer.longitude) || 120.9842;
            const map = window.L.map(container).setView([lat, lng], 16);
            window.L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
              attribution: '&copy; OpenStreetMap'
            }).addTo(map);

            let marker;
            if (customer.latitude && customer.longitude) {
              marker = window.L.marker([lat, lng]).addTo(map);
            }

            map.on('click', (e) => {
              lat = e.latlng.lat;
              lng = e.latlng.lng;
              if (marker) {
                marker.setLatLng([lat, lng]);
              } else {
                marker = window.L.marker([lat, lng]).addTo(map);
              }
              document.getElementById('edit-latitude').value = lat.toFixed(6);
              document.getElementById('edit-longitude').value = lng.toFixed(6);
            });
            setTimeout(() => map.invalidateSize(), 300);
          }
        }

        // Init Photos
        let photoUrls = [];
        try {
          if (customer.profileImage && customer.profileImage.startsWith('[')) {
             photoUrls = JSON.parse(customer.profileImage);
          } else if (customer.profileImage) {
             photoUrls = [customer.profileImage];
          }
        } catch(e) {}
        
        photoUrls = photoUrls.filter(u=>u).map(url => {
          if (url.startsWith('http')) return url;
          return `${ENDPOINT}/storage/buckets/customer_images/files/${url}/view?project=${PROJECT_ID}`;
        });

        const grid = document.getElementById('edit-photos-grid');
        const input = document.getElementById('edit-profileImage');
        const fileInput = document.getElementById('edit-imageFile');

        function renderPhotos() {
          if(!grid) return;
          grid.innerHTML = photoUrls.map((url, i) => `
            <div style="position:relative;border-radius:8px;overflow:hidden;border:1px solid rgba(255,255,255,0.1);aspect-ratio:1;">
              <img src="${url}" style="width:100%;height:100%;object-fit:cover;display:block;" />
              <button data-idx="${i}" class="del-photo-btn" style="position:absolute;top:2px;right:2px;width:18px;height:18px;border-radius:50%;background:rgba(0,0,0,0.7);border:1px solid rgba(255,255,255,0.2);color:white;font-size:10px;cursor:pointer;display:flex;align-items:center;justify-content:center;line-height:1;transition:background 0.2s;" onmouseover="this.style.background='var(--accent-rose)'" onmouseout="this.style.background='rgba(0,0,0,0.7)'">\u2715</button>
            </div>
          `).join('');
          
          grid.querySelectorAll('.del-photo-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
              e.preventDefault();
              photoUrls.splice(parseInt(btn.dataset.idx), 1);
              updateInput();
              renderPhotos();
            });
          });
        }
        
        function updateInput() {
          if(photoUrls.length === 0) input.value = '';
          else if(photoUrls.length === 1) input.value = photoUrls[0];
          else {
            const ids = photoUrls.map(url => {
              const match = url.match(/\/files\/([^\/]+)\/view/);
              return match ? match[1] : url;
            });
            input.value = JSON.stringify(ids);
          }
        }

        renderPhotos();

        if (fileInput) {
          fileInput.addEventListener('change', async (e) => {
            const files = Array.from(e.target.files);
            if(files.length === 0) return;
            for (const file of files) {
              const dataUrl = await new Promise(res => { const r = new FileReader(); r.onload=ev=>res(ev.target.result); r.readAsDataURL(file); });
              const idx = photoUrls.length;
              photoUrls.push(dataUrl);
              renderPhotos();

              try {
                const formData = new FormData();
                formData.append('fileId', 'unique()');
                formData.append('file', file);
                formData.append('permissions[]', 'read("any")');
                const res = await fetch(`${ENDPOINT}/storage/buckets/customer_images/files`, {
                  method: 'POST',
                  headers: { 'X-Appwrite-Project': PROJECT_ID, 'X-Appwrite-Key': API_KEY },
                  body: formData
                });
                if(res.ok) {
                   const uData = await res.json();
                   photoUrls[idx] = `${ENDPOINT}/storage/buckets/customer_images/files/${uData.$id}/view?project=${PROJECT_ID}`;
                } else { photoUrls.splice(idx, 1); }
              } catch(err) { photoUrls.splice(idx, 1); }
              updateInput();
              renderPhotos();
            }
          });
        }
      }, 100);

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
          wifiPort: document.getElementById('edit-wifiPort').value.trim(),
          napbox: document.getElementById('edit-napbox').value,
          facebookUrl: document.getElementById('edit-facebook').value.trim(),
          pppoeUser: document.getElementById('edit-pppoeAccount').value.trim(),
          pppoePassword: document.getElementById('edit-pppoePassword').value.trim(),
          wifiName: document.getElementById('edit-wifiName').value.trim(),
          wifiPassword: document.getElementById('edit-wifiPassword').value.trim(),
          billingStartDate: document.getElementById('edit-billingDate').value.trim(),
          latitude: parseFloat(document.getElementById('edit-latitude').value) || 0,
          longitude: parseFloat(document.getElementById('edit-longitude').value) || 0,
          profileImage: document.getElementById('edit-profileImage').value || '',
        };

        try {
          await services.customer.update(id, updatedData);
          
          // Update subscription plan (no collector assignment)
          if (customerSub) {
            await services.subscription.update(customerSub.$id, {
              planId: updatedData.planId,
            });
          } else {
            await services.subscription.create({
              customerId: customer.userId,
              planId: updatedData.planId,
              collectorId: '',
              status: 'active'
            });
          }

          showToast('Customer updated successfully!', 'success');
        } catch (e) {
          Object.assign(customer, updatedData);
          showToast('Customer updated (demo)', 'success');
        }
      });
    });

    document.getElementById('detail-report-issue-btn').addEventListener('click', () => {
      const modal = document.createElement('div');
      modal.className = 'modal-overlay';
      modal.style.zIndex = '500';
      modal.innerHTML = `
        <div class="modal" style="max-width:400px; border-radius:16px;">
          <div class="modal-header">
            <h3>Report Issue</h3>
            <button class="modal-close" id="close-issue-modal">✕</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Issue Description *</label>
              <textarea class="form-textarea" id="issue-description" placeholder="Describe the customer's problem..." required style="min-height: 80px;"></textarea>
            </div>
            <div class="form-group">
              <label class="form-label">Priority *</label>
              <select class="form-select" id="issue-priority">
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" id="cancel-issue-modal">Cancel</button>
            <button class="btn btn-primary" id="submit-issue-btn" style="background:var(--accent-amber); border-color:var(--accent-amber);">Create Ticket</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      void modal.offsetWidth;
      modal.classList.add('active');

      const closeIssueModal = () => {
        modal.classList.remove('active');
        setTimeout(() => modal.remove(), 400);
      };

      modal.querySelector('#close-issue-modal').addEventListener('click', closeIssueModal);
      modal.querySelector('#cancel-issue-modal').addEventListener('click', closeIssueModal);
      
      modal.querySelector('#submit-issue-btn').addEventListener('click', async () => {
        const desc = modal.querySelector('#issue-description').value.trim();
        const prio = modal.querySelector('#issue-priority').value;

        if (!desc) {
          showToast('Description is required', 'warning');
          return;
        }

        modal.querySelector('#submit-issue-btn').disabled = true;
        modal.querySelector('#submit-issue-btn').textContent = 'Creating...';

        try {
          await services.ticket.createTicket({
            customerId: customer.userId || id,
            customerName: `${customer.firstName || ''} ${customer.lastName || ''}`.trim(),
            issueDescription: desc,
            priority: prio,
            status: 'pending',
            technicianId: '',
            technicianName: '',
            imageUrls: '[]'
          });
          showToast('Repair ticket created', 'success');
          closeIssueModal();
        } catch (err) {
          showToast('Failed to create ticket', 'danger');
          modal.querySelector('#submit-issue-btn').disabled = false;
          modal.querySelector('#submit-issue-btn').textContent = 'Create Ticket';
        }
      });
    });

    document.getElementById('detail-delete-btn').addEventListener('click', async () => {
      const confirmed = await showConfirm(
        `Are you sure you want to delete ${customer.firstName} ${customer.lastName}? This action cannot be undone.`,
        { title: 'Delete Customer?', confirmText: 'Yes, Delete', type: 'danger' }
      );
      if (!confirmed) return;
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

