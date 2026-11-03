# Source and reviewed changes

Installed with the official skill-installer helper from m-e-conroy/Skills-Library, `.github/skills/physics`, commit `da9b6ed2640cab6a2b02c18eceee0b2fa124294b` on 2026-11-03. Original author material remains attributed to that repository. No root LICENSE was found at that ref; this is a local installation, not a redistribution/license grant.

Local changes: scoped description/name, optional related-skill references, fixed the forward Euler example (it originally duplicated semi-implicit Euler), removed the claim that symplectic Euler exactly conserves energy, fixed the one-step Verlet velocity denominator, and clarified explicit RK4 stiffness limits. Reviewed the distance-constraint signs: they are correct for delta=B-A and were retained. The collision-response example is a simplified center-of-mass example; use Planck's installed solver for actual rigid contacts, including angular effective mass and friction.

The upstream bend reference is illustrative, not a validated general bending solver; use the primary XPBD derivation and tests before adding bending. Existing SPH/bend references are not needed for the vehicle skill and are not acceptance evidence.
