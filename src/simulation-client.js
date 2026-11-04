import { STEP } from './vehicle-constants.js';
import { GROUND_COUNT, GROUND_START, GROUND_STEP, terrainHeight } from './terrain.js';

// At most one worker job is in flight. New input replaces queued input rather
// than building a message backlog. Reset generations reject stale replies.
export function createSimulationClient(worker=new Worker('/physics-worker.js')) {
  let state, generation=0, pending=false, accumulator=0, settings={};
  const client={ready:false,error:null,workerMs:0};
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
    setPressure(pressure){settings.pressure=pressure;},
    tune(frequency,damping){settings.frequency=frequency;settings.damping=damping;},
    suspend(){accumulator=0;},
    advance(dt,throttle,brake){
      if(!client.ready||client.error)return;
      accumulator=Math.min(STEP*6,accumulator+Math.max(0,dt));
      const steps=Math.min(6,Math.floor((accumulator+1e-10)/STEP));
      if(pending||!steps)return;
      accumulator-=steps*STEP;pending=true;
      worker.postMessage({type:'step',generation,steps,throttle,brake,settings:{...settings}});
    },
    dispose(){worker.terminate();}
  });
  // Getters must stay live: Object.assign would evaluate them prematurely.
  for(const key of ['elapsed','engineLoad','accelerator','exhaustMount'])Object.defineProperty(client,key,{get:()=>state?.[key]??(key==='exhaustMount'?null:0),configurable:true});
  worker.onmessage=({data})=>{
    if(data.generation!==generation)return;
    pending=false;
    if(data.error){client.error=data.error;client.ready=false;return;}
    state=data.state;client.workerMs=data.workerMs;client.ready=true;
  };
  worker.onerror=event=>{client.error=event.message||'Physics worker failed';client.ready=false;};
  return client;
}
