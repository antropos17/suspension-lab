import test from 'node:test';
import assert from 'node:assert/strict';
import {createSimulation} from '../src/physics.js';
import { FINISH } from '../src/vehicle-constants.js';
import {groundHeight,terrainHeight,materialAt,BRIDGES,HUMPS} from '../src/terrain.js';
import {readGarage,claimRoadStops,purchase} from '../src/garage.js';
test('rendered terrain interpolates the actual collider segments',()=>{
 const s=createSimulation();assert.ok(s.points.at(-1).x>FINISH+3);for(let i=1;i<s.points.length;i++){const a=s.points[i-1],b=s.points[i];for(const t of [0,.2,.5,.9,1])assert.ok(Math.abs(groundHeight(a.x+(b.x-a.x)*t)-(a.y+(b.y-a.y)*t))<1e-9);}
});

test('road stops pay once across replay and reload, without installing parts',()=>{
 const garage=readGarage('{"best":800}');
 assert.equal(garage.roadStops,0);
 assert.deepEqual(claimRoadStops(garage,12),{coins:30,gems:0});
 assert.ok(purchase(garage,'part',0));
 const saved=readGarage(JSON.stringify(garage));
 assert.deepEqual(claimRoadStops(saved,12),{coins:0,gems:0});
 assert.deepEqual(saved.points,Array(8).fill(0));assert.ok(saved.orders[0]);
 assert.deepEqual(claimRoadStops(saved,80),{coins:44,gems:1});
});

test('at road contact water and mud create spray; only mud deposits soil',()=>{
 for(const [a,b] of BRIDGES)assert.ok(Math.abs(terrainHeight((a+b)/2)-(terrainHeight(a)+terrainHeight(b))/2)<1e-8);
 assert.ok(HUMPS.length>0);
 assert.equal(materialAt(8),'water');assert.equal(materialAt(27),'mud');
 const s=createSimulation({levels:Array(8).fill(4)});
 let water=false,dirty=0,washed=false;
 for(let i=0;i<2200 && s.body.getPosition().x<52;i++){
   s.step(1);
   if(s.wetKind.includes('water')&&s.spray.some(n=>n>.01)){
     if(dirty===0)water=true;
     else if(s.dirt<dirty-.005)washed=true;
   }
   dirty=Math.max(dirty,s.dirt);
 }
 assert.ok(water && dirty>.02 && washed,JSON.stringify({water,dirty,washed,x:s.body.getPosition().x}));
});

test('the same launch travels less on a muddy bed than on its dry duplicate',()=>{
 const results=[false,true].map(mud=>{
   const sim=createSimulation({heightAt:mud?terrainHeight:x=>terrainHeight(x),levels:[3,3,1,1,1],drive:'rwd'});
   for(let i=0;i<120;i++)sim.step();
   for(let body=sim.world.getBodyList();body;body=body.getNext()){
     if(!body.isDynamic())continue;
     const p=body.getPosition();
     body.setPosition({x:p.x+24.2,y:p.y+groundHeight(27.2)});
   }
   for(let i=0;i<150;i++)sim.step(0,true);
   const start=sim.body.getPosition().x;
   for(let i=0;i<100;i++)sim.step(1);
   return {travel:sim.body.getPosition().x-start,speed:sim.body.getLinearVelocity().x};
 });
 const [dry,mud]=results;
 assert.ok(mud.travel>0 && mud.travel<dry.travel*.93);
 assert.ok(mud.speed<dry.speed*.90);
});
