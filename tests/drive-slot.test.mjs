import test from 'node:test';
import assert from 'node:assert/strict';
import { createDriveSlot, scoreParts } from '../src/drive-slot.js';
import { createSimulation, STEP } from '../src/physics.js';
import { readGarage, fitParts, levelOf, advanceGarage } from '../src/garage.js';

test('all groups and compatible assemblies pay their own parts', () => {
  assert.deepEqual(scoreParts([0,1,2,3,4,5]).gains,[1,1,1,1,1,1]);
  assert.deepEqual(scoreParts([3,1,2,3,1,4]).winners,[1,3]);
  assert.deepEqual(scoreParts([0,1,0,1,0,5]).gains,[7,3,0,0,0,0]);
  assert.match(scoreParts([0,1,0,1,0,5]).name,/Фулл-хаус/);
  assert.match(scoreParts([0,1,0,1,2,2]).name,/Три пары/);
  assert.equal(scoreParts([5,5,5,5,5,5]).seconds,9.5);
});

test('one held reel survives the next spin; a manually driven spin settles exactly once', () => {
  let choice = .01;
  const slot = createDriveSlot(()=>choice);
  slot.spin(0); slot.update(1,true);
  const reward = slot.update(2,false);
  assert.equal(reward.count,6); assert.equal(slot.phase,'ready');
  assert.equal(slot.update(3,false), undefined);
  slot.hold(2); slot.hold(4); choice = .99; slot.spin(4);
  assert.deepEqual(slot.parts,[5,5,5,5,0,5]);
});

test('saved garage levels survive reload, cap and recover from invalid saves', () => {
  const garage=readGarage('broken');
  const changes=fitParts(garage,[2,0,3,0,0,30]);
  assert.deepEqual(changes[0],{gain:2,from:1,to:2});
  assert.equal(levelOf(garage.points[5]),5);
  assert.deepEqual(readGarage(JSON.stringify(garage)),garage);
  assert.equal(fitParts(garage,[0,0,0,0,0,30])[5].gain,0);
});

test('road prizes stack with the matching roll and surviving records cannot pay twice', () => {
  const garage = readGarage(null);
  advanceGarage(garage,55,scoreParts([0,0,1,2,3,4]));
  assert.deepEqual(garage.points,[2,0,1,1,0,0]);
  const next = readGarage(JSON.stringify(garage));
  advanceGarage(next,10); advanceGarage(next,55);
  assert.deepEqual(next,garage);
  advanceGarage(next,260);
  assert.deepEqual(next.points,[5,3,3,3,2,2]);
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
  assert.deepEqual(slot.parts, [5,5,5,5,5,5]);
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
    const slot = createDriveSlot(() => (index++ + .5) / 6);
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
