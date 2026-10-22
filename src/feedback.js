import {SECTOR_ANGLE,sampleSpin} from './game.js';

// Invert the existing motion curve: physical crossings, independent of frame rate.
export function wheelDetents(plan){
  const endTime=plan.fastDuration+plan.tailDuration,events=[];
  for(let tooth=Math.floor(plan.from/SECTOR_ANGLE)+1;tooth*SECTOR_ANGLE<plan.end;tooth++){
    const angle=tooth*SECTOR_ANGLE;let lo=0,hi=endTime;
    for(let i=0;i<38;i++){const mid=(lo+hi)/2;if(sampleSpin(plan,mid)<angle)lo=mid;else hi=mid;}
    const time=(lo+hi)/2,slow=time>=plan.fastDuration;
    events.push({time,angle,tooth,slow,weight:slow?.78+.22*(time-plan.fastDuration)/plan.tailDuration:.28});
  }
  return events;
}
export const STOP_LABELS={spark:'火花塞',piston:'活塞',blank:'空转',gift:'礼盒'};
export const STOP_COLORS={spark:'#c9e5cf',piston:'#c7aa89',blank:'#a9b4ae',gift:'#e4bd70'};
export function stopEnvelope(age,reduced=false){
  if(age<0||age>.52)return {glow:0,shake:0};
  return {glow:reduced?.48:Math.min(1,age/.025)*(.44+.56*Math.exp(-age*6)),shake:reduced?0:Math.sin(age*81)*Math.exp(-age*27)};
}
