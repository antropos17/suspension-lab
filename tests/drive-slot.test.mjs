import test from 'node:test';
import assert from 'node:assert/strict';
import { createDriveSlot, scoreParts } from '../src/drive-slot.js';
import { createSimulation, STEP } from '../src/physics.js';
import { readGarage, levelOf, advanceGarage, purchase, buildSpec } from '../src/garage.js';

test('only three across distinct reels score; each legal line pays once',()=>{
  const miss=scoreParts([0,1,0,0,8,9,0,9,8]);
  assert.deepEqual(miss.lines,[]);assert.deepEqual(miss.matches,Array(8).fill(0));
  assert.equal(miss.coins+miss.gems,0);
  const cross=scoreParts([8,0,9,2,8,1,4,2,8]);
  assert.deepEqual(cross.lines,[[0,4,8]]);assert.equal(cross.coins,30);
  assert.equal(scoreParts(Array(9).fill(9)).gems,15);
  assert.equal(scoreParts(Array(9).fill(2)).matches[2],5);
});

test('a held column keeps its three physical stops on the next spin',()=>{
  let seed=3;const slot=createDriveSlot(()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/2**32));
  slot.spin(0);slot.update(2,false);slot.hold(1);const previous=[...slot.parts];
  assert.ok(slot.spin(2.1));assert.ok(slot.autoUntil>2.1);
  for(const i of [1,4,7])assert.equal(slot.parts[i],previous[i]);
  assert.equal(slot.spin(2.2),false);slot.update(4,true);assert.equal(slot.update(5,true),undefined);
});

test('orders spend currency but fit only when the ordered part wins a line',()=>{
  const g=readGarage(JSON.stringify({points:[20,12,6,2,0,20],best:84,coins:30,gems:4}));
  assert.deepEqual(g.points.map(levelOf),[5,4,3,2,1,5,1,1]);
  assert.ok(purchase(g,'part',7));assert.ok(purchase(g,'kit',1));
  assert.equal(levelOf(g.points[7]),1);assert.equal(g.kits[1],false);
  assert.equal(g.coins+g.gems,0);assert.equal(purchase(g,'kit',1),false);
  const restored=readGarage(JSON.stringify(g));
  advanceGarage(restored,800,scoreParts([0,0,0,2,7,1,7,3,8]));
  assert.equal(levelOf(restored.points[0]),6);
  assert.equal(levelOf(restored.points[7]),1);assert.equal(restored.kits[1],false);
  advanceGarage(restored,800,scoreParts([7,7,7,2,3,1,0,4,8]));
  assert.equal(levelOf(restored.points[7]),3);assert.ok(restored.kits[1]);assert.equal(restored.orders[7],false);
});

test('driving the entire course changes only the distance record',()=>{
  const g=readGarage(null);
  for(const distance of [55,120,260,800])advanceGarage(g,distance);
  assert.deepEqual(g,{...readGarage(null),best:800});
  assert.deepEqual(readGarage(JSON.stringify(g)),g);
});
test('nitro boosts wheel motors, depletes, brakes take priority, and distance refills the tank',()=>{
  const runs=[false,true].map(nitro=>{
    const s=createSimulation({levels:[3,3,1,1,1,1,1,1],heightAt:()=>0});
    for(let i=0;i<120;i++)s.step();
    for(let i=0;i<145;i++)s.step(1,false,nitro);
    return s;
  });
  const [base,boost]=runs;
  assert.ok(boost.body.getLinearVelocity().x>base.body.getLinearVelocity().x+.5);
  for(let i=0;i<100;i++)boost.step(1,false,true);
  assert.equal(boost.nitroCharge,0);assert.equal(boost.boosting,false);
  for(let i=0;i<120;i++)boost.step(1);
  assert.ok(boost.nitroCharge>0);
  boost.step(1,true,true);assert.equal(boost.boosting,false);
});

