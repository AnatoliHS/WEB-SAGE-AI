// Intro 1 · Horizon. A field of stars (intros/starfield.js) streams at you from a dark horizon
// slit, tilted along an S; it rolls level onto the hero rule, speeds up, then flattens into that
// line, which becomes the rule as the ground turns to the page's colour and SAGE.IS rises out of it.
SageIntro.run({
  background: '#000',
  brandAt: 2350,
  duration: 3200,

  setup(api) {
    const { W, H } = api.g;
    this.s = { field: SageStarfield.create(W, H), last: 0, roll0: Math.min(0.6, Math.max(0.3, Math.atan2(H * 0.5, W * 0.85))) };
  },

  frame(t, api) {
    const { ctx, g, span, lerp, ease } = api;
    const { W, H, rule } = g;
    const st = this.s;
    const dt = Math.min(0.05, (t - st.last) / 1000);
    st.last = t;

    // Timeline
    const roll = ease.inOut(span(t, 1050, 2150));       // tilt and S straighten, horizon moves onto the rule
    const squash = ease.inOut(span(t, 1900, 2650));     // the slabs flatten into the line
    const line = ease.inOut(span(t, 2050, 2700));       // the line grows out to the rule's width
    const ground = span(t, 2250, 2950);                 // black to the page colour
    const starsOut = span(t, 2350, 2900);
    const fadeIn = ease.out(span(t, 0, 600));
    const warp = ease.in(span(t, 1150, 2300));

    // Ground
    const bg = Math.round(lerp(0, 14, ground));
    ctx.fillStyle = `rgb(${bg},${bg},${bg + (ground > 0 ? 1 : 0)})`;
    ctx.fillRect(0, 0, W, H);

    const cx = rule.x + rule.w / 2;
    const cy = lerp(H / 2, rule.y + rule.h / 2, roll);
    st.field.draw(ctx, t, dt, {
      cx, cy,
      speed: lerp(0.9, 7, warp) + 9 * ease.in(span(t, 2100, 2700)),
      // Dots while drifting, streaks once it warps
      trail: 0.05 * warp,
      gap: lerp(lerp(16, 9, roll), 0, squash),
      // Starts as a tight stream either side of the slit, and opens out to the whole screen as it rolls level
      band: lerp(0.2, 1, ease.inOut(span(t, 900, 2100))),
      squash,
      half: rule.w / 2,
      rot: st.roll0 * (1 - roll),
      sAmp: H * 0.1 * (1 - roll),
      sW: W * 0.07,
      alpha: fadeIn * (1 - starsOut),
    });

    // Violet light along the horizon as the stars pour into it
    const glow = span(t, 1700, 2350) * (1 - span(t, 2600, 3150));
    if (glow > 0) {
      const gh = H * 0.22;
      const grad = ctx.createLinearGradient(0, cy - gh, 0, cy + gh);
      grad.addColorStop(0, 'rgba(48, 42, 255, 0)');
      grad.addColorStop(0.5, `rgba(110, 50, 255, ${0.22 * glow})`);
      grad.addColorStop(1, 'rgba(48, 42, 255, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, cy - gh, W, gh * 2);
    }

    // The line: grows from the middle out to the rule's width, white-hot at first, then the ink
    if (line > 0) {
      const w = rule.w * line;
      const hot = 1 - span(t, 2500, 2950);
      ctx.fillStyle = hot > 0 ? `rgb(${Math.round(lerp(238, 255, hot))},${Math.round(lerp(233, 255, hot))},${Math.round(lerp(226, 255, hot))})` : '#eee9e2';
      ctx.fillRect(cx - w / 2, rule.y, w, rule.h);
    }
  },
});
