import { PART_NAMES } from './garage.js';
export { PART_NAMES };
export const reelStopTime = index => .74 + index * .13;

export function scoreParts(parts) {
  const counts = Array(PART_NAMES.length).fill(0);
  for (const part of parts) counts[part]++;
  const count = Math.max(...counts);
  const complete = count === 1;
  const winners = counts.flatMap((n, i) => complete || n >= 2 ? [i] : []);
  const gains = counts.map(n => complete ? 1 : n * Math.max(0,n-1));
  const pairs = counts.filter(n => n === 2).length;
  let name = ['','Полный комплект','Пара','Тройка','Каре','Пятёрка','Шесть в ряд'][count];
  if (count === 3 && pairs) name = 'Фулл-хаус';
  if (counts.filter(n => n === 3).length === 2) name = 'Две тройки';
  if (count === 2 && pairs > 1) name = pairs === 3 ? 'Три пары' : 'Две пары';
  for (const [a,b,label] of [[0,1,'Силовая пара'],[2,3,'Дорожный комплект'],[2,4,'Тормозной комплект']]) {
    if (counts[a] >= 2 && counts[b] >= 2) {
      gains[a]++; gains[b]++; name += ' · ' + label;
    }
  }
  const seconds = 2 + (count-1)*1.5 + (complete ? 0 : (winners.length-1)*.75);
  return {count, winners, seconds, gains, name};
}

export function createDriveSlot(random = Math.random) {
  const slot = {
    reset() {
      slot.phase = 'ready';
      slot.parts = PART_NAMES.map((_, i) => i);
      slot.previous = slot.parts;
      slot.result = null;
      slot.held = slot.locked = -1;
      slot.hasResult = false;
      slot.started = slot.ends = 0;
    },
    spin(now) {
      if (slot.phase !== 'ready') return false;
      slot.previous = slot.parts;
      slot.locked = slot.held;
      slot.held = -1;
      slot.parts = PART_NAMES.map((_,i) => i === slot.locked ? slot.previous[i] : Math.floor(random() * PART_NAMES.length));
      slot.result = scoreParts(slot.parts);
      slot.started = now;
      slot.ends = now + reelStopTime(slot.parts.length - 1) + slot.result.seconds;
      slot.phase = 'rolling';
      slot.manual = false;
      return true;
    },
    hold(i) {
      if (!slot.hasResult || slot.phase === 'rolling') return;
      slot.held = slot.held === i ? -1 : i;
    },
    update(now, manual) {
      if (slot.phase === 'ready') return;
      if (manual) slot.manual = true;
      if (slot.phase === 'rolling') {
        if (now < slot.started + reelStopTime(slot.parts.length - 1)) return;
        slot.phase = slot.manual || now >= slot.ends ? 'ready' : 'driving';
        slot.hasResult = true;
        return slot.result;
      }
      if (slot.manual || now >= slot.ends) slot.phase = 'ready';
    }
  };
  slot.reset();
  return slot;
}
