import { drawPartSample } from './part-art.js';

// Brief cutaways are drawn in the car's moving frame. All motion is presentation only.
const ink='#25282a', steel='#aaa9a0', bright='#f3e6c9', brass='#c79358';
const clamp=t=>Math.max(0,Math.min(1,t));
export const FIT_SECONDS=2.15;
function ease(t){t=clamp(t);return t*t*(3-2*t);}

export const paintSweep=t=>ease((t-.06)/.64);
export const rimSeating=t=>ease((t-.07)/.44);

function component(c,id,t){
  const seat=ease((t-.07)/.44);
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
      block(-19,7,38,5,steel);c.translate(0,-24*gap);c.rotate(-.09*gap);
      const sling=1-ease((t-.48)/.18);
      if(sling>0){
        c.save();c.globalAlpha*=sling;
        const lift=-23-12*(1-sling);
        rod(-11,-13,0,lift,bright,1.4);rod(11,-13,0,lift,bright,1.4);
        rod(0,lift,0,lift-8,ink,2.5);c.restore();
      }
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
    case 2: // The wheel renderer seats the actual rim. A socket then tightens two lugs.
      if(t>.48 && t<.81){
        const stroke=clamp((t-.48)/.32)*2;
        const lug=stroke>=1 ? -1 : 1;
        c.globalAlpha*=Math.sin(Math.PI*(stroke%1))**.35;
        c.translate(lug*4,-3);c.rotate(-1.4+ease(stroke%1)*1.25);
        disc(0,0,3,steel);rod(1,-2,14,-14,ink,4.5);rod(1,-2,14,-14,bright,2.5);
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
      if(t<.71){
        const paint=c.createLinearGradient(0,0,-18,15);
        paint.addColorStop(0,'rgba(233,221,190,.72)');paint.addColorStop(1,'rgba(222,211,188,0)');
        c.fillStyle=paint;c.beginPath();c.moveTo(0,1);c.lineTo(-23,7);c.lineTo(-7,23);c.fill();
      }
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
  const {part,label,metric,from,to}=event;
  const sweep=paintSweep(t);
  const local=(x,y)=>sim.body.getWorldPoint({x,y});
  let mounts;
  switch(part){
    case 0: mounts=[local(1.2,.05)];break;
    case 1: mounts=[local(.38,-.14)];break;
    case 2: case 4: mounts=sim.wheels.map(r=>r.getPosition());break;
    case 3: mounts=sim.rims.map(r=>{const p=r.getPosition();return {x:p.x,y:p.y+.23};});break;
    case 5: mounts=[local(2.12-4.24*sweep,.12)];break;
    case 6: mounts=[sim.exhaustMount.point];break;
    case 7: mounts=[local(-.9,.24)];break;
  }
  const anchor=mounts.at(-1), ax=X(anchor.x), ay=Y(anchor.y);
  c.save();
  const visibility=ease(t/.055)*(1-ease((t-.90)/.10));
  c.globalAlpha=visibility*(1-ease((t-.69)/.13));
  for(const p of mounts){
    c.save();c.translate(X(p.x),Y(p.y));c.rotate(-sim.body.getAngle());
    const zoom=Math.max(.72,Math.min(1.5,scale/55));c.scale(zoom,zoom);
    component(c,part,t);c.restore();
  }
  c.globalAlpha=visibility;
  const compact=width<480, size=compact?32:44, h=size+6;
  const level=to>from ? from+'→'+to : 'Ур. '+to;
  c.font='600 13px system-ui';
  const topWidth=c.measureText(label).width+10+c.measureText(level).width;
  c.font='12px system-ui';
  const w=Math.ceil(size+23+Math.max(topWidth,c.measureText(metric).width));
  const x=Math.min(width-w-6,Math.max(6,X(sim.body.getPosition().x)+scale*.78));
  const y=Math.max(compact?81:50,Math.min(height-90,Y(sim.body.getPosition().y)-scale*1.55-h));
  // Extend the leader from the work order to the actual mounting point.
  const sx=x+size*.5,sy=y+h,elbowX=ax+10,elbowY=ay-24;
  const lead=ease(t/.19), bend=Math.min(1,lead/.7), tip=clamp((lead-.7)/.3);
  c.beginPath();c.moveTo(sx,sy);c.lineTo(sx+(elbowX-sx)*bend,sy+(elbowY-sy)*bend);
  if(tip)c.lineTo(elbowX+(ax-elbowX)*tip,elbowY+(ay-9-elbowY)*tip);
  c.strokeStyle=ink;c.lineWidth=3;c.stroke();c.strokeStyle=bright;c.lineWidth=1;c.stroke();
  c.fillStyle=ink;c.fillRect(x,y,w,h);c.fillStyle=brass;c.fillRect(x,y,2,h);
  c.save();c.beginPath();c.rect(x+3,y+3,size,size);c.clip();
  const shift=size*ease((t-.14)/.33);
  drawPartSample(c,part,from,x+3-shift,y+3,size);
  drawPartSample(c,part,to,x+3+size-shift,y+3,size);
  c.restore();
  const tx=x+size+11,titleY=y+(compact?15:20);
  c.font='600 13px system-ui';c.textAlign='left';c.fillStyle=bright;c.fillText(label,tx,titleY);
  c.textAlign='right';c.font='600 12px system-ui';c.fillStyle='#dfbb88';c.fillText(level,x+w-7,titleY);
  c.textAlign='left';c.font='12px system-ui';c.fillStyle='#f0e8d9';c.fillText(metric,tx,y+h-7);
  c.restore();
}
