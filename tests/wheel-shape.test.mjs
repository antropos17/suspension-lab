import test from 'node:test';
import assert from 'node:assert/strict';
import { tirePoint, groundedTirePoint } from '../src/wheel-shape.js';
import { createSimulation, STEP } from '../src/physics.js';
import { groundHeight } from '../src/terrain.js';
import { WELL_X as ARCH_X, WELL_Y as ARCH_Y_RADIUS, ARCH_CENTER_Y } from '../src/vehicle-geometry.js';
test('loaded rubber has a flat contact patch while an unloaded tire is round',()=>{
  const r=.48,d=.08;
  const lower=[Math.PI*.35,Math.PI*.5,Math.PI*.65].map(a=>tirePoint(a,r,d));
  assert.ok(lower.every(p=>Math.abs(p.y-(r-d))<1e-8));
  for(let i=0;i<64;i++){const p=tirePoint(i*Math.PI/32,r,0);assert.ok(Math.abs(Math.hypot(p.x,p.y)-r)<1e-8);}
  assert.equal(tirePoint(-Math.PI/2,r,d).y,-r);
});

test('rendered terrain interpolates the actual collider segments',()=>{
  const sim=createSimulation();
  for(let i=1;i<sim.points.length;i++){
    const a=sim.points[i-1],b=sim.points[i];
    for(const t of [0,.2,.5,.9,1])assert.ok(Math.abs(groundHeight(a.x+(b.x-a.x)*t)-(a.y+(b.y-a.y)*t))<1e-9);
  }
});

test('loaded rubber contacts flat ground and conforms to slopes without moving its hub',()=>{
  const hub={x:0,y:.4};
  const flat=[.35,.5,.65].map(t=>groundedTirePoint(t*Math.PI,hub,.48,()=>0));
  assert.ok(flat.every(p=>p.y>=0&&p.y<.01),'contact patch stays on, not in, the road');
  assert.deepEqual(hub,{x:0,y:.4});
  const slope=x=>x*.45;
  for(let i=0;i<128;i++){
    const p=groundedTirePoint(i*Math.PI/64,hub,.48,slope);
    assert.ok(p.y>=slope(p.x));
    const airHub={x:0,y:2},air=groundedTirePoint(i*Math.PI/64,airHub,.48,slope,false);
    assert.ok(Math.abs(Math.hypot(air.x-airHub.x,air.y-airHub.y)-.48)<1e-9);
  }
});

test('visible rubber clears the ground and inner wheel well over the rough course',()=>{
  for(const drive of ['awd','fwd','rwd']){
  const s=createSimulation({drive,frequency:2,damping:.4});let samples=0;
  for(let step=0;step<40/STEP&&s.body.getPosition().x<263;step++){
    s.step(1);if(step%4)continue;
    for(let i=0;i<2;i++){
      let touching=false;
      for(let e=s.wheels[i].getContactList();e;e=e.next)if(e.other.isStatic()&&e.contact.isTouching())touching=true;
      for(let j=0;j<64;j++){
        const p=groundedTirePoint(j*Math.PI/32,s.rims[i].getPosition(),.48,groundHeight,touching);
        assert.ok(p.y>=groundHeight(p.x)-1e-9);
        const local=s.body.getLocalPoint(p);
        if(local.y>-.34)assert.ok(((local.x-(i===0?-1.25:1.25))/ARCH_X)**2+((local.y-ARCH_CENTER_Y)/ARCH_Y_RADIUS)**2<1,
          `rubber exceeds inner well at ${s.body.getPosition().x.toFixed(2)} m`);
        samples++;
      }
    }
  }
  assert.ok(samples>50000);assert.ok(s.body.getPosition().x>=263);
  }
});
