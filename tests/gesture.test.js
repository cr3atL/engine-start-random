import test from 'node:test';
import assert from 'node:assert/strict';
import {measureKick,MIN_KICK_DISTANCE} from '../src/gesture.js';

test('same travel produces more force when dragged faster',()=>{
  const fast=measureKick([{y:100,t:0},{y:140,t:30},{y:200,t:60}]);
  const slow=measureKick([{y:100,t:0},{y:140,t:300},{y:200,t:900}]);
  assert.ok(fast.valid&&slow.valid);assert.ok(fast.power>slow.power*4);
});
test('a tap, short jitter, and upward swipe do not consume a kick',()=>{
  for(const end of [100,110,50])assert.equal(measureKick([{y:100,t:0},{y:end,t:100}]).valid,false);
});
test('holding before the stroke does not weaken a later fast movement',()=>{
  const held=measureKick([{y:100,t:0},{y:100,t:2000},{y:150,t:2030},{y:200,t:2060}]);
  assert.equal(held.power,1);
});
test('a pause at the bottom does not erase the force of a completed stroke',()=>{
  const paused=measureKick([{y:0,t:0},{y:50,t:30},{y:100,t:60},{y:100,t:1000}]);
  assert.equal(paused.power,1);
});
test('force stays finite when pointer timestamps coincide',()=>{
  const result=measureKick([{y:0,t:0},{y:100,t:0}]);assert.equal(result.power,1);assert.ok(Number.isFinite(result.speed));
});
test('a stroke must cross the ignition position, not merely move a few pixels',()=>{
  assert.equal(measureKick([{y:0,t:0},{y:MIN_KICK_DISTANCE-1,t:80}]).valid,false);
  assert.equal(measureKick([{y:0,t:0},{y:MIN_KICK_DISTANCE,t:80}]).valid,true);
});
