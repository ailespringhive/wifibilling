import { formatDate, statusBadge, showToast, showConfirm } from '../components/ui-helpers.js';
import { ticketService } from '../services/ticket.service.js';

export function renderTicketsPage() {
  return `
    <div class="card glass-card" style="margin-bottom: 24px; min-height: calc(100vh - 140px); display: flex; flex-direction: column;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; padding: 24px 24px 0 24px;">
        <h2 class="card-title" style="margin:0;">Repair Tickets</h2>
        <div style="display: flex; gap: 12px; align-items: center;">
          <div id="bulk-action-bar" style="display:none; align-items:center; gap:8px; background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.3); border-radius:8px; padding:6px 12px;">
            <span id="bulk-count" style="font-size:0.85rem; color:var(--accent-rose); font-weight:600;">0 selected</span>
            <button class="btn btn-sm" id="bulk-delete-btn" style="background:var(--accent-rose); color:#fff; padding:4px 12px; border-radius:6px;">
              <span class="material-icons-outlined" style="font-size:15px; vertical-align:middle;">delete</span> Delete Selected
            </button>
            <button class="btn btn-ghost btn-sm" id="bulk-cancel-btn" style="padding:4px 8px;">Cancel</button>
          </div>
          <select id="filter-ticket-status" class="form-select" style="width: auto; min-width: 150px; background: rgba(0,0,0,0.2) !important;">
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
          </select>
          <button class="btn btn-primary" id="add-ticket-btn">
            <span class="material-icons-outlined">add</span> Create Ticket
          </button>
          <button class="btn btn-ghost" id="refresh-tickets-btn" title="Refresh">
            <span class="material-icons-outlined">refresh</span>
          </button>
        </div>
      </div>

      <div class="table-container" style="flex: 1; display: flex; flex-direction: column;">
        <div id="tickets-loading" class="spinner" style="margin: 40px auto; display: none;"></div>
        
        <table class="data-table" id="tickets-table">
          <thead>
            <tr>
              <th id="select-all-th" style="width:40px; display:none;"><input type="checkbox" id="select-all-tickets" title="Select all" style="cursor:pointer; width:16px; height:16px;"></th>
              <th>Date</th>
              <th>Customer</th>
              <th>Issue</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Repaired by</th>
              <th>Photos</th>
              <th style="width: 100px;">Actions</th>
            </tr>
          </thead>
          <tbody id="tickets-tbody">
            <!-- Tickets injected here -->
          </tbody>
        </table>
        
        <div id="tickets-empty" class="empty-state" style="display: none; padding: 40px 20px;">
          <div class="empty-icon"><span class="material-icons-outlined" style="font-size:3rem;">build</span></div>
          <div class="empty-title">No repair tickets found.</div>
        </div>
        
        <!-- Pagination -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: auto; padding: 16px 24px 24px 24px; border-top: 1px solid var(--border-color);">
          <div style="font-size: 0.85rem; color: var(--text-muted);" id="tickets-pagination-info">Showing 0 tickets</div>
          <div style="display: flex; gap: 8px;">
            <button class="btn btn-ghost btn-sm" id="tickets-prev-btn" disabled>Previous</button>
            <button class="btn btn-ghost btn-sm" id="tickets-next-btn" disabled>Next</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Ticket Modal -->
    <div class="modal-overlay" id="ticket-modal">
      <div class="modal" style="max-width: 560px; border-radius: 20px; overflow: hidden; padding: 0;">
        <!-- Header -->
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 20px 24px 16px 24px; border-bottom: 1px solid var(--border-color);">
          <h3 id="ticket-modal-title" style="margin:0; font-size: 1.2rem; font-weight: 700;">Create Repair Ticket</h3>
          <button id="close-ticket-modal" style="background: var(--bg-secondary); border: none; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text-secondary);">
            <span class="material-icons-outlined" style="font-size: 18px;">close</span>
          </button>
        </div>

        <form id="ticket-form" style="padding: 20px 24px; display: flex; flex-direction: column; gap: 20px; max-height: 75vh; overflow-y: auto;">
          <input type="hidden" id="ticket-id" />

          <!-- Customer -->
          <div id="customer-select-container">
            <div style="font-size: 0.8rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">Customer</div>
            <input list="customer-list" class="form-input" id="ticket-customer-input" placeholder="Search customer by name or ID..." style="width: 100%; border-radius: 12px; padding: 14px 16px; font-size: 0.95rem; box-sizing: border-box;">
            <datalist id="customer-list"></datalist>
          </div>

          <div id="customer-readonly-container" style="display: none;">
            <div style="font-size: 0.8rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">Customer</div>
            <input type="text" class="form-input" id="ticket-customer-readonly" readonly disabled style="width: 100%; border-radius: 12px; padding: 14px 16px; box-sizing: border-box;" />
          </div>

          <!-- Priority pill selector -->
          <div>
            <div style="font-size: 0.8rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 10px;">Priority</div>
            <div style="display: flex; gap: 8px;">
              <button type="button" class="priority-pill" data-priority="low" style="flex:1; padding: 10px 0; border-radius: 30px; border: 2px solid var(--border-color); background: transparent; color: var(--text-secondary); cursor: pointer; font-size: 0.9rem; font-weight: 500; transition: all 0.2s;">Low</button>
              <button type="button" class="priority-pill active-priority" data-priority="medium" style="flex:1; padding: 10px 0; border-radius: 30px; border: 2px solid var(--accent-amber); background: rgba(245,158,11,0.12); color: var(--accent-amber); cursor: pointer; font-size: 0.9rem; font-weight: 600; transition: all 0.2s;">Medium</button>
              <button type="button" class="priority-pill" data-priority="high" style="flex:1; padding: 10px 0; border-radius: 30px; border: 2px solid var(--border-color); background: transparent; color: var(--text-secondary); cursor: pointer; font-size: 0.9rem; font-weight: 500; transition: all 0.2s;">High</button>
              <button type="button" class="priority-pill" data-priority="critical" style="flex:1; padding: 10px 0; border-radius: 30px; border: 2px solid var(--border-color); background: transparent; color: var(--text-secondary); cursor: pointer; font-size: 0.9rem; font-weight: 500; transition: all 0.2s;">Critical</button>
            </div>
            <input type="hidden" id="ticket-priority" value="medium">
          </div>

          <!-- Issue Description -->
          <div>
            <div style="font-size: 0.8rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">Issue Description</div>
            <textarea class="form-textarea" id="ticket-issue" required placeholder="Briefly describe the issue (e.g. LOS Red Light)" style="min-height: 100px; border-radius: 12px; padding: 14px 16px; width: 100%; box-sizing: border-box; resize: vertical;"></textarea>
          </div>

          <!-- Photo Attachments -->
          <div id="customer-select-container-photos">
            <div style="font-size: 0.8rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 10px;">Attachments (Max 3)</div>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;" id="ticket-photo-previews"></div>
            <label for="ticket-photo-input" style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 8px; padding: 12px; border: 2px dashed var(--border-color); border-radius: 12px; cursor: pointer; color: var(--text-muted); font-size: 0.9rem; transition: 0.2s;" onmouseover="this.style.borderColor='var(--accent-blue)'; this.style.color='var(--accent-blue)'" onmouseout="this.style.borderColor='var(--border-color)'; this.style.color='var(--text-muted)'">
              <span class="material-icons-outlined">add_photo_alternate</span> Add Photos
            </label>
            <input type="file" id="ticket-photo-input" accept="image/*" multiple style="display:none;">
          </div>

          <!-- Status (only shown when editing) -->
          <div id="status-field-container" style="display:none;">
            <div style="font-size: 0.8rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">Status</div>
            <select class="form-select" id="ticket-status" style="border-radius: 12px; padding: 12px 16px; width: 100%;">
              <option value="pending" selected>Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <!-- Additional Notes -->
          <div>
            <div style="font-size: 0.8rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">Additional Notes <span style="font-weight:400; text-transform:none;">(Optional)</span></div>
            <textarea class="form-textarea" id="ticket-notes-field" placeholder="Any extra context?" style="min-height: 70px; border-radius: 12px; padding: 14px 16px; width: 100%; box-sizing: border-box; resize: vertical;"></textarea>
          </div>

        </form>

        <!-- Submit button -->
        <div style="padding: 0 24px 24px 24px;">
          <button class="btn btn-primary" id="save-ticket-btn" style="width: 100%; padding: 16px; border-radius: 14px; font-size: 1rem; font-weight: 700; letter-spacing: 0.02em;">
            Submit Ticket
          </button>
        </div>
      </div>
    </div>

    <!-- Ticket Notes Modal -->
    <div class="modal-overlay" id="notes-modal">
      <div class="modal" style="max-width: 500px;">
        <div class="modal-header">
          <h3 id="notes-modal-title">Internal Notes</h3>
          <button class="modal-close" id="close-notes-modal">✕</button>
        </div>
        <div class="modal-body">
          <input type="hidden" id="notes-ticket-id" />
          <div class="form-group">
            <label class="form-label" id="notes-modal-label">Technician & Admin Exchange</label>
            <textarea class="form-textarea" id="ticket-notes-text" style="min-height: 150px; white-space: pre-wrap; line-height: 1.5;" placeholder="Add an internal note..."></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" id="cancel-notes-btn">Cancel</button>
          <button class="btn btn-primary" id="save-notes-btn" style="background:var(--accent-purple); border-color:var(--accent-purple);">
            <span class="material-icons-outlined" style="font-size:16px;">save</span> Save Note
          </button>
        </div>
      </div>
    </div>

    <!-- Image Carousel Modal -->
    <div class="modal-overlay" id="carousel-modal">
      <div class="modal" style="max-width: 800px; width: 90%; padding:0; overflow:hidden; background:var(--bg-secondary); border: 1px solid var(--border-color);">
        <div class="modal-header" style="position:absolute; top:0; left:0; right:0; z-index:10; background:linear-gradient(to bottom, rgba(0,0,0,0.8), transparent); border:none; padding:16px;">
          <h3 style="color:white; text-shadow:0 1px 3px rgba(0,0,0,0.5); font-size:1.1rem; margin:0;" id="carousel-title">Proof of Resolution (1 of 3)</h3>
          <button class="modal-close" id="close-carousel-modal" style="color:white; text-shadow:0 1px 3px rgba(0,0,0,0.5);">✕</button>
        </div>
        <div class="modal-body" style="padding:0; position:relative; min-height:400px; display:flex; align-items:center; justify-content:center; background: #000;">
           <img id="carousel-main-image" src="" style="max-width:100%; max-height:75vh; object-fit:contain; transition: opacity 0.2s;" />
           <button id="carousel-prev" style="position:absolute; left:16px; top:50%; transform:translateY(-50%); background:rgba(0,0,0,0.5); color:white; border:none; border-radius:50%; width:40px; height:40px; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:0.2s;"><span class="material-icons-outlined">chevron_left</span></button>
           <button id="carousel-next" style="position:absolute; right:16px; top:50%; transform:translateY(-50%); background:rgba(0,0,0,0.5); color:white; border:none; border-radius:50%; width:40px; height:40px; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:0.2s;"><span class="material-icons-outlined">chevron_right</span></button>
        </div>
        <div id="carousel-indicators" style="position:absolute; bottom:16px; left:0; right:0; display:flex; justify-content:center; gap:8px; z-index:10;">
        </div>
      </div>
    </div>

    <!-- Ticket & Customer Info Modal -->
    <div class="modal-overlay" id="customer-info-modal">
      <div class="modal" style="max-width: 500px;">
        <div class="modal-header">
          <h3 id="customer-info-title">Ticket Details</h3>
          <button class="modal-close" id="close-customer-info-modal">✕</button>
        </div>
        <div class="modal-body" style="line-height: 1.6; max-height: 70vh; overflow-y: auto;">
          <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px;">
            <div><span style="color:var(--text-muted);">Issue:</span> <strong id="ci-ticket-issue" style="white-space: pre-wrap;"></strong></div>
            <div><span style="color:var(--text-muted);">Notes:</span> <strong id="ci-ticket-notes" style="white-space: pre-wrap;"></strong></div>
            <div><span style="color:var(--text-muted);">Priority:</span> <strong id="ci-ticket-priority" style="text-transform: capitalize;"></strong></div>
            <div><span style="color:var(--text-muted);">Status:</span> <strong id="ci-ticket-status" style="text-transform: capitalize;"></strong></div>
            <div><span style="color:var(--text-muted);">Technician:</span> <strong id="ci-ticket-tech"></strong></div>
          </div>
          
          <div id="ci-initial-photos-container" style="display: none;">
            <h4 style="margin: 0 0 8px 0; color: var(--text-secondary);">Initial Issue Photos</h4>
            <div id="ci-initial-photos" style="display: flex; gap: 8px; flex-wrap: wrap;"></div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" id="btn-close-customer-info">Close</button>
        </div>
      </div>
    </div>
  `;
}

