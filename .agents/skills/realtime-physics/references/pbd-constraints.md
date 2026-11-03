# PBD Constraint Reference

## Bend constraint (prevents cloth from folding flat)

```
FUNCTION project_bend_constraint(A, B, C, rest_angle, stiffness)
  // A–B–C are three consecutive vertices; constrain the angle at B
  v1 ← A.position_predicted - B.position_predicted
  v2 ← C.position_predicted - B.position_predicted
  current_angle ← acos(clamp(dot(normalise(v1), normalise(v2)), -1, 1))

  angle_diff ← current_angle - rest_angle
  IF abs(angle_diff) < EPSILON THEN RETURN

  // Gradient-based correction (see references for full derivation)
  axis    ← normalise(cross(v1, v2))   // rotation axis (geometry skill)
  delta_A ← cross(axis, v1) * (angle_diff * stiffness / magnitude(v1))
  delta_C ← cross(v2, axis) * (angle_diff * stiffness / magnitude(v2))

  A.position_predicted ← A.position_predicted + delta_A * A.inv_mass
  C.position_predicted ← C.position_predicted + delta_C * C.inv_mass
  B.position_predicted ← B.position_predicted - (delta_A + delta_C) * B.inv_mass
END
```

If cloth stretches infinitely, constraint iterations are too few — 8–16 is typical.

Paper: [Position Based Dynamics — Müller et al.](https://matthias-research.github.io/pages/publications/posBasedDyn.pdf)
