import { formatCurrency, formatDate, showToast, openModal, closeModal, skeletonRows } from '../components/ui-helpers.js';
import { printBillings } from '../services/print.service.js';

// Status dropdown options
const BILLING_STATUSES = [
  { value: 'not_yet_paid', label: 'Not Yet Paid', color: 'var(--accent-amber)' },
  { value: 'already_paid', label: 'Already Paid', color: 'var(--accent-emerald)' },
  { value: 'payment_confirmation', label: 'Payment Confirmation', color: 'var(--accent-purple)' },
];

function getStatusColor(status) {
  const found = BILLING_STATUSES.find(s => s.value === status);
  return found ? found.color : 'var(--text-muted)';
}

function getStatusLabel(status) {
  const found = BILLING_STATUSES.find(s => s.value === status);
  return found ? found.label : status;
}

/**
 * Billing Page
 */
export function renderBillingPage() {
  return `
    <!-- Toolbar -->
    <div class="toolbar">
      <div class="toolbar-left">
        <div class="search-bar" style="max-width:320px; flex:1;">
          <span class="search-icon"><span class="material-icons-outlined" style="font-size:18px;">search</span></span>
          <input type="text" placeholder="Search customers..." id="billing-search">
        </div>
      </div>
      <div class="toolbar-right" style="display:flex; gap:8px;">
        <button class="btn btn-ghost" id="generate-billing-btn" style="border-color:var(--accent-emerald); color:var(--accent-emerald);">
          <span class="material-icons-outlined" style="font-size:16px;">auto_fix_high</span> Generate Monthly Billing
        </button>
      </div>
    </div>

    <!-- Billing Data Card -->
    <div class="card billing-data-card">
      <div class="billing-data-header">
        <span style="font-weight:600; font-size:0.9rem; color:var(--text-primary);">Billing Data</span>
      </div>
      <!-- Print Buttons Row -->
      <div class="billing-action-row">
        <button class="billing-action-btn" id="btn-print-dot">
          <span class="material-icons-outlined">print</span> Dot Matrix Selected
        </button>
        <button class="billing-action-btn" id="btn-print-a4">
          <span class="material-icons-outlined">print</span> A4 Selected
        </button>
        <button class="billing-action-btn" id="btn-print-thermal">
          <span class="material-icons-outlined">print</span> Thermal Selected
        </button>
        <button class="billing-action-btn billing-action-btn-danger" id="btn-print-all">
          <span class="material-icons-outlined">print</span> All
        </button>
        <button class="billing-action-btn" id="btn-print-small">
          <span class="material-icons-outlined">print</span> Small Selected
        </button>
      </div>
      <!-- Pay / Delete Row -->
      <div class="billing-action-row" style="margin-top:8px;">
        <button class="billing-action-btn billing-action-btn-success" id="btn-pay-selected">
          <span class="material-icons-outlined">check_circle</span> Pay Selected
        </button>
        <button class="billing-action-btn billing-action-btn-danger-outline" id="btn-delete-selected">
          <span class="material-icons-outlined">delete</span> Delete Selected
        </button>
        <span class="selected-count" id="selected-count" style="margin-left:auto;">0 selected</span>
      </div>
    </div>

    <!-- Billing Table -->
    <div class="table-container">
      <table class="data-table" id="billing-table">
        <thead>
          <tr>
            <th style="width:40px;"><input type="checkbox" id="billing-select-all" title="Select all"></th>
            <th>Customer</th>
            <th>Month</th>
            <th>Amount</th>
            <th>Due Date</th>
            <th>Paid Date</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody id="billing-tbody">
          ${skeletonRows(8, 5)}
        </tbody>
      </table>
    </div>

    <!-- Entry count -->
    <div style="padding:8px 4px; font-size:0.8rem; color:var(--text-muted);" id="billing-entry-count"></div>

    <!-- Add Billing Modal -->
    <div class="modal-overlay" id="billing-modal">
      <div class="modal">
        <div class="modal-header">
          <h3>Add Billing Record</h3>
          <button class="modal-close" id="close-billing-modal">✕</button>
        </div>
        <div class="modal-body">
          <form id="billing-form">
            <div class="form-group">
              <label class="form-label">Customer *</label>
              <select class="form-input" id="bill-customerId" required>
                <option value="" disabled selected>Select a customer...</option>
              </select>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Billing Month *</label>
                <input type="month" class="form-input" id="bill-month" required>
              </div>
              <div class="form-group">
                <label class="form-label">Amount (₱) *</label>
                <input type="number" class="form-input" id="bill-amount" required min="0" step="0.01" placeholder="999.00">
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Due Date *</label>
                <input type="date" class="form-input" id="bill-dueDate" required>
              </div>
              <div class="form-group">
                <label class="form-label">Status</label>
                <select class="form-select" id="bill-status">
                  <option value="not_yet_paid">Not Yet Paid</option>
                  <option value="already_paid">Already Paid</option>
                  <option value="payment_confirmation">Payment Confirmation</option>
                </select>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Notes</label>
              <textarea class="form-textarea" id="bill-notes" placeholder="Optional notes..."></textarea>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" id="cancel-billing-btn">Cancel</button>
          <button class="btn btn-primary" id="save-billing-btn">Save</button>
        </div>
      </div>
    </div>
  `;
}

