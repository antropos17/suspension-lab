# Fluid Simulation — Smoothed Particle Hydrodynamics (SPH)

SPH represents fluid as particles. Each particle contributes to pressure, density, and viscosity fields — sampled at neighbouring particles using a kernel function.

## The SPH Kernel

The kernel $W$ smooths particle contributions over a radius $h$:

$$W(r, h) = \frac{315}{64\pi h^9}(h^2 - r^2)^3, \quad r \leq h$$

```
FUNCTION kernel(r, h) → float
  IF r > h THEN RETURN 0
  diff ← (h*h - r*r)
  RETURN (315 / (64 * PI * h^9)) * diff^3
END

FUNCTION kernel_gradient(r_vec, h) → vec3
  r ← magnitude(r_vec)
  IF r > h OR r < EPSILON THEN RETURN ZERO_VECTOR
  coeff ← -945 / (32 * PI * h^9)
  RETURN r_vec * (coeff * (h*h - r*r)^2)
END
```

## Density and Pressure

```
FUNCTION compute_density(particle_i, neighbours)
  density ← 0
  FOR each neighbour j IN neighbours DO
    r ← magnitude(particle_i.position - j.position)
    density ← density + j.mass * kernel(r, SMOOTHING_RADIUS)
  END
  RETURN density
END

FUNCTION compute_pressure(density, rest_density, pressure_constant) → float
  // Equation of state (Tait equation for weakly compressible fluids)
  RETURN pressure_constant * (density - rest_density)
END
```

## Force Accumulation

```
FUNCTION sph_forces(particle_i, neighbours) → vec3
  F_pressure  ← ZERO_VECTOR
  F_viscosity ← ZERO_VECTOR

  FOR each neighbour j IN neighbours DO
    r_vec ← particle_i.position - j.position
    r     ← magnitude(r_vec)

    // Pressure force: push particles apart when over-compressed
    pressure_avg ← (particle_i.pressure + j.pressure) * 0.5
    F_pressure ← F_pressure - j.mass * pressure_avg / j.density
                   * kernel_gradient(r_vec, SMOOTHING_RADIUS)

    // Viscosity force: velocity smoothing; reduces wild oscillation
    vel_diff ← j.velocity - particle_i.velocity
    F_viscosity ← F_viscosity + j.mass * vel_diff / j.density
                    * kernel_laplacian(r, SMOOTHING_RADIUS)
  END

  F_viscosity ← F_viscosity * VISCOSITY_COEFFICIENT
  F_gravity   ← vec3(0, -9.81 * particle_i.mass, 0)

  RETURN F_pressure + F_viscosity + F_gravity
END
```

## Spatial Hashing — Don't Brute-Force Neighbours

Finding neighbours within radius $h$ via brute force is $O(n^2)$. Use a spatial hash grid instead:

```
FUNCTION build_spatial_hash(particles, cell_size)
  grid ← empty hash map
  FOR each particle p DO
    cell ← floor(p.position / cell_size)
    grid[hash(cell)].append(p)
  END
  RETURN grid
END

FUNCTION find_neighbours(particle, grid, radius, cell_size)
  neighbours ← []
  cell_radius ← ceil(radius / cell_size)
  FOR cx FROM -cell_radius TO cell_radius DO
    FOR cy FROM -cell_radius TO cell_radius DO
      FOR cz FROM -cell_radius TO cell_radius DO
        cell ← floor(particle.position / cell_size) + (cx, cy, cz)
        candidates ← grid[hash(cell)]
        FOR each candidate c IN candidates DO
          IF magnitude(particle.position - c.position) < radius THEN
            neighbours.append(c)
          END
        END
      END
    END
  END
  RETURN neighbours
END
```

**Tuning note:** If SPH particles clump or scatter wildly, tune `pressure_constant` and `rest_density` together. Use semi-implicit Euler with small dt for integration.

Paper: [Particle-Based Fluid Simulation for Interactive Applications — Müller et al. (SPH)](https://matthias-research.github.io/pages/publications/sca03.pdf)
