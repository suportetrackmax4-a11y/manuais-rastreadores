(function () {
  // ---------- tema claro/escuro ----------
  var root = document.documentElement;
  var themeBtn = document.querySelector('.theme');
  if (themeBtn) themeBtn.addEventListener('click', function () {
    var dark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    root.dataset.theme = dark ? 'light' : 'dark';
    try { localStorage.setItem('tema', root.dataset.theme); } catch (e) {}
  });

  // ---------- botão copiar ----------
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise(function (ok, fail) {
      var ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy') ? ok() : fail(); } catch (e) { fail(e); }
      document.body.removeChild(ta);
    });
  }
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.copy');
    if (!btn) return;
    var code = btn.parentNode.querySelector('code').innerText;
    copyText(code).then(function () {
      btn.textContent = 'Copiado ✓'; btn.classList.add('done');
      setTimeout(function () { btn.textContent = 'Copiar'; btn.classList.remove('done'); }, 1500);
    }, function () { btn.textContent = 'Erro'; });
  });

  var norm = function (s) { return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); };
  var escHtml = function (s) { return s.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

  // ---------- busca geral (página inicial) ----------
  var busca = document.getElementById('busca');
  if (busca) {
    var box = document.getElementById('resultados');
    var cards = Array.prototype.slice.call(document.querySelectorAll('.card'));
    var idx = null;
    function highlight(text, terms) {
      var out = escHtml(text);
      terms.forEach(function (t) {
        if (!t) return;
        var re = new RegExp('(' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig');
        out = out.replace(re, '<mark>$1</mark>');
      });
      return out;
    }
    function snippet(text, terms) {
      var n = norm(text), pos = -1;
      for (var i = 0; i < terms.length && pos < 0; i++) pos = n.indexOf(terms[i]);
      if (pos < 0) pos = 0;
      var start = Math.max(0, pos - 60), end = Math.min(text.length, pos + 140);
      return (start ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '');
    }
    function run() {
      var q = norm(busca.value.trim());
      var terms = q.split(/\s+/).filter(Boolean);
      cards.forEach(function (c) {
        c.hidden = terms.length > 0 && !terms.every(function (t) { return norm(c.dataset.name).indexOf(t) >= 0; });
      });
      // esconde grupos (pastas) sem nenhum card visível
      Array.prototype.forEach.call(document.querySelectorAll('.home > section:not(.hero)'), function (s) {
        s.hidden = !s.querySelector('.card:not([hidden])');
      });
      if (!terms.length) { box.hidden = true; box.innerHTML = ''; return; }
      idx = idx || (window.SEARCH_INDEX || []).map(function (r) { return { r: r, n: norm(r.m + ' ' + r.s + ' ' + r.t), m: norm(r.m) }; });
      var hits = [];
      idx.forEach(function (x) {
        if (!terms.every(function (t) { return x.n.indexOf(t) >= 0; })) return;
        var score = 0;
        terms.forEach(function (t) { if (x.m.indexOf(t) >= 0) score += 5; if (norm(x.r.s).indexOf(t) >= 0) score += 2; });
        hits.push({ x: x, score: score });
      });
      hits.sort(function (a, b) { return b.score - a.score; });
      var html = hits.slice(0, 40).map(function (h) {
        var r = h.x.r;
        return '<a class="result" href="' + r.u + '"><div class="where"><b>' + escHtml(r.m) + '</b> · ' + escHtml(r.s) +
          '</div><div class="snip">' + highlight(snippet(r.t, terms), busca.value.trim().split(/\s+/)) + '</div></a>';
      }).join('');
      box.innerHTML = hits.length ? '<p class="muted">' + hits.length + ' resultado(s)' + (hits.length > 40 ? ', mostrando 40' : '') + '</p>' + html
        : '<p class="muted">Nada encontrado.</p>';
      box.hidden = false;
    }
    var timer;
    busca.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(run, 120); });
    busca.addEventListener('keydown', function (e) { if (e.key === 'Escape') { busca.value = ''; run(); } });
  }

  // ---------- filtro dentro da página de modelo ----------
  var filtro = document.getElementById('filtro');
  if (filtro) {
    var blocks = Array.prototype.slice.call(document.querySelectorAll('.doc > .code, .doc > p, .doc > ul, .doc > ol, .doc > .table-wrap, .doc > blockquote'));
    filtro.addEventListener('input', function () {
      var terms = norm(filtro.value.trim()).split(/\s+/).filter(Boolean);
      blocks.forEach(function (b) {
        var hit = !terms.length || terms.every(function (t) { return norm(b.textContent).indexOf(t) >= 0; });
        b.classList.toggle('hide-filter', !hit);
      });
    });
  }

  // ---------- destaque do sumário ao rolar ----------
  var links = Array.prototype.slice.call(document.querySelectorAll('.toc a[href^="#"]'));
  if (links.length && 'IntersectionObserver' in window) {
    var map = {};
    links.forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; });
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          links.forEach(function (a) { a.classList.remove('on'); });
          var a = map[en.target.id]; if (a) a.classList.add('on');
        }
      });
    }, { rootMargin: '-80px 0px -70% 0px' });
    Object.keys(map).forEach(function (id) { var el = document.getElementById(id); if (el) obs.observe(el); });
  }
})();
