import { createSimulationClient } from './simulation-client.js';
import { FINISH, STEP, metricHP } from './vehicle-constants.js';
import { createExhaust } from './exhaust.js';
import { createRoadScene } from './road-scene.js';
import { createWheelSpray } from './wheel-spray.js';
import { groundHeight, BRIDGES } from './terrain.js';
import { drawClassicBody, drawWheelWells } from './car-art.js';
import { createBakuBackdrop } from './baku-background.js';
import { createSmokeRenderer } from './smoke-renderer.js';
import { createDriveSlot, LINE_NAMES, testLineBoard } from './drive-slot.js';
import { createSlotPanel } from './slot-panel.js';
import { readGarage, advanceGarage, levelOf, THRESHOLDS, SYMBOLS, PART_NAMES, SPECIALS, ROAD_STOPS, claimRoadStops, purchase, buildSpec } from './garage.js';
import { createGaragePanel } from './garage-panel.js';
import { drawRim } from './part-art.js';
import { createShop } from './shop.js';
import { createGarageProfile } from './garage-profile.js';
const $ = id => document.getElementById(id);
const canvas = $('game'), ctx = canvas.getContext('2d');
const speedNeedle=$('speed-needle');
const smokeCanvas=document.createElement('canvas'),smokeCtx=smokeCanvas.getContext('2d');
const SMOKE_RESOLUTION=.5;
const drawBaku=createBakuBackdrop(()=>{needsRedraw=true;});
const drawSmoke=createSmokeRenderer();
const drawRoad=createRoadScene(ctx), wheelSpray=createWheelSpray();
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
const drawSlot = createSlotPanel(slot, $('slot-bank'), $('spin'), $('slot-status'), $('slot-time'),()=>levels);
const testMode=new URLSearchParams(location.search).get('garage')==='test';
const profile=createGarageProfile(testMode);
let storageAvailable=true;
let garage=profile.load(), levels=garage.points.map(levelOf), spec=buildSpec(levels,garage.kits);
let fitHighlights = [], fittedAt = 0;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
const drawGarage = createGaragePanel($('rack-left'), $('rack-right'), $('build-level'));
const drawShop=createShop($('shop-items'),$('wallet'),buyItem);
drawGarage(garage);drawShop(garage);
let routePeak = garage.best, queuedPeak = garage.best, telemetryTime = 0, telemetrySpeed = 0;
routePeak=Math.max(routePeak,profile.peak());
$('best').textContent='Рекорд '+routePeak+' м';
let collecting=false,roadReceipt='',receiptUntil=0;
function collectRoadPay(meters){
  const next=ROAD_STOPS[garage.roadStops];
  if(collecting || !next || meters<next[0])return;
  collecting=true;
  Promise.resolve(transact(()=>{
    const pay=claimRoadStops(garage,meters);
    if(!pay.coins)return;
    roadReceipt='Пост '+garage.roadStops+' · +'+pay.coins+' мон.'+(pay.gems?' · +'+pay.gems+' алм.':'');
    receiptUntil=sim.elapsed+3;
    drawShop(garage);
    if(!reduceMotion.matches){
      $('road-pay').animate([{transform:'translateY(5px)',opacity:.35},{transform:'translateY(0)',opacity:1}],{duration:200,easing:'ease-out'});
      $('wallet').animate([{transform:'translateY(0)'},{transform:'translateY(-3px)',offset:.4},{transform:'translateY(0)'}],{duration:240});
    }
  })).finally(()=>{collecting=false;});
}
function flushDistance() { profile.savePeak(routePeak); }
function refreshBuild(changes,reels) {
  levels=garage.points.map(levelOf);spec=buildSpec(levels,garage.kits);
  sim?.setBuild(levels,garage.kits);
  if(changes?.some(c=>c.to>c.from) && !reduceMotion.matches) {
    fittedAt=sim.elapsed;fitHighlights=changes.flatMap((c,i)=>c.to>c.from ? [i] : []);
  }
  drawGarage(garage,changes,reels);drawShop(garage);needsRedraw=true;
}
function transact(change) {
  const apply=()=>{
    if(storageAvailable)garage=profile.load(garage);
    change();
    if(storageAvailable) try { profile.save(garage); } catch { storageAvailable=false; }
  };
  return !testMode && navigator.locks ? navigator.locks.request(profile.key,apply) : apply();
}
function buyItem(kind,index,expected) {
  return transact(()=>{
    const stale=kind==='part' && levelOf(garage.points[index])!==expected;
    const ordered=!stale && purchase(garage,kind,index);
    drawGarage(garage);drawShop(garage);
    $('shop-notice').textContent=ordered ? 'Заказ принят. Нужна линия «'+PART_NAMES[kind==='kit'?SPECIALS[index].part:index]+'»' : 'Предложение обновилось';
  });
}
function recordProgress(reward, meters) {
  queuedPeak=Math.max(queuedPeak,meters);
  return transact(()=>{
    const {changes,installed}=advanceGarage(garage,meters,reward);
    if(reward){
      reward.receipt=[...changes.flatMap((c,i)=>c.to>c.from ? [PART_NAMES[i]+' '+c.from+'→'+c.to] : []),...installed].join(', ');
      refreshBuild(changes,$('slot-bank'));
    }
  });
}
window.addEventListener('storage',e=>{
  if(testMode || e.key!==profile.key) return;
  if(storageAvailable)garage=profile.load(garage);
  routePeak=Math.max(routePeak,garage.best);refreshBuild();
});
window.addEventListener('pagehide', flushDistance);
function spin(board) {
  if(!sim.ready || paused || finished || !slot.spin(sim.elapsed,board))return false;
  drawSlot(sim.elapsed,false);return true;
}
$('spin').addEventListener('click',()=>spin());
let exhaust = createExhaust(), smokeTime=0;
const presets = { comfort: [1.3, .4], trail: [1.7, .5], sport: [2.6, .65] };
function clearInput() { keys.clear(); touches.clear(); document.querySelectorAll('.held').forEach(b => b.classList.remove('held')); }
function reset() {
  if(routePeak > queuedPeak) recordProgress(null,routePeak);
  telemetryTime = telemetrySpeed = 0;wheelSpray.reset();receiptUntil=0;roadReceipt='';
  fitHighlights = [];
  slot.reset(); drawSlot(0, true);
  needsRedraw=true;
  samples.length=0;profileTicks=0;drawCount=0;
  exhaust = createExhaust(); exhaust.setIntensity(+$('soot').value);
  clearInput(); sim??=createSimulationClient();smokeTime=0;
  sim.reset({ frequency: +$('spring').value, damping: +$('damping').value, drive, pressure:+$('pressure').value, levels,kits:garage.kits });
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
  $('drive-readout').textContent={awd:'Полный привод',fwd:'Передний привод',rwd:'Задний привод'}[drive];
  document.querySelectorAll('[data-drive]').forEach(option => { const selected = option.dataset.drive === drive; option.classList.toggle('selected', selected); option.setAttribute('aria-pressed', selected); });
}));
$('pause').addEventListener('click', () => pause()); $('reset').addEventListener('click', reset); $('resume').addEventListener('click', () => finished ? reset() : pause(false));
$('xray').addEventListener('click', () => { xray = !xray; needsRedraw=true;$('xray').setAttribute('aria-pressed', xray); $('xray').textContent = xray ? 'Скрыть шасси' : 'Показать шасси'; });
const admin=$('admin');
$('admin-link').addEventListener('click',()=>{admin.open=true;});
if(location.hash==='#admin')admin.open=true;
const profileUrl=new URL(location.href);
if(testMode)profileUrl.searchParams.delete('garage');else profileUrl.searchParams.set('garage','test');
profileUrl.hash=testMode?'':'admin';
$('profile-link').href=profileUrl.href;
if(testMode){
  document.body.classList.add('test-mode');
  $('admin-link').textContent='Тестовый гараж';
  $('profile-link').textContent='Вернуться в карьеру';
  $('admin-help').textContent='Отдельное сохранение на время этой вкладки.';
  $('test-tools').hidden=false;
  const status=$('admin-status');
  $('test-new').addEventListener('click',()=>{
    transact(()=>{garage=readGarage(null);});
    profile.clearTestPeak();routePeak=queuedPeak=0;
    $('best').textContent='Рекорд 0 м';$('shop-notice').textContent='';
    refreshBuild();reset();status.textContent='Новая тестовая игра. Все узлы первого уровня.';
  });
  function fitPreset(level){
    transact(()=>{
      garage.points.fill(THRESHOLDS[level-1]);
      garage.kits.fill(level===THRESHOLDS.length);
      garage.orders.fill(false);garage.kitOrders.fill(false);
      refreshBuild();
    });
    $('shop-notice').textContent='';
    status.textContent=level===THRESHOLDS.length?'Установлены все детали и три спецкомплекта.':'Все детали четвёртого уровня.';
  }
  $('test-restored').addEventListener('click',()=>fitPreset(4));
  $('test-max').addEventListener('click',()=>fitPreset(THRESHOLDS.length));
  $('test-wallet').addEventListener('click',()=>{
    transact(()=>{garage.coins+=300;garage.gems+=10;drawShop(garage);});
    status.textContent='Начислено 300 монет и 10 алмазов.';
  });
  SYMBOLS.forEach((label,i)=>$('test-symbol').add(new Option(label,i)));
  LINE_NAMES.forEach((label,i)=>$('test-line').add(new Option(label,i)));
  $('test-line').value='1';
  $('test-roll').addEventListener('click',()=>{
    const symbol=Number($('test-symbol').value), line=Number($('test-line').value);
    if(spin(testLineBoard(symbol,line)))status.textContent=LINE_NAMES[line]+' · '+SYMBOLS[symbol];
    else status.textContent=finished?'Начни новый заезд для прокрутки.':paused?'Сними паузу для прокрутки.':'Дождись готовности барабанов.';
  });
}
window.addEventListener('keydown', e => {
  if(e.target instanceof HTMLSelectElement || (e.code==='Space' && e.target.closest?.('#admin, #admin-link')))return;
  if (e.target instanceof HTMLInputElement && !['KeyA','KeyD','Space','KeyR','KeyP','KeyS','KeyN'].includes(e.code)) return;
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
function resize() { const r = canvas.getBoundingClientRect(); width = r.width; height = r.height; const dpr = Math.min(devicePixelRatio || 1, 2); canvas.width = width * dpr; canvas.height = height * dpr; ctx.setTransform(dpr,0,0,dpr,0,0); smokeCanvas.width=Math.ceil(width*SMOKE_RESOLUTION);smokeCanvas.height=Math.ceil(height*SMOKE_RESOLUTION);smokeCtx.setTransform(SMOKE_RESOLUTION,0,0,SMOKE_RESOLUTION,0,0); scale = Math.max(39, Math.min(84, width / 13.5));needsRedraw=true; }
new ResizeObserver(resize).observe(canvas);
const X = x => width * .34 + (x - camera.x) * scale;
const Y = y => height * .57 - (y - camera.y) * scale;
function visibleGround(left,right) {
  // The grid is ordered and uniform; visit the visible slice, not the whole course.
  const first=Math.max(0,Math.ceil((left-.4+40)/.4)),end=Math.min(sim.points.length,Math.floor((right+.4+40)/.4)+1);
  return [{x:left-.4,y:groundHeight(left-.4)},...sim.points.slice(first,end),{x:right+.4,y:groundHeight(right+.4)}];
}
function polygon(points, fill, stroke = null, lineWidth = 1) { ctx.beginPath(); points.forEach(([x,y], i) => i ? ctx.lineTo(x,y) : ctx.moveTo(x,y)); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); if(stroke) {ctx.strokeStyle=stroke;ctx.lineWidth=lineWidth;ctx.stroke();} }
function line(points, color, thickness) {ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.strokeStyle=color;ctx.lineWidth=thickness;ctx.lineJoin='round';ctx.stroke();}
function circle(x,y,r,fill,stroke,width=1) {ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}}
function scenery() {
  drawBaku(ctx,{width,height,camera,scale});
  const left = camera.x - width*.34/scale - 3, right = left + width/scale + 6;
  drawRoad({X,Y,scale,left,right,height,ground:visibleGround(left,right),claimed:garage.roadStops});
  for(const [x,label] of [[1,'Старт'],[56,'Камень'],[118,'Подъём'],[333,'Перевал'],[498,'Спуск'],[663,'Гребень'],[FINISH+3,'Финиш']]) {
    if(x<left||x>right)continue;
    const px=X(x),py=Y(groundHeight(x));line([[px,py],[px,py-64]],'#595758',3);ctx.fillStyle='#eae4bf';ctx.fillRect(px-23,py-78,58,23);ctx.fillStyle='#514047';ctx.font='11px Trebuchet MS';ctx.textAlign='center';ctx.fillText(label,px+6,py-62);
    if(x===FINISH+3){for(let a=0;a<5;a++)for(let b=0;b<2;b++){ctx.fillStyle=(a+b)%2?'#f5efd7':'#353437';ctx.fillRect(px+a*8,py-112+b*8,8,8);}line([[px,py-60],[px,py-114]],'#595758',3);}
  }
}
function spring(a,b) {
  const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy),nx=-dy/len,ny=dx/len;
  const p=[[X(a.x),Y(a.y)]];
  for(let i=1;i<12;i++){const t=i/12,offset=(i%2?1:-1)*.085;p.push([X(a.x+dx*t+nx*offset),Y(a.y+dy*t+ny*offset)]);}
  p.push([X(b.x),Y(b.y)]);line(p,['#64584c','#796555','#928c79','#b95839','#d5a840','#da593c','#477fb1','#e5ad43'][levels[3]-1],3);
}
function car() {
  const body=sim.body, pos=body.getPosition();
  const local=(x,y)=>body.getWorldPoint({x,y});
  const lamp=local(1.98,-.04), high=local(5.75,.09),low=local(5.75,-.83);
  const front=[X(lamp.x),Y(lamp.y)],end=[X(high.x),Y(high.y)];
  const beam=ctx.createLinearGradient(...front,...end);
  beam.addColorStop(0,'rgba(255,227,164,.28)');beam.addColorStop(.55,'rgba(245,216,142,.075)');beam.addColorStop(1,'rgba(245,216,142,0)');
  const ground=visibleGround(Math.min(lamp.x,low.x,high.x)-.2,Math.max(lamp.x,low.x,high.x)+.2);
  ctx.save();ctx.beginPath();ctx.moveTo(X(ground[0].x),-height);
  for(const p of ground)ctx.lineTo(X(p.x),Y(p.y)+2);
  ctx.lineTo(X(ground.at(-1).x),-height);ctx.closePath();ctx.clip();
  polygon([[front[0],front[1]-2],end,[X(low.x),Y(low.y)],[front[0],front[1]+2]],beam);
  ctx.restore();
  ctx.save();ctx.translate(X(pos.x),Y(pos.y));ctx.rotate(-body.getAngle());ctx.scale(scale,-scale);
  if(!xray)drawWheelWells(ctx);ctx.restore();
  sim.wheels.forEach((w,i)=>{
    const p=sim.rims[i].getPosition();
    const b=local(i===0?-.7:.7,-.08);line([[X(b.x),Y(b.y)],[X(p.x),Y(p.y)]],'#454247',5);
  });
  sim.wheels.forEach((w,i)=>{
    const hub=w.getPosition(),tire=sim.tires[i],r=tire.outerRadius*scale,outline=tire.getOutline();
    // The rendered surface comes directly from the moving collision bodies.
    polygon(tire.nodes.map(n=>{const p=n.getPosition();return [X(p.x),Y(p.y)];}),'#202426');
    const skin=tire.skin*scale;
    ctx.beginPath();
    for(const node of tire.nodes){
      const p=node.getPosition(),x=X(p.x),y=Y(p.y);
      ctx.moveTo(x+skin,y);ctx.arc(x,y,skin,0,Math.PI*2);
    }
    ctx.fillStyle='#202426';ctx.fill();
    polygon(outline.map(p=>[X(hub.x+(p.x-hub.x)*.78),Y(hub.y+(p.y-hub.y)*.78)]),'#343335');
    ctx.beginPath();
    outline.forEach((p,j)=>{
      const n=tire.nodes[j].getPosition(),dx=p.x-hub.x,dy=p.y-hub.y;
      ctx.moveTo(X(hub.x+dx*.88),Y(hub.y+dy*.88));ctx.lineTo(X(n.x+(p.x-n.x)*.85),Y(n.y+(p.y-n.y)*.85));
    });
    ctx.strokeStyle='#504e4e';ctx.lineWidth=1.4;ctx.stroke();
    if(xray)outline.forEach((p,j)=>{
      const n=tire.nodes[j].getPosition();
      line([[X(hub.x+(p.x-hub.x)*.51),Y(hub.y+(p.y-hub.y)*.51)],[X(n.x),Y(n.y)]],'#b69a5c',.8);
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
    drawRim(ctx,wheelLevel,tire.rimRadius*scale);
    if(sim.dirt>.01){
      ctx.save();ctx.globalAlpha=sim.dirt*.8;
      for(let k=0;k<19;k++){const a=k*2.4,d=r*(.43+.44*(k%7)/6);circle(Math.cos(a)*d,Math.sin(a)*d,Math.max(.8,r*.043),'#8a7151');}
      ctx.restore();
    }
    line([[r*.43,0],[r*.49,0]],'#18271f',2); // valve breaks rotational symmetry
    ctx.restore();
    if(levels[4]>=3){
      ctx.save();ctx.translate(X(hub.x),Y(hub.y));ctx.rotate(-body.getAngle());
      ctx.beginPath();ctx.arc(0,0,r*.48,-.58,.22);
      ctx.strokeStyle=levels[4]>=7?'#d69c34':levels[4]>=4?'#bd5141':'#767a70';
      ctx.lineWidth=r*.095;ctx.stroke();ctx.restore();
    }
  });
  ctx.save();ctx.translate(X(pos.x),Y(pos.y));ctx.rotate(-body.getAngle());ctx.scale(scale,-scale);
  drawClassicBody(ctx,xray,exhaust.soot,levels,garage.kits,sim.dirt);ctx.restore();
  const tip=sim.exhaustMount.point,pipe=local(-1.68,-.42),can=local(-1.90,-.455+sim.exhaustMount.offset*.7);
  const pipeColor=['#6c5041','#786756','#979184','#a9b2ac','#b4bfbb','#ccd1c6','#7f7dba','#cc9a51'][levels[6]-1];
  line([[X(pipe.x),Y(pipe.y)],[X(can.x),Y(can.y)],[X(tip.x),Y(tip.y)]],pipeColor,3+levels[6]*.35);
  if(sim.boosting){
    const flame=.18+.24*Math.abs(Math.sin(sim.elapsed*37)), tail=local(-2.19-flame,-.50);
    polygon([[X(tip.x),Y(tip.y)-3],[X(tail.x),Y(tail.y)],[X(tip.x),Y(tip.y)+3]],'#79cfff');
    line([[X(tip.x),Y(tip.y)],[(X(tip.x)+X(tail.x))/2,(Y(tip.y)+Y(tail.y))/2]],'#fff0bd',2);
  }
  circle(X(can.x),Y(can.y),4,'#626d6b');
  const hanger=local(-1.90,-.372);line([[X(hanger.x),Y(hanger.y)],[X(can.x),Y(can.y)]],'#343a37',2);
  circle(X(tip.x),Y(tip.y),1.9,'#151b1d');
  if(xray){
    const gearbox=local(.38,-.05),tail=local(-.87,-.16),nose=local(.88,-.09);
    line([[X(tail.x),Y(tail.y)],[X(gearbox.x),Y(gearbox.y)],[X(nose.x),Y(nose.y)]],levels[1]>=5?'#dad4b7':'#8b8372',3);
    ctx.save();ctx.translate(X(gearbox.x),Y(gearbox.y));ctx.rotate(-body.getAngle());
    polygon([[-10,2],[-6,-4],[6,-5],[12,-2],[12,4],[-6,5]],levels[1]>=6?'#959e97':'#756d5c','#423e36');
    const ribs=2+Math.floor(levels[1]/2);
    for(let j=0;j<ribs;j++)line([[-5+j*2.5,-3],[-6+j*2.5,3]],'#c2c3ab',1);
    ctx.restore();
  }
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
          [part===0 ? local(1.37,.23) : part===1 ? local(.45,-.12) : part===6 ? tip : part===7 ? local(-.83,.54) : local(-.54,.23)];
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
  if(width<1 || height<1){requestAnimationFrame(frame);return;}
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
    const boost=keys.has('KeyN') || touches.has('nitro');
    const reward = slot.update(sim.elapsed, forward || reverse || brake || boost);
    if (reward) {
      drawSlot(sim.elapsed,false);
      recordProgress(reward,routePeak);
    }
    sim.advance(dt, sim.elapsed < slot.autoUntil ? 1 : Number(forward)-Number(reverse), brake, boost);
    accumulator=Math.min(.05,accumulator+Math.max(0,sim.elapsed-smokeTime));smokeTime=sim.elapsed;
    while(accumulator>=STEP-1e-10){exhaust.step(sim,STEP,spec.smokeFactor);wheelSpray.step(sim,STEP);accumulator-=STEP;}
    collectRoadPay(sim.body.getPosition().x-3);
    if(sim.body.getPosition().x>=FINISH+3){
      finished=true;
      const finalReward=slot.update(slot.ends,true);
      drawSlot(sim.elapsed,true);
      recordProgress(finalReward,FINISH);
      clearInput();$('overlay').hidden=false;$('overlay-title').textContent='Финиш!';
      $('overlay-caption').textContent=`${FINISH} м пройдено за ${formatTime(sim.elapsed)}`;$('resume').textContent='Новый заезд';
    }
  }
  drawSlot(sim.elapsed, paused || finished);
  const physicsEnd=profiling?performance.now():0;
  const pos=sim.body.getPosition();
  // Horizontal follow uses the same interpolated pose as every car component.
  // A lagging camera fighting discontinuous worker poses caused lateral shake.
  camera.x=pos.x;camera.y+=(pos.y-camera.y)*(1-Math.exp(-dt*3));
  scenery();const sceneryEnd=profiling?performance.now():0;drawExhaust();const smokeEnd=profiling?performance.now():0;car();wheelSpray.draw(ctx,X,Y,scale,groundHeight);
  needsRedraw=false;
  if(profiling)profileOutput.dataset.draws=String(++drawCount);
  const signedSpeed=sim.body.getLinearVelocity().x, speedKmh=Math.abs(signedSpeed)*3.6;
  const needleDegrees=185+Math.min(120,speedKmh)*170/120;
  speedNeedle.style.transform='rotate('+needleDegrees.toFixed(2)+'deg)';
  if(now>=hudAt||paused||finished){hudAt=now+100;
  const distance=Math.max(0,Math.min(FINISH,pos.x-3));
  $('speed').textContent=Math.round(speedKmh);
  $('distance').textContent=`${Math.floor(distance)} / ${FINISH} м`;
  $('progress').value=finished?FINISH:distance;
  $('time').textContent=formatTime(sim.elapsed);
  $('hundred-time').textContent=sim.hundredSeconds===null ? '—' : sim.hundredSeconds.toFixed(2).replace('.',',');
  const power=sim.wheelPowerKW;
  $('launch-time').textContent=sim.launchSeconds===null ? '—' : sim.launchSeconds.toFixed(2).replace('.',',');
  $('power-live').textContent=metricHP(power).toFixed(1).replace('.',',');
  $('power-fill').style.transform='scaleX('+Math.min(1,power/spec.powerKW)+')';
  routePeak = Math.max(routePeak, Math.floor(distance));
  if (routePeak >= queuedPeak+25) recordProgress(null,routePeak);
  $('best').textContent = 'Рекорд '+routePeak+' м';
  const nextPost=ROAD_STOPS[garage.roadStops];
  $('road-pay').textContent=sim.elapsed<receiptUntil ? roadReceipt : nextPost ?
    'До поста '+Math.max(0,Math.ceil(nextPost[0]-distance))+' м · +'+nextPost[1]+' мон.' : 'Все посты пройдены';
  const surface=sim.wetKind.includes('mud')?'Грязь':sim.wetKind.includes('water')?'Лужа':
    BRIDGES.some(([a,b])=>pos.x>=a && pos.x<=b)?'Мост':'Асфальт';
  $('road-state').textContent=surface+' · грязь на кузове '+Math.round(sim.dirt*100)+'%';
  const span = sim.elapsed - telemetryTime;
  if (span > .025 || telemetryTime === 0) {
    const accel = span > .025 ? (signedSpeed-telemetrySpeed)/span : 0;
    $('acceleration').textContent=(Math.round(accel*10)/10).toFixed(1).replace('.',',');
    $('accel-fill').style.transform='scaleX('+Math.max(-1,Math.min(1,accel/10))+')';
    telemetrySpeed = signedSpeed; telemetryTime = sim.elapsed;
  }
  $('nitro-charge').textContent=Math.round(sim.nitroCharge*100)+'%';$('nitro').classList.toggle('active',sim.boosting);
  $('pressure-live').textContent=`Задние ${sim.tires[0].pressureBar.toFixed(2)} / Передние ${sim.tires[1].pressureBar.toFixed(2)} бар`;
  $('rear').value=sim.joints[0].getJointTranslation();$('front').value=sim.joints[1].getJointTranslation();
  if(!finished){const a=Math.abs(Math.atan2(Math.sin(sim.body.getAngle()),Math.cos(sim.body.getAngle())));$('notice').textContent=a>1.8?'Машина перевернулась. Нажми R для нового заезда.':pos.x>53&&pos.x<91?'Брусчатка':pos.x>116&&pos.x<163?'Подъём':pos.x>333&&pos.x<433?'Перевал':pos.x>498&&pos.x<563?'Спуск к бухте':pos.x>663&&pos.x<753?'Последний гребень':sim.elapsed<5?'До брусчатки 55 м':'';}
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
