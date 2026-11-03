import test from 'node:test';
import assert from 'node:assert/strict';
import { createExhaust } from '../src/exhaust.js';
const simulation=(gas,load)=>({accelerator:gas,engineLoad:load,body:{
  getWorldPoint:p=>p,getWorldVector:p=>p,getLinearVelocityFromWorldPoint:()=>({x:0,y:0})
}});
test('loaded exhaust is denser and darker than idle, with a bounded particle lifetime',()=>{
  const idle=createExhaust(()=>.5),loaded=createExhaust(()=>.5);
  for(let i=0;i<360;i++){idle.step(simulation(0,0),1/120);loaded.step(simulation(1,1),1/120);}
  assert.ok(loaded.particles.length>idle.particles.length*3);
  assert.ok(loaded.particles.some(p=>p.dark>.4));
  assert.ok(idle.particles.every(p=>p.dark<.1));
  assert.ok(loaded.soot>idle.soot);
  for(let i=0;i<3600;i++)loaded.step(simulation(1,1),1/120);
  assert.ok(loaded.particles.length<=420);
  assert.ok(loaded.particles.every(p=>p.age<p.life && Number.isFinite(p.x)));
});
test('soot slider controls emission and zero stops new particles',()=>{
  const low=createExhaust(()=>.5),high=createExhaust(()=>.5),off=createExhaust(()=>.5);
  low.setIntensity(1);high.setIntensity(6);off.setIntensity(0);
  for(let i=0;i<240;i++)for(const effect of [low,high,off])effect.step(simulation(1,.4),1/120);
  assert.equal(off.particles.length,0);
  assert.ok(high.particles.length>low.particles.length*3);
  assert.ok(high.soot>low.soot);
});
