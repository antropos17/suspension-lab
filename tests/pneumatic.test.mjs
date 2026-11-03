import test from 'node:test';
import assert from 'node:assert/strict';
import {World,Vec2,Circle} from 'planck';
import {createPneumaticTire,RIM_RADIUS} from '../src/pneumatic-tire.js';
import {createBench} from './tire-bench-helper.mjs';

test('gas pressure and load change actual tread geometry and supported hub height',()=>{
 const soft=createBench({pressure:.6}),firm=createBench({pressure:2.2}),loaded=createBench({pressure:.6,load:350});
 for(const b of [soft,firm,loaded])b.step();
 assert.ok(soft.rim.getPosition().y<firm.rim.getPosition().y-.01);
 assert.ok(soft.tire.getContactWidth()>firm.tire.getContactWidth()+.05);
 assert.ok(loaded.rim.getPosition().y<soft.rim.getPosition().y-.003);
 assert.ok(loaded.tire.area<soft.tire.area);
 assert.ok(loaded.tire.pressureBar>soft.tire.pressureBar,'smaller sealed volume increases absolute pressure');
 for(const b of [soft,firm,loaded]){
  assert.ok(b.rim.getPosition().y>RIM_RADIUS+.1,'no rim bottoming at the bench load');
  assert.ok(Math.abs(b.rim.getLinearVelocity().y)<.01);
  assert.ok(b.tire.nodes.some(n=>n.getContactList()),'tread elements carry actual contacts');
 }
 const before=soft.rim.getPosition().y;soft.tire.setPressure(3.2);soft.step();
 assert.ok(soft.rim.getPosition().y>before+.02,'inflation physically lifts the hub');
});

test('rendered outline follows collision nodes without terrain projection',()=>{
 const b=createBench({pressure:.6});b.step();const outline=b.tire.getOutline();
 outline.forEach((p,i)=>{const n=b.tire.nodes[i].getPosition();assert.ok(Math.abs(Math.hypot(p.x-n.x,p.y-n.y)-b.tire.skin)<1e-9);});
 assert.ok(b.tire.getDeflection()>.025);
});

test('halving timestep and refining ring keep equilibrium within declared discretization bounds',()=>{
 const base=createBench(),half=createBench(),fine=createBench({count:48});
 base.step();half.step(1/960);fine.step(1/960);
 assert.ok(Math.abs(base.rim.getPosition().y-half.rim.getPosition().y)<.003);
 assert.ok(Math.abs(base.rim.getPosition().y-fine.rim.getPosition().y)<.015);
 for(const b of [base,half,fine])assert.ok(b.tire.area>b.tire.referenceArea*.8&&b.tire.area<b.tire.referenceArea*1.2);
});

test('pressure and elastic links conserve net linear and angular momentum in free space',()=>{
 const world=new World(Vec2(0,0)),rim=world.createDynamicBody(Vec2(0,3));rim.createFixture(new Circle(RIM_RADIUS),{density:100,filterMaskBits:0});
 const tire=createPneumaticTire(world,rim,{pressure:3.2});
 const bodies=[rim,...tire.nodes];
 for(let i=0;i<480;i++){tire.applyPressure();world.step(1/480,16,8);}
 let px=0,py=0,L=0;for(const b of bodies){const v=b.getLinearVelocity(),p=b.getWorldCenter(),m=b.getMass();px+=m*v.x;py+=m*v.y;L+=m*((p.x)*v.y-(p.y-3)*v.x)+b.getInertia()*b.getAngularVelocity();}
 assert.ok(Math.hypot(px,py)<1e-5);assert.ok(Math.abs(L)<1e-5);
});

