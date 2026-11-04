// Original Canvas artwork: an intentionally compressed Baku Bay panorama.
// Landmarks are a scenic composite, not a survey-accurate street or viewpoint.
const TILE=2400, BASE=300;
function path(c,points,fill,stroke,width=1){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}}
function line(c,points,color,width=1){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=color;c.lineWidth=width;c.stroke();}
function rect(c,x,y,w,h,color){c.fillStyle=color;c.fillRect(x,y,w,h);}
function ellipse(c,x,y,rx,ry,color){c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fillStyle=color;c.fill();}
function dome(c,x,y,r,color){c.beginPath();c.arc(x,y,r,Math.PI,0);c.lineTo(x+r,y+4);c.lineTo(x-r,y+4);c.fillStyle=color;c.fill();}
function facade(c,x,y,w,h,seed){
 const stone=['#d6c4a6','#dfd1b8','#d3c4ad','#c7b99f'][seed%4];
 rect(c,x,y-h,w,h,stone);rect(c,x+w-4,y-h,4,h,'#b1a58f');
 rect(c,x-2,y-h-3,w+4,4,'#eee1c7');rect(c,x-1,y-h+5,w+2,2,'#b9ab94');
 for(let yy=y-h+13;yy<y-8;yy+=15){
  line(c,[[x+2,yy+10],[x+w-3,yy+10]],'#eee1ca',1);
  for(let xx=x+6;xx<x+w-5;xx+=12){
   rect(c,xx-1,yy-1,6,9,'#ede1c9');rect(c,xx,yy,4,7,'#6e817f');
   rect(c,xx,yy,1,7,'#536966');
   if((seed+Math.floor(xx))%3===0){rect(c,xx-2,yy+7,8,2,'#aaa28d');line(c,[[xx-2,yy+5],[xx+6,yy+5]],'#7d8176',.7);}
  }
 }
 for(let xx=x+6;xx<x+w-5;xx+=13){c.beginPath();c.arc(xx+2,y-9,3,Math.PI,0);c.lineTo(xx+5,y);c.lineTo(xx-1,y);c.fillStyle='#637973';c.fill();}
 if(seed%3===0){path(c,[[x+2,y-h-4],[x+w/2,y-h-12],[x+w-2,y-h-4]],'#b5a78e');rect(c,x+w/2-3,y-h-8,6,4,'#e1d3b9');}
}
function flame(c,x,base,w,h,lean){
 c.save();c.translate(x,base);
 const outline=new Path2D();outline.moveTo(-w*.48,0);
 outline.bezierCurveTo(-w*.65,-h*.28,-w*.28,-h*.72,lean,-h);
 outline.bezierCurveTo(w*.32+lean,-h*.85,w*.69,-h*.3,w*.45,0);outline.closePath();
 const g=c.createLinearGradient(-w*.6,0,w*.7,0);g.addColorStop(0,'#6e919a');g.addColorStop(.32,'#c3d0c9');g.addColorStop(.58,'#87aab0');g.addColorStop(1,'#547986');
 c.fillStyle=g;c.fill(outline);c.save();c.clip(outline);
 for(let i=-5;i<=5;i++){
  c.beginPath();c.moveTo(i*w*.12,0);c.bezierCurveTo(i*w*.17,-h*.35,i*w*.06+lean*.3,-h*.7,lean,-h);
  c.strokeStyle=i%2?'#dbe6dd80':'#4f758350';c.lineWidth=1;c.stroke();
 }
 for(let y=-h+7;y<0;y+=6){line(c,[[-w,y],[w,y]],'#e3e9dc65',.7);}
 path(c,[[-w*.3,-h*.9],[w*.15,-h*.85],[w*.4,-h*.33],[w*.23,0],[-w*.1,0]],'#fff1ce1c');
 c.restore();c.strokeStyle='#75939a';c.lineWidth=1;c.stroke(outline);
 c.restore();
}
function maiden(c,x,y){
 // Broad stone cylinder, banded upper masonry and projecting eastern buttress.
 const g=c.createLinearGradient(x-23,0,x+23,0);g.addColorStop(0,'#9d8b70');g.addColorStop(.45,'#ccb591');g.addColorStop(.78,'#b5a080');g.addColorStop(1,'#8c806b');
 path(c,[[x+9,y-72],[x+40,y-64],[x+40,y],[x+9,y]],'#a69375');
 c.fillStyle=g;c.fillRect(x-23,y-84,46,84);ellipse(c,x,y-84,23,5,'#d2bd9a');
 for(let yy=y-77;yy<y-25;yy+=4)line(c,[[x-23,yy],[x+23,yy]],'#786e5a90',1.3);
 for(let yy=y-21;yy<y;yy+=7)line(c,[[x-22,yy],[x+23,yy]],'#e0c8a16b',.7);
 for(let i=0;i<4;i++)rect(c,x+7,y-69+i*15,3,7,'#5c655a');
 rect(c,x-4,y-13,6,13,'#5a6050');line(c,[[x-23,y-85],[x+23,y-85]],'#e8d3ad',2);
}
function oldCity(c){
 for(let i=0;i<12;i++){const x=90+i*27,h=20+(i*13)%23;rect(c,x,BASE-h,30,h,'#c5b18d');dome(c,x+14,BASE-h,9,'#bdad8c');}
 // Palace cluster and minaret above limestone walls.
 rect(c,170,237,88,47,'#ccb997');dome(c,207,238,15,'#d2c3a6');
 rect(c,253,216,9,65,'#b9a985');rect(c,250,227,15,4,'#e3d2ae');path(c,[[252,216],[257.5,200],[263,216]],'#9c967e');
 rect(c,88,278,256,22,'#bbaa87');line(c,[[88,277],[344,277]],'#e0cbaa',3);
 for(let i=0;i<31;i++)rect(c,88+i*8.4,271,5,8,'#c5b18c');
 for(const x of [105,321]){rect(c,x-7,266,15,34,'#b6a17f');ellipse(c,x,266,7.5,3,'#d6c09a');}
 maiden(c,180,300);
}
function carpet(c,x,y){
 const g=c.createLinearGradient(0,y-36,0,y);g.addColorStop(0,'#d4ba76');g.addColorStop(.5,'#b49358');g.addColorStop(1,'#e6d29d');
 c.beginPath();c.moveTo(x-80,y);c.lineTo(x-80,y-24);c.bezierCurveTo(x-32,y-57,x+20,y-10,x+69,y-39);c.lineTo(x+72,y);c.closePath();c.fillStyle=g;c.fill();
 c.save();c.clip();for(let xx=x-75;xx<x+70;xx+=8)for(let yy=y-35;yy<y;yy+=9){path(c,[[xx,yy-3],[xx+3,yy],[xx,yy+3],[xx-3,yy]],'#8e795a55');}c.restore();
 ellipse(c,x+62,y-28,14,15,'#c6a872');ellipse(c,x+62,y-28,9,10,'#e1cd94');ellipse(c,x+62,y-28,5,6,'#9c855a');
 rect(c,x-66,y-9,115,9,'#617a79');line(c,[[x-72,y],[x+76,y]],'#e7d5b2',3);
}
function ferris(c,x,y){
 const r=44;line(c,[[x-24,y],[x,y-49],[x+24,y]],'#9eaeaa',3);
 c.beginPath();c.arc(x,y-58,r,0,Math.PI*2);c.strokeStyle='#e4e6d6';c.lineWidth=2.5;c.stroke();
 for(let i=0;i<16;i++){const a=i*Math.PI/8,xx=x+Math.cos(a)*r,yy=y-58+Math.sin(a)*r;line(c,[[x,y-58],[xx,yy]],'#9baeb0',.8);rect(c,xx-3,yy-1,6,6,'#9aaca9');rect(c,xx-2,yy,4,3,'#d5e0d5');}
 ellipse(c,x,y-58,4,4,'#dce2d4');
}
function cityLayer(){
 const canvas=document.createElement('canvas');canvas.width=TILE;canvas.height=330;const c=canvas.getContext('2d');
 // Highland slope: low and dry, not Alpine mountains.
 path(c,[[0,300],[0,264],[130,255],[280,270],[470,264],[615,245],[690,218],[780,211],[930,235],[1080,266],[1290,280],[1660,278],[1920,263],[2210,282],[2400,287],[2400,330],[0,330]],'#b3b0a0');
 // The trio is on the elevated ground, with three distinct curved silhouettes.
 flame(c,765,229,47,174,17);flame(c,830,235,43,154,-10);flame(c,889,241,48,183,-15);
 rect(c,738,236,176,8,'#a9aba0');
 for(let i=0;i<56;i++){const x=i*44,h=18+(i*17)%33;facade(c,x,BASE,43,h,i);}
 // Oil-boom city front: cornices, balconies, mansard roof and central dome.
 facade(c,485,300,94,66,3);dome(c,532,234,19,'#a1aca5');rect(c,527,209,10,9,'#a8b3ac');
 facade(c,586,300,65,52,8);facade(c,976,300,109,69,9);dome(c,1031,231,18,'#9aaca8');
 facade(c,1097,300,76,54,12);facade(c,1204,300,95,60,7);
 oldCity(c);carpet(c,1410,300);ferris(c,1620,300);
 // A distant modern waterfront cluster, lighter than the focal landmarks.
 for(let i=0;i<7;i++){const x=1820+i*39,h=45+(i*31)%56;rect(c,x,300-h,28,h,'#a4b8b5');rect(c,x+4,302-h,2,h-3,'#c4d2c8');for(let yy=307-h;yy<300;yy+=8)line(c,[[x+2,yy],[x+25,yy]],'#d1d9ca80',1);}
 // Boulevard tree crowns soften the hard edge of the waterfront.
 for(let i=0;i<96;i++){const x=i*25+7,h=7+(i*11)%12;rect(c,x,298-h,2,h,'#7c8269');ellipse(c,x+1,296-h,9,7,'#879c7e');ellipse(c,x-3,294-h,7,6,'#96a588');}
 rect(c,0,300,TILE,5,'#d9c9a6');rect(c,0,305,TILE,2,'#8fa19a');
 return canvas;
}
function farLayer(){
 const canvas=document.createElement('canvas');canvas.width=TILE;canvas.height=330;const c=canvas.getContext('2d');
 path(c,[[0,300],[0,250],[180,236],[400,250],[610,220],[900,241],[1200,260],[1600,236],[1850,253],[2200,244],[2400,258],[2400,330],[0,330]],'#bac8c1');
 for(let i=0;i<76;i++){const x=i*33,h=12+(i*29)%42;rect(c,x,280-h,24,h,'#abbeb7');}
 return canvas;
}
export function createBakuBackdrop(){
 // Two bounded in-memory atlases; architecture detail is not rebuilt per frame.
 const city=cityLayer(),far=farLayer();
 return function drawBaku(c,{width,height,camera,scale}){
  const unit=Math.max(.65,Math.min(1.3,height/440));
  const lift=Math.max(-18,Math.min(18,(camera.y-1.1)*scale*.035));
  const base=height*.64-lift;
  const sky=c.createLinearGradient(0,0,0,height);sky.addColorStop(0,'#b8d1d9');sky.addColorStop(.65,'#e4e5d3');sky.addColorStop(1,'#f2d9ad');rect(c,0,0,width,height,sky);
  const glow=c.createRadialGradient(width*.82,height*.27,4,width*.82,height*.27,100*unit);glow.addColorStop(0,'#fff4d6b3');glow.addColorStop(1,'#fff4d600');rect(c,0,0,width,height,glow);ellipse(c,width*.82,height*.27,22*unit,22*unit,'#fff0c6');
  const framing=Math.max(0,765*unit-width*.62);
  const tile=(atlas,factor,y,frame=0)=>{const span=TILE*unit,offset=(((camera.x-3)*scale*factor+frame)%span+span)%span;for(let x=-offset;x<width;x+=span)c.drawImage(atlas,x,y-BASE*unit,span,330*unit);};
  tile(far,.012,base-8*unit,framing*.3);tile(city,.038,base,framing);
  const seaTop=base+7*unit,sea=c.createLinearGradient(0,seaTop,0,height);sea.addColorStop(0,'#8aafb3');sea.addColorStop(.45,'#a2c2bd');sea.addColorStop(1,'#b9cfba');rect(c,0,seaTop,width,height-seaTop,sea);
  // Calm, wind-streaked Caspian water and pale reflections at the far shore.
  for(let i=0;i<70;i++){const y=seaTop+4+(i*19)%Math.max(20,height-seaTop),x=((i*113-camera.x*scale*.065)%(width+90)+width+90)%(width+90)-45;line(c,[[x,y],[x+9+(i%6)*8,y]],i%3?'#dce0c080':'#7caaa980',.7+(i%2)*.4);}
  // A small white passenger boat, a background cue rather than a moving obstacle.
  const boatX=width*.87-((camera.x-3)*scale*.022)%(width+200),boatY=seaTop+22*unit;
  path(c,[[boatX-25*unit,boatY],[boatX+32*unit,boatY],[boatX+22*unit,boatY+7*unit],[boatX-18*unit,boatY+7*unit]],'#e9e8ce');rect(c,boatX-13*unit,boatY-9*unit,29*unit,9*unit,'#e9e8d5');rect(c,boatX-10*unit,boatY-7*unit,23*unit,4*unit,'#759b9c');line(c,[[boatX,boatY-9*unit],[boatX,boatY-19*unit]],'#728d8b',unit);
  // Near boulevard: balustrade and paired lamps scroll faster than the skyline.
  const walk=base+57*unit;
  rect(c,0,walk,width,10*unit,'#d9c9a8');line(c,[[0,walk],[width,walk]],'#eee2bf',2*unit);
  const step=92*unit,period=step*2,offset=((camera.x-3)*scale*.16%period+period)%period;
  for(let x=-offset;x<width+step;x+=step){
   for(let j=0;j<7;j++){const xx=x+j*12*unit;rect(c,xx,walk-9*unit,2*unit,9*unit,'#bdb89c');}
   line(c,[[x,walk-10*unit],[x+step,walk-10*unit]],'#d8d2b5',2*unit);
   if(Math.round((x+offset)/step)%2===0){line(c,[[x,walk],[x,walk-47*unit]],'#668384',2*unit);line(c,[[x-7*unit,walk-39*unit],[x,walk-45*unit],[x+7*unit,walk-39*unit]],'#668384',1.5*unit);ellipse(c,x-7*unit,walk-39*unit,3*unit,4*unit,'#fff1c6');ellipse(c,x+7*unit,walk-39*unit,3*unit,4*unit,'#fff1c6');}
  }
  // Sparse gulls, wind-shaped rather than repeated mountain silhouettes.
  for(const [x,y]of [[.39,.21],[.44,.25],[.7,.17]]){const px=width*x,py=height*y;c.beginPath();c.moveTo(px-7,py+2);c.quadraticCurveTo(px-3,py-2,px,py+1);c.quadraticCurveTo(px+3,py-2,px+7,py+2);c.strokeStyle='#7b969a80';c.lineWidth=1;c.stroke();}
 };
}
