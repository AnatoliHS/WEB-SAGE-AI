// Intro 5 · Zoom. The screen opens filled with violet: you're inside the E. The view pulls back
// out of the letter, revealing SAGE.IS in the brand gradient, and settles exactly on the hero's
// wordmark; SAGE cools to the ink, the rule draws under it and the real wordmark takes over.
// Drawn on the canvas as text, so it stays sharp at any scale.
SageIntro.run({
  brandAt: 2050,
  instantBrand: true,
  duration: 2600,

  setup(api) {
    const letters = api.letters();
    const e = letters[3] || letters[0];
    // Inside the E's upright: zoomed in on this point, the whole screen is ink
    const ox = e.x + e.w * 0.16, oy = e.y + e.h * 0.5;
    const stem = e.w * 0.24;
    const s0 = (Math.max(api.g.W, api.g.H) * 2.4) / stem;
    this.s = { letters, ox, oy, s0 };
  },

  frame(t, api) {
    const { ctx, g, span, lerp, ease, dpr } = api;
    const { W, H, rule, mark } = g;
    const st = this.s;

    // Hold inside the letter, then pull out: exponential in scale, so the speed feels even
    const k = ease.inOut(span(t, 250, 1750));
    const s = Math.exp(lerp(Math.log(st.s0), 0, k));
    const cool = span(t, 1650, 2050);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#0e0e0f';
    ctx.fillRect(0, 0, W, H);

    // Screen point = origin + (point − origin) · s
    ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * st.ox * (1 - s), dpr * st.oy * (1 - s));
    const grad = ctx.createLinearGradient(mark.x, mark.y, mark.x + mark.w, mark.y + mark.h);
    grad.addColorStop(0, '#302aff');
    grad.addColorStop(1, '#971aff');
    for (const l of st.letters) {
      ctx.font = `400 ${l.size}px Anton, Impact, sans-serif`;
      ctx.fillStyle = grad;
      ctx.fillText(l.ch, l.x, l.baseline);
      // SAGE turns to the ink as it lands; .IS keeps the gradient, as in the hero
      if (!l.accent && cool > 0) {
        ctx.globalAlpha = cool;
        ctx.fillStyle = '#eee9e2';
        ctx.fillText(l.ch, l.x, l.baseline);
        ctx.globalAlpha = 1;
      }
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // A violet veil at the start makes sure the first frames are solid colour edge to edge
    const veil = 1 - span(t, 250, 600);
    if (veil > 0) {
      ctx.globalAlpha = veil;
      ctx.fillStyle = '#5a22ff';
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }

    // The rule draws in under the landed name
    const line = ease.inOut(span(t, 1600, 2200));
    if (line > 0) {
      ctx.fillStyle = '#eee9e2';
      ctx.fillRect(rule.x, rule.y, rule.w * line, rule.h);
    }
  },
});
