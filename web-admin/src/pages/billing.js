import { formatCurrency, formatDate, showToast, openModal, closeModal, skeletonRows } from '../components/ui-helpers.js';
import { printBillings, getReceiptPreviewHtml } from '../services/print.service.js';
import html2canvas from 'html2canvas';

// Status dropdown options
const BILLING_STATUSES = [
  { value: 'not_yet_paid', label: 'Not Yet Paid', color: 'var(--accent-amber)' },
  { value: 'already_paid', label: 'Already Paid', color: 'var(--accent-emerald)' },
  { value: 'overdue', label: 'Overdue', color: 'var(--accent-rose)' },
];

function getStatusColor(status) {
  const found = BILLING_STATUSES.find(s => s.value === status);
  return found ? found.color : 'var(--text-muted)';
}

function getStatusLabel(status) {
  const found = BILLING_STATUSES.find(s => s.value === status);
  return found ? found.label : status;
}

function getCustomerFacebookUrl(customerId, customersList) {
  const c = (customersList || []).find(x => (x.userId || x.$id) === customerId);
  return c ? (c.facebookUrl || '') : '';
}

function buildReceiptModal(billingData, customersList) {
  const fbUrl = getCustomerFacebookUrl(billingData.customerId, customersList) || '';
  return `
    <div class="modal" style="max-width: 400px; background: transparent; box-shadow: none;">
      <div class="receipt-capture-area" style="background: var(--bg-panel); border-radius: 12px; padding: 24px; margin-bottom: 16px; border: 1px solid var(--border-color-hover);">
         ${getReceiptPreviewHtml(billingData)}
      </div>
      <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
        <button class="btn btn-ghost receipt-close-btn" style="background: var(--bg-panel); color: var(--text-primary); border-radius: 20px; border: 1px solid var(--border-color-hover);">Close</button>
        <button class="btn btn-ghost receipt-share-btn" data-fb-url="${fbUrl}" style="background: rgba(59,130,246,0.1); color: var(--accent-blue); border-radius: 20px; border: 1px solid rgba(59,130,246,0.3);">
          <span class="material-icons-outlined" style="font-size: 18px;">open_in_new</span> Share
        </button>
        <button class="btn btn-primary receipt-print-btn" style="border-radius: 20px; background: var(--accent-emerald); border-color: var(--accent-emerald);">
          <span class="material-icons-outlined" style="font-size: 18px;">print</span> Print
        </button>
      </div>
    </div>
  `;
}

