// A hand-drawn 1970s trail sedan. Geometry is in chassis-local metres.
// Palette: oxblood enamel, ivory roof, cool glass, graphite rubber, brushed chrome.
import { ARCH_X, ARCH_Y_RADIUS, ARCH_CENTER_Y as ARCH_Y, SILL_Y } from './vehicle-geometry.js';
export { ARCH_RADIUS } from './vehicle-geometry.js';
const archAngle=Math.asin((SILL_Y-ARCH_Y)/ARCH_Y_RADIUS),archWidth=Math.cos(archAngle)*ARCH_X;

function bodyPath(c) {
  c.beginPath(); c.moveTo(-2.04, SILL_Y);
  c.lineTo(-2.09,.22); c.quadraticCurveTo(-2.07,.34,-1.96,.36);
  c.lineTo(-1.19,.42); c.lineTo(-.82,.99); c.quadraticCurveTo(-.75,1.08,-.61,1.09);
  c.lineTo(.42,1.09); c.quadraticCurveTo(.55,1.07,.62,.99);
  c.lineTo(1.04,.43); c.lineTo(1.98,.36); c.quadraticCurveTo(2.09,.33,2.09,.22);
  c.lineTo(2.07,SILL_Y); c.lineTo(1.25+archWidth,SILL_Y);
  c.ellipse(1.25,ARCH_Y,ARCH_X,ARCH_Y_RADIUS,0,archAngle,Math.PI-archAngle);
  c.lineTo(-1.25+archWidth,SILL_Y);
  c.ellipse(-1.25,ARCH_Y,ARCH_X,ARCH_Y_RADIUS,0,archAngle,Math.PI-archAngle);
  c.closePath();
}

export function drawWheelWells(c) {
  c.save();bodyPath(c);c.fillStyle='#161c1d';c.fill();
  // Inner wells sit behind the moving rubber; no paint crosses the opening.
  for(const x of [-1.25,1.25]){
    c.save();c.beginPath();c.rect(x-.7,SILL_Y,1.4,1);c.clip();
    const shade=c.createRadialGradient(x,-.42,.1,x,-.42,.65);
    shade.addColorStop(0,'#111719');shade.addColorStop(1,'#353a37');
    c.beginPath();c.ellipse(x,ARCH_Y,ARCH_X+.025,ARCH_Y_RADIUS+.025,0,0,Math.PI);c.fillStyle=shade;c.fill();
    c.restore();
  }
  c.restore();
}

// Chipped seam edges stay fixed in chassis coordinates, even while airborne.
let corrosion;
function rustLayers() {
  if (corrosion) return corrosion;
  corrosion = [new Path2D(),new Path2D(),new Path2D()];
  let seed = 1441;
  const noise = () => ((seed = (Math.imul(1664525,seed)+1013904223)>>>0)/4294967296);
  for (const [cx,cy,spread] of [[-1.83,.22,.17],[-1.5,.07,.24],[-1.09,.16,.17],[-.52,-.19,.28],[.2,-.16,.3],[.69,.13,.16],[1.36,.10,.27],[1.88,.24,.17],[-.54,1.04,.14]]) {
    for(let i=0;i<23;i++){
      const x=cx+(noise()-.5)*spread*2,y=cy+(noise()-.5)*spread*.7;
      const r=.009+noise()**2*.065;
      corrosion.forEach((path,j)=>{
        const size=r*(1-j*.31);
        path.moveTo(x-size,y);
        path.lineTo(x-size*.61,y+size*.46);path.lineTo(x+size*.12,y+size*.67);
        path.lineTo(x+size,y+size*.11);path.lineTo(x+size*.76,y-size*.46);
        path.lineTo(x-size*.25,y-size*.54);path.closePath();
      });
    }
  }
  return corrosion;
}

