import { statusBadge, formatCurrency, formatDate, getInitials } from '../components/ui-helpers.js';
import { ENDPOINT, PROJECT_ID, API_KEY } from '../config/appwrite.js';

/**
 * Dashboard Page — Premium Redesign with Gradient Cards
 */
export function renderDashboardPage() {
  return `
    <div class="dashboard-modern">
      
      <!-- Top Metrics Row -->
      <div class="metrics-grid">
        <div class="metric-card pop-in-active">
          <div class="metric-title" style="display:flex; justify-content:space-between; align-items:center;">
            <span>Total Revenue</span>
            <span class="material-icons-outlined" style="font-size:2rem; width:48px; height:48px; display:flex; align-items:center; justify-content:center; color:var(--accent-blue); border-radius:12px;">account_balance_wallet</span>
          </div>
          <div class="metric-value font-bold" id="stat-collected">—</div>
          <div class="metric-sub text-xs" style="color: var(--accent-emerald);">+12.4% <span style="color: var(--text-muted);">this month</span></div>
        </div>
        
        <div class="metric-card pop-in-active" style="animation-delay: 0.1s;">
          <div class="metric-title" style="display:flex; justify-content:space-between; align-items:center;">
            <span>Active Customers</span>
            <span class="material-icons-outlined" style="font-size:2rem; width:48px; height:48px; display:flex; align-items:center; justify-content:center; color:var(--accent-emerald); border-radius:12px;">groups</span>
          </div>
          <div class="metric-value-wrapper">
            <div class="metric-value font-bold" id="stat-active">—</div>
            <div class="metric-denominator">/ <span id="stat-customers">—</span> Total</div>
          </div>
          <div class="metric-sub text-xs" style="color: var(--accent-emerald);">+4.1% <span style="color: var(--text-muted);">this month</span></div>
        </div>
        
        <div class="metric-card pop-in-active" style="animation-delay: 0.2s;">
          <div class="metric-title" style="display:flex; justify-content:space-between; align-items:center;">
            <span>Unpaid Bills</span>
            <span class="material-icons-outlined" style="font-size:2rem; width:48px; height:48px; display:flex; align-items:center; justify-content:center; color:#F97316; border-radius:12px;">receipt_long</span>
          </div>
          <div class="metric-value-wrapper">
            <div class="metric-value font-bold" id="stat-unpaid">—</div>
            <div class="metric-denominator">/ <span id="stat-overdue">—</span> Overdue</div>
          </div>
          <div class="metric-sub text-xs" style="color: var(--accent-blue);">Unpaid Collections</div>
        </div>

        <div class="metric-card pop-in-active" style="animation-delay: 0.3s;">
          <div class="metric-title" style="display:flex; justify-content:space-between; align-items:center;">
            <span>Staff Overview</span>
            <span class="material-icons-outlined" style="font-size:2rem; width:48px; height:48px; display:flex; align-items:center; justify-content:center; color:#8B5CF6; border-radius:12px;">engineering</span>
          </div>
          <div class="metric-value-wrapper">
            <div class="metric-value font-bold" id="stat-collectors">—</div>
            <div class="metric-denominator">Collectors <span style="margin:0 4px">•</span> <span id="stat-technicians">—</span> Techs</div>
          </div>
          <div class="metric-sub text-xs" style="color: var(--text-muted);">Field Operations</div>
        </div>
      </div>

      <!-- Main Chart Row -->
      <div class="chart-card pop-in-active" style="animation-delay: 0.4s;">
        <div class="card-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 20px;">
          <h3 class="card-title" style="margin:0; font-size:1.1rem;">Revenue Over Time (Last 12 Months)</h3>
        </div>
        <div class="card-body" id="income-chart-area" style="height: 280px; position:relative; width: 100%;">
          <!-- Render Area Chart Here -->
        </div>
      </div>

      <!-- Bottom Grid (Pie, Bar, Table, Status) -->
      <div class="bottom-dash-grid">
        
        <!-- Pie Chart -->
        <div class="chart-card pop-in-active" style="animation-delay: 0.5s; padding: 24px; display:flex; flex-direction:column; justify-content:center;">
          <h3 class="card-title" style="margin:0 0 24px 0; font-size:1rem;">Data Usage by Service Plan</h3>
          <div class="pie-chart-container" style="display:flex; gap:20px; align-items:center;">
             <div class="css-donut" style="--perc1: 48%; --perc2: 32%; --perc3: 15%; --perc4: 5%;">
                <div class="donut-hole"></div>
                <div class="donut-label donut-label-1">48%</div>
                <div class="donut-label donut-label-2">32%</div>
                <div class="donut-label donut-label-3">15%</div>
                <div class="donut-label donut-label-4">5%</div>
             </div>
             <div class="pie-legend" style="flex:1;">
               <div class="legend-item"><span class="dot" style="background:#14B8A6;"></span> Premium (48%)</div>
               <div class="legend-item"><span class="dot" style="background:#F97316;"></span> Standard (32%)</div>
               <div class="legend-item"><span class="dot" style="background:#EAB308;"></span> Basic (15%)</div>
               <div class="legend-item"><span class="dot" style="background:#3B82F6;"></span> Trial (5%)</div>
             </div>
          </div>
        </div>

        <!-- Bar Chart -->
        <div class="chart-card pop-in-active" style="animation-delay: 0.6s; padding: 24px;">
          <h3 class="card-title" style="margin:0 0 24px 0; font-size:1rem;">Payment Status Distribution</h3>
          <div class="css-bar-chart" id="status-bar-chart" style="display:flex; align-items:flex-end; gap:32px; height: 210px; padding-bottom: 24px; position:relative; padding-left:40px;">
             <!-- Y-axis -->
             <div style="position:absolute; bottom:24px; left:0; width:calc(100% - 40px); border-bottom:1px solid var(--border-color); z-index:0;"></div>
             <div style="position:absolute; bottom:calc(25% + 18px); left:40px; width:calc(100% - 40px); border-top:1px solid var(--chart-grid); z-index:0;"></div>
             <div style="position:absolute; bottom:calc(50% + 12px); left:40px; width:calc(100% - 40px); border-top:1px solid var(--chart-grid); z-index:0;"></div>
             <div style="position:absolute; bottom:calc(75% + 6px); left:40px; width:calc(100% - 40px); border-top:1px solid var(--chart-grid); z-index:0;"></div>
             <div style="position:absolute; top:0; left:40px; width:calc(100% - 40px); border-top:1px solid var(--chart-grid); z-index:0;"></div>

             <div id="y-axis-0" style="position:absolute; bottom:20px; left:0; font-size:0.65rem; color:var(--text-muted); width:32px; text-align:right;">0</div>
             <div id="y-axis-1" style="position:absolute; bottom:calc(25% + 14px); left:0; font-size:0.65rem; color:var(--text-muted); width:32px; text-align:right;">1</div>
             <div id="y-axis-2" style="position:absolute; bottom:calc(50% + 8px); left:0; font-size:0.65rem; color:var(--text-muted); width:32px; text-align:right;">2</div>
             <div id="y-axis-3" style="position:absolute; bottom:calc(75% + 2px); left:0; font-size:0.65rem; color:var(--text-muted); width:32px; text-align:right;">3</div>
             <div id="y-axis-4" style="position:absolute; top:-4px; left:0; font-size:0.65rem; color:var(--text-muted); width:32px; text-align:right;">4</div>

             <div class="bar-col" style="z-index:1;">
               <div class="bar-fill" id="bar-paid" style="height: 0%; background: #14B8A6; width:48px; transition: height 1s ease-out;"></div>
               <div class="bar-label" style="position:absolute; bottom:-24px; font-size:0.75rem; color:var(--text-primary); width:48px; text-align:center; font-weight:500;">Paid</div>
             </div>
             <div class="bar-col" style="z-index:1;">
               <div class="bar-fill" id="bar-pending" style="height: 0%; background: #EAB308; width:48px; transition: height 1s ease-out;"></div>
               <div class="bar-label" style="position:absolute; bottom:-24px; font-size:0.75rem; color:var(--text-primary); width:48px; text-align:center; font-weight:500;">Unpaid</div>
             </div>
             <div class="bar-col" style="z-index:1;">
               <div class="bar-fill" id="bar-overdue" style="height: 0%; background: #F97316; width:48px; transition: height 1s ease-out;"></div>
               <div class="bar-label" style="position:absolute; bottom:-24px; font-size:0.75rem; color:var(--text-primary); width:48px; text-align:center; font-weight:500;">Overdue</div>
             </div>
          </div>
        </div>

        <!-- 3rd Column: Recents -->
        <div style="display:flex; flex-direction:column;">
          <!-- Recent Transactions -->
          <div class="chart-card pop-in-active" style="animation-delay: 0.7s; padding: 24px; flex:1; display:flex; flex-direction:column; justify-content: flex-start;">
             <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 16px;">
               <h3 class="card-title" style="margin:0; font-size:1rem;">Recent Transactions</h3>
             </div>
             <div id="recent-billing" style="width: 100%;">
               <!-- Table updates via JS -->
             </div>
             <div id="recent-billing-pagination" style="display:none; padding-top:12px; display:flex; align-items:center; justify-content:flex-start; gap:8px; flex-wrap:wrap; margin-top: auto;"></div>
          </div>
        </div>

      </div>

    </div>
  `;
}

