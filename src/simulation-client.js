import { STEP } from './vehicle-constants.js';
import { GROUND_COUNT, GROUND_START, GROUND_STEP, terrainHeight } from './terrain.js';
import { createSnapshotPlayback } from './snapshot-playback.js';

// At most one worker job is in flight. New input replaces queued input rather
// than building a message backlog. Reset generations reject stale replies.
export function createSimulationClient(worker=new Worker('physics-worker.js')) {
  let state, generation=0, pending=false, accumulator=0, settings={};
  const client={ready:false,error:null,workerMs:0};
  const playback=createSnapshotPlayback();
  let throttle=0,brake=false,nitro=false;
  function sendPendingSteps(){
    if(!client.ready||client.error||pending)return;
    const steps=Math.min(6,Math.floor((accumulator+1e-10)/STEP));
    if(!steps)return;
    accumulator-=steps*STEP;pending=true;
    worker.postMessage({type:'step',generation,steps,throttle,brake,nitro,settings:{...settings}});
  }
  const body={
    getPosition:()=>state.body.position,
    getAngle:()=>state.body.angle,
    getLinearVelocity:()=>state.body.velocity,
    getWorldVector:({x,y})=>{const a=state.body.angle,c=Math.cos(a),s=Math.sin(a);return {x:x*c-y*s,y:x*s+y*c};},
    getWorldPoint:p=>{const v=body.getWorldVector(p),b=body.getPosition();return {x:b.x+v.x,y:b.y+v.y};}
  };
  Object.assign(client,{
    body,
    points:Array.from({length:GROUND_COUNT+1},(_,i)=>{const x=GROUND_START+i*GROUND_STEP;return {x,y:terrainHeight(x)};}),
    wheels:[0,1].map(i=>({getPosition:()=>state.wheels[i].position,getAngle:()=>state.wheels[i].angle})),
    rims:[0,1].map(i=>({getPosition:()=>state.rims[i]})),
    joints:[0,1].map(i=>({getJointTranslation:()=>state.travel[i]})),
    tires:[0,1].map(i=>({
      get rimRadius(){return state.tires[i].rimRadius;},
      get outerRadius(){return state.tires[i].outerRadius;},
      get skin(){return state.tires[i].skin;},
      get pressureBar(){return state.tires[i].pressureBar;},
      nodes:Array.from({length:32},(_,j)=>({getPosition:()=>state.tires[i].nodes[j]})),
      getOutline(){const t=state.tires[i],n=t.nodes;return n.map((p,j)=>{const prev=n[(j+n.length-1)%n.length],next=n[(j+1)%n.length],dx=next.x-prev.x,dy=next.y-prev.y,len=Math.hypot(dx,dy)||1;return {x:p.x+dy/len*t.skin,y:p.y-dx/len*t.skin};});}
    })),
    reset(config){
      generation++;settings={...config};pending=true;accumulator=0;client.ready=false;client.error=null;
      worker.postMessage({type:'reset',generation,settings});
    },
    setDrive(drive){settings.drive=drive;},
    setBuild(levels,kits=[]){settings.levels=[...levels];settings.kits=[...kits];},
    setPressure(pressure){settings.pressure=pressure;},
    tune(frequency,damping){settings.frequency=frequency;settings.damping=damping;},
    suspend(){accumulator=0;},
    advance(dt,nextThrottle,nextBrake,nextNitro=false){
      if(!client.ready||client.error)return;
      throttle=nextThrottle;brake=nextBrake;nitro=nextNitro;
      playback.advance(dt);
      accumulator=Math.min(STEP*6,accumulator+Math.max(0,dt));
      sendPendingSteps();
    },
    dispose(){worker.terminate();}
  });
  // Getters must stay live: Object.assign would evaluate them prematurely.
  for(const key of ['launchSeconds','hundredSeconds'])Object.defineProperty(client,key,{get:()=>state?.[key]??null});
  for(const key of ['elapsed','engineLoad','wheelPowerKW','engineRPM','accelerator','dirt','spray','wetKind','exhaustMount','nitroCharge','boosting'])Object.defineProperty(client,key,{get:()=>state?.[key]??(key==='exhaustMount'?null:0),configurable:true});
  Object.defineProperty(client,'bufferMs',{get:()=>playback.bufferMs});
  Object.defineProperty(client,'renderHolds',{get:()=>playback.holds});
  worker.onmessage=({data})=>{
    if(data.generation!==generation)return;
    pending=false;
    if(data.error){client.error=data.error;client.ready=false;return;}
    if(!client.ready){playback.reset(data.state);state=playback.state;}
    else playback.push(data.frames??[data.state]);
    client.workerMs=data.workerMs;client.ready=true;
    // Under load the next input is already buffered. Let the worker start as
    // soon as it is free, without waiting for another display refresh.
    if(accumulator>=STEP-1e-10)queueMicrotask(sendPendingSteps);
  };
  worker.onerror=event=>{client.error=event.message||'Physics worker failed';client.ready=false;};
  return client;
}
