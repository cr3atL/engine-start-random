// The texture is drawn as engine enamel and metal part illustrations, not a UI prize card.
import { SECTORS, TAU } from './game.js';

function rounded(ctx,x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r);}
function plug(ctx) {
  ctx.save();ctx.translate(0,-4);
  const metal=ctx.createLinearGradient(-22,0,22,0);metal.addColorStop(0,'#616d73');metal.addColorStop(.4,'#d4d6cd');metal.addColorStop(.65,'#7a878a');metal.addColorStop(1,'#3c464b');
  ctx.fillStyle=metal;rounded(ctx,-11,-66,22,23,3);ctx.fill();
  ctx.fillStyle='#c9c5b1';rounded(ctx,-16,-46,32,60,5);ctx.fill();
  for(let i=0;i<5;i++){ctx.fillStyle=i%2?'#a6a897':'#e0d9be';rounded(ctx,-20,-39+i*10,40,6,3);ctx.fill();}
  ctx.fillStyle=metal;ctx.beginPath();for(let i=0;i<6;i++){const a=TAU*i/6;ctx.lineTo(Math.cos(a)*27,Math.sin(a)*19+24);}ctx.closePath();ctx.fill();
  ctx.fillRect(-15,36,30,37);ctx.strokeStyle='#404c51';ctx.lineWidth=3;
  for(let y=40;y<73;y+=6){ctx.beginPath();ctx.moveTo(-15,y+3);ctx.lineTo(15,y-2);ctx.stroke();}
  ctx.strokeStyle='#b8c4c4';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(12,73);ctx.lineTo(12,86);ctx.lineTo(0,86);ctx.stroke();
  ctx.strokeStyle='#aee7ed';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-26,54);ctx.lineTo(-33,66);ctx.lineTo(-25,68);ctx.lineTo(-36,80);ctx.stroke();
  ctx.beginPath();ctx.moveTo(27,-30);ctx.lineTo(37,-22);ctx.lineTo(29,-17);ctx.lineTo(39,-5);ctx.stroke();ctx.restore();
}
function piston(ctx){
  const metal=ctx.createLinearGradient(-40,0,40,0);metal.addColorStop(0,'#666d6c');metal.addColorStop(.35,'#c9ceca');metal.addColorStop(.6,'#99a7a8');metal.addColorStop(1,'#4f5a5e');
  ctx.fillStyle=metal;rounded(ctx,-35,-65,70,62,8);ctx.fill();
  ctx.strokeStyle='#414a4e';ctx.lineWidth=4;
  for(const y of [-54,-44,-34]){ctx.beginPath();ctx.moveTo(-35,y);ctx.lineTo(35,y);ctx.stroke();}
  ctx.fillStyle='#343e41';ctx.beginPath();ctx.arc(0,-16,11,0,TAU);ctx.fill();
  ctx.fillStyle=metal;ctx.beginPath();ctx.moveTo(-9,-3);ctx.lineTo(-13,48);ctx.lineTo(13,48);ctx.lineTo(9,-3);ctx.fill();
  ctx.beginPath();ctx.arc(0,65,25,0,TAU);ctx.fill();ctx.fillStyle='#343c3e';ctx.beginPath();ctx.arc(0,65,14,0,TAU);ctx.fill();
}
function gift(ctx){
  const g=ctx.createLinearGradient(-40,-40,40,40);g.addColorStop(0,'#e3c675');g.addColorStop(.5,'#b79547');g.addColorStop(1,'#755526');ctx.fillStyle=g;
  rounded(ctx,-40,-30,80,77,4);ctx.fill();ctx.fillStyle='#af8b3d';ctx.fillRect(-46,-43,92,21);
  ctx.fillStyle='#853f30';ctx.fillRect(-7,-43,14,90);ctx.fillRect(-40,-1,80,12);
  ctx.strokeStyle='#a64936';ctx.lineWidth=10;ctx.beginPath();ctx.ellipse(-16,-55,18,10,.5,0,TAU);ctx.ellipse(16,-55,18,10,-.5,0,TAU);ctx.stroke();
}
export function paintWheel(ctx,size=1024){
  const scale=size/1024;ctx.save();ctx.scale(scale,scale);ctx.clearRect(0,0,1024,1024);
  const cx=512,cy=512,r=488,step=TAU/10;
  let seed=42;const rnd=()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646;};
  for(let i=0;i<10;i++){
    const kind=SECTORS[i],a=-Math.PI/2+i*step;
    ctx.beginPath();ctx.moveTo(cx,cy);ctx.arc(cx,cy,r,a,a+step);ctx.closePath();
    const g=ctx.createRadialGradient(cx,cy,150,cx,cy,r);
    const colors={spark:['#263a32','#356b4c'],piston:['#402b2a','#783c35'],blank:['#31383a','#434b4d'],gift:['#6c522a','#c19c51']}[kind];
    g.addColorStop(0,colors[0]);g.addColorStop(.8,colors[1]);g.addColorStop(1,colors[0]);ctx.fillStyle=g;ctx.fill();ctx.strokeStyle='#1d2325';ctx.lineWidth=5;ctx.stroke();
    ctx.save();ctx.translate(cx,cy);ctx.rotate(a+step/2);ctx.translate(340,0);ctx.rotate(Math.PI/2);
    ctx.shadowColor='#0008';ctx.shadowBlur=8;ctx.shadowOffsetY=3;
    if(kind==='spark')plug(ctx);if(kind==='piston')piston(ctx);if(kind==='gift')gift(ctx);ctx.restore();
  }
  // Deterministic fine scratches and flecks of old enamel.
  ctx.save();ctx.beginPath();ctx.arc(cx,cy,r-5,0,TAU);ctx.clip();
  for(let i=0;i<1700;i++){const x=rnd()*1024,y=rnd()*1024;ctx.strokeStyle=rnd()>.45?'#ddd7be18':'#090d0e33';ctx.lineWidth=.5+rnd();ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+2+rnd()*13,y-1-rnd()*3);ctx.stroke();}ctx.restore();
  for(const [radius,color,line] of [[486,'#c1c1b3',7],[475,'#151d21',5],[185,'#101719',7],[180,'#7b8582',3]]){ctx.strokeStyle=color;ctx.lineWidth=line;ctx.beginPath();ctx.arc(cx,cy,radius,0,TAU);ctx.stroke();}
  const hub=ctx.createRadialGradient(475,462,8,cx,cy,185);hub.addColorStop(0,'#818c87');hub.addColorStop(.5,'#3a4445');hub.addColorStop(1,'#20282a');ctx.fillStyle=hub;ctx.beginPath();ctx.arc(cx,cy,178,0,TAU);ctx.fill();
  for(let i=0;i<6;i++){const a=i*TAU/6;ctx.save();ctx.translate(cx+Math.cos(a)*135,cy+Math.sin(a)*135);ctx.rotate(a);ctx.fillStyle='#151e20';rounded(ctx,-28,-13,56,26,11);ctx.fill();ctx.restore();}
  ctx.restore();
}