let wavyAnimFrame = null;
function initWavyText() {
  const text = "Hello Admin";
  const container = document.getElementById("wavy-text");
  if (!container) return;

  container.innerHTML = ""; // Clear existing
  text.split("").forEach((letter, i) => {
    const span = document.createElement("span");
    span.classList.add("wavy-char");
    span.innerHTML = letter === ' ' ? '&nbsp;' : letter;
    span.setAttribute("data-char", letter);
    container.appendChild(span);
  });

  const chars = document.querySelectorAll(".wavy-char");
  
  if (wavyAnimFrame) cancelAnimationFrame(wavyAnimFrame);

  function animateWavy(time) {
    if (!document.getElementById("wavy-text")) return; // abort if page changed
    chars.forEach((char, i) => {
      const wave = Math.sin((time * 0.002) + i * 0.4);
      char.style.transform = `
        translateY(${wave * 4}px)
        rotateZ(${wave * 2}deg)
        skewX(${wave * 1}deg)
      `;
    });
    wavyAnimFrame = requestAnimationFrame(animateWavy);
  }
  
  wavyAnimFrame = requestAnimationFrame(animateWavy);
}

const PAGE_SIZE = 5;

/**
 * Load dashboard data
 */
export async function initDashboardPage(services, navigateFn) {
  console.log('[DEBUG] initDashboardPage STARTED');
  initWavyText();
  
  // ==========================================
  // ZERO-DELAY CACHE SYSTEM
  // Instantly load data from previous session
  // ==========================================
  const cachedData = localStorage.getItem('dashboard_cache');
  if (cachedData) {
    try {
      const parsed = JSON.parse(cachedData);
      console.log('[DEBUG] Loading from instant cache!');
      if(parsed.customerCount !== undefined) {
        animateCounter('stat-customers', parsed.customerCount || 0);
        animateCounter('stat-active', parsed.activeCount || 0);
        animateCounter('stat-unpaid', parsed.statusCounts?.unpaid || 0);
        animateCounter('stat-overdue', parsed.statusCounts?.overdue || 0);
        animateCounter('stat-collectors', parsed.collectorCount || 0);
        animateCounter('stat-technicians', parsed.technicianCount || 0);
        animateCounter('stat-plans', parsed.plansCount || 0);
        
        const colEl = document.getElementById('stat-collected');
        if(colEl) colEl.textContent = formatCurrency(parsed.totalCollectedAmount || 0);
        
        renderControlPanel(parsed.customerCount, parsed.activeCount, parsed.collectorCount, parsed.statusCounts);
        if (parsed.monthlyStats) {
          renderIncomeChart(parsed.monthlyStats.projected, parsed.monthlyStats.collected);
        }
      }
    } catch(e) { }
  }

  try {
    console.log('[DEBUG] Fetching fresh data from Appwrite API in background...');
    const [customerCount, activeCount, statusCounts, collectorCount, technicianCount, totalCollectedAmount, plansCount, monthlyStats, plansList, subsList] = await Promise.all([
      services.customer.getCount(),
      services.subscription.getActiveCount(),
      services.billing.getStatusCounts(),
      services.collector.getCollectorCount(),
      services.collector.getTechnicianCount(),
      services.billing.getTotalCollectedAmount(),
      services.plan.getCount(),
      services.billing.getMonthlyRevenueStats((new Date()).getFullYear()),
      services.plan.getAll(),
      services.subscription.getAll(null, 1000)
    ]);
    console.log('[DEBUG] Appwrite DATA FETCH FINISHED!', { customerCount, activeCount });

    // Save fresh data to cache for next instant load
    localStorage.setItem('dashboard_cache', JSON.stringify({
      customerCount, activeCount, statusCounts, collectorCount, technicianCount, totalCollectedAmount, plansCount, monthlyStats
    }));

    // Trigger animation classes if they aren't already running
    ;['stat-customers', 'stat-active', 'stat-unpaid', 'stat-overdue', 'stat-collectors', 'stat-technicians', 'stat-plans', 'stat-collected'].forEach(id => {
      const el = document.getElementById(id);
      if(el && !el.classList.contains('pop-in-active')) {
        el.classList.add('pop-in-active');
      }
    });

    animateCounter('stat-customers', customerCount);
    animateCounter('stat-active', activeCount);
    animateCounter('stat-unpaid', statusCounts.unpaid || 0);
    animateCounter('stat-overdue', statusCounts.overdue || 0);
    animateCounter('stat-collectors', collectorCount);
    animateCounter('stat-technicians', technicianCount);
    animateCounter('stat-plans', plansCount);
    document.getElementById('stat-collected').textContent = formatCurrency(totalCollectedAmount || 0);

    renderControlPanel(customerCount, activeCount, collectorCount, statusCounts, plansList, subsList);
    renderIncomeChart(monthlyStats.projected, monthlyStats.collected);

    // Paginated billing — server-side via Appwrite offset
    let currentPage = 1;
    let totalCount = 0;

    async function loadBillingPage(page) {
      const container = document.getElementById('recent-billing');
      container.innerHTML = `<div style="padding:24px; text-align:center; color:var(--text-muted);"><div class="spinner" style="margin:0 auto 12px;"></div>Loading...</div>`;

      try {
        const offset = (page - 1) * PAGE_SIZE;
        const result = await services.billing.getAll(null, PAGE_SIZE, offset);
        totalCount = result.total || result.documents.length;
        currentPage = page;

        // Sync customer plan based on subscription
        if (plansList && subsList && result.documents) {
          result.documents.forEach(bill => {
            if (bill.subscriptionId) {
              const sub = subsList.documents.find(s => s.$id === bill.subscriptionId);
              if (sub && sub.planId) {
                const plan = plansList.documents.find(p => p.$id === sub.planId);
                if (plan) {
                  bill.planName = (plan.name || '').replace('[ARCHIVED] ', '').trim();
                }
              }
            }
          });
        }

        renderRecentBilling(result.documents);
        renderBillingPagination(currentPage, totalCount, loadBillingPage);
      } catch (billingErr) {
        console.error('[Dashboard] Failed to load billing page:', billingErr);
        container.innerHTML = `
          <div style="padding:24px; text-align:center;">
            <span class="material-icons-outlined" style="font-size:2.5rem; color:var(--text-muted); margin-bottom:8px; display:block;">cloud_off</span>
            <div style="color:var(--text-muted); font-size:0.85rem; margin-bottom:12px;">Unable to load transactions</div>
            <button id="retry-billing-btn" style="padding:6px 18px; border-radius:8px; background:var(--accent-blue); color:#fff; border:none; cursor:pointer; font-size:0.8rem; font-weight:600;">Retry</button>
          </div>
        `;
        const retryBtn = document.getElementById('retry-billing-btn');
        if (retryBtn) retryBtn.addEventListener('click', () => loadBillingPage(page));
      }
    }

    await loadBillingPage(1);

    // --- BUCKET PERMISSION FIX FOR MOBILE UPLOADS ---
    const fixKey = localStorage.getItem('bucket_fixed');
    if (!fixKey) {
      try {
        const bucketRes = await fetch(`${ENDPOINT}/storage/buckets/customer_images`, {
          headers: {
            'X-Appwrite-Project': PROJECT_ID,
            'X-Appwrite-Key': API_KEY
          }
        });
        if (bucketRes.ok) {
          const bucket = await bucketRes.json();
          const perms = new Set(bucket.$permissions || []);
          perms.add('create("users")');
          perms.add('update("users")');
          perms.add('read("any")');
          
          await fetch(`${ENDPOINT}/storage/buckets/customer_images`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'X-Appwrite-Project': PROJECT_ID,
              'X-Appwrite-Key': API_KEY
            },
            body: JSON.stringify({
              name: bucket.name,
              permissions: Array.from(perms),
              fileSecurity: bucket.fileSecurity,
              enabled: bucket.enabled,
              maximumFileSize: bucket.maximumFileSize,
              allowedFileExtensions: bucket.allowedFileExtensions,
              compression: bucket.compression,
              encryption: bucket.encryption,
              antivirus: bucket.antivirus
            })
          });
          localStorage.setItem('bucket_fixed', 'true');
          console.log('Fixed storage permissions for Mobile uploads!');
        }
      } catch (e) { console.error('Perm fix failed:', e); }
    }

    // Wire Quick Action buttons
    document.querySelectorAll('.quick-action-btn[data-page]').forEach(btn => {
      btn.addEventListener('click', () => {
        const page = btn.dataset.page;
        if (page && navigateFn) navigateFn(page);
      });
    });

  } catch (error) {
    console.error('[DEBUG] Failed to load dashboard data:', error);
    // Only show error in billing area if it hasn't already loaded content
    const tbl = document.getElementById('recent-billing');
    if(tbl && (!tbl.innerHTML || tbl.innerHTML.includes('Loading'))) {
      tbl.innerHTML = `
        <div style="padding:24px; text-align:center;">
          <span class="material-icons-outlined" style="font-size:2.5rem; color:var(--text-muted); margin-bottom:8px; display:block;">cloud_off</span>
          <div style="color:var(--text-muted); font-size:0.85rem;">Unable to load transactions</div>
          <div style="color:var(--text-muted); font-size:0.7rem; margin-top:4px;">${error.message || 'Connection error'}</div>
        </div>
      `;
    }
  }
}

