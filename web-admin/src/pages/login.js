/**
 * Login Page — Unified for Admin & Collector
 */
export function renderLoginPage() {
  return `
    <div class="login-split-page">
      <div class="login-split-container">
        <div class="login-illustration" style="background-image: url('/login-bg.png');">

      </div>
      
      <div class="login-form-side">
        <div class="login-card-inner">
          <div class="login-brand" style="text-align: center;">
            <div class="brand-icon" style="margin: 0 auto 24px auto;">
              <div class="wifi-animated">
                <div class="wifi-arc wifi-arc1"></div>
                <div class="wifi-arc wifi-arc2"></div>
                <div class="wifi-arc wifi-arc3"></div>
                <div class="wifi-dot"></div>
              </div>
            </div>
            <h2 style="font-family: 'Outfit', sans-serif; font-size: 2rem; color: #111827; margin-bottom: 8px;">Welcome WiFi Billing</h2>
            <p style="color: #4b5563; font-size: 0.95rem; margin-bottom: 32px;">Please provide your credentials to log in to your account.</p>
          </div>

          <div class="login-error" id="login-error"></div>

          <form class="login-form" id="login-form">
            <div class="form-group">
              <label class="form-label" style="color:#4b5563; font-weight:500;">Email</label>
              <input type="email" class="form-input" id="login-email" placeholder="name@example.com" required autocomplete="email" style="background:#ffffff; border-color:rgba(0,0,0,0.1); color:#111827; padding:12px 16px;">
            </div>
            
            <div class="form-group">
              <label class="form-label" style="color:#4b5563; font-weight:500;">Password</label>
              <div class="password-input-wrapper" style="position:relative;">
                <input type="password" class="form-input" id="login-password" placeholder="••••••••" required autocomplete="current-password" style="background:#ffffff; border-color:rgba(0,0,0,0.1); color:#111827; padding:12px 16px; padding-right:40px;">
                <span class="material-icons-outlined" id="toggle-password" style="position:absolute; right:12px; top:50%; transform:translateY(-50%); cursor:pointer; color:#4b5563; font-size:20px;">visibility_off</span>
              </div>
            </div>
            
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 32px; font-size: 0.85rem;">
              <label style="display:flex; align-items:center; gap:8px; cursor:pointer; color:#4b5563;">
                <input type="checkbox" style="accent-color: #4f46e5; width:16px; height:16px; border-radius:4px; border:1px solid rgba(0,0,0,0.1);"> Remember me
              </label>
              <a href="#" style="color:#4f46e5; text-decoration:none;">Forgot password?</a>
            </div>

            <button type="submit" class="btn" id="login-submit" style="width: 100%; padding: 14px; font-size: 1rem; border-radius: 8px; font-weight:600; background:#4f46e5; color:white; border:none; transition:0.2s;">
              Login
            </button>
          </form>
        </div>
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

  const togglePassword = document.getElementById('toggle-password');
  const passwordInput = document.getElementById('login-password');
  
  if (togglePassword) {
    togglePassword.addEventListener('click', () => {
      if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        togglePassword.textContent = 'visibility';
      } else {
        passwordInput.type = 'password';
        togglePassword.textContent = 'visibility_off';
      }
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
      errorEl.textContent = 'Please fill in all fields.';
      errorEl.classList.add('show');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner" style="width:18px;height:18px;border-width:2px;"></span> Logging in...';
    errorEl.classList.remove('show');

    try {
      await onLogin(email, password);
    } catch (error) {
      errorEl.textContent = error.message || 'Login failed. Please try again.';
      errorEl.classList.add('show');
      submitBtn.disabled = false;
      submitBtn.innerHTML = 'Login';
    }
  });
}
