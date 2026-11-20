const sheets = ['power','traction','coach','induction'];
export function paintIcon(el, id, level=1) {
  const key=id+'-'+level;
  if(el.dataset.art===key) return;
  el.dataset.art=key;
  const token=id>=8, cell=(id%2)*8+level-1;
  const sheet=token ? 'tokens' : sheets[Math.floor(id/2)];
  el.style.backgroundImage='url("assets/'+sheet+'.webp")';
  el.style.backgroundSize=token ? '200% 100%' : '400% 400%';
  el.style.backgroundPosition=token ? (id-8)*100+'% 0' : cell%4*100/3+'% '+Math.floor(cell/4)*100/3+'%';
}

const rims=new Image();
rims.src='assets/traction.webp';
export function drawRim(ctx, level, radius) {
  if(!rims.naturalWidth) return;
  const cell=rims.naturalWidth/4, index=level-1, size=cell*.82;
  ctx.save();
  ctx.beginPath();ctx.arc(0,0,radius,0,2*Math.PI);ctx.clip();
  ctx.drawImage(rims,cell*(index%4+.5)-size/2,cell*(Math.floor(index/4)+.5)-size/2,size,size,-radius,-radius,radius*2,radius*2);
  ctx.restore();
}
