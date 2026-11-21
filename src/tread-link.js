// Planck 1.5.1 soft distance constraint for a link ending at the centre of a
// fixed-rotation tread node. All contacts still use the standard island solver.
import {DistanceJoint, Settings, Vec2} from 'planck';

export class TreadLink extends DistanceJoint {
  constructor(def,a,b,start,end){
    super(def,a,b,start,end);
    this.m_u=Vec2();
  }
  initVelocityConstraints(step){
    const a=this.m_bodyA,b=this.m_bodyB;
    const pa=a.c_position,pb=b.c_position;
    const lx=this.m_localAnchorA.x-a.m_sweep.localCenter.x;
    const ly=this.m_localAnchorA.y-a.m_sweep.localCenter.y;
    let rx=0,ry=0;
    if(lx || ly){
      const cos=Math.cos(pa.a),sin=Math.sin(pa.a);
      rx=cos*lx-sin*ly;ry=sin*lx+cos*ly;
    }
    const dx=pb.c.x-(pa.c.x+rx),dy=pb.c.y-(pa.c.y+ry);
    const length=Math.sqrt(dx*dx+dy*dy);
    const scale=length>Settings.linearSlop*Settings.lengthUnitsPerMeter?1/length:0;
    this.m_u.x=dx*scale;this.m_u.y=dy*scale;
    this.arm=rx*this.m_u.y-ry*this.m_u.x;
    const inverseMass=a.m_invMass+b.m_invMass+a.m_invI*this.arm*this.arm;
    const mass=1/inverseMass,omega=2*Math.PI*this.m_frequencyHz;
    const stiffness=mass*omega*omega,damping=2*mass*this.m_dampingRatio*omega;
    this.m_gamma=1/(step.dt*(damping+step.dt*stiffness));
    this.m_bias=(length-this.m_length)*step.dt*stiffness*this.m_gamma;
    this.m_mass=1/(inverseMass+this.m_gamma);
    this.m_impulse=step.warmStarting?this.m_impulse*step.dtRatio:0;
    this.applyTreadImpulse(this.m_impulse);
  }
  solveVelocityConstraints(){
    const a=this.m_bodyA.c_velocity,b=this.m_bodyB.c_velocity,u=this.m_u;
    const relative=u.x*(b.v.x-a.v.x)+u.y*(b.v.y-a.v.y)-this.arm*a.w;
    const impulse=-this.m_mass*(relative+this.m_bias+this.m_gamma*this.m_impulse);
    this.m_impulse+=impulse;
    this.applyTreadImpulse(impulse);
  }
  applyTreadImpulse(impulse){
    const a=this.m_bodyA,b=this.m_bodyB;
    const px=impulse*this.m_u.x,py=impulse*this.m_u.y;
    a.c_velocity.v.x-=a.m_invMass*px;a.c_velocity.v.y-=a.m_invMass*py;
    a.c_velocity.w-=a.m_invI*this.arm*impulse;
    b.c_velocity.v.x+=b.m_invMass*px;b.c_velocity.v.y+=b.m_invMass*py;
  }
}
