import test from 'node:test';
import assert from 'node:assert/strict';
import {createSimulation,STEP} from '../src/physics.js';
import {createBench} from './tire-bench-helper.mjs';
import {groundHeight} from '../src/terrain.js';

test('settled tires remain quiet and smoothly compress/recover under a load ramp',()=>{
 for(const pressure of [.6,2.2,3.2]){
  const b=createBench({pressure});b.step(1/960);const rest=b.rim.getPosition().y;let lo=1,hi=-1;
  for(let i=0;i<480;i++){b.step(1/960,1/960);const y=b.rim.getPosition().y;lo=Math.min(lo,y);hi=Math.max(hi,y);}
  assert.ok(hi-lo<.0001,'settled height ripple stays below 0.1 mm');
  let last=b.rim.getPosition().y,maxJump=0;
  for(let i=0;i<1920;i++){
   const t=i/960,force=t<.5?1200*t/.5:t<1?1200:Math.max(0,1200*(1.5-t)/.5);
   b.rim.applyForceToCenter({x:0,y:-force},true);b.step(1/960,1/960);
   const y=b.rim.getPosition().y;maxJump=Math.max(maxJump,Math.abs(y-last));last=y;
   if(i===959)assert.ok(y<rest-.003,'added weight physically compresses the tire');
  }
  assert.ok(maxJump<.001,'no millimetre jumps between solver steps');b.step(1/960,2);
  assert.ok(Math.abs(b.rim.getPosition().y-rest)<.001,'unloading recovers ride height');
 }
});

test('rolling on flat ground does not excite visible axle judder at any pressure',()=>{
 for(const pressure of [.6,2.2,3.2]){
  const s=createSimulation({pressure,heightAt:()=>0});let sum=0,n=0,peak=0;
  for(let i=0;i<6/STEP;i++){const v=s.body.getLinearVelocity().y;s.step(1);if(i>3/STEP){const a=(s.body.getLinearVelocity().y-v)/STEP;sum+=a*a;peak=Math.max(peak,Math.abs(a));n++;}}
  assert.ok(Math.sqrt(sum/n)<.16,`flat-road acceleration RMS at ${pressure} bar`);
  assert.ok(peak<.55,`flat-road peak at ${pressure} bar`);assert.ok(s.body.getPosition().x>45);
 }
});

test('every drive clears rough ground at low, normal and high pressure without tread sink or chamber collapse',()=>{
 for(const drive of ['fwd','rwd','awd'])for(const pressure of [.6,2.2,3.2]){
  const s=createSimulation({drive,pressure});
  for(let i=0;i<16/STEP&&s.body.getPosition().x<95;i++){
   s.step(1);if(i%4)continue;
   for(const t of s.tires){
    assert.ok(t.area/t.referenceArea>.8&&t.area/t.referenceArea<1.3,'chamber remains intact');
    for(const n of t.nodes){
     const p=n.getPosition();assert.ok(p.y-t.skin>=groundHeight(p.x)-.002,`${drive}/${pressure}: contact tread sinks`);
     const index=Math.floor((p.x+40)/.4);
     for(let k=index-1;k<=index+1;k++){
      const a=s.points[k],b=s.points[k+1];if(!a||!b)continue;
      const dx=b.x-a.x,dy=b.y-a.y,f=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy)));
      assert.ok(Math.hypot(p.x-a.x-f*dx,p.y-a.y-f*dy)>=t.skin-.001,'tread clears actual terrain segments');
     }
    }
    // The renderer fills center-line polygon + contact circles, not outer chords.
    for(let j=0;j<t.nodes.length;j++){
     const a=t.nodes[j].getPosition(),b=t.nodes[(j+1)%t.nodes.length].getPosition();
     for(const f of [0,.25,.5,.75,1]){const x=a.x+(b.x-a.x)*f,y=a.y+(b.y-a.y)*f;assert.ok(y>=groundHeight(x)-.002,'paint bridge cannot cut through road');}
    }
   }
  }
  assert.ok(s.body.getPosition().x>=95,`${drive}/${pressure} crosses the rumble strip`);
 }
});

