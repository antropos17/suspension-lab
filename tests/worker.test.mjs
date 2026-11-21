import test from 'node:test';
import assert from 'node:assert/strict';
import {Worker} from 'node:worker_threads';
import {once} from 'node:events';
import {createSimulation} from '../src/physics.js';
import {createPhysicsHost,snapshot} from '../src/physics-host.js';
import {createSimulationClient} from '../src/simulation-client.js';
import {STEP} from '../src/vehicle-constants.js';
const config={frequency:1.7,damping:.5,drive:'awd',pressure:2.2};

test('worker runs the unchanged solver and preserves every contact-node position',async()=>{
 const worker=new Worker(new URL('./fixtures/physics-worker.mjs',import.meta.url));
 const request=async message=>{const reply=once(worker,'message');worker.postMessage(message);return (await reply)[0];};
 try{
  const direct=createSimulation(config);
  let reply=await request({type:'reset',generation:1,settings:config});
  assert.deepEqual(reply.state,snapshot(direct));
  for(const drive of ['awd','fwd','rwd']){
   direct.setDrive(drive);
   for(let i=0;i<12;i++){
    reply=await request({type:'step',generation:1,settings:{...config,drive},steps:6,throttle:1,brake:false});
    assert.equal(reply.frames.length,6,'preserve every fixed step for render interpolation');
    for(let j=1;j<6;j++)assert.ok(Math.abs(reply.frames[j].elapsed-reply.frames[j-1].elapsed-STEP)<1e-10);
    for(let j=0;j<6;j++)direct.step(1,false);
   }
   assert.deepEqual(reply.state,snapshot(direct));
  }
  direct.setPressure(.6);direct.tune(1.3,.4);direct.step(0,true);
  reply=await request({type:'step',generation:1,settings:{...config,drive:'rwd',pressure:.6,frequency:1.3,damping:.4},steps:1,throttle:0,brake:true});
  assert.deepEqual(reply.state,snapshot(direct));
  const upgraded = [3,2,4,2,5,3];
  direct.setBuild(upgraded); direct.step(1);
  reply=await request({type:'step',generation:1,settings:{...config,drive:'rwd',pressure:.6,frequency:1.3,damping:.4,levels:upgraded},steps:1,throttle:1,brake:false});
  assert.deepEqual(reply.state,snapshot(direct),'the live build reaches the worker without resetting the car');
  const levels=Array(8).fill(8), kits=[true,true,true];
  direct.setBuild(levels,kits);direct.step(1,false,true);
  reply=await request({type:'step',generation:1,settings:{...config,drive:'rwd',pressure:.6,frequency:1.3,damping:.4,levels,kits},steps:1,throttle:1,nitro:true});
  assert.deepEqual(reply.state,snapshot(direct),'nitro, maximum levels and kits hot-fit through the worker');
  assert.ok(reply.state.boosting && reply.state.nitroCharge<1);
 }finally{await worker.terminate();}
});

test('client bounds queued work, discards old resets and forwards latest drive/pressure',()=>{
 const sent=[],worker={postMessage:m=>sent.push(structuredClone(m)),terminate(){}};
 const client=createSimulationClient(worker);
 let reply;const host=createPhysicsHost(m=>{reply=m;});
 client.reset(config);host(sent.shift());worker.onmessage({data:reply});
 assert.equal(client.ready,true);
 assert.equal(client.tires[0].nodes.length,32);
 assert.deepEqual(client.body.getWorldPoint({x:0,y:0}),reply.state.body.position);
 client.advance(STEP,1,false);
 for(let i=0;i<1000;i++)client.advance(10,-1,true);
 assert.equal(sent.length,1,'only one job in flight');
 host(sent.shift());const stale=reply;worker.onmessage({data:reply});
 client.setDrive('fwd');client.setPressure(.6);client.advance(0,-1,true);
 assert.equal(sent[0].steps,6,'backlog is at most 50 ms');
 assert.equal(sent[0].throttle,-1);assert.equal(sent[0].brake,true);
 assert.equal(sent[0].settings.drive,'fwd');assert.equal(sent[0].settings.pressure,.6);
 client.reset(config);worker.onmessage({data:stale});
 assert.equal(client.ready,false,'old snapshot cannot finish a new reset');
 host(sent.shift());worker.onmessage({data:reply});assert.equal(client.ready,false);
 host(sent.shift());worker.onmessage({data:reply});assert.equal(client.ready,true);
 assert.equal(client.elapsed,0);
 client.advance(.001,1,false);client.suspend();client.advance(.001,1,false);assert.equal(sent.length,0);
 worker.onerror({message:'test worker failure'});assert.equal(client.error,'test worker failure');assert.equal(client.ready,false);
});

test('worker completion immediately drains bounded input accumulated between display frames',async()=>{
 const sent=[],worker={postMessage:m=>sent.push(m),terminate(){}};
 const client=createSimulationClient(worker);
 let reply;const host=createPhysicsHost(m=>{reply=m;});
 client.reset(config);host(sent.shift());worker.onmessage({data:reply});
 client.advance(STEP,1,false);const first=sent.shift();
 client.advance(STEP*2,-1,true);
 assert.equal(sent.length,0);
 host(first);worker.onmessage({data:reply});
 await Promise.resolve();
 assert.deepEqual(sent.map(({steps,throttle,brake})=>[steps,throttle,brake]),[[2,-1,true]]);
 client.advance(STEP*2,1,false);
 const second=sent.shift();host(second);worker.onmessage({data:reply});client.suspend();
 await Promise.resolve();assert.equal(sent.length,0);
});
