// Intro 6 · Prompt. Sage is an AI you talk to, so it opens on a prompt: an input in the middle
// of the screen types the hero's headline and sends it, and the input flattens and stretches into
// the hero rule, lit along its length (white-hot, then cooling to the ink), and SAGE.IS rises out
// of it with the headline it just asked for under it.
// What moves around the input is a field (intros/fields/<name>.js, picked by the page's
// promptField: stars, leaves, ...), which sets window.SagePromptField:
//   const field = SagePromptField.create(W, H, { pillW, pillH });
//   field.draw(ctx, t, dt, o)   // o: the horizon (cx, cy, gap, half), the send (move, warp, rush,
//                               // squash, alpha, all 0–1), W, H, rule and the palette (pal)
(() => {
  const style = document.createElement('style');
  style.textContent = `
    .ipr-glow { position: absolute; left: 50%; top: 50%; width: min(900px, 120vw); height: 420px; translate: -50% -50%; border-radius: 50%; background: radial-gradient(closest-side, rgba(169, 186, 134, 0.16), transparent); filter: blur(40px); transition: opacity 0.6s ease; }
    .ipr-pill { position: absolute; display: flex; align-items: center; gap: 14px; box-sizing: border-box; padding: 0 10px 0 26px; overflow: hidden; border-radius: 999px; background: rgba(16, 21, 12, 0.82); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); box-shadow: 0 0 0 1px rgba(244, 237, 221, 0.12), 0 30px 80px -30px rgba(0, 0, 0, 0.9); opacity: 0; scale: 0.96;
      transition: opacity 0.5s ease, scale 0.6s var(--ease), left 0.65s var(--ease-in-out), top 0.65s var(--ease-in-out), width 0.65s var(--ease-in-out), height 0.65s var(--ease-in-out), border-radius 0.65s var(--ease-in-out), background-color 0.4s ease 0.15s, box-shadow 0.4s ease, padding 0.65s var(--ease-in-out); }
    .ipr-pill.is-in { opacity: 1; scale: 1; }
    .ipr-text { flex: 1; min-width: 0; overflow: hidden; white-space: nowrap; font-size: clamp(1rem, 1.7vw, 1.75rem); letter-spacing: -0.02em; color: var(--ink); transition: opacity 0.2s ease; }
    .ipr-caret { display: inline-block; width: 1.5px; height: 1.1em; margin-left: 1px; vertical-align: -0.18em; background: var(--ink); animation: ui-blink 1s steps(1) infinite; }
    .ipr-send { display: grid; flex: none; place-items: center; width: 52px; height: 52px; border-radius: 50%; background: var(--ink); color: var(--bg); transition: transform 0.25s var(--ease), background 0.25s ease, opacity 0.2s ease; }
    .ipr-send.is-press { transform: scale(0.86); background: var(--accent-soft); }
    .ipr-pill.is-rule { padding: 0; border-radius: 0; background: #fffbea; box-shadow: 0 0 18px 2px rgba(254, 200, 32, 0.8), 0 0 60px 6px rgba(169, 186, 134, 0.45); }
    .ipr-pill.is-rule.is-cool { background: var(--ink); box-shadow: 0 0 0 0 rgba(254, 200, 32, 0); transition: left 0.65s var(--ease-in-out), top 0.65s var(--ease-in-out), width 0.65s var(--ease-in-out), height 0.65s var(--ease-in-out), background-color 0.6s ease, box-shadow 0.8s ease; }
    /* The light along the line as it stretches, as in Horizon: travels with it to the rule */
    .ipr-band { position: absolute; left: 0; right: 0; height: 44vh; translate: 0 -50%; pointer-events: none; opacity: 0;
      background: linear-gradient(to bottom, rgba(169, 186, 134, 0), rgba(214, 196, 96, 0.2) 50%, rgba(169, 186, 134, 0));
      transition: top 0.65s var(--ease-in-out), opacity 0.45s ease; }
    .ipr-band.is-on { opacity: 1; }
    .ipr-band.is-off { opacity: 0; transition: top 0.65s var(--ease-in-out), opacity 0.9s ease; }
    .ipr-pill.is-rule .ipr-text, .ipr-pill.is-rule .ipr-send { opacity: 0; }
  `;
  document.head.append(style);
})();

// The forest palette (style.css, html[data-theme="home"]), as RGB for the canvas
const PAL = {
  night: [12, 16, 9],      // the ground: night at the edges,
  dusk: [20, 26, 15],
  hero: [29, 37, 22],      // the hero's forest in the middle
  cream: [244, 237, 221],
  mist: [207, 208, 192],
  sage: [169, 186, 134],
  leaf: [143, 160, 112],
  moss: [52, 65, 40],
  sun: [254, 200, 32],
};

