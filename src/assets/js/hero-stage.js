// Hero stage driver: maps scroll position to two progress values for the thinking sphere
// (assets/js/sphere.js), which subscribes with window.TinkerStage.on(fn):
//   morph: 0 at the top of the page -> 1 when the stage pins (the sphere travels from the
//          hero slot [data-stage-slot] to its spot in the stage [data-stage-target])
//   flow:  0 -> 1 while the stage stays pinned (steps through the flow nodes)
// With data-compact-below="<px>", narrower screens get an is-compact class for the compact
// layout, where the sphere keeps its size instead of growing.
(() => {
  const stage = document.querySelector('[data-stage]');
  const slot = document.querySelector('[data-stage-slot]');
  if (!stage || !slot) return;

  const target = stage.querySelector('[data-stage-target]');
  const steps = Array.from(stage.querySelectorAll('[data-step]'));
  const statusEl = stage.querySelector('[data-stage-status]');
  const counterEl = stage.querySelector('[data-stage-counter]');
  const count = Number(stage.dataset.steps) || 4;
  const listeners = [];
  const compactQuery = stage.dataset.compactBelow
    ? window.matchMedia(`(max-width: ${stage.dataset.compactBelow}px)`)
    : null;

  const clamp = (v) => Math.min(1, Math.max(0, v));
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const pad = (n) => String(n).padStart(2, '0');

  const state = {
    morph: 0, eased: 0, flow: 0, stepFloat: 0, step: -1,
    landed: false, slotRect: null, targetRect: null
  };
  let stageTop = 0;
  let pinLen = 1;

  function measure() {
    stageTop = stage.getBoundingClientRect().top + window.scrollY;
    pinLen = Math.max(stage.offsetHeight - window.innerHeight, 1);
  }

  // step -1 means nothing is selected yet
  function setStep(step) {
    state.step = step;
    steps.forEach((el) => el.classList.toggle('is-active', Number(el.dataset.step) === step));
    if (step < 0) return;
    const active = steps.find((el) => Number(el.dataset.step) === step);
    if (statusEl && active && active.dataset.status) {
      statusEl.textContent = active.dataset.status;
      statusEl.classList.remove('flash');
      void statusEl.offsetWidth;
      statusEl.classList.add('flash');
    }
    if (counterEl) counterEl.textContent = `${pad(step + 1)} / ${pad(count)}`;
  }

  const isCompact = () => Boolean(compactQuery && compactQuery.matches);

  function update() {
    const y = window.scrollY;
    state.morph = clamp(y / Math.max(stageTop, 1));
    state.eased = easeInOut(state.morph);
    state.flow = clamp((y - stageTop) / pinLen);
    state.stepFloat = state.flow * count;
    state.slotRect = slot.getBoundingClientRect();
    state.targetRect = target ? target.getBoundingClientRect() : state.slotRect;

    const landed = state.morph >= 0.995;
    if (landed !== state.landed) {
      state.landed = landed;
      stage.classList.toggle('is-landed', landed);
    }

    const step = Math.min(count - 1, Math.floor(state.stepFloat));
    if (step !== state.step) setStep(step);
    listeners.forEach((fn) => fn(state));
  }

  // Jump to a node: scroll into the "hold" part of its step, before any transition to the next
  function goTo(i) {
    window.scrollTo({ top: stageTop + pinLen * ((i + 0.3) / count), behavior: 'smooth' });
  }

  steps.forEach((el) => {
    el.addEventListener('click', () => goTo(Number(el.dataset.step)));
  });

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
    steps,
    stage,
    count,
    goTo,
    on(fn) {
      listeners.push(fn);
      fn(state);
    }
  };
})();
