import { ticketService } from '../services/ticket.service.js';
import { CustomerService } from '../services/customer.service.js';
import { showToast } from '../components/ui-helpers.js';

let tickets = [];
let techniciansList = []; // For reassignment
let statusFilter = '';
let currentImageIndex = 0;
let currentImageUrls = [];
let currentPage = 1;
const LIMIT = 10;

// Bulk Selection State
let isSelectionMode = false;
let selectedTickets = new Set();

export function renderTicketsPage() {
  return `
    <div class="card" style="margin-bottom: 24px;">
      
      <!-- Selection Action Bar -->
      <div id="selection-action-bar" style="display:none; align-items:center; justify-content:space-between; background:var(--bg-secondary); border:1px solid var(--accent-blue); padding:12px 16px; border-radius:12px; margin-bottom:16px;">
        <div style="font-weight:600; color:var(--accent-blue); display:flex; align-items:center; gap:8px;">
          <span class="material-icons-outlined">check_circle</span> 
          <span id="selection-count">1</span> tickets selected
        </div>
        <div style="display:flex; gap:12px;">
           <button class="btn btn-ghost" id="cancel-selection-btn">Cancel</button>
           <button class="btn btn-primary" id="delete-selected-btn" style="background:var(--accent-rose); border-color:var(--accent-rose);">
             <span class="material-icons-outlined" style="font-size:16px;">delete</span> Delete Selected
           </button>
        </div>
      </div>

      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <h2 style="margin: 0; font-size: 1.2rem; color: var(--text-primary);">All Support Tickets</h2>
        <div style="display: flex; gap: 12px;">
          <select id="ticket-status-filter" class="form-select" style="min-width: 150px; background: var(--bg-input);">
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <button class="btn btn-outline" id="refresh-tickets-btn">
            <span class="material-icons-outlined">refresh</span>
          </button>
        </div>
      </div>
      
      <div id="tickets-loading" style="text-align: center; padding: 40px; color: var(--text-muted);">
        <span class="spinner" style="display:inline-block; margin-bottom:16px;"></span>
        <br>Loading tickets...
      </div>

      <div class="table-container" id="tickets-table-container" style="display: none;">
        <table class="data-table">
          <thead>
            <tr>
              <th>Ticket ID</th>
              <th>Customer</th>
              <th>Issue Description</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Attachments</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="tickets-table-body">
            <!-- Rows injected by JS -->
          </tbody>
        </table>
        
        <div id="tickets-pagination" style="display:flex; justify-content:space-between; align-items:center; padding:16px; border-top:1px solid var(--border-color); font-size:0.85rem; color:var(--text-secondary);">
          <div id="tickets-page-info">Showing 1 to 10 of 0 entries</div>
          <div style="display:flex; gap:8px;">
            <button class="btn btn-outline btn-sm" id="tickets-prev-btn" style="padding:4px 12px;">Previous</button>
            <button class="btn btn-outline btn-sm" id="tickets-next-btn" style="padding:4px 12px;">Next</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Ticket Re-assign Modal -->
    <div class="modal-overlay" id="reassign-modal">
      <div class="modal modal-md">
        <div class="modal-header">
          <h3>Manage Support Ticket</h3>
          <button class="modal-close" id="close-reassign-modal">✕</button>
        </div>
        <div class="modal-body">
          <form id="reassign-form">
            <input type="hidden" id="reassign-ticket-id">
            <div class="form-group">
              <label class="form-label">Assign Technician</label>
              <select id="reassign-technician-id" class="form-input" required>
                <!-- Options populated by JS -->
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Update Status</label>
              <select id="reassign-ticket-status" class="form-input" required>
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </form>
        </div>
        <div class="modal-footer" style="justify-content:flex-end;">
          <button type="button" class="btn btn-ghost" id="cancel-reassign-btn">Cancel</button>
          <button type="submit" form="reassign-form" class="btn btn-primary" style="background:var(--accent-amber); color:#000;">
             <span class="material-icons-outlined" style="font-size:16px;">build</span> Update Ticket
          </button>
        </div>
      </div>
    </div>

    <!-- Custom Resolve Confirmation Modal -->
    <div class="modal-overlay" id="resolve-modal">
      <div class="modal modal-sm" style="max-width: 400px; text-align: center; padding: 32px 24px;">
        <div style="width: 64px; height: 64px; border-radius: 50%; background: rgba(16, 185, 129, 0.1); color: var(--accent-emerald); display: flex; align-items: center; justify-content: center; margin: 0 auto 16px auto;">
          <span class="material-icons-outlined" style="font-size: 32px;">check_circle</span>
        </div>
        <h3 style="font-size: 1.2rem; font-weight: 700; margin-bottom: 8px; color: var(--text-primary);">Resolve Ticket</h3>
        <p style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 24px; line-height: 1.5;">Are you sure you want to mark this ticket as completely resolved? This action will close the repair request.</p>
        <input type="hidden" id="resolve-ticket-id">
        <div style="display: flex; gap: 12px; justify-content: center;">
          <button class="btn btn-ghost" id="cancel-resolve-btn" style="flex: 1;">Cancel</button>
          <button class="btn btn-primary" id="confirm-resolve-btn" style="flex: 1; background: var(--accent-emerald); border-color: var(--accent-emerald);">Yes, Resolve It</button>
        </div>
      </div>
    </div>

    <!-- Image Gallery Modal -->
    <div class="modal-overlay" id="gallery-modal" style="z-index: 10000; background: rgba(0,0,0,0.85);">
      <div class="modal" style="background: transparent; box-shadow: none; max-width: 1000px; text-align: center; color: white;">
        <div style="display: flex; justify-content: flex-end; margin-bottom: 12px;">
          <button class="modal-close" id="close-gallery-modal" style="color: white; font-size: 24px;">✕</button>
        </div>
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 16px;">
          <button class="btn btn-outline" id="gallery-prev-btn" style="color: white; border-color: rgba(255,255,255,0.3); background: rgba(255,255,255,0.1); border-radius: 50%; width: 48px; height: 48px; padding: 0;">
            <span class="material-icons-outlined">arrow_back_ios_new</span>
          </button>
          <img id="gallery-image" src="" style="max-height: 70vh; max-width: 100%; border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);" />
          <button class="btn btn-outline" id="gallery-next-btn" style="color: white; border-color: rgba(255,255,255,0.3); background: rgba(255,255,255,0.1); border-radius: 50%; width: 48px; height: 48px; padding: 0;">
            <span class="material-icons-outlined">arrow_forward_ios</span>
          </button>
        </div>
        <div id="gallery-indicator" style="margin-top: 16px; font-weight: 500;">1 / 3</div>
      </div>
    </div>
  `;
}

