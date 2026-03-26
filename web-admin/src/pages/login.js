/**
 * Login Page
 */
export function renderLoginPage() {
  return `
    <div class="login-page">
      <div class="login-card">
        <div class="login-brand">
          <div class="brand-icon">📡</div>
          <h1>WiFi Billing</h1>
          <p>Admin Dashboard</p>
        </div>

        <div class="login-error" id="login-error"></div>

        <form class="login-form" id="login-form">
          <div class="form-group">
            <label class="form-label">Email Address</label>
            <input type="email" class="form-input" id="login-email" placeholder="admin@example.com" required autocomplete="email">
          </div>
          <div class="form-group">
            <label class="form-label">Password</label>
            <input type="password" class="form-input" id="login-password" placeholder="Enter your password" required autocomplete="current-password">
          </div>
          <button type="submit" class="btn btn-primary" id="login-submit">
            Sign In
          </button>
        </form>
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
