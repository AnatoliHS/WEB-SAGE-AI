// Intro · Aurora (journey, concepts/journeys.njk). A night sky with curtains of light in the Sage
// purples rippling across it, and the hero's headline surfacing in the middle; then the curtains
// gather down into one band and the band draws tight into the hero rule, cooling to the ink as
// SAGE.IS rises out of it.
(() => {
  const style = document.createElement('style');
  style.textContent = `
    .iau-line { position: absolute; left: 50%; top: 42%; translate: -50% -50%; margin: 0; font-size: clamp(1.6rem, 3.4vw, 3.4rem); font-weight: 500; letter-spacing: -0.04em; white-space: nowrap; color: var(--ink); }
    .iau-line span { display: inline-block; opacity: 0; filter: blur(8px); translate: 0 0.25em; transition: opacity 0.6s ease, filter 0.6s ease, translate 0.6s var(--ease); }
    .iau-line span.is-in { opacity: 1; filter: none; translate: 0 0; }
    .iau-line .acc { background: linear-gradient(135deg, #302aff, #971aff); -webkit-background-clip: text; background-clip: text; color: transparent; }
    .iau-line.is-out { opacity: 0; transition: opacity 0.4s ease; }
  `;
  document.head.append(style);
})();

SageIntro.run({
  background: 'rgb(var(--ground-3, 2, 3, 8))',
  brandAt: 2400,
  duration: 3050,

  setup(api) {
    const css = getComputedStyle(api.intro);
    const trip = (n, fb) => (css.getPropertyValue(n).trim() || fb).split(',').map(Number);
    this.c = { g1: trip('--ground-1', '10, 12, 30'), g3: trip('--ground-3', '2, 3, 8') };
    // Curtains: colour, height (share of the screen), how far down, waves
    this.ribbons = [
      { c: [48, 42, 255], y: 0.36, h: 0.3, f1: 0.0032, f2: 0.0081, s1: 0.9, s2: 1.3, a: 0.07 },
      { c: [151, 26, 255], y: 0.44, h: 0.26, f1: 0.0027, f2: 0.0066, s1: -0.7, s2: 1.1, a: 0.06 },
      { c: [90, 160, 255], y: 0.3, h: 0.22, f1: 0.0041, f2: 0.0094, s1: 1.2, s2: -0.8, a: 0.05 },
      { c: [210, 110, 255], y: 0.5, h: 0.2, f1: 0.0036, f2: 0.0072, s1: -1.0, s2: 0.9, a: 0.05 },
    ];
    // Drawn small and stretched up, for the soft glow of it
    this.small = document.createElement('canvas');
    this.small.width = Math.ceil(api.g.W / 4);
    this.small.height = Math.ceil(api.g.H / 4);
    // The headline, word by word
    const line = document.createElement('p');
    line.className = 'iau-line';
    line.innerHTML = '<span>Your</span> <span>next</span> <span class="acc">AI</span> <span class="acc">breakthrough</span>';
    api.intro.append(line);
    this.line = line;
    this.words = Array.from(line.children);
    this.phase = 0;
  },

  frame(t, api) {
    const { ctx, span, lerp, ease, g } = api;
    const { W, H, rule } = g;
    const rgba = (v, a) => `rgba(${v[0]}, ${v[1]}, ${v[2]}, ${a})`;
    const s = t / 1000;

    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, rgba(this.c.g3, 1));
    sky.addColorStop(0.55, rgba(this.c.g1, 1));
    sky.addColorStop(1, rgba(this.c.g3, 1));
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    // The curtains gather into one band on the rule, and fade as the line takes over
    const m = ease.inOut(span(t, 1500, 2250));
    const cool = span(t, 2250, 2850);
    const sm = this.small.getContext('2d');
    const k = this.small.width / W;
    sm.setTransform(k, 0, 0, k, 0, 0);
    sm.clearRect(0, 0, W, H);
    sm.globalCompositeOperation = 'lighter';
    const fadeIn = ease.out(span(t, 0, 900));
    this.ribbons.forEach((r, i) => {
      const h = lerp(r.h * H, 10, m);
      for (let x = 0; x < W; x += 8) {
        const wave = Math.sin(x * r.f1 + s * r.s1 + i) * H * r.a + Math.sin(x * r.f2 - s * r.s2 + i * 2) * H * r.a * 0.5;
        const y = lerp(r.y * H + wave, rule.y, m);
        const glow = (0.5 + 0.5 * Math.sin(x * 0.004 + s * 0.6 + i)) * fadeIn * (1 - m * 0.6);
        const col = sm.createLinearGradient(0, y - h, 0, y);
        col.addColorStop(0, rgba(r.c, 0));
        col.addColorStop(0.75, rgba(r.c, 0.35 * glow));
        col.addColorStop(1, rgba(r.c, 0.8 * glow));
        sm.fillStyle = col;
        sm.fillRect(x, y - h, 8, h);
      }
    });
    ctx.save();
    ctx.globalAlpha = 1 - span(t, 1900, 2350);
    ctx.globalCompositeOperation = 'lighter';
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(this.small, 0, 0, W, H);
    ctx.restore();

    // The line: grows out from the middle as the curtains gather, white-hot, cooling to the ink
    if (m > 0) {
      const w = rule.w * ease.out(span(t, 1700, 2250));
      ctx.save();
      ctx.shadowColor = `rgba(151, 26, 255, ${0.9 * (1 - cool)})`;
      ctx.shadowBlur = 22 * (1 - cool);
      ctx.fillStyle = `rgb(${Math.round(lerp(255, 241, cool))}, ${Math.round(lerp(250, 238, cool))}, 255)`;
      ctx.fillRect(rule.x + (rule.w - w) / 2, rule.y, w, rule.h);
      ctx.restore();
    }

    // The headline surfaces, then goes as the light gathers
    this.words.forEach((w, i) => { if (t > 300 + i * 220) w.classList.add('is-in'); });
    if (t > 1550 && !this.phase) { this.phase = 1; this.line.classList.add('is-out'); }
  },
});
