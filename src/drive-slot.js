import { PART_NAMES, SYMBOLS } from './garage.js';

export const reelStopTime = column => .85 + column * .24;
export const LINES = [
  [0,1,2],[3,4,5],[6,7,8],[0,4,8],[6,4,2]
];
// Each reel shows three consecutive stops. A spin uses four symbols from the catalogue.
const STRIPS=[
  [0,1,2,0,3,1,2,3,0,2,1,3],
  [1,3,2,0,1,2,3,0,2,1,0,3],
  [3,0,2,1,0,1,3,2,0,3,1,2]
];
export function scoreParts(parts) {
  const lines=LINES.filter(line=>line.every(i=>parts[i]===parts[line[0]]));
  const matches=PART_NAMES.map(()=>0);
  let coins=0,gems=0;
  for(const line of lines){
    const id=parts[line[0]];
    if(id===8) coins+=30;
    else if(id===9) gems+=3;
    else matches[id]++;
  }
  const names=['Верхний ряд','Средний ряд','Нижний ряд','Диагональ ↘','Диагональ ↗'];
  const name=lines.length ? lines.map(line=>names[LINES.indexOf(line)]).join(' + ') : 'Без линии';
  return {matches,lines,coins,gems,name,seconds:3.5+Math.min(3,lines.length)*1.5};
}
export function createDriveSlot(random = Math.random) {
  const slot={
    reset(){
      slot.phase='ready';slot.parts=[0,1,2,3,4,5,6,7,8];slot.previous=slot.parts;
      slot.result=null;slot.hasResult=false;slot.held=slot.locked=-1;slot.started=slot.ends=slot.autoUntil=0;
    },
    spin(now){
      if(slot.phase==='rolling')return false;
      slot.previous=slot.parts;slot.locked=slot.held;slot.held=-1;
      const pool=SYMBOLS.map((_,i)=>i), palette=[];
      if(slot.locked>=0) palette.push(pool.splice(pool.indexOf(slot.previous[3+slot.locked]),1)[0]);
      while(palette.length<4) palette.push(pool.splice(Math.floor(random()*pool.length),1)[0]);
      slot.parts=[...slot.previous];
      STRIPS.forEach((strip,col)=>{
        if(col===slot.locked)return;
        const stop=Math.floor(random()*strip.length);
        for(let row=0;row<3;row++)slot.parts[row*3+col]=palette[strip[(stop+row)%strip.length]];
      });
      slot.result=scoreParts(slot.parts);slot.started=now;
      slot.ends=now+reelStopTime(2)+slot.result.seconds;
      slot.phase='rolling';slot.manual=false;return true;
    },
    hold(column){
      if(!slot.hasResult || slot.phase==='rolling' || ![0,1,2].includes(column))return;
      slot.held=slot.held===column ? -1 : column;
    },
    update(now,manual){
      if(slot.phase==='ready')return;
      if(manual){slot.manual=true;slot.autoUntil=0;}
      if(slot.phase==='rolling'){
        if(now<slot.started+reelStopTime(2))return;
        slot.autoUntil=slot.manual ? 0 : slot.ends;
        slot.phase=now>=slot.autoUntil ? 'ready' : 'driving';
        slot.hasResult=true;return slot.result;
      }
      if(slot.manual || now>=slot.ends)slot.phase='ready';
    }
  };
  slot.reset();return slot;
}
