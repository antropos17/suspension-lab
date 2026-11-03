# Suspension Lab

A tiny local 2D driving game. No account, backend, or network connection is required after installation.

## Play

Double-click `Play.cmd`, then open http://127.0.0.1:4187. Alternatively run `npm run dev` in this directory. The server binds to loopback only. Close its window to stop it.

- A: reverse. D: accelerate. Arrow keys also work.
- Space: brake. P: pause. R: restart.
- Touch controls are available on screen.
- Reach the finish along the 260 m trail. Restart if you roll over.
- Spring stiffness and shock damping affect the simulation immediately. Show chassis reveals the suspension.

## Physics

Planck provides rigid bodies, rotating wheels, friction, collision response and two independent wheel joints. Gravity is 9.81 m/s²; physics advances at 120 Hz with bounded frame accumulation. Springs use frequency and a damping ratio. This is a physically based 2D prototype, not a validated full vehicle engineering model. It does not model tire deformation, suspension linkage geometry, transmission or 3D weight transfer.

Reference: https://piqnt.dev/planck.js/docs/joint/distance-joint.html (spring frequency and damping concepts).

## Develop

Node.js 22 or newer. Run `npm ci`, `npm test`, `npm run lint`, `npm run build`. Source lives in `src`; static interface and bundled output live in `dist`. Dependencies are pinned in `package-lock.json`. Rebuild after source edits.

## Storage

No runtime log or replay files are written. The HTTP server logs its address once. Disposable verification artifacts belong in `work/`; retain only the most recent verification run and remove closed artifacts older than seven days. Dependencies can be recreated with `npm ci`.