test('career builds improve measured launch and speed; wheel fit changes the rim, contact ring and grip in place', () => {
  const speeds=[];
  for(const level of [1,5]){
    const levels=Array(6).fill(level);
    const sim=createSimulation({levels,heightAt:()=>0});
    for(let i=0;i<120;i++)sim.step();
    const oldTire=sim.tires[0], count=sim.world.getBodyCount(), joints=sim.world.getJointCount();
    const beforeX=sim.body.getPosition().x;
    sim.setPressure(1.8);
    sim.setBuild([level,level,level===1?5:1,level,level,level]);
    const tire=sim.tires[0];
    assert.equal(tire.rim,oldTire.rim);
    assert.notEqual(tire.nodes[0],oldTire.nodes[0]);
    assert.notEqual(tire.rimRadius,oldTire.rimRadius);
    assert.notEqual(tire.outerRadius,oldTire.outerRadius);
    assert.equal(tire.rim.getFixtureList().getShape().getRadius(),tire.rimRadius);
    assert.equal(tire.inflationBar,1.8);
    assert.equal(sim.body.getPosition().x,beforeX);
    assert.equal(sim.world.getBodyCount(),count);
    assert.equal(sim.world.getJointCount(),joints);
    for(let i=0;i<60;i++)sim.step();
    assert.ok(tire.getContactWidth()>0);
    for(const node of tire.nodes){
      for(let edge=node.getContactList();edge;edge=edge.next){
        if(edge.other.isStatic() && edge.contact.isTouching())
          assert.ok(Math.abs(edge.contact.getFriction()-Math.sqrt(.95*(level===1?1.72:1.28)))<1e-8);
      }
    }
    sim.setPressure(2.2);
    sim.setBuild(levels);
    let launch;
    for(let i=1;i<=480;i++){sim.step(1); if(i===90)launch=sim.body.getLinearVelocity().x;}
    speeds.push([launch,sim.body.getLinearVelocity().x]);
  }
  assert.ok(speeds[1][0]>speeds[0][0]+.25,JSON.stringify(speeds));
  assert.ok(speeds[1][1]>speeds[0][1]+2,JSON.stringify(speeds));
});

test('a spin resolves once on game time, ignores repeat presses and yields to manual input', () => {
  const slot = createDriveSlot(() => .99);
  assert.ok(slot.spin(10));
  assert.equal(slot.spin(10.5), false);
  slot.update(10.5, false);
  assert.equal(slot.phase, 'rolling');
  slot.update(10.5, false);
  assert.equal(slot.phase, 'rolling');
  slot.update(12, false);
  assert.equal(slot.phase, 'driving');
  assert.equal(slot.parts.length,9);
  slot.update(12, true);
  assert.equal(slot.phase, 'ready');
  assert.ok(slot.spin(13));
  slot.reset();
  slot.update(30, false);
  assert.equal(slot.phase, 'ready');
});

test('the shortest combination drives each transmission through ground contacts and expires', () => {
  for (const drive of ['fwd','rwd','awd']) {
    const slot = createDriveSlot(() => 0);
    const sim = createSimulation({ drive, levels:Array(6).fill(1) });
    slot.spin(0);
    let poweredSteps = 0;
    for (let i=0; i<12/STEP; i++) {
      slot.update(sim.elapsed, false);
      const power = Number(slot.phase === 'driving');
      poweredSteps += power;
      sim.step(power, false);
    }
    assert.ok(Math.abs(poweredSteps * STEP - slot.result.seconds) <= STEP);
    assert.equal(slot.phase, 'ready');
    assert.ok(sim.body.getPosition().x > 8, drive);
  }
});

test('the stock car rolls back on the first rise; the next build clears it under power',()=>{
  for(const level of [1,2]){
    const sim=createSimulation({levels:Array(8).fill(level)});
    for(let i=0;i<120;i++)sim.step();
    assert.equal(sim.tires[0].outerRadius,level===1?.305:.315);
    let peak=0,rollback=0;
    for(let i=0;i<16/STEP;i++){
      sim.step(1);
      const x=sim.body.getPosition().x;
      peak=Math.max(peak,x);rollback=Math.max(rollback,peak-x);
    }
    if(level===1){
      assert.ok(peak>14 && peak<17);
      assert.ok(rollback>1);
    }else assert.ok(peak>25);
  }
});

