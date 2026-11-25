/* Renders the parts of the site that come from data/site.json:
   contact details, the project grid, client names, testimonials,
   outcomes on case studies, and the contact form.
   Edit that file through the admin panel (/admin/), not by hand. */
(function () {
  var BASE = new URL('../', document.currentScript.src).href;
  var url = function (p) { return /^https?:/.test(p) ? p : BASE + p; };
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  var $ = function (sel) { return document.querySelector(sel); };
  var $$ = function (sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); };

  fetch(BASE + 'data/site.json', { cache: 'no-cache' })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(render)
    .catch(function (e) { console.warn('[site] Could not load data/site.json', e); });

  function render(d) {
    var c = d.contact || {};
    contact(c);
    levels(d.projects || []);
    clients((d.clients || []).filter(on));
    testimonials((d.testimonials || []).filter(on));
    outcomes(d.outcomes || {});
    form(c);
    if (c.goatcounter) {
      var s = document.createElement('script');
      s.async = true; s.src = 'https://gc.zgo.at/count.js';
      s.setAttribute('data-goatcounter', 'https://' + c.goatcounter + '.goatcounter.com/count');
      document.body.appendChild(s);
    }
    document.dispatchEvent(new CustomEvent('site:data', { detail: d }));
  }
  function on(x) { return x && x.on; }

  /* ---------- contact buttons + footer links ---------- */
  function contact(c) {
    var subject = encodeURIComponent('A training problem to make playable');
    var actions = $('[data-contact-actions]');
    if (actions) {
      var h = '';
      if (c.calendar) h += '<a class="btn" href="' + esc(c.calendar) + '" target="_blank" rel="noopener">Book a 20-minute call</a>';
      if (c.email) h += '<a class="btn btn--panel" href="mailto:' + esc(c.email) + '?subject=' + subject + '">' + esc(c.email) + '</a>';
      if (c.linkedin) h += '<a class="btn btn--panel" href="' + esc(c.linkedin) + '" target="_blank" rel="noopener">LinkedIn</a>';
      actions.innerHTML = h;
    }
    $$('[data-foot-contact]').forEach(function (el) {
      var h = '';
      if (c.email) h += '<a href="mailto:' + esc(c.email) + '">' + esc(c.email) + '</a>';
      if (c.linkedin) h += '<a href="' + esc(c.linkedin) + '" target="_blank" rel="noopener">LinkedIn</a>';
      if (c.calendar) h += '<a href="' + esc(c.calendar) + '" target="_blank" rel="noopener">Book a call</a>';
      el.innerHTML = h;
    });
  }

  /* ---------- project grid on the home page ---------- */
  var PROJECTS = [];
  function levels(list) {
    var box = $('[data-levels]');
    if (!box) return;
    var shown = list.filter(on);
    PROJECTS = shown;
    var lastSeries = '';
    box.innerHTML = shown.map(function (p) {
      var note = '';
      if (p.series && p.series !== lastSeries) note = '<p class="series-note" data-series>' + esc(p.series) + '</p>';
      lastSeries = p.series || '';
      var chips = (p.chips || []).map(function (ch) {
        return '<span class="chip' + (ch.tone ? ' chip--' + esc(ch.tone) : '') + '">' + esc(ch.label) + '</span>';
      }).join('');
      var href = p.page || ('work/project.html?p=' + encodeURIComponent(p.slug));
      return note +
        '<article class="level' + (p.feature ? ' level--feature' : '') + '" data-topic="' + esc(p.topic || '') + '">' +
          '<div class="level__img">' +
            '<img src="' + esc(url(p.thumbStart)) + '" alt="' + esc(p.thumbStartAlt || '') + '" loading="lazy" width="1280" height="720">' +
            (p.thumbMistake ? '<img class="level__alt" src="' + esc(url(p.thumbMistake)) + '" alt="" loading="lazy" width="1280" height="720">' : '') +
            (p.sticker ? '<span class="sticker"><b>Get it wrong</b> ' + esc(p.sticker) + '</span>' : '') +
            '<span class="level__glare" aria-hidden="true"></span>' +
            (p.simPath ? '<button class="qp" type="button" data-qp="' + esc(p.slug) + '"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6 3.5v13l11-6.5z" fill="currentColor"/></svg>Quick play</button>' : '') +
          '</div>' +
          '<div class="level__body">' +
            '<div class="chips">' + chips + '</div>' +
            '<h3><a class="level__link" href="' + esc(url(href)) + '">' + esc(p.title) + '</a></h3>' +
            '<p>' + esc(p.tagline) + '</p>' +
            '<span class="level__go" aria-hidden="true">See how it works</span>' +
          '</div>' +
        '</article>';
    }).join('');
    filters(shown, box);
  }

  /* Topic filters: cards pop out, the matching ones pop back in. */
  function filters(shown, box) {
    var bar = $('[data-filters]');
    if (!bar) return;
    var topics = [];
    shown.forEach(function (p) { if (p.topic && topics.indexOf(p.topic) < 0) topics.push(p.topic); });
    if (topics.length < 2) { bar.hidden = true; return; }
    bar.innerHTML = ['All'].concat(topics).map(function (t, i) {
      var n = t === 'All' ? shown.length : shown.filter(function (p) { return p.topic === t; }).length;
      return '<button type="button" class="filter' + (i ? '' : ' is-on') + '" data-filter="' + esc(t) + '" aria-pressed="' + (i ? 'false' : 'true') + '">' + esc(t) + '<span>' + n + '</span></button>';
    }).join('');
    var busy = false;
    bar.addEventListener('click', function (e) {
      var b = e.target.closest('[data-filter]');
      if (!b || busy || b.classList.contains('is-on')) return;
      $$('[data-filter]').forEach(function (x) { x.classList.toggle('is-on', x === b); x.setAttribute('aria-pressed', x === b); });
      var t = b.getAttribute('data-filter'), kids = Array.prototype.slice.call(box.children);
      var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
      busy = true;
      kids.forEach(function (el) { if (!el.hidden) el.classList.add('is-leaving'); });
      setTimeout(function () {
        var k = 0;
        kids.forEach(function (el) {
          var show = t === 'All' || el.getAttribute('data-topic') === t;
          if (el.hasAttribute('data-series')) show = t === 'All';
          el.classList.remove('is-leaving', 'is-entering');
          el.hidden = !show;
          if (show) { el.classList.add('is-popped'); el.style.setProperty('--d', (k++ * 70) + 'ms'); void el.offsetWidth; el.classList.add('is-entering'); }
        });
        busy = false;
      }, reduce ? 0 : 230);
    });
  }

  /* Quick play: open a simulation in a pop-up without leaving the page. */
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-qp]');
    if (!b) return;
    var p = PROJECTS.filter(function (x) { return x.slug === b.getAttribute('data-qp'); })[0];
    if (p) quickPlay(p, b);
  });
  /* The picture sits above the card's link layer (so Quick play is clickable);
     a click anywhere else on the picture still opens the case study. */
  document.addEventListener('click', function (e) {
    var img = e.target.closest('.level__img');
    if (!img || e.target.closest('[data-qp]')) return;
    var a = img.parentNode.querySelector('.level__link');
    if (a) a.click();
  });
  var QP;
  function quickPlay(p, trigger) {
    if (!QP) {
      QP = document.createElement('div');
      QP.className = 'qp-modal';
      QP.hidden = true;
      QP.setAttribute('role', 'dialog');
      QP.setAttribute('aria-modal', 'true');
      QP.setAttribute('aria-labelledby', 'qp-title');
      QP.innerHTML = '<div class="qp-backdrop" data-qp-close></div><div class="qp-panel">' +
        '<div class="qp-head"><h2 id="qp-title"></h2><a class="btn btn--sm btn--panel" data-qp-more href="#">How it was designed</a>' +
        '<button class="qp-close" type="button" data-qp-close aria-label="Close">×</button></div>' +
        '<div class="qp-stage"></div><p class="qp-note">Built for laptop screens. On a phone, turn it sideways.</p></div>';
      document.body.appendChild(QP);
      QP.addEventListener('click', function (e) { if (e.target.closest('[data-qp-close]')) closeQP(); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !QP.hidden) closeQP(); });
      if ('ResizeObserver' in window) new ResizeObserver(fitQP).observe(QP.querySelector('.qp-stage'));
      else window.addEventListener('resize', fitQP);
    }
    QP._trigger = trigger;
    QP.querySelector('#qp-title').textContent = p.title;
    QP.querySelector('[data-qp-more]').href = url(p.page || ('work/project.html?p=' + encodeURIComponent(p.slug)));
    var stage = QP.querySelector('.qp-stage');
    stage.classList.toggle('is-fixed', !!p.fixed);
    stage.innerHTML = '<iframe src="' + esc(url(p.simPath)) + '" title="' + esc(p.title) + ' simulation" allow="autoplay; fullscreen"></iframe>';
    QP.hidden = false;
    document.documentElement.classList.add('qp-lock');
    void QP.offsetWidth;
    QP.classList.add('is-open');
    fitQP();
    QP.querySelector('.qp-close').focus();
    document.dispatchEvent(new CustomEvent('achieve', { detail: 'quickplay' }));
  }
  function fitQP() {
    if (!QP || QP.hidden) return;
    var st = QP.querySelector('.qp-stage'), f = st.querySelector('iframe');
    if (f && st.classList.contains('is-fixed')) f.style.transform = 'scale(' + (st.clientWidth / 1280) + ')';
  }
  function closeQP() {
    QP.classList.remove('is-open');
    document.documentElement.classList.remove('qp-lock');
    setTimeout(function () { QP.hidden = true; QP.querySelector('.qp-stage').innerHTML = ''; }, 260);
    if (QP._trigger) QP._trigger.focus();
  }

  /* ---------- proof: client names, testimonials, outcomes ---------- */
  function clients(list) {
    var sec = $('[data-clients]');
    if (!sec || !list.length) return;
    sec.querySelector('ul').innerHTML = list.map(function (x) { return '<li>' + esc(x.name) + '</li>'; }).join('');
    sec.hidden = false;
  }
  function testimonials(list) {
    var sec = $('[data-testimonials]');
    if (!sec || !list.length) return;
    sec.querySelector('.quotes').innerHTML = list.map(function (t) {
      return '<figure class="quote"><blockquote>' + esc(t.quote) + '</blockquote>' +
        '<figcaption><b>' + esc(t.name) + '</b><span>' + esc([t.role, t.org].filter(Boolean).join(', ')) + '</span></figcaption></figure>';
    }).join('');
    sec.hidden = false;
  }
  function outcomes(map) {
    $$('[data-outcome]').forEach(function (el) {
      var o = map[el.getAttribute('data-outcome')];
      if (!o || !o.on) return;
      el.querySelector('.outcome').innerHTML =
        '<div class="stats">' + (o.stats || []).map(function (s) {
          return '<div class="stat"><b>' + esc(s.value) + '</b><span>' + esc(s.label) + '</span></div>';
        }).join('') + '</div>' +
        (o.text ? '<p class="outcome__text">' + esc(o.text) + '</p>' : '');
      el.hidden = false;
    });
  }

  /* ---------- contact form: emails you through Web3Forms ---------- */
  function form(c) {
    var f = $('[data-contact-form]');
    if (!f) return;
    var status = f.querySelector('.form__status');
    var btn = f.querySelector('button[type=submit]');
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!f.reportValidity()) return;
      var data = {};
      new FormData(f).forEach(function (v, k) { data[k] = v; });
      if (data.botcheck) return; // honeypot

      if (!c.web3formsKey) {
        // No form key yet: fall back to the visitor's own email app.
        var body = Object.keys(data).filter(function (k) { return k !== 'botcheck' && data[k]; })
          .map(function (k) { return k.charAt(0).toUpperCase() + k.slice(1) + ': ' + data[k]; }).join('\n\n');
        location.href = 'mailto:' + (c.email || '') + '?subject=' + encodeURIComponent('Project enquiry from ' + data.name) + '&body=' + encodeURIComponent(body);
        return;
      }

      data.access_key = c.web3formsKey;
      data.subject = 'New project enquiry: ' + (data.name || '') + (data.organisation ? ' (' + data.organisation + ')' : '');
      data.from_name = 'Portfolio contact form';
      btn.disabled = true; btn.textContent = 'Sending…';
      status.className = 'form__status';
      status.textContent = '';
      fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(data)
      }).then(function (r) { return r.json(); }).then(function (r) {
        if (!r.success) throw new Error(r.message || 'Failed');
        f.reset();
        status.className = 'form__status is-ok';
        status.textContent = 'Thanks! Your message is on its way. I reply within one working day.';
        document.dispatchEvent(new CustomEvent('form:sent'));
      }).catch(function () {
        status.className = 'form__status is-err';
        status.innerHTML = 'That didn\'t send. Please email me directly at <a href="mailto:' + esc(c.email) + '">' + esc(c.email) + '</a>.';
      }).then(function () { btn.disabled = false; btn.textContent = 'Send'; });
    });
  }
})();

