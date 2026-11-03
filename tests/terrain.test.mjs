import test from 'node:test';
import assert from 'node:assert/strict';
import {createSimulation} from '../src/physics.js';
import {groundHeight} from '../src/terrain.js';
test('rendered terrain interpolates the actual collider segments',()=>{
 const s=createSimulation();for(let i=1;i<s.points.length;i++){const a=s.points[i-1],b=s.points[i];for(const t of [0,.2,.5,.9,1])assert.ok(Math.abs(groundHeight(a.x+(b.x-a.x)*t)-(a.y+(b.y-a.y)*t))<1e-9);}
});
