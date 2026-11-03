import test from 'node:test';
import assert from 'node:assert/strict';
import { createSimulation, STEP } from '../src/physics.js';
const run=(s,seconds,throttle=0,brake=false)=>{for(let i=0;i<seconds/STEP;i++)s.step(throttle,brake);};
test('parked vehicle settles on its wheels without chassis touching the road',()=>{
  const s=createSimulation();run(s,8);
  assert.ok(s.body.getPosition().y>.75 && s.body.getPosition().y<1.5);
  assert.ok(Math.abs(s.body.getLinearVelocity().y)<.05);
  for(const w of s.wheels)assert.ok(w.getPosition().y>.45 && w.getPosition().y<.55);
});
test('wheel torque propels the car and brakes reduce its speed',()=>{
  const s=createSimulation();run(s,2);run(s,3,1);
  assert.ok(s.body.getPosition().x>9,'car should move forwards');
  const speed=Math.abs(s.body.getLinearVelocity().x);assert.ok(speed>2);
  run(s,1,0,true);assert.ok(Math.abs(s.body.getLinearVelocity().x)<speed*.7);
});
test('suspension changes actual travel; rough-track simulation remains finite',()=>{
  const soft=createSimulation({frequency:1.5}),firm=createSimulation({frequency:6});run(soft,5);run(firm,5);
  assert.ok(Math.abs(soft.joints[0].getJointTranslation())>Math.abs(firm.joints[0].getJointTranslation())*2);
  firm.tune(3.2,.65);run(firm,25,1);
  assert.ok(firm.body.getPosition().x>50);
  for(const b of [firm.body,...firm.wheels]) {const p=b.getPosition();assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.y>-3);}
});
