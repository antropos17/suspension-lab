import { PART_NAMES, reelStopTime } from './drive-slot.js';

export function createSlotPanel(slot, bank, button, status, timer) {
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const reels = slot.parts.map(() => {
    const reel = document.createElement('div');
    reel.className = 'slot-reel';
    reel.setAttribute('role', 'img');
    const strip = document.createElement('div');
    strip.className = 'slot-strip';
    const tiles = [0,1].map(() => {
      const tile = document.createElement('div');
      tile.className = 'slot-tile';
      tile.append(document.createElement('i'));
      strip.append(tile);
      return tile.firstChild;
    });
    reel.append(strip);
    bank.append(reel);
    return {reel, strip, tiles};
  });
  let lastPhase, lastParts, lastDisabled, lastTime;
  return function draw(now, locked) {
    const { phase, parts, previous, result } = slot;
    const changed = phase !== lastPhase || parts !== lastParts;
    const disabled = locked || phase !== 'ready';
    if (disabled !== lastDisabled) button.disabled = disabled;
    lastDisabled = disabled;
    if (changed || phase === 'rolling') {
      reels.forEach(({reel, strip, tiles}, i) => {
        const n = PART_NAMES.length;
        let position = parts[i];
        if (phase === 'rolling') {
          const t = Math.min(1, Math.max(0, (now - slot.started) / reelStopTime(i)));
          const steps = n * 2 + (parts[i] - previous[i] + n) % n;
          position = reducedMotion.matches ? (t < 1 ? previous[i] : parts[i]) : previous[i] + steps * (1 - (1 - t) ** 2);
        }
        const whole = Math.floor(position);
        strip.style.transform = 'translateY(' + ((whole - position) * 100) + '%)';
        tiles.forEach((tile, j) => {
          const id = (whole + j) % n;
          if (tile.dataset.part !== String(id)) tile.dataset.part = id;
        });
        if (changed) {
          reel.setAttribute('aria-label', phase === 'rolling' ? 'Rolling' : PART_NAMES[parts[i]]);
          reel.classList.toggle('match', phase !== 'rolling' && !!result?.winners.includes(parts[i]));
        }
      });
    }
    if (changed) {
      if (phase === 'rolling') status.textContent = 'Reels spinning…';
      else if (phase === 'driving') status.textContent = result.count === 1 ? 'Base drive' : result.count + ' of a kind · Drive engaged';
      else status.textContent = result ? 'Spin again when ready' : 'Ready to spin';
    }
    const time = phase === 'driving' ? Math.ceil(Math.max(0, slot.ends - now) * 10) / 10 : null;
    if (time !== lastTime) timer.textContent = time === null ? '' : time.toFixed(1) + ' s';
    lastTime = time;
    lastPhase = phase;
    lastParts = parts;
  };
}
