import { PART_NAMES, SYMBOLS } from './garage.js';

export const reelStopTime = column => .85 + column * .24;
export const LINES = [
  [0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]
];
const COIN=8, GEM=9;
export function scoreParts(parts) {
  const counts=Array(SYMBOLS.length).fill(0);
  for(const id of parts) counts[id]++;
  const lines=LINES.filter(line=>line.every(index=>parts[index]===parts[line[0]]));
  const gains=PART_NAMES.map((_,i)=>counts[i]*Math.max(0,counts[i]-1));
  const count=Math.max(...counts);
  const winners=counts.flatMap((n,i)=>n>=2 ? [i] : []);
  let coins=4+counts[COIN]*10, gems=counts[GEM];
  for(const line of lines){
    const id=parts[line[0]];
    if(id===COIN) coins+=30;
    else if(id===GEM) gems+=3;
    else gains[id]+=4;
  }
  if(count===1) gains.forEach((_,i)=>{if(counts[i])gains[i]++;});
  const groups=counts.filter(n=>n>=2);
  let name=['','Сборный комплект','Пара','Тройка','Каре','Пятёрка'][count] ?? (count+' одинаковых');
  if(count===2 && groups.length>1) name=groups.length+' пары';
  if(count===3 && groups.includes(2)) name='Фулл-хаус';
  const triples=groups.filter(n=>n===3).length;
  if(triples>1) name=triples===3 ? 'Три тройки' : 'Две тройки';
  for(const [a,b,label] of [[0,1,'Силовая пара'],[2,3,'Ходовая'],[2,4,'Тормозной комплект'],[6,7,'Форсаж']]){
    if(counts[a]>=2 && counts[b]>=2){gains[a]++;gains[b]++;name+=' · '+label;}
  }
  if(lines.length) name+=' · Линий: '+lines.length;
  const seconds=Math.min(9.5,2+(count-1)*1.3+Math.max(0,groups.length-1)*.5+lines.length*.75);
  return {count,winners,gains,name,seconds,coins,gems,lines};
}

export function createDriveSlot(random = Math.random) {
  const slot={
    reset(){
      slot.phase='ready';slot.parts=[0,1,2,3,4,5,6,7,8];slot.previous=slot.parts;
      slot.result=null;slot.hasResult=false;slot.held=slot.locked=-1;slot.started=slot.ends=0;
    },
    spin(now){
      if(slot.phase!=='ready')return false;
      slot.previous=slot.parts;slot.locked=slot.held;slot.held=-1;
      slot.parts=slot.previous.map((old,i)=>{
        if(i%3===slot.locked)return old;
        const roll=Math.floor(random()*100);
        return roll<80 ? Math.floor(roll/10) : roll<96 ? COIN : GEM;
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
      if(manual)slot.manual=true;
      if(slot.phase==='rolling'){
        if(now<slot.started+reelStopTime(2))return;
        slot.phase=slot.manual || now>=slot.ends ? 'ready' : 'driving';
        slot.hasResult=true;return slot.result;
      }
      if(slot.manual || now>=slot.ends)slot.phase='ready';
    }
  };
  slot.reset();return slot;
}
