import './style.css';
import {createWorld} from './world.js';
import {createAudio} from './audio.js';
import {createRun,beginKick,settleResult,finishReaction,RESULTS,HELPERS,planSpin,sampleSpin,spinDuration,SECTOR_ANGLE} from './game.js';
import {measureKick,MIN_KICK_DISTANCE} from './gesture.js';
import {compressionStroke} from './pedal.js';
import {firstIgnition,pistonRepair,reactionDuration} from './performance.js';

const $=id=>document.getElementById(id),foot=$('kick-target'),help=$('help-modal'),gauge=$('stroke-gauge');
const audio=createAudio();let world,run=createRun(),loaded=false,drag=null,plan=null,spinTime=0,angle=0,lastSector=-1,reactionTime=0,clock=0,lastFrame=0;
let stopped=false,visible=!document.hidden,paused=false,successShown=false;
const setCopy=(name,copy)=>{$('result-name').textContent=name;$('reaction-text').textContent=copy;};
function setReady(){
  foot.hidden=false;foot.disabled=false;$('operation-text').textContent='鼠标 / 手指抓住鞋向下拖，越快越有劲';
  $('kick-count').textContent=run.kicks?`已踩 ${run.kicks} 脚 · 两次点火才算着`:'尚未踩踏 · 空格也可代踩一脚';
  document.body.dataset.phase='ready';
}
function cancelDrag(firing=false){
  const old=drag;drag=null;foot.classList.remove('dragging');gauge.hidden=true;audio.releaseLoad();
  if(!firing){world?.releasePedal();if(old?.samples.length>1)audio.rebound();}
  if(old){try{foot.releasePointerCapture(old.id);}catch{}}
}
function cutTo(shot){
  // A direct cinematic insert keeps the kick and the rotating engine causally connected.
  document.body.classList.toggle('internal',shot==='interior');world.setShot(shot);
  $('shot-label').textContent=shot==='interior'?'02 / 发动机内部':'01 / 脚踏启动';
  $('wheel-caption').hidden=shot!=='interior';
}
function fire(power){
  if(!loaded||run.phase!=='ready'||paused||!visible)return;
  audio.unlock();const result=beginKick(run,power);if(!result)return;
  cancelDrag(true);world.kick(power);audio.kick(power);foot.hidden=true;
  plan=planSpin(angle,result.slot,power);spinTime=-.27;stopped=false;lastSector=-1;
  document.body.dataset.phase='spinning';document.body.dataset.spinStage='precut';
  $('kick-count').textContent=`第 ${run.kicks} 脚 · 力度 ${Math.round(power*100)}%`;
  $('operation-text').textContent='这一脚，已经踩下去了。';
  setCopy('打火棍咬合','咔哒。');
}
foot.addEventListener('pointerdown',e=>{
  if(e.button!==0||!loaded||run.phase!=='ready'||paused)return;
  e.preventDefault();audio.unlock();drag={id:e.pointerId,samples:[{y:e.clientY,t:performance.now()}],anchor:world.shoeAnchor()};foot.setPointerCapture(e.pointerId);foot.classList.add('dragging');gauge.hidden=false;
});
foot.addEventListener('pointermove',e=>{
  if(!drag||e.pointerId!==drag.id)return;e.preventDefault();
  drag.samples.push({y:e.clientY,t:performance.now()});const distance=Math.max(0,e.clientY-drag.samples[0].y),travel=distance/MIN_KICK_DISTANCE,stroke=compressionStroke(travel);
  world.setStroke(stroke);audio.compression(travel);$('stroke-fill').style.height=`${stroke*100}%`;
  $('operation-text').textContent=travel<.42?'压住脚踏，继续往下踩。':travel<1?'压住了……再使一点劲。':'咔哒。';
  if(distance>=MIN_KICK_DISTANCE){const motion=measureKick(drag.samples);if(motion.valid)fire(motion.power);}
});
foot.addEventListener('pointerup',e=>{
  if(!drag||e.pointerId!==drag.id)return;e.preventDefault();
  drag.samples.push({y:e.clientY,t:performance.now()});const motion=measureKick(drag.samples);
  if(motion.valid)fire(motion.power);else{cancelDrag();$('operation-text').textContent='还没踩过点火位置，往下再多踩一点。';}
});
for(const type of ['pointercancel','lostpointercapture'])foot.addEventListener(type,e=>{if(drag?.id===e.pointerId)cancelDrag();});
foot.addEventListener('contextmenu',e=>e.preventDefault());
foot.addEventListener('click',e=>{if(e.detail===0)fire(.55);});
$('keyboard-kick').addEventListener('click',()=>fire(.55));
document.addEventListener('keydown',e=>{
  if(e.code==='Escape'&&!help.hidden){closeHelp();return;}
  if(e.repeat||drag)return;
  if(e.code==='Space'||(e.code==='Enter'&&(e.target===foot||e.target===$('keyboard-kick')))){
    if(e.target instanceof HTMLButtonElement&&e.target!==foot&&e.target!==$('keyboard-kick'))return;
    e.preventDefault();fire(.55);
  }
});
function presentResult(){
  const result=settleResult(run);reactionTime=0;plan=null;cutTo('side');world.react(result,run);audio.react(result,run.helpers);document.body.dataset.phase='reacting';
  $('light-one').classList.toggle('on',run.ignitions>=1);$('light-two').classList.toggle('on',run.ignitions>=2);$('ignition-text').textContent=`${run.ignitions} / 2`;
  $('engine-condition').textContent=run.running?'已启动 · 怠速运转':run.ignitions?'已点火一次 · 就差一脚':'冷车 · 尚未启动';
  if(result.kind==='spark')setCopy(result.success?'第二次点火':'第一次点火',result.success?RESULTS.spark.second:'突、突突突……好像要着了。');
  else if(result.kind==='gift'){
    const reward=HELPERS[result.helper];setCopy(reward.name,reward.copy);
    if(result.helper!=='oil'){const tag=document.createElement('span');tag.className='helper-tag';tag.textContent=reward.name+' · 本局保留';$('helper-tags').append(tag);}
  }else setCopy(RESULTS[result.kind].name,RESULTS[result.kind].copy);
  $('operation-text').textContent=result.success?'先听一会儿，它这次没熄火。':'看它这回怎么说。';
}
function updateSpin(dt){
  const was=spinTime;spinTime+=dt;
  if(spinTime<0)return;
  if(was<0){cutTo('interior');$('wheel-state').textContent='机械转盘运转中';$('wheel-hint').textContent='听最后几声。';setCopy('发动机内部','这一脚，把它带起来了。');}
  angle=sampleSpin(plan,spinTime);world.setWheelAngle(angle);
  const sector=Math.floor(angle/SECTOR_ANGLE);
  if(sector!==lastSector){lastSector=sector;world.pointerTick();audio.tick();}
  const motionEnd=plan.fastDuration+plan.tailDuration;
  if(spinTime>=motionEnd&&!stopped){
    stopped=true;document.body.dataset.spinStage='stopped';audio.stopWheel();
    $('wheel-state').textContent=RESULTS[run.last.kind].name;
    $('wheel-hint').textContent={spark:'啪。',piston:'咯噔。',blank:'……',gift:'叮。'}[run.last.kind];
  }else if(!stopped){
    const slow=spinTime>=plan.fastDuration;document.body.dataset.spinStage=slow?'last-slots':'fast';$('wheel-state').textContent=slow?'最后几格……':'机械转盘运转中';
  }
  if(spinTime>=spinDuration(plan))presentResult();
}
function updateReaction(dt){
  reactionTime+=dt;const result=run.last;audio.updateReaction(reactionTime);
  if(result.kind==='spark'&&!result.success){
    const {beat}=firstIgnition(reactionTime);document.body.dataset.reactionBeat=beat;
    if(beat==='silence')setCopy('第一次点火 · 1 / 2','鞋刚挪开，它就不响了。');
    if(beat==='approach')setCopy('第一次点火 · 1 / 2','……');
    if(beat==='cough')setCopy('突。','');
    if(beat==='double-take'||beat==='settle')setCopy('第一次点火 · 1 / 2','鞋一靠近，它又突了一下。');
  }
  if(result.kind==='piston'&&run.helpers.includes('mechanic')){
    const {beat}=pistonRepair(reactionTime,run.helpers);document.body.dataset.reactionBeat=beat;
    if(beat==='hands')setCopy('原厂小师傅 · 抢修中','先用手推一推。');
    if(beat==='reconsider')setCopy('原厂小师傅 · 抢修中','……');
    if(beat==='shoulder')setCopy('原厂小师傅 · 抢修中','师傅把肩膀顶了上去。');
    if(beat==='release'||beat==='recover')setCopy('咔。通了。','只是卡了一下，没坏。');
  }
  if(result.success){
    if(run.helpers.includes('gold')&&reactionTime>3.45&&reactionTime<4.5)setCopy('金色活塞 · 正常发挥','排气管越吹越大……嘟——');
    if(run.helpers.includes('mechanic')&&reactionTime>4.5)setCopy('原厂小师傅','师傅伸出手：“着了。工钱呢？”');
    if(!run.helpers.length&&reactionTime>3)setCopy('持续怠速中','后视镜慢慢低下头，也想看看它到底怎么着的。');
  }
  const duration=reactionDuration(result,run.helpers);
  if(reactionTime>=duration){
    finishReaction(run);
    if(run.running){document.body.dataset.phase='running';successShown=true;$('success').hidden=false;$('operation-text').textContent='车已启动。让它好好喘口气。';}
    else setReady();
  }
}
function reset(){
  cancelDrag();audio.cancel();run=createRun();plan=null;angle=0;reactionTime=0;successShown=false;world.reset();cutTo('side');$('success').hidden=true;
  $('helper-tags').replaceChildren();$('light-one').classList.remove('on');$('light-two').classList.remove('on');$('ignition-text').textContent='0 / 2';$('engine-condition').textContent='冷车 · 尚未启动';
  setCopy('祖传摩托 · 冷启动','这一脚下去，应该就能着了。');setReady();
}
$('reset').addEventListener('click',reset);$('again').addEventListener('click',reset);
$('sound').addEventListener('click',()=>{const on=audio.toggle();document.body.classList.toggle('muted',!on);$('sound').setAttribute('aria-label',on?'关闭声音':'开启声音');$('sound').title=on?'关闭声音':'开启声音';});
function closeHelp(){help.hidden=true;paused=false;document.body.classList.remove('paused');lastFrame=performance.now();if(run.phase==='ready')foot.focus({preventScroll:true});}
$('help').addEventListener('click',()=>{cancelDrag();paused=true;help.hidden=false;audio.cancel();document.body.classList.add('paused');$('help-close').focus();});
$('help-close').addEventListener('click',closeHelp);help.addEventListener('click',e=>{if(e.target===help)closeHelp();});
help.addEventListener('keydown',e=>{if(e.key==='Tab'){e.preventDefault();$('help-close').focus();}});
window.addEventListener('blur',()=>{cancelDrag();audio.cancel();});
document.addEventListener('visibilitychange',()=>{visible=!document.hidden;if(!visible){cancelDrag();audio.cancel();}lastFrame=performance.now();});
function frame(now){
  const dt=Math.min(.1,Math.max(0,(now-lastFrame)/1000));lastFrame=now;
  if(!visible||paused)return;clock+=dt;
  if(plan)updateSpin(dt);else if(run.phase==='reacting')updateReaction(dt);
  world.update(dt);audio.update(clock,run.running);
  if(!foot.hidden){const p=world.shoeAnchor();foot.style.left=`${p.x}px`;foot.style.top=`${p.y}px`;const reference=drag?.anchor||p;gauge.style.left=`${reference.x>innerWidth-130?reference.x-65:reference.x+65}px`;gauge.style.top=`${reference.y-35}px`;}
}
async function boot(){
  try{
    world=createWorld($('world'));await world.whenReady();loaded=true;lastFrame=performance.now();world.engine.runRenderLoop(()=>frame(performance.now()));$('loading').remove();setReady();
    // Read-only inspection; ordinary input is always used to play the game.
    window.__motorcycle={getState:()=>structuredClone(run),getStats:()=>world.getStats()};
  }catch(error){console.error(error);$('loading')?.remove();$('fatal').hidden=false;}
}
boot();
