import { createSimulation, terrainHeight, FINISH, STEP } from './physics.js';
import { createExhaust } from './exhaust.js';
import { tirePoint } from './wheel-shape.js';
const $ = id => document.getElementById(id);
const canvas = $('game'), ctx = canvas.getContext('2d');
let sim, paused = false, finished = false, xray = false, drive = 'awd', accumulator = 0, last = performance.now(), camera = { x: 3, y: 1.4 };
let width = 1000, height = 500, scale = 64;
const keys = new Set(), touches = new Set();
let exhaust = createExhaust();
const presets = { comfort: [2, .4], trail: [3.2, .65], sport: [5.2, .85] };
function clearInput() { keys.clear(); touches.clear(); document.querySelectorAll('.held').forEach(b => b.classList.remove('held')); }
function reset() {
  exhaust = createExhaust(); exhaust.setIntensity(+$('soot').value);
  clearInput(); sim = createSimulation({ frequency: +$('spring').value, damping: +$('damping').value, drive });
  paused = finished = false; accumulator = 0; camera = { x: 3, y: 1.4 }; $('overlay').hidden = true; $('pause').textContent = 'Pause';
  $('notice').textContent = 'A small trail. A proper little adventure.';
}
function pause(value = !paused) {
  if (finished) return;
  paused = value; accumulator = 0; clearInput(); $('overlay').hidden = !paused; $('pause').textContent = paused ? 'Resume' : 'Pause';
  $('overlay-caption').textContent = 'Take a breath.'; $('overlay-title').textContent = 'Paused'; $('resume').textContent = 'Keep driving';
}
function tune() {
  const f = +$('spring').value, d = +$('damping').value;
  $('spring-value').textContent = f.toFixed(1) + ' Hz'; $('damping-value').textContent = d.toFixed(2);
  sim.tune(f, d);
  document.querySelectorAll('[data-preset]').forEach(b => b.classList.toggle('selected', presets[b.dataset.preset][0] === f && presets[b.dataset.preset][1] === d));
}
$('soot').addEventListener('input',()=>{exhaust.setIntensity(+$('soot').value);$('soot-value').textContent=(+$('soot').value).toFixed(1)+'x';});
$('spring').addEventListener('input', tune); $('damping').addEventListener('input', tune);
document.querySelectorAll('[data-preset]').forEach(b => b.addEventListener('click', () => { const [f, d] = presets[b.dataset.preset]; $('spring').value = f; $('damping').value = d; tune(); }));
document.querySelectorAll('[data-drive]').forEach(b => b.addEventListener('click', () => {
  drive = b.dataset.drive; sim.setDrive(drive);
  document.querySelectorAll('[data-drive]').forEach(option => { const selected = option.dataset.drive === drive; option.classList.toggle('selected', selected); option.setAttribute('aria-pressed', selected); });
}));
$('pause').addEventListener('click', () => pause()); $('reset').addEventListener('click', reset); $('resume').addEventListener('click', () => finished ? reset() : pause(false));
$('xray').addEventListener('click', () => { xray = !xray; $('xray').setAttribute('aria-pressed', xray); $('xray').textContent = xray ? 'Hide chassis' : 'Show chassis'; });
window.addEventListener('keydown', e => {
  if (e.target instanceof HTMLInputElement && !['KeyA','KeyD','Space','KeyR','KeyP'].includes(e.code)) return;
  if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space'].includes(e.code)) e.preventDefault();
  if (e.repeat) return;
  if (e.code === 'KeyR') reset(); else if (e.code === 'KeyP') pause(); else keys.add(e.code);
});
window.addEventListener('keyup', e => keys.delete(e.code));
window.addEventListener('blur', () => { clearInput(); pause(true); });
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(true); });
document.querySelectorAll('[data-control]').forEach(b => {
  b.addEventListener('pointerdown', e => { e.preventDefault(); b.setPointerCapture(e.pointerId); touches.add(b.dataset.control); b.classList.add('held'); });
  const release = () => { touches.delete(b.dataset.control); b.classList.remove('held'); };
  b.addEventListener('pointerup', release); b.addEventListener('pointercancel', release); b.addEventListener('lostpointercapture', release);
});
function resize() { const r = canvas.getBoundingClientRect(); width = r.width; height = r.height; const dpr = Math.min(devicePixelRatio || 1, 2); canvas.width = width * dpr; canvas.height = height * dpr; ctx.setTransform(dpr,0,0,dpr,0,0); scale = Math.max(36, Math.min(69, width / 16)); }
new ResizeObserver(resize).observe(canvas);
const X = x => width * .34 + (x - camera.x) * scale;
const Y = y => height * .57 - (y - camera.y) * scale;
function polygon(points, fill, stroke = null, lineWidth = 1) { ctx.beginPath(); points.forEach(([x,y], i) => i ? ctx.lineTo(x,y) : ctx.moveTo(x,y)); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); if(stroke) {ctx.strokeStyle=stroke;ctx.lineWidth=lineWidth;ctx.stroke();} }
function line(points, color, thickness) {ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.strokeStyle=color;ctx.lineWidth=thickness;ctx.lineJoin='round';ctx.stroke();}
function circle(x,y,r,fill,stroke,width=1) {ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}}
function scenery() {
  const sky = ctx.createLinearGradient(0,0,0,height); sky.addColorStop(0,'#c3dad3');sky.addColorStop(1,'#e4e8cb');ctx.fillStyle=sky;ctx.fillRect(0,0,width,height);
  circle(width*.79,height*.29,34,'#f5edcd');
  for(const [layer,color,base,amp] of [[.12,'#a8bfb1',.52,80],[.25,'#8eac9b',.65,65],[.42,'#709281',.78,42]]) {
    const p=[[0,height]];
    for(let px=-10;px<=width+10;px+=10) {const t=px+camera.x*scale*layer;p.push([px,height*base-amp*(.55*Math.sin(t*.005)+.32*Math.sin(t*.011+2)+.18*Math.sin(t*.021))]);}
    p.push([width,height]);polygon(p,color);
  }
  const left = camera.x - width*.34/scale - 3, right = left + width/scale + 6;
  for(let i=Math.floor(left/6);i<right/6;i++) {
    const x=i*6+2, y=terrainHeight(x), px=X(x), py=Y(y), size=17+Math.abs(Math.sin(i*12))*30;
    if(x<10 || (x>54&&x<91))continue;
    ctx.fillStyle='#476a50';ctx.fillRect(px-2,py-size*.55,4,size*.55);
    polygon([[px-size*.38,py-size*.35],[px,py-size*1.6],[px+size*.38,py-size*.35]],'#557a60');
    polygon([[px-size*.3,py-size*.8],[px,py-size*1.9],[px+size*.3,py-size*.8]],'#60866a');
  }
  const road=[];for(let x=Math.floor(left/.2)*.2;x<=right;x+=.2)road.push([X(x),Y(terrainHeight(x))]);
  polygon([[X(left),height+10],...road,[X(right),height+10]],'#6c7153');
  line(road,'#c6b584',10);line(road,'#8d9361',3);
  for(let i=Math.floor(left*2);i<right*2;i++) {const x=i*.5;circle(X(x),Y(terrainHeight(x))+18+Math.abs(Math.sin(i*43))*70,1.2,'#8d8b65');}
  for(const [x,label] of [[1,'Start'],[56,'Rumble'],[118,'Climb'],[FINISH+3,'Finish']]) {
    if(x<left||x>right)continue;
    const px=X(x),py=Y(terrainHeight(x));line([[px,py],[px,py-64]],'#58644d',3);ctx.fillStyle='#eae4bf';ctx.fillRect(px-23,py-78,58,23);ctx.fillStyle='#4c6148';ctx.font='11px Trebuchet MS';ctx.textAlign='center';ctx.fillText(label,px+6,py-62);
    if(x===FINISH+3){for(let a=0;a<5;a++)for(let b=0;b<2;b++){ctx.fillStyle=(a+b)%2?'#f5efd7':'#355347';ctx.fillRect(px+a*8,py-112+b*8,8,8);}line([[px,py-60],[px,py-114]],'#58644d',3);}
  }
}
function spring(a,b) {
  const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy),nx=-dy/len,ny=dx/len;
  const p=[[X(a.x),Y(a.y)]];
  for(let i=1;i<12;i++){const t=i/12,offset=(i%2?1:-1)*.085;p.push([X(a.x+dx*t+nx*offset),Y(a.y+dy*t+ny*offset)]);}
  p.push([X(b.x),Y(b.y)]);line(p,'#d5a840',3);
}
function car() {
  const body=sim.body, pos=body.getPosition();
  const local=(x,y)=>body.getWorldPoint({x,y});
  sim.wheels.forEach((w,i)=>{
    const p=w.getPosition(),a=local(i===0?-1.25:1.25,-.05);
    const b=local(i===0?-.7:.7,-.08);line([[X(b.x),Y(b.y)],[X(p.x),Y(p.y)]],'#344744',5);spring(a,p);
  });
  sim.wheels.forEach((w,i)=>{
    const hub=sim.rims[i].getPosition(), tire=w.getPosition(), r=.48*scale;
    let grounded=false;
    for(let edge=w.getContactList();edge;edge=edge.next)if(edge.other.isStatic()&&edge.contact.isTouching())grounded=true;
    const slope=grounded?(terrainHeight(tire.x+.12)-terrainHeight(tire.x-.12))/.24:0;
    const tilt=Math.atan(slope);
    const compression=grounded?Math.max(.025,Math.min(.125,sim.tires[i].getJointTranslation())):0;
    ctx.save();ctx.translate(X(hub.x),Y(hub.y));ctx.rotate(-tilt);
    const contour=[];for(let j=0;j<96;j++){const p=tirePoint(j*Math.PI*2/96,r,compression*scale);contour.push([p.x,p.y]);}
    polygon(contour,'#222d29','#647065',1.5);
    // Tread markers rotate around the same hub as the stamped steel rim.
    for(let j=0;j<22;j++){
      const a=-w.getAngle()+tilt+j*Math.PI*2/22,p=tirePoint(a,r,compression*scale);
      line([[p.x*.91,p.y*.91],[p.x*.98,p.y*.98]],'#48594d',1.8);
    }
    circle(0,0,r*.67,'#303d35','#425247',1);
    ctx.rotate(-w.getAngle()+tilt);
    circle(0,0,r*.51,'#b7b8a7','#e0dfc8',1.4);
    circle(0,0,r*.43,'#8e9487','#666f63',1);
    for(let j=0;j<8;j++){
      const a=j*Math.PI/4;ctx.save();ctx.rotate(a);ctx.beginPath();ctx.ellipse(r*.34,0,r*.075,r*.045,0,0,Math.PI*2);ctx.fillStyle='#2c3830';ctx.fill();ctx.restore();
    }
    circle(0,0,r*.23,'#c3c4b0','#e8e5d1',1);
    for(let j=0;j<4;j++){const a=j*Math.PI/2;circle(Math.cos(a)*r*.18,Math.sin(a)*r*.18,r*.035,'#4c574d','#d8d6c0',.6);}
    circle(0,0,r*.105,'#737f72','#d0d0b8',1);
    line([[r*.43,0],[r*.49,0]],'#18271f',2); // valve breaks rotational symmetry
    ctx.restore();
  });
  ctx.save();ctx.translate(X(pos.x),Y(pos.y));ctx.rotate(-body.getAngle());ctx.scale(scale,-scale);
  ctx.globalAlpha=xray?.32:1;
  const outline=[[-1.9,-.17],[-1.8,.35],[-1.12,.44],[-.9,1.02],[.65,1.02],[1.03,.4],[1.78,.31],[1.9,-.17],[1.35,-.3],[-1.4,-.3]];
  ctx.save();ctx.beginPath();outline.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.clip();
  ctx.beginPath();outline.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();
  for(const x of [-1.25,1.25]){ctx.moveTo(x+.57,-.55);ctx.arc(x,-.55,.57,0,Math.PI*2);}
  ctx.fillStyle='#d4a341';ctx.fill('evenodd');ctx.restore();
  ctx.beginPath();outline.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.strokeStyle='#53604b';ctx.lineWidth=.035;ctx.stroke();
  for(const x of [-1.25,1.25]){
    ctx.beginPath();ctx.arc(x,-.55,.57,0,Math.PI);ctx.strokeStyle='#37483e';ctx.lineWidth=.105;ctx.stroke();
    ctx.beginPath();ctx.arc(x,-.55,.63,.12,Math.PI-.12);ctx.strokeStyle='#f0c868';ctx.lineWidth=.035;ctx.stroke();
  }
  ctx.save();ctx.beginPath();outline.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.clip();
  ctx.beginPath();outline.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();
  for(const x of [-1.25,1.25]){ctx.moveTo(x+.57,-.55);ctx.arc(x,-.55,.57,0,Math.PI*2);}ctx.clip('evenodd');
  polygon([[-.95,.47],[-.76,.89],[-.14,.89],[-.14,.47]],'#517b79','#f0ce77',.035);
  polygon([[.02,.47],[.02,.89],[.55,.89],[.83,.47]],'#517b79','#f0ce77',.035);
  line([[-1.7,.07],[1.72,.07]],'#f2c566',.055);line([[-.08,.39],[-.08,-.19]],'#ac7d2d',.025);
  polygon([[1.67,.17],[1.88,.15],[1.88,-.01],[1.67,-.01]],'#fff2bd');
  polygon([[-1.84,.12],[-1.7,.12],[-1.7,-.03],[-1.84,-.03]],'#b86e4b');
  line([[-1.93,-.21],[-1.5,-.21]],'#354743',.12);line([[1.52,-.21],[1.97,-.21]],'#354743',.12);
  line([[-.9,1.06],[.57,1.06]],'#465b4a',.065);
  // Body details move with the chassis while the wheels move independently.
  line([[-1.76,.31],[-1.12,.38],[-.9,1.02],[.65,1.02],[1.02,.4],[1.76,.28]],'#f8d77c',.035);
  line([[-1.72,-.16],[-.45,-.16]],'#9b702b',.035);line([[.08,-.16],[1.65,-.16]],'#9b702b',.035);
  line([[-.1,.4],[-.1,-.17]],'#8c692e',.025);line([[.79,.38],[.85,-.13]],'#a77a31',.024);
  line([[-.05,.3],[.18,.3]],'#f4dfaa',.045);line([[-1.02,.3],[-.83,.3]],'#f4dfaa',.045);
  line([[.21,.78],[.47,.78],[.67,.52]],'#a6c9bc',.035);line([[-.69,.79],[-.4,.79]],'#a6c9bc',.035);
  polygon([[.78,.48],[.98,.48],[1.01,.34],[.82,.34]],'#3c5651','#e0bc66',.025);
  line([[-1.55,-.25],[-.95,-.25]],'#303f39',.1);line([[.94,-.25],[1.55,-.25]],'#303f39',.1);
  line([[-.72,1.08],[-.72,1.2],[.42,1.2],[.42,1.08]],'#405449',.035);
  line([[-.7,1.18],[.4,1.18]],'#84917b',.025);
  line([[1.71,.08],[1.85,.08]],'#fff8d7',.045);line([[-1.8,.03],[-1.72,.03]],'#e98563',.04);
  circle(-1.54,.27,.055,'#d2b97f','#816d44',.015);
  ctx.restore();line([[-.72,1.08],[-.72,1.2],[.42,1.2],[.42,1.08]],'#405449',.035);ctx.globalAlpha=1;ctx.restore();
  const tip=local(-1.98,-.24),pipe=local(-1.7,-.22);
  line([[X(pipe.x),Y(pipe.y)],[X(tip.x),Y(tip.y)]],'#62665b',5);
  circle(X(tip.x),Y(tip.y),2.4,'#202723');
  const stain=local(-1.83,-.18);circle(X(stain.x),Y(stain.y),scale*.09,`rgba(26,29,23,${.08+exhaust.soot*.45})`);
  if(xray)sim.wheels.forEach((w,i)=>spring(local(i===0?-1.25:1.25,.35),w.getPosition()));

}
function frame(now) {
  const dt=Math.min((now-last)/1000,.05);last=now;
  if(!paused&&!finished){
    accumulator+=dt;
    const forward=keys.has('ArrowRight')||keys.has('ArrowUp')||keys.has('KeyD')||touches.has('forward');
    const reverse=keys.has('ArrowLeft')||keys.has('ArrowDown')||keys.has('KeyA')||touches.has('reverse');
    const brake=keys.has('Space')||touches.has('brake');
    while(accumulator>=STEP){sim.step(Number(forward)-Number(reverse),brake);exhaust.step(sim,STEP);accumulator-=STEP;}
    if(sim.body.getPosition().x>=FINISH+3){finished=true;clearInput();$('overlay').hidden=false;$('overlay-title').textContent='Trail complete!';$('overlay-caption').textContent=`260 metres, every bump earned. ${formatTime(sim.elapsed)}`;$('resume').textContent='Drive again';}
  }
  const pos=sim.body.getPosition();camera.x+=(pos.x-camera.x)*Math.min(1,dt*5);camera.y+=(pos.y-camera.y)*Math.min(1,dt*3);
  scenery();drawExhaust();car();
  const distance=Math.max(0,Math.min(FINISH,pos.x-3));$('speed').textContent=Math.round(Math.abs(sim.body.getLinearVelocity().x)*3.6);$('distance').textContent=`${Math.floor(distance)} / 260 m`;$('progress').value=finished?FINISH:distance;$('time').textContent=formatTime(sim.elapsed);
  $('rear').value=sim.joints[0].getJointTranslation();$('front').value=sim.joints[1].getJointTranslation();
  if(!finished){const a=Math.abs(Math.atan2(Math.sin(sim.body.getAngle()),Math.cos(sim.body.getAngle())));$('notice').textContent=a>1.8?'Tipped over? Press R for a fresh start.':pos.x>53&&pos.x<91?'The rumble strip. Watch those springs.':pos.x>116&&pos.x<153?'Easy on the climb. Let the suspension work.':sim.elapsed<5?'A small trail. A proper little adventure.':'';}
  requestAnimationFrame(frame);
}
function formatTime(t){return `${Math.floor(t/60)}:${(t%60).toFixed(1).padStart(4,'0')}`;}
function drawExhaust(){
  for(const p of exhaust.particles){
    const life=p.age/p.life,r=(p.radius+p.age*.22)*scale;
    const px=X(p.x)+Math.sin(p.age*4+p.phase)*p.age*3,py=Y(p.y);
    if(p.y<terrainHeight(p.x)-.1)continue;
    const shade=Math.round(165-p.dark*125),alpha=(.07+p.dark*.34)*(1-life)**2;
    const cloud=ctx.createRadialGradient(px,py,0,px,py,r);cloud.addColorStop(0,`rgba(${shade},${shade+3},${shade},${alpha})`);cloud.addColorStop(1,`rgba(${shade},${shade+3},${shade},0)`);
    circle(px,py,r,cloud);
  }
}
reset();resize();requestAnimationFrame(frame);