SageIntro.run({
  background: '#0c1009',
  brandAt: 2000,
  duration: 2800,

  setup(api) {
    const { W, H } = api.g;
    const glow = document.createElement('div');
    glow.className = 'ipr-glow';
    const band = document.createElement('div');
    band.className = 'ipr-band';
    band.style.top = `${H / 2}px`;
    const pill = document.createElement('div');
    pill.className = 'ipr-pill';
    const w = Math.min(860, W - 32), h = W < 600 ? 58 : 78;
    Object.assign(pill.style, { left: `${(W - w) / 2}px`, top: `${(H - h) / 2}px`, width: `${w}px`, height: `${h}px` });
    pill.innerHTML = `<span class="ipr-text"><span class="ipr-typed"></span><i class="ipr-caret"></i></span>
      <span class="ipr-send"><svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M8 13V3M4 7l4-4 4 4"/></svg></span>`;
    api.intro.append(glow, band, pill);
    requestAnimationFrame(() => pill.classList.add('is-in'));
    // The hero's own headline, with its accent on the last words
    const plain = 'Your next ';
    const accent = 'AI breakthrough';
    this.s = { field: SagePromptField.create(W, H, { pillW: w, pillH: h }), h, last: 0, pill, glow, band, typed: pill.querySelector('.ipr-typed'), send: pill.querySelector('.ipr-send'), plain, accent, n: -1, phase: 0 };
  },

  frame(t, api) {
    const { ctx, span, lerp, ease, g } = api;
    const { W, H, rule } = g;
    const st = this.s;
    const dt = Math.min(0.05, (t - st.last) / 1000);
    st.last = t;

    // Ground: the hero's own (style.css, html[data-theme="home"] .hero), forest in the middle and
    // night at the edges, so it hands over without a change
    if (!st.ground) {
      const r = Math.hypot(W, H) / 2;
      st.ground = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, r);
      st.ground.addColorStop(0, `rgb(${PAL.hero})`);
      st.ground.addColorStop(0.55, `rgb(${PAL.dusk})`);
      st.ground.addColorStop(1, `rgb(${PAL.night})`);
    }
    ctx.fillStyle = st.ground;
    ctx.fillRect(0, 0, W, H);

    // The field around the input; on send its horizon travels with the input to the rule (in step
    // with the input's own move, .ipr-pill's 0.65s ease-in-out) and it gathers into the line
    const move = ease.inOut(span(t, 1520, 2170));
    st.field.draw(ctx, t, dt, {
      cx: rule.x + rule.w / 2,
      cy: lerp(H / 2, rule.y + rule.h / 2, move),
      gap: lerp(st.h / 2 + 18, 0, move),
      half: rule.w / 2,
      move,
      warp: ease.in(span(t, 1400, 2250)),
      rush: ease.in(span(t, 1950, 2500)),
      squash: ease.inOut(span(t, 1750, 2400)),
      alpha: ease.out(span(t, 0, 700)) * (1 - span(t, 2200, 2700)),
      W, H, rule, pal: PAL,
    });
    const full = st.plain + st.accent;
    const n = Math.round(span(t, 380, 1250) * full.length);
    if (n !== st.n) {
      st.n = n;
      const a = full.slice(0, Math.min(n, st.plain.length));
      const b = n > st.plain.length ? full.slice(st.plain.length, n) : '';
      st.typed.innerHTML = '';
      st.typed.append(a);
      if (b) {
        const s = document.createElement('span');
        s.className = 'text-accent';
        s.textContent = b;
        st.typed.append(s);
      }
    }
    if (t > 1380 && st.phase === 0) {
      st.phase = 1;
      st.send.classList.add('is-press');
    }
    // Sent: the input becomes the rule
    if (t > 1520 && st.phase === 1) {
      st.phase = 2;
      st.pill.classList.add('is-rule');
      Object.assign(st.pill.style, { left: `${rule.x}px`, top: `${rule.y}px`, width: `${rule.w}px`, height: `${rule.h}px` });
      st.band.classList.add('is-on');
      st.band.style.top = `${rule.y + rule.h / 2}px`;
    }
    // The light dies down and the line cools to the ink as the wordmark comes up
    if (t > 2250 && st.phase === 2) {
      st.phase = 3;
      st.band.classList.add('is-off');
      st.pill.classList.add('is-cool');
    }
  },
});
