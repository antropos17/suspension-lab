import { World, Vec2, Edge, Box, Circle, Polygon, WheelJoint, PrismaticJoint } from 'planck';

export const FINISH = 260;
export const STEP = 1 / 120;
export function terrainHeight(x) {
  if (x < 12) return 0;
  const t = x - 12;
  const fade = Math.min(t / 12, 1);
  return fade * (1.3 * Math.sin(t * .12) + .55 * Math.sin(t * .32))
    + (x > 55 && x < 90 ? .23 * Math.sin((x - 55) * 2.4) ** 2 : 0)
    + (x > 120 && x < 150 ? 3 * Math.sin((x - 120) / 30 * Math.PI) ** 2 : 0);
}

export function createSimulation({ frequency = 3.2, damping = .65, drive = 'awd' } = {}) {
  const world = new World(Vec2(0, -9.81));
  const ground = world.createBody();
  const points = [];
  for (let x = -40; x <= 340; x += .4) points.push(Vec2(x, terrainHeight(x)));
  for (let i = 1; i < points.length; i++) {
    const edge = new Edge(points[i - 1], points[i]);
    if (i > 1) edge.setPrevVertex(points[i - 2]);
    if (i < points.length - 1) edge.setNextVertex(points[i + 1]);
    ground.createFixture(edge, { friction: .95 });
  }
  const body = world.createDynamicBody({ position: Vec2(3, 1.4), angularDamping: .6 });
  body.createFixture(new Box(1.8, .32), { density: 180, friction: .4, filterGroupIndex: -1 });
  body.createFixture(new Box(.85, .36, Vec2(-.25, .55), 0), { density: 50, friction: .4, filterGroupIndex: -1 });
  // Engine forward and heavy drivetrain low in the chassis; finite pitch inertia.
  body.setMassData({ mass: body.getMass(), center: Vec2(.2, -.22), I: body.getMass() * 2.1 });
  // Thin physical liners follow the visible semicircular wheel openings.
  for (const x of [-1.25, 1.25]) for (let i = 0; i < 16; i++) {
    const a = i * Math.PI / 16, b = (i + 1) * Math.PI / 16;
    const point = (angle, radius) => Vec2(x + Math.cos(angle) * radius, -.55 + Math.sin(angle) * radius);
    // Liner thickness leaves 3 cm of clearance inside the visible opening.
    body.createFixture(new Polygon([point(a,.54),point(a,.68),point(b,.68),point(b,.54)]), {
      friction: .08, restitution: 0, filterCategoryBits: 4, filterMaskBits: 2, userData: 'arch'
    });
  }
  const rims = [-1.25, 1.25].map(x => {
    const rim = world.createDynamicBody({ position: Vec2(3 + x, .53) });
    rim.createFixture(new Circle(.2), { density: 180, filterMaskBits: 0 });
    return rim;
  });
  const wheels = [-1.25, 1.25].map(x => {
    const wheel = world.createDynamicBody({ position: Vec2(3 + x, .53), angularDamping: .02 });
    wheel.createFixture(new Circle(.48), { density: 45, friction: 3, restitution: .03, filterGroupIndex: -1, filterCategoryBits: 2, filterMaskBits: 5 });
    return wheel;
  });
  // Guides provide geometry only. Spring/damper forces use sprung axle mass,
  // rather than a wheel-joint frequency based on the much lighter hub mass.
  const stops = rims.map(r => world.createJoint(new PrismaticJoint({ enableLimit: true, lowerTranslation: -.25, upperTranslation: .27 }, body, r, r.getPosition(), Vec2(0, 1))));
  const joints = stops;
  const tires = wheels.map((w, i) => world.createJoint(new WheelJoint({ frequencyHz: 8.5, dampingRatio: .85, enableMotor: true, maxMotorTorque: 0 }, rims[i], w, w.getPosition(), Vec2(0, 1))));
  let elapsed = 0;
  let engineLoad = 0, accelerator = 0;
  function suspensionForces() {
    joints.forEach((joint, i) => {
      const travel = joint.getJointTranslation(), speed = joint.getJointSpeed();
      const mass = body.getMass() * (i === 0 ? .42 : .58);
      const omega = 2 * Math.PI * frequency;
      const stiffness = mass * omega * omega;
      const dampingForce = 2 * damping * mass * omega * speed * (speed > 0 ? .65 : 1.2);
      // A hydraulic blow-off prevents damping spikes on sharp bumps.
      const damper = 4500 * Math.tanh(dampingForce / 4500);
      const bump = Math.max(0, travel - .14) / .13;
      const droop = Math.max(0, -.14 - travel) / .11;
      const force = -(mass * 9.81 + stiffness * (travel - .045) + damper
        + 7000 * bump ** 3 - 5000 * droop ** 3);
      const axis = body.getWorldVector(Vec2(0, 1));
      const f = Vec2(axis.x * force, axis.y * force);
      rims[i].applyForceToCenter(f, true);
      body.applyForce(Vec2(-f.x, -f.y), joint.getAnchorA(), true);
    });
  }
  return {
    world, body, wheels, rims, joints, tires, stops, points,
    get elapsed() { return elapsed; },
    get engineLoad() { return engineLoad; },
    get accelerator() { return accelerator; },
    setDrive(mode) { if (['fwd', 'rwd', 'awd'].includes(mode)) { drive = mode; wheels.forEach(w => w.setAwake(true)); } },
    tune(hz, ratio) { frequency = hz; damping = ratio; body.setAwake(true); },
    step(throttle = 0, brake = false) {
      accelerator += (Math.abs(throttle) - accelerator) * (1 - Math.exp(-STEP * 6));
      tires.forEach((j, i) => {
        const powered = drive === 'awd' || (drive === 'rwd' ? i === 0 : i === 1);
        j.setMotorSpeed(brake ? 0 : -throttle * 22);
        j.setMaxMotorTorque(brake ? 1600 : Math.abs(throttle) > .01 && powered ? (drive === 'awd' ? 1200 : 2400) : 12);
      });
      // Two solver substeps keep tire/liner impacts within contact tolerances.
      suspensionForces();world.step(STEP / 2, 12, 10);
      suspensionForces();world.step(STEP / 2, 12, 10);
      const torque = tires.reduce((sum,j) => sum + Math.abs(j.getMotorTorque(2 / STEP)), 0);
      engineLoad += ((brake || !throttle ? 0 : Math.min(1, torque / 2400)) - engineLoad) * .04;
      elapsed += STEP;
    }
  };
}
