import {reactionCues} from './performance.js';
import {wheelDetents} from './feedback.js';
import {synthesizeMechanical} from './mechanical-sound.js';

export function createAudio(){
  let ctx,bus,enabled=true,lastLoad=0,variant=0,cues=[],cueIndex=0,wheel=null,wheelCursor=0,wheelElapsed=0;
  let nextIdle=0,lastReaction=-1;const voices=new Set(),bank=new Map();
  const stats={scheduledTeeth:0,slowTeeth:0,locks:0,peakVoices:0};
  function unlock(){
    const Ctx=window.AudioContext||window.webkitAudioContext;
    if(!ctx&&Ctx){
      ctx=new Ctx({latencyHint:'interactive'});
      const high=ctx.createBiquadFilter(),low=ctx.createBiquadFilter(),limit=ctx.createDynamicsCompressor();bus=ctx.createGain();bus.gain.value=.82;
      high.type='highpass';high.frequency.value=38;low.type='lowpass';low.frequency.value=8200;
      limit.threshold.value=-13;limit.knee.value=10;limit.ratio.value=6;limit.attack.value=.002;limit.release.value=.09;
      bus.connect(high);high.connect(low);low.connect(limit);limit.connect(ctx.destination);
    }
    if(ctx?.state==='suspended')ctx.resume().catch(()=>{});
  }
  function play(kind,volume=1,delay=0,rate=1){
    if(!ctx||!enabled)return;
    const v=variant++%5,key=kind+v;let buffer=bank.get(key);
    if(!buffer){const data=synthesizeMechanical(kind,ctx.sampleRate,v);buffer=ctx.createBuffer(1,data.length,ctx.sampleRate);buffer.copyToChannel(data,0);bank.set(key,buffer);}
    const source=ctx.createBufferSource(),gain=ctx.createGain();source.buffer=buffer;source.playbackRate.value=rate;
    gain.gain.value=volume;source.connect(gain);gain.connect(bus);source.start(ctx.currentTime+Math.max(0,delay));
    voices.add(source);stats.peakVoices=Math.max(stats.peakVoices,voices.size);
    source.onended=()=>{voices.delete(source);source.disconnect();gain.disconnect();};
  }
  function silence(){for(const source of voices){try{source.stop();}catch{}}voices.clear();nextIdle=0;}
  function cue(name){
    const sounds={ignite:['spark',.5],chug:['combustion',.62],die:['die',.45],'cheeky-cough':['cough',.95],
      'shoe-scuff':['cloth',.7],jam:['jam',.9],'hand-contact':['contact',.45],strain:['strain',.5],jacket:['cloth',.5],
      'shoulder-contact':['contact',.85],free:['free',.85],horn:['horn',.65],gift:['latch',.48]};
    if(sounds[name])play(...sounds[name]);
  }
  const api={
    unlock,get enabled(){return enabled;},
    toggle(){unlock();enabled=!enabled;api.pause();return enabled;},
    compression(amount){if(amount>.22&&amount>lastLoad+.13){lastLoad=amount;play('compression',.20+amount*.12);}},
    releaseLoad(){lastLoad=0;},rebound(){play('return',.45);},
    kick(power){play('kick',.65+power*.25);play('combustion',.45+power*.15,.065);},
    tick(weight=.5){play('tooth',weight);},
    updateWheel(plan,elapsed){
      if(!ctx)return;
      if(wheel?.plan!==plan){wheel={plan,events:wheelDetents(plan)};wheelCursor=0;wheelElapsed=elapsed;}
      wheelElapsed=elapsed;
      while(wheelCursor<wheel.events.length&&wheel.events[wheelCursor].time<=elapsed+.085){
        const e=wheel.events[wheelCursor++];if(e.time<elapsed-.12)continue;
        play('tooth',e.weight,Math.max(0,e.time-elapsed));stats.scheduledTeeth++;if(e.slow)stats.slowTeeth++;
      }
    },
    stopWheel(kind='blank'){
      wheel=null;play('lock',.88);stats.locks++;
      if(kind==='spark')play('spark',.38,.045);
      if(kind==='gift')play('latch',.52,.055);
      if(kind==='piston')play('jam',.24,.038);
    },
    react(result,helpers){
      wheel=null;lastReaction=-1;nextIdle=0;cues=[...reactionCues(result,helpers)];cueIndex=0;
      if(!result.success)play('return',.32);
      if(result.kind==='blank')cues=[[0,'chug'],[.29,'chug'],[.63,'die']];
      if(result.kind==='gift')cues=[[.16,'gift']];
      if(result.success){cues=[[0,'ignite'],...Array.from({length:9},(_,i)=>[.05+i*.13,'chug'])];if(helpers.includes('gold'))cues.push([3.45,'horn']);}
      api.updateReaction(0);
    },
    updateReaction(time){
      if(time<lastReaction)return;lastReaction=time;
      while(cueIndex<cues.length&&cues[cueIndex][0]<=time){const [at,name]=cues[cueIndex++];if(time-at<.15)cue(name);}
    },
    update(time,running){
      if(!ctx||!enabled||!running)return;
      if(!nextIdle||nextIdle<ctx.currentTime-.1)nextIdle=ctx.currentTime;
      while(nextIdle<ctx.currentTime+.07){
        play('combustion',.30+.025*Math.sin(time*11),nextIdle-ctx.currentTime,.94+.025*Math.sin(time*7));
        nextIdle+=.112+.003*Math.sin(time*17+nextIdle*13);
      }
    },
    pause(){
      silence();if(wheel)wheelCursor=wheel.events.findIndex(e=>e.time>wheelElapsed);
      if(wheelCursor<0&&wheel)wheelCursor=wheel.events.length;
    },
    cancel(){silence();wheel=null;cues=[];cueIndex=0;lastReaction=-1;lastLoad=0;},
    getStats(){return {...stats,voices:voices.size,state:ctx?.state||'locked',enabled};},
  };
  return api;
}
