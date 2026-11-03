import {World,Vec2,Edge,Circle,PrismaticJoint} from 'planck';
import {createPneumaticTire,RIM_RADIUS} from '../src/pneumatic-tire.js';
export function createBench({pressure=2.2,load=250,count=32,gravity=-9.81,iterations=16}={}){
 const world=new World(Vec2(0,gravity)),ground=world.createBody();ground.createFixture(new Edge(Vec2(-5,0),Vec2(5,0)),{friction:1});
 const rim=world.createDynamicBody(Vec2(0,.7));rim.createFixture(new Circle(RIM_RADIUS),{density:load/(Math.PI*RIM_RADIUS**2),filterGroupIndex:-2,filterCategoryBits:2,filterMaskBits:1});
 world.createJoint(new PrismaticJoint({collideConnected:true},ground,rim,rim.getPosition(),Vec2(0,1)));
 const tire=createPneumaticTire(world,rim,{pressure,count});
 return {world,rim,tire,step(dt=1/480,seconds=5){for(let i=0;i<seconds/dt;i++){tire.applyPressure();world.step(dt,iterations,8);}}};
}