/* Hero "Your move": one decision, one consequence. */
(function () {
  var box = document.querySelector('[data-yourmove]');
  if (!box) return;
  var result = box.querySelector('.yc__result');
  var choices = box.querySelectorAll('.yc__choice');
  var badge = box.querySelector('[data-badge]');
  var OUT = {
    jack: { ok: false, badge: 'Car rolled off', h: 'The car rolled off the jack.', p: 'The parking brake was off, so nothing held the car once it was lifted. On a slide that’s a bullet point. Here you saw it happen.' },
    swap: { ok: false, badge: 'Nuts too tight', h: 'The nuts won’t budge.', p: 'The car is still on the ground, the nuts are tight and the brake is off. There’s an order to this, and every step has a reason.' },
    brake: { ok: true, h: 'Right first move.', p: 'With the brake on, the car can’t roll. That’s how all my simulations work: you decide, the world reacts, and the reason sticks.' }
  };
  var brakeTxt = box.querySelector('.yc__brake-txt');
  function reset() {
    box.className = 'yc';
    brakeTxt.textContent = 'Brake off';
    result.innerHTML = '';
    Array.prototype.forEach.call(choices, function (c) { c.disabled = false; c.removeAttribute('aria-pressed'); });
  }
  Array.prototype.forEach.call(choices, function (btn) {
    btn.addEventListener('click', function () {
      var k = btn.getAttribute('data-move'), o = OUT[k];
      reset();
      void box.offsetWidth; // restart the animation
      box.className = 'yc is-' + k + (o.ok ? ' is-good' : ' is-bad');
      document.dispatchEvent(new CustomEvent('yc:result', { detail: { ok: o.ok, move: k } }));
      document.dispatchEvent(new CustomEvent('achieve', { detail: o.ok ? 'brake' : 'rolled' }));
      btn.setAttribute('aria-pressed', 'true');
      Array.prototype.forEach.call(choices, function (c) { if (c !== btn) c.disabled = true; });
      if (o.badge) badge.textContent = o.badge;
      if (k === 'brake') brakeTxt.textContent = 'Brake on';
      result.innerHTML = '<p class="yc__h">' + o.h + '</p><p>' + o.p + '</p><div class="yc__next">' +
        (o.ok ? '<a class="btn btn--sm" href="work/flat-tire.html">Play the full simulation</a>' : '') +
        '<button type="button" class="yc__again">' + (o.ok ? 'Start over' : 'Try again') + '</button></div>';
      result.querySelector('.yc__again').addEventListener('click', function () { reset(); choices[0].focus(); });
    });
  });
})();

/* Header gets a backing once the page scrolls. */
(function () {
  var h = document.querySelector('.site-head');
  if (!h) return;
  var f = function () { h.classList.toggle('is-stuck', window.scrollY > 8); };
  f(); window.addEventListener('scroll', f, { passive: true });
})();

/* Package buttons preselect the package in the contact form. */
document.addEventListener('click', function (e) {
  var a = e.target.closest && e.target.closest('[data-package]');
  var sel = document.querySelector('[data-contact-form] select[name=package]');
  if (!a || !sel) return;
  Array.prototype.forEach.call(sel.options, function (o) {
    if (o.text.indexOf(a.getAttribute('data-package')) === 0) sel.value = o.value;
  });
});

/* Respect reduced motion: freeze each animated illustration on its key frame. */
(function () {
  if (!window.matchMedia || !matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.querySelectorAll('svg.anim').forEach(function (s) {
    try { s.pauseAnimations(); s.setCurrentTime(parseFloat(s.dataset.still || '0')); } catch (e) {}
  });
})();
