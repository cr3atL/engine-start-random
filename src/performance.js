// One clock for the acting, engine motion and sound cues. The quiet beats are intentional.
const clamp=t=>Math.max(0,Math.min(1,t));
const ease=t=>{t=clamp(t);return t*t*(3-2*t);};
const ramp=(t,a,b)=>ease((t-a)/(b-a));
const pulse=(t,a,b,c,d)=>ramp(t,a,b)*(1-ramp(t,c,d));

export const FIRST_FIRE_DURATION=4.35;
export function firstIgnition(t){
  const leave=pulse(t,.65,1.12,2.0,2.48);
  const recoil=pulse(t,2.68,2.83,3.35,4.08);
  const tease=pulse(t,2.03,2.48,2.68,2.84);
  const rpm=t<1.14?26*(1-ramp(t,.96,1.14)):t>=2.51&&t<2.73?27*(1-ramp(t,2.60,2.73)):0;
  return {x:leave*.22+recoil*.13,y:leave*.20+recoil*.14+tease*.035,
    pitch:leave*.13-recoil*.12,rpm,spark:t<.16||t>=2.51&&t<2.56,
    beat:t<1.14?'withdraw':t<2.03?'silence':t<2.51?'approach':t<2.74?'cough':t<3.35?'double-take':'settle'};
}

export function repairTiming(helpers){
  const mechanic=helpers.includes('mechanic'),gold=helpers.includes('gold');
  const speed=gold?.86:1;
  return {mechanic,speed,release:mechanic?2.82*speed:gold?.63:1.05,
    duration:mechanic?4.35*speed:2.0};
}
export function pistonRepair(t,helpers){
  const timing=repairTiming(helpers),s=t/timing.speed;
  const hands=timing.mechanic?pulse(s,.65,1.08,1.60,1.96):0;
  const shoulder=timing.mechanic?pulse(s,2.0,2.47,2.83,3.08):0;
  const recoil=timing.mechanic?pulse(s,2.82,2.95,3.20,3.72):0;
  const shove=hands*(s>1.15&&s<1.6?Math.sin((s-1.15)*Math.PI/.45):0);
  const load=shoulder*ramp(s,2.48,2.8);
  const step=pulse(s,.30,.85,3.60,4.25);
  return {...timing,hands,shoulder,recoil,shove,load,
    rpm:t<.28?17:t<timing.release?0:t<timing.release+.34?26:0,
    jammed:t>=.28&&t<timing.release,
    x:hands*.13+shove*.025+shoulder*.34+load*.025-recoil*.055,
    y:step*.24+shoulder*.02-recoil*.02,step,
    lean:-hands*.16-shove*.06-shoulder*.46+recoil*.18,
    look:hands*.12+shoulder*.42-recoil*.22,
    beat:s<.65?'notice':s<1.6?'hands':s<2?'reconsider':s<2.82?'shoulder':s<3.25?'release':'recover'};
}

export function reactionDuration(result,helpers){
  return result.success?6.4:result.kind==='spark'?FIRST_FIRE_DURATION:
    result.kind==='piston'?repairTiming(helpers).duration:result.kind==='gift'?2.6:1.45;
}

// Audio is dispatched when the render clock crosses these markers, so pause/mute/reset
// cannot leave a delayed punchline sounding over a different scene.
export function reactionCues(result,helpers){
  if(result.kind==='spark'&&!result.success)return [
    [0,'ignite'],[.08,'chug'],[.23,'chug'],[.38,'chug'],[.53,'chug'],[.68,'chug'],[.83,'chug'],
    [1.02,'die'],[2.51,'cheeky-cough'],[2.75,'shoe-scuff']];
  if(result.kind==='piston'){
    const {mechanic,speed,release}=repairTiming(helpers);
    const cues=[[0,'chug'],[.28,'jam']];
    if(mechanic)cues.push([.78*speed,'hand-contact'],[1.22*speed,'strain'],[1.67*speed,'jacket'],[2.24*speed,'shoulder-contact'],[2.55*speed,'strain']);
    cues.push([release,'free'],[release+.08,'chug']);return cues.sort((a,b)=>a[0]-b[0]);
  }
  return [];
}
