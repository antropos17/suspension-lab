import test from 'node:test';
import assert from 'node:assert/strict';
import { createDriveSlot, scoreParts } from '../src/drive-slot.js';
import { createSimulation, STEP } from '../src/physics.js';
import { readGarage, fitParts, levelOf, advanceGarage, purchase } from '../src/garage.js';

test('3x3 recognises all eight paylines, scatter rewards and mechanical synergies',()=>{
  const square=scoreParts(Array(9).fill(0));
  assert.equal(square.lines.length,8);assert.equal(square.seconds,9.5);
  const cross=scoreParts([8,0,9,0,8,9,1,2,8]);
  assert.deepEqual(cross.lines,[[0,4,8]]);
  assert.equal(cross.coins,64);assert.equal(cross.gems,2);
  const parts=scoreParts([0,1,0,1,0,5,6,7,6]);
  assert.equal(parts.gains[0],7);assert.equal(parts.gains[1],3);
  assert.equal(scoreParts([0,1,2,3,4,5,6,7,8]).seconds,2);
});

test('a hold keeps all three cells in one column, and rolls settle exactly once',()=>{
  let choice=0;
  const slot=createDriveSlot(()=>choice);
  slot.spin(0);assert.equal(slot.spin(.3),false);slot.update(.5,true);
  assert.equal(slot.update(2,false).count,9);assert.equal(slot.phase,'ready');
  assert.equal(slot.update(3,false),undefined);
  slot.hold(1);choice=.99;slot.spin(4);
  assert.deepEqual(slot.parts,[9,0,9,9,0,9,9,0,9]);
  slot.reset();assert.equal(slot.update(9,false),undefined);
});

test('migration keeps old levels and records; wallet purchases have exact prices and bounded permanent effects',()=>{
  const g=readGarage(JSON.stringify({points:[20,12,6,2,0,20],best:84}));
  assert.deepEqual(g.points.map(levelOf),[5,4,3,2,1,5,1,1]);assert.equal(g.best,84);
  assert.equal(purchase(g,'part',0),null);assert.equal(purchase(g,'kit',0),null);
  g.coins=30;g.gems=4;
  assert.equal(purchase(g,'part',6)[6].to,2);assert.equal(g.coins,0);
  assert.ok(purchase(g,'kit',1));assert.equal(g.gems,0);assert.equal(g.kits[1],true);
  g.gems=10;assert.equal(purchase(g,'kit',1),null);assert.equal(g.gems,10);
  assert.deepEqual(readGarage(JSON.stringify(g)),g);
  fitParts(g,Array(8).fill(100));g.coins=500;
  assert.equal(purchase(g,'part',5),null);assert.equal(g.coins,500);
});

test('checkpoint and spin currencies stack once and survive reloading',()=>{
  const g=readGarage(null);
  advanceGarage(g,55,scoreParts([0,0,1,2,3,4,5,8,9]));
  assert.deepEqual(g.points,[2,0,1,1,0,0,0,0]);assert.equal(g.coins,29);assert.equal(g.gems,2);
  const restored=readGarage(JSON.stringify(g));advanceGarage(restored,55);
  assert.deepEqual(restored,g);
  advanceGarage(restored,260);
  assert.deepEqual(restored.points,[5,3,3,3,2,2,3,2]);
});

test('nitro boosts wheel motors, depletes, brakes take priority, and distance refills the tank',()=>{
  const runs=[false,true].map(nitro=>{
    const s=createSimulation({levels:Array(8).fill(1),heightAt:()=>0});
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

test('career builds improve measured launch and speed; fitting wheels updates existing contact friction', () => {
  const speeds=[];
  for(const level of [1,5]){
    const levels=Array(6).fill(level);
    const sim=createSimulation({levels,heightAt:()=>0});
    for(let i=0;i<120;i++)sim.step();
    const tread=sim.tires.flatMap(t=>t.nodes).find(n=>n.getContactList()?.contact.isTouching());
    const contact=tread.getContactList().contact;
    const before=contact.getFriction();
    sim.setBuild([level,level,level===1?5:1,level,level,level]);
    assert.notEqual(contact.getFriction(),before);
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
  assert.deepEqual(slot.parts, Array(9).fill(9));
  assert.equal(slot.spin(12), false);
  slot.update(12, true);
  assert.equal(slot.phase, 'ready');
  assert.ok(slot.spin(13));
  slot.reset();
  slot.update(30, false);
  assert.equal(slot.phase, 'ready');
});

test('the shortest combination drives each transmission through ground contacts and expires', () => {
  for (const drive of ['fwd','rwd','awd']) {
    let index = 0;
    const slot = createDriveSlot(() => (index++ + .5) / 10);
    const sim = createSimulation({ drive, levels:Array(6).fill(1) });
    slot.spin(0);
    let poweredSteps = 0;
    for (let i=0; i<5/STEP; i++) {
      slot.update(sim.elapsed, false);
      const power = Number(slot.phase === 'driving');
      poweredSteps += power;
      sim.step(power, false);
    }
    assert.ok(Math.abs(poweredSteps * STEP - 2) <= STEP);
    assert.equal(slot.phase, 'ready');
    assert.ok(sim.body.getPosition().x > 8, drive);
  }
});
