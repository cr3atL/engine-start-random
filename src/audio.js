import {reactionCues} from './performance.js';

export function createAudio(){
  let ctx,enabled=true,idle=null,idleGain=null,lastTick=-1,lastLoad=0,cues=[],cueIndex=0,noiseBuffer;
  const voices=new Set();
  function unlock(){const Ctx=window.AudioContext||window.webkitAudioContext;if(!ctx&&Ctx)ctx=new Ctx();if(ctx?.state==='suspended')ctx.resume().catch(()=>{});}
  function tone(f,d,type='triangle',volume=.06,delay=0,end=f){
    if(!enabled||!ctx)return;const t=ctx.currentTime+delay,o=ctx.createOscillator(),g=ctx.createGain();
    o.type=type;o.frequency.setValueAtTime(f,t);o.frequency.exponentialRampToValueAtTime(Math.max(15,end),t+d);
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(volume,t+.005);g.gain.exponentialRampToValueAtTime(.0001,t+d);
    o.connect(g);g.connect(ctx.destination);o.start(t);o.stop(t+d+.01);voices.add(o);o.onended=()=>{voices.delete(o);o.disconnect();g.disconnect();};
  }
  function knock(delay=0,heavy=false){tone(heavy?95:460,.045,'triangle',heavy?.15:.06,delay,heavy?33:220);tone(1280,.018,'sine',.015,delay);}
  function chug(delay=0,volume=.035){tone(55,.1,'sawtooth',volume,delay,28);tone(90,.06,'triangle',volume*.8,delay);}
  function friction(duration,volume,frequency,delay=0){
    if(!enabled||!ctx)return;
    if(!noiseBuffer){noiseBuffer=ctx.createBuffer(1,ctx.sampleRate*.5,ctx.sampleRate);const data=noiseBuffer.getChannelData(0);let seed=9123;for(let i=0;i<data.length;i++){seed=seed*16807%2147483647;data[i]=(seed/2147483647*2-1);}}
    const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain(),t=ctx.currentTime+delay;
    source.buffer=noiseBuffer;source.loop=true;filter.type='bandpass';filter.frequency.value=frequency;filter.Q.value=.8;
    gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(volume,t+.015);gain.gain.exponentialRampToValueAtTime(.0001,t+duration);
    source.connect(filter);filter.connect(gain);gain.connect(ctx.destination);source.start(t);source.stop(t+duration+.01);voices.add(source);
    source.onended=()=>{voices.delete(source);source.disconnect();filter.disconnect();gain.disconnect();};
  }
  function cue(name){
    if(name==='ignite'){tone(1600,.035,'sawtooth',.018,0,250);friction(.035,.018,2600);}
    if(name==='chug'){chug(0,.027);friction(.07,.026,155);}
    if(name==='die'){chug(0,.014);tone(42,.13,'triangle',.02,0,18);}
    if(name==='cheeky-cough'){chug(0,.042);friction(.085,.06,165);tone(95,.065,'triangle',.035,0,31);}
    if(name==='shoe-scuff')friction(.12,.018,750);
    if(name==='jam'){knock(0,true);tone(72,.065,'square',.018,0,35);}
    if(name==='hand-contact'){tone(170,.04,'triangle',.012,0,90);friction(.08,.012,500);}
    if(name==='strain'){tone(66,.19,'triangle',.010,0,43);friction(.20,.012,260);}
    if(name==='jacket')friction(.15,.014,1050);
    if(name==='shoulder-contact'){tone(115,.06,'triangle',.022,0,48);friction(.1,.015,420);}
    if(name==='free'){knock(0,true);tone(630,.055,'triangle',.022,.018,190);friction(.065,.025,1800);}
  }
  function stopIdle(){if(idle){try{idle.stop();}catch{}idle.disconnect();idleGain.disconnect();idle=null;idleGain=null;}}
  function startIdle(){if(!ctx||!enabled||idle)return;idle=ctx.createOscillator();idleGain=ctx.createGain();const filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=170;idle.type='sawtooth';idle.frequency.value=42;idleGain.gain.value=.018;idle.connect(filter);filter.connect(idleGain);idleGain.connect(ctx.destination);idle.start();}
  return {
    unlock,
    compression(amount){if(amount>.35&&amount>lastLoad+.095){lastLoad=amount;tone(65+amount*40,.07,'sawtooth',.007+amount*.005,0,35+amount*25);}},
    releaseLoad(){lastLoad=0;},
    rebound(){tone(165,.10,'triangle',.025,0,90);tone(560,.035,'sine',.01,.055,370);},
    get enabled(){return enabled;},
    toggle(){unlock();enabled=!enabled;if(!enabled){this.cancel();}return enabled;},
    tick(){if(!ctx||ctx.currentTime-lastTick<.025)return;lastTick=ctx.currentTime;knock();},
    kick(power){knock(0,true);chug(.07,.025+power*.025);tone(180,.12,'triangle',.035,0,60);},
    stopWheel(){knock(0,true);},
    react(result,helpers){
      cues=reactionCues(result,helpers);cueIndex=0;this.updateReaction(0);
      if(!result.success)this.rebound();
      if(result.kind==='blank'){chug(0,.025);chug(.3,.018);tone(45,.15,'sawtooth',.02,.65,20);}
      if(result.kind==='spark'&&result.success){
        tone(1600,.04,'sawtooth',.025,0,250);for(let i=0;i<10;i++)chug(i*.13,.022);
        if(result.success){startIdle();if(helpers.includes('gold')){tone(290,.55,'sawtooth',.033,3.45,180);tone(360,.5,'triangle',.025,3.45,230);}}
        else{chug(1.5,.018);chug(1.8,.012);tone(35,.13,'sawtooth',.02,2.0,18);}
      }
      if(result.kind==='gift'){knock();tone(680,.4,'sine',.04,.2);tone(1020,.35,'sine',.02,.24);}
    },
    updateReaction(time){while(cueIndex<cues.length&&cues[cueIndex][0]<=time){cue(cues[cueIndex++][1]);}},
    update(time,running){if(running&&enabled){startIdle();if(idle){idle.frequency.setTargetAtTime(41+Math.sin(time*18)*3,ctx.currentTime,.04);idleGain.gain.setTargetAtTime(.014+Math.abs(Math.sin(time*20))*.009,ctx.currentTime,.03);}}},
    cancel(){stopIdle();for(const voice of voices){try{voice.stop();}catch{}}voices.clear();},
  };
}