export async function initTicketsPage() {
  await fetchTechnicians();
  loadTickets();
  // Reload Button
  document.getElementById('refresh-tickets-btn').addEventListener('click', () => {
    currentPage = 1;
    loadTickets();
  });

  // Filter
  document.getElementById('ticket-status-filter').addEventListener('change', (e) => {
    statusFilter = e.target.value;
    currentPage = 1;
    loadTickets();
  });

  // Pagination bindings
  document.getElementById('tickets-prev-btn')?.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      loadTickets();
    }
  });

  document.getElementById('tickets-next-btn')?.addEventListener('click', () => {
    currentPage++;
    loadTickets();
  });

  // Bulk Selection Bindings
  document.getElementById('cancel-selection-btn')?.addEventListener('click', () => {
    isSelectionMode = false;
    selectedTickets.clear();
    updateSelectionUI();
    loadTickets();
  });

  document.getElementById('delete-selected-btn')?.addEventListener('click', async () => {
    if(selectedTickets.size === 0) return;
    if(confirm(`Are you sure you want to completely delete ${selectedTickets.size} selected ticket(s)? This cannot be undone.`)) {
       const btn = document.getElementById('delete-selected-btn');
       btn.disabled = true;
       btn.textContent = 'Deleting...';
       try {
         for(const id of selectedTickets) {
           await ticketService.deleteTicket(id);
         }
         showToast(`${selectedTickets.size} ticket(s) deleted`, 'success');
         isSelectionMode = false;
         selectedTickets.clear();
         updateSelectionUI();
         loadTickets();
       } catch (err) {
         showToast('Failed to delete some tickets', 'error');
       } finally {
         btn.disabled = false;
         btn.innerHTML = '<span class="material-icons-outlined" style="font-size:16px;">delete</span> Delete Selected';
       }
    }
  });

  function updateSelectionUI() {
    const bar = document.getElementById('selection-action-bar');
    const count = document.getElementById('selection-count');
    if (isSelectionMode && selectedTickets.size > 0) {
      if(bar) bar.style.display = 'flex';
      if(count) count.textContent = selectedTickets.size;
    } else {
      if(bar) bar.style.display = 'none';
      isSelectionMode = false; // Auto exit if 0
    }
  }
  
  // Expose it so loadTickets can call it
  window.__updateSelectionUI = updateSelectionUI;

  // Modalsign Modal bindings
  const reassignModal = document.getElementById('reassign-modal');
  document.getElementById('close-reassign-modal').addEventListener('click', () => {
    reassignModal.classList.remove('active');
  });
  document.getElementById('cancel-reassign-btn').addEventListener('click', () => {
    reassignModal.classList.remove('active');
  });

  document.getElementById('reassign-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.submitter;
    const oldText = btn.textContent;
    btn.textContent = 'Saving...';
    btn.disabled = true;

    try {
      const id = document.getElementById('reassign-ticket-id').value;
      const techId = document.getElementById('reassign-technician-id').value;
      const status = document.getElementById('reassign-ticket-status').value;
      
      const selectedTech = techniciansList.find(t => t.$id === techId);

      await ticketService.updateTicket(id, {
        technicianId: techId,
        technicianName: selectedTech ? `${selectedTech.firstName} ${selectedTech.lastName}` : '',
        status: status
      });

      showToast('Ticket updated successfully', 'success');
      reassignModal.classList.remove('active');
      loadTickets();
    } catch (error) {
      console.error(error);
      showToast(error.message, 'error');
    } finally {
      btn.textContent = oldText;
      btn.disabled = false;
    }
  });

  // Gallery Modal bindings
  const galleryModal = document.getElementById('gallery-modal');
  document.getElementById('close-gallery-modal').addEventListener('click', () => {
    galleryModal.classList.remove('active');
  });
  
  document.getElementById('gallery-prev-btn').addEventListener('click', () => {
    if (currentImageIndex > 0) {
      currentImageIndex--;
      updateGalleryImage();
    }
  });
  
  document.getElementById('gallery-next-btn').addEventListener('click', () => {
    if (currentImageIndex < currentImageUrls.length - 1) {
      currentImageIndex++;
      updateGalleryImage();
    }
  });
}

