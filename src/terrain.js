import { FINISH } from './vehicle-constants.js';
export const GROUND_START = -40;
export const GROUND_STEP = .4;
export const GROUND_COUNT = Math.ceil((FINISH+80-GROUND_START)/GROUND_STEP);

export function terrainHeight(x) {
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
  return shortWaves
    + (x > 55 && x < 90 ? .23 * Math.sin((x - 55) * 2.4) ** 2 : 0)
    + (x > 120 && x < 160 ? 2.8 * Math.sin((x - 120) / 40 * Math.PI) ** 2 : 0);
}

// The visible surface and tire deformation use the actual collision segments.
const heights=Array.from({length:GROUND_COUNT+1},(_,i)=>terrainHeight(GROUND_START+i*GROUND_STEP));
export function groundHeight(x) {
  const index = Math.max(0, Math.min(GROUND_COUNT - 1, Math.floor((x - GROUND_START) / GROUND_STEP)));
  const start = GROUND_START + index * GROUND_STEP;
  const t = Math.max(0, Math.min(1, (x - start) / GROUND_STEP));
  return heights[index] * (1 - t) + heights[index+1] * t;
}
