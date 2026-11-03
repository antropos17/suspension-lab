import {Vec2,Circle,DistanceJoint} from 'planck';

export const ATMOSPHERE=101325, TIRE_RADIUS=.48, RIM_RADIUS=.245;
// 2D pneumatic carcass. Rigid contact beads are elastically linked, not a rigid
// tire collider. Gas work is p*dV with V=width*(polygon area - rim area).
export function createPneumaticTire(world,rim,{pressure=2.2,count=32}={}){
 const skin=.048, radius=TIRE_RADIUS-skin, width=.18, mass=24;
 const nodes=[],links=[],referenceArea=count*.5*radius**2*Math.sin(2*Math.PI/count);
 const rimArea=Math.PI*RIM_RADIUS**2,referenceVolume=(referenceArea-rimArea)*width;
 let inflation=pressure;
 const group=-2; // tire nodes do not collide with one another or the rim
 const link=(a,b,anchorA,anchorB,hz,damping,length)=>{
  const j=world.createJoint(new DistanceJoint({frequencyHz:hz,dampingRatio:damping,collideConnected:false},a,b,anchorA,anchorB));
  if(length!==undefined)j.setLength(length);links.push(j);return j;
 };
 for(let i=0;i<count;i++){
  const angle=i*2*Math.PI/count,p=rim.getWorldPoint(Vec2(radius*Math.cos(angle),radius*Math.sin(angle)));
  const n=world.createDynamicBody({position:p,fixedRotation:true,bullet:true});
  n.createFixture(new Circle(skin),{density:mass/count/(Math.PI*skin**2),friction:1.5,restitution:0,filterGroupIndex:group,filterCategoryBits:2,filterMaskBits:5,userData:'tread'});
  nodes.push(n);
  const bead=rim.getWorldPoint(Vec2(RIM_RADIUS*Math.cos(angle),RIM_RADIUS*Math.sin(angle)));
  link(rim,n,bead,p,10,.65);
  for(const side of [-1,1]){
   const q=rim.getWorldPoint(Vec2(RIM_RADIUS*Math.cos(angle+side*.5),RIM_RADIUS*Math.sin(angle+side*.5)));
   link(rim,n,q,p,16,.65);
  }
 }
 // Prestressed belt balances the nominal 2.2 bar pressure at the rest radius.
 // Stiffness scales with segment length, preserving belt strain as count changes.
 const chord=2*radius*Math.sin(Math.PI/count),tension=2.2e5*width*radius;
 const k=tension/(chord*.035),effectiveMass=mass/count/2;
 for(let i=0;i<count;i++){
  const a=nodes[i],b=nodes[(i+1)%count];
  link(a,b,a.getPosition(),b.getPosition(),Math.sqrt(k/effectiveMass)/(2*Math.PI),.35,chord*.965);
  const c=nodes[(i+2)%count];link(a,c,a.getPosition(),c.getPosition(),22,.4);
 }
 const polygonArea=()=>{
  // Translation-relative coordinates avoid cancellation far along the course.
  const h=rim.getPosition();let sum=0;
  for(let i=0;i<count;i++){const a=nodes[i].getPosition(),b=nodes[(i+1)%count].getPosition();sum+=(a.x-h.x)*(b.y-h.y)-(b.x-h.x)*(a.y-h.y);}
  return sum*.5;
 };
 const gasPressure=()=>{
  const volume=Math.max(referenceVolume*.15,(polygonArea()-rimArea)*width);
  return Math.max(0,(ATMOSPHERE+inflation*1e5)*referenceVolume/volume-ATMOSPHERE);
 };
 return {rim,nodes,skin,width,referenceArea,referenceVolume,links,
  get area(){return polygonArea();},get pressureBar(){return gasPressure()/1e5;},
  get inflationBar(){return inflation;},
  setPressure(bar){if(Number.isFinite(bar))inflation=Math.max(.6,Math.min(3.2,bar));nodes.forEach(n=>n.setAwake(true));rim.setAwake(true);},
  applyPressure(){
   const p=gasPressure();
   // Area gradient on a closed CCW polygon: total force and torque cancel.
   // Internal pressure reaches the rim through the sidewall constraints.
   for(let i=0;i<count;i++){
    const prev=nodes[(i+count-1)%count].getPosition(),next=nodes[(i+1)%count].getPosition();
    nodes[i].applyForceToCenter(Vec2(p*width*(next.y-prev.y)*.5,p*width*(prev.x-next.x)*.5),true);
   }
  },
  getContactWidth(){const xs=[];for(const node of nodes)for(let e=node.getContactList();e;e=e.next)if(e.other.isStatic()&&e.contact.isTouching()){xs.push(node.getPosition().x);break;}return xs.length?Math.max(...xs)-Math.min(...xs)+skin*2:0;},
  getDeflection(){return TIRE_RADIUS-(rim.getPosition().y-Math.min(...nodes.map(n=>n.getPosition().y-skin)));},
  getOutline(){return nodes.map((n,i)=>{const prev=nodes[(i+count-1)%count].getPosition(),next=nodes[(i+1)%count].getPosition(),p=n.getPosition();const dx=next.x-prev.x,dy=next.y-prev.y,len=Math.hypot(dx,dy)||1;return {x:p.x+dy/len*skin,y:p.y-dx/len*skin};});}
 };
}

