// Render on a short delayed simulation timeline, not on message arrival.
// Every tire point is interpolated between two measured physical states.
// There is no extrapolation, terrain projection or new force model here.
const mix=(a,b,t)=>a+(b-a)*t;
function point(out,a,b,t){out.x=mix(a.x,b.x,t);out.y=mix(a.y,b.y,t);}
function blend(out,a,b,t){
  for(const key of ['elapsed','engineLoad','wheelPowerKW','accelerator','nitroCharge'])out[key]=mix(a[key],b[key],t);
  out.boosting=t<.5?a.boosting:b.boosting;
  out.launchSeconds=t<1?a.launchSeconds:b.launchSeconds;
  point(out.body.position,a.body.position,b.body.position,t);
  point(out.body.velocity,a.body.velocity,b.body.velocity,t);
  out.body.angle=mix(a.body.angle,b.body.angle,t);
  point(out.exhaustMount.point,a.exhaustMount.point,b.exhaustMount.point,t);
  point(out.exhaustMount.velocity,a.exhaustMount.velocity,b.exhaustMount.velocity,t);
  out.exhaustMount.offset=mix(a.exhaustMount.offset,b.exhaustMount.offset,t);
  for(let i=0;i<2;i++){
    point(out.wheels[i].position,a.wheels[i].position,b.wheels[i].position,t);
    // Planck angles are continuous, including multiple wheel revolutions.
    out.wheels[i].angle=mix(a.wheels[i].angle,b.wheels[i].angle,t);
    point(out.rims[i],a.rims[i],b.rims[i],t);
    out.travel[i]=mix(a.travel[i],b.travel[i],t);
    for(const key of ['pressureBar','skin','outerRadius','rimRadius'])out.tires[i][key]=mix(a.tires[i][key],b.tires[i][key],t);
    for(let j=0;j<out.tires[i].nodes.length;j++)point(out.tires[i].nodes[j],a.tires[i].nodes[j],b.tires[i].nodes[j],t);
  }
}

export function createSnapshotPlayback({delay=.05}={}){
  const frames=[];let state,cursor=0,started=false,holds=0,rate=1;
  return {
    get state(){return state;},
    get bufferMs(){return frames.length?(frames.at(-1).elapsed-cursor)*1000:0;},
    get size(){return frames.length;},
    get holds(){return holds;},
    reset(initial){frames.length=0;frames.push(initial);state=structuredClone(initial);cursor=initial.elapsed;started=false;holds=0;rate=1;},
    push(batch){
      for(const frame of batch)if(!frames.length||frame.elapsed>frames.at(-1).elapsed)frames.push(frame);
      // Normal storage is about 7–13 states; cap even malformed/late traffic.
      while(frames.length>32)frames.shift();
    },
    advance(dt){
      if(!state)return;
      const newest=frames.at(-1).elapsed;
      if(!started){if(newest-cursor>=delay-1e-9)started=true;return;}
      // Clock recovery is gradual. An arriving packet must never teleport the
      // render cursor forward, even after a long worker stall.
      const backlog=newest-cursor;
      const frameDt=Math.max(0,Math.min(.05,dt));
      const targetRate=backlog>delay+.025?1.03:backlog<.025?.95:1;
      rate+=(targetRate-rate)*(1-Math.exp(-frameDt*6));
      const next=Math.min(newest,cursor+frameDt*rate);
      if(next===cursor&&dt>0)holds++;
      cursor=next;
      while(frames.length>2&&frames[1].elapsed<=cursor)frames.shift();
      const a=frames[0],b=frames[1]??a;
      // If an exceptional overflow retired our bracket, resume from the oldest
      // retained state only on reset; otherwise hold rather than jump ahead.
      if(cursor<a.elapsed)return;
      const t=b.elapsed>a.elapsed?Math.max(0,Math.min(1,(cursor-a.elapsed)/(b.elapsed-a.elapsed))):0;
      blend(state,a,b,t);
    }
  };
}
