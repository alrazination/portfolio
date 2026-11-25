/* Loads a simulation into its frame when the visitor presses start.
   Fixed-size sims (1280x720 stage) are scaled to fit the frame; the
   sim's own drag-and-drop works in its own coordinates, so scaling the
   iframe from outside doesn't affect it. */
(function () {
  document.querySelectorAll('.sim').forEach(function (box) {
    var btn = box.querySelector('.sim__start');
    if (!btn) return;

    function fit() {
      var f = box.querySelector('iframe');
      if (f && box.hasAttribute('data-fixed')) {
        f.style.transform = 'scale(' + (box.clientWidth / 1280) + ')';
      }
    }

    btn.addEventListener('click', function () {
      var f = document.createElement('iframe');
      f.src = box.dataset.src;
      f.title = box.dataset.title || 'Simulation';
      f.setAttribute('allow', 'autoplay; fullscreen');
      box.appendChild(f);
      btn.remove();
      fit();
      f.addEventListener('load', function () { try { f.focus(); } catch (e) {} });
    });

    if ('ResizeObserver' in window) new ResizeObserver(fit).observe(box);
    else window.addEventListener('resize', fit);
  });
})();

/* Respect reduced motion: freeze each animated illustration on its key frame. */
(function () {
  if (!window.matchMedia || !matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.querySelectorAll('svg.anim').forEach(function (s) {
    try { s.pauseAnimations(); s.setCurrentTime(parseFloat(s.dataset.still || '0')); } catch (e) {}
  });
})();

/* On phones, show the key "mistake" moment above the simulation, since
   the sims are built for laptop-sized screens. */
(function () {
  var sim = document.querySelector('.play .sim');
  var moment = document.querySelector('.moment svg');
  if (!sim || !moment) return;
  var fig = document.createElement('figure');
  fig.className = 'play__preview';
  fig.setAttribute('aria-hidden', 'true');
  var svg = moment.cloneNode(true);
  // Avoid duplicate ids from the clone.
  svg.querySelectorAll('[id]').forEach(function (el) { el.removeAttribute('id'); });
  fig.appendChild(svg);
  var cap = document.createElement('figcaption');
  cap.textContent = 'On a phone? This is the moment it\'s built around. For the full simulation, tap "Open full screen" and turn your phone sideways.';
  fig.appendChild(cap);
  sim.parentNode.insertBefore(fig, sim);
})();
