// Intro (component/intro.njk): a line draws exactly over the hero rule, the four words rise from
// behind it one at a time, then the overlay fades onto the real page and fires 'tinker:intro-done',
// which lets the dynamic brand (scripts.njk) rise from the same rule.
(() => {
  const root = document.documentElement;
  const intro = document.getElementById('intro');
  if (!intro || !root.classList.contains('has-intro')) return;

  const line = intro.querySelector('[data-intro-line]');
  const stack = intro.querySelector('[data-intro-stack]');
  const rule = document.querySelector('.hero-rule');
  const anchor = document.getElementById('hero-wordmark-anchor');
  const timers = [];
  let done = false;

  const finish = () => {
    if (done) return;
    done = true;
    timers.forEach(clearTimeout);
    intro.classList.add('is-out');
    document.dispatchEvent(new Event('tinker:intro-done'));
    setTimeout(() => root.classList.remove('has-intro'), 250);
  };

  const play = () => {
    if (done) return;
    if (!rule || window.scrollY > 0) return finish();
    // Line and words sit on the rule's exact spot; the words rest the same distance above it as the wordmark
    const r = rule.getBoundingClientRect();
    const gap = anchor ? r.top - anchor.getBoundingClientRect().bottom : 16;
    Object.assign(line.style, { left: `${r.left}px`, top: `${r.top}px`, height: `${r.height}px` });
    Object.assign(stack.style, { left: `${r.left}px`, width: `${r.width}px`, height: `${r.top}px` });
    stack.style.setProperty('--gap', `${gap}px`);
    void line.offsetWidth;
    line.style.width = `${r.width}px`;
    intro.classList.add('is-play');
    timers.push(setTimeout(finish, 450 + 4 * 600));
  };

  intro.addEventListener('click', finish);
  // Never hold the page if something stalls
  timers.push(setTimeout(finish, 4000));
  // The words are set in Anton: give it a moment to load so they don't rise in a fallback face
  const font = document.fonts ? document.fonts.load('1em Anton') : Promise.resolve();
  Promise.race([font, new Promise((r) => setTimeout(r, 800))]).then(play, play);
})();
