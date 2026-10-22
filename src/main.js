import './style.css';
import {createWorld} from './world.js';
import {createAudio} from './audio.js';
import {createRun,beginKick,settleResult,finishReaction,HELPERS,planSpin,sampleSpin,spinDuration,SECTOR_ANGLE} from './game.js';
import {measureKick,MIN_KICK_DISTANCE} from './gesture.js';
import {compressionStroke} from './pedal.js';
import {reactionDuration} from './performance.js';
import {STOP_LABELS} from './feedback.js';

const $=id=>document.getElementById(id),foot=$('kick-target'),help=$('help-modal'),gauge=$('stroke-gauge'),caption=$('caption');
const audio=createAudio();let world,run=createRun(),loaded=false,drag=null,plan=null,spinTime=0,angle=0,lastSector=-1,reactionTime=0,clock=0,lastFrame=0;
let stopped=false,visible=!document.hidden,paused=false,interrupted=false,captionUntil=0;
function say(text,duration=1.2){caption.textContent=text;caption.hidden=!text;captionUntil=clock+duration;}
function setReady(){foot.hidden=false;foot.disabled=false;document.body.dataset.phase='ready';}
function updateIgnitions(){
  $('light-one').classList.toggle('on',run.ignitions>=1);$('light-two').classList.toggle('on',run.ignitions>=2);
  $('ignitions').setAttribute('aria-label',`点火 ${run.ignitions} / 2`);
}
function cancelDrag(firing=false){
  const old=drag;drag=null;foot.classList.remove('dragging');gauge.hidden=true;audio.releaseLoad();
  if(!firing){world?.releasePedal();if(old?.samples.length>1)audio.rebound();}
  if(old){try{foot.releasePointerCapture(old.id);}catch{}}
}
function cutTo(shot){document.body.classList.toggle('internal',shot==='interior');world.setShot(shot);}
function fire(power){
  if(!loaded||run.phase!=='ready'||paused||!visible)return;
  audio.unlock();const result=beginKick(run,power);if(!result)return;
  cancelDrag(true);world.kick(power);audio.kick(power);foot.hidden=true;say('');
  plan=planSpin(angle,result.slot,power);spinTime=-.27;stopped=false;lastSector=Math.floor(angle/SECTOR_ANGLE);
  document.body.dataset.phase='spinning';document.body.dataset.spinStage='precut';document.body.classList.add('has-kicked');
}
foot.addEventListener('pointerdown',e=>{
  if(e.button!==0||!loaded||run.phase!=='ready'||paused)return;
  e.preventDefault();audio.unlock();drag={id:e.pointerId,samples:[{y:e.clientY,t:performance.now()}],anchor:world.shoeAnchor()};foot.setPointerCapture(e.pointerId);foot.classList.add('dragging');gauge.hidden=false;
});
foot.addEventListener('pointermove',e=>{
  if(!drag||e.pointerId!==drag.id)return;e.preventDefault();
  drag.samples.push({y:e.clientY,t:performance.now()});const distance=Math.max(0,e.clientY-drag.samples[0].y),travel=distance/MIN_KICK_DISTANCE,stroke=compressionStroke(travel);
  world.setStroke(stroke);audio.compression(travel);$('stroke-fill').style.height=`${stroke*100}%`;
  if(distance>=MIN_KICK_DISTANCE){const motion=measureKick(drag.samples);if(motion.valid)fire(motion.power);}
});
foot.addEventListener('pointerup',e=>{
  if(!drag||e.pointerId!==drag.id)return;e.preventDefault();drag.samples.push({y:e.clientY,t:performance.now()});
  const motion=measureKick(drag.samples);if(motion.valid)fire(motion.power);else cancelDrag();
});
for(const type of ['pointercancel','lostpointercapture'])foot.addEventListener(type,e=>{if(drag?.id===e.pointerId)cancelDrag();});
foot.addEventListener('contextmenu',e=>e.preventDefault());foot.addEventListener('click',e=>{if(e.detail===0)fire(.55);});
$('keyboard-kick').addEventListener('click',()=>fire(.55));
document.addEventListener('keydown',e=>{
  if(e.code==='Escape'&&!help.hidden){closeHelp();return;}
  if(e.repeat||drag||paused)return;
  if(e.code==='Space'||(e.code==='Enter'&&(e.target===foot||e.target===$('keyboard-kick')))){
    if(e.target instanceof HTMLButtonElement&&e.target!==foot&&e.target!==$('keyboard-kick'))return;
    e.preventDefault();fire(.55);
  }
});
const helperIcons={gold:'<path d="M6 3h12v9H6zm0 3h12M6 9h12m-8 3v5m4-5v5"/><circle cx="12" cy="19" r="3"/>',
  mechanic:'<path d="M4 9h16M6 9V6c0-4 12-4 12 0v3m-2 2v2c0 5-8 5-8 0v-2M5 21c0-5 14-5 14 0"/>'};
