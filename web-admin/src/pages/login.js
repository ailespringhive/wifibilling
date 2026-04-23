/**
 * Login Page — Unified for Admin & Collector
 */
export function renderLoginPage() {
  return `
    <div class="login-page">
      <div class="login-bg-dots"></div>
      <div class="login-card">
        <!-- Public Ticket Portal Link -->
        <a href="/report/" class="login-public-ticket-btn" title="Submit a Repair Ticket">
          <span class="material-icons-outlined">confirmation_number</span>
        </a>
        <style>
          .login-public-ticket-btn {
            position: absolute; top: 18px; right: 20px;
            color: var(--text-muted); opacity: 0.6;
            transition: all 0.25s ease; text-decoration: none;
            display: flex; align-items: center; justify-content: center;
            width: 38px; height: 38px; border-radius: 8px;
            background: rgba(255,255,255,0.02); border: 1px solid transparent;
          }
          .login-public-ticket-btn:hover {
            opacity: 1; color: var(--blue);
            background: rgba(59, 130, 246, 0.1);
            border-color: rgba(59, 130, 246, 0.3);
            transform: translateY(-1px);
          }
        </style>
        <div class="login-brand">
          <div class="brand-icon">
            <div class="wifi-animated">
              <div class="wifi-arc wifi-arc1"></div>
              <div class="wifi-arc wifi-arc2"></div>
              <div class="wifi-arc wifi-arc3"></div>
              <div class="wifi-dot"></div>
            </div>
          </div>
          <div class="login-3d-wrapper">
            <div class="login-3d-text">
              WiFi Billing
              <div class="login-3d-layer">WiFi Billing</div>
              <div class="login-3d-layer">WiFi Billing</div>
              <div class="login-3d-layer">WiFi Billing</div>
              <div class="login-3d-layer">WiFi Billing</div>
            </div>
          </div>
          <p>Sign in to your account</p>
        </div>

        <div class="login-error" id="login-error"></div>

        <form class="login-form" id="login-form">
          <div class="form-group">
            <label class="form-label">Email Address</label>
            <input type="email" class="form-input" id="login-email" placeholder="Enter your email" required autocomplete="email">
          </div>
          <div class="form-group">
            <label class="form-label">Password</label>
            <input type="password" class="form-input" id="login-password" placeholder="Enter your password" required autocomplete="current-password">
          </div>
          <button type="submit" class="btn btn-primary" id="login-submit">
            Sign In
          </button>
        </form>

        <div style="text-align: center; margin-top: 24px; font-size: 0.75rem; color: var(--text-muted);">
          Admins & Collectors use the same login
        </div>
      </div>
    </div>
  `;
}

/**
 * Init login page events
 */
export function initLoginPage(onLogin) {
  const form = document.getElementById('login-form');
  const errorEl = document.getElementById('login-error');
  const submitBtn = document.getElementById('login-submit');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    if (!email || !password) {
      errorEl.textContent = 'Please fill in all fields.';
      errorEl.classList.add('show');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner" style="width:18px;height:18px;border-width:2px;"></span> Signing in...';
    errorEl.classList.remove('show');

    try {
      await onLogin(email, password);
    } catch (error) {
      errorEl.textContent = error.message || 'Login failed. Please try again.';
      errorEl.classList.add('show');
      submitBtn.disabled = false;
      submitBtn.innerHTML = 'Sign In';
    }
  });
}
