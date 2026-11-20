export const PART_NAMES = ['Двигатель', 'Коробка', 'Колёса', 'Подвеска', 'Тормоза', 'Кузов'];
export const THRESHOLDS = [0, 2, 6, 12, 20];
export const CHECKPOINTS = [
  {meters:55, title:'Брусчатка', gains:[0,0,1,1,0,0]},
  {meters:120, title:'Подъём', gains:[1,1,0,0,0,0]},
  {meters:260, title:'Финиш', gains:[2,2,2,2,2,2]}
];
export const levelOf = points => THRESHOLDS.filter(value => points >= value).length;
const bounded = (n, max) => Number.isFinite(n) ? Math.min(max, Math.max(0, Math.floor(n))) : 0;

export function readGarage(raw) {
  let data;
  try { data = JSON.parse(raw); } catch {}
  return {
    points: PART_NAMES.map((_, i) => bounded(data?.points?.[i], THRESHOLDS.at(-1))),
    best: bounded(data?.best, 260)
  };
}

export function fitParts(garage, gains) {
  return garage.points.map((before, i) => {
    const after = Math.min(THRESHOLDS.at(-1), before + gains[i]);
    garage.points[i] = after;
    return {gain:after-before, from:levelOf(before), to:levelOf(after)};
  });
}

export function advanceGarage(garage, meters, reward) {
  const crossed = CHECKPOINTS.filter(c=>garage.best<c.meters && meters>=c.meters);
  const gains = reward ? [...reward.gains] : Array(6).fill(0);
  for(const c of crossed) c.gains.forEach((n,i)=>gains[i]+=n);
  garage.best = Math.max(garage.best,meters);
  return {changes:fitParts(garage,gains), crossed};
}

export function buildSpec([engine, transmission, wheels, suspension, brakes]) {
  return {
    torque: 900 + 360 * (engine-1),
    launch: 2.6 + .65 * (engine-1),
    wheelSpeed: 15 + 2.5 * (transmission-1),
    friction: 1.05 + .15 * (wheels-1),
    damperLimit: 2300 + 230 * (suspension-1),
    brakeTorque: 650 + 240 * (brakes-1)
  };
}
