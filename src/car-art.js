const shells = new Image();
shells.src = 'assets/sedan-shells.webp';

// A fixed splatter mask follows the repaired shell and leaves both wheel openings clear.
let grimeAtlas;
function grime(){
  if(grimeAtlas)return grimeAtlas;
  grimeAtlas=document.createElement('canvas');
  const w=grimeAtlas.width=shells.naturalWidth,h=grimeAtlas.height=shells.naturalHeight/4;
  const c=grimeAtlas.getContext('2d');let seed=137;
  const roll=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  for(let j=0;j<2600;j++){
    const x=roll(),rise=roll()**2.5,arch=Math.max(0,1-Math.min(Math.abs(x-.22),Math.abs(x-.78))*5);
    const y=1-rise*(.28+.38*arch);
    c.fillStyle=['#69543d','#876a49','#524839','#9a8162'][j%4];
    c.beginPath();c.ellipse(x*w,y*h,1+roll()*4,1+roll()*2,-.35,0,Math.PI*2);c.fill();
  }
  c.globalCompositeOperation='destination-in';c.drawImage(shells,0,0,w,h,0,0,w,h);
  return grimeAtlas;
}

// Atlas rows share axle centres at x = ±1.25 m; the open arches reveal the live tires.
function paintShell(ctx,row) {
  const height=shells.naturalHeight/4;
  ctx.save();
  ctx.scale(1,-1);
  ctx.drawImage(shells,0,row*height,shells.naturalWidth,height,-2.24,-.83,4.4,1.41);
  ctx.restore();
}

export function drawWheelWells(ctx) {
  ctx.fillStyle='#292824';
  for(const x of [-1.25,1.25]){
    ctx.beginPath();
    ctx.ellipse(x,-.445,.405,.373,0,0,Math.PI);
    ctx.fill();
  }
}

export function drawClassicBody(ctx,xray,soot,levels,kits,dirt) {
  if(!shells.naturalWidth)return;
  const body=levels[5], carbon=kits[2] && body>=4;
  ctx.save();
  ctx.globalAlpha=xray?.28:1;
  paintShell(ctx,[0,1,1,2,2,2,3,3][body-1]);
  // Local replacement panels mark the intermediate repair and wide-body fits.
  if(body===3 || body===6){
    ctx.save();ctx.beginPath();
    if(body===3)ctx.rect(-.39,-.48,.82,.68);
    else {ctx.rect(-2.2,-.52,1.38,.68);ctx.rect(.86,-.52,1.28,.68);}
    ctx.clip();paintShell(ctx,body===3?2:3);ctx.restore();
  }
  const metal=ctx.createLinearGradient(0,.24,0,.11);
  metal.addColorStop(0,'#c3be9f');metal.addColorStop(.36,'#6b746b');metal.addColorStop(.62,'#38413f');metal.addColorStop(1,'#242927');
  function panel(points,fill){
    ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));
    ctx.closePath();ctx.fillStyle=fill;ctx.fill();ctx.strokeStyle='#30312c';ctx.lineWidth=.012;ctx.stroke();
  }
  if(body===5 && !carbon)panel([[-2.1,.13],[-1.75,.17],[-1.74,.20],[-2.13,.24]],metal);
  if(body>=6 || carbon){
    const h=body>=7?.42:.32;
    for(const x of [-1.97,-1.74])panel([[x,.135],[x+.038,.135],[x-.032,h],[x-.067,h]],metal);
    panel([[-2.2,h+.045],[-1.6,h+.03],[-1.54,h],[-2.18,h-.012]],metal);
    if(body>=7)panel([[-2.19,h-.034],[-1.64,h-.056],[-1.58,h-.083],[-2.17,h-.088]],metal);
    panel([[-2.21,h-.072],[-2.115,h-.063],[-2.1,h+.086],[-2.22,h+.091]],carbon?'#283436':'#445453');
  }
  if(levels[0]>=4 || kits[0])panel([[.83,.173],[.94,.256],[1.25,.252],[1.39,.164]],metal);
  if(carbon || body===8){
    panel([[-.83,-.418],[.81,-.418],[.84,-.495],[-.85,-.487]],'#293132');
    panel([[1.71,-.425],[1.98,-.401],[2.09,-.482],[1.69,-.482]],'#364041');
  }
  if(levels[7]>=3){
    ctx.fillStyle='#395c70';ctx.fillRect(-.86,.245,.23,.07);
    ctx.fillStyle='#a3a7a0';ctx.fillRect(-.80,.245,.026,.072);
    if(kits[1]){ctx.fillStyle='#536f7b';ctx.fillRect(-.86,.32,.23,.055);}
  }
  if(soot>.01){
    const stain=ctx.createRadialGradient(-2.04,-.345,0,-2.04,-.345,.085);
    stain.addColorStop(0,'rgba(37,31,27,'+soot*.65+')');stain.addColorStop(1,'rgba(37,31,27,0)');
    ctx.fillStyle=stain;ctx.fillRect(-2.125,-.43,.17,.17);
  }
  if(dirt>.003){
    ctx.globalAlpha*=Math.min(.94,dirt);
    ctx.scale(1,-1);ctx.drawImage(grime(),-2.24,-.83,4.4,1.41);
  }
  ctx.restore();
}
