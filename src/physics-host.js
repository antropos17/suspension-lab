import { createSimulation } from './physics.js';

const point = p => ({ x:p.x, y:p.y });
// Explicit snapshots keep Planck objects, joints and the contact solver off the
// UI thread. Contact nodes are copied without reshaping or terrain projection.
export function snapshot(sim) {
  return {
    elapsed:sim.elapsed, engineLoad:sim.engineLoad, accelerator:sim.accelerator, nitroCharge:sim.nitroCharge, boosting:sim.boosting,
    body:{position:point(sim.body.getPosition()),angle:sim.body.getAngle(),velocity:point(sim.body.getLinearVelocity())},
    wheels:sim.wheels.map(w=>({position:point(w.getPosition()),angle:w.getAngle()})),
    rims:sim.rims.map(r=>point(r.getPosition())),
    travel:sim.joints.map(j=>j.getJointTranslation()),
    tires:sim.tires.map(t=>({skin:t.skin,rimRadius:t.rimRadius,outerRadius:t.outerRadius,pressureBar:t.pressureBar,nodes:t.nodes.map(n=>point(n.getPosition()))})),
    exhaustMount:{point:point(sim.exhaustMount.point),velocity:point(sim.exhaustMount.velocity),offset:sim.exhaustMount.offset}
  };
}

export function createPhysicsHost(send) {
  let sim, generation=0, settings={};
  return message => {
    const started=performance.now();
    const frames=[];
    try {
      if(message.type==='reset') {
        generation=message.generation;
        settings={...message.settings};
        sim=createSimulation(settings);
      } else if(message.type==='step'&&sim&&message.generation===generation) {
        const next=message.settings;
        if(next.levels?.some((level,i)=>level!==settings.levels?.[i]) || next.kits?.some((v,i)=>v!==settings.kits?.[i]))sim.setBuild(next.levels,next.kits);
        if(next.drive!==settings.drive)sim.setDrive(next.drive);
        if(next.pressure!==settings.pressure)sim.setPressure(next.pressure);
        if(next.frequency!==settings.frequency||next.damping!==settings.damping)sim.tune(next.frequency,next.damping);
        settings={...next};
        // Never process an unbounded catch-up job after a suspended tab.
        const steps=Math.max(0,Math.min(6,Math.floor(message.steps)||0));
        const throttle=Math.max(-1,Math.min(1,Number(message.throttle)||0));
        for(let i=0;i<steps;i++){sim.step(throttle,!!message.brake,!!message.nitro);frames.push(snapshot(sim));}
      } else return;
      if(!frames.length)frames.push(snapshot(sim));
      send({generation,state:frames.at(-1),frames,workerMs:performance.now()-started});
    } catch(error) {
      send({generation:message.generation,error:error.message});
    }
  };
}
