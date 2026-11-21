import { drawPartSample, drawRim } from './part-art.js';

// Brief cutaways are drawn in the car's moving frame. All motion is presentation only.
const ink='#25282a', steel='#aaa9a0', bright='#f3e6c9', brass='#c79358';
const clamp=t=>Math.max(0,Math.min(1,t));
export const FIT_SECONDS=1.8;

function component(c,id,t,level){
  const seat=1-(1-clamp((t-.05)/.53))**3;
  const settle=Math.sin(clamp((t-.28)/.48)*Math.PI);
  const gap=1-seat;
  const block=(x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(x,y,w,h);c.strokeStyle=ink;c.lineWidth=1.5;c.strokeRect(x,y,w,h);};
  function rod(x,y,ex,ey,color,w){
    c.beginPath();c.moveTo(x,y);c.lineTo(ex,ey);c.strokeStyle=color;c.lineWidth=w;c.stroke();
  }
  function disc(x,y,r,color){
    c.beginPath();c.arc(x,y,r,0,2*Math.PI);c.fillStyle=color;c.fill();c.strokeStyle=ink;c.lineWidth=1.4;c.stroke();
  }
  c.lineCap='round';c.lineJoin='round';
  switch(id){
    case 0: // The block lowers between its mounts, then the three pistons cycle.
      block(-19,7,38,5,steel);c.translate(0,-22*gap);
      block(-16,-6,32,16,ink);
      for(let n=0;n<3;n++){
        const x=-11+n*10, y=-7-3*Math.sin(2*Math.PI*(t*1.9+n/3))*seat;
        rod(x,y,x+2,5,steel,2);block(x-3.5,y-4,7,5,brass);
      }
      block(-18,-14-7*gap,36,4,steel);break;
    case 1: // Meshing gears and the sliding input shaft.
      rod(-26,0,24,0,steel,4);
      for(let n=0;n<2;n++){
        c.save();c.translate(n?9+15*gap:-8,0);c.rotate((n?-1:1)*t*3+(n?.38:0));
        for(let j=0;j<8;j++){block(-2,-10,4,7,brass);c.rotate(Math.PI/4);}
        disc(0,0,8,steel);disc(0,0,3,ink);c.restore();
      }break;
    case 2: // Seated rim and lug pattern with the tire visible around it.
      c.translate(-18*gap,-12*gap);c.rotate(-1.5*gap);
      disc(0,0,16,ink);drawRim(c,level,15);
      if(t>.32 && t<.84){
        c.rotate(-1.3+clamp((t-.32)/.44)*1.5);
        disc(4,-3,3,steel);rod(5,-5,15,-16,ink,4.5);rod(5,-5,15,-16,bright,2.5);
      }
      break;
    case 3:{ // Piston stroke and rebound change the coil spacing.
      const lower=15-10*settle;
      rod(0,-18,0,lower,bright,3);block(-3,2,6,lower-1,steel);
      c.beginPath();c.moveTo(0,-16);
      for(let n=0;n<=10;n++)c.lineTo(n%2?6:-6,-14+(lower+11)*n/10);
      c.strokeStyle=brass;c.lineWidth=3;c.stroke();
      block(-7,-19,14,3,steel);block(-7,lower,14,3,steel);break;
    }
    case 4: // The caliper slides over a drilled rotor.
      disc(0,0,15,steel);disc(0,0,6,ink);
      for(let n=0;n<8;n++){const a=n*Math.PI/4+t;disc(11*Math.cos(a),11*Math.sin(a),1,ink);}
      c.translate(14*gap,-7*gap);block(7,-10,9,18,brass);block(5,-9,7,4,bright);break;
    case 5: // A spray gun travels along the body as the finish is revealed.
      c.translate(0,-14);rod(0,0,9,-5,steel,4);block(8,-9,9,6,brass);
      rod(13,-4,16,3,ink,4);block(12,-16,5,7,bright);
      for(let n=0;n<3;n++)rod(1,1,-6-n*3,6+n*1.8,bright,1);
      break;
    case 6: // Silencer and sleeve slide onto the existing pipe.
      rod(0,1,24,1,steel,5);c.translate(-19*gap,4*gap);
      rod(-25,4,-7,0,bright,4);block(-9,-5,22,11,steel);
      block(-6,-6,3,13,brass);block(7,-6,3,13,brass);break;
    case 7: // The bottle descends into a retaining strap, then the valve turns.
      block(-9,2,18,7,ink);c.translate(0,-17*gap);c.rotate(-.18);
      c.fillStyle=steel;c.strokeStyle=ink;c.lineWidth=1.6;
      c.beginPath();c.roundRect(-7,-14,14,30,6);c.fill();c.stroke();
      block(-7,2,14,5,brass);rod(0,-14,0,-19,bright,3);
      c.translate(0,-19);c.rotate(seat*.9);rod(-5,0,5,0,brass,3);break;
  }
}

export function drawFitting(c,event,t,sim,X,Y,scale,width,height){
  const {part,label,detail}=event;
  const sweep=clamp((t-.06)/.64);
  const local=(x,y)=>sim.body.getWorldPoint({x,y});
  let mounts;
  switch(part){
    case 0: mounts=[local(1.2,.05)];break;
    case 1: mounts=[local(.38,-.14)];break;
    case 2: case 4: mounts=sim.rims.map(r=>r.getPosition());break;
    case 3: mounts=sim.rims.map(r=>{const p=r.getPosition();return {x:p.x,y:p.y+.23};});break;
    case 5: mounts=[local(2.12-4.24*sweep,.12)];break;
    case 6: mounts=[sim.exhaustMount.point];break;
    case 7: mounts=[local(-.9,.24)];break;
  }
  const anchor=mounts.at(-1), ax=X(anchor.x), ay=Y(anchor.y);
  c.save();
  c.globalAlpha=clamp(t/.07)*clamp((1-t)/.20);
  for(const p of mounts){
    c.save();c.translate(X(p.x),Y(p.y));c.rotate(-sim.body.getAngle());
    const zoom=Math.max(.72,Math.min(1.5,scale/55));c.scale(zoom,zoom);
    component(c,part,t,event.to);c.restore();
  }
  c.font='600 14px system-ui';
  const compact=width<480, size=compact?32:44, h=size+4;
  const w=Math.ceil(Math.max(c.measureText(label).width,c.measureText(detail).width)+size+22);
  const x=Math.min(width-w-6,Math.max(6,X(sim.body.getPosition().x)+scale*.78));
  const y=Math.max(compact?81:50,Math.min(height-90,Y(sim.body.getPosition().y)-scale*1.55-h));
  c.beginPath();c.moveTo(ax,ay-9);c.lineTo(ax+10,ay-24);c.lineTo(x+size*.5,y+h);
  c.strokeStyle=ink;c.lineWidth=3;c.stroke();c.strokeStyle=bright;c.lineWidth=1;c.stroke();
  c.fillStyle=ink;c.fillRect(x,y,w,h);c.fillStyle=brass;c.fillRect(x+w-3,y,3,h);
  c.save();c.beginPath();c.rect(x+2,y+2,size,size);c.clip();
  const slide=clamp((t-.12)/.35),shift=size*slide*slide*(3-2*slide);
  drawPartSample(c,part,event.from,x+2-shift,y+2,size);
  drawPartSample(c,part,event.to,x+2+size-shift,y+2,size);
  c.restore();
  c.textAlign='left';c.fillStyle=bright;c.fillText(label,x+size+9,y+(compact?15:20));
  c.font='12px system-ui';c.fillStyle='#d7c7b0';c.fillText(detail,x+size+9,y+h-8);
  c.restore();
}