/**
 * Init billing page
 */
export function initBillingPage(services, preFilter = null) {
  let allBillings = [];
  let currentFilter = preFilter || 'all';
  let searchQuery = '';

  // If preFilter, set the dropdown immediately
  const filterDropdown = document.getElementById('billing-status-filter');
  if (preFilter && filterDropdown) {
    filterDropdown.value = preFilter;
  }

  loadBillings();

  // Filter dropdown (may not exist on sub-pages)
  if (filterDropdown) {
    filterDropdown.addEventListener('change', (e) => {
      currentFilter = e.target.value;
      applyFilters();
    });
  }

  // Search
  let searchTimeout;
  document.getElementById('billing-search').addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      searchQuery = e.target.value.toLowerCase();
      applyFilters();
    }, 300);
  });

  // Add billing modal
  // Load customer dropdown for Add Billing
  let allCustomersForBilling = [];
  async function loadCustomerDropdown() {
    try {
      const res = await services.customer.getAll(100, 0);
      allCustomersForBilling = res.documents || [];
      const select = document.getElementById('bill-customerId');
      select.innerHTML = '<option value="" disabled selected>Select a customer...</option>' +
        allCustomersForBilling.map(c => {
          const name = `${c.firstName || ''} ${c.lastName || ''}`.trim();
          return `<option value="${c.userId || c.$id}" data-name="${name}">${name} (${c.phone || c.email || ''})</option>`;
        }).join('');
    } catch (e) {
      console.warn('Could not load customers for billing dropdown:', e);
    }
  }
  loadCustomerDropdown();

  // Close billing modal handlers
  document.getElementById('close-billing-modal').addEventListener('click', () => closeModal('billing-modal'));
  document.getElementById('cancel-billing-btn').addEventListener('click', () => closeModal('billing-modal'));

  // Close on overlay click
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.classList.remove('active');
    });
  });

  // Save billing
  document.getElementById('save-billing-btn').addEventListener('click', async () => {
    const form = document.getElementById('billing-form');
    if (!form.checkValidity()) { form.reportValidity(); return; }

    const custSelect = document.getElementById('bill-customerId');
    const selectedOption = custSelect.options[custSelect.selectedIndex];
    const customerName = selectedOption ? selectedOption.dataset.name || '' : '';

    const data = {
      customerId: custSelect.value,
      customerName: customerName,
      billingMonth: document.getElementById('bill-month').value,
      amount: parseFloat(document.getElementById('bill-amount').value),
      dueDate: new Date(document.getElementById('bill-dueDate').value).toISOString(),
      paymentStatus: document.getElementById('bill-status').value,
      notes: document.getElementById('bill-notes').value.trim(),
      paidDate: null,
      collectedBy: null,
      subscriptionId: '',
    };

    try {
      await services.billing.create(data);
      showToast('Billing record created!', 'success');
      closeModal('billing-modal');
      loadBillings();
    } catch (error) {
      // Demo: add locally
      allBillings.unshift({ ...data, $id: 'demo_' + Date.now(), id: 'demo_' + Date.now(), customerName: data.customerId });
      applyFilters();
      closeModal('billing-modal');
      showToast('Billing record added (demo)', 'success');
    }
  });

  // Generate monthly billing for all real customers
  const genBillingBtn = document.getElementById('generate-billing-btn');
  if (genBillingBtn) {
    genBillingBtn.addEventListener('click', () => {
      const month = new Date().toISOString().slice(0, 7);

      // Custom confirmation modal instead of native confirm()
      const modal = document.createElement('div');
      modal.className = 'modal-overlay active';
      modal.style.zIndex = '500';
      modal.innerHTML = `
        <div class="modal" style="max-width:420px;">
          <div class="modal-header">
            <h3>Generate Monthly Billing</h3>
            <button class="modal-close" id="close-gen-modal">✕</button>
          </div>
          <div class="modal-body" style="text-align:center; padding:24px;">
            <span class="material-icons-outlined" style="font-size:3rem; color:var(--accent-emerald); display:block; margin-bottom:12px;">auto_fix_high</span>
            <p style="color:var(--text-primary); font-weight:600; margin-bottom:4px;">Generate billing for all active customers?</p>
            <p style="color:var(--text-muted); font-size:0.85rem;">Billing month: <strong>${month}</strong></p>
            <p style="color:var(--text-muted); font-size:0.8rem; margin-top:8px;">This will create billing records for all customers with active subscriptions who don't yet have a record for this month.</p>
          </div>
          <div class="modal-footer" style="justify-content:center; gap:12px;">
            <button class="btn btn-ghost" id="cancel-gen-btn">Cancel</button>
            <button class="btn btn-primary" id="confirm-gen-btn" style="background:var(--accent-emerald); border-color:var(--accent-emerald);">
              <span class="material-icons-outlined" style="font-size:16px;">auto_fix_high</span> Generate
            </button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      modal.querySelector('#close-gen-modal').addEventListener('click', () => modal.remove());
      modal.querySelector('#cancel-gen-btn').addEventListener('click', () => modal.remove());
      modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

      modal.querySelector('#confirm-gen-btn').addEventListener('click', async () => {
        modal.remove();

        genBillingBtn.disabled = true;
        genBillingBtn.innerHTML = '<span class="material-icons-outlined" style="font-size:16px;">hourglass_empty</span> Generating...';

        try {
          // Try the subscription-based method first
          const results = await services.billing.generateMonthlyBilling(month);
          if (results.length > 0) {
            showToast(`Generated ${results.length} billing records!`, 'success');
            
            // Notify collectors
            try {
              const names = results.map(r => r.customerName || r.customerId).join(', ');
              const maxNames = names.length > 100 ? names.substring(0, 100) + '...' : names;
              const collectorsRes = await services.collector.getAll(100, 0);
              for (const col of (collectorsRes.documents || [])) {
                await services.mobileNotification.send(
                  col.$id,
                  'New Monthly Billing',
                  `New bills for: ${maxNames}`,
                  'update'
                );
              }
            } catch (err) {
              console.warn('Failed to notify collectors:', err);
            }
          } else {
            showToast('No new billing records needed — all customers already have bills for this month', 'info');
          }
          loadBillings();
        } catch (error) {
          console.error('Generate billing error:', error);
          // Fallback: generate for all customers directly
          try {
            const custRes = await services.customer.getAll(100, 0);
            const customers = custRes.documents || [];
            let created = 0;

            for (const c of customers) {
              const custId = c.userId || c.$id;
              const custName = `${c.firstName || ''} ${c.lastName || ''}`.trim();
              // Check if billing already exists for this month
              try {
                const existing = await services.billing.getByCustomer(custId);
                const hasThisMonth = (existing.documents || []).some(b => b.billingMonth === month);
                if (!hasThisMonth) {
                  // Try to get plan rate
                  let planRate = 0;
                  try {
                    if (c.planId) {
                      const plan = await services.plan.getById(c.planId);
                      planRate = plan?.monthlyRate || 0;
                    }
                  } catch (_) {}

                  const dueDate = new Date();
                  dueDate.setMonth(dueDate.getMonth() + 1);

                  await services.billing.create({
                    customerId: custId,
                    customerName: custName,
                    billingMonth: month,
                    amount: planRate,
                    dueDate: dueDate.toISOString(),
                    paymentStatus: 'not_yet_paid',
                    paidDate: null,
                    collectedBy: null,
                    subscriptionId: '',
                    notes: '',
                  });
                  created++;
                }
              } catch (custErr) {
                console.error('Failed to generate billing for', custId, custErr);
              }
            }

            showToast(created > 0 ? `Generated ${created} billing records!` : 'All customers already have billing for this month', created > 0 ? 'success' : 'info');
            
            if (created > 0) {
              // Notify collectors
              try {
                const collectorsRes = await services.collector.getAll(100, 0);
                for (const col of (collectorsRes.documents || [])) {
                  await services.mobileNotification.send(
                    col.$id,
                    'New Monthly Billing',
                    `Generated ${created} new billing record(s).`,
                    'update'
                  );
                }
              } catch (err) {
                console.warn('Failed to notify collectors:', err);
              }
            }
            
            loadBillings();
          } catch (e2) {
            console.error('Fallback generate failed:', e2);
            showToast('Could not generate billing — ' + (e2.message || 'check Appwrite connection'), 'danger');
          }
        }

        genBillingBtn.disabled = false;
        genBillingBtn.innerHTML = '<span class="material-icons-outlined" style="font-size:16px;">auto_fix_high</span> Generate Monthly Billing';
      });
    });
  }

  // Select All checkbox
  document.getElementById('billing-select-all').addEventListener('change', (e) => {
    document.querySelectorAll('.billing-row-check').forEach(cb => {
      cb.checked = e.target.checked;
    });
    updateSelectedCount();
  });

  // Pay Selected
  document.getElementById('btn-pay-selected').addEventListener('click', () => {
    const ids = [...document.querySelectorAll('.billing-row-check:checked')].map(cb => cb.dataset.billId);
    if (ids.length === 0) { showToast('No records selected', 'warning'); return; }

    const modal = document.createElement('div');
    modal.className = 'modal-overlay active';
    modal.style.zIndex = '500';
    modal.innerHTML = `
      <div class="modal" style="max-width:400px;">
        <div class="modal-header">
          <h3>Confirm Payment</h3>
          <button class="modal-close" id="close-pay-modal">✕</button>
        </div>
        <div class="modal-body" style="text-align:center; padding:24px;">
          <span class="material-icons-outlined" style="font-size:3rem; color:var(--accent-emerald); display:block; margin-bottom:12px;">payments</span>
          <p style="color:var(--text-primary); font-weight:600; margin-bottom:4px;">Mark ${ids.length} record(s) as Already Paid?</p>
          <p style="color:var(--text-muted); font-size:0.85rem;">This will update the payment status and set the paid date.</p>
        </div>
        <div class="modal-footer" style="justify-content:center; gap:12px;">
          <button class="btn btn-ghost" id="cancel-pay-btn">Cancel</button>
          <button class="btn btn-primary" id="confirm-pay-btn" style="background:var(--accent-emerald); border-color:var(--accent-emerald);">
            <span class="material-icons-outlined" style="font-size:16px;">check</span> Mark as Paid
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector('#close-pay-modal').addEventListener('click', () => modal.remove());
    modal.querySelector('#cancel-pay-btn').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

    modal.querySelector('#confirm-pay-btn').addEventListener('click', async () => {
      modal.remove();
      let successCount = 0;
      for (const id of ids) {
        try {
          await services.billing.updateStatus(id, 'already_paid', { paidDate: new Date().toISOString() });
          successCount++;
        } catch (err) {
          console.error('Pay error:', err);
        }
      }
      if (successCount > 0) {
        showToast(`${successCount} record(s) marked as paid`, 'success');
        document.getElementById('billing-select-all').checked = false;
        document.getElementById('selected-count').textContent = '0 selected';
        loadBillings();
      } else {
        showToast('Could not update records', 'danger');
      }
    });
  });

  // Delete Selected
  document.getElementById('btn-delete-selected').addEventListener('click', () => {
    const ids = [...document.querySelectorAll('.billing-row-check:checked')].map(cb => cb.dataset.billId);
    if (ids.length === 0) { showToast('No records selected', 'warning'); return; }

    // Custom confirmation modal instead of native confirm()
    const modal = document.createElement('div');
    modal.className = 'modal-overlay active';
    modal.style.zIndex = '500';
    modal.innerHTML = `
      <div class="modal" style="max-width:400px;">
        <div class="modal-header">
          <h3>Confirm Delete</h3>
          <button class="modal-close" id="close-del-modal">✕</button>
        </div>
        <div class="modal-body" style="text-align:center; padding:24px;">
          <span class="material-icons-outlined" style="font-size:3rem; color:var(--accent-rose); display:block; margin-bottom:12px;">delete_forever</span>
          <p style="color:var(--text-primary); font-weight:600; margin-bottom:4px;">Delete ${ids.length} billing record(s)?</p>
          <p style="color:var(--text-muted); font-size:0.85rem;">This action cannot be undone.</p>
        </div>
        <div class="modal-footer" style="justify-content:center; gap:12px;">
          <button class="btn btn-ghost" id="cancel-del-btn">Cancel</button>
          <button class="btn btn-primary" id="confirm-del-btn" style="background:var(--accent-rose); border-color:var(--accent-rose);">
            <span class="material-icons-outlined" style="font-size:16px;">delete</span> Delete
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector('#close-del-modal').addEventListener('click', () => modal.remove());
    modal.querySelector('#cancel-del-btn').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

    modal.querySelector('#confirm-del-btn').addEventListener('click', async () => {
      modal.remove();
      let successCount = 0;
      for (const id of ids) {
        try {
          await services.billing.delete(id);
          successCount++;
        } catch (err) {
          console.error('Delete error for ID', id, ':', err);
          showToast(`Delete failed: ${err.message || err}`, 'danger');
        }
      }
      if (successCount > 0) {
        showToast(`${successCount} record(s) deleted`, 'success');
        document.getElementById('billing-select-all').checked = false;
        document.getElementById('selected-count').textContent = '0 selected';
        loadBillings();
      } else {
        showToast('Could not delete records — check Appwrite permissions', 'danger');
      }
    });
  });

  // Print buttons — open actual print windows
  ['btn-print-dot', 'btn-print-a4', 'btn-print-thermal', 'btn-print-all', 'btn-print-small'].forEach(btnId => {
    document.getElementById(btnId).addEventListener('click', () => {
      if (btnId === 'btn-print-all') {
        // "All" prints every billing record in A4 format
        if (allBillings.length === 0) { showToast('No billing records to print', 'warning'); return; }
        printBillings(allBillings, 'a4');
        showToast(`Printing all ${allBillings.length} record(s)`, 'success');
        return;
      }
      const ids = [...document.querySelectorAll('.billing-row-check:checked')].map(cb => cb.dataset.billId);
      if (ids.length === 0) { showToast('Select records to print', 'warning'); return; }
      const selected = allBillings.filter(b => ids.includes(b.$id || b.id));
      const format = btnId.replace('btn-print-', '');
      printBillings(selected, format);
      showToast(`Printing ${ids.length} record(s) in ${format} format`, 'success');
    });
  });

  async function loadBillings() {
    try {
      const response = await services.billing.getAll(null, 100, 0);
      allBillings = response.documents || [];

      // Resolve customer names from users_profile if customerName is missing
      if (allBillings.length > 0) {
        try {
          const customerRes = await services.customer.getAll(100, 0);
          const customers = customerRes.documents || [];
          const customerMap = {};
          customers.forEach(c => {
            customerMap[c.userId] = `${c.firstName || ''} ${c.lastName || ''}`.trim();
            customerMap[c.$id] = `${c.firstName || ''} ${c.lastName || ''}`.trim();
          });

          allBillings.forEach(b => {
            if (!b.customerName && b.customerId) {
              b.customerName = customerMap[b.customerId] || b.customerId;
            }
          });
        } catch (e) {
          console.warn('Could not resolve customer names:', e);
        }
      }

      applyFilters();
    } catch (error) {
      console.warn('Could not load billings from Appwrite:', error.message);
      allBillings = [];
      applyFilters();
    }
  }

  function applyFilters() {
    let filtered = allBillings;

    // Status filter
    if (currentFilter !== 'all') {
      filtered = filtered.filter(b => b.paymentStatus === currentFilter);
    }

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(b =>
        (b.customerName || b.customerId || '').toLowerCase().includes(searchQuery)
      );
    }

    renderBillingTable(filtered);
  }

  function renderBillingTable(billings) {
    const tbody = document.getElementById('billing-tbody');
    if (!billings || billings.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8">
        <div class="empty-state">
          <div class="empty-icon"><span class="material-icons-outlined" style="font-size:3rem;">credit_card</span></div>
          <div class="empty-title">No billing records found</div>
          <div class="empty-text">Click "Generate Monthly Billing" to create records for all active customers.</div>
        </div>
      </td></tr>`;
      updateEntryCount(0);
      return;
    }

    tbody.innerHTML = billings.map(b => {
      // Build the status dropdown for this row
      const statusOptions = BILLING_STATUSES.map(s =>
        `<option value="${s.value}" ${b.paymentStatus === s.value ? 'selected' : ''}>${s.label}</option>`
      ).join('');

      const statusColor = getStatusColor(b.paymentStatus);

      return `
      <tr>
        <td style="width:40px;"><input type="checkbox" class="billing-row-check" data-bill-id="${b.$id || b.id}"></td>
        <td style="color:var(--text-primary); font-weight:500;">${b.customerName || b.customerId?.substring(0, 12) || '—'}</td>
        <td>${(() => {
          if (!b.billingMonth) return '—';
          try {
            const [y, m] = b.billingMonth.split('-');
            let d = new Date(y, parseInt(m) - 1, 1);
            // If we have the exact creation date, use that to show the start day
            if (b.$createdAt) {
               d = new Date(b.$createdAt);
            }
            return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
          } catch(e) { return b.billingMonth; }
        })()}</td>
        <td style="font-weight:600;">${formatCurrency(b.amount)}</td>
        <td>${formatDate(b.dueDate)}</td>
        <td>${b.paidDate ? formatDate(b.paidDate) : '—'}</td>
        <td>
          <select class="status-dropdown-inline" data-billing-id="${b.$id || b.id}" 
            style="color:${statusColor};">
            ${statusOptions}
          </select>
        </td>
        <td>
          <div class="table-actions">
            <button class="btn btn-ghost btn-sm btn-icon" data-print-bill="${b.$id || b.id}" title="Print" style="color:var(--text-secondary);"><span class="material-icons-outlined" style="font-size:18px;">print</span></button>
            <button class="btn btn-ghost btn-sm btn-icon" data-view-bill="${b.$id || b.id}" title="View" style="color:var(--accent-blue);"><span class="material-icons-outlined" style="font-size:18px;">visibility</span></button>
            <button class="btn btn-ghost btn-sm btn-icon" data-delete-bill="${b.$id || b.id}" title="Delete" style="color:var(--accent-rose);"><span class="material-icons-outlined" style="font-size:18px;">delete</span></button>
          </div>
        </td>
      </tr>`;
    }).join('');

    // Entry count
    updateEntryCount(billings.length);

    // Checkbox handlers
    tbody.querySelectorAll('.billing-row-check').forEach(cb => {
      cb.addEventListener('change', updateSelectedCount);
    });

    // Status dropdown change handler
    tbody.querySelectorAll('.status-dropdown-inline').forEach(select => {
      select.addEventListener('change', async (e) => {
        const billingId = e.target.dataset.billingId;
        const newStatus = e.target.value;
        const statusColor = getStatusColor(newStatus);

        // Update dropdown styling
        e.target.style.borderColor = statusColor;
        e.target.style.color = statusColor;

        try {
          const additionalData = {};
          if (newStatus === 'already_paid') {
            additionalData.paidDate = new Date().toISOString();
          } else {
            // explicitly clear paid date if marked unpaid
            additionalData.paidDate = null;
          }
          await services.billing.updateStatus(billingId, newStatus, additionalData);
          showToast(`Status updated to "${getStatusLabel(newStatus)}"`, 'success');
          loadBillings();
        } catch (error) {
          showToast(`Error updating status: ` + error.message, 'danger');
          applyFilters(); // Revert UI dropdown
        }
      });
    });

    // Per-row Print button — show Print Invoice modal
    tbody.querySelectorAll('[data-print-bill]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const b = allBillings.find(x => (x.$id || x.id) === btn.dataset.printBill);
        if (!b) return;

        const modal = document.createElement('div');
        modal.className = 'modal-overlay active';
        modal.style.zIndex = '400';
        modal.innerHTML = `
          <div class="modal" style="max-width:420px;">
            <div class="modal-header">
              <h3>Print Invoice</h3>
              <button class="modal-close" id="close-print-modal">✕</button>
            </div>
            <div class="modal-body" style="text-align:center;">
              <p style="color:var(--text-muted); font-size:0.85rem; margin-bottom:20px;">Select Paper Size</p>
              <div style="display:flex; flex-wrap:wrap; gap:12px; justify-content:center;">
                <button class="btn btn-primary print-size-btn" data-fmt="a4" style="min-width:100px;">
                  <span class="material-icons-outlined" style="font-size:16px;">description</span> A4
                </button>
                <button class="btn btn-ghost print-size-btn" data-fmt="thermal" style="min-width:100px; border:1px solid var(--border-color-hover);">
                  <span class="material-icons-outlined" style="font-size:16px;">receipt_long</span> Thermal
                </button>
                <button class="btn btn-ghost print-size-btn" data-fmt="dot" style="min-width:100px; border:1px solid var(--border-color-hover);">
                  <span class="material-icons-outlined" style="font-size:16px;">grid_on</span> Dot Matrix
                </button>
                <button class="btn btn-ghost print-size-btn" data-fmt="small" style="min-width:100px; border:1px solid var(--border-color-hover);">
                  <span class="material-icons-outlined" style="font-size:16px;">receipt</span> Small
                </button>
              </div>
            </div>
            <div class="modal-footer" style="justify-content:center;">
              <button class="btn btn-ghost" id="cancel-print-modal" style="color:var(--accent-rose);">Cancelled</button>
            </div>
          </div>
        `;
        document.body.appendChild(modal);

        // Format button clicks
        modal.querySelectorAll('.print-size-btn').forEach(item => {
          item.addEventListener('click', () => {
            printBillings([b], item.dataset.fmt);
            showToast(`Printing in ${item.textContent.trim()} format`, 'success');
            modal.remove();
          });
        });

        // Close handlers
        modal.querySelector('#close-print-modal').addEventListener('click', () => modal.remove());
        modal.querySelector('#cancel-print-modal').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (ev) => { if (ev.target === modal) modal.remove(); });
      });
    });

    // Per-row View button
    tbody.querySelectorAll('[data-view-bill]').forEach(btn => {
      btn.addEventListener('click', () => {
        const b = allBillings.find(x => (x.$id || x.id) === btn.dataset.viewBill);
        if (!b) return;
        const statusColor = getStatusColor(b.paymentStatus);
        const modal = document.createElement('div');
        modal.className = 'modal-overlay active';
        modal.style.zIndex = '300';
        modal.innerHTML = `
          <div class="modal">
            <div class="modal-header">
              <h3>Billing Details</h3>
              <button class="modal-close" id="close-view-modal">✕</button>
            </div>
            <div class="modal-body">
              <table style="width:100%; font-size:0.85rem;">
                <tr><td style="padding:8px 0; color:var(--text-muted); width:140px;">Customer</td><td style="padding:8px 0; font-weight:600; color:var(--text-primary);">${b.customerName || b.customerId || '—'}</td></tr>
                <tr><td style="padding:8px 0; color:var(--text-muted);">Billing Month</td><td style="padding:8px 0;">${b.billingMonth || '—'}</td></tr>
                <tr><td style="padding:8px 0; color:var(--text-muted);">Amount</td><td style="padding:8px 0; font-weight:700; font-size:1.1rem;">${formatCurrency(b.amount)}</td></tr>
                <tr><td style="padding:8px 0; color:var(--text-muted);">Status</td><td style="padding:8px 0;"><span style="color:${statusColor}; font-weight:600;">${getStatusLabel(b.paymentStatus)}</span></td></tr>
                <tr><td style="padding:8px 0; color:var(--text-muted);">Due Date</td><td style="padding:8px 0;">${formatDate(b.dueDate)}</td></tr>
                <tr><td style="padding:8px 0; color:var(--text-muted);">Paid Date</td><td style="padding:8px 0;">${b.paidDate ? formatDate(b.paidDate) : '—'}</td></tr>
              </table>
            </div>
            <div class="modal-footer">
              <button class="btn btn-ghost" id="close-view-btn">Close</button>
              <button class="btn btn-primary" id="print-view-btn"><span class="material-icons-outlined" style="font-size:16px;">print</span> Print</button>
            </div>
          </div>
        `;
        document.body.appendChild(modal);
        modal.querySelector('#close-view-modal').addEventListener('click', () => modal.remove());
        modal.querySelector('#close-view-btn').addEventListener('click', () => modal.remove());
        modal.querySelector('#print-view-btn').addEventListener('click', () => { printBillings([b], 'a4'); });
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
      });
    });

    // Delete billing
    tbody.querySelectorAll('[data-delete-bill]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.deleteBill;
        const b = allBillings.find(x => (x.$id || x.id) === id);
        const customerLabel = b ? (b.customerName || b.customerId || id) : id;

        const modal = document.createElement('div');
        modal.className = 'modal-overlay active';
        modal.style.zIndex = '500';
        modal.innerHTML = `
          <div class="modal" style="max-width:400px;">
            <div class="modal-header">
              <h3>Delete Billing Record</h3>
              <button class="modal-close" id="close-row-del">✕</button>
            </div>
            <div class="modal-body" style="text-align:center; padding:24px;">
              <span class="material-icons-outlined" style="font-size:3rem; color:var(--accent-rose); display:block; margin-bottom:12px;">delete_forever</span>
              <p style="color:var(--text-primary); font-weight:600; margin-bottom:4px;">Delete this billing record?</p>
              <p style="color:var(--text-muted); font-size:0.85rem;">${customerLabel} — ${b?.billingMonth || ''}</p>
            </div>
            <div class="modal-footer" style="justify-content:center; gap:12px;">
              <button class="btn btn-ghost" id="cancel-row-del">Cancel</button>
              <button class="btn btn-primary" id="confirm-row-del" style="background:var(--accent-rose); border-color:var(--accent-rose);">
                <span class="material-icons-outlined" style="font-size:16px;">delete</span> Delete
              </button>
            </div>
          </div>
        `;
        document.body.appendChild(modal);

        modal.querySelector('#close-row-del').addEventListener('click', () => modal.remove());
        modal.querySelector('#cancel-row-del').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

        modal.querySelector('#confirm-row-del').addEventListener('click', async () => {
          modal.remove();
          try {
            await services.billing.delete(id);
            showToast('Billing record deleted', 'success');
            loadBillings();
          } catch (error) {
            console.error('Row delete error:', error);
            showToast('Error deleting: ' + (error.message || error), 'danger');
          }
        });
      });
    });
  }

  function updateEntryCount(count) {
    const el = document.getElementById('billing-entry-count');
    if (el) el.textContent = `Showing ${count} of ${allBillings.length} entries`;
  }

  function getSelectedIds() {
    return [...document.querySelectorAll('.billing-row-check:checked')].map(cb => cb.dataset.billId);
  }

  function updateSelectedCount() {
    const count = getSelectedIds().length;
    const el = document.getElementById('selected-count');
    if (el) el.textContent = `${count} selected`;
  }
}

