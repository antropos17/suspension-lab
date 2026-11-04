import { World, Vec2, Edge, Box, Circle, Polygon, RevoluteJoint, PrismaticJoint } from 'planck';
import { terrainHeight, GROUND_START, GROUND_STEP, GROUND_COUNT } from './terrain.js';
import { archPoint } from './vehicle-geometry.js';
import { createPneumaticTire, RIM_RADIUS } from './pneumatic-tire.js';
import { createExhaustMount } from './exhaust-mount.js';
export { terrainHeight } from './terrain.js';

import { STEP } from './vehicle-constants.js';
export { FINISH, STEP } from './vehicle-constants.js';

export function createSimulation({ frequency = 1.7, damping = .5, drive = 'awd', pressure = 2.2, nodeCount = 32, substeps = 8, heightAt = terrainHeight } = {}) {
  substeps=Math.max(substeps,Math.ceil(nodeCount/32)*8);
  const world = new World(Vec2(0, -9.81));
  const ground = world.createBody();
  const points = [];
  for (let i = 0; i <= GROUND_COUNT; i++) {
    const x = GROUND_START + i * GROUND_STEP;
    points.push(Vec2(x, heightAt(x)));
  }
  for (let i = 1; i < points.length; i++) {
    const edge = new Edge(points[i - 1], points[i]);
    if (i > 1) edge.setPrevVertex(points[i - 2]);
    if (i < points.length - 1) edge.setNextVertex(points[i + 1]);
    ground.createFixture(edge, { friction: .95 });
  }
  const body = world.createDynamicBody({ position: Vec2(3, 1.22), angularDamping: .6 });
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
    const rim = world.createDynamicBody({ position: Vec2(3 + x, .53) });
    rim.createFixture(new Circle(.12), { density: 180, filterMaskBits: 0 });
    return rim;
  });
  const wheels = [-1.25, 1.25].map(x => {
    const wheel = world.createDynamicBody({ position: Vec2(3+x,.53), angularDamping:.02 });
    wheel.createFixture(new Circle(RIM_RADIUS), { density:18/(Math.PI*RIM_RADIUS**2), friction:.7,filterGroupIndex:-2,filterCategoryBits:2,filterMaskBits:5,userData:'rim' });
    return wheel;
  });
  // Guides provide geometry only. Spring/damper forces use sprung axle mass,
  // rather than a wheel-joint frequency based on the much lighter hub mass.
  const stops = rims.map(r => world.createJoint(new PrismaticJoint({ enableLimit: true, lowerTranslation: -.25, upperTranslation: .24 }, body, r, r.getPosition(), Vec2(0, 1))));
  const joints = stops;
  const motors = wheels.map((w,i)=>world.createJoint(new RevoluteJoint({enableMotor:true,maxMotorTorque:0},rims[i],w,w.getPosition())));
  const tires = wheels.map(w=>createPneumaticTire(world,w,{pressure,count:nodeCount}));
  const exhaustMount = createExhaustMount(body);
  let elapsed = 0;
  let engineLoad = 0, accelerator = 0;
  function suspensionForces() {
    joints.forEach((joint, i) => {
      const travel = joint.getJointTranslation(), speed = joint.getJointSpeed();
      const frontFraction=.5+body.getLocalCenter().x/2.5;
      const mass = body.getMass() * (i === 0 ? 1-frontFraction : frontFraction);
      const omega = 2 * Math.PI * frequency;
      const stiffness = mass * omega * omega;
      const dampingForce = 2 * damping * mass * omega * speed * (speed > 0 ? .65 : 1.2);
      // A hydraulic blow-off prevents damping spikes on sharp bumps.
      const damper = 3000 * Math.tanh(dampingForce / 3000);
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
    world, body, wheels, rims, joints, tires, stops, points, exhaustMount, motors,
    get elapsed() { return elapsed; },
    get engineLoad() { return engineLoad; },
    get accelerator() { return accelerator; },
    setDrive(mode) { if (['fwd', 'rwd', 'awd'].includes(mode)) { drive = mode; wheels.forEach(w => w.setAwake(true)); } },
    setPressure(bar) { tires.forEach(t=>t.setPressure(bar)); },
    tune(hz, ratio) { frequency = hz; damping = ratio; body.setAwake(true); },
    step(throttle = 0, brake = false) {
      accelerator += (Math.abs(throttle) - accelerator) * (1 - Math.exp(-STEP * 6));
      motors.forEach((j, i) => {
        const powered = drive === 'awd' || (drive === 'rwd' ? i === 0 : i === 1);
        const rollingSpeed=Math.abs(body.getLinearVelocity().x)/.48;
        j.setMotorSpeed(brake ? 0 : -throttle * Math.min(22,rollingSpeed+5));
        j.setMaxMotorTorque(brake ? 1600 : Math.abs(throttle) > .01 && powered ? (drive === 'awd' ? 1200 : 2400) : 12);
      });
      const h=STEP/substeps;
      for(let i=0;i<substeps;i++){
        suspensionForces();tires.forEach(t=>t.applyPressure());world.step(h,8,4);
      }
      const torque = motors.reduce((sum,j)=>sum+Math.abs(j.getMotorTorque(1/h)),0);
      engineLoad += ((brake || !throttle ? 0 : Math.min(1, torque / 2400)) - engineLoad) * .04;
      exhaustMount.step(STEP,accelerator);
      elapsed += STEP;
    }
  };
}
