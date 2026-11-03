// A hand-drawn 1970s trail sedan. Geometry is in chassis-local metres.
// Palette: oxblood enamel, ivory roof, cool glass, graphite rubber, brushed chrome.
export const ARCH_RADIUS = .60;
const ARCH_Y = -.55, SILL_Y = -.34;
const archAngle = Math.asin((SILL_Y - ARCH_Y) / ARCH_RADIUS);
const archWidth = Math.cos(archAngle) * ARCH_RADIUS;

function bodyPath(c) {
  c.beginPath(); c.moveTo(-2.04, SILL_Y);
  c.lineTo(-2.09,.22); c.quadraticCurveTo(-2.07,.34,-1.96,.36);
  c.lineTo(-1.19,.42); c.lineTo(-.82,.99); c.quadraticCurveTo(-.75,1.08,-.61,1.09);
  c.lineTo(.42,1.09); c.quadraticCurveTo(.55,1.07,.62,.99);
  c.lineTo(1.04,.43); c.lineTo(1.98,.36); c.quadraticCurveTo(2.09,.33,2.09,.22);
  c.lineTo(2.07,SILL_Y); c.lineTo(1.25+archWidth,SILL_Y);
  c.arc(1.25,ARCH_Y,ARCH_RADIUS,archAngle,Math.PI-archAngle);
  c.lineTo(-1.25+archWidth,SILL_Y);
  c.arc(-1.25,ARCH_Y,ARCH_RADIUS,archAngle,Math.PI-archAngle);
  c.closePath();
}

export function drawWheelWells(c) {
  c.save();bodyPath(c);c.fillStyle='#161c1d';c.fill();
  // Inner wells sit behind the moving rubber; no paint crosses the opening.
  for(const x of [-1.25,1.25]){
    c.save();c.beginPath();c.rect(x-.7,SILL_Y,1.4,1);c.clip();
    const shade=c.createRadialGradient(x,-.42,.1,x,-.42,.65);
    shade.addColorStop(0,'#111719');shade.addColorStop(1,'#353a37');
    c.beginPath();c.arc(x,ARCH_Y,ARCH_RADIUS+.025,0,Math.PI);c.fillStyle=shade;c.fill();
    c.restore();
  }
  c.restore();
}

