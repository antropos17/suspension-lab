import { createSimulationClient } from './simulation-client.js';
import { FINISH, STEP, TIRE_RADIUS } from './vehicle-constants.js';
import { createExhaust } from './exhaust.js';
import { groundHeight } from './terrain.js';
import { drawClassicBody, drawWheelWells } from './car-art.js';
import { createBakuBackdrop } from './baku-background.js';
import { createSmokeRenderer } from './smoke-renderer.js';
import { createDriveSlot } from './drive-slot.js';
import { createSlotPanel } from './slot-panel.js';
import { readGarage, advanceGarage, levelOf, CHECKPOINTS, PART_NAMES } from './garage.js';
import { createGaragePanel } from './garage-panel.js';
const $ = id => document.getElementById(id);
const canvas = $('game'), ctx = canvas.getContext('2d');
const smokeCanvas=document.createElement('canvas'),smokeCtx=smokeCanvas.getContext('2d');
const SMOKE_RESOLUTION=.5;
const drawBaku=createBakuBackdrop(()=>{needsRedraw=true;});
const drawSmoke=createSmokeRenderer();
// Opt-in, bounded diagnostics. No trace is collected during normal play.
const profiling=new URLSearchParams(location.search).has('profile');
const samples=[];
let profileTicks=0,drawCount=0;
const profileOutput=profiling?document.body.appendChild(document.createElement('output')):null;
if(profileOutput){profileOutput.id='frame-profile';profileOutput.hidden=true;}
let sim, paused = false, finished = false, xray = false, drive = 'awd', accumulator = 0, last = performance.now(), camera = { x: 3, y: 1.4 };
let width = 1000, height = 500, scale = 64, hudAt=0, needsRedraw=true;
const keys = new Set(), touches = new Set();
const slot = createDriveSlot();
const drawSlot = createSlotPanel(slot, $('slot-bank'), $('spin'), $('slot-status'), $('slot-time'));
const saveKey = 'suspension-lab.garage.v1';
function loadGarage() {
  try { return readGarage(localStorage.getItem(saveKey)); } catch { return readGarage(null); }
}
const garage = loadGarage();
let levels = garage.points.map(levelOf);
let fitHighlights = [], fittedAt = 0;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
const drawGarage = createGaragePanel($('rack-left'), $('rack-right'), $('build-level'));
drawGarage(garage);
let routePeak = garage.best, queuedPeak = garage.best, telemetryTime = 0, telemetrySpeed = 0;
const peakKey = saveKey+'.distance';
try {
  const latest = Number(localStorage.getItem(peakKey));
  if(Number.isInteger(latest) && latest<=FINISH) routePeak=Math.max(routePeak,latest);
} catch {}
$('best').textContent='Рекорд '+routePeak+' м';
function flushDistance() {
  // An unloading document cannot wait for a Web Lock. Store its last metre
  // separately so this final write can never overwrite a parts transaction.
  try {
    if(routePeak > (Number(localStorage.getItem(peakKey)) || 0)) localStorage.setItem(peakKey,String(routePeak));
  } catch {}
}
function recordProgress(reward, meters) {
  queuedPeak = Math.max(queuedPeak,meters);
  const apply = () => {
    const saved = loadGarage();
    garage.points = garage.points.map((n,i)=>Math.max(n,saved.points[i]));
    garage.best = Math.max(garage.best,saved.best);
    const {changes,crossed} = advanceGarage(garage,meters,reward);
    try { localStorage.setItem(saveKey,JSON.stringify(garage)); } catch {}
    levels = garage.points.map(levelOf);
    sim.setBuild(levels);
    if(changes.some(c=>c.to>c.from) && !reduceMotion.matches) {
      fittedAt = sim.elapsed;
      fitHighlights = changes.flatMap((c,i)=>c.to>c.from ? [i] : []);
      needsRedraw = true;
    }
    drawGarage(garage,changes,reward ? $('slot-bank') : null);
    if (reward) {
      reward.receipt = changes.flatMap((c,i)=>c.gain ? [PART_NAMES[i]+' '+(c.to>c.from ? c.from+'→'+c.to : '+'+c.gain)] : []).join(', ');
      needsRedraw = true;
    }
    if(crossed.length) $('route-award').textContent = crossed.at(-1).title+' · детали получены';
  };
  if(navigator.locks) navigator.locks.request(saveKey,apply);
  else apply();
}
window.addEventListener('storage', e => {
  if (e.key !== saveKey || !e.newValue) return;
  const saved = readGarage(e.newValue);
  garage.points = garage.points.map((n,i)=>Math.max(n,saved.points[i]));
  garage.best = Math.max(garage.best,saved.best); routePeak = Math.max(routePeak,garage.best);
  levels = garage.points.map(levelOf);
  sim?.setBuild(levels); drawGarage(garage); needsRedraw = true;
});
window.addEventListener('pagehide', flushDistance);
function spin() {
  if (sim.ready && !paused && !finished && slot.spin(sim.elapsed)) drawSlot(sim.elapsed, false);
}
$('spin').addEventListener('click', spin);
let exhaust = createExhaust(), smokeTime=0;
const presets = { comfort: [1.3, .4], trail: [1.7, .5], sport: [2.6, .65] };
function clearInput() { keys.clear(); touches.clear(); document.querySelectorAll('.held').forEach(b => b.classList.remove('held')); }
function reset() {
  if(routePeak > queuedPeak) recordProgress(null,routePeak);
  $('route-award').textContent = '';
  telemetryTime = telemetrySpeed = 0;
  fitHighlights = [];
  slot.reset(); drawSlot(0, true);
  needsRedraw=true;
  samples.length=0;profileTicks=0;drawCount=0;
  exhaust = createExhaust(); exhaust.setIntensity(+$('soot').value);
  clearInput(); sim??=createSimulationClient();smokeTime=0;
  sim.reset({ frequency: +$('spring').value, damping: +$('damping').value, drive, pressure:+$('pressure').value, levels });
  paused = finished = false; accumulator = 0; camera = { x: 3, y: 1.4 }; $('overlay').hidden = true; $('pause').textContent = 'Пауза';
  $('notice').textContent = 'До брусчатки 55 м';
}
function pause(value = !paused) {
  if (finished) return;
  if (value) flushDistance();
  paused = value; needsRedraw=true;accumulator = 0; sim.suspend();clearInput(); $('overlay').hidden = !paused; $('pause').textContent = paused ? 'Продолжить' : 'Пауза';
  drawSlot(sim.elapsed, paused || !sim.ready);
  $('overlay-caption').textContent = 'Заезд приостановлен'; $('overlay-title').textContent = 'Пауза'; $('resume').textContent = 'Продолжить заезд';
}
function tune() {
  const f = +$('spring').value, d = +$('damping').value;
  $('spring-value').textContent = f.toFixed(1) + ' Hz'; $('damping-value').textContent = d.toFixed(2);
  sim.tune(f, d);
  document.querySelectorAll('[data-preset]').forEach(b => b.classList.toggle('selected', presets[b.dataset.preset][0] === f && presets[b.dataset.preset][1] === d));
}
$('soot').addEventListener('input',()=>{exhaust.setIntensity(+$('soot').value);$('soot-value').textContent=(+$('soot').value).toFixed(1)+'x';});
$('pressure').addEventListener('input',()=>{sim.setPressure(+$('pressure').value);$('pressure-value').textContent=(+$('pressure').value).toFixed(1)+' bar';});
$('spring').addEventListener('input', tune); $('damping').addEventListener('input', tune);
document.querySelectorAll('[data-preset]').forEach(b => b.addEventListener('click', () => { const [f, d] = presets[b.dataset.preset]; $('spring').value = f; $('damping').value = d; tune(); }));
document.querySelectorAll('[data-drive]').forEach(b => b.addEventListener('click', () => {
  drive = b.dataset.drive; sim.setDrive(drive);
  document.querySelectorAll('[data-drive]').forEach(option => { const selected = option.dataset.drive === drive; option.classList.toggle('selected', selected); option.setAttribute('aria-pressed', selected); });
}));
$('pause').addEventListener('click', () => pause()); $('reset').addEventListener('click', reset); $('resume').addEventListener('click', () => finished ? reset() : pause(false));
$('xray').addEventListener('click', () => { xray = !xray; needsRedraw=true;$('xray').setAttribute('aria-pressed', xray); $('xray').textContent = xray ? 'Скрыть шасси' : 'Показать шасси'; });
window.addEventListener('keydown', e => {
  if (e.target instanceof HTMLInputElement && !['KeyA','KeyD','Space','KeyR','KeyP','KeyS'].includes(e.code)) return;
  if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space'].includes(e.code)) e.preventDefault();
  if (e.repeat) return;
  if (e.code === 'KeyR') reset(); else if (e.code === 'KeyP') pause(); else if(e.code === 'KeyS') spin(); else keys.add(e.code);
});
window.addEventListener('keyup', e => keys.delete(e.code));
window.addEventListener('blur', () => { clearInput(); pause(true); });
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(true); });
document.querySelectorAll('[data-control]').forEach(b => {
  b.addEventListener('pointerdown', e => { e.preventDefault(); b.setPointerCapture(e.pointerId); touches.add(b.dataset.control); b.classList.add('held'); });
  const release = () => { touches.delete(b.dataset.control); b.classList.remove('held'); };
  b.addEventListener('pointerup', release); b.addEventListener('pointercancel', release); b.addEventListener('lostpointercapture', release);
});
function resize() { const r = canvas.getBoundingClientRect(); width = r.width; height = r.height; const dpr = Math.min(devicePixelRatio || 1, 2); canvas.width = width * dpr; canvas.height = height * dpr; ctx.setTransform(dpr,0,0,dpr,0,0); smokeCanvas.width=Math.ceil(width*SMOKE_RESOLUTION);smokeCanvas.height=Math.ceil(height*SMOKE_RESOLUTION);smokeCtx.setTransform(SMOKE_RESOLUTION,0,0,SMOKE_RESOLUTION,0,0); scale = Math.max(36, Math.min(69, width / 16));needsRedraw=true; }
new ResizeObserver(resize).observe(canvas);
const X = x => width * .34 + (x - camera.x) * scale;
const Y = y => height * .57 - (y - camera.y) * scale;
function visibleGround(left,right) {
  // The grid is ordered and uniform; visit the visible slice, not all 951 points.
  const first=Math.max(0,Math.ceil((left-.4+40)/.4)),end=Math.min(sim.points.length,Math.floor((right+.4+40)/.4)+1);
  return [{x:left-.4,y:groundHeight(left-.4)},...sim.points.slice(first,end),{x:right+.4,y:groundHeight(right+.4)}];
}
function polygon(points, fill, stroke = null, lineWidth = 1) { ctx.beginPath(); points.forEach(([x,y], i) => i ? ctx.lineTo(x,y) : ctx.moveTo(x,y)); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); if(stroke) {ctx.strokeStyle=stroke;ctx.lineWidth=lineWidth;ctx.stroke();} }
function line(points, color, thickness) {ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.strokeStyle=color;ctx.lineWidth=thickness;ctx.lineJoin='round';ctx.stroke();}
function circle(x,y,r,fill,stroke,width=1) {ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}}
function scenery() {
  drawBaku(ctx,{width,height,camera,scale});
  const left = camera.x - width*.34/scale - 3, right = left + width/scale + 6;
  const road=visibleGround(left,right).map(p=>[X(p.x),Y(p.y)]);
  const soil=[[road[0][0],height+10],...road,[road.at(-1)[0],height+10]];
  polygon(soil,'#746c57');
  // All road paint lies below the collision surface, including its stroke.
  ctx.save();ctx.beginPath();soil.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.clip();
  line(road,'#cdb58c',12);line(road,'#a89c78',2);ctx.restore();
  for(let i=Math.floor(left*2);i<right*2;i++) {const x=i*.5;circle(X(x),Y(groundHeight(x))+18+Math.abs(Math.sin(i*43))*70,1.2,'#a18e6e');}
  for(const [x,label] of [[1,'Start'],[56,'Rumble'],[118,'Climb'],[FINISH+3,'Finish']]) {
    if(x<left||x>right)continue;
    const px=X(x),py=Y(groundHeight(x));line([[px,py],[px,py-64]],'#58644d',3);ctx.fillStyle='#eae4bf';ctx.fillRect(px-23,py-78,58,23);ctx.fillStyle='#4c6148';ctx.font='11px Trebuchet MS';ctx.textAlign='center';ctx.fillText(label,px+6,py-62);
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
  ctx.save();ctx.translate(X(pos.x),Y(pos.y));ctx.rotate(-body.getAngle());ctx.scale(scale,-scale);
  if(!xray)drawWheelWells(ctx);ctx.restore();
  sim.wheels.forEach((w,i)=>{
    const p=sim.rims[i].getPosition();
    const b=local(i===0?-.7:.7,-.08);line([[X(b.x),Y(b.y)],[X(p.x),Y(p.y)]],'#344744',5);
  });
  sim.wheels.forEach((w,i)=>{
    const hub=w.getPosition(),r=TIRE_RADIUS*scale,tire=sim.tires[i],outline=tire.getOutline();
    // The rendered surface comes directly from the moving collision bodies.
    polygon(tire.nodes.map(n=>{const p=n.getPosition();return [X(p.x),Y(p.y)];}),'#202426');
    for(const node of tire.nodes){const p=node.getPosition();circle(X(p.x),Y(p.y),tire.skin*scale,'#202426');}
    polygon(outline.map(p=>[X(hub.x+(p.x-hub.x)*.78),Y(hub.y+(p.y-hub.y)*.78)]),'#303936');
    outline.forEach((p,j)=>{
      const n=tire.nodes[j].getPosition(),dx=p.x-hub.x,dy=p.y-hub.y;
      line([[X(hub.x+dx*.88),Y(hub.y+dy*.88)],[X(n.x+(p.x-n.x)*.85),Y(n.y+(p.y-n.y)*.85)]],'#4b514b',1.4);
      if(xray)line([[X(hub.x+dx*.51),Y(hub.y+dy*.51)],[X(n.x),Y(n.y)]],'#b69a5c',.8);
    });
    ctx.save();ctx.translate(X(hub.x),Y(hub.y));
    ctx.rotate(-w.getAngle());
    const wheelLevel = levels[2], holes = wheelLevel < 3 ? 5 : 8;
    circle(0,0,r*.51,wheelLevel === 1?'#61584c':'#b7b8a7',wheelLevel < 3?'#948777':'#e0dfc8',1.4);
    circle(0,0,r*.43,wheelLevel < 3?'#635f55':'#b3b9b0','#666f63',1);
    for(let j=0;j<holes;j++){
      const a=j*Math.PI*2/holes;ctx.save();ctx.rotate(a);ctx.beginPath();ctx.ellipse(r*.34,0,r*(wheelLevel>=4?.12:.075),r*.045,0,0,Math.PI*2);ctx.fillStyle='#2c3830';ctx.fill();ctx.restore();
    }
    if(wheelLevel===5){
      for(let j=0;j<5;j++){const a=j*Math.PI*2/5;line([[0,0],[Math.cos(a)*r*.42,Math.sin(a)*r*.42]],'#d9daca',r*.085);}
    }
    circle(0,0,r*.23,wheelLevel===1?'#766f60':'#c3c4b0',wheelLevel===1?'#99917d':'#e8e5d1',1);
    for(let j=0;j<4;j++){const a=j*Math.PI/2;circle(Math.cos(a)*r*.18,Math.sin(a)*r*.18,r*.035,'#4c574d','#d8d6c0',.6);}
    circle(0,0,r*.105,'#737f72','#d0d0b8',1);
    line([[r*.43,0],[r*.49,0]],'#18271f',2); // valve breaks rotational symmetry
    ctx.restore();
  });
  ctx.save();ctx.translate(X(pos.x),Y(pos.y));ctx.rotate(-body.getAngle());ctx.scale(scale,-scale);
  drawClassicBody(ctx,xray,exhaust.soot,levels[5]);ctx.restore();
  const tip=sim.exhaustMount.point,pipe=local(-1.62,-.22),can=local(-1.87,-.24+sim.exhaustMount.offset*.7);
  line([[X(pipe.x),Y(pipe.y)],[X(can.x),Y(can.y)],[X(tip.x),Y(tip.y)]],'#9a9e97',4);
  circle(X(can.x),Y(can.y),4,'#626d6b');
  const hanger=local(-1.87,-.12);line([[X(hanger.x),Y(hanger.y)],[X(can.x),Y(can.y)]],'#343a37',2);
  circle(X(tip.x),Y(tip.y),1.9,'#151b1d');
  if(xray)sim.rims.forEach((w,i)=>spring(local(i===0?-1.25:1.25,-.05),w.getPosition()));
  if(fitHighlights.length){
    const age = (sim.elapsed-fittedAt)/1.2;
    if(age>=1) fitHighlights=[];
    else {
      ctx.save();
      ctx.globalAlpha = 1-Math.max(0,age);
      ctx.strokeStyle='#ffe5a1';ctx.lineWidth=2;
      for(const part of fitHighlights){
        const hubs = sim.rims.map(r=>r.getPosition());
        const locations = part===2 || part===4 ? hubs : part===3 ? [local(-1.25,-.07),local(1.25,-.07)] :
          [part===0 ? local(1.37,.23) : part===1 ? local(.45,-.12) : local(-.54,.23)];
        for(const p of locations){
          const radius = scale*((part===2?.44:.19)+.27*age);
          ctx.beginPath();ctx.arc(X(p.x),Y(p.y),radius,0,Math.PI*2);ctx.stroke();
        }
      }
      ctx.restore();
    }
  }
}
function frame(now) {
  const start=profiling?performance.now():0;
  const frameGap=now-last;
  const dt=Math.min((now-last)/1000,.05);last=now;
  if(!sim.ready){
    drawSlot(sim.elapsed, true);
    scenery();
    if(sim.error){$('notice').textContent='Не удалось запустить физику. Обнови страницу.';}
    requestAnimationFrame(frame);return;
  }
  if((paused||finished)&&!needsRedraw){requestAnimationFrame(frame);return;}
  if(!paused&&!finished){
    const forward=keys.has('ArrowRight')||keys.has('ArrowUp')||keys.has('KeyD')||touches.has('forward');
    const reverse=keys.has('ArrowLeft')||keys.has('ArrowDown')||keys.has('KeyA')||touches.has('reverse');
    const brake=keys.has('Space')||touches.has('brake');
    const reward = slot.update(sim.elapsed, forward || reverse || brake);
    if (reward) {
      drawSlot(sim.elapsed,false);
      recordProgress(reward,routePeak);
    }
    sim.advance(dt, slot.phase === 'driving' ? 1 : Number(forward)-Number(reverse), brake);
    accumulator=Math.min(.05,accumulator+Math.max(0,sim.elapsed-smokeTime));smokeTime=sim.elapsed;
    while(accumulator>=STEP-1e-10){exhaust.step(sim,STEP);accumulator-=STEP;}
    if(sim.body.getPosition().x>=FINISH+3){
      finished=true;
      const finalReward=slot.update(slot.ends,true);
      drawSlot(sim.elapsed,true);
      recordProgress(finalReward,FINISH);
      clearInput();$('overlay').hidden=false;$('overlay-title').textContent='Финиш!';
      $('overlay-caption').textContent=`260 м пройдено за ${formatTime(sim.elapsed)}`;$('resume').textContent='Новый заезд';
    }
  }
  drawSlot(sim.elapsed, paused || finished);
  const physicsEnd=profiling?performance.now():0;
  const pos=sim.body.getPosition();
  // Horizontal follow uses the same interpolated pose as every car component.
  // A lagging camera fighting discontinuous worker poses caused lateral shake.
  camera.x=pos.x;camera.y+=(pos.y-camera.y)*(1-Math.exp(-dt*3));
  scenery();const sceneryEnd=profiling?performance.now():0;drawExhaust();const smokeEnd=profiling?performance.now():0;car();
  needsRedraw=false;
  if(profiling)profileOutput.dataset.draws=String(++drawCount);
  if(now>=hudAt||paused||finished){hudAt=now+100;
  const distance=Math.max(0,Math.min(FINISH,pos.x-3));$('speed').textContent=Math.round(Math.abs(sim.body.getLinearVelocity().x)*3.6);$('distance').textContent=`${Math.floor(distance)} / 260 м`;$('progress').value=finished?FINISH:distance;$('time').textContent=formatTime(sim.elapsed);
  routePeak = Math.max(routePeak, Math.floor(distance));
  if (routePeak >= queuedPeak+10 || CHECKPOINTS.some(c=>queuedPeak<c.meters && routePeak>=c.meters)) recordProgress(null,routePeak);
  $('best').textContent = 'Рекорд '+routePeak+' м';
  const signedSpeed = sim.body.getLinearVelocity().x, span = sim.elapsed - telemetryTime;
  if (span > .025 || telemetryTime === 0) {
    const accel = span > .025 ? (signedSpeed-telemetrySpeed)/span : 0;
    $('acceleration').textContent = 'Разгон '+(Math.round(accel*10)/10).toFixed(1)+' м/с²';
    telemetrySpeed = signedSpeed; telemetryTime = sim.elapsed;
  }
  $('pressure-live').textContent=`Rear ${sim.tires[0].pressureBar.toFixed(2)} / Front ${sim.tires[1].pressureBar.toFixed(2)} bar`;
  $('rear').value=sim.joints[0].getJointTranslation();$('front').value=sim.joints[1].getJointTranslation();
  if(!finished){const a=Math.abs(Math.atan2(Math.sin(sim.body.getAngle()),Math.cos(sim.body.getAngle())));$('notice').textContent=a>1.8?'Машина перевернулась. Нажми R для нового заезда.':pos.x>53&&pos.x<91?'Брусчатка':pos.x>116&&pos.x<153?'Подъём':sim.elapsed<5?'До брусчатки 55 м':'';}
  }
  if(profiling&&!paused){
    samples.push({gap:frameGap,physics:physicsEnd-start,scenery:sceneryEnd-physicsEnd,smoke:smokeEnd-sceneryEnd,total:performance.now()-start});
    if(samples.length>300)samples.shift();
    if(++profileTicks%30===0){const report={frames:samples.length,particles:exhaust.particles.length,workerMs:sim.workerMs,bufferMs:sim.bufferMs,renderHolds:sim.renderHolds,elapsed:sim.elapsed,x:pos.x,accelerator:sim.accelerator};for(const key of ['gap','physics','scenery','smoke','total']){const values=samples.map(s=>s[key]).sort((a,b)=>a-b);report[key]={mean:values.reduce((a,b)=>a+b,0)/values.length,p95:values[Math.floor((values.length-1)*.95)]};}profileOutput.textContent=JSON.stringify(report);}
  }
  requestAnimationFrame(frame);
}
function formatTime(t){return `${Math.floor(t/60)}:${(t%60).toFixed(1).padStart(4,'0')}`;}
function drawExhaust(){
  // Billow overdraw is bandwidth-heavy at display DPR. Accumulate soft smoke
  // at half CSS resolution, then composite once with a full-resolution road clip.
  smokeCtx.clearRect(0,0,smokeCanvas.width/SMOKE_RESOLUTION,smokeCanvas.height/SMOKE_RESOLUTION);
  for(const p of exhaust.particles){
    const life=p.age/p.life,r=(p.radius+.32*Math.sqrt(p.age)+p.age*.055)*scale;
    const fade=Math.min(1,p.age/.08)*(1-life)**1.25;
    const alpha=(.055+p.dark*.22)*fade/(1+p.age*.22);
    if(alpha<.002)continue;
    const x=X(p.x),y=Y(p.y);
    if(x+r*p.stretch<0||x-r*p.stretch>width||y+r<0||y-r>height)continue;
    drawSmoke(smokeCtx,p,x,y,r,alpha);
  }
  // Clip to air so billows roll along the surface without painting into the soil.
  const left=camera.x-width*.34/scale-5,right=left+width/scale+10;
  const road=visibleGround(left,right);
  ctx.save();ctx.beginPath();ctx.moveTo(X(road[0].x),-height);
  for(const p of road)ctx.lineTo(X(p.x),Y(p.y));
  ctx.lineTo(X(road.at(-1).x),-height);ctx.closePath();ctx.clip();
  ctx.drawImage(smokeCanvas,0,0,width,height);
  ctx.restore();
}
reset();resize();requestAnimationFrame(frame);
