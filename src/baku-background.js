import { FINISH } from './vehicle-constants.js';
// Original AI-generated architectural composite, not a geographic photograph.
// Source research, prompt and limits are in docs/BAKU-BACKGROUND.md.
const rect=(c,x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(x,y,w,h);};
function line(c,points,color,width=1){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=color;c.lineWidth=width;c.stroke();}
function ellipse(c,x,y,rx,ry,color){c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fillStyle=color;c.fill();}
// One period of the promenade. Camera movement only translates the cached artwork.
function makeRail(){
 const tile=document.createElement('canvas');tile.width=432;tile.height=120;
 const c=tile.getContext('2d');c.scale(2,2);
 rect(c,0,50,216,9,'#b4a58b');line(c,[[0,50],[216,50]],'#e2d8c3',2);
 for(let x=0;x<216;x+=12){
  rect(c,x,40,2,10,'#9b9b8e');ellipse(c,x+1,45,1.8,3,'#b7b3a1');
 }
 line(c,[[0,39],[216,39]],'#d8d3c1',2);
 line(c,[[108,50],[108,2]],'#3c5359',2);
 line(c,[[100,10],[108,3],[116,10]],'#3c5359',1.5);
 for(const x of [100,116]){ellipse(c,x,10,3,4,'#ecdfbc');line(c,[[x-3,6],[x+3,6]],'#3c5359',1);}
 return tile;
}
export function createBakuBackdrop(invalidate=()=>{}){
 const panorama=new Image();panorama.src='assets/baku-panorama.png';panorama.decoding='async';
 panorama.onload=invalidate;
 const wash=document.createElement('canvas'),rail=makeRail();let cachedWidth=0,cachedHeight=0,twilight;
 return function drawBaku(c,{width,height,camera,scale}){
  const unit=Math.max(.65,Math.min(1.3,height/440));
  const lift=Math.max(-12,Math.min(12,(camera.y-1.1)*scale*.025));
  const horizon=.66+Math.max(0,Math.min(.06,(width/height-2)*.06));
  const panoramaWidth=Math.max(width*1.08,height*1.56);
  const panoramaHeight=panorama.naturalWidth?panoramaWidth*panorama.naturalHeight/panorama.naturalWidth:height;
  const base=Math.max(height*horizon,panoramaHeight*.77)-lift;
  if(cachedWidth!==width||cachedHeight!==height){
   cachedWidth=width;cachedHeight=height;wash.width=Math.ceil(width);wash.height=Math.ceil(height);
   twilight=c.createLinearGradient(0,0,0,height);
   twilight.addColorStop(0,'rgba(11,21,45,.65)');
   twilight.addColorStop(.60,'rgba(44,34,52,.46)');
   twilight.addColorStop(1,'rgba(23,32,42,.58)');
   const w=wash.getContext('2d');
   const sky=w.createLinearGradient(0,0,0,height);sky.addColorStop(0,'#97bfe3');sky.addColorStop(.65,'#c2d5e2');sky.addColorStop(1,'#6698ad');rect(w,0,0,width,height,sky);
   const sea=w.createLinearGradient(0,height*.64,0,height);sea.addColorStop(0,'#4b829d');sea.addColorStop(1,'#83aeb5');rect(w,0,height*.64,width,height*.36,sea);
  }
  c.drawImage(wash,0,0,width,height);
  if(panorama.complete&&panorama.naturalWidth){
   const w=panoramaWidth,h=panoramaHeight;
   const top=base-h*.826,span=w-width;
   const offset=span*(.18+.76*Math.min(1,Math.max(0,(camera.x-3)/FINISH)));
   if(top>0){
    const skyH=64/panorama.naturalHeight*h;
    c.drawImage(panorama,0,0,panorama.naturalWidth,64,-offset,0,w,top+skyH);
    c.drawImage(panorama,0,64,panorama.naturalWidth,panorama.naturalHeight-64,-offset,top+skyH,w,h-skyH);
   }else c.drawImage(panorama,-offset,top,w,h);
  }
  const walk=base+48*unit,period=216*unit;
  const offset=((camera.x-3)*scale*.16%period+period)%period;
  for(let x=-period/2-offset;x<width;x+=period)c.drawImage(rail,x,walk-50*unit,period,60*unit);
  rect(c,0,0,width,height,twilight);
 };
}
