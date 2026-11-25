/* Interaction layer: the things that make the site feel like a simulation.
   Pop-in reveals, progress bar, card tilt, hero grid, phone menu, active
   nav, gowning mini-game, "find your fit" picker, form readiness, and
   achievement toasts. Everything is skipped or stilled for visitors who
   prefer reduced motion. */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var RM = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var FINE = window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches;
  var store = {
    get: function (k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };

  /* ---------------- achievements ---------------- */
  var ACH = {
    brake: ['Safe hands', 'You set the brake first.'],
    rolled: ['Learned the hard way', 'You watched the car roll. That one sticks.'],
    gowned: ['Cleanroom ready', 'Dressed top to bottom, in the right order.'],
    quickplay: ['Hands on', 'You played a simulation.'],
    fit: ['Mission planned', 'You found your setup.']
  };
  var got = store.get('rz-ach') || {};
  var toasts = document.createElement('div');
  toasts.className = 'toasts';
  toasts.setAttribute('aria-live', 'polite');
  document.body.appendChild(toasts);
  document.addEventListener('achieve', function (e) {
    var id = e.detail, a = ACH[id];
    if (!a || got[id]) return;
    got[id] = 1; store.set('rz-ach', got);
    var n = Object.keys(got).filter(function (k) { return ACH[k]; }).length, total = Object.keys(ACH).length;
    var t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = '<span class="toast__star" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7-6.2-3.7-6.2 3.7 1.6-7L2 9.2l7.1-.6z" fill="currentColor"/></svg></span>' +
      '<span class="toast__txt"><small>Achievement ' + n + ' of ' + total + '</small><b>' + a[0] + '</b><span>' + a[1] + '</span></span>';
    toasts.appendChild(t);
    requestAnimationFrame(function () { t.classList.add('is-in'); });
    setTimeout(function () { t.classList.add('is-out'); setTimeout(function () { t.parentNode && t.parentNode.removeChild(t); }, 450); }, 3600);
  });

  /* ---------------- scroll progress bar ---------------- */
  var bar = document.createElement('div');
  bar.className = 'xp';
  bar.setAttribute('aria-hidden', 'true');
  bar.innerHTML = '<i></i>';
  document.body.appendChild(bar);
  var ticking = false;
  function onScroll() {
    if (ticking) return; ticking = true;
    requestAnimationFrame(function () {
      var h = document.documentElement, max = h.scrollHeight - h.clientHeight;
      bar.firstChild.style.transform = 'scaleX(' + (max > 0 ? h.scrollTop / max : 0) + ')';
      ticking = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

  /* ---------------- pop-in reveals ---------------- */
  var POP = ['.hero h1', '.hero__copy > *', '.section__head h2', '.section__head p', '.fit', '.filters', '.level', '.series-note', '.versus__words', '.versus__vs', '.versus__picture',
    '.principles li', '.service', '.package', '.deliver li', '.step', '.player', '.about__text', '.faq details', '.quote',
    '.contact h2', '.contact p', '.form', '.cs-meta div', '.cs-sec', '.decision', '.flow__row', '.stat', '.yc'];
  var io = !RM && 'IntersectionObserver' in window ? new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-popped');
      io.unobserve(e.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }) : null;
  function scan() {
    if (!io) return;
    $$(POP.join(',')).forEach(function (el) {
      if (el.hasAttribute('data-pop')) return;
      // stagger siblings that arrive together
      var sibs = el.parentNode ? $$(':scope > [data-pop]', el.parentNode) : [];
      el.setAttribute('data-pop', '');
      el.style.setProperty('--d', Math.min(sibs.length, 6) * 80 + 'ms');
      // once it has arrived, mark it done so later class changes can't hide it again
      el.addEventListener('animationend', function done(ev) {
        if (ev.target !== el || ev.animationName !== 'pop-in') return;
        el.setAttribute('data-pop', 'done');
        el.removeEventListener('animationend', done);
      });
      var r = el.getBoundingClientRect();
      if (r.top < innerHeight * 0.9 && r.bottom > 0 && el.closest('.hero')) { el.classList.add('is-popped'); return; }
      io.observe(el);
    });
  }
  scan();
  document.addEventListener('site:data', function () { setTimeout(scan, 0); });

  /* ---------------- card tilt + glare ---------------- */
  if (FINE && !RM) {
    document.addEventListener('pointermove', function (e) {
      var card = e.target.closest && e.target.closest('.level');
      var img = card && card.querySelector('.level__img');
      if (!img) return;
      var r = img.getBoundingClientRect();
      var x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
      img.style.setProperty('--rx', ((0.5 - y) * 7).toFixed(2) + 'deg');
      img.style.setProperty('--ry', ((x - 0.5) * 9).toFixed(2) + 'deg');
      img.style.setProperty('--gx', (x * 100).toFixed(1) + '%');
      img.style.setProperty('--gy', (y * 100).toFixed(1) + '%');
      img.classList.add('is-tilt');
    });
    document.addEventListener('pointerout', function (e) {
      var card = e.target.closest && e.target.closest('.level');
      if (card && !card.contains(e.relatedTarget)) card.querySelector('.level__img').classList.remove('is-tilt');
    });
  }

  /* ---------------- hero: a grid of dots that reacts to you ---------------- */
  (function () {
    var hero = $('.hero');
    if (!hero) return;
    var cv = document.createElement('canvas');
    cv.className = 'hero__grid'; cv.setAttribute('aria-hidden', 'true');
    hero.insertBefore(cv, hero.firstChild);
    var cx = cv.getContext('2d'), dpr = Math.min(2, window.devicePixelRatio || 1), W = 0, H = 0, GAP = 30;
    var P = { x: -999, y: -999 }, ripples = [], visible = true, t0 = performance.now();
    function size() { W = hero.clientWidth; H = hero.clientHeight; cv.width = W * dpr; cv.height = H * dpr; cx.setTransform(dpr, 0, 0, dpr, 0, 0); if (RM) draw(t0); }
    size(); window.addEventListener('resize', size);
    hero.addEventListener('pointermove', function (e) { var r = hero.getBoundingClientRect(); P.x = e.clientX - r.left; P.y = e.clientY - r.top; });
    hero.addEventListener('pointerleave', function () { P.x = P.y = -999; });
    hero.addEventListener('pointerdown', function (e) { if (e.target.closest('button,a')) return; var r = hero.getBoundingClientRect(); ripples.push({ x: e.clientX - r.left, y: e.clientY - r.top, t: 0, c: [102, 217, 255] }); });
    document.addEventListener('yc:result', function (e) {
      var yc = $('.yc'); if (!yc) return;
      var a = yc.getBoundingClientRect(), r = hero.getBoundingClientRect();
      ripples.push({ x: a.left - r.left + a.width / 2, y: a.top - r.top + a.height / 2, t: 0, c: e.detail.ok ? [198, 255, 61] : [255, 79, 109], big: 1 });
    });
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }).observe(hero);
    function draw(now) {
      var time = (now - t0) / 1000;
      cx.clearRect(0, 0, W, H);
      ripples.forEach(function (r) { r.t += 1; });
      ripples = ripples.filter(function (r) { return r.t < (r.big ? 120 : 80); });
      for (var y = GAP / 2; y < H; y += GAP) {
        for (var x = GAP / 2; x < W; x += GAP) {
          var dx = x - P.x, dy = y - P.y, d = Math.sqrt(dx * dx + dy * dy);
          var g = Math.max(0, 1 - d / 150), col = [198, 255, 61], amb = RM ? 0 : (Math.sin(x * 0.018 + y * 0.012 + time * 0.9) + 1) * 0.06;
          var ox = 0, oy = 0;
          if (g > 0 && d > 0) { ox = dx / d * g * 6; oy = dy / d * g * 6; }
          for (var i = 0; i < ripples.length; i++) {
            var rp = ripples[i], rd = Math.hypot(x - rp.x, y - rp.y), rr = rp.t * (rp.big ? 9 : 7), k = Math.exp(-Math.pow((rd - rr) / 22, 2)) * (1 - rp.t / (rp.big ? 120 : 80));
            if (k > g) { g = k; col = rp.c; }
          }
          var a = 0.16 + amb + g * 0.84;
          cx.fillStyle = g > 0.02 ? 'rgba(' + col[0] + ',' + col[1] + ',' + col[2] + ',' + a.toFixed(3) + ')' : 'rgba(203,189,235,' + a.toFixed(3) + ')';
          cx.beginPath(); cx.arc(x + ox, y + oy, 1.3 + g * 2.4, 0, 6.283); cx.fill();
        }
      }
    }
    if (!RM) (function loop(now) { if (visible && !document.hidden) draw(now); requestAnimationFrame(loop); })(t0);
  })();

  /* ---------------- phone menu ---------------- */
  (function () {
    var head = $('.site-head .wrap'), nav = $('.site-nav');
    if (!head || !nav) return;
    nav.id = nav.id || 'site-nav';
    var b = document.createElement('button');
    b.className = 'menu-btn'; b.type = 'button';
    b.setAttribute('aria-expanded', 'false'); b.setAttribute('aria-controls', nav.id); b.setAttribute('aria-label', 'Menu');
    b.innerHTML = '<span></span><span></span><span></span>';
    head.insertBefore(b, nav);
    function set(open) { document.documentElement.classList.toggle('menu-open', open); b.setAttribute('aria-expanded', open); }
    b.addEventListener('click', function () { set(b.getAttribute('aria-expanded') !== 'true'); });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) set(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') set(false); });
  })();

  /* ---------------- active section in the nav ---------------- */
  (function () {
    var links = $$('.site-nav a[href^="#"]:not(.btn)');
    if (!links.length || !('IntersectionObserver' in window)) return;
    var map = {};
    links.forEach(function (a) { var s = $(a.getAttribute('href')); if (s) map[s.id] = a; });
    var obs = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        var a = map[e.target.id]; if (!a) return;
        if (e.isIntersecting) { links.forEach(function (l) { l.classList.remove('is-active'); }); a.classList.add('is-active'); }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(map).forEach(function (id) { obs.observe(document.getElementById(id)); });
  })();

  /* ---------------- gowning mini-game ---------------- */
  (function () {
    var fig = $('[data-gowning]');
    if (!fig) return;
    var svg = $('svg', fig), msg = $('.gw-msg', fig), reset = $('.gw-reset', fig);
    var NAMES = { 1: 'hairnet', 2: 'hood', 3: 'coverall', 4: 'shoe covers', 5: 'gloves' };
    var next = 1, slips = 0;
    function say(t, kind) { msg.textContent = t; msg.className = 'gw-msg' + (kind ? ' is-' + kind : ''); }
    function pick(b) {
      var step = +b.getAttribute('data-step');
      if (next > 5 || b.classList.contains('is-done')) return;
      if (step === next) {
        b.classList.add('is-done');
        svg.classList.add('w' + step);
        next++;
        if (next > 5) {
          say(slips ? 'Clean, after ' + slips + ' slip' + (slips > 1 ? 's' : '') + '. Now you know why the order matters: particles fall.' : 'Clean on the first try. You learned the rule by doing it, not reading it.', 'good');
          reset.hidden = false;
          document.dispatchEvent(new CustomEvent('achieve', { detail: 'gowned' }));
        } else say('The ' + NAMES[step] + ' is on. What’s next?', 'step');
      } else {
        slips++;
        b.classList.remove('is-wrong'); svg.classList.remove('is-dusting', 'is-dirty');
        void svg.getBoundingClientRect();
        b.classList.add('is-wrong'); svg.classList.add('is-dusting', 'is-dirty');
        setTimeout(function () { svg.classList.remove('is-dirty'); }, 900);
        say('Dust just fell on the clean ' + (next > 3 ? 'suit' : 'clothes') + '. Particles fall, so dress from the top: the ' + NAMES[next] + ' comes first.', 'bad');
      }
    }
    $$('.gw-b', svg).forEach(function (b) {
      b.addEventListener('click', function () { pick(b); });
      b.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(b); } });
    });
    reset.addEventListener('click', function () {
      next = 1; slips = 0;
      $$('.gw-b', svg).forEach(function (b) { b.classList.remove('is-done', 'is-wrong'); });
      svg.setAttribute('class', '');
      reset.hidden = true;
      say('Your turn: tap the garments in the order you’d put them on.');
      $('.gw-b', svg).focus();
    });
  })();

  /* ---------------- find your fit ---------------- */
  (function () {
    var box = $('[data-fit]');
    if (!box) return;
    var A = {};
    var REC = {
      steps: { s: ['Virtual simulation training', 'E-learning development'], pkg: 'Build', why: 'A simulation lets people skip a step safely and see what it causes.' },
      judgment: { s: ['Virtual simulation training', 'Discussion-based learning'], pkg: 'Build', why: 'Risky calls are practised best where the risk is fake and the reasons get talked through.' },
      finish: { s: ['E-learning development'], pkg: 'Build', why: 'Courses get finished when every screen asks for a decision, not a click on "next".' },
      engage: { s: ['Training activity design', 'Train the trainer'], pkg: 'Spark', why: 'New activities, and trainers who feel confident running them.' },
      measure: { s: ['Learning evaluation and dashboards'], pkg: 'Programme', why: 'Measure what people can do, then see the gaps on one dashboard.' },
      explain: { s: ['Video explainers'], pkg: 'Spark', why: 'One idea, one short animated video, built around the mistake people make.' }
    };
    var WHERE = { lms: 'A SCORM package, uploaded and tested in your LMS', none: 'Hosted on my LMS, so there’s nothing to set up', live: 'Session plans and materials for your trainers', web: 'A link or embed for your website' };
    var PKG = { Spark: 'from €500, about 3 weeks', Build: 'from €1,800, about 4 weeks', Programme: 'from €3,900, about 5 weeks' };
    var LABEL = {};
    $$('[data-v]', box).forEach(function (b) { LABEL[b.getAttribute('data-v')] = b.textContent; });
    box.addEventListener('click', function (e) {
      var b = e.target.closest('[data-v]');
      if (!b) return;
      var q = b.parentNode.getAttribute('data-q');
      A[q] = b.getAttribute('data-v');
      $$('[data-v]', b.parentNode).forEach(function (x) { x.classList.toggle('is-on', x === b); x.setAttribute('aria-pressed', x === b); });
      if (q === 'problem') { var s2 = $('[data-step2]', box); if (s2.hidden) { s2.hidden = false; s2.classList.add('is-popped', 'is-entering'); } }
      if (A.problem && A.where) show();
    });
    function show() {
      var r = REC[A.problem], out = $('[data-fit-result]', box);
      out.innerHTML = '<div class="fit__card">' +
        '<p class="fit__kicker">Your setup</p>' +
        '<ul class="fit__list"><li><span>Build</span><b>' + r.s.join(' + ') + '</b></li>' +
        '<li><span>Package</span><b>' + r.pkg + ', ' + PKG[r.pkg] + '</b></li>' +
        '<li><span>Delivered</span><b>' + WHERE[A.where] + '</b></li></ul>' +
        '<p class="fit__why">' + r.why + '</p>' +
        '<a class="btn" href="#contact" data-fit-go>Start with this</a></div>';
      var c = $('.fit__card', out); void c.offsetWidth; c.classList.add('is-in');
      $('[data-fit-go]', out).addEventListener('click', function () {
        var f = $('[data-contact-form]'); if (!f) return;
        var sv = $('select[name=service]', f), pk = $('select[name=package]', f), m = $('textarea[name=message]', f);
        Array.prototype.forEach.call(sv.options, function (o) { if (o.text === r.s[0]) sv.value = o.value; });
        Array.prototype.forEach.call(pk.options, function (o) { if (o.text.indexOf(r.pkg) === 0) pk.value = o.value; });
        if (!m.value) m.value = 'What’s going wrong: ' + LABEL[A.problem] + '. Where it should run: ' + { lms: 'in our LMS', none: 'we don’t have an LMS yet', live: 'in live sessions', web: 'on our website' }[A.where] + '.\n\n';
        m.dispatchEvent(new Event('input', { bubbles: true }));
      });
      document.dispatchEvent(new CustomEvent('achieve', { detail: 'fit' }));
    }
  })();

  /* ---------------- contact form: readiness bar + celebration ---------------- */
  (function () {
    var f = $('[data-contact-form]');
    if (!f) return;
    var r = document.createElement('div');
    r.className = 'ready';
    r.innerHTML = '<span class="ready__l">Ready to send</span><b>0%</b><i><em></em></i>';
    f.insertBefore(r, f.firstChild);
    var req = $$('[required]', f);
    function upd() {
      var ok = req.filter(function (el) { return el.value.trim() && (el.type !== 'email' || /.+@.+\..+/.test(el.value)); }).length;
      var p = Math.round(ok / req.length * 100);
      $('b', r).textContent = p + '%';
      $('em', r).style.transform = 'scaleX(' + p / 100 + ')';
      r.classList.toggle('is-full', p === 100);
    }
    f.addEventListener('input', upd); f.addEventListener('change', upd); upd();
    document.addEventListener('form:sent', function () {
      upd();
      if (RM) return;
      var btn = $('button[type=submit]', f), b = btn.getBoundingClientRect(), cols = ['#C6FF3D', '#FF4F6D', '#66D9FF', '#FFF6EA'];
      for (var i = 0; i < 36; i++) {
        var s = document.createElement('i');
        s.className = 'confetti';
        s.style.left = b.left + b.width / 2 + 'px'; s.style.top = b.top + b.height / 2 + 'px';
        s.style.background = cols[i % cols.length];
        s.style.setProperty('--x', (Math.random() * 360 - 180).toFixed(0) + 'px');
        s.style.setProperty('--y', (-Math.random() * 260 - 60).toFixed(0) + 'px');
        s.style.setProperty('--r', (Math.random() * 720 - 360).toFixed(0) + 'deg');
        document.body.appendChild(s);
        setTimeout(function (el) { el.parentNode && el.parentNode.removeChild(el); }, 1300, s);
      }
    });
  })();
})();
