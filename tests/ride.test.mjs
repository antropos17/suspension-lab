import test from 'node:test';
import assert from 'node:assert/strict';
import {createSimulation,STEP} from '../src/physics.js';
import {createExhaust} from '../src/exhaust.js';
const run=(s,t)=>{for(let i=0;i<t/STEP;i++)s.step();};
test('road setup yields under load and recovers without persistent bouncing',()=>{
 const s=createSimulation();run(s,3);const rest=s.joints[0].getJointTranslation();
 for(let i=0;i<1/STEP;i++){s.body.applyLinearImpulse({x:0,y:-1000*STEP},s.body.getWorldCenter(),true);s.step();}
 assert.ok(s.joints[0].getJointTranslation()-rest>.008,'free suspension travel must remain available');
 run(s,4);assert.ok(Math.abs(s.joints[0].getJointTranslation()-rest)<.003);
 assert.ok(Math.abs(s.body.getLinearVelocity().y)<.02);
});
test('exhaust hangers react to a chassis shock, remain bounded, then settle',()=>{
 const s=createSimulation();run(s,4);const idle=Math.abs(s.exhaustMount.offset);
 s.body.applyLinearImpulse({x:0,y:s.body.getMass()*.8},s.body.getWorldCenter(),true);
 let peak=0;for(let i=0;i<120;i++){s.step();peak=Math.max(peak,Math.abs(s.exhaustMount.offset));}
 assert.ok(peak>idle*3&&peak>.005);assert.ok(peak<=.045);
 run(s,4);assert.ok(Math.abs(s.exhaustMount.offset)<.005);
});
test('fresh smoke is emitted from the moving pipe tip',()=>{
 const s=createSimulation(),e=createExhaust(()=>.5);e.setIntensity(6);let observed=0;
 for(let i=0;i<120;i++){s.step(1);e.step(s,STEP);const p=e.particles.at(-1);if(p&&p.age===0){const tip=s.exhaustMount.point;assert.ok(Math.hypot(p.x-tip.x,p.y-tip.y)<1e-9);observed++;}}
 assert.ok(observed>10);
});


test('driving contacts are carried by deforming tread while the rigid rim stays off the road',()=>{
 const s=createSimulation();let tread=0,rim=0;
 s.world.on('begin-contact',c=>{const a=c.getFixtureA(),b=c.getFixtureB();if(!a.getBody().isStatic()&&!b.getBody().isStatic())return;const kind=a.getUserData()??b.getUserData();if(kind==='tread')tread++;if(kind==='rim')rim++;});
 for(let i=0;i<3/STEP;i++)s.step(i>1/STEP?1:0);
 assert.ok(tread>=2);assert.equal(rim,0);
 assert.ok(s.wheels.every(w=>w.getFixtureList().getShape().getRadius()<.3),'only the small rigid rim circle remains');
 assert.ok(s.body.getPosition().x>5,'tread friction transfers rim torque into vehicle motion');
});
