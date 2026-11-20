// A damped hanger model driven by chassis acceleration and engine pulses.
export function createExhaustMount(body,tipX=-2.12,baseY=-.25) {
  let offset=0,speed=0,time=0,previousVelocity=body.getLinearVelocityFromWorldPoint(body.getWorldPoint({x:-1.85,y:baseY}));
  return {
    get offset(){return offset;},
    get speed(){return speed;},
    get tipLocal(){return {x:tipX,y:baseY+offset};},
    get point(){return body.getWorldPoint(this.tipLocal);},
    get velocity(){const v=body.getLinearVelocityFromWorldPoint(this.point),axis=body.getWorldVector({x:0,y:1});return {x:v.x+axis.x*speed,y:v.y+axis.y*speed};},
    step(dt,gas){
      time+=dt;
      const v=body.getLinearVelocityFromWorldPoint(body.getWorldPoint({x:-1.85,y:baseY}));
      const axis=body.getWorldVector({x:0,y:1});
      const acceleration=((v.x-previousVelocity.x)*axis.x+(v.y-previousVelocity.y)*axis.y)/dt;
      previousVelocity={x:v.x,y:v.y};
      const omega=2*Math.PI*3.6;
      const pulse=Math.sin(time*(35+gas*50))*(.7+gas*1.4);
      speed+=(-omega*omega*offset-2*.32*omega*speed-Math.max(-65,Math.min(65,acceleration))*.45+pulse)*dt;
      offset+=speed*dt;
      if(Math.abs(offset)>.045){offset=Math.sign(offset)*.045;speed*=.15;}
    }
  };
}
