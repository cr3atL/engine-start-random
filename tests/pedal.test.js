import test from 'node:test';
import assert from 'node:assert/strict';
import {compressionStroke,createPedalMotion,solveKnee} from '../src/pedal.js';
import {IGNITION_STROKE} from '../src/gesture.js';

test('compression remains monotonic but the last part moves less for the same drag distance',()=>{
  let previous=0;
  for(let i=0;i<=100;i++){const value=compressionStroke(i/100);assert.ok(value>=previous);assert.ok(value<=IGNITION_STROKE);previous=value;}
  assert.ok(compressionStroke(.3)-compressionStroke(.2)>compressionStroke(.9)-compressionStroke(.8));
  assert.equal(compressionStroke(1),IGNITION_STROKE);
});
test('letting go returns the starter with a bounded spring and settles at different frame rates',()=>{
  for(const rate of [30,60,120]){
    const motion=createPedalMotion();motion.setTarget(.58);for(let i=0;i<rate;i++)motion.step(1/rate);
    assert.ok(Math.abs(motion.value-.58)<.002);motion.release();
    let wentPastRest=false;
    for(let i=0;i<rate*2;i++){const value=motion.step(1/rate);assert.ok(value>=-.028&&value<=.6);if(value<0)wentPastRest=true;}
    assert.ok(wentPastRest);assert.equal(motion.value,0);assert.equal(motion.mode,'rest');
  }
});
test('kick engages before bottoming out and then rebounds without a discontinuous reset',()=>{
  const motion=createPedalMotion();motion.setTarget(.65);for(let i=0;i<80;i++)motion.step(.01);
  motion.kick(.8);let maximum=0,previous=motion.value;
  for(let i=0;i<160;i++){const value=motion.step(.01);assert.ok(Math.abs(value-previous)<.16);maximum=Math.max(maximum,value);previous=value;}
  assert.ok(maximum>=1);assert.equal(motion.value,0);
});
test('knee articulation keeps thigh and calf lengths fixed throughout the usable poses',()=>{
  const poses=[{hip:{x:-.82,y:3.1,z:-.8},ankle:{x:.78,y:1.6,z:-.8}},{hip:{x:-.82,y:2.72,z:-.8},ankle:{x:.68,y:.75,z:-.8}},{hip:{x:-.82,y:3.1,z:-.8},ankle:{x:.78,y:1.88,z:-.8}}];
  for(const {hip,ankle}of poses){const knee=solveKnee(hip,ankle);assert.ok(Math.abs(Math.hypot(knee.x-hip.x,knee.y-hip.y)-1.43)<1e-9);assert.ok(Math.abs(Math.hypot(knee.x-ankle.x,knee.y-ankle.y)-1.28)<1e-9);}
});
