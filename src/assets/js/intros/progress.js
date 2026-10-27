// Intro 3 · Progress. The loader is the hero itself: a counter, set at the wordmark's size and in
// its place, rolls from 000 to 100 while the rule fills as its progress bar. At 100 the digits
// drop behind the rule and SAGE.IS rises out of it in their place.
(() => {
  const style = document.createElement('style');
  style.textContent = `
    .ip-clip { position: absolute; left: 0; top: 0; right: 0; overflow: hidden; }
    .ip-count { position: absolute; display: flex; font-family: var(--font-display); line-height: 1; color: var(--ink); transition: transform 0.55s var(--ease-in-out); }
    .ip-count.is-gone { transform: translateY(110%); }
    .ip-slot { position: relative; width: 0.56em; height: 1em; overflow: hidden; }
    .ip-slot > span { position: absolute; left: 0; top: 0; display: flex; flex-direction: column; transition: transform 0.5s var(--ease); }
    /* Each reel turns faster than the one to its left, so the digits read as they settle */
    .ip-slot:nth-child(2) > span { transition-duration: 0.28s; }
    .ip-slot:nth-child(3) > span { transition-duration: 0.09s; }
    .ip-slot > span > b { height: 1em; font-weight: 400; text-align: center; }
    .ip-pct { font-size: 0.4em; padding-left: 0.08em; align-self: flex-end; background: var(--accent-gradient); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
    .ip-track, .ip-bar { position: absolute; }
    .ip-track { background: var(--line); }
    .ip-bar { background: var(--ink); transform-origin: left; transform: scaleX(0); }
  `;
  document.head.append(style);
})();

SageIntro.run({
  canvas: false,
  brandAt: 2000,
  duration: 2750,

  setup(api) {
    const { mark, rule, fontSize } = api.g;
    const clip = document.createElement('div');
    clip.className = 'ip-clip';
    // Clipped at the rule, so the digits drop out of sight behind it
    clip.style.height = `${rule.y}px`;
    const count = document.createElement('div');
    count.className = 'ip-count';
    Object.assign(count.style, { left: `${mark.x}px`, top: `${mark.y}px`, fontSize: `${fontSize}px` });
    const slots = [0, 1, 2].map(() => {
      const slot = document.createElement('span');
      slot.className = 'ip-slot';
      const reel = document.createElement('span');
      reel.innerHTML = '<b>0</b><b>1</b><b>2</b><b>3</b><b>4</b><b>5</b><b>6</b><b>7</b><b>8</b><b>9</b>';
      slot.append(reel);
      count.append(slot);
      return reel;
    });
    const pct = document.createElement('span');
    pct.className = 'ip-pct';
    pct.textContent = '%';
    count.append(pct);
    clip.append(count);
    api.intro.append(clip);
    // Sit the digits on the wordmark's baseline, just above the rule
    const first = api.letters()[0];
    if (first) {
      const probe = document.createElement('i');
      probe.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
      slots[0].firstChild.append(probe);
      count.style.top = `${mark.y + first.baseline - probe.getBoundingClientRect().top}px`;
      probe.remove();
    }

    const track = document.createElement('div');
    track.className = 'ip-track';
    const bar = document.createElement('div');
    bar.className = 'ip-bar';
    [track, bar].forEach((el) => Object.assign(el.style, { left: `${rule.x}px`, top: `${rule.y}px`, width: `${rule.w}px`, height: `${rule.h}px` }));
    api.intro.append(track, bar);
    this.s = { count, slots, bar, shown: -1 };
  },

  frame(t, api) {
    const { span, ease } = api;
    const st = this.s;
    // Fast to begin with, a pause near the end, then the last stretch: it reads as real loading
    const k = span(t, 150, 1800);
    const p = k < 0.55 ? ease.out(k / 0.55) * 0.72 : k < 0.7 ? 0.72 + (k - 0.55) * 0.4 : 0.78 + ease.inOut((k - 0.7) / 0.3) * 0.22;
    const n = Math.round(p * 100);
    if (n !== st.shown) {
      st.shown = n;
      const digits = String(n).padStart(3, '0');
      st.slots.forEach((reel, i) => { reel.style.transform = `translateY(${-digits[i] * 10}%)`; });
    }
    st.bar.style.transform = `scaleX(${p})`;
    if (t > 1850) st.count.classList.add('is-gone');
  },
});