function animateCounter(id, target) {
  const el = document.getElementById(id);
  if (!el || typeof target !== 'number') { if (el) el.textContent = target; return; }
  let start = 0;
  const duration = 800;
  const step = (timestamp) => {
    if (!start) start = timestamp;
    const progress = Math.min((timestamp - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.floor(eased * target);
    if (progress < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function renderControlPanel(customers, active, collectors, statusCounts, plansList, subsList) {
  // Update Pie Chart dynamically based on derived percentages
  const pieDonut = document.querySelector('.css-donut');
  const dLabels = document.querySelectorAll('.donut-label');
  const dLegends = document.querySelectorAll('.pie-legend .legend-item');
  if (pieDonut && dLabels.length === 4 && dLegends.length === 4) {
    let planCounts = {};
    if (plansList && subsList) {
      subsList.documents.forEach(sub => {
        if (sub.status === 'active') { // Only active subs
          const plan = plansList.documents.find(p => p.$id === sub.planId);
          let pName = plan ? plan.name : 'Unknown';
          pName = pName.replace('[ARCHIVED] ', '').trim();
          planCounts[pName] = (planCounts[pName] || 0) + 1;
        }
      });
    }
    
    const sortedPlans = Object.keys(planCounts).map(name => ({name, count: planCounts[name]})).sort((a,b) => b.count - a.count);
    if (sortedPlans.length === 0) sortedPlans.push({name: 'Standard', count: 1});

    let top4 = [
      sortedPlans[0] || {name: '', count: 0},
      sortedPlans[1] || {name: '', count: 0},
      sortedPlans[2] || {name: '', count: 0},
      sortedPlans[3] || {name: '', count: 0}
    ];

    if (sortedPlans.length > 4) {
      top4[3].name = 'Other';
      top4[3].count = sortedPlans.slice(3).reduce((acc, curr) => acc + curr.count, 0);
    }
    
    const totalP = top4.reduce((acc, curr) => acc + curr.count, 0) || 1;
    let pct1 = Math.round((top4[0].count / totalP) * 100);
    let pct2 = Math.round((top4[1].count / totalP) * 100);
    let pct3 = Math.round((top4[2].count / totalP) * 100);
    let pct4 = totalP > 0 && top4.some(p => p.count > 0) ? 100 - (pct1 + pct2 + pct3) : 0;
    if (pct4 < 0) pct4 = 0;

    pieDonut.style.setProperty('--perc1', pct1 + '%');
    pieDonut.style.setProperty('--perc2', pct2 + '%');
    pieDonut.style.setProperty('--perc3', pct3 + '%');
    pieDonut.style.setProperty('--perc4', pct4 + '%');
    
    dLabels[0].textContent = pct1 > 0 ? pct1 + '%' : '';
    dLabels[1].textContent = pct2 > 0 ? pct2 + '%' : '';
    dLabels[2].textContent = pct3 > 0 ? pct3 + '%' : '';
    dLabels[3].textContent = pct4 > 0 ? pct4 + '%' : '';

    const colors = ['#14B8A6', '#F97316', '#EAB308', '#3B82F6'];
    for(let i=0; i<4; i++) {
       if (top4[i].count > 0 || (i===0 && pct1 > 0)) {
         dLegends[i].innerHTML = `<span class="dot" style="background:${colors[i]};"></span> <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${top4[i].name}">${top4[i].name}</span>`;
         dLegends[i].style.display = 'flex';
       } else {
         dLegends[i].style.display = 'none';
       }
    }
  }

  // Render Bar Chart dynamically
  const paid = statusCounts?.paid || 0;
  const pending = (statusCounts?.not_yet_paid || 0) + (statusCounts?.unpaid || 0);
  const overdue = statusCounts?.overdue || 0;
  
  const barMax = Math.max(10, paid, pending, overdue);
  const scaleMax = Math.ceil(barMax / 5) * 5; // Snap to nearest 5 or 10

  // Update Y-axis labels
  const yLabels = [
    document.getElementById('y-axis-0'),
    document.getElementById('y-axis-1'),
    document.getElementById('y-axis-2'),
    document.getElementById('y-axis-3'),
    document.getElementById('y-axis-4')
  ];
  if (yLabels[0]) yLabels[0].textContent = '0';
  if (yLabels[1]) yLabels[1].textContent = Math.round(scaleMax * 0.25);
  if (yLabels[2]) yLabels[2].textContent = Math.round(scaleMax * 0.50);
  if (yLabels[3]) yLabels[3].textContent = Math.round(scaleMax * 0.75);
  if (yLabels[4]) yLabels[4].textContent = scaleMax;

  const barPaid = document.getElementById('bar-paid');
  const barPending = document.getElementById('bar-pending');
  const barOverdue = document.getElementById('bar-overdue');

  if (barPaid && barPending && barOverdue) {
    const paidH = Math.max(2, (paid / scaleMax) * 100);
    const pendH = Math.max(2, (pending / scaleMax) * 100);
    const overH = Math.max(2, (overdue / scaleMax) * 100);

    setTimeout(() => {
      barPaid.style.height = paidH + '%';
      barPending.style.height = pendH + '%';
      barOverdue.style.height = overH + '%';
    }, 100);
  }
}

function renderIncomeChart(projected = [], collected = []) {
  const container = document.getElementById('income-chart-area');
  if (!container) return;
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  
  // Use REAL dynamic data from Appwrite
  // projected = top line (Dark Blue) representing Total Expected
  // collected = bottom line (Teal) representing Actual Paid
  const data1 = projected.length === 12 ? projected : [0,0,0,0,0,0,0,0,0,0,0,0];
  const data2 = collected.length === 12 ? collected : [0,0,0,0,0,0,0,0,0,0,0,0]; 
  
  const width = 800;
  const height = 230;
  let rawMax = Math.max(...data1, ...data2);
  if (rawMax === 0 || isNaN(rawMax)) rawMax = 100;
  
  // Calculate a highly human-readable tick step
  let tickStep;
  if (rawMax <= 50) tickStep = 10;
  else if (rawMax <= 100) tickStep = 20;
  else if (rawMax <= 500) tickStep = 100;
  else if (rawMax <= 1000) tickStep = 200;
  else if (rawMax <= 5000) tickStep = 1000;
  else if (rawMax <= 10000) tickStep = 2000;
  else {
    const order = Math.pow(10, Math.floor(Math.log10(rawMax)));
    tickStep = order / 5; // e.g. 100000 -> 20000
  }
  
  // Snap maxVal cleanly so it is perfectly divided by 5 ticks, with a slight headroom if close to edge
  let maxVal = Math.ceil((rawMax * 1.05) / tickStep) * tickStep;
  if (maxVal < tickStep * 5) maxVal = tickStep * 5;

  const stepX = width / (months.length - 1);
  
  function getPath(data) {
    const pts = data.map((v, i) => ({ x: i * stepX, y: height - (v / maxVal * height) }));
    let d = `M ${pts[0].x},${pts[0].y} `;
    for(let i = 0; i < pts.length - 1; i++) {
      d += `L ${pts[i+1].x},${pts[i+1].y} `;
    }
    return { d, pts };
  }
  
  const run1 = getPath(data1);
  const run2 = getPath(data2);
  
  // Y-axis grid lines (5 steps)
  const ySteps = 5;
  const yAxisValues = Array.from({length: ySteps + 1}, (_, i) => (maxVal / ySteps) * i);
  const gridLines = yAxisValues.map(v => {
    const y = height - (v / maxVal * height);
    const displayVal = v >= 1000 ? (v/1000).toFixed(v%1000===0?0:1) + 'K' : v;
    return `<line x1="0" y1="${y}" x2="${width}" y2="${y}" stroke="var(--chart-grid)" stroke-width="1.5"></line>
            <text x="-10" y="${y + 4}" fill="var(--text-muted)" font-size="0.65rem" text-anchor="end">${v === 0 ? '0' : '&#8369;' + displayVal}</text>`;
  }).join('');

  container.innerHTML = `
    <style>
      .chart-anim-line {
        stroke-dasharray: 3000;
        stroke-dashoffset: 3000;
        animation: drawLine 2.5s ease-in-out forwards;
      }
      .line-darkblue { stroke: var(--chart-line-1); }
      .line-teal { stroke: var(--chart-line-2); }
      .line-coral { stroke: #f97316; }

      @keyframes drawLine { to { stroke-dashoffset: 0; } }
      @keyframes popNode { to { transform: scale(1); opacity: 1; } }
      .chart-node {
        transform-origin: center;
        transform: scale(0);
        opacity: 0;
        transition: transform 0.2s;
        cursor: pointer;
      }
      .chart-node:hover {
        transform: scale(1.3) !important;
      }
    </style>
    <div style="width:100%; height:100%; position:relative; padding-left: 48px; padding-bottom: 24px;">
      <svg viewBox="-48 0 ${width + 50} ${height}" preserveAspectRatio="none" style="width:100%; height:100%; display:block; overflow:visible;">
        <!-- Grid -->
        ${gridLines}
        
        <!-- Lines -->
        <path d="${run1.d}" fill="none" stroke-width="3" stroke-linejoin="round" class="chart-anim-line line-darkblue"></path>
        <path d="${run2.d}" fill="none" stroke-width="3" stroke-linejoin="round" class="chart-anim-line line-teal"></path>
        
        <!-- Nodes Top Line -->
        ${run1.pts.map((p, i) => `<circle cx="${p.x}" cy="${p.y}" r="6" fill="var(--chart-node-fill)" stroke="var(--chart-line-1)" stroke-width="2.5" style="animation: popNode 0.4s forwards ${0.5 + (i * 0.05)}s;" class="chart-node" data-val="${data1[i]}"></circle>`).join('')}
        
        <!-- Nodes Bottom Line -->
        ${run2.pts.map((p, i) => `<circle cx="${p.x}" cy="${p.y}" r="6" fill="var(--chart-node-fill)" stroke="var(--chart-line-2)" stroke-width="2.5" style="animation: popNode 0.4s forwards ${0.5 + (i * 0.05)}s;" class="chart-node" data-val="${data2[i]}"></circle>`).join('')}
      </svg>

      <!-- X-Axis Tags -->
      <div style="display:flex; justify-content:space-between; width:100%; position:absolute; bottom:0; left:48px; padding-right:48px;">
        ${months.map((m) => `<div style="text-align:center; font-size:0.75rem; color:var(--text-primary); font-weight:500;">${m}</div>`).join('')}
      </div>
    </div>
  `;

  // Attach hover listeners for Tooltip
  setTimeout(() => {
    const tooltip = document.getElementById('chart-tooltip');
    const nodes = container.querySelectorAll('.chart-node');
    if (!tooltip || !nodes) return;
    
    nodes.forEach(node => {
      node.addEventListener('mouseenter', (e) => {
        const val = parseFloat(node.getAttribute('data-val') || '0');
        const month = node.getAttribute('data-month');
        tooltip.innerHTML = `<span style="color:var(--text-muted); font-size:0.7rem; display:block; margin-bottom:2px;">${month} Revenue</span><span style="color:var(--accent-emerald);">₱${val.toLocaleString()}</span>`;
        tooltip.style.opacity = '1';
        
        // Position relative to SVG bounding box
        const svgRect = node.closest('svg').getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        const cx = parseFloat(node.getAttribute('cx'));
        const cy = parseFloat(node.getAttribute('cy'));
        
        // Convert SVG coordinates to Container coordinates roughly
        // SVG has width=800, height=180. We use percentages.
        const px = (cx / 800) * svgRect.width;
        const py = (cy / 180) * svgRect.height;
        
        tooltip.style.left = `calc(${px}px + 12px)`;
        tooltip.style.top = `calc(${py}px - 10px)`;
        tooltip.style.opacity = '1';
        tooltip.style.transform = 'translate(-50%, -100%) scale(1)';
        node.setAttribute('r', '8');
        node.style.strokeWidth = '3';
      });
      
      node.addEventListener('mouseleave', () => {
        tooltip.style.opacity = '0';
        tooltip.style.transform = 'translate(-50%, -90%) scale(0.8)';
        node.setAttribute('r', '6');
        node.style.strokeWidth = '2';
      });
    });
  }, 100);
}

function renderRecentBilling(billings) {
  const container = document.getElementById('recent-billing');
  if (!billings || billings.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon"><span class="material-icons-outlined" style="font-size:3rem;">receipt_long</span></div>
        <div class="empty-title">No billing records yet</div>
        <div class="empty-text">Billing records will appear here once you start billing customers.</div>
      </div>
    `;
    // Hide pagination
    const pg = document.getElementById('recent-billing-pagination');
    if (pg) pg.style.display = 'none';
    return;
  }

  let html = '<table class="data-table pop-in-active" style="font-size:0.7rem; width:100%; min-width:0; table-layout:fixed; margin:0; padding:0; height:100%;"><thead><tr style="background:none; border-bottom:1px solid var(--border-color); color:var(--text-primary);">';
  html += '<th style="padding:6px 0; width:18%;">Date</th><th style="padding:6px 0; width: 26%;">Client</th><th style="padding:6px 0; width:22%;">Plan</th><th style="padding:6px 0; width:16%;">Amount</th><th style="padding:6px 0; width:18%; padding-right:0;">Status</th>';
  html += '</tr></thead><tbody>';

  billings.forEach(bill => {
    let dateStr = '—';
    if (bill.dueDate) {
      dateStr = new Date(bill.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    
    html += `<tr style="border-bottom:1px dashed var(--border-color);">
      <td style="padding:8px 0; color:var(--text-muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${dateStr}</td>
      <td style="padding:8px 0; color:var(--text-primary); font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${bill.customerName || bill.customerId?.substring(0, 8) || '—'}</td>
      <td style="padding:8px 0; color:var(--text-muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${bill.planName || 'Standard'}</td>
      <td style="padding:8px 0; color:var(--text-muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${formatCurrency(bill.amount)}</td>
      <td style="padding:8px 0; padding-right:0;">
        <span style="display:inline-block; padding:3px 4px; border-radius:12px; font-size:0.58rem; font-weight:700; text-align:center; width:100%; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
            ${bill.paymentStatus === 'paid' ? 'background:var(--status-paid-bg); color:var(--status-paid-text);' : 
              bill.paymentStatus === 'pending' ? 'background:var(--status-pending-bg); color:var(--status-pending-text);' : 
              'background:var(--status-overdue-bg); color:var(--status-overdue-text);'}">
          ${bill.paymentStatus.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
        </span>
      </td>
    </tr>`;
  });

  html += '</tbody></table>';
  container.innerHTML = html;
}

function renderBillingPagination(currentPage, total, onPageChange) {
  const pg = document.getElementById('recent-billing-pagination');
  const pageInfo = document.getElementById('billing-page-info');
  if (!pg) return;

  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Update info text
  const from = (currentPage - 1) * PAGE_SIZE + 1;
  const to = Math.min(currentPage * PAGE_SIZE, total);
  if (pageInfo) pageInfo.textContent = total > 0 ? `${from}–${to} of ${total}` : '';

  // Hide pagination bar if only 1 page
  if (totalPages <= 1) {
    pg.style.display = 'none';
    return;
  }

  pg.style.display = 'flex';

  // Build page number pills (show max 5 around current)
  const maxPills = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxPills / 2));
  let endPage = Math.min(totalPages, startPage + maxPills - 1);
  if (endPage - startPage < maxPills - 1) startPage = Math.max(1, endPage - maxPills + 1);

  let pillsHtml = '';
  if (startPage > 1) pillsHtml += `<button class="pg-pill" data-pg="1">1</button>${startPage > 2 ? '<span class="pg-ellipsis">…</span>' : ''}`;
  for (let i = startPage; i <= endPage; i++) {
    pillsHtml += `<button class="pg-pill ${i === currentPage ? 'active' : ''}" data-pg="${i}">${i}</button>`;
  }
  if (endPage < totalPages) pillsHtml += `${endPage < totalPages - 1 ? '<span class="pg-ellipsis">…</span>' : ''}<button class="pg-pill" data-pg="${totalPages}">${totalPages}</button>`;

  pg.innerHTML = `
    <div style="display:flex; align-items:center; gap:4px;">
      <button class="pg-btn" id="pg-prev" ${currentPage === 1 ? 'disabled' : ''} data-pg="${currentPage - 1}">
        <span class="material-icons-outlined" style="font-size:16px;">chevron_left</span> Prev
      </button>
      ${pillsHtml}
      <button class="pg-btn" id="pg-next" ${currentPage === totalPages ? 'disabled' : ''} data-pg="${currentPage + 1}">
        Next <span class="material-icons-outlined" style="font-size:16px;">chevron_right</span>
      </button>
    </div>
  `;

  // Wire up clicks
  pg.querySelectorAll('[data-pg]').forEach(btn => {
    btn.addEventListener('click', () => {
      const page = parseInt(btn.dataset.pg);
      if (!btn.disabled && page >= 1 && page <= totalPages) {
        onPageChange(page);
        // Scroll card into view smoothly
        document.getElementById('recent-billing')?.closest('.glass-card')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
  });
}

