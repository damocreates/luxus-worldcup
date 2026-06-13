// ── Auth utilities ─────────────────────────────────────────────────────────────
const AUTH_KEY     = 'luxus_wc_user';
const WATCHING_KEY = 'luxus_wc_watching';

function getUser() {
  return localStorage.getItem(AUTH_KEY);
}

function logout() {
  localStorage.removeItem(AUTH_KEY);
  localStorage.removeItem(WATCHING_KEY);
  location.replace('welcome.html');
}

function populateNavUser() {
  const name = getUser();

  // Desktop: name (click → settings) + "Not you?" logout
  const nameEl   = document.getElementById('nav-name');
  const logoutEl = document.getElementById('nav-logout');
  if (nameEl && name) {
    nameEl.textContent = name;
    nameEl.style.cursor = 'pointer';
    nameEl.title = 'Settings';
    nameEl.addEventListener('click', function (e) {
      e.preventDefault();
      if (typeof openSettings === 'function') openSettings();
    });
  }
  if (logoutEl) {
    logoutEl.addEventListener('click', function (e) { e.preventDefault(); logout(); });
  }

  // Mobile drawer: user name + sign out
  const drawerNameEl   = document.getElementById('nav-drawer-name');
  const drawerLogoutEl = document.getElementById('nav-drawer-logout');
  if (drawerNameEl && name) drawerNameEl.textContent = name;
  if (drawerLogoutEl) {
    drawerLogoutEl.addEventListener('click', function (e) { e.preventDefault(); logout(); });
  }

  // Hamburger toggle
  const toggleBtn = document.getElementById('nav-toggle');
  const drawer    = document.getElementById('nav-drawer');
  if (toggleBtn && drawer) {
    toggleBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      const open = drawer.classList.toggle('open');
      toggleBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggleBtn.textContent = open ? '✕' : '☰';
    });

    // Close on any link click inside drawer
    drawer.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') {
        drawer.classList.remove('open');
        toggleBtn.textContent = '☰';
      }
    });

    // Close when clicking outside the header
    document.addEventListener('click', function (e) {
      if (!e.target.closest('header')) {
        drawer.classList.remove('open');
        toggleBtn.textContent = '☰';
      }
    });
  }
}
