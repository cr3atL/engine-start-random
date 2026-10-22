import test from 'node:test';
import assert from 'node:assert/strict';
import {firstIgnition,pistonRepair,repairTiming,reactionCues,reactionDuration,FIRST_FIRE_DURATION} from '../src/performance.js';

test('first ignition stalls when the shoe leaves, waits silently, and coughs once as it approaches',()=>{
  assert.ok(firstIgnition(.5).rpm>0);
  assert.ok(firstIgnition(1.5).x>.20);
  for(let t=1.15;t<2.50;t+=.01)assert.equal(firstIgnition(t).rpm,0);
  assert.ok(firstIgnition(2.54).x<.025);
  assert.ok(firstIgnition(2.54).rpm>0);
  assert.equal(firstIgnition(2.9).rpm,0);
  assert.ok(firstIgnition(2.9).x>.1);
  assert.equal(firstIgnition(FIRST_FIRE_DURATION).x,0);
  assert.equal(firstIgnition(FIRST_FIRE_DURATION).y,0);
});

test('mechanic pushes with hands, withdraws, braces a shoulder, then frees the jam',()=>{
  const helpers=['mechanic'],release=repairTiming(helpers).release;
  assert.ok(pistonRepair(1.3,helpers).hands>.95);
  assert.ok(pistonRepair(1.85,helpers).hands<.25);
  assert.ok(pistonRepair(2.65,helpers).shoulder>.95);
  assert.ok(pistonRepair(2.65,helpers).load>0);
  assert.equal(pistonRepair(release-.01,helpers).jammed,true);
  assert.equal(pistonRepair(release+.01,helpers).jammed,false);
  assert.ok(pistonRepair(release+.01,helpers).rpm>0);
  assert.ok(pistonRepair(release+.15,helpers).recoil>.9);
  assert.equal(pistonRepair(5,helpers).x,0);
});

test('gold shortens repairs, and the mechanic performance never appears without the helper',()=>{
  assert.ok(repairTiming(['gold']).release<repairTiming([]).release);
  assert.ok(repairTiming(['gold','mechanic']).release<repairTiming(['mechanic']).release);
  for(let t=0;t<5;t+=.03){const pose=pistonRepair(t,[]);assert.equal(pose.hands,0);assert.equal(pose.shoulder,0);}
});

test('audio release cues and the engine release share the same clock for every helper combination',()=>{
  for(const helpers of [[],['gold'],['mechanic'],['gold','mechanic']]){
    const cues=reactionCues({kind:'piston'},helpers),release=repairTiming(helpers).release;
    assert.equal(cues.find(c=>c[1]==='free')[0],release);
    assert.ok(cues.every((c,i)=>i===0||c[0]>=cues[i-1][0]));
    assert.ok(cues.at(-1)[0]<reactionDuration({kind:'piston'},helpers));
  }
  assert.equal(reactionCues({kind:'spark',success:false},[]).filter(c=>c[1]==='cheeky-cough').length,1);
});

test('returning control waits for the acting to settle without extending the success sequence',()=>{
  assert.equal(reactionDuration({kind:'spark',success:false},[]),FIRST_FIRE_DURATION);
  assert.equal(reactionDuration({kind:'spark',success:true},['mechanic']),6.4);
  const duration=reactionDuration({kind:'piston'},['mechanic']);
  assert.equal(pistonRepair(duration,['mechanic']).recoil,0);
  assert.equal(pistonRepair(duration,['mechanic']).shoulder,0);
});
