// Hero stage driver: maps scroll position to two progress values for the thinking sphere
// (assets/js/sphere.js), which subscribes with window.TinkerStage.on(fn):
//   morph: 0 at the top of the page -> 1 when the stage pins (the sphere travels from the
//          hero slot [data-stage-slot] to its spot in the stage [data-stage-target])
//   flow:  0 -> 1 while the stage stays pinned (the words glide through, then the orb explodes)
// With data-compact-below="<px>", narrower screens get an is-compact class for the compact
// layout, where the sphere keeps its size instead of growing.
(() => {
  const stage = document.querySelector('[data-stage]');
  const slot = document.querySelector('[data-stage-slot]');
  if (!stage || !slot) return;

  const target = stage.querySelector('[data-stage-target]');
  const listeners = [];
  const compactQuery = stage.dataset.compactBelow
    ? window.matchMedia(`(max-width: ${stage.dataset.compactBelow}px)`)
    : null;

  const clamp = (v) => Math.min(1, Math.max(0, v));
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  const state = {
    morph: 0, eased: 0, flow: 0,
    landed: false, slotRect: null, targetRect: null
  };
  let stageTop = 0;
  let pinLen = 1;

  function measure() {
    stageTop = stage.getBoundingClientRect().top + window.scrollY;
    pinLen = Math.max(stage.offsetHeight - window.innerHeight, 1);
  }

  const isCompact = () => Boolean(compactQuery && compactQuery.matches);

  function update() {
    const y = window.scrollY;
    state.morph = clamp(y / Math.max(stageTop, 1));
    state.eased = easeInOut(state.morph);
    state.flow = clamp((y - stageTop) / pinLen);
    state.slotRect = slot.getBoundingClientRect();
    state.targetRect = target ? target.getBoundingClientRect() : state.slotRect;

    const landed = state.morph >= 0.995;
    if (landed !== state.landed) {
      state.landed = landed;
      stage.classList.toggle('is-landed', landed);
    }
    listeners.forEach((fn) => fn(state));
  }

  let ticking = false;
  function request() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      update();
    });
  }

  function refresh() {
    measure();
    update();
  }

  function syncMode() {
    stage.classList.toggle('is-compact', isCompact());
    state.landed = null; // force landing to be re-evaluated for the new mode
    refresh();
  }

  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', refresh);
  if (compactQuery) compactQuery.addEventListener('change', syncMode);
  window.addEventListener('load', refresh);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);

  stage.classList.add('is-ready');
  syncMode();

  window.TinkerStage = {
    state,
    stage,
    on(fn) {
      listeners.push(fn);
      fn(state);
    }
  };
})();
