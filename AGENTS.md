# Suspension Lab project instructions

This project is a JavaScript/Canvas driving game using Planck 1.5.1 and SI units. Keep documentation and technical notes in English; communicate with the user in Russian.

## Physics skills

For suspension, contact, tire material or solver work, read `.agents/skills/planck-vehicle-dynamics/SKILL.md`. For numerical integration and elastic constraints, use `.agents/skills/realtime-physics/SKILL.md` and its reviewed source notes. These are project-local, discoverable Codex skills; they do not require a global configuration change.

The user requires physically deformable tires. Completion requires contact-bearing tire elements to deform and affect hub forces/traction; renderer-only squash or a spring between rigid circles does not satisfy this requirement. The current game's circular tire collider remains an explicitly incomplete approximation. The installed skill's executable ring bench is experimental and is not integrated into the game.

## Verification and preservation

Preserve unrelated work and existing drive/A-D behavior. Run `npm test`, `npm run lint`, and `npm run build` for gameplay changes. For skill-only changes validate the skill frontmatter/resources and run any included executable examples; do not claim game physics changed merely because a skill was installed. Record material verification and remaining uncertainty in `docs/STATUS.md`. Keep task diagnostics in `work/`, retain only the latest useful run for seven days, and avoid unbounded traces. Follow the parent's generic preservation and commit requirements; its Junk to Neon product architecture belongs to another project.
