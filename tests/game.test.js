import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun,beginKick,settleResult,finishReaction,SECTORS,SECTOR_ANGLE,TAU,planSpin,sampleSpin,spinDuration} from '../src/game.js';

function kick(run,slot,giftRoll=0){assert.ok(beginKick(run,.6,()=>slot/10+.01));const result=settleResult(run,()=>giftRoll);finishReaction(run);return result;}
test('only the second spark starts the motorcycle, with progress retained across other outcomes',()=>{
  const run=createRun();assert.equal(kick(run,0).success,false);assert.equal(run.ignitions,1);
  for(const slot of [1,2,1,2,1,2])kick(run,slot);
  assert.equal(run.ignitions,1);assert.equal(run.phase,'ready');assert.equal(kick(run,3).success,true);assert.equal(run.phase,'running');assert.equal(run.ignitions,2);
  assert.equal(beginKick(run,.5),null);
});
test('piston jams have no health, breakage, or limit on attempts',()=>{
  const run=createRun();for(let i=0;i<20;i++)kick(run,1);
  assert.equal(run.phase,'ready');assert.equal(run.kicks,20);assert.equal(run.running,false);assert.equal('health' in run,false);
});
test('gifts persist, never replace ignition, and offer the other helper on the next gift',()=>{
  const run=createRun();assert.equal(kick(run,9).helper,'gold');kick(run,1);kick(run,2);
  assert.deepEqual(run.helpers,['gold']);assert.equal(kick(run,9).helper,'mechanic');assert.equal(kick(run,9).helper,'oil');assert.equal(run.ignitions,0);
  assert.deepEqual(run.helpers,['gold','mechanic']);
});
test('cannot consume another kick during rotation or reaction',()=>{
  const run=createRun();beginKick(run,.5);assert.equal(beginKick(run,.5),null);settleResult(run);assert.equal(beginKick(run,.5),null);assert.equal(run.kicks,1);
});
test('all ten stops match the mechanical wheel and every spin decelerates monotonically',()=>{
  for(let slot=0;slot<10;slot++)for(const power of [.08,.55,1]){
    const plan=planSpin(17.4,slot,power);let previous=plan.from;
    for(let t=0;t<spinDuration(plan);t+=.007){const a=sampleSpin(plan,t);assert.ok(a>=previous-1e-8);assert.ok(a<=plan.end+1e-8);previous=a;}
    const end=sampleSpin(plan,99),atPointer=((TAU-(end%TAU))%TAU)/SECTOR_ANGLE;
    assert.equal(Math.floor(atPointer),slot);assert.equal(end,plan.end);
  }
});
test('the last two and a half sectors take 1.75 seconds and have progressively spaced clicks',()=>{
  const p=planSpin(0,2,.5),angles=[];
  for(let t=0;t<=1.75;t+=.25)angles.push(sampleSpin(p,p.fastDuration+t));
  assert.ok(Math.abs((p.end-p.tailStart)/SECTOR_ANGLE-2.55)<1e-8);
  const advances=angles.slice(1).map((a,i)=>a-angles[i]);for(let i=1;i<advances.length;i++)assert.ok(advances[i]<advances[i-1]);
});
test('force changes rotations and initial duration without changing the chosen sector',()=>{
  const light=planSpin(0,9,.08),heavy=planSpin(0,9,1);assert.ok(heavy.end>light.end);assert.ok(heavy.fastDuration>light.fastDuration);
});
test('a new run clears ignition and both helpers',()=>{const a=createRun();kick(a,9);kick(a,0);const b=createRun();assert.deepEqual(b.helpers,[]);assert.equal(b.ignitions,0);assert.equal(b.kicks,0);});