function showReceiptModal(billingData, customersList, autoShare = false) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.style.zIndex = '400';
  modal.innerHTML = buildReceiptModal(billingData, customersList);
  document.body.appendChild(modal);

  void modal.offsetWidth;
  modal.classList.add('active');

  const closeReceiptModal = () => {
    modal.classList.remove('active');
    setTimeout(() => modal.remove(), 400);
  };

  modal.querySelector('.receipt-close-btn').addEventListener('click', closeReceiptModal);
  modal.querySelector('.receipt-print-btn').addEventListener('click', () => printBillings([billingData]));
  const shareBtn = modal.querySelector('.receipt-share-btn');
  if (shareBtn) {
    shareBtn.addEventListener('click', async () => {
      const fbUrl = shareBtn.dataset.fbUrl;
      const captureArea = modal.querySelector('.receipt-capture-area');
      
      const originalText = shareBtn.innerHTML;
      shareBtn.innerHTML = '<span class="material-icons-outlined" style="font-size: 18px;">hourglass_empty</span> Copying...';
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
            showToast('Failed to copy receipt to clipboard.', 'danger');
          } finally {
            shareBtn.innerHTML = originalText;
            shareBtn.style.opacity = '1';
            shareBtn.disabled = false;
          }
        }, 'image/png');
      } catch (err) {
        console.error('Canvas capture error:', err);
        showToast('Failed to generate receipt image.', 'danger');
        shareBtn.innerHTML = originalText;
        shareBtn.style.opacity = '1';
        shareBtn.disabled = false;
      }
    });

    if (autoShare) {
      // Small delay to ensure modal is rendered and painted by the browser
      setTimeout(() => {
        shareBtn.click();
      }, 50);
    }
  }
  modal.addEventListener('click', (ev) => { if (ev.target === modal) closeReceiptModal(); });
  return modal;
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
      </div>
    </div>

    <!-- Billing Data Card -->
    <div class="card billing-data-card">
      <div class="billing-data-header">
        <span style="font-weight:600; font-size:0.9rem; color:var(--text-primary);">Billing Data</span>
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
            <th>Plan Tier</th>
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
                  <option value="overdue">Overdue</option>
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

  // Auto-generate any missing bills for existing customers (once per session, same guard as dashboard)
  if (services.billing.autoGenerateBills && !sessionStorage.getItem('autoBillingDone')) {
    sessionStorage.setItem('autoBillingDone', '1');
    services.billing.autoGenerateBills().then(result => {
      if (result.generated > 0) {
        showToast(`Auto-generated ${result.generated} new billing record(s)`, 'success');
        loadBillings(); // Refresh table
      }
    }).catch(err => console.warn('autoGenerateBills error:', err));
  }

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
      console.error('Failed to create manual bill:', error);
      showToast('Could not create billing record', 'danger');
    }
  });

  // Removed Generate Monthly Billing manually -> waiting for automated recurring architecture logic.

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
    modal.className = 'modal-overlay';
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

    void modal.offsetWidth;
    modal.classList.add('active');

    const closePayModal = () => {
      modal.classList.remove('active');
      setTimeout(() => modal.remove(), 400);
    };

    modal.querySelector('#close-pay-modal').addEventListener('click', closePayModal);
    modal.querySelector('#cancel-pay-btn').addEventListener('click', closePayModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closePayModal(); });

    modal.querySelector('#confirm-pay-btn').addEventListener('click', async () => {
      closePayModal();
      let successCount = 0;
      for (const id of ids) {
        try {
          const b = allBillings.find(x => (x.$id || x.id) === id);
          const planAmt = b ? (b.amount || 0) : 0;
          await services.billing.updateStatus(id, 'already_paid', { 
            paidDate: new Date().toISOString(),
            amountPaid: planAmt,
            collectedBy: 'Admin'
          });

          // Send notification to collector
          if (b && b.customerId) {
            services.billing.notifyCollectorPayment(b.customerId, planAmt, b.customerName);
          }

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
    modal.className = 'modal-overlay';
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

    void modal.offsetWidth;
    modal.classList.add('active');

    const closeDelModal = () => {
      modal.classList.remove('active');
      setTimeout(() => modal.remove(), 400);
    };

    modal.querySelector('#close-del-modal').addEventListener('click', closeDelModal);
    modal.querySelector('#cancel-del-btn').addEventListener('click', closeDelModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeDelModal(); });

    modal.querySelector('#confirm-del-btn').addEventListener('click', async () => {
      closeDelModal();
      let successCount = 0;
      for (const id of ids) {
        try {
          const b = allBillings.find(x => (x.$id || x.id) === id);
          if (b && (b.paymentStatus === 'paid' || b.paymentStatus === 'already_paid' || (b.amountPaid && b.amountPaid > 0))) {
            await services.billing.updateStatus(id, 'archived_paid', {
               notes: (b.notes || '') + ' [Archived from billing view]'
            });
          } else {
            await services.billing.delete(id);
          }
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

  // Print buttons
  ['btn-print-selected', 'btn-print-all'].forEach(btnId => {
    const el = document.getElementById(btnId);
    if (!el) return;
    el.addEventListener('click', () => {
      if (btnId === 'btn-print-all') {
        if (allBillings.length === 0) { showToast('No billing records to print', 'warning'); return; }
        printBillings(allBillings);
        showToast(`Printing all ${allBillings.length} receipt(s)`, 'success');
        return;
      }
      if (btnId === 'btn-print-selected') {
        const ids = [...document.querySelectorAll('.billing-row-check:checked')].map(cb => cb.dataset.billId);
        if (ids.length === 0) { showToast('Select records to print', 'warning'); return; }
        const selected = allBillings.filter(b => ids.includes(b.$id || b.id));
        printBillings(selected);
        showToast(`Printing ${ids.length} receipt(s)`, 'success');
      }
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

      // Build advance credit map: customerId -> sorted bills, compute carry-over credits
      // Group by customer, sort by billingMonth ascending
      const customerBillsMap = {};
      allBillings.forEach(b => {
        if (!b.customerId) return;
        if (!customerBillsMap[b.customerId]) customerBillsMap[b.customerId] = [];
        customerBillsMap[b.customerId].push(b);
      });

      Object.values(customerBillsMap).forEach(bills => {
        bills.sort((a, b) => new Date(a.billingMonth || 0).getTime() - new Date(b.billingMonth || 0).getTime());
        let carryCredit = 0;
        for (let i = 0; i < bills.length; i++) {
          const b = bills[i];
          const paid = b.amountPaid && b.amountPaid > 0 ? b.amountPaid : 0;
          const planRate = b.amount || 0;

          // Apply any carry-over credit from previous bill
          b._advanceCreditApplied = Math.min(carryCredit, planRate);
          const effectiveDue = planRate - b._advanceCreditApplied;

          // How much was actually paid toward this bill after credit
          const paidAfterCredit = paid > 0 ? paid : 0;
          const totalCovered = paidAfterCredit + b._advanceCreditApplied;

          if (totalCovered > planRate) {
            // Excess goes as advance credit for next month
            carryCredit = totalCovered - planRate;
            b._advanceToNext = totalCovered - planRate;
          } else {
            carryCredit = 0;
            b._advanceToNext = 0;
          }

          b._effectiveDue = effectiveDue;
          b._balance = paid > 0 ? Math.max(0, effectiveDue - paidAfterCredit) : Math.max(0, effectiveDue);
        }
      });

      applyFilters();
    } catch (error) {
      console.warn('Could not load billings from Appwrite:', error.message);
      allBillings = [];
      applyFilters();
    }
  }

  function applyFilters() {
    let filtered = allBillings.filter(b => b.paymentStatus !== 'archived_paid');

    if (currentFilter === 'all') {
      // In 'All Bills' view, only show the most recent billing record for each customer
      const grouped = {};
      filtered.forEach(b => {
        if (!b.customerId) return;
        if (!grouped[b.customerId]) grouped[b.customerId] = [];
        grouped[b.customerId].push(b);
      });
      const latestOnly = [];
      Object.values(grouped).forEach(bills => {
        // Sort descending to get the newest
        bills.sort((a, b) => new Date(b.billingMonth || 0).getTime() - new Date(a.billingMonth || 0).getTime());
        if (bills.length > 0) latestOnly.push(bills[0]);
      });
      filtered = latestOnly;
    } else {
      // Status filter
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
          <div class="empty-text">Customer bills are automatically generated by the background catch-up system.</div>
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

      // --- Plan Tier display with paid / advance / balance sub-lines ---
      const planRate = b.amount || 0;
      const paidAmt = b.amountPaid && b.amountPaid > 0 ? b.amountPaid : 0;
      const creditApplied = b._advanceCreditApplied || 0;
      const advanceToNext = b._advanceToNext || 0;
      const balance = b._balance !== undefined ? b._balance : 0;

      // Always show plan rate as main number
      // Show what was actually paid as a sub-line
      let amountSubLines = '';
      if (creditApplied > 0) {
        amountSubLines += `<div style="font-size:0.7rem; color:var(--accent-blue); margin-top:2px;">+${formatCurrency(creditApplied)} advance credit applied</div>`;
      }
      if (advanceToNext > 0) {
        // Show how much they paid in advance AND the remaining balance for next month
        const nextMonthRemaining = Math.max(0, planRate - advanceToNext);
        amountSubLines += `<div style="font-size:0.7rem; color:var(--accent-emerald); font-weight:600; margin-top:2px;">Advance paid: ${formatCurrency(advanceToNext)}</div>`;
        if (nextMonthRemaining > 0) {
          amountSubLines += `<div style="font-size:0.7rem; color:var(--accent-amber); font-weight:600; margin-top:1px;">Next month remaining: ${formatCurrency(nextMonthRemaining)}</div>`;
        } else {
          let nextMonthStr = "Next month";
          if (b.dueDate) {
            const d = new Date(b.dueDate);
            const nextStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
            const nextEnd = new Date(d.getFullYear(), d.getMonth() + 1, d.getDate());
            // Show exactly what month they covered next. Format as: Month year (e.g. March 2026)
            nextMonthStr = nextStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
          } else if (b.billingMonth) {
            const [y, m] = b.billingMonth.split('-');
            let d = new Date(y, parseInt(m), 1); // this acts as (month+1) because m is 1-indexed here while Date expects 0-indexed
            nextMonthStr = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
          }
          amountSubLines += `<div style="font-size:0.7rem; color:var(--accent-emerald); font-weight:600; margin-top:1px;">Fully covered: ${nextMonthStr} ✓</div>`;
        }
      }
      if (balance > 0 && paidAmt > 0) {
        amountSubLines += `<div style="font-size:0.7rem; color:var(--accent-rose); font-weight:600; margin-top:2px;">Balance due: ${formatCurrency(balance)}</div>`;
      } else if (balance > 0 && paidAmt === 0 && creditApplied > 0) {
        amountSubLines += `<div style="font-size:0.7rem; color:var(--accent-amber); font-weight:600; margin-top:2px;">Still due: ${formatCurrency(balance)}</div>`;
      }

      const isPaid = b.paymentStatus === 'already_paid' || balance <= 0;

      return `
      <tr>
        <td style="width:40px;"><input type="checkbox" class="billing-row-check" data-bill-id="${b.$id || b.id}"></td>
        <td style="color:var(--text-primary); font-weight:500;">${b.customerName || b.customerId?.substring(0, 12) || '—'}</td>
        <td>${(() => {
          if (!b.billingMonth) return '—';
          try {
            if (b.dueDate) {
              const end = new Date(b.dueDate);
              const start = new Date(end.getFullYear(), end.getMonth() - 1, end.getDate());
              return start.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
            }
            const [y, m] = b.billingMonth.split('-');
            let dateObj = new Date(y, parseInt(m) - 1, 1);
            return dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
          } catch(e) { return b.billingMonth; }
        })()}</td>
        <td style="font-weight:600;">
          ${formatCurrency(planRate)}
          ${paidAmt > 0 ? `<div style="font-size:0.7rem; color:var(--text-muted); margin-top:2px;">Paid: ${formatCurrency(paidAmt)}</div>` : ''}
          ${amountSubLines}
        </td>
        <td>${formatDate(b.dueDate)}</td>
        <td>${b.paidDate ? formatDate(b.paidDate) : '—'}</td>
        <td>
          <span style="color:${statusColor}; font-weight:600; font-size: 0.85rem;">
            ${BILLING_STATUSES.find(s => s.value === b.paymentStatus)?.label || b.paymentStatus.replace('_', ' ')}
          </span>
        </td>
        <td>
          <div class="table-actions">
            ${isPaid 
              ? `<button class="btn btn-ghost btn-sm btn-icon" data-receipt-bill="${b.$id || b.id}" title="View Receipt" style="color:var(--text-secondary);"><span class="material-icons-outlined" style="font-size:18px;">receipt_long</span></button>`
              : `<button class="btn btn-ghost btn-sm btn-icon" data-view-bill="${b.$id || b.id}" title="Collect Payment" style="color:var(--accent-emerald);"><span class="material-icons-outlined" style="font-size:18px;">payments</span></button>`
            }
            <button class="btn btn-ghost btn-sm btn-icon" data-edit-bill="${b.$id || b.id}" title="Edit Billing" style="color:var(--accent-blue);"><span class="material-icons-outlined" style="font-size:18px;">edit</span></button>
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
        
        const b = allBillings.find(x => (x.$id || x.id) === billingId);

        // Prevent marking as 'already_paid' if bill hasn't been fully paid
        if (newStatus === 'already_paid' && b) {
          const planAmt = b.amount || 0;
          const prevPaid = b.amountPaid ? parseFloat(b.amountPaid) : 0;
          if (prevPaid < planAmt) {
            showToast(`Cannot mark as "Already Paid" — only ₱${prevPaid.toFixed(0)} of ₱${planAmt.toFixed(0)} has been paid. Use the Collect Payment button to record payments.`, 'warning');
            // Revert dropdown to previous value
            e.target.value = b.paymentStatus;
            return;
          }
        }

        // Update dropdown styling
        e.target.style.borderColor = statusColor;
        e.target.style.color = statusColor;

        try {
          const additionalData = {};
          if (newStatus === 'already_paid') {
            additionalData.paidDate = new Date().toISOString();
            if (b) {
              additionalData.collectedBy = 'Admin';
            }
          } else if (newStatus === 'not_yet_paid') {
            // explicitly clear paid date and collected by if marked completely unpaid
            additionalData.paidDate = null;
            additionalData.collectedBy = null;
          } else {
            // for overdue or other statuses
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

    // Per-row Receipt preview button
    tbody.querySelectorAll('[data-receipt-bill]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const b = allBillings.find(x => (x.$id || x.id) === btn.dataset.receiptBill);
        if (!b) return;
        showReceiptModal(b, allCustomersForBilling);
      });
    });

    // Per-row Edit button
    tbody.querySelectorAll('[data-edit-bill]').forEach(btn => {
      btn.addEventListener('click', () => {
        const b = allBillings.find(x => (x.$id || x.id) === btn.dataset.editBill);
        if (!b) return;

        const modal = document.createElement('div');
        modal.className = 'modal-overlay active';
        modal.style.zIndex = '300';

        const dueStr = b.dueDate ? b.dueDate.substring(0, 10) : '';

        modal.innerHTML = `
          <style>
            .edit-bill-modal .edit-field { margin-bottom: 16px; }
            .edit-bill-modal .edit-field label {
              display: block; font-size: 0.75rem; font-weight: 600; 
              color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px;
              margin-bottom: 6px;
            }
            .edit-bill-modal .edit-field input {
              width: 100%; padding: 10px 14px; font-size: 0.9rem;
              background: rgba(255,255,255,0.04); color: var(--text-primary);
              border: 1px solid var(--border-color-hover); border-radius: 10px;
              outline: none; transition: border-color 0.2s, box-shadow 0.2s;
              font-family: inherit;
            }
            .edit-bill-modal .edit-field input:focus {
              border-color: var(--accent-blue);
              box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
            }
            .edit-bill-modal .edit-field input::placeholder { color: var(--text-muted); opacity: 0.5; }
            .edit-bill-modal .edit-field input::-webkit-calendar-picker-indicator {
              filter: invert(0.7); cursor: pointer;
            }
            .edit-bill-modal .edit-field .input-icon-wrap {
              position: relative;
            }
            .edit-bill-modal .edit-field .input-icon-wrap .material-icons-outlined {
              position: absolute; left: 12px; top: 50%; transform: translateY(-50%);
              font-size: 18px; color: var(--text-muted); pointer-events: none;
            }
            .edit-bill-modal .edit-field .input-icon-wrap input {
              padding-left: 38px;
            }
          </style>
          <div class="modal edit-bill-modal" style="max-width: 420px; border-radius: 16px;">
            <div class="modal-header" style="border-bottom: 1px solid var(--border-color); padding: 20px 24px;">
              <h3 style="font-size: 1.1rem; font-weight: 700; margin: 0;">Edit Billing Record</h3>
              <button class="modal-close" id="close-edit-modal" style="background: rgba(255,255,255,0.06); border: none; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text-muted); font-size: 16px; transition: background 0.2s;">✕</button>
            </div>
            <div class="modal-body" style="padding: 24px;">
              <div class="edit-field">
                <label>Billing Month</label>
                <div class="input-icon-wrap">
                  <span class="material-icons-outlined">calendar_month</span>
                  <input type="date" id="edit-month" value="${b.billingMonth ? b.billingMonth.substring(0, 10) : ''}">
                </div>
              </div>
              <div class="edit-field">
                <label>Plan Rate (₱)</label>
                <div class="input-icon-wrap">
                  <span class="material-icons-outlined">payments</span>
                  <input type="number" id="edit-amount" step="0.01" value="${b.amount || 0}">
                </div>
              </div>
              <div class="edit-field" style="margin-bottom: 0;">
                <label>Due Date</label>
                <div class="input-icon-wrap">
                  <span class="material-icons-outlined">event</span>
                  <input type="date" id="edit-due" value="${dueStr}">
                </div>
              </div>
            </div>
            <div class="modal-footer" style="padding: 16px 24px; border-top: 1px solid var(--border-color); display: flex; gap: 10px; justify-content: flex-end;">
              <button class="btn btn-ghost" id="cancel-edit-btn" style="border-radius: 10px; padding: 8px 20px; font-weight: 600; color: var(--text-muted);">Cancel</button>
              <button class="btn btn-primary" id="save-edit-btn" style="border-radius: 10px; padding: 8px 24px; font-weight: 600; background: var(--accent-blue); border-color: var(--accent-blue);">
                <span class="material-icons-outlined" style="font-size: 16px; vertical-align: middle; margin-right: 4px;">save</span> Save Changes
              </button>
            </div>
          </div>
        `;
        document.body.appendChild(modal);

        void modal.offsetWidth;
        modal.classList.add('active');

        const removeModal = () => {
          modal.classList.remove('active');
          setTimeout(() => modal.remove(), 400);
        };
        modal.querySelector('#close-edit-modal').addEventListener('click', removeModal);
        modal.querySelector('#cancel-edit-btn').addEventListener('click', removeModal);

        modal.querySelector('#save-edit-btn').addEventListener('click', async () => {
          try {
            const amount = parseFloat(modal.querySelector('#edit-amount').value) || 0;
            const billingMonth = modal.querySelector('#edit-month').value;
            const dueDateRaw = modal.querySelector('#edit-due').value;

            // Try to parse the due date from various formats
            let dueDate = null;
            if (dueDateRaw) {
              const parsed = new Date(dueDateRaw);
              dueDate = isNaN(parsed.getTime()) ? null : parsed.toISOString();
            }

            await services.billing.updateStatus(b.$id || b.id, b.paymentStatus, {
               amount, 
               billingMonth, 
               dueDate
            });
            
            showToast('Billing updated successfully', 'success');
            removeModal();
            loadBillings();
          } catch (e) {
            showToast('Failed to update billing', 'danger');
          }
        });
      });
    });

    // Per-row View button
    tbody.querySelectorAll('[data-view-bill]').forEach(btn => {
      btn.addEventListener('click', () => {
        const b = allBillings.find(x => (x.$id || x.id) === btn.dataset.viewBill);
        if (!b) return;
        const statusColor = getStatusColor(b.paymentStatus);
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.style.zIndex = '300';
        
        const balanceNum = b._balance !== undefined ? b._balance : (b.amount || 0);
        const isPaid = b.paymentStatus === 'already_paid' || balanceNum <= 0;

        modal.innerHTML = `
          <div class="modal" style="max-width:440px; max-height: 80vh; display: flex; flex-direction: column; border-radius: 16px;">
            <div class="modal-header" style="flex-shrink: 0; padding: 16px 20px; border-bottom: 1px solid var(--border-color);">
              <h3 style="margin:0;">Billing Details</h3>
              <button class="modal-close" id="close-view-modal">✕</button>
            </div>
            <div style="overflow-y: auto; flex: 1; padding: 20px;">
              <table style="width:100%; font-size:0.85rem;">
                <tr><td style="padding:8px 0; color:var(--text-muted); width:140px;">Customer</td><td style="padding:8px 0; font-weight:600; color:var(--text-primary);">${b.customerName || b.customerId || '—'}</td></tr>
                <tr><td style="padding:8px 0; color:var(--text-muted);">Billing Month</td><td style="padding:8px 0;">${b.billingMonth || '—'}</td></tr>
                <tr><td style="padding:8px 0; color:var(--text-muted);">Plan Rate</td><td style="padding:8px 0; font-weight:700; font-size:1.1rem;">${formatCurrency(b.amount)}</td></tr>
                <tr><td style="padding:8px 0; color:var(--text-muted);">Status</td><td style="padding:8px 0;"><span style="color:${statusColor}; font-weight:600;">${getStatusLabel(b.paymentStatus)}</span></td></tr>
                <tr><td style="padding:8px 0; color:var(--text-muted);">Due Date</td><td style="padding:8px 0;">${formatDate(b.dueDate)}</td></tr>
                <tr><td style="padding:8px 0; color:var(--text-muted);">Paid Date</td><td style="padding:8px 0;">${b.paidDate ? formatDate(b.paidDate) : '—'}</td></tr>
              </table>

              ${!isPaid ? `
                <div style="background: var(--bg-surface-hover, rgba(255,255,255,0.03)); border: 1px solid var(--border-color-hover); border-radius: 16px; padding: 24px; text-align: center; margin-top: 24px;">
                  <h4 style="margin: 0 0 4px 0; font-size: 1.15rem; color: var(--text-primary); font-weight: 600;">Update Payment Status</h4>
                  <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 20px;">${b.billingMonth || ''} &bull; ${formatCurrency(b.amount || 0)}</p>

                  <div style="display: flex; align-items: center; background: rgba(0,0,0,0.25); border-radius: 12px; padding: 10px 16px; margin-bottom: 12px; border: 1px solid var(--border-color-hover);">
                    <span style="color: var(--accent-emerald); font-weight: bold; font-size: 1.25rem; margin-right: 12px;">₱</span>
                    <input type="number" id="collect-amount-input" style="background: transparent; border: none; color: var(--text-primary); font-size: 1.25rem; font-weight: bold; width: 100%; outline: none;" value="${balanceNum}" min="0" step="0.01">
                    <button id="btn-default-amount" style="background: rgba(59, 130, 246, 0.15); color: var(--accent-blue); border: none; border-radius: 8px; padding: 6px 12px; font-size: 0.8rem; font-weight: 600; cursor: pointer; transition: all 0.2s ease; margin-left: 8px;">Default</button>
                  </div>
                  
                  <div style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 24px;">
                    Default plan rate: ${formatCurrency(b.amount || 0)}
                  </div>

                  <button class="btn btn-primary" id="collect-view-btn" style="width: 100%; background: var(--accent-emerald); border-color: var(--accent-emerald); border-radius: 12px; padding: 12px; font-size: 1rem; display: flex; justify-content: center; align-items: center; gap: 8px; font-weight: 600;">
                    <span class="material-icons-outlined" style="font-size: 20px;">check_circle</span> Mark as Paid
                  </button>
                </div>
              ` : ''}
              ${(() => {
                // Parse payment history from notes
                let payments = [];
                try { payments = JSON.parse(b.notes || '[]'); } catch(e) { payments = []; }
                if (!Array.isArray(payments)) payments = [];
                
                if (payments.length > 0) {
                  return `
                  <div style="margin-top: 24px;">
                    <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; text-align: center;">Payment History</div>
                    ${payments.map((p, i) => `
                      <div style="border: 1px solid var(--border-color-hover); border-radius: 12px; padding: 14px 16px; background: var(--bg-surface-hover, rgba(255,255,255,0.03)); margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between;">
                        <div>
                          <div style="font-weight: 700; color: var(--accent-emerald); font-size: 1.1rem;">${formatCurrency(p.amount)}</div>
                          <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">${p.date ? new Date(p.date).toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric', hour:'numeric', minute:'2-digit'}) : '—'} • ${p.collector || 'Admin'}</div>
                        </div>
                        <div style="display: flex; gap: 6px;">
                          <button class="btn btn-ghost btn-sm payment-receipt-share-btn" data-payment-idx="${i}" style="border: 1px solid rgba(59,130,246,0.3); border-radius: 8px; color: var(--accent-blue); background: rgba(59,130,246,0.1); font-size: 0.75rem; padding: 4px 10px;">
                            <span class="material-icons-outlined" style="font-size: 14px; vertical-align: middle;">open_in_new</span> Share
                          </button>
                          <button class="btn btn-ghost btn-sm payment-receipt-btn" data-payment-idx="${i}" style="border: 1px solid var(--border-color-hover); border-radius: 8px; color: var(--text-primary); font-size: 0.75rem; padding: 4px 10px;">
                            <span class="material-icons-outlined" style="font-size: 14px; vertical-align: middle;">receipt_long</span> Receipt
                          </button>
                        </div>
                      </div>
                    `).join('')}
                    ${balanceNum > 0 && !isPaid ? `<div style="text-align: center; font-size: 0.8rem; color: var(--accent-rose); margin-top: 4px;">Remaining Balance: ${formatCurrency(balanceNum)}</div>` : ''}
                  </div>`;
                } else if (b.amountPaid && b.amountPaid > 0) {
                  // Fallback for old records without payment history
                  return `
                  <div style="margin-top: 24px; border: 1px solid var(--border-color-hover); border-radius: 16px; padding: 20px; background: var(--bg-surface-hover, rgba(255,255,255,0.03)); text-align: center;">
                    <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">Amount Paid</div>
                    <div style="font-size: 1.5rem; font-weight: 700; color: var(--accent-emerald);">${formatCurrency(b.amountPaid)}</div>
                    ${balanceNum > 0 && !isPaid ? `<div style="font-size: 0.8rem; color: var(--accent-rose); margin-top: 6px;">Balance: ${formatCurrency(balanceNum)}</div>` : ''}
                  </div>`;
                }
                return '';
              })()}

            </div>
            <div class="modal-footer" style="flex-shrink: 0; border-top: 1px solid var(--border-color); padding: 12px 20px; justify-content: space-between;">
              <button class="btn btn-ghost" id="close-view-btn" style="color:var(--text-muted);">Close</button>
              <button class="btn btn-ghost" id="print-view-btn" style="border: 1px solid var(--border-color-hover); color:var(--text-primary); border-radius: 10px;"><span class="material-icons-outlined" style="font-size:16px; vertical-align: middle; margin-right: 4px;">receipt_long</span> View Receipt</button>
            </div>
          </div>
        `;
        document.body.appendChild(modal);

        void modal.offsetWidth;
        modal.classList.add('active');

        const closeViewModal = () => {
          modal.classList.remove('active');
          setTimeout(() => modal.remove(), 400);
        };

        modal.querySelector('#close-view-modal').addEventListener('click', closeViewModal);
        modal.querySelector('#close-view-btn').addEventListener('click', closeViewModal);
        modal.querySelector('#print-view-btn').addEventListener('click', () => {
          showReceiptModal(b, allCustomersForBilling);
        });

        // Individual payment receipt buttons
        let payments = [];
        try { payments = JSON.parse(b.notes || '[]'); } catch(e) { payments = []; }
        if (!Array.isArray(payments)) payments = [];
        
        modal.querySelectorAll('.payment-receipt-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            const idx = parseInt(btn.dataset.paymentIdx);
            const p = payments[idx];
            if (!p) return;
            
            const paymentB = {
              ...b,
              amountPaid: p.amount,
              paidDate: p.date,
              collectedBy: p.collector || 'Admin',
              paymentStatus: 'already_paid'
            };
            showReceiptModal(paymentB, allCustomersForBilling);
          });
        });

        // Individual payment inline share buttons
        modal.querySelectorAll('.payment-receipt-share-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            const idx = parseInt(btn.dataset.paymentIdx);
            const p = payments[idx];
            if (!p) return;
            
            const fbUrl = getCustomerFacebookUrl(b.customerId, allCustomersForBilling) || '';

            const paymentB = {
              ...b,
              amountPaid: p.amount,
              paidDate: p.date,
              collectedBy: p.collector || 'Admin',
              paymentStatus: 'already_paid'
            };
            showReceiptModal(paymentB, allCustomersForBilling, true);
          });
        });
        
        if (!isPaid) {
          modal.querySelector('#btn-default-amount').addEventListener('click', () => {
             modal.querySelector('#collect-amount-input').value = b.amount || 0;
          });

          modal.querySelector('#collect-view-btn').addEventListener('click', async () => {
            const amtInput = modal.querySelector('#collect-amount-input');
            const amt = parseFloat(amtInput.value);
            if (isNaN(amt) || amt < 0) {
              showToast('Please enter a valid amount', 'warning');
              return;
            }

            try {
              const previousPaid = b.amountPaid ? parseFloat(b.amountPaid) : 0;
              const newTotalPaid = previousPaid + amt;
              const planRate = b.amount || 0;
              
              let newStatus = b.paymentStatus;
              if (newTotalPaid >= planRate) {
                newStatus = 'already_paid';
              } else {
                newStatus = b.paymentStatus === 'overdue' ? 'overdue' : 'not_yet_paid';
              }

              // Build payment history
              let existingPayments = [];
              try { existingPayments = JSON.parse(b.notes || '[]'); } catch(e) { existingPayments = []; }
              if (!Array.isArray(existingPayments)) existingPayments = [];
              existingPayments.push({ amount: amt, date: new Date().toISOString(), collector: 'Admin' });
              
              await services.billing.updateStatus(b.$id || b.id, newStatus, {
                paidDate: new Date().toISOString(),
                amountPaid: newTotalPaid,
                collectedBy: 'Admin',
                notes: JSON.stringify(existingPayments)
              });
              
              showToast('Payment collected successfully', 'success');
              closeViewModal();
              loadBillings();

              // Automatically show receipt for THIS payment only
              const receiptB = {
                ...b,
                paymentStatus: newTotalPaid >= planRate ? 'PAID' : 'PARTIAL',
                paidDate: new Date().toISOString(),
                amountPaid: amt,
                collectedBy: 'Admin'
              };
              showReceiptModal(receiptB, allCustomersForBilling);

            } catch (error) {
              console.error('Error collecting payment:', error);
              showToast('Failed to collect payment', 'danger');
            }
          });
        }

        modal.addEventListener('click', (e) => { if (e.target === modal) closeViewModal(); });
      });
    });

    // Delete billing
    tbody.querySelectorAll('[data-delete-bill]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.deleteBill;
        const b = allBillings.find(x => (x.$id || x.id) === id);
        const customerLabel = b ? (b.customerName || b.customerId || id) : id;

        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
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

        void modal.offsetWidth;
        modal.classList.add('active');

        const closeRowDelModal = () => {
          modal.classList.remove('active');
          setTimeout(() => modal.remove(), 400);
        };

        modal.querySelector('#close-row-del').addEventListener('click', closeRowDelModal);
        modal.querySelector('#cancel-row-del').addEventListener('click', closeRowDelModal);
        modal.addEventListener('click', (e) => { if (e.target === modal) closeRowDelModal(); });

        modal.querySelector('#confirm-row-del').addEventListener('click', async () => {
          closeRowDelModal();
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


