# Suspension Lab

A tiny local 2D driving game. No account, backend, or network connection is required after installation.

## Play

Double-click `Play.cmd`, then open http://127.0.0.1:4187. Alternatively run `npm run dev` in this directory. The server binds to loopback only. Close its window to stop it.

- A: reverse. D: accelerate. Arrow keys also work.
- Space: brake. P: pause. R: restart.
- S or **Spin to drive** rolls six parts. Any result gives two seconds of forward throttle. Each additional copy of the most frequent part adds 1.5 seconds, up to 9.5 seconds. A/D, the brake or any pedal immediately takes over. Pause freezes both the reels and the drive timer.
- Touch controls are available on screen.
- Reach the finish along the 260 m trail. Restart if you roll over.
- Spring stiffness and shock damping affect the simulation immediately. Show chassis reveals the suspension.
- Switch between front, rear and all-wheel drive while driving. The choice is retained when restarting the run.
- Exhaust soot slider: 0 switches off new smoke, 6x produces heavy smoke; default is 3x. The setting survives a run restart.
- Tire pressure controls nominal inflation from 0.6 to 3.2 bar and survives restart. Lower pressure physically deforms the carcass and changes road contact; actual operating pressures are shown for both axles. Show chassis reveals the tire network.
- Suspension guides limit compression and droop. Physical inner fender liners stop tires from moving through the wings; hubs follow chassis rotation and transmit drive reaction to it.

## Scenery

An original detailed Baku panorama features reflective Flame Towers, the banded limestone Maiden Tower, dense waterfront facades, the rolled Carpet Museum and the Caspian promenade. It is AI-generated architectural artwork, with compressed positions and scales, rather than a geographic photograph. One local image and cached sky/sea drawing provide offline parallax. Research, the generation prompt and reconstruction limits are recorded in `docs/BAKU-BACKGROUND.md`.

## Physics

Planck provides rigid contacts and joints. Each pneumatic tire now has 32 independent tread contact bodies, elastic belt/sidewall links and an isothermal pressure-volume model around a rigid rim. Pressure changes actual geometry and hub support; the renderer follows those contact bodies. Drive and brake torque pass through the rim and carcass into road contacts. Gravity is 9.81 m/s²; physics advances at 120 Hz with eight 960 Hz solver substeps for the default ring. This is a physically deformable 2D prototype, not calibrated rubber FEA or a validated full vehicle model. It does not model temperature, punctures, lateral tire deformation or 3D weight transfer.

Reference: https://piqnt.dev/planck.js/docs/joint/distance-joint.html (spring frequency and damping concepts).

## Develop

The revised suspension uses supported axle mass, static preload, asymmetric damping with blow-off and progressive bump/droop buffers. Smaller rims move independently within the compliant tire. An older-diesel exhaust effect responds to accelerator transients and measured drive load, with slowly accumulating tailpipe soot. See `docs/VEHICLE-MODEL.md` for equations, research sources, measurements and limitations.

Node.js 22 or newer. Run `npm ci`, `npm test`, `npm run lint`, `npm run build`. Source lives in `src`; static interface, the local panorama and bundled output live in `dist`. The build produces both `game.js` and `physics-worker.js`; serve both through the local HTTP server. Dependencies are pinned in `package-lock.json`. Rebuild after source edits.

Physics runs in a dedicated Web Worker with unchanged fixed-step tire/suspension solving and bounded catch-up. A short delayed snapshot buffer interpolates all vehicle components between solved 120 Hz states; the horizontal camera shares that pose. Soft smoke uses a half-resolution compositing layer while the car stays sharp; paused canvases stop redundant drawing. Smoke sprites and terrain samples are cached; HUD writes are limited to 10 Hz. The static server revalidates files with ETags and retains at most 16 files / 16 MiB in memory. Add `?profile` to the local game URL for bounded in-memory frame timings, buffer occupancy, render-clock holds and draw count in the hidden `frame-profile` output. It is not a hardware-independent FPS guarantee.

## Storage

No runtime log or replay files are written. The HTTP server logs its address once. Disposable verification artifacts belong in `work/`; retain only the most recent verification run and remove closed artifacts older than seven days. Dependencies can be recreated with `npm ci`.
