import { World, Vec2, Edge, Box, Circle, Polygon, RevoluteJoint, PrismaticJoint } from 'planck';
import { terrainHeight, poolAt, materialAt, stationAt, YARD_WALL, GROUND_START, GROUND_STEP, GROUND_COUNT } from './terrain.js';
import { archPoint } from './vehicle-geometry.js';
import { createPneumaticTire, RIM_RADIUS } from './pneumatic-tire.js';
import { createExhaustMount } from './exhaust-mount.js';
import { buildSpec } from './garage.js';
export { terrainHeight } from './terrain.js';

import { STEP, TIRE_RADIUS, DRIVELINE_EFFICIENCY } from './vehicle-constants.js';
export { FINISH, STEP } from './vehicle-constants.js';
const GEAR_RATIOS=[13.2,8.1,5.55,4.05];

export function createSimulation({ frequency = 1.7, damping = .5, drive = 'awd', pressure = 2.2, nodeCount = 32, substeps = 8, heightAt = terrainHeight, levels, kits } = {}) {
  substeps=Math.max(substeps,Math.ceil(nodeCount/32)*8);
  const world = new World(Vec2(0, -9.81));
  const ground = world.createBody();
  if(heightAt===terrainHeight){
    ground.createFixture(new Box(.24,2.4,Vec2(YARD_WALL-.24,1.9),0),{friction:0,restitution:0});
  }
  const points = [];
  for (let i = 0; i <= GROUND_COUNT; i++) {
    const x = GROUND_START + i * GROUND_STEP;
    points.push(Vec2(x, heightAt(x)));
  }
  for (let i = 1; i < points.length; i++) {
    const edge = new Edge(points[i - 1], points[i]);
    if (i > 1) edge.setPrevVertex(points[i - 2]);
    if (i < points.length - 1) edge.setNextVertex(points[i + 1]);
    const material=heightAt===terrainHeight ? materialAt((points[i-1].x+points[i].x)*.5) : 'asphalt';
    ground.createFixture(edge, {friction:material==='mud'?.40:material==='water'?.68:.95});
  }
  let spec = levels ? buildSpec(levels,kits) : {tireRadius:TIRE_RADIUS,rimRadius:RIM_RADIUS,torque:2400,fittedTorque:2400,powerKW:Infinity,launch:5,wheelSpeed:22,friction:1.5,damperLimit:3000,brakeTorque:1600,boostDuration:1.6,boostFactor:1.34,aero:0};
  const hubY = levels ? spec.tireRadius + .05 : .57;
  const body = world.createDynamicBody({ position: Vec2(3, levels ? hubY + .52 : 1.26), angularDamping: .6 });
  body.createFixture(new Box(1.8, .32), { density: 180, friction: .4, filterGroupIndex: -1,filterCategoryBits:8,filterMaskBits:1 });
  body.createFixture(new Box(.85, .36, Vec2(-.25, .55), 0), { density: 50, friction: .4, filterGroupIndex: -1,filterCategoryBits:8,filterMaskBits:1 });
  // Engine forward and heavy drivetrain low in the chassis; finite pitch inertia.
  body.setMassData({ mass: body.getMass(), center: Vec2(.3, -.22), I: body.getMass() * 2.1 });
  // Inner wheel tubs allow the tire to tuck behind the narrower painted lip.
  for (const x of [-1.25, 1.25]) for (let i = 0; i < 16; i++) {
    const a = i * Math.PI / 16, b = (i + 1) * Math.PI / 16;
    const point = (angle, inset) => {const p=archPoint(x,angle,inset);return Vec2(p.x,p.y);};
    // The inner collision surface is inset from the wheel-tub envelope.
    body.createFixture(new Polygon([point(a,.04),point(a,-.08),point(b,-.08),point(b,.04)]), {
      friction: .08, restitution: 0, filterCategoryBits: 4, filterMaskBits: 2, userData: 'arch'
    });
  }
  const rims = [-1.25, 1.25].map(x => {
    const rim = world.createDynamicBody({ position: Vec2(3 + x, hubY) });
    rim.createFixture(new Circle(.12), { density: 180, filterMaskBits: 0 });
    return rim;
  });
  function fitRim(wheel,radius) {
    wheel.createFixture(new Circle(radius), { density:18/(Math.PI*radius**2), friction:.7,filterGroupIndex:-2,filterCategoryBits:2,filterMaskBits:5,userData:'rim' });
  }
  const wheels = [-1.25, 1.25].map(x => {
    const wheel = world.createDynamicBody({ position: Vec2(3+x,hubY), angularDamping:.02 });
    fitRim(wheel,spec.rimRadius);
    return wheel;
  });
  // Guides provide geometry only. Spring/damper forces use sprung axle mass,
  // rather than a wheel-joint frequency based on the much lighter hub mass.
  const stops = rims.map(r => world.createJoint(new PrismaticJoint({ enableLimit: true, lowerTranslation: -.25, upperTranslation: .24 }, body, r, r.getPosition(), Vec2(0, 1))));
  const joints = stops;
  const motors = wheels.map((w,i)=>world.createJoint(new RevoluteJoint({enableMotor:true,maxMotorTorque:0},rims[i],w,w.getPosition())));
  const makeTire = (wheel,build,bar) => createPneumaticTire(world,wheel,{
    pressure:bar,count:nodeCount,outerRadius:build.tireRadius,rimRadius:build.rimRadius,friction:build.friction
  });
  const tires = wheels.map(w=>makeTire(w,spec,pressure));
  let nitroCharge=1, boosting=false;
  let launchStarted=null, launchSeconds=null, hundredSeconds=null;
  const launchTarget=5/3.6;
  function setBuild(nextLevels, nextKits) {
    const next = buildSpec(nextLevels,nextKits);
    if (next.tireRadius !== spec.tireRadius) {
      const grounded = tires.some(tire=>tire.getContactWidth()>0);
      if(grounded){
        const dy=next.tireRadius-spec.tireRadius;
        for(const part of [body,...rims,...wheels]){
          const p=part.getPosition();
          part.setPosition(Vec2(p.x,p.y+dy));
        }
      }
      wheels.forEach((wheel,i)=>{
        const old=tires[i], spin=wheel.getAngularVelocity();
        old.nodes.forEach(node=>world.destroyBody(node));
        wheel.destroyFixture(wheel.getFixtureList());
        fitRim(wheel,next.rimRadius);
        wheel.setAngularVelocity(spin*spec.tireRadius/next.tireRadius);
        tires[i]=makeTire(wheel,next,old.inflationBar);
      });
    }
    if(!levels || nextLevels.some((level,i)=>level!==levels[i]) ||
      nextKits?.some((kit,i)=>kit!==kits?.[i])){
      launchStarted=null;launchSeconds=null;hundredSeconds=null;
    }
    levels=nextLevels;kits=nextKits;
    spec = next;
    body.setAngularDamping(.6+.95*spec.aero);
  }
  body.setAngularDamping(.6+.95*spec.aero);
  const exhaustMount = levels ? createExhaustMount(body,-2.19,-.46) : createExhaustMount(body);
  let elapsed = 0;
  let wheelPowerKW = 0, engineLoad = 0, accelerator = 0, engineRPM=850;
  let dirt=0;
  const spray=[0,0], wetKind=['',''];
  // Viscous shear on immersed tread elements; wheel slip stirs the layer even at low body speed.
  function roadForces(h){
    for(let i=0;i<tires.length;i++){
      const tire=tires[i],hub=wheels[i],center=hub.getPosition(),pool=poolAt(center.x);
      let immersion=0;
      if(pool && center.y-tire.outerRadius<pool.level+.08){
        const mud=pool.kind==='mud';
        for(const node of tire.nodes){
          const p=node.getPosition();
          if(p.x<=pool.start || p.x>=pool.end)continue;
          const depth=Math.min(1,Math.max(0,(pool.level-p.y+tire.skin)/(tire.skin*2)));
          if(depth===0)continue;
          immersion+=depth;
          const v=node.getLinearVelocity(),k=(mud?58:9)*depth;
          node.applyForceToCenter(Vec2(-k*v.x,-k*v.y),true);
        }
        if(immersion){
          const vx=hub.getLinearVelocity().x, spin=Math.abs(hub.getAngularVelocity())*tire.outerRadius;
          // Ploughing resistance on the rolling wheel rises with wetted tread and travel speed.
          hub.applyForceToCenter(Vec2(-(mud?28:3)*immersion*Math.tanh(vx),0),true);
          const activity=Math.min(1,immersion/6)*Math.min(2,(Math.abs(vx)+spin)/5);
          spray[i]=activity;wetKind[i]=pool.kind;
          dirt=Math.max(0,Math.min(1,dirt+h*activity*(mud?.64:-.30)));
          continue;
        }
      }
      spray[i]=0;wetKind[i]='';
    }
  }
  function suspensionForces() {
    joints.forEach((joint, i) => {
      const travel = joint.getJointTranslation(), speed = joint.getJointSpeed();
      const frontFraction=.5+body.getLocalCenter().x/2.5;
      const mass = body.getMass() * (i === 0 ? 1-frontFraction : frontFraction);
      const omega = 2 * Math.PI * frequency;
      const stiffness = mass * omega * omega;
      const dampingForce = 2 * damping * mass * omega * speed * (speed > 0 ? .65 : 1.2);
      // A hydraulic blow-off prevents damping spikes on sharp bumps.
      const damper = spec.damperLimit * Math.tanh(dampingForce / spec.damperLimit);
      const bump = Math.max(0, travel - .14) / .10;
      const droop = Math.max(0, -.14 - travel) / .11;
      const force = -(mass * 9.81 + stiffness * (travel - .045) + damper
        + 6500 * bump ** 3 - 5000 * droop ** 3);
      const axis = body.getWorldVector(Vec2(0, 1));
      const f = Vec2(axis.x * force, axis.y * force);
      rims[i].applyForceToCenter(f, true);
      body.applyForce(Vec2(-f.x, -f.y), joint.getAnchorA(), true);
    });
  }
  return {
    world, body, wheels, rims, joints, tires, stops, points, exhaustMount, motors, setBuild,
    get dirt(){return dirt;}, spray, wetKind,
    get elapsed() { return elapsed; },
    get launchSeconds() { return launchSeconds; },
    get hundredSeconds() { return hundredSeconds; },
    get wheelPowerKW() { return wheelPowerKW; },
    get engineRPM() { return engineRPM; },
    get engineLoad() { return engineLoad; },
    get accelerator() { return accelerator; },
    get nitroCharge() { return nitroCharge; },
    get boosting() { return boosting; },
    setDrive(mode) { if (['fwd', 'rwd', 'awd'].includes(mode)) { drive = mode; wheels.forEach(w => w.setAwake(true)); } },
    setPressure(bar) { tires.forEach(t=>t.setPressure(bar)); },
    tune(hz, ratio) { frequency = hz; damping = ratio; body.setAwake(true); },
    step(throttle = 0, brake = false, nitro = false) {
      // Slow into the back wall of the yard, then hold; the forward drivetrain stays available.
      const reversingInYard=heightAt===terrainHeight && throttle<0 && body.getPosition().x<3;
      const clearance=reversingInYard ? body.getPosition().x-(YARD_WALL+2.25) : Infinity;
      const reverseLimit=reversingInYard ? Math.sqrt(4*Math.max(0,clearance))/spec.tireRadius : Infinity;
      brake=brake||clearance<.16;
      boosting = nitro && !brake && throttle>=0 && nitroCharge>0;
      if(boosting){
        throttle=1;
        nitroCharge=Math.max(0,nitroCharge-STEP/spec.boostDuration);
      } else if(!nitro){
        nitroCharge=Math.min(1,nitroCharge+Math.abs(body.getLinearVelocity().x)*STEP/60);
        if(heightAt===terrainHeight && brake && Math.abs(body.getLinearVelocity().x)<.35 && stationAt(body.getPosition().x)!==undefined)
          nitroCharge=Math.min(1,nitroCharge+STEP/3);
      }
      const boost=boosting ? spec.boostFactor : 1;
      accelerator += (Math.abs(throttle) - accelerator) * (1 - Math.exp(-STEP * 6));
      let axleBudget=spec.fittedTorque, wheelBudgetKW=spec.powerKW;
      if(spec.ratedRPM){
        const rear=Math.abs(motors[0].getJointSpeed()),front=Math.abs(motors[1].getJointSpeed());
        const shaft=drive==='awd'?(rear+front)/2:drive==='rwd'?rear:front;
        const wheelRPM=shaft*60/(2*Math.PI);
        const tireRatio=spec.tireRadius/.305;
        const gear=(GEAR_RATIOS.find(r=>wheelRPM*r*tireRatio<=spec.ratedRPM)??GEAR_RATIOS.at(-1))*tireRatio;
        // A slipping launch clutch lets the crank turn while the wheels are nearly stationary.
        const targetRPM=Math.max(850+(brake?0:850*accelerator),wheelRPM*gear);
        engineRPM+=(targetRPM-engineRPM)*(1-Math.exp(-STEP*12));
        const speedRatio=Math.min(1,engineRPM/spec.ratedRPM);
        const curve=speedRatio<.68 ? .65+.5*speedRatio/.68 : 1+.15*(1-speedRatio)/.32;
        const crankTorque=spec.ratedTorque*curve;
        axleBudget=Math.min(axleBudget,crankTorque*gear*DRIVELINE_EFFICIENCY);
        wheelBudgetKW=Math.min(spec.powerKW,crankTorque*engineRPM*(2*Math.PI/60)/1000)*DRIVELINE_EFFICIENCY;
      }
      motors.forEach((j, i) => {
        const powered = drive === 'awd' || (drive === 'rwd' ? i === 0 : i === 1);
        const rollingSpeed=Math.abs(body.getLinearVelocity().x)/spec.tireRadius;
        j.setMotorSpeed(brake ? 0 : -throttle * Math.min(spec.wheelSpeed,reverseLimit,rollingSpeed+spec.launch*boost));
        const powerLimitedTorque = wheelBudgetKW*1000/Math.max(.01,Math.abs(j.getJointSpeed()));
        const available = Math.min(axleBudget,powerLimitedTorque)*boost / (drive==='awd'?2:1);
        const driving = Math.abs(throttle)>.01;
        // The free axle coasts. The small holding torque only acts with the pedal released.
        j.setMaxMotorTorque(brake ? spec.brakeTorque : driving ? (powered ? available : 0) : 12);
      });
      const speed=body.getLinearVelocity().x;
      const downforce=(spec.aero || 0)*1.8*speed*speed;
      const h=STEP/substeps;
      const onSoftRoad=heightAt===terrainHeight && wheels.some(w=>poolAt(w.getPosition().x));
      if(!onSoftRoad){spray.fill(0);wetKind.fill('');}
      let shaftWork=0;
      const transmitting=throttle!==0 && !brake;
      for(let i=0;i<substeps;i++){
        const rearSpeed=transmitting?motors[0].getJointSpeed():0,frontSpeed=transmitting?motors[1].getJointSpeed():0;
        if(onSoftRoad)roadForces(h);
        if(downforce)body.applyForceToCenter(Vec2(0,-downforce),true);
        suspensionForces();tires.forEach(t=>t.applyPressure());world.step(h,8,4);
        if(transmitting){
          if(drive!=='fwd')shaftWork+=motors[0].getMotorTorque(1/h)*(rearSpeed+motors[0].getJointSpeed())*.5*h;
          if(drive!=='rwd')shaftWork+=motors[1].getMotorTorque(1/h)*(frontSpeed+motors[1].getJointSpeed())*.5*h;
        }
      }
      const newSpeed=body.getLinearVelocity().x;
      if(newSpeed<-.04 || ((brake || throttle<=0) && Math.abs(newSpeed)<.04))launchStarted=null;
      else if(launchStarted===null && throttle>0 && !brake && Math.abs(speed)<.04){
        launchStarted=elapsed;launchSeconds=null;hundredSeconds=null;
      }
      if(launchStarted!==null && launchSeconds===null && speed<launchTarget && newSpeed>=launchTarget){
        const fraction=(launchTarget-speed)/(newSpeed-speed);
        launchSeconds=elapsed+fraction*STEP-launchStarted;
      }
      if(launchStarted!==null && speed<100/3.6 && newSpeed>=100/3.6){
        const fraction=(100/3.6-speed)/(newSpeed-speed);
        hundredSeconds=elapsed+fraction*STEP-launchStarted;
        launchStarted=null;
      }
      const torque = motors.reduce((sum,j)=>sum+Math.abs(j.getMotorTorque(1/h)),0);
      wheelPowerKW=Math.max(0,shaftWork)/(STEP*1000);
      engineLoad += ((brake || !throttle ? 0 : Math.min(1, torque / spec.fittedTorque)) - engineLoad) * .04;
      exhaustMount.step(STEP,accelerator);
      elapsed += STEP;
    }
  };
}
