---
name: planck-vehicle-dynamics
description: Build and verify physically deformable 2D tires and compliant vehicle suspension in Suspension Lab using JavaScript and Planck 1.5.1. Use for tire contact, carcass nodes, hub reaction, pressure/compliance, suspension loads and solver convergence; visual squash alone does not satisfy this skill.
---

# Planck vehicle dynamics

This is a project-authored skill, not a downloaded tire engine. Read `references/model-and-evidence.md` before changing contact or suspension. Use the installed `realtime-physics` skill for integration details as needed. Do not migrate to Godot/Unity or install simulator MCP servers merely to use these instructions.

## Required observable result

A soft tire is a deformable mechanical contact structure. Its contact elements move under load, transfer forces and torque to a rigid rim, and determine the rendered contour. A rigid circular collision fixture with a clamped/drawn outline, or a spring between two rigid circles, is not completion. Keep the current game's approximation explicitly labeled until replaced and regression-qualified.

## Implementation route

- Keep SI units and Planck as the sole rigid contact solver. Inspect the installed APIs; frequency-based joint softness depends on effective mass and is not a material constant.
- First exercise a free-standing wheel on a bench. Use a ring of contact bodies, elastic circumferential links, sidewall links anchored to a rotating rim, and rim-bottoming contact. A node-and-spring ring is an experimental discretized elastic tire, not yet a pneumatic or calibrated tire.
- For pneumatic behavior add a documented pressure/area energy model with equal-and-opposite hub reactions, bead constraints and collapse/inversion handling. Distinguish gauge versus absolute pressure and 2D effective width. Do not invent pressure calibration from visual fit.
- All ground traction and arch contact must act on the deforming tire elements. Remove the old rigid tire's ground/arch collision when integrating; otherwise it still determines the contact patch.
- Drive/brake the rim; transmit torque through sidewall/shear coupling to tread nodes and road. Apply reaction torque to the chassis. Do not propel the chassis directly to hide lost traction.
- Draw the outer surface from the same contact nodes and their thickness. Hide it behind fender paint where appropriate, while the internal wheel tub remains the physical envelope. No renderer-only projection to terrain.
- Preserve sprung/unsprung masses, preload, asymmetric damping, progressive bump/droop buffers and a free travel interval. Compute spring force from supported mass and ride frequency, not a hub-joint UI value alone.

## Verification gates

Run `node .agents/skills/planck-vehicle-dynamics/scripts/tire-bench.mjs` for the included experimental contact-ring bench. It is a solver feasibility check, not the driving game's implementation.

Before switching the game: verify increasing load increases measured physical deflection/contact width; changing compliance affects hub height/forces; unloading recovers without persistent energy growth; traction/braking use node contacts; rim bottoming is bounded; step halving and node-count changes have reported errors. Then run the existing full-course, all-drive, hill-start and braking regressions and inspect browser motion/errors. Report actual remaining uncertainty; do not replace a failing physical assertion with a screenshot.

Keep diagnostics in project `work/`, retain the latest run for seven days, and cap any frame traces. Skill installation alone does not establish real-world fidelity.
