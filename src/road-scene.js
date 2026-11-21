import { BRIDGES, HUMPS, POOLS, groundHeight } from './terrain.js';
import { ROAD_STOPS } from './garage.js';

function grain(){
  const tile=document.createElement('canvas');tile.width=128;tile.height=96;
  const t=tile.getContext('2d');let seed=1137;
  const random=()=>((seed=(Math.imul(1664525,seed)+1013904223)>>>0)/4294967296);
  for(let i=0;i<2100;i++){
    t.fillStyle=i%3?'rgba(186,181,163,.19)':'rgba(7,14,16,.32)';
    t.fillRect(random()*128,random()*96,random()*1.8+.45,random()+.5);
  }
  return tile;
}
function lampGlow(){
  const tile=document.createElement('canvas');tile.width=tile.height=96;
  const c=tile.getContext('2d'),g=c.createRadialGradient(48,48,1,48,48,48);
  g.addColorStop(0,'#fff1b8cf');g.addColorStop(.13,'#ffd78b76');g.addColorStop(.52,'#ffbb611c');g.addColorStop(1,'#ffc27200');
  c.fillStyle=g;c.fillRect(0,0,96,96);return tile;
}

export function createRoadScene(c){
  const grit=c.createPattern(grain(),'repeat'),glow=lampGlow();
  function path(points,color,width){
    c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));
    c.strokeStyle=color;c.lineWidth=width;c.lineJoin='round';c.stroke();
  }
  function fill(points,color){
    c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));
    c.closePath();c.fillStyle=color;c.fill();
  }
  const bar=(x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(x,y,w,h);};
  return function road({X,Y,scale,left,right,height,ground,claimed}){
    const at=x=>Y(groundHeight(x)),road=ground.map(p=>[X(p.x),Y(p.y)]);
    const edge=[...road,[road.at(-1)[0],height+2],[road[0][0],height+2]];
    c.save();c.beginPath();c.rect(road[0][0],-height,road.at(-1)[0]-road[0][0],height*3);
    for(const [a,b] of BRIDGES)if(b>left&&a<right)c.rect(X(a),-height,(b-a)*scale,height*3);
    c.clip('evenodd');
    fill(edge,'#494840');
    const strip=(a,b,col)=>fill([...road.map(([x,y])=>[x,y+a*scale]),...road.slice().reverse().map(([x,y])=>[x,y+b*scale])],col);
    strip(0,.12,'#525353');strip(.12,.22,'#323635');strip(.22,.34,'#625d50');
    c.save();c.beginPath();edge.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.clip();
    c.translate(X(0)%128,Y(0)%96);bar(-160,-height*2,c.canvas.width+400,height*5,grit);c.restore();
    path(road,'#86847a',1.3);
    for(let i=Math.floor(left/3);i<=right/3;i++){
      const x=i*3+.31,py=at(x);
      path([[X(x),py+4],[X(x+.31),at(x+.31)+6],[X(x+.51),at(x+.51)+3],[X(x+.7),at(x+.7)+5]],'#393d3a',1.2);
      if(i%5===1){
        c.save();c.translate(X(x),py+4);c.rotate(Math.atan2(at(x+.5)-py,.5*scale));
        bar(0,0,scale*.55,4,'#232c2b');for(let k=1;k<8;k++)bar(k*scale*.065,0,1,4,'#8a877c');c.restore();
      }
    }
    c.restore();
    for(const [a,b] of BRIDGES){
      if(a>right||b<left)continue;
      const x0=X(a),x1=X(b),y0=at(a),y1=at(b),water=Math.max(y0,y1)+scale*1.55;
      // The cutaway opens under the slab; stone abutments and piers descend to the canal.
      fill([[x0,water],[x1,water],[x1,height+8],[x0,height+8]],'#384e53');
      for(let j=Math.ceil(Math.max(a,left)*2);j<Math.min(b,right)*2;j++){
        const y=water+3+Math.abs(Math.sin(j*11.7))*scale*.72;
        bar(X(j/2),y,scale*(.13+.21*Math.abs(Math.cos(j))),1,'#708383');
      }
      for(let x=a;x<=b+.01;x+=3.2){
        const w=scale*.24;bar(X(x)-w/2,at(x)+scale*.17,w,scale*3,'#535951');
        bar(X(x)-w/2,at(x)+scale*.17,w*.26,scale*3,'#818171');
        bar(X(x)-w,at(x)+scale*.20,w*2,scale*.12,'#60645b');
      }
      fill([[x0,y0],[x1,y1],[x1,y1+.27*scale],[x0,y0+.27*scale]],'#6d6c61');
      path([[x0,y0+2],[x1,y1+2]],'#adb0a0',4);path([[x0,y0+.22*scale],[x1,y1+.22*scale]],'#434942',3);
      for(let x=a;x<b;x+=1.6){
        const end=Math.min(b,x+1.6);
        path([[X(x),at(x)],[X(x),at(x)-.62*scale]],'#444d49',3);
        path([[X(x),at(x)-.1*scale],[X(end),at(end)-.53*scale]],'#64716b',1.5);
      }
      path([[x0,y0-.62*scale],[x1,y1-.62*scale]],'#92988a',3);
    }
    for(const p of POOLS){
      if(p.start>right||p.end<left)continue;
      const mud=p.kind==='mud', surface=Y(p.level);
      let bottom=[];
      function patch(){
        if(bottom.length<2){bottom=[];return;}
        const x0=bottom[0][0],x1=bottom.at(-1)[0];
        fill([[x0,surface],[x1,surface],...bottom.reverse()],mud?'#69543c':'#6a858b');
        path([[x0,surface],[x1,surface]],mud?'#937958':'#b2c3bc',1.5);
        for(let x=x0+4;x<x1-8;x+=13)bar(x,surface+2,Math.min(8,x1-x),1,mud?'#443a2b':'#a4b7b4');
        bottom=[];
      }
      for(let x=p.start;x<=p.end+.001;x+=.2){
        const py=at(x);
        if(py>surface+.05)bottom.push([X(x),py+.025*scale]);else patch();
      }
      patch();
    }
    for(const [a,b] of HUMPS){
      if(a>right||b<left)continue;
      for(let x=a+.17;x<b-.16;x+=.38)path([[X(x),at(x)+1],[X(x+.17),at(x+.17)+1]],'#c8aa69',3);
      const sx=X(a-.7),sy=at(a-.7);bar(sx-2,sy-38,3,38,'#777b6a');
      fill([[sx,sy-52],[sx-10,sy-35],[sx+10,sy-35]],'#d7b666');
      path([[sx-6,sy-38],[sx-3,sy-39],[sx,sy-42],[sx+3,sy-39],[sx+6,sy-38]],'#453e31',1.5);
    }
    for(let i=Math.floor((left-1)/14);i<=(right+1)/14;i++){
      const x=i*14+1.8,px=X(x),py=at(x),s=scale,top=py-s*3.0,bulb=px+s*.55;
      c.save();
      const pool=c.createRadialGradient(bulb,py,0,bulb,py,s*1.75);
      pool.addColorStop(0,'rgba(255,218,145,.17)');pool.addColorStop(1,'rgba(255,218,145,0)');
      c.translate(bulb,py);c.scale(1,.10);c.translate(-bulb,-py);c.fillStyle=pool;c.fillRect(bulb-s*2,py-s*2,s*4,s*4);c.restore();
      path([[px,py],[px,top+.23*s],[px+.18*s,top],[bulb,top]],'#303c3d',Math.max(2,s*.045));
      path([[px+1,py-.16*s],[px+1,top+.26*s]],'#87918a',1);
      bar(px-s*.048,py-.18*s,s*.096,s*.18,'#4c5550');
      c.drawImage(glow,bulb-.75*s,top-.72*s,1.5*s,1.5*s);
      fill([[bulb-.17*s,top+.025*s],[bulb-.09*s,top-.05*s],[bulb+.12*s,top-.05*s],[bulb+.17*s,top+.025*s]],'#383e39');
      bar(bulb-.115*s,top+.026*s,.23*s,Math.max(2,.042*s),'#fff1bd');
    }
    ROAD_STOPS.forEach(([meters,coins,gems],i)=>{
      const x=meters+3;if(x<left||x>right)return;
      const px=X(x),py=at(x)-4,done=i<claimed;
      bar(px-2,py-1.02*scale,4,1.02*scale,'#5e655b');
      const cy=py-scale*1.05;
      c.fillStyle=done?'#52615a':'#d8bd78';c.beginPath();c.arc(px,cy,12,0,Math.PI*2);c.fill();
      c.strokeStyle=done?'#9ba997':'#705936';c.lineWidth=1.5;c.stroke();
      c.fillStyle=done?'#e9eadc':'#433825';c.textAlign='center';c.font='bold 11px Bahnschrift, sans-serif';c.fillText(done?'✓':'+'+coins,px,cy+4);
      if(gems&&!done){c.fillStyle='#b4dfdb';c.fillText('◆',px+10,cy-8);}
    });
  };
}
