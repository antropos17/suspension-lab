# Vehicle model revision

## Sources and interpretation

- [MathWorks suspension comparison](https://de.mathworks.com/help/sdl/ug/suspension-system-comparison.html): sprung and unsprung masses, nonlinear spring/damper models. Applied as separate chassis, hub and tire bodies.
- [MathWorks hard-stop documentation](https://www.mathworks.com/help/releases/r2025a/pdf_doc/sdl/sdl_ref.pdf): smoothly transitioning stiffness/damping near full compression. Applied as progressive cubic bump and droop buffers before mechanical limits.
- [Nonlinear shock absorber research](https://arxiv.org/abs/2312.17175): digressive and progressive damping characteristics. Applied as an asymmetric, force-limited damping approximation, not an implementation of the paper's hydraulic model.
- [Box2D wheel joints](https://box2d.org/documentation/group__wheel__joint.html): wheel rotation, spring and travel constraints. The installed Planck version has different APIs; checked local implementation. Its WheelJoint.getJointSpeed returns angular speed, so translational damping uses PrismaticJoint.getJointSpeed instead.
- [Project Chrono tires](https://api.chrono.projectchrono.org/wheeled_tire.html): distinguishes rigid contact, handling and finite element tire models. This game uses spring compliance with rigid circular contacts, not FEA or a calibrated tire material.
- [SAE transient diesel emissions experiment](https://saemobilus.sae.org/papers/experimental-assessment-turbocharged-diesel-engine-transient-emissions-acceleration-load-change-starting-2010-01-1287): acceleration/load transients affect smoke. Only the public abstract was used. The exhaust artwork represents an older diesel; no emissions concentrations or calibration are inferred.

## Suspension

One prismatic guide per hub constrains alignment and rotation. Travel is limited from -0.25 to +0.27 m; segmented liners remain a last contact surface. Forces are applied before each 240 Hz solver substep.

For supported axle mass m, omega = 2*pi*f, k = m*omega^2. Spring force includes a static load preload and targets 0.045 m of compression. The damping coefficient is 2*zeta*m*omega, multiplied by 0.65 for compression and 1.2 for rebound. A tanh blow-off curve bounds damper force at 4500 N. Cubic buffers start at +0.14 and -0.14 m, progressively opposing further travel. Equal/opposite forces act on hub and chassis, preserving reaction forces and pitch.

Tire spring frequency is 8.5 Hz with 0.85 damping. Smaller visual rims are rigid and follow the physical hub independently of the outer tire; rubber shading and modest compression are drawn separately. Contact geometry remains circular: the flattened contact patch and carcass strain are not physically resolved.

## Exhaust

Emission rate responds to smoothed accelerator input. Darkness responds to measured drive motor torque and a short positive-throttle transient. A soot intensity slider (0–6x, default 3x) scales generation and darkness; zero stops new emissions and existing particles fade out. Particles inherit tailpipe point velocity, receive a rearward jet, then disperse with drag and buoyancy. Opacity fades with age. Local soot staining accumulates slowly around the tailpipe and resets with the run. Brake torque is excluded from load. The pool is capped at 420 and particle life at 2.5 seconds. Pause freezes simulation and particles. No runtime files or logs accumulate.

Rendering correction: the rubber contour and steel rim share the physical hub center and tire angular position. Only the loaded rubber contour flattens toward the road normal; the steel rim stays circular. Contact detection gates flattening, so airborne wheels are round. The lower contour is clamped to the compressed rolling radius and widens slightly at the sidewall. This does not change the rigid circular collision shape or introduce a deformable carcass.

## Evidence and limits

Soft AWD full-throttle course comparison against the preceding committed physics: liner contact starts 252 -> 36; summed liner normal impulses 36384.7 -> 8420.8 N*s; peak impulse 2546.9 -> 2204.3 N*s. These are whole-revision results including tire/inertia/speed changes, not an isolated spring comparison. Both runs finish the course. This does not establish all-road, real-vehicle or engineering accuracy.

Existing hill-start, braking, static settling and liner-clearance checks remain. The stiffness regression now compares deflection under added load, because preload intentionally holds the same static ride height across setups.