function updateGalleryImage() {
  const imgEL = document.getElementById('gallery-image');
  const indicator = document.getElementById('gallery-indicator');
  const prevBtn = document.getElementById('gallery-prev-btn');
  const nextBtn = document.getElementById('gallery-next-btn');

  if (currentImageUrls.length === 0) return;

  imgEL.src = currentImageUrls[currentImageIndex];
  indicator.textContent = `${currentImageIndex + 1} / ${currentImageUrls.length}`;
  
  prevBtn.style.opacity = currentImageIndex === 0 ? '0.3' : '1';
  prevBtn.style.pointerEvents = currentImageIndex === 0 ? 'none' : 'auto';
  
  nextBtn.style.opacity = currentImageIndex === currentImageUrls.length - 1 ? '0.3' : '1';
  nextBtn.style.pointerEvents = currentImageIndex === currentImageUrls.length - 1 ? 'none' : 'auto';
}

async function fetchTechnicians() {
  try {
    const custServ = new CustomerService(); // Assuming it uses getProfiles with limits
    // In a real app we'd filter by role. We will fetch all users for now and filter manually if possible
    // Wait, the new admin panel has a fetch users by role? Yes. 
    // Usually Collectors or Technicians. 
    // Let's use apiBypass or generic service if needed.
    // Actually, we can just use appwrite bypass or auth fetching. Let's fetch all users from profile.
    const { databases, COLLECTIONS, Query } = await import('../config/appwrite.js');
    const res = await databases.listDocuments(
      import.meta.env.VITE_APPWRITE_DATABASE_ID,
      COLLECTIONS.USERS_PROFILE,
      [Query.equal('role', 'technician'), Query.limit(100)]
    );
    techniciansList = res.documents || [];
  } catch (error) {
    console.warn("Could not fetch technicians list, maybe no permissions", error);
  }
}

