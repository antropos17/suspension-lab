import test from 'node:test';
import assert from 'node:assert/strict';
import {createSnapshotPlayback} from '../src/snapshot-playback.js';
import {createSimulation} from '../src/physics.js';
import {snapshot} from '../src/physics-host.js';
import {STEP} from '../src/vehicle-constants.js';

const initial=snapshot(createSimulation());
// Independent constant-speed reference: real-time position must follow x=v*t,
// even when multiple fixed-step states arrive together with delivery jitter.
function frame(t){
 const s=structuredClone(initial),dx=10*t;s.elapsed=t;
 s.body.position.x+=dx;s.body.velocity.x=10;s.body.angle=t*.1;
 for(let i=0;i<2;i++){
  s.wheels[i].position.x+=dx;s.wheels[i].angle=20*t;s.rims[i].x+=dx;
  for(const p of s.tires[i].nodes)p.x+=dx;
 }
 s.exhaustMount.point.x+=dx;return s;
}

test('batched jittered snapshots produce continuous bounded motion at 60 and 144 Hz',()=>{
 for(const hz of [60,144]){
  const playback=createSnapshotPlayback();playback.reset(frame(0));
  const packets=[];let latest=0;
  for(let i=0;i<60;i++){
   const batch=[];for(let j=0;j<4;j++)batch.push(frame(++latest*STEP));
   // Arrivals vary by 8 ms, while the physical states retain fixed timestamps.
   packets.push({arrival:latest*STEP+.006+(i%3)*.004,batch});
  }
  const deltas=[];let previous=0;
  for(let tick=0;tick<hz*1.8;tick++){
   const now=tick/hz;
   while(packets.length&&packets[0].arrival<=now)playback.push(packets.shift().batch);
   playback.advance(1/hz);const x=playback.state.body.position.x-initial.body.position.x;
   if(now>.2)deltas.push(x-previous);previous=x;
   assert.ok(Math.abs(x-10*playback.state.elapsed)<1e-9,'render pose and clock share one interpolation');
   const wheel=playback.state.wheels[0];
   assert.ok(Math.abs(wheel.angle-20*playback.state.elapsed)<1e-9,'rim rotation shares the same clock');
   assert.ok(playback.size<=32);
  }
  assert.ok(Math.min(...deltas)>10/hz*.9,'no held frames between packets');
  assert.ok(Math.max(...deltas)<10/hz*1.04,'no packet-sized jumps');
  assert.equal(playback.holds,0);
 }
});

test('arrival alone cannot move the view; stalls, reset and node interpolation stay bounded',()=>{
 const playback=createSnapshotPlayback();playback.reset(frame(0));
 playback.push([frame(STEP),frame(2*STEP),frame(3*STEP),frame(4*STEP),frame(5*STEP),frame(6*STEP)]);
 assert.equal(playback.state.elapsed,0,'packet arrival must not move the car');
 playback.advance(STEP);playback.advance(STEP/2);
 assert.ok(Math.abs(playback.state.elapsed-STEP/2)<1e-10);
 assert.ok(Math.abs(playback.state.tires[1].nodes[3].x-initial.tires[1].nodes[3].x-10*STEP/2)<1e-10);
 for(let i=0;i<60;i++)playback.advance(1/60);
 assert.ok(playback.state.elapsed<=6*STEP,'never extrapolate beyond physical evidence');
 const before=playback.state.body.position.x;
 playback.push([frame(7*STEP),frame(8*STEP),frame(9*STEP),frame(10*STEP),frame(11*STEP),frame(12*STEP)]);
 assert.equal(playback.state.body.position.x,before,'late packets do not teleport the pose');
 playback.advance(1/144);assert.ok(playback.state.body.position.x-before<=10/144*1.04);
 playback.reset(frame(0));assert.equal(playback.state.elapsed,0);assert.equal(playback.size,1);assert.equal(playback.holds,0);
});
