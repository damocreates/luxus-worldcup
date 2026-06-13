// ── Auth utilities ─────────────────────────────────────────────────────────────
const AUTH_KEY = 'luxus_wc_user';

function getUser() {
  return localStorage.getItem(AUTH_KEY);
}

function logout() {
  localStorage.removeItem(AUTH_KEY);
  location.replace('welcome.html');
}

function populateNavUser() {
  const name = getUser();
  const nameEl    = document.getElementById('nav-name');
  const logoutEl  = document.getElementById('nav-logout');
  if (nameEl && name) nameEl.textContent = name;
  if (logoutEl) logoutEl.addEventListener('click', function (e) { e.preventDefault(); logout(); });
}
