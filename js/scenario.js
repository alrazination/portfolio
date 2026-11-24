/* Tiny branching-scenario engine. No dependencies.
   Used by the homepage hero and the leadership simulation case study.

   data = {
     title: "…",
     steps: 3,                       // number of decisions on the longest path
     meters: { trust: {label, start}, … }   // optional
     start: "nodeId",
     nodes: {
       nodeId: {
         q: "Question", ctx: "Optional context",
         choices: [{ t: "Choice text", verdict: "good|mid|bad", label: "Verdict line",
                     fb: "Feedback", next: "nodeId" | null, fx: { trust: 10 } }]
       }
     },
     end: function (state) { return "<html for debrief>"; }
   }
*/
(function () {
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function Scenario(root, data) {
    let state;

    function reset() {
      state = { node: data.start, step: 0, path: [], meters: {} };
      for (const k in (data.meters || {})) state.meters[k] = data.meters[k].start;
      render();
    }

    function stepsHtml() {
      let h = '<span class="scn__steps" aria-hidden="true">';
      for (let i = 0; i < data.steps; i++) h += `<i class="${i < state.step ? 'is-done' : ''}"></i>`;
      return h + '</span>';
    }

    function metersHtml() {
      if (!data.meters) return '';
      let h = '<div class="meters">';
      for (const k in data.meters) {
        const v = Math.max(0, Math.min(100, state.meters[k]));
        h += `<div class="meter">${esc(data.meters[k].label)}
          <div class="meter__bar" role="meter" aria-label="${esc(data.meters[k].label)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${v}">
          <div class="meter__fill" style="width:${v}%"></div></div></div>`;
      }
      return h + '</div>';
    }

    function render() {
      const n = data.nodes[state.node];
      root.innerHTML = `
        <div class="scn__top"><span>${esc(data.title)}</span>${stepsHtml()}</div>
        ${metersHtml()}
        <p class="scn__q">${n.q}</p>
        ${n.ctx ? `<p class="scn__ctx">${n.ctx}</p>` : ''}
        <ul class="scn__choices">
          ${n.choices.map((c, i) => `<li><button class="choice" type="button" data-i="${i}">
            <span class="choice__key" aria-hidden="true">${'ABCD'[i]}</span><span>${c.t}</span></button></li>`).join('')}
        </ul>
        <div class="scn__out" aria-live="polite"></div>`;
      root.querySelectorAll('.choice').forEach(b => b.addEventListener('click', () => pick(+b.dataset.i)));
    }

    function pick(i) {
      const n = data.nodes[state.node];
      const c = n.choices[i];
      state.step++;
      state.path.push({ q: n.q, choice: c });
      for (const k in (c.fx || {})) state.meters[k] += c.fx[k];

      root.querySelectorAll('.choice').forEach((b, j) => {
        b.disabled = true;
        if (j === i) b.classList.add('is-picked');
      });
      // refresh progress + meters in place
      const top = root.querySelector('.scn__steps');
      if (top) top.outerHTML = stepsHtml();
      const m = root.querySelector('.meters');
      if (m) {
        const tmp = document.createElement('div'); tmp.innerHTML = metersHtml();
        // animate: set widths after insert
        m.querySelectorAll('.meter__fill').forEach((f, j) => {
          const nf = tmp.querySelectorAll('.meter__fill')[j];
          f.style.width = nf.style.width;
          f.parentNode.setAttribute('aria-valuenow', parseInt(nf.style.width, 10));
        });
      }

      const out = root.querySelector('.scn__out');
      const last = !c.next;
      out.innerHTML = `
        <div class="fb fb--${c.verdict}" tabindex="-1">
          <p class="fb__verdict">${esc(c.label)}</p>
          <p>${c.fb}</p>
        </div>
        <div class="scn__next">
          <button class="btn" type="button" data-act="${last ? 'end' : 'next'}">${last ? 'See your debrief' : 'Continue'}</button>
        </div>`;
      out.querySelector('.fb').focus({ preventScroll: true });
      out.querySelector('[data-act]').addEventListener('click', () => {
        if (last) end(); else { state.node = c.next; render(); focusTop(); }
      });
    }

    function focusTop() {
      const q = root.querySelector('.scn__q');
      if (q) { q.setAttribute('tabindex', '-1'); q.focus({ preventScroll: true }); }
      const r = root.getBoundingClientRect();
      if (r.top < 0) root.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    }

    function end() {
      root.innerHTML = `
        <div class="scn__top"><span>${esc(data.title)}</span>${stepsHtml()}</div>
        ${metersHtml()}
        <div class="scn__end" tabindex="-1">${data.end(state)}</div>
        <div class="scn__next"><button class="btn btn--quiet" type="button" data-act="again">Play again</button>${data.endActions || ''}</div>`;
      root.querySelector('[data-act="again"]').addEventListener('click', () => { reset(); focusTop(); });
      root.querySelector('.scn__end').focus({ preventScroll: true });
    }

    reset();
  }

  window.Scenario = Scenario;
})();
