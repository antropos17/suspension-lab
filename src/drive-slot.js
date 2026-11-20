export const PART_NAMES = ['Fuel can', 'Spark plug', 'Steering wheel', 'Coilover', 'Piston', 'Tire'];
export const reelStopTime = index => .74 + index * .13;

export function scoreParts(parts) {
  const counts = Array(PART_NAMES.length).fill(0);
  for (const part of parts) counts[part]++;
  const count = Math.max(...counts);
  const winners = counts.flatMap((n, i) => count > 1 && n === count ? [i] : []);
  return {count, winners, seconds:2 + (count - 1) * 1.5};
}

export function createDriveSlot(random = Math.random) {
  const slot = {
    reset() {
      slot.phase = 'ready';
      slot.parts = PART_NAMES.map((_, i) => i);
      slot.previous = slot.parts;
      slot.result = null;
      slot.started = slot.ends = 0;
    },
    spin(now) {
      if (slot.phase !== 'ready') return false;
      slot.previous = slot.parts;
      slot.parts = PART_NAMES.map(() => Math.floor(random() * PART_NAMES.length));
      slot.result = scoreParts(slot.parts);
      slot.started = now;
      slot.ends = now + reelStopTime(slot.parts.length - 1) + slot.result.seconds;
      slot.phase = 'rolling';
      return true;
    },
    update(now, manual) {
      if (slot.phase === 'ready') return;
      if (manual || now >= slot.ends) slot.phase = 'ready';
      else if (now >= slot.started + reelStopTime(slot.parts.length - 1)) slot.phase = 'driving';
    }
  };
  slot.reset();
  return slot;
}
