export function createWheelSpray(){
  const drops=[], carry=[0,0];
  return {
    reset(){drops.length=0;carry.fill(0);},
    step(sim,dt){
      for(let i=drops.length-1;i>=0;i--){
        const d=drops[i];d.life-=dt;
        if(d.life<=0){drops.splice(i,1);continue;}
        d.vy-=9.81*dt;d.x+=d.vx*dt;d.y+=d.vy*dt;
      }
      const vx=sim.body.getLinearVelocity().x;
      for(let i=0;i<2;i++){
        const rate=sim.spray[i],kind=sim.wetKind[i];
        if(!kind||rate<.015){carry[i]=0;continue;}
        carry[i]+=dt*rate*55;
        while(carry[i]>=1){
          carry[i]--;
          if(drops.length>=80)break;
          const hub=sim.wheels[i].getPosition(),r=sim.tires[i].outerRadius,side=Math.random()<.78?-1:1;
          const dir=side*(vx<0?-1:1);
          drops.push({x:hub.x+dir*r*.64,y:hub.y-r*.58,
            vx:vx*.32+dir*(.7+Math.random()*2)*Math.min(2,rate+.3),vy:1.15+Math.random()*2.4*rate,
            r:.012+Math.random()*.021,life:.2+Math.random()*.38,kind});
        }
      }
    },
    draw(c,X,Y,scale,ground){
      for(const d of drops){
        if(d.y<ground(d.x))continue;
        c.fillStyle=d.kind==='mud'?'#785d42':'rgba(187,206,204,.8)';
        c.beginPath();c.ellipse(X(d.x),Y(d.y),Math.max(1,d.r*scale),Math.max(1,d.r*scale*.7),0,0,Math.PI*2);c.fill();
      }
    }
  };
}
