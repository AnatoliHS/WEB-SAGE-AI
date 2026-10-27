// Shared runner for the intros (component/intro.njk). Each variant (intros/<name>.js) calls
// SageIntro.run(scene), and the runner does everything they have in common:
//   - measures where the hero's wordmark and rule are, so every intro can land exactly on them
//   - runs the scene's frame(t) on a clock that starts once the fonts are in (so those
//     measurements are final), with an optional 2D canvas sized to the screen
//   - at scene.brandAt shows the real wordmark (the dynamic brand, which sits above the
//     intro): its letters rise out of the rule, or with instantBrand it just appears in place,
//     for scenes that drew the wordmark themselves and swap to it
//   - at scene.duration hands over: the hero copy and header come in (intro-completed),
//     the intro fades and is removed
// A click, key or scroll skips straight to the hero.
(() => {
  const root = document.documentElement;
  const intro = document.getElementById('intro');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const clamp01 = (v) => Math.min(Math.max(v, 0), 1);
  const lerp = (a, b, k) => a + (b - a) * k;
  // Progress (0–1) of t through [a, b]
  const span = (t, a, b) => clamp01((t - a) / (b - a));
  const ease = {
    out: (k) => 1 - Math.pow(1 - k, 3),
    in: (k) => k * k * k,
    inOut: (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2),
    expo: (k) => (k >= 1 ? 1 : 1 - Math.pow(2, -10 * k)),
  };

  function measure() {
    const rule = document.getElementById('hero-rule');
    const ghost = document.querySelector('.hero-wordmark-ghost');
    const r = rule ? rule.getBoundingClientRect() : { left: 0, top: innerHeight / 2, width: innerWidth, height: 3 };
    const m = ghost ? ghost.getBoundingClientRect() : { left: 0, top: 0, width: 0, height: 0 };
    return {
      W: innerWidth,
      H: innerHeight,
      rule: { x: r.left, y: r.top, w: r.width, h: r.height || 3 },
      mark: { x: m.left, y: m.top, w: m.width, h: m.height },
      fontSize: ghost ? parseFloat(getComputedStyle(ghost).fontSize) : 200,
    };
  }

  // The wordmark's letters, each with its box and the text baseline, for scenes that draw it
  function letters() {
    const ghost = document.querySelector('.hero-wordmark-ghost');
    if (!ghost) return [];
    return Array.from(ghost.querySelectorAll('.ltr > span')).map((el) => {
      // The letter's own box (.ltr): the span inside is padded out for the .IS gradient
      const box = el.parentElement.getBoundingClientRect();
      // A zero-size inline box sits on the baseline
      const probe = document.createElement('i');
      probe.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
      el.append(probe);
      const baseline = probe.getBoundingClientRect().top;
      probe.remove();
      return {
        ch: el.textContent,
        x: box.left, y: box.top, w: box.width, h: box.height, baseline,
        size: parseFloat(getComputedStyle(el).fontSize),
        accent: !!el.closest('.click-word'),
      };
    });
  }

  function run(scene) {
    if (!intro || !root.classList.contains('has-intro') || reduced) return;
    const brand = document.getElementById('dynamic-brand');
    const canvas = intro.querySelector('.intro-canvas');
    const ctx = scene.canvas === false || !canvas ? null : canvas.getContext('2d');
    if (!ctx && canvas) canvas.remove();
    if (scene.background) intro.style.setProperty('--intro-bg', scene.background);

    const api = { intro, canvas, ctx, brand, g: measure(), letters, clamp01, lerp, span, ease, dpr: 1 };

    function size() {
      api.g = measure();
      if (!ctx) return;
      api.dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(api.g.W * api.dpr);
      canvas.height = Math.round(api.g.H * api.dpr);
      ctx.setTransform(api.dpr, 0, 0, api.dpr, 0, 0);
    }
    size();
    window.addEventListener('resize', size);

    let start = 0, frame = 0, brandShown = false, done = false;

    function showBrand(instant) {
      if (brandShown || !brand) return;
      brandShown = true;
      if (instant) brand.classList.add('is-instant');
      brand.classList.add('is-ready');
    }

    function finish(skipped) {
      if (done) return;
      done = true;
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', size);
      ['click', 'keydown', 'wheel', 'touchmove'].forEach((e) => window.removeEventListener(e, skip));
      showBrand(skipped || scene.instantBrand);
      if (scene.finish) scene.finish(api, skipped);
      root.classList.add('intro-completed');
      document.dispatchEvent(new Event('tinker:intro-done'));
      if (skipped) intro.style.setProperty('--intro-fade', '0.3s');
      intro.classList.add('is-out');
      setTimeout(() => {
        root.classList.remove('has-intro');
        intro.remove();
      }, 700);
    }

    const skip = () => finish(true);

    function tick(now) {
      if (done) return;
      frame = requestAnimationFrame(tick);
      if (!start) start = now;
      const t = now - start;
      if (t >= scene.brandAt) showBrand(scene.instantBrand);
      scene.frame(t, api);
      if (t >= scene.duration) finish(false);
    }

    // Start once the fonts are in, so the wordmark and rule are where they will stay; the scene
    // can draw its first frame (its start state) meanwhile
    const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    Promise.race([fontsReady, new Promise((r) => setTimeout(r, 800))]).then(() => {
      size();
      if (scene.setup) scene.setup(api);
      frame = requestAnimationFrame(tick);
    });

    // Skip: wait a beat, so the click that loaded the page doesn't end it
    setTimeout(() => ['click', 'keydown', 'wheel', 'touchmove'].forEach((e) => window.addEventListener(e, skip, { passive: true })), 250);
    // Never hold the page longer than this
    setTimeout(() => finish(false), scene.duration + 3000);
  }

  window.SageIntro = { run };
})();
