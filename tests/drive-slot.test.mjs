import test from 'node:test';
import assert from 'node:assert/strict';
import { createDriveSlot, scoreParts } from '../src/drive-slot.js';
import { createSimulation, STEP } from '../src/physics.js';

test('six reels score the most frequent part anywhere, including ties and no match', () => {
  assert.deepEqual(scoreParts([0,1,2,3,4,5]), { count:1, winners:[], seconds:2 });
  assert.deepEqual(scoreParts([3,1,2,3,1,4]), { count:2, winners:[1,3], seconds:3.5 });
  assert.deepEqual(scoreParts([5,5,5,5,5,5]), { count:6, winners:[5], seconds:9.5 });
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
    const sim = createSimulation({ drive });
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
