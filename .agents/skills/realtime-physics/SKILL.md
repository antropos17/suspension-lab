---
name: realtime-physics
description: Numerical integration, equal-and-opposite spring forces and compliant constraints for JavaScript real-time simulations. Use for solver changes, deformable bodies and timestep stability; pair with planck-vehicle-dynamics for Suspension Lab tire work.
---

# Physics & Calculus for Real-Time Simulation

Physics simulation is applied calculus: the equations of motion are differential equations, and simulating them means numerically integrating those equations forward in time. This skill covers the mathematics, the integration schemes, and the implementations behind the most common simulation systems.

Project scope: JavaScript/Canvas and Planck 1.5.1. Preserve the existing engine unless a migration is separately requested. See ORIGIN.md for source and corrected examples. Related math skills are optional references, not installation requirements.



---

## The Core Idea: Differential Equations in Code

Physics describes change. Velocity is the rate of change of position; acceleration is the rate of change of velocity. In code, you can't compute the exact continuous integral — you advance in small discrete time steps ($\Delta t$).

$$\frac{d\vec{x}}{dt} = \vec{v} \qquad \frac{d\vec{v}}{dt} = \frac{\vec{F}}{m} = \vec{a}$$

**Fundamental update loop (all physics simulations share this structure):**

```
LOOP every frame:
  1. Accumulate forces acting on each body
  2. Compute acceleration:  a ← F_total / mass
  3. Integrate: advance position and velocity by Δt
  4. Resolve constraints and collisions
  5. Clear accumulated forces
END
```

The quality of your simulation depends heavily on step 3 — the integration method.

---

## Numerical Integration Methods

### Explicit (Forward) Euler — Simple, Unstable

```
position ← position + velocity * dt    // OLD velocity
velocity ← velocity + acceleration * dt
```

Avoid for stiff elastic systems; use a stable constraint formulation and convergence checks.

---
### Semi-Implicit (Symplectic) Euler — The Everyday Standard

Update velocity first, then use the new velocity to update position:

```
velocity ← velocity + acceleration * dt
position ← position + velocity * dt    // uses NEW velocity
```

This tiny change (velocity-first order) makes the integrator often better behaved for oscillators, but not exactly energy-conserving. Almost free in cost, dramatically more stable. **Use this for most game physics.**

---

### Verlet Integration — Excellent for Constraints

Stores previous position instead of velocity; velocity is implicit:

```
// Each body stores: position_current, position_previous
acceleration ← F_total / mass
position_next ← 2 * position_current - position_previous + acceleration * dt²
position_previous ← position_current
position_current  ← position_next
```

Deriving velocity when needed:
```
velocity ← (position_current - position_previous) / dt    // one-step finite difference
```

**Strengths:**
- Velocity is automatically correct after position corrections (great for PBD — see Soft Bodies section)
- Second-order accurate
- Time-reversible

**Weakness:** Coupling with force models that need explicit velocity (like drag) requires care.

---

### RK4 — High Accuracy for Orbital / Precision Sims

RK4 evaluates the derivative four times per step and combines them:

```
FUNCTION rk4_step(state, dt) → state
  k1 ← derivative(state)
  k2 ← derivative(state + k1 * dt/2)
  k3 ← derivative(state + k2 * dt/2)
  k4 ← derivative(state + k3 * dt)
  RETURN state + (k1 + 2*k2 + 2*k3 + k4) * (dt / 6)
END
```

**Use it for:** orbital mechanics, ballistics, anything needing high precision.
**Cost:** ~4× the computation of semi-implicit Euler per step.

---

## Newtonian Mechanics

### Forces and Newton's Second Law

$$\vec{F}_{net} = m\vec{a}$$

Accumulate all forces before integrating:

```
FUNCTION accumulate_forces(body) → vec3
  F ← ZERO_VECTOR

  // Gravity
  F ← F + vec3(0, -9.81 * body.mass, 0)

  // Linear drag  (opposes velocity, proportional to speed)
  F ← F + body.velocity * (-body.drag_coefficient)

  // Any applied impulses or spring forces added externally
  F ← F + body.accumulated_external_forces

  RETURN F
END
```

## Rigid Body Dynamics

