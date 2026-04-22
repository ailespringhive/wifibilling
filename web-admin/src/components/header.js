/**
 * Header Component — with Material Icons, notification panel, user dropdown
 */
export function renderHeader(pageTitle, pageSubtitle = '') {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  return `
    <header class="main-header">
      <div class="header-left">
        <button class="menu-toggle" id="menu-toggle"><span class="material-icons-outlined">menu</span></button>
        <div>
          <div class="page-title" id="header-dynamic-title" style="font-size: 1.4rem;">${pageTitle}</div>
        </div>
      </div>
      <div class="header-center">
        <!-- Center removed to match mockup -->
      </div>
      <div class="header-right">
        <!-- Theme Toggle -->
        <div class="theme-switch-wrapper">
           <span class="material-icons-outlined theme-switch-icon" style="font-size:15px;">light_mode</span>
           <label class="theme-switch" for="theme-toggle">
             <input type="checkbox" id="theme-toggle" />
             <div class="slider round">
               <div class="slider-circle"></div>
             </div>
           </label>
           <span class="material-icons-outlined theme-switch-icon" style="font-size:15px;">dark_mode</span>
        </div>

        <!-- Notification Bell -->
        <div class="header-notif-dropdown" id="header-notif-dropdown">
          <button class="header-notif-btn" id="header-notif-btn" title="Notifications">
            <span class="material-icons-outlined">notifications</span>
            <span class="notif-badge" id="overdue-badge">3</span>
          </button>
          <div class="notif-dropdown-menu" id="notif-dropdown-menu">
            <div class="notif-dropdown-header">
              <span style="font-weight:700; font-size:0.9rem;">Notifications</span>
              <button class="btn btn-ghost btn-sm" id="mark-all-read-btn" style="font-size:0.72rem;">Mark all read</button>
            </div>
            <div class="notif-dropdown-body" id="notif-list">
              <!-- Notifications rendered here -->
            </div>
            <div class="notif-dropdown-footer">
              <button class="btn btn-ghost btn-sm" id="view-all-notifs-btn" style="width:100%; justify-content:center;">View All</button>
            </div>
          </div>
        </div>

        <!-- User Dropdown -->
        <div class="header-user-dropdown" id="header-user-dropdown">
          <button class="header-user-btn" id="header-user-btn">
            <span class="header-user-name" id="header-user-name">Admin</span>
            <div class="header-user-avatar" id="user-avatar">A</div>
            <span class="material-icons-outlined header-user-arrow" style="font-size:18px;">expand_more</span>
          </button>
          <div class="user-dropdown-menu" id="user-dropdown-menu">
            <div class="dropdown-user-info">
              <div class="dropdown-avatar" id="dropdown-avatar">A</div>
              <div>
                <div class="dropdown-name" id="dropdown-name">Admin</div>
                <div class="dropdown-role">Administrator</div>
              </div>
            </div>
            <div class="dropdown-divider"></div>
            <button class="dropdown-item" id="profile-btn">
              <span class="material-icons-outlined" style="font-size:18px;">person</span> Profile
            </button>
            <button class="dropdown-item dropdown-item-danger logout-action" id="logout-btn">
              <span class="material-icons-outlined" style="font-size:18px;">logout</span> Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  `;
}
