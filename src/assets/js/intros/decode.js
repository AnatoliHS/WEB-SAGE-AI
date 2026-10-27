// Intro 4 · Decode. SAGE.IS appears in its place in the hero as scrambling glyphs over a faint
// field of characters, with a scan line running down to the rule. The letters lock one by one,
// each flashing as it resolves, while the rule fills; the real wordmark then takes over.
(() => {
  const style = document.createElement('style');
  style.textContent = `
    .id-mark { position: absolute; margin: 0; }
    .id-mark .ltr { text-align: center; }
    .id-mark .ltr > span { transition: color 0.5s ease, text-shadow 0.6s ease; }
    .id-mark .ltr.is-scrambling > span { background: none; -webkit-text-fill-color: currentColor; color: var(--accent-soft); }
    .id-mark .ltr.is-hidden > span { opacity: 0; }
    .id-mark .ltr.is-flash > span { color: #fff; text-shadow: 0 0 40px rgba(143, 134, 255, 0.9); }
    .id-bar { position: absolute; background: var(--ink); transform-origin: left; transform: scaleX(0); transition: transform 0.35s var(--ease); }
  `;
  document.head.append(style);
})();

SageIntro.run({
  brandAt: 2150,
  instantBrand: true,
  duration: 2650,

  setup(api) {
    const { mark, rule, W, H } = api.g;
    const GLYPHS = 'ABCDEFGHKNPRSTUVXYZ0123456789#%&?';
    const pick = () => GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
    const letters = api.letters();

    // A copy of the hero wordmark, in the same place; each letter held to its final width
    const wm = document.createElement('div');
    wm.className = 'wordmark id-mark';
    Object.assign(wm.style, { left: `${mark.x}px`, top: `${mark.y}px` });
    wm.innerHTML = `<span class="tinker-word"></span><span class="click-word"></span>`;
    const cells = letters.map((l, i) => {
      const ltr = document.createElement('span');
      ltr.className = 'ltr is-scrambling is-hidden';
      ltr.style.width = `${l.w}px`;
      const inner = document.createElement('span');
      inner.textContent = pick();
      ltr.append(inner);
      wm.children[l.accent ? 1 : 0].append(ltr);
      // Each letter appears, scrambles, then locks, left to right
      return { ltr, inner, ch: l.ch, showAt: 120 + i * 60, lockAt: 750 + i * 170 };
    });

    const bar = document.createElement('div');
    bar.className = 'id-bar';
    Object.assign(bar.style, { left: `${rule.x}px`, top: `${rule.y}px`, width: `${rule.w}px`, height: `${rule.h}px` });
    api.intro.append(wm, bar);

    // The character field behind: one small glyph per cell
    const cell = 22;
    const field = [];
    for (let y = cell; y < H; y += cell) {
      for (let x = cell / 2; x < W; x += cell * 0.8) field.push({ x, y, c: pick(), r: Math.random() });
    }
    this.s = { cells, bar, field, pick, last: 0, done: 0 };
  },

  frame(t, api) {
    const { ctx, g, span } = api;
    const { W, H, rule } = g;
    const st = this.s;
    const tickGlyphs = t - st.last > 55;
    if (tickGlyphs) st.last = t;

    // Field: faint, flickering, brighter at the scan line, gone once the name is in
    ctx.clearRect(0, 0, W, H);
    const fieldA = span(t, 0, 400) * (1 - span(t, 1700, 2250));
    if (fieldA > 0) {
      const scan = span(t, 100, 1700) * rule.y;
      ctx.font = '12px ui-monospace, "SF Mono", Menlo, monospace';
      ctx.textAlign = 'center';
      for (const f of st.field) {
        if (tickGlyphs && Math.random() < 0.06) f.c = st.pick();
        const near = Math.max(0, 1 - Math.abs(f.y - scan) / 70);
        const a = (0.07 + f.r * 0.06 + near * 0.6) * fieldA;
        ctx.fillStyle = near > 0.2 ? `rgba(143, 134, 255, ${a})` : `rgba(238, 233, 226, ${a})`;
        ctx.fillText(f.c, f.x, f.y);
      }
      // The scan line itself
      if (scan < rule.y - 2) {
        const grad = ctx.createLinearGradient(0, scan - 40, 0, scan);
        grad.addColorStop(0, 'rgba(143, 134, 255, 0)');
        grad.addColorStop(1, `rgba(143, 134, 255, ${0.18 * fieldA})`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, scan - 40, W, 40);
      }
    }

    // Letters: appear, scramble, lock with a flash
    let locked = 0;
    for (const c of st.cells) {
      if (t >= c.showAt) c.ltr.classList.remove('is-hidden');
      if (t < c.lockAt) {
        if (tickGlyphs) c.inner.textContent = st.pick();
        continue;
      }
      locked++;
      if (c.ltr.classList.contains('is-scrambling')) {
        c.inner.textContent = c.ch;
        c.ltr.classList.remove('is-scrambling');
        c.ltr.classList.add('is-flash');
        setTimeout(() => c.ltr.classList.remove('is-flash'), 160);
      }
    }
    st.bar.style.transform = `scaleX(${locked / st.cells.length})`;
  },
});
