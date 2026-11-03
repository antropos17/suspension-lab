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
  // Preload holds the same ride height. Compare response to an added load.
  const baseSoft=soft.joints[0].getJointTranslation(),baseFirm=firm.joints[0].getJointTranslation();
  for(let i=0;i<2/STEP;i++){for(const s of [soft,firm]){s.body.applyForceToCenter({x:0,y:-1000},true);s.step();}}
  assert.ok(soft.joints[0].getJointTranslation()-baseSoft>(firm.joints[0].getJointTranslation()-baseFirm)*2);
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

test('liners contain the tires on a complete rough-track run for every drive',()=>{
for (const drive of ['awd','fwd','rwd']) {
 const s=createSimulation({drive,frequency:2,damping:.4});let contacts=0,minGap=1,maxTravel=-1;
 s.world.on('begin-contact', c=>{if(c.getFixtureA().getUserData()==='arch'||c.getFixtureB().getUserData()==='arch')contacts++;});
 for(let i=0;i<45/STEP&&s.body.getPosition().x<263;i++){
 s.step(1);
 for(let j=0;j<2;j++){
 const p=s.body.getLocalPoint(s.wheels[j].getPosition()),cx=j===0?-1.25:1.25;
 for(let k=0;k<16;k++){
 const a=k*Math.PI/16,b=(k+1)*Math.PI/16;
 const x=cx+.57*Math.cos(a),y=-.55+.57*Math.sin(a),dx=.57*(Math.cos(b)-Math.cos(a)),dy=.57*(Math.sin(b)-Math.sin(a));
 const t=Math.max(0,Math.min(1,((p.x-x)*dx+(p.y-y)*dy)/(dx*dx+dy*dy)));
 minGap=Math.min(minGap,Math.hypot(p.x-x-t*dx,p.y-y-t*dy)-.48);
 }maxTravel=Math.max(maxTravel,s.stops[j].getJointTranslation());
 }
 }
 assert.ok(s.body.getPosition().x>=263,`${drive} completes the rough trail`);
 assert.ok(contacts<120,`${drive} liners should not act as the primary suspension spring`);
 assert.ok(minGap>=0,`${drive} tire crosses the visible arch: ${minGap}`);
 assert.ok(maxTravel<.281,`${drive} exceeds the suspension stop`);
}

});
