import test from 'node:test';
import assert from 'node:assert/strict';
import { tirePoint } from '../src/wheel-shape.js';
test('loaded rubber has a flat contact patch while an unloaded tire is round',()=>{
  const r=.48,d=.08;
  const lower=[Math.PI*.35,Math.PI*.5,Math.PI*.65].map(a=>tirePoint(a,r,d));
  assert.ok(lower.every(p=>Math.abs(p.y-(r-d))<1e-8));
  for(let i=0;i<64;i++){const p=tirePoint(i*Math.PI/32,r,0);assert.ok(Math.abs(Math.hypot(p.x,p.y)-r)<1e-8);}
  assert.equal(tirePoint(-Math.PI/2,r,d).y,-r);
});
