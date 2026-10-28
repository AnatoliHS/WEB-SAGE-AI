// Intro · Terminal (journey, concepts/journeys.njk). A quiet boot: in monospace, above where the
// hero rule will be, Sage starts up line by line and then asks for the hero's headline; a progress
// bar fills along the rule, lit violet, and becomes it, cooling to the ink as SAGE.IS rises.
(() => {
  const style = document.createElement('style');
  style.textContent = `
    .itm-scan { position: absolute; inset: 0; pointer-events: none; background: repeating-linear-gradient(to bottom, rgba(255, 255, 255, 0.025) 0 1px, transparent 1px 3px); }
    .itm-term { position: absolute; margin: 0; font: 400 clamp(0.75rem, 1.05vw, 1rem)/1.75 ui-monospace, SFMono-Regular, Menlo, monospace; color: rgba(241, 238, 250, 0.82); white-space: pre; transition: opacity 0.35s ease; }
    .itm-term .ok { color: #8f86ff; }
    .itm-term .ask { color: #fff; }
    .itm-term .ask b { font-weight: 400; background: linear-gradient(135deg, #302aff, #971aff); -webkit-background-clip: text; background-clip: text; color: transparent; }
    .itm-caret { display: inline-block; width: 0.6em; height: 1.1em; vertical-align: -0.2em; background: rgba(241, 238, 250, 0.85); animation: ui-blink 1s steps(1) infinite; }
    .itm-bar { position: absolute; width: 0; background: linear-gradient(90deg, #302aff, #971aff); box-shadow: 0 0 16px 2px rgba(151, 26, 255, 0.75); transition: background-color 0.5s ease, box-shadow 0.6s ease; }
    .itm-bar.is-cool { background: var(--ink); box-shadow: none; }
    .itm-term.is-out { opacity: 0; }
  `;
  document.head.append(style);
})();

SageIntro.run({
  background: 'rgb(var(--ground-3, 3, 3, 5))',
  canvas: false,
  brandAt: 2300,
  duration: 2950,

  setup(api) {
    const { rule, H } = api.g;
    const scan = document.createElement('div');
    scan.className = 'itm-scan';
    const term = document.createElement('pre');
    term.className = 'itm-term';
    Object.assign(term.style, { left: `${rule.x}px`, bottom: `${H - rule.y + 28}px` });
    const bar = document.createElement('div');
    bar.className = 'itm-bar';
    Object.assign(bar.style, { left: `${rule.x}px`, top: `${rule.y}px`, height: `${rule.h}px` });
    api.intro.append(scan, term, bar);
    // Each line as [html, plain length]
    const lines = [
      ['$ sage --init', 0],
      ['  open-source engine ........ <span class="ok">ready</span>', 0],
      ['  private workspace ......... <span class="ok">ready</span>', 0],
      ['  your team ................. <span class="ok">connected</span>', 0],
      ['<span class="ask">$ ask "Your next <b>AI breakthrough</b>"</span>', 0],
    ].map(([html]) => [html, html.replace(/<[^>]+>/g, '').length]);
    this.s = { term, bar, lines, total: lines.reduce((a, l) => a + l[1], 0), n: -1, phase: 0 };
  },

  frame(t, api) {
    const { span, ease, g } = api;
    const st = this.s;
    // Type it all out between 150 and 1350ms
    const n = Math.round(span(t, 150, 1350) * st.total);
    if (n !== st.n) {
      st.n = n;
      let left = n;
      const out = [];
      for (const [html, len] of st.lines) {
        if (left <= 0) break;
        if (left >= len) { out.push(html); left -= len; continue; }
        // Part of a line: cut the plain text, keeping its tags
        let shown = 0, cut = '';
        for (const part of html.split(/(<[^>]+>)/)) {
          if (part.startsWith('<')) { cut += part; continue; }
          const take = part.slice(0, Math.max(0, left - shown));
          cut += take;
          shown += take.length;
        }
        out.push(cut);
        left = 0;
      }
      st.term.innerHTML = out.join('\n') + '<i class="itm-caret"></i>';
    }
    // The bar fills along the rule, and becomes it
    st.bar.style.width = `${g.rule.w * ease.inOut(span(t, 1350, 2150))}px`;
    if (t > 2050 && st.phase === 0) { st.phase = 1; st.term.classList.add('is-out'); }
    if (t > 2200 && st.phase === 1) { st.phase = 2; st.bar.classList.add('is-cool'); }
  },
});