export function initTicketsPage(services, navigateFn) {
  let allTickets = [];
  let allCustomers = [];
  
  let currentPage = 1;
  const itemsPerPage = 10;
  let hasMore = true;

  const tbody = document.getElementById('tickets-tbody');
  const loadingStr = document.getElementById('tickets-loading');
  const emptyStr = document.getElementById('tickets-empty');
  const tableStr = document.getElementById('tickets-table');
  const infoStr = document.getElementById('tickets-pagination-info');
  const prevBtn = document.getElementById('tickets-prev-btn');
  const nextBtn = document.getElementById('tickets-next-btn');

  // Modal elements
  const modal = document.getElementById('ticket-modal');
  const form = document.getElementById('ticket-form');
  const modalTitle = document.getElementById('ticket-modal-title');
  const idInput = document.getElementById('ticket-id');
  const customerInput = document.getElementById('ticket-customer-input');
  const customerReadonly = document.getElementById('ticket-customer-readonly');
  const customerSelectContainer = document.getElementById('customer-select-container');
  const customerReadonlyContainer = document.getElementById('customer-readonly-container');
  const issueInput = document.getElementById('ticket-issue');
  const prioritySelect = document.getElementById('ticket-priority');
  const statusSelect = document.getElementById('ticket-status');

  // Load prerequisites asynchronously concurrently
  Promise.all([
    loadCustomers()
  ]).then(() => {
    loadTickets();
  });

  async function loadCustomers() {
    try {
      const resp = await services.customer.getAll(1000, 0); // Need all possible to map IDs
      allCustomers = resp.documents || [];
      const datalist = document.getElementById('customer-list');
      if (datalist) {
        datalist.innerHTML = allCustomers.map(c => `<option value="${c.firstName || ''} ${c.lastName || ''} - ${c.userId || c.$id}"></option>`).join('');
      }
    } catch (e) {
      console.error('Failed to load customers for ticket assignment', e);
    }
  }

  async function loadTickets(page = 1) {
    loadingStr.style.display = 'block';
    tableStr.style.display = 'none';
    emptyStr.style.display = 'none';
    
    try {
      const offset = (page - 1) * itemsPerPage;
      const filter = document.getElementById('filter-ticket-status').value;
      const resp = await ticketService.getTickets(filter, itemsPerPage, offset);
      
      allTickets = resp.documents || [];
      hasMore = allTickets.length === itemsPerPage;
      currentPage = page;
      
      renderTicketsTable();
    } catch (e) {
      console.error(e);
      showToast('Failed to load tickets', 'error');
    } finally {
      loadingStr.style.display = 'none';
    }
  }

  function renderTicketsTable() {
    if (allTickets.length === 0) {
      emptyStr.style.display = 'block';
      tableStr.style.display = 'none';
    } else {
      emptyStr.style.display = 'none';
      tableStr.style.display = 'table';
      
      tbody.innerHTML = allTickets.map(ticket => {
        let photosHtml = '<span style="color:var(--text-muted);">—</span>';
        if (ticket.proofUrls && Array.isArray(ticket.proofUrls) && ticket.proofUrls.length > 0) {
          photosHtml = `
            <button class="btn btn-ghost btn-sm open-carousel-btn" data-ticket-id="${ticket.$id}" data-type="proof" style="color:var(--accent-blue); padding:4px 8px; border:1px solid rgba(59, 130, 246, 0.15); border-radius:4px;">
              <span class="material-icons-outlined" style="font-size:16px;">image</span> View ${ticket.proofUrls.length > 1 ? `(${ticket.proofUrls.length})` : ''}
            </button>
          `;
        }

        // Priority Badge helper
        const priorityColors = { low: 'gray', medium: 'var(--accent-amber)', high: 'var(--accent-rose)', critical: 'red' };
        const pColor = priorityColors[ticket.priority] || 'gray';
        const pBadge = `<span style="color:${pColor}; font-weight:600; text-transform:capitalize;">${ticket.priority || 'medium'}</span>`;

        return `
          <tr class="hover-row" data-id="${ticket.$id}" style="cursor:pointer; user-select:none;">
            <td class="row-select-cell" style="text-align:center; display:none;"><input type="checkbox" class="ticket-row-checkbox" data-id="${ticket.$id}" style="cursor:pointer; width:16px; height:16px;"></td>
            <td>${formatDate(ticket.$createdAt)}</td>
            <td>
              <div class="customer-info-trigger" data-ticket-id="${ticket.$id}" style="cursor:pointer; padding:4px; border-radius:4px; transition:0.2s;" onmouseover="this.style.background='var(--hover-bg)'" onmouseout="this.style.background='transparent'">
                <div style="font-weight: 500; color:var(--accent-blue);">${ticket.customerName || 'Unknown'}</div>
                <div style="font-size:0.75rem; color:var(--text-muted);">${ticket.customerId}</div>
              </div>
            </td>
            <td style="max-width: 250px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${ticket.issueDescription || ticket.issue || ''}">
              ${ticket.issueDescription || ticket.issue || '—'}
            </td>
            <td>${pBadge}</td>
            <td>${statusBadge(ticket.status || 'pending')}</td>
            <td>${ticket.technicianName || '<span style="color:var(--text-muted); font-style:italic;">Unassigned</span>'}</td>
            <td>${photosHtml}</td>
            <td>
              <div class="table-actions" style="display:flex; align-items:center; gap:4px;">
                <button class="btn btn-ghost btn-sm btn-icon" title="Notes" data-notes="${ticket.$id}" style="color:var(--accent-purple); position:relative;">
                  <span class="material-icons-outlined" style="font-size:18px;">chat_bubble_outline</span>
                  ${(typeof ticket.notes === 'string' && ticket.notes !== 'null' && ticket.notes.trim().length > 0 && ticket.notes !== localStorage.getItem('ticket_note_read_' + ticket.$id)) ? '<div class="red-dot-indicator" style="position:absolute; top:4px; right:4px; width:8px; height:8px; background:var(--accent-rose); border-radius:50%; box-shadow:0 0 0 2px var(--bg-card);"></div>' : ''}
                </button>
                <button class="btn btn-ghost btn-sm btn-icon" title="Edit" data-edit="${ticket.$id}">
                  <span class="material-icons-outlined" style="font-size:18px;">edit</span>
                </button>
                <button class="btn btn-ghost btn-sm btn-icon" title="Delete" data-delete="${ticket.$id}" style="color:var(--accent-rose);">
                  <span class="material-icons-outlined" style="font-size:18px;">delete</span>
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join('');

      // Attach actions
      tbody.querySelectorAll('[data-edit]').forEach(btn => {
        btn.addEventListener('click', () => openTicketModal(btn.dataset.edit));
      });
      
      tbody.querySelectorAll('[data-delete]').forEach(btn => {
        btn.addEventListener('click', () => deleteTicket(btn.dataset.delete));
      });
      
      tbody.querySelectorAll('[data-notes]').forEach(btn => {
        btn.addEventListener('click', () => openNotesModal(btn.dataset.notes));
      });

      // Long-press to enter selection mode
      tbody.querySelectorAll('tr[data-id]').forEach(row => {
        let pressTimer = null;

        const startPress = () => {
          pressTimer = setTimeout(() => {
            enterSelectionMode();
            const cb = row.querySelector('.ticket-row-checkbox');
            if (cb) { cb.checked = true; updateBulkBar(); }
          }, 600);
        };

        const cancelPress = () => clearTimeout(pressTimer);

        row.addEventListener('mousedown', startPress);
        row.addEventListener('mouseup', cancelPress);
        row.addEventListener('mouseleave', cancelPress);
        row.addEventListener('touchstart', startPress, { passive: true });
        row.addEventListener('touchend', cancelPress);

        // Click row to toggle when already in selection mode
        row.addEventListener('click', (e) => {
          if (!isSelectionMode) return;
          if (e.target.closest('[data-edit],[data-delete],[data-notes],.customer-info-trigger,.open-carousel-btn')) return;
          const cb = row.querySelector('.ticket-row-checkbox');
          if (cb) { cb.checked = !cb.checked; updateBulkBar(); }
        });
      });

      // Row checkbox direct change
      tbody.querySelectorAll('.ticket-row-checkbox').forEach(cb => {
        cb.addEventListener('change', updateBulkBar);
      });
    }

    // Reset selection state when table reloads
    exitSelectionMode();
    const selectAll = document.getElementById('select-all-tickets');
    if (selectAll) selectAll.checked = false;

    // Pagination controls
    infoStr.textContent = `Page ${currentPage}`;
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = !hasMore;
  }

  // Selection mode state
  let isSelectionMode = false;

  function enterSelectionMode() {
    if (isSelectionMode) return;
    isSelectionMode = true;
    document.querySelectorAll('.row-select-cell').forEach(td => td.style.display = 'table-cell');
    const th = document.getElementById('select-all-th');
    if (th) th.style.display = 'table-cell';
  }

  function exitSelectionMode() {
    isSelectionMode = false;
    document.querySelectorAll('.row-select-cell').forEach(td => td.style.display = 'none');
    document.querySelectorAll('.ticket-row-checkbox').forEach(cb => cb.checked = false);
    const th = document.getElementById('select-all-th');
    if (th) th.style.display = 'none';
    const selectAll = document.getElementById('select-all-tickets');
    if (selectAll) selectAll.checked = false;
    updateBulkBar();
  }


  // Handle pagination
  prevBtn.addEventListener('click', () => hasMore ? loadTickets(currentPage - 1) : loadTickets(currentPage - 1));
  nextBtn.addEventListener('click', () => loadTickets(currentPage + 1));
  
  // Refresh manually
  document.getElementById('refresh-tickets-btn').addEventListener('click', () => loadTickets(1));
  
  // Filter change triggers re-fetch
  document.getElementById('filter-ticket-status').addEventListener('change', () => loadTickets(1));

  // Select-all checkbox
  document.getElementById('select-all-tickets').addEventListener('change', function() {
    document.querySelectorAll('.ticket-row-checkbox').forEach(cb => cb.checked = this.checked);
    updateBulkBar();
  });

  function updateBulkBar() {
    const checked = document.querySelectorAll('.ticket-row-checkbox:checked');
    const bar = document.getElementById('bulk-action-bar');
    const countEl = document.getElementById('bulk-count');
    if (checked.length > 0) {
      bar.style.display = 'flex';
      countEl.textContent = `${checked.length} selected`;
    } else {
      bar.style.display = 'none';
    }
  }

  document.getElementById('bulk-cancel-btn').addEventListener('click', () => {
    exitSelectionMode();
  });

  document.getElementById('bulk-delete-btn').addEventListener('click', async () => {
    const checked = Array.from(document.querySelectorAll('.ticket-row-checkbox:checked'));
    if (checked.length === 0) return;
    const confirmed = await showConfirm(`Delete ${checked.length} ticket(s)? This cannot be undone.`);
    if (!confirmed) return;
    let success = 0, failed = 0;
    for (const cb of checked) {
      try {
        await ticketService.deleteTicket(cb.dataset.id);
        success++;
      } catch { failed++; }
    }
    showToast(`${success} ticket(s) deleted${failed ? `, ${failed} failed` : ''}.`, failed ? 'warning' : 'success');
    exitSelectionMode();
    loadTickets(currentPage);
  });

  // Modals
  document.getElementById('add-ticket-btn').addEventListener('click', () => openTicketModal());

  // Priority pills
  document.querySelectorAll('.priority-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      setActivePriority(btn.dataset.priority);
    });
  });

  function setActivePriority(value) {
    document.getElementById('ticket-priority').value = value;
    const colors = { low: '#6b7280', medium: 'var(--accent-amber)', high: 'var(--accent-rose)', critical: 'red' };
    const bgs = { low: 'transparent', medium: 'rgba(245,158,11,0.12)', high: 'rgba(239,68,68,0.1)', critical: 'rgba(239,68,68,0.15)' };
    document.querySelectorAll('.priority-pill').forEach(p => {
      const active = p.dataset.priority === value;
      p.style.borderColor = active ? colors[value] : 'var(--border-color)';
      p.style.color = active ? colors[value] : 'var(--text-secondary)';
      p.style.background = active ? bgs[value] : 'transparent';
      p.style.fontWeight = active ? '600' : '500';
    });
  }

  // Photo attachment preview
  let selectedPhotoFiles = [];
  document.getElementById('ticket-photo-input').addEventListener('change', function() {
    const files = Array.from(this.files);
    const remaining = 3 - selectedPhotoFiles.length;
    const toAdd = files.slice(0, remaining);
    selectedPhotoFiles = [...selectedPhotoFiles, ...toAdd];
    renderPhotoPreviews();
    this.value = '';
  });

  function renderPhotoPreviews() {
    const container = document.getElementById('ticket-photo-previews');
    container.innerHTML = selectedPhotoFiles.map((f, i) => {
      const url = URL.createObjectURL(f);
      return `<div style="position:relative; display:inline-block;">
        <img src="${url}" style="width:70px; height:70px; object-fit:cover; border-radius:10px; border:1px solid var(--border-color);">
        <button type="button" data-photo-index="${i}" style="position:absolute; top:-6px; right:-6px; background:var(--accent-rose); color:#fff; border:none; border-radius:50%; width:20px; height:20px; cursor:pointer; font-size:12px; display:flex; align-items:center; justify-content:center; line-height:1;" class="remove-photo-btn">✕</button>
      </div>`;
    }).join('');
    container.querySelectorAll('.remove-photo-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        selectedPhotoFiles.splice(parseInt(btn.dataset.photoIndex), 1);
        renderPhotoPreviews();
      });
    });
  }

  function openTicketModal(ticketId = null) {
    selectedPhotoFiles = [];
    renderPhotoPreviews();

    if (ticketId) {
      // Editing
      const ticket = allTickets.find(t => t.$id === ticketId);
      if (!ticket) return;

      modalTitle.textContent = 'Edit Ticket';
      idInput.value = ticket.$id;

      customerSelectContainer.style.display = 'none';
      customerReadonlyContainer.style.display = 'block';
      customerReadonly.value = ticket.customerName || ticket.customerId;

      document.getElementById('status-field-container').style.display = 'block';
      document.getElementById('customer-select-container-photos').style.display = 'none';

      issueInput.value = ticket.issueDescription || ticket.issue || '';
      setActivePriority(ticket.priority || 'medium');
      statusSelect.value = ticket.status || 'pending';
      document.getElementById('ticket-notes-field').value = ticket.notes || '';
    } else {
      // Creating new
      form.reset();
      modalTitle.textContent = 'Create Repair Ticket';
      idInput.value = '';
      customerSelectContainer.style.display = 'block';
      customerReadonlyContainer.style.display = 'none';
      customerInput.value = '';

      document.getElementById('status-field-container').style.display = 'none';
      document.getElementById('customer-select-container-photos').style.display = 'block';

      setActivePriority('medium');
      document.getElementById('ticket-notes-field').value = '';
    }

    modal.classList.add('active');
  }

  function closeModal() {
    modal.classList.remove('active');
  }

  document.getElementById('close-ticket-modal').addEventListener('click', closeModal);

  document.getElementById('cancel-ticket-btn').addEventListener('click', (e) => {
    e.preventDefault();
    closeModal();
  });

  // Save changes
  document.getElementById('save-ticket-btn').addEventListener('click', async (e) => {
    e.preventDefault();
    const id = idInput.value;
    const isNew = !id;
    
    let customerId, customerName;
    if (isNew) {
      const inputVal = customerInput.value.trim();
      if (!inputVal) { showToast('Please select or enter a customer', 'warning'); return; }
      
      const parts = inputVal.split(' - ');
      if (parts.length > 1) {
        customerId = parts[parts.length - 1].trim();
        customerName = parts.slice(0, -1).join(' - ').trim();
      } else {
        customerId = 'CUST-' + Date.now().toString().slice(-6);
        customerName = inputVal;
      }
      if (!issueInput.value.trim()) { showToast('Please describe the issue', 'warning'); return; }
    }

    const priorityVal = document.getElementById('ticket-priority').value || 'medium';
    const notesVal = document.getElementById('ticket-notes-field').value.trim();

    const payload = {
      priority: priorityVal,
      status: statusSelect.value || 'pending',
      notes: notesVal,
    };
    
    if (isNew) {
      payload.customerId = customerId;
      payload.customerName = customerName;
      payload.issueDescription = issueInput.value.trim();
      payload.issue = issueInput.value.trim();
      // Upload photos if any
      if (selectedPhotoFiles.length > 0) {
        showToast('Uploading photos...', 'info');
        try {
          const { ticketService: ts } = await import('../services/ticket.service.js');
          const urls = [];
          for (const f of selectedPhotoFiles) {
            const url = await ticketService.uploadTicketImage(f);
            if (url) urls.push(url);
          }
          payload.imageUrls = urls;
        } catch { /* ignore upload errors */ }
      }
    } else {
      payload.issueDescription = issueInput.value.trim();
      payload.issue = issueInput.value.trim();
    }

    const saveBtn = document.getElementById('save-ticket-btn');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    try {
      if (isNew) {
        await ticketService.createTicket(payload);
        showToast('Ticket created successfully', 'success');
      } else {
        await ticketService.updateTicket(id, payload);
        showToast('Ticket updated successfully', 'success');
      }
      closeModal();
      loadTickets(1);
    } catch (err) {
      console.error(err);
      showToast('Failed to save ticket', 'error');
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Submit Ticket';
    }
  });

  // Delete wrapper
  async function deleteTicket(ticketId) {
    const confirmed = await showConfirm(
      'Are you sure you want to delete this repair ticket? This cannot be undone.',
      { title: 'Delete Ticket', confirmText: 'Delete', type: 'danger' }
    );
    if (!confirmed) return;
    
    try {
      await ticketService.deleteTicket(ticketId);
      showToast('Ticket deleted', 'success');
      loadTickets(1);
    } catch (e) {
      console.error(e);
      showToast('Failed to delete ticket', 'error');
    }
  }

  // --- Image Carousel Logic ---
  const carouselModal = document.getElementById('carousel-modal');
  const carouselMainImg = document.getElementById('carousel-main-image');
  const carouselTitle = document.getElementById('carousel-title');
  const carouselPrevBtn = document.getElementById('carousel-prev');
  const carouselNextBtn = document.getElementById('carousel-next');
  const carouselIndicators = document.getElementById('carousel-indicators');
  
  let carouselImages = [];
  let currentCarouselIdx = 0;

  let currentCarouselType = 'proof';

  function updateCarouselView() {
    if (carouselImages.length === 0) return;
    carouselMainImg.style.opacity = '0';
    setTimeout(() => {
      carouselMainImg.src = carouselImages[currentCarouselIdx];
      carouselMainImg.style.opacity = '1';
    }, 150);

    const titlePrefix = currentCarouselType === 'proof' ? 'Proof of Resolution' : 'Initial Issue Photos';
    carouselTitle.textContent = `${titlePrefix} (${currentCarouselIdx + 1} of ${carouselImages.length})`;

    // Connect prev/next visibility
    carouselPrevBtn.style.display = currentCarouselIdx > 0 ? 'flex' : 'none';
    carouselNextBtn.style.display = currentCarouselIdx < carouselImages.length - 1 ? 'flex' : 'none';

    // Update dots
    carouselIndicators.innerHTML = carouselImages.map((_, i) => `
      <div style="width:8px; height:8px; border-radius:50%; background:${i === currentCarouselIdx ? 'white' : 'rgba(255,255,255,0.3)'}; transition:0.2s; cursor:pointer;" data-carousel-jump="${i}"></div>
    `).join('');

    // Attach click to dots
    carouselIndicators.querySelectorAll('div').forEach(dot => {
      dot.addEventListener('click', (e) => {
        currentCarouselIdx = parseInt(e.target.dataset.carouselJump, 10);
        updateCarouselView();
      });
    });
  }

  function openImageCarousel(ticketId, type) {
    const ticket = allTickets.find(t => t.$id === ticketId);
    if (!ticket) return;
    
    currentCarouselType = type;
    const urls = type === 'proof' ? ticket.proofUrls : ticket.imageUrls;
    
    if (!urls || urls.length === 0) return;
    
    carouselImages = urls;
    currentCarouselIdx = 0;
    carouselModal.classList.add('active');
    updateCarouselView();
  }

  function closeCarousel() {
    carouselModal.classList.remove('active');
    carouselImages = [];
    carouselMainImg.src = '';
  }

  document.getElementById('close-carousel-modal').addEventListener('click', closeCarousel);
  carouselPrevBtn.addEventListener('click', () => { if (currentCarouselIdx > 0) { currentCarouselIdx--; updateCarouselView(); } });
  carouselNextBtn.addEventListener('click', () => { if (currentCarouselIdx < carouselImages.length - 1) { currentCarouselIdx++; updateCarouselView(); } });

  // Attach dynamic clicks to the newly created buttons inside the table body!
  tbody.addEventListener('click', (e) => {
    const carouselBtn = e.target.closest('.open-carousel-btn');
    if (carouselBtn) {
      openImageCarousel(carouselBtn.dataset.ticketId, carouselBtn.dataset.type || 'proof');
      return;
    }
    
    const customerTrigger = e.target.closest('.customer-info-trigger');
    if (customerTrigger) {
      openCustomerInfoModal(customerTrigger.dataset.ticketId);
      return;
    }
  });

  // --- Customer Info Modal Logic ---
  const customerInfoModal = document.getElementById('customer-info-modal');
  function openCustomerInfoModal(ticketId) {
    const ticket = allTickets.find(t => t.$id === ticketId);
    if (!ticket) return;

    // Populate ticket info
    document.getElementById('ci-ticket-issue').textContent = ticket.issueDescription || ticket.issue || 'No description';
    document.getElementById('ci-ticket-notes').textContent = ticket.notes || 'No notes';
    document.getElementById('ci-ticket-priority').textContent = ticket.priority || 'medium';
    document.getElementById('ci-ticket-status').textContent = ticket.status || 'pending';
    document.getElementById('ci-ticket-tech').textContent = ticket.technicianName || 'Unassigned';

    // Populate photos
    const initContainer = document.getElementById('ci-initial-photos-container');
    const initDiv = document.getElementById('ci-initial-photos');
    if (ticket.imageUrls && ticket.imageUrls.length > 0) {
      initContainer.style.display = 'block';
      initDiv.innerHTML = ticket.imageUrls.map(url => `
        <img src="${url}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px; border: 1px solid var(--border-color); cursor: pointer;" onclick="window.open('${url}', '_blank')" />
      `).join('');
    } else {
      initContainer.style.display = 'none';
      initDiv.innerHTML = '';
    }

    customerInfoModal.classList.add('active');
  }
  
  document.getElementById('close-customer-info-modal').addEventListener('click', () => customerInfoModal.classList.remove('active'));
  document.getElementById('btn-close-customer-info').addEventListener('click', () => customerInfoModal.classList.remove('active'));

  // --- Notes Modal Logic ---
  const notesModal = document.getElementById('notes-modal');
  const notesTextArea = document.getElementById('ticket-notes-text');
  const notesIdInput = document.getElementById('notes-ticket-id');

  function openNotesModal(ticketId) {
    const ticket = allTickets.find(t => t.$id === ticketId);
    if (!ticket) return;
    notesIdInput.value = ticket.$id;
    notesTextArea.value = ticket.notes || '';
    
    // Update label to feature the specific technician's name
    const techName = ticket.technicianName || 'Unassigned Technician';
    document.getElementById('notes-modal-label').textContent = `${techName} & Admin Exchange`;
    
    // Mark as read in Local Storage immediately upon opening
    if (typeof ticket.notes === 'string' && ticket.notes !== 'null') {
      localStorage.setItem('ticket_note_read_' + ticket.$id, ticket.notes);
      const dot = document.querySelector(`button[data-notes="${ticket.$id}"] .red-dot-indicator`);
      if (dot) dot.remove();
    }
    
    notesModal.classList.add('active');
  }

  function closeNotesModal() {
    notesModal.classList.remove('active');
  }

  document.getElementById('close-notes-modal').addEventListener('click', closeNotesModal);
  document.getElementById('cancel-notes-btn').addEventListener('click', (e) => {
    e.preventDefault();
    closeNotesModal();
  });

  document.getElementById('save-notes-btn').addEventListener('click', async (e) => {
    e.preventDefault();
    const id = notesIdInput.value;
    const saveBtn = document.getElementById('save-notes-btn');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';
    try {
      const finalNote = notesTextArea.value.trim();
      await ticketService.updateTicket(id, { notes: finalNote });
      showToast('Notes saved successfully', 'success');
      
      // Admin just authored this note state, mark it as read for themselves
      localStorage.setItem('ticket_note_read_' + id, finalNote);
      
      closeNotesModal();
      loadTickets(currentPage); // preserve pagination
    } catch (err) {
      console.error(err);
      showToast('Failed to save notes', 'error');
    } finally {
      saveBtn.disabled = false;
      saveBtn.innerHTML = '<span class="material-icons-outlined" style="font-size:16px;">save</span> Save Note';
    }
  });

}
