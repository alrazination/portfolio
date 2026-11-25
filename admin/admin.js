/* Portfolio admin panel.
   Reads and writes data/site.json (and uploaded files) in the GitHub repo
   through the GitHub API. Every "Publish" is one commit; GitHub Pages
   puts it live about a minute later. */
(function () {
  'use strict';

  var DEFAULTS = { repo: 'alrazination/portfolio', branch: 'main' };
  var DATA_PATH = 'data/site.json';
  var SITE_URL = 'https://alrazination.github.io/portfolio/';
  var TONES = [['', 'Plain'], ['hot', 'Coral'], ['lime', 'Lime'], ['sky', 'Sky']];

  var app = document.getElementById('app');
  var S = {
    token: '', repo: DEFAULTS.repo, branch: DEFAULTS.branch,
    data: null, tab: 'projects', open: {},
    files: {},          // path -> base64 content to add/replace
    delPaths: [],       // exact paths to delete
    delPrefixes: [],    // folders to delete (e.g. sims/foo/)
    dirty: false, busy: false, msg: null
  };

  /* ---------------- utilities ---------------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function slugify(s) {
    return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/ß/g, 'ss').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
  }
  function getPath(obj, path) { return path.split('.').reduce(function (o, k) { return o == null ? o : o[k]; }, obj); }
  function setPath(obj, path, val) {
    var ks = path.split('.'), last = ks.pop();
    var o = ks.reduce(function (o, k) { return o[k]; }, obj);
    o[last] = val;
  }
  function b64FromBytes(bytes) {
    var bin = '', CH = 0x8000;
    for (var i = 0; i < bytes.length; i += CH) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
    return btoa(bin);
  }
  function b64FromText(t) { return b64FromBytes(new TextEncoder().encode(t)); }
  function textFromB64(b) {
    var bin = atob(b.replace(/\s/g, '')), bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }
  function fileToB64(file) {
    return file.arrayBuffer().then(function (buf) { return b64FromBytes(new Uint8Array(buf)); });
  }
  /* Resize any image to a 1280x720 cover crop, WebP if the browser can. */
  function imageTo1280(file) {
    return new Promise(function (res, rej) {
      var img = new Image();
      img.onload = function () {
        var W = 1280, H = 720, c = document.createElement('canvas');
        c.width = W; c.height = H;
        var r = Math.max(W / img.width, H / img.height), w = img.width * r, h = img.height * r;
        c.getContext('2d').drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
        c.toBlob(function (blob) {
          if (!blob) return rej(new Error('Could not process image'));
          var ext = blob.type === 'image/webp' ? 'webp' : 'jpg';
          blob.arrayBuffer().then(function (buf) { res({ ext: ext, b64: b64FromBytes(new Uint8Array(buf)) }); });
        }, 'image/webp', 0.85);
        URL.revokeObjectURL(img.src);
      };
      img.onerror = function () { rej(new Error('That file is not an image the browser can read')); };
      img.src = URL.createObjectURL(file);
    });
  }

  /* ---------------- GitHub API ---------------- */
  function gh(method, path, body) {
    return fetch('https://api.github.com/repos/' + S.repo + path, {
      method: method,
      headers: {
        Authorization: 'Bearer ' + S.token,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json'
      },
      body: body ? JSON.stringify(body) : undefined
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok) {
          var m = j.message || ('HTTP ' + r.status);
          if (r.status === 401) m = 'GitHub rejected the access key. It may be wrong or expired.';
          if (r.status === 403 || r.status === 404) m += '. Check that the key has "Contents: Read and write" access to ' + S.repo + '.';
          throw new Error(m);
        }
        return j;
      });
    });
  }
  function loadData() {
    return gh('GET', '/contents/' + DATA_PATH + '?ref=' + encodeURIComponent(S.branch) + '&t=' + Date.now())
      .then(function (j) { return JSON.parse(textFromB64(j.content)); });
  }
  function commit(message) {
    var head, baseTree;
    return gh('GET', '/git/ref/heads/' + S.branch).then(function (ref) {
      head = ref.object.sha;
      return gh('GET', '/git/commits/' + head);
    }).then(function (c) {
      baseTree = c.tree.sha;
      if (!S.delPrefixes.length) return [];
      return gh('GET', '/git/trees/' + baseTree + '?recursive=1').then(function (t) {
        return t.tree.filter(function (e) {
          return e.type === 'blob' && S.delPrefixes.some(function (p) { return e.path.indexOf(p) === 0; });
        }).map(function (e) { return e.path; });
      });
    }).then(function (prefixed) {
      var paths = Object.keys(S.files);
      return Promise.all(paths.map(function (p) {
        return gh('POST', '/git/blobs', { content: S.files[p], encoding: 'base64' }).then(function (b) {
          return { path: p, mode: '100644', type: 'blob', sha: b.sha };
        });
      })).then(function (entries) {
        var dels = S.delPaths.concat(prefixed).filter(function (p, i, a) { return a.indexOf(p) === i && !S.files[p]; });
        dels.forEach(function (p) { entries.push({ path: p, mode: '100644', type: 'blob', sha: null }); });
        return gh('POST', '/git/trees', { base_tree: baseTree, tree: entries });
      });
    }).then(function (tree) {
      return gh('POST', '/git/commits', { message: message, tree: tree.sha, parents: [head] });
    }).then(function (c) {
      return gh('PATCH', '/git/refs/heads/' + S.branch, { sha: c.sha });
    });
  }

  /* ---------------- data shape helpers ---------------- */
  function normalise(d) {
    d.contact = d.contact || {};
    d.projects = d.projects || [];
    d.clients = d.clients || [];
    d.testimonials = d.testimonials || [];
    d.outcomes = d.outcomes || {};
    d.projects.forEach(function (p) {
      p.chips = p.chips || [];
      while (p.chips.length < 2) p.chips.push({ label: '', tone: '' });
      if (!d.outcomes[p.slug]) d.outcomes[p.slug] = { on: false, sample: false, stats: [], text: '' };
    });
    Object.keys(d.outcomes).forEach(function (k) {
      var o = d.outcomes[k]; o.stats = o.stats || [];
      while (o.stats.length < 3) o.stats.push({ value: '', label: '' });
    });
    return d;
  }
  function cleaned() {
    var d = JSON.parse(JSON.stringify(S.data));
    d.projects.forEach(function (p) { p.chips = p.chips.filter(function (c) { return c.label.trim(); }); });
    Object.keys(d.outcomes).forEach(function (k) {
      d.outcomes[k].stats = d.outcomes[k].stats.filter(function (s) { return s.value.trim() || s.label.trim(); });
    });
    return d;
  }
  function markDirty() { S.dirty = true; S.msg = null; renderTop(); }

  /* ---------------- rendering ---------------- */
  function render() {
    if (!S.data) return renderLogin();
    app.innerHTML =
      '<header class="a-top"><div class="a-wrap" id="top"></div></header>' +
      '<main class="a-wrap">' +
        '<div class="a-tabs" role="tablist">' +
          tab('projects', 'Projects') + tab('proof', 'Testimonials & results') + tab('settings', 'Contact & settings') +
        '</div>' +
        (S.msg ? '<div class="msg msg--' + S.msg.kind + '">' + S.msg.html + '</div>' : '') +
        '<div id="panel">' + ({ projects: projectsPanel, proof: proofPanel, settings: settingsPanel }[S.tab])() + '</div>' +
      '</main>';
    renderTop();
  }
  function tab(id, label) {
    return '<button class="a-tab" role="tab" data-act="tab" data-id="' + id + '" aria-selected="' + (S.tab === id) + '">' + label + '</button>';
  }
  function renderTop() {
    var top = document.getElementById('top');
    if (!top) return;
    var st = S.busy ? '<span class="a-status">Publishing…</span>'
      : S.dirty ? '<span class="a-status is-dirty">Unpublished changes</span>'
      : '<span class="a-status">All changes published</span>';
    top.innerHTML = '<a class="brand" href="' + SITE_URL + '" target="_blank" rel="noopener">razin<span>.</span>admin</a>' + st +
      '<button class="btn btn--sm" data-act="publish"' + (S.dirty && !S.busy ? '' : ' disabled style="opacity:.45"') + '>Publish changes</button>' +
      '<button class="ib" data-act="logout">Sign out</button>';
  }

  function sw(bind, checked, label, extra) {
    return '<label class="sw"><input type="checkbox" data-bind="' + bind + '"' + (checked ? ' checked' : '') + (extra || '') + '>' + esc(label) + '</label>';
  }
  function inp(bind, label, val, opts) {
    opts = opts || {};
    var tag = opts.area
      ? '<textarea data-bind="' + bind + '" rows="' + (opts.rows || 3) + '"' + (opts.ph ? ' placeholder="' + esc(opts.ph) + '"' : '') + '>' + esc(val) + '</textarea>'
      : '<input type="' + (opts.type || 'text') + '" data-bind="' + bind + '" value="' + esc(val) + '"' + (opts.ph ? ' placeholder="' + esc(opts.ph) + '"' : '') + '>';
    return '<label class="field">' + label + (opts.hint ? ' <small>' + opts.hint + '</small>' : '') + tag + '</label>';
  }
  function toneSel(bind, val) {
    return '<label class="field">Colour<select data-bind="' + bind + '">' + TONES.map(function (t) {
      return '<option value="' + t[0] + '"' + (t[0] === val ? ' selected' : '') + '>' + t[1] + '</option>';
    }).join('') + '</select></label>';
  }
  function imgSrc(p) { return /^(https?:|data:)/.test(p) ? p : '../' + p; }

  /* ---- Projects ---- */
  function projectsPanel() {
    var ps = S.data.projects;
    return '<h1 class="a-h">Projects</h1><p class="a-help">Switch a project off to hide it from the site without deleting it. "Featured" makes the card full width. The order here is the order on the site.</p>' +
      ps.map(function (p, i) {
        var b = 'projects.' + i + '.';
        var pending = S.files[p.thumbStart] ? 'data:image/' + (/\.webp$/.test(p.thumbStart) ? 'webp' : 'jpeg') + ';base64,' + S.files[p.thumbStart] : imgSrc(p.thumbStart);
        return '<div class="card">' +
          '<div class="row">' +
            '<img class="thumb" src="' + esc(pending) + '" alt="">' +
            '<div class="grow"><h3>' + esc(p.title) + (p.uploaded ? ' <span class="badge badge--sky">Uploaded</span>' : '') + '</h3><small>' + esc(p.tagline) + '</small></div>' +
            sw(b + 'on', p.on, 'Show') + sw(b + 'feature', p.feature, 'Featured') +
          '</div>' +
          '<div class="row" style="margin-top:12px">' +
            '<button class="ib" data-act="move" data-i="' + i + '" data-d="-1"' + (i === 0 ? ' disabled' : '') + '>↑ Up</button>' +
            '<button class="ib" data-act="move" data-i="' + i + '" data-d="1"' + (i === ps.length - 1 ? ' disabled' : '') + '>↓ Down</button>' +
            '<button class="ib" data-act="toggle-edit" data-k="p' + i + '">' + (S.open['p' + i] ? 'Close' : 'Edit text') + '</button>' +
            '<a class="ib" style="text-decoration:none" target="_blank" rel="noopener" href="' + esc(SITE_URL + (p.page && !/^https?:/.test(p.page) ? p.page : 'work/project.html?p=' + p.slug)) + '">View live</a>' +
            '<span class="grow"></span>' +
            '<button class="ib ib--danger" data-act="del-project" data-i="' + i + '">Delete</button>' +
          '</div>' +
          (S.open['p' + i] ? '<div class="edit">' + projectFields(b, p) + '</div>' : '') +
        '</div>';
      }).join('') +
      '<h2 class="a-h" id="add">Add a project</h2>' + addProjectForm();
  }
  function projectFields(b, p) {
    var custom = !p.page || /^https?:/.test(p.page);
    return '<div class="grid2">' + inp(b + 'title', 'Title', p.title) + inp(b + 'tagline', 'One-line description', p.tagline) + '</div>' +
      inp(b + 'sticker', '"Get it wrong" sticker', p.sticker, { hint: 'What happens when you make the key mistake' }) +
      '<div class="grid3">' + inp(b + 'chips.0.label', 'Main tag', p.chips[0].label) + toneSel(b + 'chips.0.tone', p.chips[0].tone) + inp(b + 'chips.1.label', 'Second tag', p.chips[1].label) + '</div>' +
      '<div class="grid2">' + inp(b + 'series', 'Series heading', p.series, { hint: 'optional, groups cards under a heading' }) + inp(b + 'thumbStartAlt', 'Image description', p.thumbStartAlt, { hint: 'for screen readers' }) + '</div>' +
      (custom
        ? '<details class="more"><summary>Case study page text</summary>' +
            inp(b + 'lede', 'Intro paragraph', p.lede, { area: true }) +
            '<div class="grid2">' + inp(b + 'audience', 'Audience', p.audience) + inp(b + 'topic', 'Topic', p.topic) + inp(b + 'mechanic', 'Core mechanic', p.mechanic) + inp(b + 'builtWith', 'Built with', p.builtWith) + '</div>' +
            inp(b + 'howToPlay', 'How to play', p.howToPlay, { area: true, rows: 2 }) +
            inp(b + 'started', 'Where it started', p.started, { area: true, rows: 4, hint: 'Leave a blank line between paragraphs' }) +
            inp(b + 'how', 'How it works', p.how, { area: true, rows: 4 }) +
            (p.simPath ? sw(b + 'fixed', p.fixed, 'Fixed 1280×720 stage') : inp(b + 'page', 'Link', p.page, { type: 'url' })) +
          '</details>'
        : '<p class="a-help">The case study page for this project is hand-written (' + esc(p.page) + '). Edit the text there.</p>');
  }
  function addProjectForm() {
    return '<form class="card" id="add-form">' +
      '<div class="grid2">' +
        '<label class="field">Title *<input name="title" required></label>' +
        '<label class="field">One-line description *<input name="tagline" required placeholder="e.g. Pack a forklift safely before the shift starts."></label>' +
      '</div>' +
      '<label class="field">"Get it wrong" sticker <small>What happens when you make the key mistake</small><input name="sticker" placeholder="e.g. Skip the check and the load tips over"></label>' +
      '<div class="grid3">' +
        '<label class="field">Main tag<input name="chip0" placeholder="e.g. Procedure"></label>' +
        '<label class="field">Colour<select name="tone0">' + TONES.map(function (t) { return '<option value="' + t[0] + '">' + t[1] + '</option>'; }).join('') + '</select></label>' +
        '<label class="field">Second tag<input name="chip1" placeholder="e.g. Warehouse"></label>' +
      '</div>' +
      '<div class="grid2">' +
        '<label class="field">Start screen image * <small>any size, cropped to 16:9</small><input type="file" name="imgStart" accept="image/*" required></label>' +
        '<label class="field">"Mistake" image <small>shown on hover, optional</small><input type="file" name="imgMistake" accept="image/*"></label>' +
      '</div>' +
      '<label class="field">Image description <small>for screen readers</small><input name="alt"></label>' +
      '<div class="card" style="background:var(--deep)">' +
        '<p class="a-help" style="margin-bottom:10px"><b style="color:var(--cream)">The project itself.</b> Upload a playable HTML file, a whole folder (it must contain index.html), or give a link instead (a video, a SCORM Cloud preview, anything).</p>' +
        '<div class="grid3">' +
          '<label class="field">Single HTML file<input type="file" name="simFile" accept=".html,.htm,text/html"></label>' +
          '<label class="field">…or a folder<input type="file" name="simFolder" webkitdirectory multiple></label>' +
          '<label class="field">…or a link<input type="url" name="link" placeholder="https://"></label>' +
        '</div>' +
        '<label class="sw"><input type="checkbox" name="fixed">Fixed 1280×720 stage (scale it to fit)</label>' +
      '</div>' +
      '<details class="more"><summary>Case study page text (optional, you can add it later)</summary>' +
        '<label class="field">Intro paragraph<textarea name="lede" rows="3"></textarea></label>' +
        '<div class="grid2">' +
          '<label class="field">Audience<input name="audience"></label><label class="field">Topic<input name="topic"></label>' +
          '<label class="field">Core mechanic<input name="mechanic"></label><label class="field">Built with<input name="builtWith"></label>' +
        '</div>' +
        '<label class="field">How to play<textarea name="howToPlay" rows="2"></textarea></label>' +
        '<label class="field">Where it started<textarea name="started" rows="4"></textarea></label>' +
        '<label class="field">How it works<textarea name="how" rows="4"></textarea></label>' +
      '</details>' +
      '<button class="btn" type="submit">Add project</button> <small style="margin-left:10px">It goes live when you press Publish.</small>' +
    '</form>';
  }

  /* ---- Proof ---- */
  function sampleBadge(bind, x) {
    return x.sample ? ' <span class="badge">Sample text</span> <button class="ib" data-act="real" data-bind="' + bind + '">It\'s real now</button>' : '';
  }
  function proofPanel() {
    var d = S.data;
    return '<h1 class="a-h">Testimonials & results</h1>' +
      '<p class="a-help">Entries marked <span class="badge">Sample text</span> are placeholders, not real clients. Visitors will read anything you switch on as genuine, so replace the words with real ones first, then press "It\'s real now".</p>' +

      '<h2 class="a-h">Testimonials</h2>' +
      d.testimonials.map(function (t, i) {
        var b = 'testimonials.' + i + '.';
        return '<div class="card"><div class="row" style="margin-bottom:12px">' + sw(b + 'on', t.on, 'Show on site', ' data-sample="' + b + 'sample"') + sampleBadge(b + 'sample', t) +
          '<span class="grow"></span><button class="ib ib--danger" data-act="del" data-list="testimonials" data-i="' + i + '">Delete</button></div>' +
          inp(b + 'quote', 'Quote', t.quote, { area: true }) +
          '<div class="grid3">' + inp(b + 'name', 'Name', t.name) + inp(b + 'role', 'Role', t.role) + inp(b + 'org', 'Organisation', t.org) + '</div></div>';
      }).join('') +
      '<button class="ib" data-act="add-testimonial">+ Add testimonial</button>' +

      '<h2 class="a-h">"Trusted by" client names</h2><p class="a-help">Shown as a strip under the top section when at least one is on.</p>' +
      d.clients.map(function (c, i) {
        var b = 'clients.' + i + '.';
        return '<div class="card row">' + sw(b + 'on', c.on, 'Show', ' data-sample="' + b + 'sample"') +
          '<input class="grow" type="text" data-bind="' + b + 'name" value="' + esc(c.name) + '" style="width:auto">' + sampleBadge(b + 'sample', c) +
          '<button class="ib ib--danger" data-act="del" data-list="clients" data-i="' + i + '">Delete</button></div>';
      }).join('') +
      '<button class="ib" data-act="add-client">+ Add client</button>' +

      '<h2 class="a-h">Results per project</h2><p class="a-help">Shown as an "Outcome" section at the end of each case study.</p>' +
      d.projects.map(function (p) {
        var o = d.outcomes[p.slug], b = 'outcomes.' + p.slug + '.';
        return '<div class="card"><div class="row" style="margin-bottom:12px"><h3 class="grow">' + esc(p.title) + '</h3>' +
          sw(b + 'on', o.on, 'Show on site', ' data-sample="' + b + 'sample"') + sampleBadge(b + 'sample', o) + '</div>' +
          '<div class="grid3">' + o.stats.map(function (s, j) {
            return '<div>' + inp(b + 'stats.' + j + '.value', 'Number ' + (j + 1), s.value, { ph: 'e.g. 92%' }) + inp(b + 'stats.' + j + '.label', 'Means', s.label, { ph: 'e.g. passed first time' }) + '</div>';
          }).join('') + '</div>' +
          inp(b + 'text', 'Short story', o.text, { area: true, rows: 2, ph: 'Who used it, and what changed?' }) + '</div>';
      }).join('');
  }

  /* ---- Settings ---- */
  function settingsPanel() {
    var c = S.data.contact, b = 'contact.';
    return '<h1 class="a-h">Contact & settings</h1>' +
      '<div class="card">' +
        inp(b + 'email', 'Email', c.email, { type: 'email' }) +
        inp(b + 'linkedin', 'LinkedIn', c.linkedin, { type: 'url' }) +
        inp(b + 'calendar', 'Booking link', c.calendar, { type: 'url', hint: 'Cal.com, Calendly or Google booking page. Adds a "Book a 20-minute call" button. Leave empty to hide it.' }) +
      '</div>' +
      '<div class="card">' +
        inp(b + 'web3formsKey', 'Web3Forms access key', c.web3formsKey, { hint: 'Makes the contact form email you. Get a free key at web3forms.com: enter your email and the key arrives by email. Until it\'s set, the form opens the visitor\'s email app instead.' }) +
        inp(b + 'goatcounter', 'GoatCounter code', c.goatcounter, { hint: 'Free, privacy-friendly visitor stats. Sign up at goatcounter.com, then enter just the code (the "xyz" in xyz.goatcounter.com). Leave empty for no stats.' }) +
      '</div>' +
      '<p class="a-help">Connected to <b>' + esc(S.repo) + '</b>, branch <b>' + esc(S.branch) + '</b>.</p>';
  }

  /* ---- Login ---- */
  function renderLogin(err) {
    app.innerHTML = '<form class="login" id="login">' +
      '<h1>Portfolio admin</h1>' +
      '<p class="a-help">Sign in with a GitHub access key that can edit only this site.</p>' +
      (err ? '<div class="msg msg--err">' + esc(err) + '</div>' : '') +
      '<label class="field">GitHub access key<input type="password" name="token" required autocomplete="off" placeholder="github_pat_…"></label>' +
      '<label class="sw" style="margin-bottom:16px"><input type="checkbox" name="remember" checked>Remember on this device</label>' +
      '<details class="more"><summary>How to get a key (2 minutes, once)</summary><ol>' +
        '<li>Open <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">github.com → Settings → Fine-grained tokens → Generate new token</a>.</li>' +
        '<li>Name it "Portfolio admin" and pick an expiry (e.g. 1 year).</li>' +
        '<li>Repository access: <b>Only select repositories</b> → <b>' + esc(DEFAULTS.repo) + '</b>.</li>' +
        '<li>Permissions → Repository permissions → <b>Contents: Read and write</b>.</li>' +
        '<li>Generate, copy the key and paste it here. Don\'t share it with anyone.</li>' +
      '</ol>' +
      '<div class="grid2"><label class="field">Repository<input name="repo" value="' + esc(S.repo) + '"></label><label class="field">Branch<input name="branch" value="' + esc(S.branch) + '"></label></div>' +
      '</details>' +
      '<button class="btn" type="submit">Sign in</button></form>';
  }

  /* ---------------- events ---------------- */
  app.addEventListener('input', function (e) {
    var el = e.target, bind = el.getAttribute('data-bind');
    if (!bind || el.type === 'checkbox') return;
    setPath(S.data, bind, el.value);
    markDirty();
  });
  app.addEventListener('change', function (e) {
    var el = e.target, bind = el.getAttribute('data-bind');
    if (!bind || el.type !== 'checkbox') return;
    var sample = el.getAttribute('data-sample');
    if (el.checked && sample && getPath(S.data, sample)) {
      if (!confirm('This is still sample text, not a real client.\n\nVisitors will read it as genuine. Show it anyway?')) { el.checked = false; return; }
    }
    setPath(S.data, bind, el.checked);
    markDirty();
  });

  app.addEventListener('click', function (e) {
    var el = e.target.closest('[data-act]');
    if (!el) return;
    var act = el.getAttribute('data-act'), d = S.data;
    if (act === 'tab') { S.tab = el.getAttribute('data-id'); S.msg = null; render(); }
    else if (act === 'toggle-edit') { var k = el.getAttribute('data-k'); S.open[k] = !S.open[k]; render(); }
    else if (act === 'move') {
      var i = +el.getAttribute('data-i'), j = i + +el.getAttribute('data-d');
      var t = d.projects[i]; d.projects[i] = d.projects[j]; d.projects[j] = t;
      S.open = {}; markDirty(); render();
    }
    else if (act === 'del-project') {
      var p = d.projects[+el.getAttribute('data-i')];
      if (!confirm('Delete "' + p.title + '"?' + (p.uploaded ? '\n\nIts uploaded files are deleted too.' : '\n\nIts files stay in the repo; only the card is removed. To just hide it, use the Show switch instead.'))) return;
      d.projects.splice(+el.getAttribute('data-i'), 1);
      delete d.outcomes[p.slug];
      if (p.uploaded) {
        [p.thumbStart, p.thumbMistake].filter(Boolean).forEach(function (f) { delete S.files[f]; S.delPaths.push(f); });
        if (p.simPath) {
          Object.keys(S.files).forEach(function (f) { if (f.indexOf('sims/' + p.slug + '/') === 0) delete S.files[f]; });
          S.delPrefixes.push('sims/' + p.slug + '/');
        }
      }
      S.open = {}; markDirty(); render();
    }
    else if (act === 'del') {
      var list = el.getAttribute('data-list');
      if (!confirm('Delete this entry?')) return;
      d[list].splice(+el.getAttribute('data-i'), 1); markDirty(); render();
    }
    else if (act === 'real') { setPath(d, el.getAttribute('data-bind'), false); markDirty(); render(); }
    else if (act === 'add-testimonial') {
      d.testimonials.push({ id: 't' + Date.now(), on: false, sample: false, quote: '', name: '', role: '', org: '' }); markDirty(); render();
    }
    else if (act === 'add-client') { d.clients.push({ name: '', on: false, sample: false }); markDirty(); render(); }
    else if (act === 'publish') publish();
    else if (act === 'logout') {
      if (S.dirty && !confirm('You have unpublished changes. Sign out anyway?')) return;
      localStorage.removeItem('pa_token'); sessionStorage.removeItem('pa_token');
      S.data = null; S.token = ''; S.dirty = false; renderLogin();
    }
  });

  app.addEventListener('submit', function (e) {
    e.preventDefault();
    if (e.target.id === 'login') return login(new FormData(e.target));
    if (e.target.id === 'add-form') return addProject(e.target);
  });

  function login(fd) {
    S.token = String(fd.get('token')).trim();
    S.repo = String(fd.get('repo') || DEFAULTS.repo).trim();
    S.branch = String(fd.get('branch') || DEFAULTS.branch).trim();
    var store = fd.get('remember') ? localStorage : sessionStorage;
    connect().then(function () {
      store.setItem('pa_token', JSON.stringify({ token: S.token, repo: S.repo, branch: S.branch }));
    }).catch(function () {});
  }
  function connect() {
    app.innerHTML = '<div class="login"><p>Connecting to GitHub…</p></div>';
    return loadData().then(function (d) {
      S.data = normalise(d); S.dirty = false; render();
    }).catch(function (err) {
      S.data = null; renderLogin(err.message); throw err;
    });
  }

  function addProject(form) {
    var fd = new FormData(form), d = S.data;
    var title = String(fd.get('title')).trim();
    var slug = slugify(title) || 'project';
    var base = slug, n = 2;
    while (d.projects.some(function (p) { return p.slug === slug; })) slug = base + '-' + n++;

    var simFile = form.simFile.files[0];
    var folder = Array.prototype.slice.call(form.simFolder.files || []);
    var link = String(fd.get('link') || '').trim();
    if (!simFile && !folder.length && !link) { alert('Add the project itself: an HTML file, a folder, or a link.'); return; }
    if (folder.length && !folder.some(function (f) { return /^[^/]+\/index\.html?$/i.test(f.webkitRelativePath); })) {
      alert('That folder has no index.html at its top level.'); return;
    }

    var btn = form.querySelector('button[type=submit]');
    btn.disabled = true; btn.textContent = 'Preparing files…';

    var p = {
      slug: slug, on: true, feature: false, series: '', uploaded: true,
      title: title, tagline: String(fd.get('tagline')).trim(),
      chips: [{ label: String(fd.get('chip0') || '').trim(), tone: String(fd.get('tone0') || '') }, { label: String(fd.get('chip1') || '').trim(), tone: '' }],
      sticker: String(fd.get('sticker') || '').trim(),
      thumbStartAlt: String(fd.get('alt') || '').trim(),
      lede: String(fd.get('lede') || '').trim(), audience: String(fd.get('audience') || '').trim(),
      topic: String(fd.get('topic') || '').trim(), mechanic: String(fd.get('mechanic') || '').trim(),
      builtWith: String(fd.get('builtWith') || '').trim(), howToPlay: String(fd.get('howToPlay') || '').trim(),
      started: String(fd.get('started') || '').trim(), how: String(fd.get('how') || '').trim(),
      fixed: !!fd.get('fixed')
    };

    var jobs = [];
    jobs.push(imageTo1280(form.imgStart.files[0]).then(function (r) {
      p.thumbStart = 'img/thumbs/' + slug + '-start.' + r.ext; S.files[p.thumbStart] = r.b64;
    }));
    if (form.imgMistake.files[0]) jobs.push(imageTo1280(form.imgMistake.files[0]).then(function (r) {
      p.thumbMistake = 'img/thumbs/' + slug + '.' + r.ext; S.files[p.thumbMistake] = r.b64;
    }));
    if (simFile) {
      p.simPath = 'sims/' + slug + '/index.html';
      jobs.push(fileToB64(simFile).then(function (b) { S.files[p.simPath] = b; }));
    } else if (folder.length) {
      p.simPath = 'sims/' + slug + '/index.html';
      folder.forEach(function (f) {
        var rel = f.webkitRelativePath.split('/').slice(1).join('/');
        if (/(^|\/)\./.test(rel)) return; // skip hidden files like .DS_Store
        if (/^index\.htm$/i.test(rel)) rel = 'index.html';
        jobs.push(fileToB64(f).then(function (b) { S.files['sims/' + slug + '/' + rel] = b; }));
      });
    } else {
      p.page = link;
    }

    Promise.all(jobs).then(function () {
      p.thumbMistake = p.thumbMistake || '';
      d.projects.push(p);
      normalise(d);
      markDirty();
      S.msg = { kind: 'ok', html: '"' + esc(title) + '" added at the bottom of the list. Press <b>Publish changes</b> to put it live.' };
      render();
      window.scrollTo(0, 0);
    }).catch(function (err) {
      alert(err.message);
      btn.disabled = false; btn.textContent = 'Add project';
    });
  }

  function publish() {
    if (S.busy) return;
    var d = cleaned();
    var bad = d.projects.filter(function (p) { return !p.title || !p.slug; });
    if (bad.length) { alert('Every project needs a title.'); return; }
    S.busy = true; renderTop();
    S.files[DATA_PATH] = b64FromText(JSON.stringify(d, null, 2) + '\n');
    var nUp = Object.keys(S.files).length - 1;
    commit('Update site from admin panel' + (nUp ? ' (' + nUp + ' file' + (nUp > 1 ? 's' : '') + ' uploaded)' : '')).then(function () {
      S.files = {}; S.delPaths = []; S.delPrefixes = [];
      S.dirty = false; S.busy = false;
      S.msg = { kind: 'ok', html: 'Published. Your site updates in about a minute: <a href="' + SITE_URL + '" target="_blank" rel="noopener">open it</a>.' };
      render();
    }).catch(function (err) {
      delete S.files[DATA_PATH];
      S.busy = false;
      S.msg = { kind: 'err', html: 'Publishing failed: ' + esc(err.message) + ' Your changes are still here; try again.' };
      render();
    });
  }

  window.addEventListener('beforeunload', function (e) { if (S.dirty) { e.preventDefault(); e.returnValue = ''; } });

  /* ---------------- start ---------------- */
  var saved = localStorage.getItem('pa_token') || sessionStorage.getItem('pa_token');
  if (saved) {
    try {
      var o = JSON.parse(saved); S.token = o.token; S.repo = o.repo || S.repo; S.branch = o.branch || S.branch;
      connect().catch(function () {});
    } catch (e) { renderLogin(); }
  } else renderLogin();
})();
