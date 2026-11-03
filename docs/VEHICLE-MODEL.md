# Vehicle model revision

## Sources and interpretation

- [MathWorks suspension comparison](https://de.mathworks.com/help/sdl/ug/suspension-system-comparison.html): sprung and unsprung masses, nonlinear spring/damper models. Applied as separate chassis, hub and tire bodies.
- [MathWorks hard-stop documentation](https://www.mathworks.com/help/releases/r2025a/pdf_doc/sdl/sdl_ref.pdf): smoothly transitioning stiffness/damping near full compression. Applied as progressive cubic bump and droop buffers before mechanical limits.
- [Nonlinear shock absorber research](https://arxiv.org/abs/2312.17175): digressive and progressive damping characteristics. Applied as an asymmetric, force-limited damping approximation, not an implementation of the paper's hydraulic model.
- [Box2D wheel joints](https://box2d.org/documentation/group__wheel__joint.html): wheel rotation, spring and travel constraints. The installed Planck version has different APIs; checked local implementation. Its WheelJoint.getJointSpeed returns angular speed, so translational damping uses PrismaticJoint.getJointSpeed instead.
- [Project Chrono tires](https://api.chrono.projectchrono.org/wheeled_tire.html): distinguishes rigid contact, handling and finite element tire models. This game uses spring compliance with rigid circular contacts, not FEA or a calibrated tire material.
- [SAE transient diesel emissions experiment](https://saemobilus.sae.org/papers/experimental-assessment-turbocharged-diesel-engine-transient-emissions-acceleration-load-change-starting-2010-01-1287): acceleration/load transients affect smoke. Only the public abstract was used. The exhaust artwork represents an older diesel; no emissions concentrations or calibration are inferred.

## Suspension

One prismatic guide per hub constrains alignment and rotation. Travel is limited from -0.25 to +0.24 m; segmented liners remain a last contact surface. Forces are applied before each 240 Hz solver substep.

For supported axle mass m, omega = 2*pi*f, k = m*omega^2. Spring force includes a static load preload and targets 0.045 m of compression. The damping coefficient is 2*zeta*m*omega, multiplied by 0.65 for compression and 1.2 for rebound. A tanh blow-off curve bounds damper force at 3000 N. Cubic buffers start at +0.14 and -0.14 m, progressively opposing further travel. Equal/opposite forces act on hub and chassis, preserving reaction forces and pitch.

Tire spring frequency is 8.5 Hz with 0.85 damping. Smaller visual rims are rigid and follow the physical hub independently of the outer tire; rubber shading and modest compression are drawn separately. Contact geometry remains circular: the flattened contact patch and carcass strain are not physically resolved.

## Exhaust

Emission rate responds to smoothed accelerator input. Darkness responds to measured drive motor torque and a short positive-throttle transient. A soot intensity slider (0–6x, default 3x) scales generation and darkness; zero stops new emissions and existing particles fade out. Particles inherit tailpipe point velocity, receive a rearward jet, then disperse with drag and buoyancy. Opacity fades with age. Local soot staining accumulates slowly around the tailpipe and resets with the run. Brake torque is excluded from load. The pool is capped at 420 and particle life at 7.3 seconds. At saturation the oldest puff is retired to keep fresh emission continuous. Spatial eddies, velocity relaxation, randomized lobes and a rising flow disperse the jet; clouds remain in world space after throttle release. Air clipping keeps the cloud above the actual ground segments. Pause freezes simulation and particles. No runtime files or logs accumulate.

Rendering correction: the rubber contour and steel rim share the physical hub center and tire angular position. The loaded rubber contour follows the exact piecewise-linear collision surface; the steel rim stays circular. Contact detection controls sidewall widening, and the terrain constraint also applies on the frame before a new contact begins. Airborne wheels away from the surface are round. The road stroke is clipped below the surface instead of covering the contact patch. This does not change the rigid circular collision shape or introduce a deformable carcass.

## Evidence and limits

Soft AWD full-throttle course comparison against the preceding committed physics: liner contact starts 252 -> 36; summed liner normal impulses 36384.7 -> 8420.8 N*s; peak impulse 2546.9 -> 2204.3 N*s. These are whole-revision results including tire/inertia/speed changes, not an isolated spring comparison. Both runs finish the course. This does not establish all-road, real-vehicle or engineering accuracy.

Existing hill-start, braking, static settling and liner-clearance checks remain. The stiffness regression now compares deflection under added load, because preload intentionally holds the same static ride height across setups.

## Sedan and contact revision

Reviewed the research in Codex chat `01a1a173-edb6-7811-bab6-361021662e6c` (New voice chat). Its useful distinction is unsprung dynamics versus procedural wheel placement and rigid versus deformable tire contact. Its Unity/Godot packages and proposed custom skill were not installed or represented as compatible with this Canvas/Planck project. The installed frontend-design and improve-animations guidance was applied to the artwork and effect lifecycle.

A new oxblood/ivory classic sedan replaces the generic yellow body. Continuous lower body geometry cuts both wheel openings; clipped paint, panel seams and chrome cannot cross those openings. Inner wells are behind the tires and limited to the sill. Doors, interior seats, steering wheel, quarter-light, mirror, lamps, mouldings, dirt and local soot move with the chassis. This is original stylized artwork, not a precise licensed vehicle model.

The chassis reference height was lowered by 0.10 m. Earlier cubic bump engagement and a 12000 N coefficient progressively oppose compression before the +0.16 m guide stop. Liner inner radius is 0.56 m, painted arch opening 0.60 m; the gap accommodates finite contact tolerance. A first 0.16 m lowering trial increased liner contacts and was rejected. The first 0.59 m opening left a 4.4 mm geometric overlap in a rear-drive impact; the final visible opening supplies clearance without weakening the zero-overlap assertion. Existing liner-contact count limits remain unchanged.

Final verification: 14 tests, syntax checks and production bundle pass. Tests independently compare terrain interpolation to collider vertices; check flat/slope contact and airborne roundness; sample visible rubber/ground/fender clearance on full rough-course runs for AWD/FWD/RWD; and check smoke spread, persistence and complete dissipation after emission stops. Browser AWD run completed 260 m in 27.3 simulated seconds. Heavy soot accumulation was visually checked at 6x. These checks establish the game's sampled behavior, not engineering-grade tire deformation or a fluid simulation.


## Compliance and wheel-tub correction (current)

The prior revision engaged a 12000 N cubic buffer only 10 mm beyond the target ride position. Together with 3.2 Hz default springs and painted-lip collision geometry, this restricted free movement and caused abrupt tire-to-liner impulses. Defaults are now 1.7 Hz / 0.50 damping; Comfort 1.3 / 0.40 and Sport 2.6 / 0.65. The +0.14 m bump engagement leaves 95 mm beyond static target before progressively rising toward the +0.24 m stop, with a 6500 N cubic coefficient over 0.10 m. Chassis reference height is 1.22 m.

Visible arch lips (ellipse radii 0.55 / 0.61 m, center y=-0.62 m) and inner wheel tubs (envelope radii 0.65 / 0.92 m) are distinct. A compressed tire may be occluded by the painted fender while remaining inside the physical wheel tub. Tests now measure physical clearance against that tub, rather than incorrectly forbidding realistic visual occlusion. Ground clearance and travel-limit assertions remain. The physical liner is 0.04 m inside the tub envelope.

Exhaust mounts integrate a 3.6 Hz damped hanger displacement driven by local chassis acceleration and engine pulses, with 45 mm bounded movement. Muffler, rubber hanger and tailpipe are drawn from that state; emitted particles use the same moving tip and velocity. This is a simplified hanger model, not a finite-element exhaust assembly.

Comparison against 91ab4c0: settle 3 seconds, apply 1000 N downward for 1 second, then full-throttle course. Extra rear travel: 2.96 -> 9.39 mm. At x=55..90 m, body vertical acceleration RMS: 19.13 -> 10.03 m/s^2; peak: 284.66 -> 141.51 m/s^2. Whole-course liner contact starts: 34 -> 21. Both versions finish. Speed and trajectory vary with the revision, so these are paired gameplay runs, not controlled road-input or real-vehicle calibration. An initial ellipse trial increased RMS to 24.99 and was rejected; separating the lip and tub corrected the mechanism.

Primary reference: [OptimumG, Spring Brake](https://optimumg.com/spring-brake/) explains spring/damper relationships, typical damping ranges, bump gaps and limitations of simplified quarter-car models. Applied selectively; no claim of reproducing its full vehicle model.

Tool installation audit: read both referenced public SKILL.md files: [game-physics-racing](https://github.com/pronitdas/game-physics-skill/blob/main/SKILL.md) and [godot-genre-racing](https://github.com/thedivergentai/gd-agentic-skills/blob/main/skills/godot-genre-racing/SKILL.md). Both target Godot; the latter explicitly prescribes arcade gravity multipliers conflicting with this task. Neither was installed. Unity MCP/CLI skills belong to the installed Unity integration and do not connect this Canvas project. Chrono, VPP, NWH, BeamNG.tech MCP and Blender MCP from the research chat remain research candidates, not installed project dependencies. No new plugin, external engine, global skill or credentials were installed/changed.

Verification: 17 tests, syntax and bundle build pass. New checks cover measured free suspension travel/recovery, hanger shock response/bounds/settling and fresh-particle attachment to the tip. Existing braking, all-drive hill starts, course/tub containment and ground-contact checks pass; hill coverage includes every new preset plus the old firm setup. Browser crossed the rough section and completed 260 m (34.0 simulated seconds including coasting/idle), without captured JavaScript errors. The physical tire remains a rigid circle with visual deformation.
