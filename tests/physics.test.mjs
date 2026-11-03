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
test('car accelerates from a stop on the hill with every suspension preset',()=>{
  for(const [frequency,damping] of [[2,.4],[3.2,.65],[5.2,.85]]) {
    const s=createSimulation({frequency,damping});
    for(let i=0;i<60/STEP && s.body.getPosition().x<123;i++)s.step(1);
    assert.ok(s.body.getPosition().x>=123,'car reaches the climb');
    run(s,3,0,true);
    const start=s.body.getPosition().x;
    assert.ok(start>120 && start<135,'vehicle stopped on the climb');
    run(s,3,1);
    assert.ok(s.body.getPosition().x>start+5,`preset ${frequency} must climb from a stop`);
  }
});
test('each drive mode can start on a hill and switches the powered axle',()=>{
  for(const mode of ['fwd','rwd','awd']) {
    const s=createSimulation({drive:mode});
    for(let i=0;i<60/STEP && s.body.getPosition().x<123;i++)s.step(1);
    assert.ok(s.body.getPosition().x>=123,`${mode} reaches the hill`);
    run(s,3,0,true); const start=s.body.getPosition().x;
    run(s,3,1);
    assert.ok(s.body.getPosition().x>start+2,`${mode} climbs from a stop`);
    if(mode==='fwd')assert.ok(s.tires[1].getMaxMotorTorque()>s.tires[0].getMaxMotorTorque());
    if(mode==='rwd')assert.ok(s.tires[0].getMaxMotorTorque()>s.tires[1].getMaxMotorTorque());
    if(mode==='awd')assert.equal(s.tires[0].getMaxMotorTorque(),s.tires[1].getMaxMotorTorque());
    s.setDrive('awd');s.step(1);assert.equal(s.tires[0].getMaxMotorTorque(),s.tires[1].getMaxMotorTorque());
  }
});
test('tires compress under vehicle load',()=>{
  const s=createSimulation();run(s,3);
  for(const t of s.tires) assert.ok(t.getJointTranslation()>.01 && t.getJointTranslation()<.15);
});
