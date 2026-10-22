import test from 'node:test';
import assert from 'node:assert/strict';
import {planSpin,sampleSpin,SECTOR_ANGLE} from '../src/game.js';
import {wheelDetents,stopEnvelope} from '../src/feedback.js';
import {synthesizeMechanical,SOUND_DURATIONS} from '../src/mechanical-sound.js';
import {createAudio} from '../src/audio.js';

test('every mechanical click occurs at a real sector crossing, including the last three',()=>{
  for(const from of [0,.7,49.2])for(const power of [.08,.55,1])for(let slot=0;slot<10;slot++){
    const plan=planSpin(from,slot,power),events=wheelDetents(plan),slow=events.filter(e=>e.slow);
    assert.equal(slow.length,3);
    for(const e of events){assert.ok(Math.abs(sampleSpin(plan,e.time)-e.tooth*SECTOR_ANGLE)<1e-8);assert.ok(e.time<plan.fastDuration+plan.tailDuration);}
    assert.ok(slow[2].time-slow[1].time>slow[1].time-slow[0].time);
    assert.ok(plan.fastDuration+plan.tailDuration-slow[2].time>.7);
  }
});

test('stop feedback ends within the unchanged hold and respects reduced motion',()=>{
  assert.deepEqual(stopEnvelope(.53),{glow:0,shake:0});
  assert.equal(stopEnvelope(.1,true).shake,0);assert.ok(stopEnvelope(.03).glow>stopEnvelope(.49).glow);
});

test('mechanical transients stay finite, bounded, and decay without a cut-off click',()=>{
  for(const rate of [22050,48000])for(const kind of Object.keys(SOUND_DURATIONS)){
    const data=synthesizeMechanical(kind,rate);
    let peak=0,head=0,tail=0;
    for(let i=0;i<data.length;i++){assert.ok(Number.isFinite(data[i]));peak=Math.max(peak,Math.abs(data[i]));if(i<data.length/2)head+=data[i]**2;if(i>data.length*.95)tail+=data[i]**2;}
    assert.ok(peak>.005&&peak<.79,kind);assert.ok(Math.abs(data.at(-1))<.003,kind);assert.ok(tail<head*.08,kind);
  }
  assert.notDeepEqual(synthesizeMechanical('tooth',48000,0),synthesizeMechanical('tooth',48000,4));
});

class FakeContext{
  constructor(){this.sampleRate=22050;this.currentTime=0;this.state='running';this.sources=[];FakeContext.latest=this;}
  createGain(){return {gain:{value:1},connect(){},disconnect(){}};}
  createBiquadFilter(){return {frequency:{value:0},connect(){}};}
  createDynamicsCompressor(){return {threshold:{},knee:{},ratio:{},attack:{},release:{},connect(){}};}
  createBuffer(){return {copyToChannel(){}};}
  createBufferSource(){const source={playbackRate:{},connect(){},disconnect(){},start(at){this.at=at;},stop(){this.stopped=true;this.onended?.();}};this.sources.push(source);return source;}
}

test('audio crossings survive slow frames, pause and mute without queued sounds leaking',()=>{
  const original=globalThis.window;globalThis.window={AudioContext:FakeContext};
  try{
    const audio=createAudio();audio.unlock();const ctx=FakeContext.latest,plan=planSpin(0,1,.7);
    for(let t=0;t<plan.fastDuration+plan.tailDuration;t+=.09){ctx.currentTime=t;audio.updateWheel(plan,t);}
    assert.equal(audio.getStats().scheduledTeeth,wheelDetents(plan).length);assert.equal(audio.getStats().slowTeeth,3);
    const previous=ctx.sources.slice();audio.pause();assert.ok(previous.every(s=>s.stopped));assert.equal(audio.getStats().voices,0);
    audio.stopWheel('piston');assert.equal(audio.getStats().locks,1);
    audio.toggle();const count=ctx.sources.length;audio.tick();assert.equal(ctx.sources.length,count);
    audio.cancel();assert.equal(audio.getStats().voices,0);
  }finally{globalThis.window=original;}
});