function getDemoBillings() {
  return [
    { id: 'b1', $id: 'b1', customerName: 'Juan Dela Cruz', customerId: 'usr1', billingMonth: '2026-03', amount: 999, paymentStatus: 'not_yet_paid', dueDate: '2026-03-15', paidDate: null, notes: '' },
    { id: 'b2', $id: 'b2', customerName: 'Maria Santos', customerId: 'usr2', billingMonth: '2026-03', amount: 1499, paymentStatus: 'already_paid', dueDate: '2026-03-15', paidDate: '2026-03-10', notes: '' },
    { id: 'b3', $id: 'b3', customerName: 'Pedro Reyes', customerId: 'usr3', billingMonth: '2026-03', amount: 699, paymentStatus: 'not_yet_paid', dueDate: '2026-03-15', paidDate: null, notes: 'Pending collection' },
    { id: 'b4', $id: 'b4', customerName: 'Ana Garcia', customerId: 'usr4', billingMonth: '2026-03', amount: 999, paymentStatus: 'payment_confirmation', dueDate: '2026-03-30', paidDate: null, notes: 'Waiting for confirmation' },
    { id: 'b5', $id: 'b5', customerName: 'Jose Rivera', customerId: 'usr5', billingMonth: '2026-03', amount: 1499, paymentStatus: 'already_paid', dueDate: '2026-03-15', paidDate: '2026-03-14', notes: '' },
    { id: 'b6', $id: 'b6', customerName: 'Rosa Mabini', customerId: 'usr6', billingMonth: '2026-03', amount: 699, paymentStatus: 'not_yet_paid', dueDate: '2026-03-15', paidDate: null, notes: '' },
    { id: 'b7', $id: 'b7', customerName: 'Carlo Mendoza', customerId: 'usr7', billingMonth: '2026-02', amount: 999, paymentStatus: 'payment_confirmation', dueDate: '2026-02-15', paidDate: null, notes: 'Sent proof of payment' },
    { id: 'b8', $id: 'b8', customerName: 'Elena Cruz', customerId: 'usr8', billingMonth: '2026-03', amount: 999, paymentStatus: 'not_yet_paid', dueDate: '2026-03-10', paidDate: null, notes: '' },
  ];
}
