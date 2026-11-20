export const PART_NAMES = ['Двигатель', 'Коробка', 'Колёса', 'Подвеска', 'Тормоза', 'Кузов', 'Выхлоп', 'Нитро'];
export const SYMBOLS = [...PART_NAMES, 'Монеты', 'Алмазы'];
export const THRESHOLDS = [0, 2, 6, 12, 20, 32, 49, 72];
export const SPECIALS = [
  {name:'Компрессор', part:0, price:5, effect:'+18% момента на колёсах'},
  {name:'Двойной баллон', part:7, price:4, effect:'+60% времени нитро'},
  {name:'Карбоновый обвес', part:5, price:3, effect:'Карбоновые пороги и антикрыло с уровня кузова 4'}
];
export const CHECKPOINTS = [
  {meters:55, title:'Брусчатка', gains:[0,0,1,1,0,0,0,0],coins:15,gems:1},
  {meters:120, title:'Подъём', gains:[1,1,0,0,0,0,1,0],coins:25,gems:1},
  {meters:260, title:'Финиш', gains:Array(8).fill(2),coins:40,gems:3}
];
export const levelOf = points => THRESHOLDS.filter(value => points >= value).length;
const bounded = (n, max) => Number.isFinite(n) ? Math.min(max, Math.max(0, Math.floor(n))) : 0;

export function readGarage(raw) {
  let data;
  try { data = JSON.parse(raw); } catch {}
  return {
    points: PART_NAMES.map((_, i) => bounded(data?.points?.[i], THRESHOLDS.at(-1))),
    best: bounded(data?.best, 260),
    coins: bounded(data?.coins, Number.MAX_SAFE_INTEGER),
    gems: bounded(data?.gems, Number.MAX_SAFE_INTEGER),
    kits: SPECIALS.map((_,i)=>data?.kits?.[i] === true)
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
  const gains = reward ? [...reward.gains] : Array(PART_NAMES.length).fill(0);
  for(const c of crossed) c.gains.forEach((n,i)=>gains[i]+=n);
  garage.best = Math.max(garage.best,meters);
  garage.coins += (reward?.coins ?? 0) + crossed.reduce((n,c)=>n+c.coins,0);
  garage.gems += (reward?.gems ?? 0) + crossed.reduce((n,c)=>n+c.gems,0);
  return {changes:fitParts(garage,gains), crossed};
}

const coinForms=['монета','монеты','монет'];
export function coinText(amount) {
  const last=amount%10, teen=amount%100>=11 && amount%100<=14;
  return amount+' '+coinForms[teen?2:last===1?0:last>=2 && last<=4?1:2];
}

export const partPrice = level => 18 + 12*level;
export function purchase(garage, kind, index) {
  if (!Number.isInteger(index) || index<0) return null;
  const gains = Array(PART_NAMES.length).fill(0);
  if (kind==='part' && index<PART_NAMES.length) {
    const level=levelOf(garage.points[index]), target=THRESHOLDS[level], price=partPrice(level);
    if(target===undefined || garage.coins<price) return null;
    garage.coins-=price;
    gains[index]=target-garage.points[index];
  } else if(kind==='kit' && index<SPECIALS.length) {
    const item=SPECIALS[index];
    if(garage.kits[index] || garage.gems<item.price) return null;
    garage.gems-=item.price; garage.kits[index]=true;
  } else return null;
  return fitParts(garage,gains);
}

export function buildSpec([engine, transmission, wheels, suspension, brakes, , exhaust=1, nitro=1], kits=[]) {
  return {
    torque: (900 + 360 * (engine-1)) * (kits[0] ? 1.18 : 1),
    launch: 2.6 + .65 * (engine-1),
    wheelSpeed: 15 + 2.5 * (transmission-1),
    friction: 1.05 + .15 * (wheels-1),
    damperLimit: 2300 + 230 * (suspension-1),
    brakeTorque: 650 + 240 * (brakes-1),
    boostDuration: (1.6+.32*(nitro-1))*(kits[1] ? 1.6 : 1),
    boostFactor: 1.34+.035*(nitro-1),
    smokeFactor: 2.2/(1+.22*(engine-1)+.52*(exhaust-1))
  };
}
