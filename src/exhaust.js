// Visual model of an older diesel: weak idle haze, a short fueling transient,
// and darker exhaust under sustained load. Not an emissions prediction.
export function createExhaust(random = Math.random) {
  const particles = [];
  let carry = 0, previousGas = 0, transient = 0, soot = 0;
  return {
    particles,
    get soot() { return soot; },
    step(sim, dt) {
      const gas = sim.accelerator, load = sim.engineLoad;
      transient = Math.min(1, transient * Math.exp(-dt * 3) + Math.max(0, gas - previousGas) * 1.8);
      previousGas = gas;
      const darkness = Math.min(.85, load * gas * .45 + transient * .8);
      soot = Math.min(1, soot + darkness * dt * .018);
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]; p.age += dt;
        if (p.age >= p.life) { particles.splice(i, 1); continue; }
        p.vx += (.15 - p.vx) * dt * .5; p.vy += dt * .22;
        p.x += p.vx * dt; p.y += p.vy * dt;
      }
      carry += dt * (4 + gas * 23 + transient * 12);
      while (carry >= 1) {
        carry--;
        if (particles.length >= 180) continue;
        const point = sim.body.getWorldPoint({ x: -1.98, y: -.24 });
        const velocity = sim.body.getLinearVelocityFromWorldPoint(point);
        const direction = sim.body.getWorldVector({ x: -1, y: -.04 });
        const jet = .7 + gas * 2.8;
        particles.push({ x: point.x, y: point.y, vx: velocity.x + direction.x * jet + (random() - .5) * .35,
          vy: velocity.y + direction.y * jet + random() * .3, age: 0, life: 1.3 + random() * 1.2,
          radius: .035 + random() * .035, dark: darkness, phase: random() * 6.28 });
      }
    }
  };
}
