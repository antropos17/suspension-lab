// Bounded sprite atlas replaces up to 1,260 radial gradients per frame.
// Particle positions, age, throttle/load darkness and ground interaction remain
// world-space state from exhaust.js; only the billow drawing is cached.
export function createSmokeRenderer(){
  const sprites=Array.from({length:17},(_,tone)=>Array.from({length:3},(_,variant)=>{
    const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
    const c=canvas.getContext('2d'),shade=Math.round(142-tone/16*111),radius=58;
    c.translate(64,64);
    for(let k=0;k<3;k++){
      const a=variant*.7+k*2.1,x=Math.cos(a)*radius*.25,y=Math.sin(a)*radius*.25;
      const cloud=c.createRadialGradient(x,y,radius*.08,x,y,radius*.8);
      cloud.addColorStop(0,`rgba(${shade},${shade+3},${shade+5},.65)`);
      cloud.addColorStop(.4,`rgba(${shade+8},${shade+10},${shade+11},.44)`);
      cloud.addColorStop(1,`rgba(${shade+15},${shade+17},${shade+18},0)`);
      c.fillStyle=cloud;c.beginPath();c.arc(x,y,radius*.8,0,Math.PI*2);c.fill();
    }
    return canvas;
  }));
  return (c,p,x,y,r,alpha)=>{
    const sprite=sprites[Math.max(0,Math.min(16,Math.round(p.dark*16)))][Math.floor(p.phase*3)%3];
    const size=r*128/58;
    c.save();c.globalAlpha=alpha;c.translate(x,y);c.rotate(p.phase+p.age*.2);c.scale(p.stretch,1);
    c.drawImage(sprite,-size/2,-size/2,size,size);c.restore();
  };
}
