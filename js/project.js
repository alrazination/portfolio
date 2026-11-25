/* Fills work/project.html for projects added through the admin panel. */
(function () {
  var slug = new URLSearchParams(location.search).get('p');
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  var paras = function (t) { return String(t || '').split(/\n\s*\n/).filter(Boolean).map(function (p) { return '<p>' + esc(p) + '</p>'; }).join(''); };
  var f = function (k) { return document.querySelector('[data-f="' + k + '"]'); };

  document.addEventListener('site:data', function (e) {
    var p = (e.detail.projects || []).filter(function (x) { return x.slug === slug && x.on; })[0];
    if (!p) { f('title').textContent = 'Project not found'; f('lede').innerHTML = '<a href="../#levels">See all projects</a>'; return; }

    document.title = p.title + ' · Razin Abdullah';
    var md = document.querySelector('meta[name=description]');
    if (md) md.setAttribute('content', p.lede || p.tagline || '');
    f('title').textContent = p.title;
    f('lede').textContent = p.lede || p.tagline || '';
    f('chips').innerHTML = (p.chips || []).map(function (c) {
      return '<span class="chip' + (c.tone ? ' chip--' + esc(c.tone) : '') + '">' + esc(c.label) + '</span>';
    }).join('');
    var meta = [['Audience', p.audience], ['Topic', p.topic], ['Core mechanic', p.mechanic], ['Built with', p.builtWith]].filter(function (m) { return m[1]; });
    f('meta').innerHTML = meta.map(function (m) { return '<div><dt>' + m[0] + '</dt><dd>' + esc(m[1]) + '</dd></div>'; }).join('');
    if (!meta.length) f('meta').hidden = true;

    if (p.simPath) {
      var src = '../' + p.simPath;
      f('full').href = src;
      f('howToPlay').textContent = p.howToPlay || '';
      var sim = f('sim');
      sim.setAttribute('data-src', src);
      sim.setAttribute('data-title', p.title + ' simulation');
      if (p.fixed) sim.setAttribute('data-fixed', '');
      sim.innerHTML = '<button class="sim__start" type="button">' +
        (p.thumbStart ? '<img src="../' + esc(p.thumbStart) + '" alt="" width="1280" height="720">' : '') +
        '<span class="btn">Press start</span></button>';
      f('play').hidden = false;
      var s = document.createElement('script'); s.src = '../js/play.js'; document.body.appendChild(s);
    }

    var secs = [['Where it started', p.started], ['How it works', p.how]].filter(function (x) { return x[1]; });
    f('body').innerHTML = secs.map(function (x) {
      return '<div class="cs-sec"><h2>' + x[0] + '</h2><div class="prose">' + paras(x[1]) + '</div></div>';
    }).join('') + '<div class="cs-sec" data-outcome-dyn hidden><h2>Outcome</h2><div class="outcome"></div></div>';

    var o = (e.detail.outcomes || {})[slug];
    if (o && o.on) {
      var box = document.querySelector('[data-outcome-dyn]');
      box.querySelector('.outcome').innerHTML = '<div class="stats">' + (o.stats || []).map(function (s) {
        return '<div class="stat"><b>' + esc(s.value) + '</b><span>' + esc(s.label) + '</span></div>';
      }).join('') + '</div>' + (o.text ? '<p class="outcome__text">' + esc(o.text) + '</p>' : '');
      box.hidden = false;
    }
  });
})();