function addHelper(id){
  if(id==='oil'||document.querySelector(`[data-helper="${id}"]`))return;
  const tag=document.createElement('span');tag.className='helper-icon';tag.dataset.helper=id;tag.title=HELPERS[id].name;tag.setAttribute('role','img');tag.setAttribute('aria-label',HELPERS[id].name);
  tag.innerHTML=`<svg viewBox="0 0 24 24" aria-hidden="true">${helperIcons[id]}</svg>`;$('helpers').append(tag);
}
function presentResult(){
  const result=settleResult(run);reactionTime=0;plan=null;say('');cutTo('side');world.react(result,run);audio.react(result,run.helpers);document.body.dataset.phase='reacting';updateIgnitions();
  if(result.kind==='gift'){addHelper(result.helper);say(HELPERS[result.helper].name,1.35);}
}
function updateSpin(dt){
  const was=spinTime;spinTime+=dt;if(spinTime<0)return;
  if(was<0)cutTo('interior');
  angle=sampleSpin(plan,spinTime);world.setWheelAngle(angle);
  const motionEnd=plan.fastDuration+plan.tailDuration;
  if(!stopped){
    audio.updateWheel(plan,Math.min(spinTime,motionEnd));
    const sector=Math.floor(angle/SECTOR_ANGLE);
    if(sector!==lastSector){lastSector=sector;world.pointerTick(spinTime>=plan.fastDuration?1:.35);}
  }
  if(spinTime>=motionEnd&&!stopped){
    stopped=true;document.body.dataset.spinStage='stopped';audio.stopWheel(run.last.kind);world.stopWheel(run.last.slot,run.last.kind);say(STOP_LABELS[run.last.kind],.52);
  }else if(!stopped)document.body.dataset.spinStage=spinTime>=plan.fastDuration?'last-slots':'fast';
  if(spinTime>=spinDuration(plan))presentResult();
}
function updateReaction(dt){
  reactionTime+=dt;audio.updateReaction(reactionTime);
  // Acting is left unobstructed: no subtitles narrating a shoe, hand or shoulder.
  if(reactionTime>=reactionDuration(run.last,run.helpers)){
    finishReaction(run);
    if(run.running){document.body.dataset.phase='running';say('着了。',1.6);}else setReady();
  }
}
function reset(){
  cancelDrag();audio.cancel();run=createRun();plan=null;angle=0;reactionTime=0;stopped=false;world.reset();cutTo('side');
  $('helpers').replaceChildren();updateIgnitions();say('');setReady();
  document.body.classList.remove('has-kicked');delete document.body.dataset.spinStage;
}
$('reset').addEventListener('click',reset);
$('sound').addEventListener('click',()=>{const on=audio.toggle();document.body.classList.toggle('muted',!on);$('sound').setAttribute('aria-label',on?'关闭声音':'开启声音');$('sound').setAttribute('aria-pressed',String(!on));});
function closeHelp(){help.hidden=true;paused=false;document.body.classList.remove('paused');lastFrame=performance.now();if(run.phase==='ready')foot.focus({preventScroll:true});}
$('help').addEventListener('click',()=>{cancelDrag();paused=true;help.hidden=false;audio.pause();document.body.classList.add('paused');$('help-close').focus();});
$('help-close').addEventListener('click',closeHelp);help.addEventListener('click',e=>{if(e.target===help)closeHelp();});
help.addEventListener('keydown',e=>{if(e.key==='Tab'){e.preventDefault();$('help-close').focus();}});
window.addEventListener('blur',()=>{interrupted=true;cancelDrag();audio.pause();});
window.addEventListener('focus',()=>{interrupted=false;lastFrame=performance.now();});
document.addEventListener('visibilitychange',()=>{visible=!document.hidden;if(!visible){cancelDrag();audio.pause();}lastFrame=performance.now();});
function frame(now){
  const dt=Math.min(.1,Math.max(0,(now-lastFrame)/1000));lastFrame=now;
  if(!visible||paused||interrupted)return;clock+=dt;
  if(plan)updateSpin(dt);else if(run.phase==='reacting')updateReaction(dt);
  if(!caption.hidden&&clock>captionUntil)caption.hidden=true;
  world.update(dt);audio.update(clock,run.running);
  if(!foot.hidden){const p=world.shoeAnchor();foot.style.left=`${p.x}px`;foot.style.top=`${p.y}px`;const reference=drag?.anchor||p;gauge.style.left=`${reference.x>innerWidth-100?reference.x-70:reference.x+70}px`;gauge.style.top=`${reference.y-24}px`;}
}
async function boot(){
  try{
    world=createWorld($('world'));await world.whenReady();loaded=true;lastFrame=performance.now();world.engine.runRenderLoop(()=>frame(performance.now()));$('loading').remove();setReady();
    window.__motorcycle={getState:()=>structuredClone(run),getStats:()=>world.getStats(),getAudioStats:()=>audio.getStats()};
  }catch(error){console.error(error);$('loading')?.remove();$('fatal').hidden=false;}
}
boot();
