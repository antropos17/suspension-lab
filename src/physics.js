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
  body.setMassData({ mass: body.getMass(), center: Vec2(.2, -.22), I: body.getMass() * 1.65 });
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
  const joints = rims.map(r => world.createJoint(new WheelJoint({ frequencyHz: frequency, dampingRatio: damping }, body, r, r.getPosition(), Vec2(0, 1))));
  const stops = rims.map(r => world.createJoint(new PrismaticJoint({ enableLimit: true, lowerTranslation: -.25, upperTranslation: .27 }, body, r, r.getPosition(), Vec2(0, 1))));
  const tires = wheels.map((w, i) => world.createJoint(new WheelJoint({ frequencyHz: 10, dampingRatio: .8, enableMotor: true, maxMotorTorque: 0 }, rims[i], w, w.getPosition(), Vec2(0, 1))));
  let elapsed = 0;
  return {
    world, body, wheels, rims, joints, tires, stops, points,
    get elapsed() { return elapsed; },
    setDrive(mode) { if (['fwd', 'rwd', 'awd'].includes(mode)) { drive = mode; wheels.forEach(w => w.setAwake(true)); } },
    tune(hz, ratio) { joints.forEach(j => { j.setSpringFrequencyHz(hz); j.setSpringDampingRatio(ratio); }); body.setAwake(true); },
    step(throttle = 0, brake = false) {
      tires.forEach((j, i) => {
        const powered = drive === 'awd' || (drive === 'rwd' ? i === 0 : i === 1);
        j.setMotorSpeed(brake ? 0 : -throttle * 24);
        j.setMaxMotorTorque(brake ? 1600 : Math.abs(throttle) > .01 && powered ? (drive === 'awd' ? 1200 : 2400) : 12);
      });
      // Two solver substeps keep tire/liner impacts within contact tolerances.
      world.step(STEP / 2, 12, 10);
      world.step(STEP / 2, 12, 10);
      elapsed += STEP;
    }
  };
}
