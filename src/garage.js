import { FINISH } from './vehicle-constants.js';
export const PART_NAMES = ['Двигатель', 'Коробка', 'Колёса', 'Подвеска', 'Тормоза', 'Кузов', 'Выхлоп', 'Нитро'];
export const SYMBOLS = [...PART_NAMES, 'Монеты', 'Алмазы'];
export const THRESHOLDS = [0, 2, 6, 12, 20, 32, 49, 72];
export const SPECIALS = [
  {name:'Компрессор', part:0, price:5, effect:'+18% момента на колёсах'},
  {name:'Двойной баллон', part:7, price:4, effect:'+60% времени нитро'},
  {name:'Карбоновый обвес', part:5, price:3, effect:'Карбоновые пороги и антикрыло с уровня кузова 4'}
];
// Distances are odometer readings, measured from the spawn at world x=3.
export const ROAD_STOPS = [
  [5,12,0],[12,18,0],[39,20,0],[76,24,1],[132,28,0],[198,32,1],
  [252,36,0],[340,40,1],[436,44,0],[535,48,1],[585,52,0],[665,56,1],[745,60,0],[795,64,2]
];
export function claimRoadStops(garage,meters){
  let coins=0,gems=0;
  while(garage.roadStops<ROAD_STOPS.length && meters>=ROAD_STOPS[garage.roadStops][0]){
    const stop=ROAD_STOPS[garage.roadStops++];
    coins+=stop[1];gems+=stop[2];
  }
  garage.coins+=coins;garage.gems+=gems;
  return {coins,gems};
}
export const levelOf = points => THRESHOLDS.filter(value => points >= value).length;
const bounded = (n, max) => Number.isFinite(n) ? Math.min(max, Math.max(0, Math.floor(n))) : 0;

export function readGarage(raw) {
  let data;
  try { data = JSON.parse(raw); } catch {}
  return {
    points: PART_NAMES.map((_, i) => bounded(data?.points?.[i], THRESHOLDS.at(-1))),
    best: bounded(data?.best, FINISH),
    roadStops: bounded(data?.roadStops,ROAD_STOPS.length),
    coins: bounded(data?.coins, Number.MAX_SAFE_INTEGER),
    gems: bounded(data?.gems, Number.MAX_SAFE_INTEGER),
    orders: PART_NAMES.map((_,i)=>data?.orders?.[i] === true),
    kitOrders: SPECIALS.map((_,i)=>data?.kitOrders?.[i] === true),
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
  garage.best=Math.max(garage.best,bounded(meters,FINISH));
  if(!reward) return {};
  const gains=reward.matches.map((lines,i)=>{
    if(!lines) return 0;
    const steps=lines+(garage.orders[i]?1:0);
    garage.orders[i]=false;
    const target=Math.min(THRESHOLDS.length,levelOf(garage.points[i])+steps);
    return THRESHOLDS[target-1]-garage.points[i];
  });
  const installed=[];
  SPECIALS.forEach((kit,i)=>{
    if(garage.kitOrders[i] && reward.matches[kit.part]){
      garage.kitOrders[i]=false;garage.kits[i]=true;installed.push(kit.name);
    }
  });
  garage.coins+=reward.coins;garage.gems+=reward.gems;
  return {changes:fitParts(garage,gains),installed};
}

const coinForms=['монета','монеты','монет'];
export function coinText(amount) {
  const last=amount%10, teen=amount%100>=11 && amount%100<=14;
  return amount+' '+coinForms[teen?2:last===1?0:last>=2 && last<=4?1:2];
}

export const partPrice = level => 18 + 12*level;
export function purchase(garage, kind, index) {
  if (!Number.isInteger(index) || index<0) return null;
  if (kind==='part' && index<PART_NAMES.length) {
    const level=levelOf(garage.points[index]), price=partPrice(level);
    if(level>=THRESHOLDS.length-1 || garage.orders[index] || garage.coins<price) return false;
    garage.coins-=price;garage.orders[index]=true;
  } else if(kind==='kit' && index<SPECIALS.length) {
    const item=SPECIALS[index];
    if(garage.kits[index] || garage.kitOrders[index] || garage.gems<item.price) return false;
    garage.gems-=item.price;garage.kitOrders[index]=true;
  } else return false;
  return true;
}

export function buildSpec([engine, transmission, wheels, suspension, brakes, body=1, exhaust=1, nitro=1], kits=[]) {
  const tireRadius = [.305, .315, .325, .34, .355, .375, .40, .425][wheels-1];
  const rimRadius = [13, 13, 14, 15, 16, 17, 18, 19][wheels-1] * .0254 / 2;
  const axleTorque = [95, 205, 365, 590, 850, 1250, 1870, 2850][engine-1];
  const kitFactor = kits[0] ? 1.18 : 1;
  const torque = axleTorque * kitFactor;
  const referenceRadius = .305; // Stock final drive is the catalog reference.
  const topSpeed = [2.15,4.22,6.29,8.36,10.43,15.5,22,33][transmission-1];
  return {
    tireRadius, rimRadius, torque, topSpeed,
    powerKW: [.7, 2.8, 7.5, 14, 24, 37, 55, 82][engine-1] * kitFactor,
    driveForce: torque / referenceRadius,
    fittedTorque: torque * tireRadius / referenceRadius,
    aero: Math.max(0,body-4)/4,
    launch: (3.0 + .72 * (engine-1)) * referenceRadius / tireRadius,
    wheelSpeed: topSpeed / tireRadius,
    friction: 1.28 + .11 * (wheels-1),
    damperLimit: 2300 + 230 * (suspension-1),
    brakeTorque: 650 + 240 * (brakes-1),
    boostDuration: (1.6+.32*(nitro-1))*(kits[1] ? 1.6 : 1),
    boostFactor: 1.34+.035*(nitro-1),
    smokeFactor: 2.2/(1+.22*(engine-1)+.52*(exhaust-1))
  };
}