export function drawClassicBody(c, xray, soot, levels, kits) {
  const bodyLevel=levels[5];
  const line=(p,color,w)=>{c.beginPath();p.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=color;c.lineWidth=w;c.lineJoin='round';c.stroke();};
  const poly=(p,color,stroke,w=.018)=>{c.beginPath();p.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=color;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=w;c.stroke();}};
  const dot=(x,y,r,color)=>{c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fillStyle=color;c.fill();};
  const rect=(x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(x,y,w,h);};
  const paint=c.createLinearGradient(0,-.4,0,1.1);
  const colors = bodyLevel < 3 ? ['#484638','#7b7968','#a29b83','#b6b09b','#827e6a'] :
    bodyLevel >= 8 ? ['#132334','#203042','#244661','#3b6977','#bd985e'] :
    bodyLevel === 7 ? ['#312733','#4a364c','#68465d','#a17474','#523c54'] :
    bodyLevel === 6 ? ['#353c40','#526269','#75888a','#b5c4bc','#69797a'] :
    bodyLevel >= 4 ? ['#173c3f','#265a5c','#36797a','#66a3a0','#326768'] :
    ['#38252b','#6e2730','#993e44','#c16b69','#783239'];
  [0,.25,.55,.7,1].forEach((stop,i)=>paint.addColorStop(stop,colors[i]));
  const chrome=c.createLinearGradient(0,-.32,0,-.12);
  chrome.addColorStop(0,'#424c50');chrome.addColorStop(.45,'#a4adb0');chrome.addColorStop(.55,'#f1efde');chrome.addColorStop(1,'#6b7b80');
  c.save();c.globalAlpha=xray?.28:1;
  bodyPath(c);c.fillStyle=paint;c.fill();c.strokeStyle='#302b2e';c.lineWidth=.024;c.stroke();
  c.save();bodyPath(c);c.clip();
  if(bodyLevel < 3){
    poly([[-1.04,.4],[-.19,.42],[-.19,-.27],[-.65,-.27],[-.71,-.01]],bodyLevel===1?'#8b907f':'#929897');
  }
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
    if(bodyLevel<=2){
      const cracks=bodyLevel===1 ? [[-.61,.72],[.29,.79]] : [[-.61,.72]];
      for(const [x,y] of cracks){
        for(const [dx,dy] of [[-.25,.24],[.1,.23],[.24,-.1],[-.1,-.27],[-.23,-.04]]){
          line([[x,y],[x+dx*.42+.02,y+dy*.42],[x+dx*.69,y+dy*.7+.016],[x+dx,y+dy]],'#deede2b5',.012);
        }
        poly([[x,y],[x+.07,y+.14],[x+.14,y+.085],[x+.1,y-.04]],'#273034');
      }
    }
    if(levels[7]>=3){
      rect(-.94,.49,.22,.13,'#376399');dot(-.72,.55,.064,'#4377a3');
      rect(-.87,.49,.035,.13,'#b0b9aa');
      if(kits[1]) rect(-.94,.64,.22,.075,'#538bbc');
    }
    c.restore();
    line([window[0],window[window.length-1]],'#dde0d4',.022);
  }
  line([[.42,.96],[.45,.49]],'#ced2c7',.021); // front quarter-light divider
  line([[-1.11,.44],[.99,.44]],'#222d30',.035);
  line([[-1.13,.41],[1.02,.41]],'#d2d4ca',.024);
  // Stamped panel creases and four-door shut lines.
  const glint=bodyLevel >= 4 ? '#a3c9ba' : bodyLevel < 3 ? '#b9aa91' : '#e29488';
  line([[-1.96,.3],[-1.19,.36]],glint,.018);
  line([[1.07,.37],[1.98,.31]],glint,.022);
  line([[-2.02,.17],[2.04,.17]],'#502c32',.022);
  line([[-2.02,.195],[2.04,.195]],bodyLevel >= 4 ? '#ddcd9e' : glint,bodyLevel >= 4 ? .032 : .014);
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
    c.beginPath();c.ellipse(x,ARCH_Y,ARCH_X+.016,ARCH_Y_RADIUS+.016,0,archAngle,Math.PI-archAngle);
    c.strokeStyle=glint;c.lineWidth=.025;c.stroke();
    c.beginPath();c.ellipse(x,ARCH_Y,ARCH_X+.038,ARCH_Y_RADIUS+.038,0,archAngle,Math.PI-archAngle);
    c.strokeStyle='#522d34';c.lineWidth=.012;c.stroke();
  }
  if(bodyLevel>=6){
    poly([[-1.99,.14],[-1.48,.27],[1.98,.27],[1.98,.23],[-1.46,.22],[-1.96,.085]],bodyLevel===8?'#e9b851':'#dbc9a9');
    for(const x of [-1.25,1.25]){
      c.beginPath();c.ellipse(x,ARCH_Y,ARCH_X+.054,ARCH_Y_RADIUS+.052,0,archAngle,Math.PI-archAngle);
      c.strokeStyle=bodyLevel>=7?'#283539':'#526264';c.lineWidth=.065;c.stroke();
      for(let i=1;i<=7;i++){const a=i*Math.PI/8;dot(x+(ARCH_X+.054)*Math.cos(a),ARCH_Y+(ARCH_Y_RADIUS+.052)*Math.sin(a),.012,'#c6c5b2');}
    }
  }
  const stain=c.createRadialGradient(-2,-.21,0,-2,-.21,.27);
  stain.addColorStop(0,`rgba(15,18,19,${.15+soot*.6})`);stain.addColorStop(1,'rgba(15,18,19,0)');
  rect(-2.09,-.34,.48,.39,stain);
  if(bodyLevel < 3){
    c.save();c.globalAlpha *= bodyLevel===1 ? 1 : .38;
    rustLayers().forEach((path,i)=>{c.fillStyle=['#c0ac88','#9c522e','#693d28'][i];c.fill(path);});
    c.restore();
  }
  c.restore();
  if(bodyLevel===5){
    poly([[-2.12,.34],[-1.83,.38],[-1.8,.42],[-2.12,.52]],'#25433e','#a7b3a5');
  }
  if(bodyLevel>=6 || (kits[2] && bodyLevel>=4)){
    const h=bodyLevel>=7?.83:.64;
    for(const x of [-2.01,-1.75])line([[x,.36],[x-.07,h]],'#344041',.045);
    poly([[-2.28,h],[-1.57,h+.014],[-1.52,h+.063],[-2.27,h+.09]],'#293d40','#b2bdb5',.016);
    if(bodyLevel>=7)poly([[-2.25,h-.09],[-1.61,h-.08],[-1.57,h-.04],[-2.24,h-.02]],'#273138','#a0aaa7');
    poly([[-2.31,h-.08],[-2.16,h-.04],[-2.17,h+.14],[-2.31,h+.12]],'#33494d','#182a2d',.014);
  }
  if(bodyLevel>=6 || (kits[2] && bodyLevel>=4)){
    poly([[-.66,-.24],[.65,-.24],[.67,-.35],[-.69,-.35]],'#263537','#939c91');
    poly([[1.93,-.17],[2.12,-.17],[2.27,-.3],[1.91,-.3]],'#293839','#8e9e91');
  }
  if(kits[2] && bodyLevel>=4){
    poly([[-.69,-.23],[.64,-.23],[.69,-.33],[-.71,-.33]],'#202a30','#657579',.013);
    for(let i=0;i<18;i++){
      const x=-.61+i*.067;
      line([[x,-.3],[x+.052,-.25]],'#5f70746e',.015);
    }
    poly([[1.95,.012],[2.18,-.008],[2.22,.045],[2.01,.066]],'#202a30','#8a9695',.013);
    const wingHeight=bodyLevel>=7?.83:.64;
    poly([[-2.3,wingHeight],[-2.17,wingHeight+.03],[-2.17,wingHeight+.12],[-2.3,wingHeight+.09]],'#1f2b30','#899593',.012);
  }
  if(levels[0]>=4 || kits[0]){
    poly([[1.12,.42],[1.21,.53],[1.6,.49],[1.7,.38]],'#4c5856','#262e30');
    for(let i=0;i<3;i++)line([[1.26+i*.08,.5],[1.29+i*.08,.43]],'#202b2f',.024);
  }
  if(bodyLevel===8){
    poly([[-2.06,-.16],[-1.92,-.19],[-1.96,-.33],[-2.25,-.31]],'#253137','#b99b5e');
    for(let i=0;i<3;i++) line([[-2.2+i*.07,-.27],[-2.24+i*.07,-.35]],'#29383c',.026);
    line([[-.68,-.34],[.67,-.34]],'#eab84a',.031);
  }
  // Lamps and bumpers live outside the body silhouette, away from the arches.
  poly([[-2.088,.2],[-1.94,.2],[-1.94,.02],[-2.08,.02]],'#632829','#2b3030');
  rect(-2.075,.12,.12,.065,'#e47f57');rect(-2.075,.045,.12,.06,'#ad3637');
  for(let j=0;j<4;j++)line([[-2.07+j*.028,.04],[-2.07+j*.028,.18]],'#f5a77b50',.009);
  poly([[1.96,.23],[2.09,.21],[2.09,.035],[1.96,.035]],'#f1e6bd','#474b49',.024);
  line([[2.04,.055],[2.04,.2]],'#fff6d5',.022);
  rect(2.02,-.07,.075,.07,'#db9c45');
  for(const [a,b] of [[-2.17,-1.88],[1.91,2.18]]){
    c.save();
    if(bodyLevel===1 && a<0){c.translate(a,-.23);c.rotate(.15);c.translate(-a,.23);}
    rect(a,-.28,b-a,.12,'#283032');rect(a,-.24,b-a,.08,chrome);
    rect(a+.045,-.29,.045,.15,'#323736');c.restore();
  }
  // Door mirror and windshield wiper.
  line([[.72,.43],[.81,.55]],'#c1c6bd',.025);
  poly([[.77,.55],[.92,.56],[.94,.46],[.79,.45]],'#b6bdb5','#313c3d',.02);
  line([[.96,.445],[.67,.57]],'#28363a',.013);
  c.restore();
}
