import test from 'node:test';
import assert from 'node:assert/strict';
import {NullEngine} from '@babylonjs/core/Engines/nullEngine.js';
import {Scene} from '@babylonjs/core/scene.js';
import {createModeling} from '../src/modeling.js';

test('formed body panels face outward regardless of the supplied outline order',()=>{
  const engine=new NullEngine(),scene=new Scene(engine);
  const {plate}=createModeling(scene,(m,pos)=>{m.position.set(...pos);return m;});
  const points=[[-.6,.2],[-.3,.4],[.4,.2],[.5,-.2],[-.3,-.3]];
  for(const outline of [points,points.slice().reverse()]){
    const m=plate('cover',[0,0,0],outline,.2,.02,null,null),p=m.getVerticesData('position'),n=m.getVerticesData('normal');
    assert.ok(n.every(Number.isFinite));
    const front=[];for(let i=0;i<p.length;i+=3)if(Math.abs(p[i])<.001&&Math.abs(p[i+1])<.001&&p[i+2]<-.09)front.push(n[i+2]);
    assert.ok(front.length>0);assert.ok(front.every(v=>v<-.9));
  }
  scene.dispose();engine.dispose();
});

test('lasted meshes have outward side normals and closed end caps',()=>{
  const engine=new NullEngine(),scene=new Scene(engine);
  const {loft}=createModeling(scene,(m,pos)=>{m.position.set(...pos);return m;});
  const m=loft('last',[[-1,.2,.2,-.2],[0,.3,.25,-.2],[1,.2,.2,-.2]],null,null),p=m.getVerticesData('position'),n=m.getVerticesData('normal');
  assert.ok(n.every(Number.isFinite));
  const front=[];for(let i=0;i<p.length;i+=3)if(Math.abs(p[i])<.25&&p[i+2]<-.27)front.push(n[i+2]);
  assert.ok(front.length>0);assert.ok(front.every(v=>v<-.8));
  const firstCenter=p.findIndex((v,i)=>i%3===0&&v===-1&&Math.abs(p[i+1])<.001&&Math.abs(p[i+2])<.001);
  assert.ok(firstCenter>=0);assert.ok(n[firstCenter]<-.99);
  scene.dispose();engine.dispose();
});

test('curved Cub backbone and thin mudguard shells keep finite outward normals',()=>{
  const engine=new NullEngine(),scene=new Scene(engine);
  const {sweep,ribbon,smoothOutline}=createModeling(scene,m=>m);
  const beam=sweep('step through',[[-.3,1.7,.20,.23],[-.12,1.45,.17,.20],[.08,1.42,.15,.19],[.72,2.12,.19,.21]],null,null);
  assert.ok(beam.getVerticesData('position').every(Number.isFinite));
  assert.ok(beam.getVerticesData('normal').every(Number.isFinite));
  const rows=[-.14,0,.14].map(z=>[50,70,90,110,130].map(a=>[Math.cos(a*Math.PI/180),Math.sin(a*Math.PI/180),z]));
  const guard=ribbon('guard',rows,null,null),p=guard.getVerticesData('position'),n=guard.getVerticesData('normal');
  let outside=false,inside=false;
  for(let i=0;i<p.length;i+=3)if(p[i+1]>.99){outside||=n[i+1]>.95;inside||=n[i+1]<-.95;}
  assert.ok(outside&&inside);
  const outline=smoothOutline([[-.6,.2],[-.3,.4],[.4,.2],[.5,-.2],[-.3,-.3]]);
  assert.ok(outline.flat().every(Number.isFinite));assert.ok(outline.length>20);
  scene.dispose();engine.dispose();
});