async function loadTickets() {
  const tableContainer = document.getElementById('tickets-table-container');
  const loading = document.getElementById('tickets-loading');
  const tbody = document.getElementById('tickets-table-body');

  tableContainer.style.display = 'none';
  loading.style.display = 'block';

  try {
    const offset = (currentPage - 1) * LIMIT;
    const response = await ticketService.getTickets(statusFilter, LIMIT, offset);
    
    // Fallback if the service returns an array directly instead of an object
    const totalCount = response && response.total ? response.total : (response && response.length ? response.length : 0);
    const docs = response && response.documents ? response.documents : (Array.isArray(response) ? response : []);

    tickets = docs.filter(t => t.customerName?.toLowerCase() !== 'test');

    if (tickets.length === 0) {
      loading.innerHTML = '<div style="color:var(--text-muted);"><span class="material-icons-outlined" style="font-size:2rem;display:block;margin-bottom:8px;">receipt_long</span>No tickets found.</div>';
      return;
    }

    // Pagination metrics
    const infoEl = document.getElementById('tickets-page-info');
    const startIdx = offset + 1;
    const endIdx = Math.min(offset + LIMIT, totalCount);
    if (infoEl) infoEl.textContent = `Showing ${startIdx} to ${endIdx} of ${totalCount} entries`;

    const prevBtn = document.getElementById('tickets-prev-btn');
    const nextBtn = document.getElementById('tickets-next-btn');
    if (prevBtn) prevBtn.disabled = currentPage === 1;
    if (nextBtn) nextBtn.disabled = endIdx >= totalCount;

    // Persist visual states
    window.__updateSelectionUI();

    tbody.innerHTML = '';
    tickets.forEach(ticket => {
      const created = new Date(ticket.$createdAt).toLocaleDateString();
      
      let badgeClass = 'badge-blue';
      const status = ticket.status.toLowerCase();
      if (status === 'resolved') badgeClass = 'badge-emerald';
      else if (status === 'pending') badgeClass = 'badge-amber';
      else if (status === 'cancelled') badgeClass = 'badge-cyan';
      else if (status === 'in_progress') badgeClass = 'badge-purple';

      let priorityColor = 'var(--text-muted)';
      const prio = ticket.priority.toLowerCase();
      if (prio === 'high') priorityColor = 'var(--accent-rose)';
      else if (prio === 'medium') priorityColor = 'var(--accent-amber)';
      else if (prio === 'low') priorityColor = 'var(--accent-emerald)';

      // Parse image URLs safely
      let parsedImages = [];
      if (ticket.imageUrls) {
        if (typeof ticket.imageUrls === 'string') {
          try {
             parsedImages = JSON.parse(ticket.imageUrls);
          } catch(e) {
             parsedImages = [];
          }
        } else if (Array.isArray(ticket.imageUrls)) {
          parsedImages = ticket.imageUrls;
        }
      }
      
      const attachmentHtml = parsedImages.length > 0 
        ? `<div class="view-attachments-btn" data-images='${JSON.stringify(parsedImages)}' style="display:flex; align-items:center; gap:4px; color:var(--accent-blue); cursor:pointer; font-weight:500;">
             <span class="material-icons-outlined" style="font-size:16px;">photo_library</span> ${parsedImages.length}
           </div>`
        : '<span style="color:var(--text-muted); font-size:0.85rem;">None</span>';

      const tr = document.createElement('tr');
      const isSelected = selectedTickets.has(ticket.$id);
      tr.className = 'ticket-row' + (isSelected ? ' selected-row' : '');
      tr.style.cursor = 'pointer';
      tr.style.transition = 'background 0.2s';
      if (isSelected) tr.style.background = 'rgba(74, 144, 255, 0.08)';

      tr.innerHTML = `
        <td style="font-family: monospace; font-size: 0.85rem;">
          ${isSelectionMode 
             ? `<input type="checkbox" style="margin-right:8px; pointer-events:none;" ${isSelected ? 'checked' : ''}>` 
             : ''}
          ${ticket.$id.substring(0, 6)}
        </td>
        <td>
           <a href="#customers" class="customer-link" data-id="${ticket.customerId}" style="color: var(--accent-blue); text-decoration: none; font-weight:500;">
             ${ticket.customerName || 'Unknown Customer'}
           </a>
        </td>
        <td>
           <div style="max-width:200px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${ticket.issueDescription}">
             ${ticket.issueDescription || 'No description'}
           </div>
        </td>
        <td style="color:${priorityColor}; font-weight:600; text-transform:capitalize;">${ticket.priority}</td>
        <td><span class="badge ${badgeClass}">${status.replace('_', ' ').toUpperCase()}</span></td>
        <td>${attachmentHtml}</td>
        <td style="font-size:0.85rem; color:var(--text-secondary);">${created}</td>
        <td onclick="event.stopPropagation();">
          <div style="display:flex; gap:8px;">
            <button class="btn btn-outline edit-btn" data-id="${ticket.$id}" style="padding:4px 8px; font-size:0.8rem; border-color:var(--accent-amber); color:var(--accent-amber);">Manage</button>
            <button class="btn btn-outline resolve-btn" data-id="${ticket.$id}" style="padding:4px 8px; font-size:0.8rem; border-color:var(--accent-emerald); color:var(--accent-emerald);" ${status === 'resolved' ? 'disabled' : ''}>Resolve</button>
          </div>
        </td>
      `;

      // Long press logic
      let pressTimer;
      tr.addEventListener('mousedown', () => {
         pressTimer = setTimeout(() => {
           if (!isSelectionMode) {
             isSelectionMode = true;
           }
           if (selectedTickets.has(ticket.$id)) selectedTickets.delete(ticket.$id);
           else selectedTickets.add(ticket.$id);
           loadTickets(); // re-render visuals
           window.__updateSelectionUI();
         }, 500); 
      });
      tr.addEventListener('mouseup', () => clearTimeout(pressTimer));
      tr.addEventListener('mouseleave', () => clearTimeout(pressTimer));

      tr.addEventListener('touchstart', (e) => {
         pressTimer = setTimeout(() => {
           if (!isSelectionMode) {
             isSelectionMode = true;
           }
           if (selectedTickets.has(ticket.$id)) selectedTickets.delete(ticket.$id);
           else selectedTickets.add(ticket.$id);
           if (window.navigator?.vibrate) window.navigator.vibrate(50);
           loadTickets();
           window.__updateSelectionUI();
         }, 500);
      }, {passive:true});
      tr.addEventListener('touchend', () => clearTimeout(pressTimer));
      tr.addEventListener('touchcancel', () => clearTimeout(pressTimer));

      // Click to toggle if already in selection mode
      tr.addEventListener('click', (e) => {
         // prevent navigation or other clicks if in selection mode
         if (e.target.closest('.edit-btn') || e.target.closest('.resolve-btn') || e.target.closest('.view-attachments-btn') || e.target.closest('.customer-link')) {
            if (isSelectionMode) {
               e.preventDefault();
               e.stopPropagation();
            } else {
               return; // Let standard buttons work
            }
         }

         if (isSelectionMode) {
           if (selectedTickets.has(ticket.$id)) selectedTickets.delete(ticket.$id);
           else selectedTickets.add(ticket.$id);
           loadTickets();
           window.__updateSelectionUI();
         }
      });

      tbody.appendChild(tr);
    });

    loading.style.display = 'none';
    tableContainer.style.display = 'block';

    // Event listeners for actions
    document.querySelectorAll('.view-attachments-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const rawJson = e.currentTarget.getAttribute('data-images');
        try {
          const arr = JSON.parse(rawJson);
          if (arr && arr.length > 0) {
            currentImageUrls = arr;
            currentImageIndex = 0;
            updateGalleryImage();
            document.getElementById('gallery-modal').classList.add('active');
          }
        } catch(err) {
          console.error(err);
        }
      });
    });

    document.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.dataset.id;
        const targetTicket = tickets.find(t => t.$id === id);
        if(!targetTicket) return;

        document.getElementById('reassign-ticket-id').value = id;
        
        // Build tech options dynamically
        const techSelect = document.getElementById('reassign-technician-id');
        techSelect.innerHTML = `<option value="">-- Unassigned --</option>` + 
          techniciansList.map(t => `<option value="${t.$id}" ${targetTicket.technicianId === t.$id ? 'selected' : ''}>${t.firstName} ${t.lastName}</option>`).join('');

        document.getElementById('reassign-ticket-status').value = targetTicket.status;
        document.getElementById('reassign-modal').classList.add('active');
      });
    });

    document.querySelectorAll('.resolve-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.getElementById('resolve-ticket-id').value = e.target.dataset.id;
        document.getElementById('resolve-modal').classList.add('active');
      });
    });

    // Custom resolve modal bindings
    const resolveModal = document.getElementById('resolve-modal');
    document.getElementById('cancel-resolve-btn')?.addEventListener('click', () => {
      resolveModal.classList.remove('active');
    });

    document.getElementById('confirm-resolve-btn')?.addEventListener('click', async () => {
      const id = document.getElementById('resolve-ticket-id').value;
      const confirmBtn = document.getElementById('confirm-resolve-btn');
      confirmBtn.disabled = true;
      confirmBtn.innerHTML = '<span class="spinner" style="width:16px;height:16px;border-width:2px;display:inline-block;vertical-align:middle;margin-right:8px;"></span>Resolving...';

      try {
        await ticketService.updateTicket(id, { status: 'resolved' });
        showToast('Ticket marked resolved', 'success');
        resolveModal.classList.remove('active');
        loadTickets();
      } catch(error) {
        showToast('Failed to resolve', 'error');
      } finally {
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = 'Yes, Resolve It';
      }
    });

  } catch (error) {
    console.error(error);
    loading.innerHTML = '<div style="color:var(--accent-rose);">Failed to load tickets.</div>';
  }
}
