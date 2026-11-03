import { groundHeight } from './terrain.js';

// Bounded world-space billows; an artistic model, not fluid/emissions CFD.
export function createExhaust(random = Math.random) {
  const particles = [];
  let carry = 0, previousGas = 0, transient = 0, soot = 0, intensity = 3, time = 0;
  return {
    particles,
    get soot() { return soot; },
    setIntensity(value) { intensity = Math.max(0, Math.min(6, Number(value) || 0)); },
    step(sim, dt) {
      time += dt;
      const gas = sim.accelerator, load = sim.engineLoad;
      transient = Math.min(1, transient * Math.exp(-dt * 3) + Math.max(0, gas - previousGas) * 1.8);
      previousGas = gas;
      const darkness = Math.min(1, intensity * (.025 + gas * .16 + load * gas * .45 + transient * .8));
      soot = Math.min(1, soot + darkness * dt * .06);
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]; p.age += dt;
        if (p.age >= p.life) { particles.splice(i, 1); continue; }
        const spread = Math.min(1, p.age * 1.8);
        const eddyX = Math.sin(p.y * 3.1 + time * .8 + p.phase) * .58
          + Math.cos(p.x * 1.6 - time * .7) * .32;
        const eddyY = Math.cos(p.x * 2.3 - time * 1.1 + p.phase) * .65
          + Math.sin(p.y * 1.9 + time * .6) * .3;
        const drag = 1 - Math.exp(-dt * (1.7 + p.age * .25));
        p.vx += (.12 + eddyX * spread - p.vx) * drag;
        p.vy += (.22 + eddyY * spread - p.vy) * drag;
        p.x += p.vx * dt; p.y += p.vy * dt;
        const floor = groundHeight(p.x) + p.radius * .45;
        if (p.y < floor) { p.y = floor; p.vy = Math.abs(p.vy) * .2 + .08; }
      }
      const pulse = .8 + .2 * Math.sin(time * (16 + gas * 19));
      carry += dt * intensity * (3 + gas * 16 + transient * 12) * pulse;
      while (carry >= 1) {
        carry--;
        // Saturation retires old puffs, never blocks fresh exhaust at the pipe.
        if (particles.length >= 420) particles.shift();
        const point = sim.body.getWorldPoint({ x: -2.12, y: -.25 });
        const velocity = sim.body.getLinearVelocityFromWorldPoint(point);
        const direction = sim.body.getWorldVector({ x: -1, y: -.07 });
        const jet = .5 + gas * 1.8, phase = random() * Math.PI * 2;
        particles.push({ x: point.x, y: point.y,
          vx: velocity.x + direction.x * jet + Math.cos(phase) * .7,
          vy: velocity.y + direction.y * jet + Math.sin(phase) * .6,
          age: 0, life: 4.5 + random() * 2.8, radius: .065 + random() * .065,
          dark: darkness, phase, stretch: .8 + random() * .6 });
      }
    }
  };
}
