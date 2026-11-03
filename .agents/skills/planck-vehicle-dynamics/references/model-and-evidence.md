# Model and evidence

Current integration (2026-11-04): the game uses src/pneumatic-tire.js, a pressure-driven contact ring coupled to rotating rims and suspension carriers. Read docs/VEHICLE-MODEL.md from the project root for the current formulation and tests/pneumatic.test.mjs for qualification. The sections below record the earlier bench at skill-install time; statements about an unintegrated rigid game model are historical.

## Sources

- [Planck 1.5.1 source](https://github.com/piqnt/planck.js/tree/v1.5.1), especially the installed `node_modules/planck/dist/planck.d.ts`: DistanceJoint supports compliant links, explicit local anchors and frequency/damping parameters; PrismaticJoint can constrain the bench hub vertically. Planck supplies rigid contacts and joints, not a ready-made pneumatic tire solver.
- [BeamNG pressure wheel construction](https://documentation.beamng.com/modding/vehicle/sections/wheels/): distinguishes rim nodes, tire nodes, radial and reinforcement links, and pressure groups. This is a design reference, not an installed BeamNG engine or a licensed port.
- [Chrono tire models](https://api.chrono.projectchrono.org/wheeled_tire.html): rigid, handling and deformable FEA tires are distinct. Do not label a rigid collider or handling-only force law a deformable carcass.
- Macklin, Muller, Chentanez, [XPBD (2016)](https://mmacklin.com/xpbd.pdf): compliance regularization and constraint-force estimates. For an XPBD constraint, use alpha_tilde=alpha/h^2 and accumulated lambda; delta_lambda=(-C-alpha_tilde*lambda)/(sum(w_i*|grad C_i|^2)+alpha_tilde). Check signs against a two-particle stretch test. Do not mix position corrections into Planck without reciprocal impulses and a documented coupling order.
- [OptimumG Spring Brake](https://optimumg.com/spring-brake/): damping ratios, bump gaps, two-mass models and their limitations. Static load, supported axle mass and motion ratio must be explicit.

## Included bench

`../scripts/tire-bench.mjs` uses only installed Planck and Node's assertions. It constructs 32 rigid contact beads connected by elastic circumferential, radial and offset shear links to a rigid rim. Outer bead bodies, not a central rigid tire circle, contact the ground. The central rim is allowed to contact ground as a bottoming safeguard. The hub guide allows vertical travel; `collideConnected:true` is essential so this guide does not silently disable rim/ground contact.

This is a constrained spring network with physical deformation. It has no air-pressure state, calibrated rubber law, rotating/traction qualification, width dynamics or game integration. Solver stiffness depends on link effective mass and discretization; do not interpret joint frequency as tire pressure. The project's driving game still uses its old circular tire collider and visual deformation until a separately qualified integration replaces it.

Executed on 2026-11-03: at 30 kg hub load, settled hub height 0.479790 m and maximum radial deformation 0.009155 m; at 100 kg, 0.473372 m and 0.016037 m. Halving the step from 1/480 to 1/960 changed loaded hub height by 0.0000668 m. Contact widths were 0.171931 and 0.172127 m: the coarse bead discretization gives a nearly unchanged active patch in these two cases, so this is not sufficient contact-patch calibration. Node-count convergence, load sweeps and real-tire measurements remain required.

The first trial collapsed under 100 kg and revealed disabled rim/ground contact due to the guide's default collideConnected=false. The corrected bench enables rim contact and increases elastic link stiffness; it asserts that the specified loaded case stays above rim bottoming. This rejection is not hidden by changing the renderer.

## Vehicle integration acceptance

Remove the old rigid tire's terrain and liner mask; connect the rigid rotating rim through a revolute drive to its suspension hub; keep rim bottoming and all node collisions correctly filtered. Render the collision beads' outer envelope from actual state without ground clamping. Qualify reciprocal force/torque, pressure/compliance response, load/unload, contact patch, step/node convergence, rolling resistance, starts/braking and whole-course behavior before making it the default. Preserve existing drive selection and A/D controls.

No experimental result here establishes engineering or real-vehicle accuracy. Installation of a skill is an instruction/workflow change, not a replacement physics engine.