export function drawClassicBody(c, xray, soot) {
  const line=(p,color,w)=>{c.beginPath();p.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=color;c.lineWidth=w;c.lineJoin='round';c.stroke();};
  const poly=(p,color,stroke,w=.018)=>{c.beginPath();p.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=color;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=w;c.stroke();}};
  const dot=(x,y,r,color)=>{c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fillStyle=color;c.fill();};
  const rect=(x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(x,y,w,h);};
  const paint=c.createLinearGradient(0,-.4,0,1.1);
  paint.addColorStop(0,'#38252b');paint.addColorStop(.25,'#6e2730');paint.addColorStop(.55,'#993e44');paint.addColorStop(.7,'#c16b69');paint.addColorStop(1,'#783239');
  const chrome=c.createLinearGradient(0,-.32,0,-.12);
  chrome.addColorStop(0,'#424c50');chrome.addColorStop(.45,'#a4adb0');chrome.addColorStop(.55,'#f1efde');chrome.addColorStop(1,'#6b7b80');
  c.save();c.globalAlpha=xray?.28:1;
  bodyPath(c);c.fillStyle=paint;c.fill();c.strokeStyle='#302b2e';c.lineWidth=.024;c.stroke();
  c.save();bodyPath(c);c.clip();
  // Roof and gutters, with real pillar widths around the glass.
  poly([[-1.07,.57],[-.8,1.02],[-.63,1.09],[.43,1.09],[.61,1],[.94,.57]],'#dbd9cc');
  line([[-.85,1.03],[-.66,1.075],[.43,1.075],[.57,1.025]],'#f7f2df',.024);
  const glass=c.createLinearGradient(0,.44,0,1.0);
  glass.addColorStop(0,'#719096');glass.addColorStop(.5,'#39565f');glass.addColorStop(1,'#233c49');
  const windows=[
    [[-1.02,.47],[-.73,.96],[-.21,.98],[-.21,.47]],
    [[-.11,.47],[-.11,.98],[.43,.98],[.79,.47]],
    [[.83,.47],[.61,.81],[.9,.47]]
  ];
  for(const window of windows){
    poly(window,glass,'#262e32',.035);
    c.save();c.beginPath();window.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.clip();
    // Interior stays attached to the sprung body.
    poly([[-.93,.45],[-.9,.67],[-.71,.67],[-.65,.46]],'#263034');
    poly([[.02,.45],[.04,.68],[.22,.69],[.31,.45]],'#263034');
    rect(-.87,.67,.13,.1,'#303638');rect(.05,.69,.13,.1,'#303638');
    line([[.49,.49],[.56,.64]],'#1d292f',.035);
    c.beginPath();c.ellipse(.58,.63,.105,.028,-.8,0,Math.PI*2);c.strokeStyle='#263136';c.lineWidth=.018;c.stroke();
    poly([[-1.1,.61],[-.66,1.03],[-.4,1.03],[-.83,.61]],'#ffffff16');
    poly([[-.06,.48],[.45,1.04],[.58,1.04],[.06,.48]],'#d0e4e323');
    c.restore();
    line([window[0],window[window.length-1]],'#dde0d4',.022);
  }
  line([[.42,.96],[.45,.49]],'#ced2c7',.021); // front quarter-light divider
  line([[-1.11,.44],[.99,.44]],'#222d30',.035);
  line([[-1.13,.41],[1.02,.41]],'#d2d4ca',.024);
  // Stamped panel creases and four-door shut lines.
  line([[-1.96,.3],[-1.19,.36]],'#e29488',.018);
  line([[1.07,.37],[1.98,.31]],'#df877e',.022);
  line([[-2.02,.17],[2.04,.17]],'#502c32',.022);
  line([[-2.02,.195],[2.04,.195]],'#cb7970',.014);
  for(const p of [[[-1.07,.4],[-1.04,.25],[-.66,.03],[-.65,-.27]],[[-.16,.43],[-.16,-.27]],[[.85,.42],[.89,.24],[.69,.01],[.67,-.28]]])line(p,'#40292f',.018);
  line([[-.63,-.29],[.66,-.29]],'#c5c7b9',.035);
  line([[-.59,-.32],[.63,-.32]],'#252b2c',.024);
  // Chrome side moulding stays clipped to the wheel openings.
  line([[-2.03,-.055],[2.06,-.055]],'#242e30',.048);
  line([[-2.03,-.04],[2.06,-.04]],'#c4c9c2',.018);
  for(const x of [-.65,.15]){
    rect(x,.27,.23,.048,'#402a2e');rect(x+.018,.292,.2,.035,'#d8dacc');
    dot(x+.18,.267,.013,'#c4cac7');
  }
  // Fuel flap, rear pillar vents, emblem, indicator and fine road dirt.
  c.strokeStyle='#512d34';c.lineWidth=.014;c.strokeRect(-1.77,.21,.19,.115);
  for(let i=0;i<5;i++)line([[-.97+i*.026,.51],[-.9+i*.026,.63]],'#544c4a',.012);
  rect(1.6,.21,.13,.045,'#d8c8ac');rect(1.64,.215,.08,.035,'#df9138');
  line([[1.16,.265],[1.37,.265]],'#d8d4c9',.018);
  for(let i=0;i<75;i++){
    const x=-2+4*((Math.sin(i*43.17)*437.23)%1+1)%4;
    const y=-.32+Math.abs(Math.sin(i*7.7))*.21;
    dot(x,y,.006+Math.abs(Math.sin(i*1.3))*.014,'#b59b7140');
  }
  // Arch lips are concentric with the physical liner, outside the cutout.
  for(const x of [-1.25,1.25]){
    c.beginPath();c.arc(x,ARCH_Y,ARCH_RADIUS+.026,archAngle,Math.PI-archAngle);
    c.strokeStyle='#d39a8b';c.lineWidth=.025;c.stroke();
    c.beginPath();c.arc(x,ARCH_Y,ARCH_RADIUS+.055,archAngle,Math.PI-archAngle);
    c.strokeStyle='#522d34';c.lineWidth=.012;c.stroke();
  }
  const stain=c.createRadialGradient(-2,-.21,0,-2,-.21,.27);
  stain.addColorStop(0,`rgba(15,18,19,${.15+soot*.6})`);stain.addColorStop(1,'rgba(15,18,19,0)');
  rect(-2.09,-.34,.48,.39,stain);
  c.restore();
  // Lamps and bumpers live outside the body silhouette, away from the arches.
  poly([[-2.088,.2],[-1.94,.2],[-1.94,.02],[-2.08,.02]],'#632829','#2b3030');
  rect(-2.075,.12,.12,.065,'#e47f57');rect(-2.075,.045,.12,.06,'#ad3637');
  for(let j=0;j<4;j++)line([[-2.07+j*.028,.04],[-2.07+j*.028,.18]],'#f5a77b50',.009);
  poly([[1.96,.23],[2.09,.21],[2.09,.035],[1.96,.035]],'#f1e6bd','#474b49',.024);
  line([[2.04,.055],[2.04,.2]],'#fff6d5',.022);
  rect(2.02,-.07,.075,.07,'#db9c45');
  for(const [a,b] of [[-2.17,-1.88],[1.91,2.18]]){
    rect(a,-.28,b-a,.12,'#283032');rect(a,-.24,b-a,.08,chrome);
    rect(a+.045,-.29,.045,.15,'#323736');
  }
  // Door mirror and windshield wiper.
  line([[.72,.43],[.81,.55]],'#c1c6bd',.025);
  poly([[.77,.55],[.92,.56],[.94,.46],[.79,.45]],'#b6bdb5','#313c3d',.02);
  line([[.96,.445],[.67,.57]],'#28363a',.013);
  c.restore();
}