A rigid body has both linear and angular components. Linear is straightforward; angular requires tensors and cross products (see **linear-algebra** skill for matrix rotation, **geometry** skill for cross products).

### Linear Part

```
body.acceleration ← accumulate_forces(body) / body.mass
body.velocity     ← body.velocity + body.acceleration * dt
body.position     ← body.position + body.velocity * dt
```

### Angular Part

```
// Angular momentum L = I * ω  (I = inertia tensor, ω = angular velocity)
// τ = torque = r × F  (cross product of moment arm and force — geometry skill)

angular_acceleration ← body.inertia_tensor_inv * accumulate_torques(body)
body.angular_velocity ← body.angular_velocity + angular_acceleration * dt

// Integrate orientation quaternion
// (linear-algebra skill: quaternion integration)
delta_q ← quaternion_from_axis_angle(
  normalise(body.angular_velocity),
  magnitude(body.angular_velocity) * dt
)
body.orientation ← normalise(delta_q * body.orientation)
```

### Collision Response — Impulse-Based

After the **geometry** skill detects a collision (overlap, contact normal, penetration depth):

```
FUNCTION resolve_collision(A, B, contact_normal, restitution)
  // Relative velocity along contact normal
  relative_velocity ← A.velocity - B.velocity
  velocity_along_normal ← dot(relative_velocity, contact_normal)

  // Don't resolve if bodies are separating
  IF velocity_along_normal > 0 THEN RETURN

  // Impulse scalar
  e  ← restitution   // 0 = perfectly inelastic, 1 = elastic
  j  ← -(1 + e) * velocity_along_normal
  j  ← j / (1 / A.mass + 1 / B.mass)

  impulse ← contact_normal * j
  A.velocity ← A.velocity + impulse / A.mass
  B.velocity ← B.velocity - impulse / B.mass

  // Positional correction (prevent sinking)
  correction_percent ← 0.2   // typically 20-80%
  slop ← 0.01                // small penetration tolerance
  correction ← max(penetration_depth - slop, 0) / (1/A.mass + 1/B.mass)
               * correction_percent * contact_normal
  A.position ← A.position + correction / A.mass
  B.position ← B.position - correction / B.mass
END
```

---

## Spring Systems

Springs are the foundation of soft bodies, cloth, and elastic joints. They implement Hooke's Law:

$$\vec{F} = -k\Delta x - c\vec{v}_{rel}$$

where $k$ is the spring stiffness and $c$ is the damping coefficient.

```
FUNCTION spring_force(A, B, rest_length, stiffness, damping) → vec3
  delta     ← B.position - A.position
  dist      ← magnitude(delta)
  direction ← delta / dist            // unit vector (geometry skill: normalise)

  // Extension beyond rest length
  extension ← dist - rest_length

  // Relative velocity along the spring axis
  relative_vel ← dot(B.velocity - A.velocity, direction)

  // Hooke's law + viscous damping
  force_magnitude ← stiffness * extension + damping * relative_vel
  RETURN direction * force_magnitude
END
```

**Stability note:** Stiff springs ($k$ large) require very small $\Delta t$ or implicit integration. If your spring system explodes, either reduce $k$, add more damping, or use implicit/compliant constraints or sufficiently small verified substeps; RK4 alone does not remove stiffness limits.

---

## Soft Bodies

### Spring-Mass Mesh

Connect mesh vertices with springs; simulate each vertex as a particle.

```
FUNCTION spring_mass_update(mesh, dt)
  // Reset forces to gravity
  FOR each vertex v IN mesh.vertices DO
    v.force ← vec3(0, -9.81 * v.mass, 0)
  END

  // Accumulate spring forces
  FOR each spring s IN mesh.springs DO
    f ← spring_force(s.vertex_a, s.vertex_b, s.rest_length, s.stiffness, s.damping)
    s.vertex_a.force ← s.vertex_a.force + f
    s.vertex_b.force ← s.vertex_b.force - f    // Newton's third law
  END

  // Integrate each free vertex
  FOR each vertex v IN mesh.vertices DO
    IF v.is_pinned THEN CONTINUE
    v.velocity ← v.velocity + (v.force / v.mass) * dt
    v.position ← v.position + v.velocity * dt
  END
END
```

---

### Position-Based Dynamics (PBD)

