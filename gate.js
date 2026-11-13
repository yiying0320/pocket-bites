// Simple password gate. Only the SHA-256 hash of the password lives in config.js.
// This keeps casual visitors out; it is not real security for a static site.
(function () {
  var HASH = window.POCKET_BITES_PASS_HASH || '';
  if (!HASH) return;
  var saved = '';
  try { saved = localStorage.getItem('pocket-bites-pass') || ''; } catch (e) {}
  if (saved === HASH) return;
  document.documentElement.classList.add('locked');

  async function sha256(text) {
    var buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf)).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
  }

  function build() {
    var gate = document.createElement('div');
    gate.id = 'gate';
    gate.innerHTML =
      '<form class="gate-card">' +
      '<img src="elephant.svg?v=5" alt="">' +
      '<h1>吃點可愛的</h1>' +
      '<p>這是小象的秘密基地 ♡<br>請輸入密碼</p>' +
      '<input type="password" id="gatePass" aria-label="密碼" placeholder="密碼" autocomplete="current-password" required>' +
      '<label class="gate-remember"><input type="checkbox" id="gateRemember" checked> 在這台裝置記住我</label>' +
      '<button>進去找好吃的 →</button>' +
      '<p class="gate-error" id="gateError" role="alert"></p>' +
      '</form>';
    document.body.appendChild(gate);
    var input = gate.querySelector('#gatePass');
    input.focus();
    gate.querySelector('form').addEventListener('submit', async function (e) {
      e.preventDefault();
      var h = await sha256(input.value);
      if (h === HASH) {
        if (gate.querySelector('#gateRemember').checked) {
          try { localStorage.setItem('pocket-bites-pass', h); } catch (err) {}
        }
        document.documentElement.classList.remove('locked');
        gate.remove();
      } else {
        gate.querySelector('#gateError').textContent = '密碼不對喔，再試一次 🐘';
        input.select();
        gate.querySelector('.gate-card').classList.remove('shake');
        void gate.offsetWidth;
        gate.querySelector('.gate-card').classList.add('shake');
      }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build); else build();
})();
