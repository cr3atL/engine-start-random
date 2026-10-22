import { IGNITION_STROKE } from './gesture.js';

const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const ease=t=>{t=clamp(t);return t*t*(3-2*t);};

// A compression stroke covers less distance as the boot approaches top dead centre.
export function compressionStroke(travel){
  return IGNITION_STROKE*(1-Math.pow(1-clamp(travel),1.65));
}

export function createPedalMotion(){
  let value=0,velocity=0,target=0,mode='rest',age=0,start=0,power=0;
  function step(dt){
    const elapsed=Math.max(0,Math.min(.1,dt));age+=elapsed;
    if(mode==='kick'){
      if(age<.055)value=start+(.68-start)*ease(age/.055);
      else if(age<.19)value=.68+.32*Math.pow(ease((age-.055)/.135),.7);
      else if(age<.29)value=1+Math.sin((age-.19)*75)*Math.exp(-(age-.19)*42)*.014*(.6+power*.4);
      else{mode='return';target=0;velocity=0;age=0;}
      return value;
    }
    // Substeps preserve the spring at both high refresh rates and slower mobile frame rates.
    const steps=Math.max(1,Math.ceil(elapsed*180)),h=elapsed/steps;
    const stiffness=mode==='drag'?1100:195,damping=mode==='drag'?62:19.5;
    for(let i=0;i<steps;i++){
      velocity+=((target-value)*stiffness-velocity*damping)*h;
      value+=velocity*h;
      if(value<-.028){value=-.028;velocity=Math.max(0,velocity)*.3;}
      if(value>1.018){value=1.018;velocity=Math.min(0,velocity)*.2;}
    }
    if(Math.abs(value-target)<.0005&&Math.abs(velocity)<.006){value=target;velocity=0;if(mode==='return')mode='rest';}
    return value;
  }
  return {
    step,
    setTarget(stroke){target=clamp(stroke,0,.68);mode='drag';age=0;},
    release(){target=0;mode='return';age=0;},
    kick(strength){start=clamp(value,0,.68);power=strength;mode='kick';age=0;velocity=0;},
    returnFromBottom(){value=1;target=0;velocity=0;mode='return';age=0;},
    reset(){value=velocity=target=age=0;mode='rest';},
    get value(){return value;},get mode(){return mode;},get age(){return age;},
  };
}

// Solve an articulated leg in its side plane; neither trouser segment changes length.
export function solveKnee(hip,ankle,thighLength=1.43,shinLength=1.28){
  const dx=ankle.x-hip.x,dy=ankle.y-hip.y,raw=Math.hypot(dx,dy);
  const d=Math.max(.001,Math.min(raw,thighLength+shinLength-.001));
  const along=(thighLength*thighLength-shinLength*shinLength+d*d)/(2*d);
  const height=Math.sqrt(Math.max(0,thighLength*thighLength-along*along));
  const nx=dx/Math.max(raw,.001),ny=dy/Math.max(raw,.001);
  return {x:hip.x+nx*along-ny*height,y:hip.y+ny*along+nx*height,z:(hip.z+ankle.z)/2};
}