PBD skips forces entirely — it directly corrects positions to satisfy geometric constraints, then derives velocities from the displacements. More stable and artist-friendly than spring-mass for games and interactive cloth.

**Core loop:**

```
FUNCTION pbd_update(particles, constraints, dt, iterations)
  // Step 1: Predict positions using current velocities
  FOR each particle p DO
    p.velocity  ← p.velocity + external_acceleration(p) * dt
    p.position_predicted ← p.position + p.velocity * dt
  END

  // Step 2: Iteratively project constraints onto predicted positions
  FOR iter FROM 1 TO iterations DO
    FOR each constraint c IN constraints DO
      project_constraint(c)    // see examples below
    END
  END

  // Step 3: Derive new velocities from position change
  FOR each particle p DO
    p.velocity ← (p.position_predicted - p.position) / dt
    p.position ← p.position_predicted
  END
END
```

**Distance constraint (replaces springs):**

```
FUNCTION project_distance_constraint(A, B, rest_length)
  delta    ← B.position_predicted - A.position_predicted
  dist     ← magnitude(delta)
  direction ← delta / dist
  
  error     ← dist - rest_length
  w_total   ← A.inv_mass + B.inv_mass    // inv_mass = 0 for pinned/static bodies
  
  correction ← direction * (error / w_total)
  A.position_predicted ← A.position_predicted + correction * A.inv_mass
  B.position_predicted ← B.position_predicted - correction * B.inv_mass
END
```

For additional constraint types (bend, volume), read `references/pbd-constraints.md`.

---

## Fluid Simulation — SPH

SPH represents fluid as particles with pressure/density/viscosity fields sampled via a kernel function. For the full kernel constants, density/pressure computation, force accumulation, and spatial-hash neighbour search, read `references/sph.md`. Use semi-implicit Euler with small dt for SPH integration.

---

## Fixed vs. Variable Timestep

Physics engines need deterministic, stable integration. Decouple rendering framerate from physics:

```
FUNCTION game_loop(physics_world)
  physics_accumulator ← 0
  FIXED_DT ← 1/120          // 120 Hz physics tick

  LOOP:
    frame_time ← get_delta_time()
    physics_accumulator ← physics_accumulator + frame_time

    WHILE physics_accumulator >= FIXED_DT DO
      physics_world.step(FIXED_DT)
      physics_accumulator ← physics_accumulator - FIXED_DT
    END

    alpha ← physics_accumulator / FIXED_DT   // interpolation factor for rendering
    render(physics_world, interpolate = alpha)
  END
END
```

This ensures physics results are frame-rate-independent and reproducible.

---

## Choosing an Integration Scheme

| Scenario | Recommended Method |
|---|---|
| Simple game objects (platformer, balls) | Semi-implicit Euler |
| Cloth / rope with many constraints | Verlet + PBD |
| Stiff springs without PBD | Implicit/compliant method with convergence checks |
| Orbital mechanics, ballistics | RK4 |
| SPH fluids | Semi-implicit Euler (with small dt) |
| Real-time soft bodies for games | PBD — fast, stable, artist-tunable |

---

## Common Mistakes

| Mistake | Why it Happens | Fix |
|---|---|---|
| Simulation explodes after a few seconds | Forward Euler with too-large dt or stiff springs | Switch to semi-implicit Euler; reduce dt |
| Objects slowly sink through floors | No positional correction after impulse | Add penetration slop correction after impulse resolve |
| Cloth stretches infinitely | Constraint iterations too few in PBD | Increase solver iterations (8–16 is typical) |
| SPH particles clump or scatter wildly | Pressure constant too high or rest density wrong | Tune `pressure_constant` and `rest_density` together (see `references/sph.md`) |
| Framerate affects physics outcome | Physics tied to render loop | Decouple with fixed timestep accumulator |
| Angular velocity integrated incorrectly | Euler-integrating a quaternion directly | Use `quaternion * (1 + 0.5 * omega * dt)` or axis-angle form |

---

## Resources

- [Game Physics — Gaffer on Games (Fixed Timestep)](https://gafferongames.com/post/fix_your_timestep/)
- `references/sph.md` — SPH kernel, forces, spatial hashing
- `references/pbd-constraints.md` — bend and other PBD constraints
