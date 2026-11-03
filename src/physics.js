import { World, Vec2, Edge, Box, Circle, WheelJoint } from 'planck';

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

export function createSimulation({ frequency = 3.2, damping = .65 } = {}) {
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
  const wheels = [-1.25, 1.25].map(x => {
    const wheel = world.createDynamicBody({ position: Vec2(3 + x, .53), angularDamping: .02 });
    wheel.createFixture(new Circle(.48), { density: 45, friction: 2, restitution: .03, filterGroupIndex: -1 });
    return wheel;
  });
  const joints = wheels.map(w => world.createJoint(new WheelJoint({ frequencyHz: frequency, dampingRatio: damping, enableMotor: true, maxMotorTorque: 0 }, body, w, w.getPosition(), Vec2(0, 1))));
  let elapsed = 0;
  return {
    world, body, wheels, joints, points,
    get elapsed() { return elapsed; },
    tune(hz, ratio) { joints.forEach(j => { j.setSpringFrequencyHz(hz); j.setSpringDampingRatio(ratio); }); body.setAwake(true); },
    step(throttle = 0, brake = false) {
      joints.forEach(j => {
        j.setMotorSpeed(brake ? 0 : -throttle * 27);
        j.setMaxMotorTorque(brake ? 1200 : Math.abs(throttle) > .01 ? 1200 : 12);
      });
      world.step(STEP, 10, 4);
      elapsed += STEP;
    }
  };
}
