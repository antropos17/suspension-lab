# Suspension Lab

A tiny local 2D driving game. No account, backend, or network connection is required after installation.

## Play

Double-click `Play.cmd`, then open http://127.0.0.1:4187. Alternatively run `npm run dev` in this directory. The server binds to loopback only. Close its window to stop it.

- A: reverse. D: accelerate. Arrow keys also work.
- Space: brake. P: pause. R: restart.
- Touch controls are available on screen.
- Reach the finish along the 260 m trail. Restart if you roll over.
- Spring stiffness and shock damping affect the simulation immediately. Show chassis reveals the suspension.
- Switch between front, rear and all-wheel drive while driving. The choice is retained when restarting the run.
- Exhaust soot slider: 0 switches off new smoke, 6x produces heavy smoke; default is 3x. The setting survives a run restart.
- Tire pressure controls nominal inflation from 0.6 to 3.2 bar and survives restart. Lower pressure physically deforms the carcass and changes road contact; actual operating pressures are shown for both axles. Show chassis reveals the tire network.
- Suspension guides limit compression and droop. Physical inner fender liners stop tires from moving through the wings; hubs follow chassis rotation and transmit drive reaction to it.

## Scenery

An original layered Baku Bay panorama replaces the former woodland scenery: Flame Towers, Maiden Tower, limestone Old City silhouettes, waterfront facades, the rolled Carpet Museum, Baku Eye and the Caspian promenade. It is a compressed scenic composite rather than an exact street map. Two cached Canvas atlases provide offline parallax without remote image downloads. Research sources and design decisions are recorded in `docs/BAKU-BACKGROUND.md`.

## Physics

Planck provides rigid contacts and joints. Each pneumatic tire now has 32 independent tread contact bodies, elastic belt/sidewall links and an isothermal pressure-volume model around a rigid rim. Pressure changes actual geometry and hub support; the renderer follows those contact bodies. Drive and brake torque pass through the rim and carcass into road contacts. Gravity is 9.81 m/s²; physics advances at 120 Hz with eight 960 Hz solver substeps for the default ring. This is a physically deformable 2D prototype, not calibrated rubber FEA or a validated full vehicle model. It does not model temperature, punctures, lateral tire deformation or 3D weight transfer.

Reference: https://piqnt.dev/planck.js/docs/joint/distance-joint.html (spring frequency and damping concepts).

## Develop

The revised suspension uses supported axle mass, static preload, asymmetric damping with blow-off and progressive bump/droop buffers. Smaller rims move independently within the compliant tire. An older-diesel exhaust effect responds to accelerator transients and measured drive load, with slowly accumulating tailpipe soot. See `docs/VEHICLE-MODEL.md` for equations, research sources, measurements and limitations.

Node.js 22 or newer. Run `npm ci`, `npm test`, `npm run lint`, `npm run build`. Source lives in `src`; static interface and bundled output live in `dist`. Dependencies are pinned in `package-lock.json`. Rebuild after source edits.

## Storage

No runtime log or replay files are written. The HTTP server logs its address once. Disposable verification artifacts belong in `work/`; retain only the most recent verification run and remove closed artifacts older than seven days. Dependencies can be recreated with `npm ci`.
