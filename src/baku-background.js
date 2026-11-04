// Original AI-generated architectural composite, not a geographic photograph.
// Source research, prompt and limits are in docs/BAKU-BACKGROUND.md.
const rect=(c,x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(x,y,w,h);};
function line(c,points,color,width=1){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=color;c.lineWidth=width;c.stroke();}
function ellipse(c,x,y,rx,ry,color){c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fillStyle=color;c.fill();}
export function createBakuBackdrop(invalidate=()=>{}){
 const panorama=new Image();panorama.src='/assets/baku-panorama.png';panorama.decoding='async';
 panorama.onload=invalidate;
 const wash=document.createElement('canvas');let cachedWidth=0,cachedHeight=0;
 return function drawBaku(c,{width,height,camera,scale}){
  const unit=Math.max(.65,Math.min(1.3,height/440));
  const lift=Math.max(-12,Math.min(12,(camera.y-1.1)*scale*.025));
  const horizon=.66+Math.max(0,Math.min(.06,(width/height-2)*.06));
  const base=height*horizon-lift;
  if(cachedWidth!==width||cachedHeight!==height){
   cachedWidth=width;cachedHeight=height;wash.width=Math.ceil(width);wash.height=Math.ceil(height);
   const w=wash.getContext('2d');
   const sky=w.createLinearGradient(0,0,0,height);sky.addColorStop(0,'#97bfe3');sky.addColorStop(.65,'#c2d5e2');sky.addColorStop(1,'#6698ad');rect(w,0,0,width,height,sky);
   const sea=w.createLinearGradient(0,height*.64,0,height);sea.addColorStop(0,'#4b829d');sea.addColorStop(1,'#83aeb5');rect(w,0,height*.64,width,height*.36,sea);
  }
  c.drawImage(wash,0,0,width,height);
  if(panorama.complete&&panorama.naturalWidth){
   const h=Math.min(Math.max(width*1.08,height*1.5)*panorama.naturalHeight/panorama.naturalWidth,height*.90);
   const w=h*panorama.naturalWidth/panorama.naturalHeight,top=base-h*.826;
   const initial=Math.max(0,(w-width)*.25),offset=initial+(camera.x-3)*scale*.006,first=Math.floor(offset/w);
   // Mirroring keeps shared tile edges continuous. Only one edge enters on this track.
   for(let i=first;i*w-offset<width;i++){
    const x=i*w-offset;c.save();c.translate(x+(Math.abs(i)%2?w:0),0);if(Math.abs(i)%2)c.scale(-1,1);
    if(top>0){
     // Extend only the clear top 64 pixels of sky. At the join both strips
     // sample the same source row, so the photograph has no rectangular edge.
     const skyH=64/panorama.naturalHeight*h;
     c.drawImage(panorama,0,0,panorama.naturalWidth,64,0,0,w,top+skyH);
     c.drawImage(panorama,0,64,panorama.naturalWidth,panorama.naturalHeight-64,0,top+skyH,w,h-skyH);
    }else c.drawImage(panorama,0,top,w,h);
    c.restore();
   }
  }
  const walk=base+48*unit;
  rect(c,0,walk,width,9*unit,'#b4a58b');line(c,[[0,walk],[width,walk]],'#e2d8c3',2*unit);
  const step=108*unit,period=step*2,offset=((camera.x-3)*scale*.16%period+period)%period;
  for(let x=-offset;x<width+step;x+=step){
   for(let j=0;j<9;j++){const xx=x+j*12*unit;rect(c,xx,walk-10*unit,2*unit,10*unit,'#9b9b8e');ellipse(c,xx+unit,walk-5*unit,1.8*unit,3*unit,'#b7b3a1');}
   line(c,[[x,walk-11*unit],[x+step,walk-11*unit]],'#d8d3c1',2*unit);
   if(Math.round((x+offset)/step)%2===0){
    line(c,[[x,walk],[x,walk-48*unit]],'#3c5359',2*unit);
    line(c,[[x-8*unit,walk-40*unit],[x,walk-47*unit],[x+8*unit,walk-40*unit]],'#3c5359',1.5*unit);
    for(const sign of [-1,1]){ellipse(c,x+sign*8*unit,walk-40*unit,3*unit,4*unit,'#ecdfbc');line(c,[[x+sign*11*unit,walk-44*unit],[x+sign*5*unit,walk-44*unit]],'#3c5359',unit);}
   }
  }
 };
}
