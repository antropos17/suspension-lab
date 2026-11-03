import assert from 'node:assert/strict';
import {World,Vec2,Circle,Edge,DistanceJoint,PrismaticJoint} from 'planck';

// Experimental elastic ring: actual moving ground-contact bodies, no visual shape.
// Not a pneumatic tire: pressure/area conservation and a vehicle integration remain.
function bench(loadKg,{dt=1/480,count=32}={}){
 const world=new World(Vec2(0,-9.81)),ground=world.createBody();
 ground.createFixture(new Edge(Vec2(-3,0),Vec2(3,0)),{friction:.9});
 const hub=world.createDynamicBody(Vec2(0,.8));
 hub.createFixture(new Circle(.23),{density:loadKg/(Math.PI*.23**2),friction:.8,filterGroupIndex:-1});
 world.createJoint(new PrismaticJoint({enableLimit:false,collideConnected:true},ground,hub,hub.getPosition(),Vec2(0,1)));
 const nodes=[],radius=.44,skin=.04;
 for(let i=0;i<count;i++){
  const a=i*2*Math.PI/count,p=Vec2(radius*Math.cos(a),.8+radius*Math.sin(a));
  const node=world.createDynamicBody({position:p,fixedRotation:true});
  node.createFixture(new Circle(skin),{density:(16/count)/(Math.PI*skin**2),friction:.9,restitution:0,filterGroupIndex:-1});
  nodes.push(node);
  const bead=hub.getWorldPoint(Vec2(.23*Math.cos(a),.23*Math.sin(a)));
  world.createJoint(new DistanceJoint({frequencyHz:35,dampingRatio:.7,collideConnected:false},hub,node,bead,p));
  // Offset links resist shear and transmit rim torque; one radial link cannot.
  for(const sign of [-1,1]){
   const q=hub.getWorldPoint(Vec2(.23*Math.cos(a+sign*.35),.23*Math.sin(a+sign*.35)));
   world.createJoint(new DistanceJoint({frequencyHz:18,dampingRatio:.6},hub,node,q,p));
  }
 }
 for(let i=0;i<count;i++)for(const hop of [1,2]){
  const a=nodes[i],b=nodes[(i+hop)%count];
  world.createJoint(new DistanceJoint({frequencyHz:hop===1?40:20,dampingRatio:.7},a,b,a.getPosition(),b.getPosition()));
 }
 let maxSpeed=0;
 for(let i=0;i<6/dt;i++){
  world.step(dt,16,8);
  for(const b of [hub,...nodes])assert.ok(Number.isFinite(b.getPosition().y),'finite physical state');
  if(i>5/dt)maxSpeed=Math.max(maxSpeed,Math.abs(hub.getLinearVelocity().y));
 }
 const bottom=nodes.map(b=>b.getPosition()).filter(p=>p.y<skin+.02);
 const patch=bottom.length>1?Math.max(...bottom.map(p=>p.x))-Math.min(...bottom.map(p=>p.x)):0;
 const deformation=Math.max(...nodes.map(b=>{const p=b.getPosition(),h=hub.getPosition();return Math.abs(Math.hypot(p.x-h.x,p.y-h.y)-radius);}));
 return {loadKg,hubHeight:hub.getPosition().y,deflection:.48-hub.getPosition().y,contactWidth:patch,deformation,maxSettledSpeed:maxSpeed,contactBodies:nodes.length,dt};
}
const light=bench(30),loaded=bench(100),finer=bench(100,{dt:1/960});
assert.ok(loaded.hubHeight<light.hubHeight-.005,'additional load must physically lower the hub');
assert.ok(loaded.deformation>light.deformation,'contact-body deformation increases under load');
assert.ok(loaded.contactWidth>=light.contactWidth,'contact patch must not shrink under load');
assert.ok(loaded.hubHeight>.25,'carcass must support the hub without rim bottoming at this test load');
assert.ok(loaded.maxSettledSpeed<.03,'loaded tire settles');
assert.ok(Math.abs(finer.hubHeight-loaded.hubHeight)<.015,'step halving must have bounded hub-height error');
console.log(JSON.stringify({model:'experimental Planck elastic contact ring; not integrated into the game',light,loaded,finer,stepHalvingError:Math.abs(finer.hubHeight-loaded.hubHeight)},null,2));
