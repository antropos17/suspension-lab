import { FINISH } from './vehicle-constants.js';
export const GROUND_START = -40;
export const GROUND_STEP = .4;
export const GROUND_COUNT = Math.ceil((FINISH+80-GROUND_START)/GROUND_STEP);
export const YARD_WALL = -7.6;
export const SETTS = [55,90];
export const FUEL_STATIONS = [14,187,495.6,712.8];
export const stationAt = x => FUEL_STATIONS.find(pump=>Math.abs(x-pump)<=2.4);

function landscape(x) {
  if (x < 12) return 0;
  const t = x - 12, fade = Math.min(t / 12, 1);
  // Ease short ripples out at the hill entrance so braking leaves a usable contact patch.
  const climbBlend=x>104 && x<172 ? Math.sin(Math.PI*(x-104)/68)**2 : 0;
  const shortWaves=fade*(1.3*Math.sin(t*.12)+(.55-.36*climbBlend)*Math.sin(t*.32));
  if(x>162){
    const blend=Math.min(1,(x-162)/45);
    const rolling=1.5*Math.sin(t*.044)+.55*Math.sin(t*.127);
    const hill=(start,length,height)=>x>start && x<start+length ? height*Math.sin(Math.PI*(x-start)/length)**2 : 0;
    return (1-blend)*shortWaves+blend*rolling+
      hill(330,100,4.8)+hill(495,65,-2.5)+hill(660,90,3.9);
  }
  // Setts sit on a graded bed. Blend its approaches to avoid a ramp at either joint.
  const edge=Math.min(x-SETTS[0],SETTS[1]-x);
  const blend=Math.max(0,Math.min(1,(x-29)/7,(97-x)/7));
  const grade=blend*blend*(3-2*blend);
  const bed=.83*Math.cos((x-30)*.085);
  const stones=edge>0 ? .029*Math.min(1,edge)*Math.sin((x-55)*2.4)**2 : 0;
  return shortWaves+(bed-shortWaves)*grade+stones
    + (x > 120 && x < 160 ? 2.8 * Math.sin((x - 120) / 40 * Math.PI) ** 2 : 0);
}

// All features use world metres and the same longitudinal profile as the tire colliders.
export const BRIDGES=[[36,44.8],[238.4,264],[574.4,596.8]];
export const HUMPS=[[19.2,21.2,.075],[96,98.8,.12],[180,182,.09],[314.4,317.2,.14],[708,710.8,.12]];
export const POOLS = [
  [6.4,10.8,'water',.032],[24,30.4,'mud',.085],[44.8,50,'water',.07],
  [100.8,109.2,'mud',.10],[158.4,165.2,'water',.08],[195.6,205.6,'mud',.12],
  [282.4,294,'water',.10],[331.2,344.8,'mud',.13],[429.6,443.2,'water',.09],
  [531.2,541.2,'mud',.12],[645.6,657.6,'water',.07],[739.2,748.4,'mud',.12]
].map(([start,end,kind,depth])=>({start,end,kind,depth,level:Math.min(landscape(start),landscape(end))}));
export const poolAt=x=>POOLS.find(p=>x>p.start && x<p.end);
export function terrainHeight(x){
  for(const [a,b] of BRIDGES){
    if(x>=a && x<=b)return landscape(a)+(landscape(b)-landscape(a))*(x-a)/(b-a);
  }
  let height=landscape(x);
  for(const [a,b,h] of HUMPS)if(x>a && x<b)height+=h*Math.sin(Math.PI*(x-a)/(b-a))**2;
  const pool=poolAt(x);
  if(pool){
    const t=(x-pool.start)/(pool.end-pool.start), blend=Math.sin(Math.PI*t)**2;
    height=height*(1-blend)+(pool.level-pool.depth)*blend;
  }
  return height;
}
// The visible surface and tire deformation use the actual collision segments.
const heights=Array.from({length:GROUND_COUNT+1},(_,i)=>terrainHeight(GROUND_START+i*GROUND_STEP));
export function groundHeight(x) {
  const index = Math.max(0, Math.min(GROUND_COUNT - 1, Math.floor((x - GROUND_START) / GROUND_STEP)));
  const start = GROUND_START + index * GROUND_STEP;
  const t = Math.max(0, Math.min(1, (x - start) / GROUND_STEP));
  return heights[index] * (1 - t) + heights[index+1] * t;
}

export function materialAt(x){
  const pool=poolAt(x);
  return pool && groundHeight(x)<pool.level-.002 ? pool.kind : 'asphalt';
}
