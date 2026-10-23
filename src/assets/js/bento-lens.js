// Bento magnifier (Features): a circle over the bento shows a copy of the grid inside it, each card
// filled with its own colour and zoomed slightly, like a magnifying glass. The copy is cut to the
// circle with clip-path (see .bento-lens in style.css) and replaces the per-card hover fill.
// The circle wanders on a random path while the grid is on screen; the mouse doesn't steer it
// (reduced motion: no lens, frames flood on hover).
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

  // Reduced motion: no lens; frames flood on hover instead (see .bento-stage:not(.has-lens) in style.css)
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

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

  // The lens steers towards a random point on the grid and picks a new one as it gets close, so
  // its path curves and never repeats
  const s = { x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0, r: 0, placed: false };
  let visible = false;
  let frame = 0;
  let last = 0;
  const radius = () => Math.min(190, Math.max(110, stage.clientWidth * 0.16));
  const pick = (w, h) => {
    const pad = Math.min(radius() * 0.5, w / 4, h / 4);
    // A few tries for a point well away from where the lens is, so it doesn't dither in one spot
    for (let i = 0; i < 6; i++) {
      s.tx = pad + Math.random() * (w - pad * 2);
      s.ty = pad + Math.random() * (h - pad * 2);
      if (Math.hypot(s.tx - s.x, s.ty - s.y) > Math.min(w, h) * 0.35) break;
    }
  };

  const tick = (now) => {
    const w = stage.clientWidth, h = stage.clientHeight;
    // Capped, so a frame after a long pause doesn't jump
    const dt = Math.min(0.05, (now - (last || now)) / 1000);
    last = now;
    if (!s.placed) {
      s.x = w * Math.random(); s.y = h * Math.random();
      pick(w, h);
      s.placed = true;
    }
    if (Math.hypot(s.tx - s.x, s.ty - s.y) < radius() * 0.5) pick(w, h);
    // Ease the velocity towards the target's direction at a steady pace
    const dx = s.tx - s.x, dy = s.ty - s.y, d = Math.hypot(dx, dy) || 1;
    const speed = 170;
    s.vx += (dx / d * speed - s.vx) * Math.min(1, dt * 1.2);
    s.vy += (dy / d * speed - s.vy) * Math.min(1, dt * 1.2);
    s.x = Math.min(w, Math.max(0, s.x + s.vx * dt));
    s.y = Math.min(h, Math.max(0, s.y + s.vy * dt));
    s.r += (radius() - s.r) * Math.min(1, dt * 6);
    stage.style.setProperty('--lens-x', `${s.x}px`);
    stage.style.setProperty('--lens-y', `${s.y}px`);
    stage.style.setProperty('--lens-r', `${s.r}px`);
    ring.style.opacity = s.r > 1 ? '1' : '0';
    frame = visible ? requestAnimationFrame(tick) : 0;
  };

  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible && !frame) { last = 0; frame = requestAnimationFrame(tick); }
  }).observe(stage);
})();
