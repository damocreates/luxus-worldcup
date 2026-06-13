(function () {
  var k = 'luxus_wc_user';
  if (localStorage.getItem(k)) { location.replace('dashboard.html'); return; }

  var roster = ['Anna','Ben','Cam','Chris','Colin','Damo','Dan','Daisy','Dave H','Dave O','Dylan','Ellie','Emre','Erica','Gem','Gus','Jax','Kenny','Lewis','Lex','Melbin','Ryan','Wilky'];

  function attempt() {
    var raw   = (document.getElementById('name-input').value || '').trim();
    var match = roster.find(function (n) { return n.toLowerCase() === raw.toLowerCase(); });
    if (match) {
      localStorage.setItem(k, match);
      location.replace('dashboard.html');
    } else {
      var inp = document.getElementById('name-input');
      inp.classList.remove('shake');
      void inp.offsetWidth;
      inp.classList.add('shake');
      var err = document.getElementById('welcome-error');
      if (err) err.classList.remove('hidden');
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    var vEl = document.getElementById('version-display');
    if (vEl && typeof VERSION !== 'undefined') vEl.textContent = VERSION;

    document.getElementById('continue-btn').addEventListener('click', attempt);

    document.getElementById('name-input').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') attempt();
    });

    document.getElementById('name-input').addEventListener('input', function () {
      var err = document.getElementById('welcome-error');
      if (err) err.classList.add('hidden');
    });
  });
})();
