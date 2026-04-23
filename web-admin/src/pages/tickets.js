import { formatDate, statusBadge, showToast, showConfirm } from '../components/ui-helpers.js';
import { ticketService } from '../services/ticket.service.js';

export function renderTicketsPage() {
  return `
    <div class="card glass-card" style="margin-bottom: 24px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; padding: 24px 24px 0 24px;">
        <h2 class="card-title" style="margin:0;">Repair Tickets</h2>
        <div style="display: flex; gap: 12px; align-items: center;">
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

      <div class="table-container" style="min-height: 400px; display: flex; flex-direction: column;">
        <div id="tickets-loading" class="spinner" style="margin: 40px auto; display: none;"></div>
        
        <table class="data-table" id="tickets-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Customer</th>
              <th>Issue</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Repaired by</th>
              <th>Proof</th>
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
      <div class="modal" style="max-width: 500px;">
        <div class="modal-header">
          <h3 id="ticket-modal-title">Create Ticket</h3>
          <button class="modal-close" id="close-ticket-modal">✕</button>
        </div>
        <form id="ticket-form" class="modal-body">
          <input type="hidden" id="ticket-id" />
          
          <div class="form-group" id="customer-select-container">
            <label class="form-label">Select Customer <span class="required">*</span></label>
            <select class="form-select" id="ticket-customer" required>
              <option value="">Loading customers...</option>
            </select>
          </div>
          
          <div class="form-group" id="customer-readonly-container" style="display: none;">
            <label class="form-label">Customer</label>
            <input type="text" class="form-input" id="ticket-customer-readonly" readonly disabled />
          </div>

          <div class="form-group">
            <label class="form-label">Issue Description <span class="required">*</span></label>
            <textarea class="form-textarea" id="ticket-issue" required placeholder="Describe the issue" style="min-height: 80px;"></textarea>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Priority</label>
              <select class="form-select" id="ticket-priority">
                <option value="low">Low</option>
                <option value="medium" selected>Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Status</label>
              <select class="form-select" id="ticket-status">
                <option value="pending" selected>Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

        </form>
        <div class="modal-footer">
          <button class="btn btn-ghost" id="cancel-ticket-btn">Cancel</button>
          <button class="btn btn-primary" id="save-ticket-btn">Save Ticket</button>
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
            <label class="form-label">Technician & Admin Exchange</label>
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
  const customerSelect = document.getElementById('ticket-customer');
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
      customerSelect.innerHTML = `<option value="">Select a customer</option>` + 
        allCustomers.map(c => `<option value="${c.userId || c.$id}">${c.firstName || ''} ${c.lastName || ''} - ${c.userId || c.$id}</option>`).join('');
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
        // Build Proof Button
        let proofHtml = '<span style="color:var(--text-muted);">—</span>';
        if (ticket.imageUrls && Array.isArray(ticket.imageUrls) && ticket.imageUrls.length > 0) {
          // Parse image URL (they are stored as JSON strings usually, but if it's array we grab the last one)
          const imgUrl = ticket.imageUrls[ticket.imageUrls.length - 1];
          proofHtml = `
            <a href="${imgUrl}" target="_blank" class="btn btn-ghost btn-sm" style="color:var(--accent-blue); display:flex; align-items:center; gap:4px; padding:4px 8px;">
              <span class="material-icons-outlined" style="font-size:16px;">image</span> View
            </a>
          `;
        }

        // Priority Badge helper
        const priorityColors = { low: 'gray', medium: 'var(--accent-amber)', high: 'var(--accent-rose)', critical: 'red' };
        const pColor = priorityColors[ticket.priority] || 'gray';
        const pBadge = `<span style="color:${pColor}; font-weight:600; text-transform:capitalize;">${ticket.priority || 'medium'}</span>`;

        return `
          <tr class="hover-row">
            <td>${formatDate(ticket.$createdAt)}</td>
            <td style="font-weight: 500;">
              ${ticket.customerName || 'Unknown'} 
              <div style="font-size:0.75rem; color:var(--text-muted);">${ticket.customerId}</div>
            </td>
            <td style="max-width: 250px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${ticket.issueDescription || ticket.issue || ''}">
              ${ticket.issueDescription || ticket.issue || '—'}
            </td>
            <td>${pBadge}</td>
            <td>${statusBadge(ticket.status || 'pending')}</td>
            <td>${ticket.technicianName || '<span style="color:var(--text-muted); font-style:italic;">Unassigned</span>'}</td>
            <td>${proofHtml}</td>
            <td>
              <div class="table-actions" style="display:flex; align-items:center; gap:4px;">
                <button class="btn btn-ghost btn-sm btn-icon" title="Notes" data-notes="${ticket.$id}" style="color:var(--accent-purple); position:relative;">
                  <span class="material-icons-outlined" style="font-size:18px;">chat_bubble_outline</span>
                  ${(typeof ticket.notes === 'string' && ticket.notes !== 'null' && ticket.notes.trim().length > 0) ? '<div style="position:absolute; top:4px; right:4px; width:8px; height:8px; background:var(--accent-rose); border-radius:50%; box-shadow:0 0 0 2px var(--bg-card);"></div>' : ''}
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
    }

    // Pagination controls
    infoStr.textContent = `Page ${currentPage}`;
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = !hasMore;
  }

  // Handle pagination
  prevBtn.addEventListener('click', () => hasMore ? loadTickets(currentPage - 1) : loadTickets(currentPage - 1));
  nextBtn.addEventListener('click', () => loadTickets(currentPage + 1));
  
  // Refresh manually
  document.getElementById('refresh-tickets-btn').addEventListener('click', () => loadTickets(1));
  
  // Filter change triggers re-fetch
  document.getElementById('filter-ticket-status').addEventListener('change', () => loadTickets(1));

  // Modals
  document.getElementById('add-ticket-btn').addEventListener('click', () => openTicketModal());
  
  function openTicketModal(ticketId = null) {
    if (ticketId) {
      // Editing
      const ticket = allTickets.find(t => t.$id === ticketId);
      if (!ticket) return;

      modalTitle.textContent = 'Edit/Assign Ticket';
      idInput.value = ticket.$id;
      
      customerSelectContainer.style.display = 'none';
      customerReadonlyContainer.style.display = 'block';
      customerReadonly.value = ticket.customerName || ticket.customerId;
      
      issueInput.value = ticket.issueDescription || ticket.issue || '';
      prioritySelect.value = ticket.priority || 'medium';
      statusSelect.value = ticket.status || 'pending';
    } else {
      // Creating new
      form.reset();
      modalTitle.textContent = 'Create Ticket';
      idInput.value = '';
      
      customerSelectContainer.style.display = 'block';
      customerReadonlyContainer.style.display = 'none';
      customerSelect.value = '';
      prioritySelect.value = 'medium';
      statusSelect.value = 'pending';
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
      if (!customerSelect.value) { showToast('Please select a customer', 'warning'); return; }
      if (!issueInput.value.trim()) { showToast('Please describe the issue', 'warning'); return; }
      
      customerId = customerSelect.value;
      const cObj = allCustomers.find(c => (c.userId || c.$id) === customerId);
      customerName = cObj ? `${cObj.firstName || ''} ${cObj.lastName || ''}`.trim() : customerId;
    }

    const payload = {
      priority: prioritySelect.value,
      status: statusSelect.value,
    };
    
    // For Issue payload on new/edit
    if (isNew) {
      payload.customerId = customerId;
      payload.customerName = customerName;
      payload.issueDescription = issueInput.value.trim();
    } else {
      payload.issueDescription = issueInput.value.trim();
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
      loadTickets(1); // Reload data
    } catch (err) {
      console.error(err);
      showToast('Failed to save ticket', 'error');
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Ticket';
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

  // --- Notes Modal Logic ---
  const notesModal = document.getElementById('notes-modal');
  const notesTextArea = document.getElementById('ticket-notes-text');
  const notesIdInput = document.getElementById('notes-ticket-id');

  function openNotesModal(ticketId) {
    const ticket = allTickets.find(t => t.$id === ticketId);
    if (!ticket) return;
    notesIdInput.value = ticket.$id;
    notesTextArea.value = ticket.notes || '';
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
      await ticketService.updateTicket(id, { notes: notesTextArea.value.trim() });
      showToast('Notes saved successfully', 'success');
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
