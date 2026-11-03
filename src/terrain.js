export const GROUND_START = -40;
export const GROUND_STEP = .4;
export const GROUND_COUNT = 950;

export function terrainHeight(x) {
  if (x < 12) return 0;
  const t = x - 12, fade = Math.min(t / 12, 1);
  return fade * (1.3 * Math.sin(t * .12) + .55 * Math.sin(t * .32))
    + (x > 55 && x < 90 ? .23 * Math.sin((x - 55) * 2.4) ** 2 : 0)
    + (x > 120 && x < 150 ? 3 * Math.sin((x - 120) / 30 * Math.PI) ** 2 : 0);
}

// The visible surface and tire deformation use the actual collision segments.
export function groundHeight(x) {
  const index = Math.max(0, Math.min(GROUND_COUNT - 1, Math.floor((x - GROUND_START) / GROUND_STEP)));
  const start = GROUND_START + index * GROUND_STEP;
  const t = Math.max(0, Math.min(1, (x - start) / GROUND_STEP));
  return terrainHeight(start) * (1 - t) + terrainHeight(start + GROUND_STEP) * t;
}