test('tires change grip and rolling geometry while wheel force, launch and speed ratings stay independent',()=>{
  const stock=Array(8).fill(1), base=buildSpec(stock);
  for(let grade=2;grade<=8;grade++){
    const levels=[...stock];levels[2]=grade;
    const spec=buildSpec(levels);
    for(const key of ['driveForce','powerKW','topSpeed','torque'])assert.equal(spec[key],base[key]);
    assert.ok(spec.friction>base.friction);
    assert.ok(Math.abs(spec.fittedTorque/spec.tireRadius-base.driveForce)<1e-9);
    assert.ok(Math.abs(spec.launch*spec.tireRadius-base.launch*base.tireRadius)<1e-9);
    assert.ok(Math.abs(spec.wheelSpeed*spec.tireRadius-base.topSpeed)<1e-9);
  }
  const engine=buildSpec([2,1,1,1,1]),gearbox=buildSpec([1,2,1,1,1]);
  assert.ok(engine.powerKW>base.powerKW && engine.driveForce>base.driveForce);
  assert.equal(engine.topSpeed,base.topSpeed);
  assert.equal(gearbox.powerKW,base.powerKW);assert.equal(gearbox.driveForce,base.driveForce);
  assert.ok(gearbox.topSpeed>base.topSpeed);
  const runs=[1,8].map(grade=>{
    const sim=createSimulation({levels:[1,1,grade,1,1],heightAt:()=>0});
    for(let i=0;i<120;i++)sim.step();
    let launch;
    for(let i=1;i<=720;i++){sim.step(1);if(i===120)launch=sim.body.getLinearVelocity().x;}
    assert.ok(sim.wheelPowerKW>0);
    assert.ok(sim.launchSeconds>2 && sim.launchSeconds<5);
    const launchTime=sim.launchSeconds;
    sim.step(0,true);assert.equal(sim.wheelPowerKW,0);
    assert.equal(sim.launchSeconds,launchTime);
    sim.setBuild([2,1,grade,1,1]);
    assert.equal(sim.launchSeconds,null);
    sim.step(1);assert.equal(sim.launchSeconds,null);
    return [launch,sim.body.getLinearVelocity().x];
  });
  assert.ok(Math.abs(runs[0][0]-runs[1][0])<.12,JSON.stringify(runs));
  assert.ok(Math.abs(runs[0][1]-runs[1][1])<.12,JSON.stringify(runs));
});

test('the 0–100 clock records the physical crossing from rest on a fully tuned car',()=>{
  const levels=Array(8).fill(8),kits=[true,true,true];
  const sim=createSimulation({levels,kits});
  for(let i=0;i<120;i++)sim.step();
  const start=sim.elapsed, target=100/3.6;
  for(let i=0;i<35/STEP;i++){
    const before=sim.body.getLinearVelocity().x, elapsed=sim.elapsed-start;
    assert.equal(sim.hundredSeconds,null);
    sim.step(1);
    const after=sim.body.getLinearVelocity().x;
    if(after<target)continue;
    const expected=elapsed+STEP*(target-before)/(after-before);
    assert.ok(Math.abs(expected-sim.hundredSeconds)<1e-8);
    assert.ok(sim.launchSeconds<sim.hundredSeconds);
    sim.setBuild([...levels],[...kits]);
    sim.step(0,true);
    assert.ok(Math.abs(expected-sim.hundredSeconds)<1e-8);
    sim.setBuild([7,...levels.slice(1)],kits);
    assert.equal(sim.hundredSeconds,null);
    return;
  }
  assert.fail('top build did not reach 100 km/h');
});

test('rated crank power and integrated driven-axle work use distinct physical units',()=>{
  for(let level=1;level<=8;level++){
    const spec=buildSpec(Array(8).fill(level));
    assert.equal(spec.powerKW,spec.ratedTorque*spec.ratedRPM*(2*Math.PI/60)/1000);
    assert.ok(spec.powerKW>=21 && spec.powerKW<130);
  }
  const sim=createSimulation({levels:Array(8).fill(1),drive:'rwd',heightAt:()=>0});
  for(let i=0;i<120;i++)sim.step();
  assert.equal(sim.wheelPowerKW,0);
  assert.ok(Math.abs(sim.engineRPM-850)<1);
  let previousAngle=0,work=0;
  const motor=sim.motors[0];
  sim.world.on('pre-step',()=>{previousAngle=motor.getJointAngle();});
  sim.world.on('post-step',dt=>{
    work+=motor.getMotorTorque(1/dt)*(motor.getJointAngle()-previousAngle);
  });
  let measured=0;
  for(let i=0;i<300;i++){sim.step(1);measured+=sim.wheelPowerKW*1000*STEP;}
  assert.ok(sim.engineRPM>1500);
  assert.ok(work>50 && Math.abs(measured-work)<.025*work);
  sim.step(0,true);assert.equal(sim.wheelPowerKW,0);
});
