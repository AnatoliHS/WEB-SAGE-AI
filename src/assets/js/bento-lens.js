// Bento magnifier (Features): a circle over the bento shows a copy of the grid inside it, each card
// filled with its own colour and zoomed slightly, like a magnifying glass. The copy is cut to the
// circle with clip-path (see .bento-lens in style.css) and replaces the per-card hover fill.
// The circle wanders on its own while the grid is on screen, takes over when the mouse enters and
// hands back when it leaves (reduced motion: mouse only, no wandering).
// Touch screens get no lens, since it would cover what's being read. Instead, the frame passing the
// middle of the screen floods with its colour through a circle growing from its centre (.is-focus).
(() => {
  const stage = document.querySelector('[data-bento-lens]');
  const grid = stage && stage.querySelector('.bento');
  if (!grid) return;
  const mouse = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  if (!mouse) {
    stage.classList.add('is-touch');
    const cells = Array.from(grid.querySelectorAll('.bento-cell'));
    let ticking = false;
    // The lit frame is the one under the screen's centre line; in the gap between two frames the
    // last one stays lit, and outside the grid none is
    const update = () => {
      ticking = false;
      const mid = window.innerHeight / 2;
      const hit = cells.filter((c) => { const r = c.getBoundingClientRect(); return r.top <= mid && r.bottom >= mid; });
      const g = grid.getBoundingClientRect();
      if (!hit.length && g.top <= mid && g.bottom >= mid) return;
      cells.forEach((c) => c.classList.toggle('is-focus', hit.includes(c)));
    };
    const request = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
    window.addEventListener('scroll', request, { passive: true });
    window.addEventListener('resize', request);
    update();
    return;
  }

  const wander = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // The lit copy: same cards, invisible to assistive tech
  const copy = grid.cloneNode(true);
  copy.querySelectorAll('[data-bento-say]').forEach((el) => el.removeAttribute('data-bento-say'));
  const lens = document.createElement('div');
  lens.className = 'bento-lens';
  lens.setAttribute('aria-hidden', 'true');
  lens.inert = true;
  lens.appendChild(copy);
  const ring = document.createElement('i');
  ring.className = 'bento-ring';
  stage.append(lens, ring);
  stage.classList.add('has-lens');

  // Keep the copy's "Make me a game" line in step with the original (scripts.njk cycles it)
  const say = grid.querySelector('.bento-say');
  if (say) {
    const from = Array.from(say.children);
    const to = Array.from(copy.querySelector('.bento-say').children);
    new MutationObserver(() => from.forEach((sp, i) => {
      const t = to[i];
      if (t.className === sp.className) return;
      // A phrase that slid out is parked back below without animating, as the original does;
      // otherwise it would visibly slide down behind the new one
      const parking = t.classList.contains('is-out') && !sp.classList.contains('is-out') && !sp.classList.contains('is-in');
      if (parking) t.style.transition = 'none';
      t.className = sp.className;
      if (parking) { void t.offsetWidth; t.style.transition = ''; }
    })).observe(say, { subtree: true, attributes: true, attributeFilter: ['class'] });
  }

  const s = { x: 0, y: 0, tx: 0, ty: 0, r: 0, tr: 0, placed: false };
  let hovering = false;
  let released = -Infinity; // when the mouse last left; wandering resumes a moment later
  let visible = false;
  let frame = 0;
  const radius = () => Math.min(190, Math.max(110, stage.clientWidth * 0.16));
  const wandering = (now) => wander && visible && !hovering && now - released > 900;

  const tick = (now) => {
    const w = stage.clientWidth, h = stage.clientHeight;
    const drifting = wandering(now);
    if (drifting) {
      // A slow, aimless loop across the grid
      const t = now / 1000;
      s.tx = w * (0.5 + 0.32 * Math.cos(t * 0.5));
      s.ty = h * (0.5 + 0.3 * Math.sin(t * 0.8));
      s.tr = radius();
      if (!s.placed) { s.x = s.tx; s.y = s.ty; s.placed = true; }
    }
    // The mouse is followed closely; the wander is lazier
    const k = hovering ? 0.2 : 0.06;
    s.x += (s.tx - s.x) * k;
    s.y += (s.ty - s.y) * k;
    s.r += (s.tr - s.r) * 0.1;
    const moving = Math.abs(s.tx - s.x) > 0.3 || Math.abs(s.ty - s.y) > 0.3 || Math.abs(s.tr - s.r) > 0.3;
    // Settle exactly on the target, so a closed lens leaves no sub-pixel dot behind
    if (!moving) { s.x = s.tx; s.y = s.ty; s.r = s.tr; }
    stage.style.setProperty('--lens-x', `${s.x}px`);
    stage.style.setProperty('--lens-y', `${s.y}px`);
    stage.style.setProperty('--lens-r', `${s.r}px`);
    ring.style.opacity = s.r > 1 ? '1' : '0';
    // Keep going while anything moves, or while the grid is on screen and waiting to wander again
    frame = moving || drifting || (wander && visible && !hovering) ? requestAnimationFrame(tick) : 0;
  };
  const run = () => { if (!frame) frame = requestAnimationFrame(tick); };

  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible) run();
  }).observe(stage);

  const aim = (e) => {
    const b = stage.getBoundingClientRect();
    s.tx = e.clientX - b.left;
    s.ty = e.clientY - b.top;
  };
  stage.addEventListener('pointerenter', (e) => {
    hovering = true;
    aim(e);
    // Grow in at the cursor if the lens was closed; otherwise glide over from where it was wandering
    if (s.r < 1) { s.x = s.tx; s.y = s.ty; }
    s.tr = radius();
    run();
  });
  stage.addEventListener('pointermove', (e) => { aim(e); run(); });
  stage.addEventListener('pointerleave', () => {
    hovering = false;
    released = performance.now();
    if (!wander) s.tr = 0;
    run();
  });
})();
