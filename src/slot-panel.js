import { reelStopTime } from './drive-slot.js';
import { SYMBOLS, coinText } from './garage.js';
import { paintIcon } from './part-art.js';

export function createSlotPanel(slot, bank, button, status, timer, getLevels) {
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const columns=Array.from({length:3},(_,column)=>{
    const reel=document.createElement('button'), strip=document.createElement('div');
    reel.type='button';reel.className='slot-reel';strip.className='slot-strip';
    reel.addEventListener('click',()=>slot.hold(column));
    const tiles=Array.from({length:4},()=>{
      const tile=document.createElement('div');
      tile.className='slot-tile';tile.append(document.createElement('i'));strip.append(tile);
      return tile;
    });
    reel.append(strip);bank.append(reel);
    return {reel,strip,tiles,moving:false};
  });
  const overlay=document.createElement('canvas');
  overlay.className='winning-lines';overlay.width=overlay.height=300;
  overlay.setAttribute('aria-hidden','true');bank.append(overlay);
  const marks=overlay.getContext('2d');
  let lastPhase,lastParts,lastHeld,lastLocked,lastLevels,lastTime,lastReceipt;
  return (now,locked)=>{
    const {phase,parts,previous,result}=slot, rolling=phase==='rolling', levels=getLevels();
    const changed=phase!==lastPhase || parts!==lastParts || lastHeld!==slot.held || locked!==lastLocked || levels!==lastLevels;
    if(changed){
      marks.clearRect(0,0,300,300);
      if(!rolling && result){
        marks.strokeStyle='#853e4b';marks.lineWidth=3;marks.lineCap='round';
        for(const line of result.lines){
          marks.beginPath();
          for(const [j,i] of line.entries()){
            const x=i%3*100+50,y=Math.floor(i/3)*100+50;
            if(j===0)marks.moveTo(x,y);else marks.lineTo(x,y);
          }
          marks.stroke();
        }
        if(lastPhase==='rolling' && result.lines.length && !reduced.matches)
          overlay.animate([{clipPath:'inset(0 100% 0 0)'},{clipPath:'inset(0)'}],{duration:240,easing:'ease-out'});
      }
    }
    if(changed || rolling){
      button.disabled=locked || rolling;
      columns.forEach((column,col)=>{
        const {reel,strip,tiles}=column;
        const t=rolling && col!==slot.locked ? Math.min(1,Math.max(0,(now-slot.started)/reelStopTime(col))) : 1;
        if(column.moving && t===1 && result && !reduced.matches){
          strip.animate([{translate:'0 -3px'},{translate:'0 1px',offset:.55},{translate:'0 0'}],{duration:145,easing:'ease-out'});
        }
        column.moving=t<1;
        const travel=reduced.matches ? (t===1?12:0) : 12*(1-(1-t)**2);
        const step=Math.floor(travel);
        strip.style.transform='translateY('+((step-travel)*100/3)+'%)';
        tiles.forEach((tile,row)=>{
          const pos=step+row, index=(row%3)*3+col;
          const id=pos<3 ? previous[pos*3+col] : pos>=12 ? parts[(pos-12)%3*3+col] : (pos*3+col*7)%SYMBOLS.length;
          paintIcon(tile.firstChild,id,levels[id] ?? 1);
          if(changed){
            tile.dataset.result=row<3&&!rolling ? parts[index] : '';
            tile.classList.toggle('payline',row<3 && !rolling && !!result?.lines.some(line=>line.includes(index)));
          }
        });
        if(changed){
          reel.disabled=locked || rolling || !slot.hasResult;
          reel.setAttribute('aria-pressed',(rolling?slot.locked:slot.held)===col);
          reel.setAttribute('aria-label','Барабан '+(col+1)+' · '+(rolling?'вращается':[0,1,2].map(r=>SYMBOLS[parts[r*3+col]]).join(', ')));
        }
      });
    }
    if(changed || lastReceipt!==result?.receipt) status.textContent=rolling ? 'Барабаны вращаются…' :
      result ? result.name+(result.coins?' · +'+coinText(result.coins):'')+(result.gems?' · +'+result.gems+' алм.':'')+(result.receipt?' · '+result.receipt:'') : 'Три одинаковых на линии — установка детали.';
    const time=now<slot.autoUntil ? Math.ceil(Math.max(0,slot.autoUntil-now)*10)/10 : null;
    if(time!==lastTime) timer.textContent=time===null ? '' : 'Газ · '+time.toFixed(1)+' с';
    lastTime=time;lastPhase=phase;lastParts=parts;lastHeld=slot.held;lastLocked=locked;lastLevels=levels;lastReceipt=result?.receipt;
  };
}
