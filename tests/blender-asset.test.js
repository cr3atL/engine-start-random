import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {enginePose} from '../src/engine-pose.js';

const layout=JSON.parse(fs.readFileSync(new URL('../public/assets/models/rx100-layout.json',import.meta.url)));
const bytes=fs.readFileSync(new URL('../public/assets/models/'+layout.asset,import.meta.url));
const gltf=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
const audit=JSON.parse(fs.readFileSync(new URL('../assets/blender/rx100-audit.json',import.meta.url)));

test('the shipped GLB is the exact model checked for mechanical intersections in Blender',()=>{
  assert.equal(bytes.toString('ascii',0,4),'glTF');assert.equal(bytes.readUInt32LE(4),2);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),audit.glb_sha256);
  assert.equal(audit.independent_kick,true);assert.equal(audit.header_tyre_intersections,0);
  // Below 0.8 mm in the authored scale; surface sampling changes at the bore cut.
  assert.ok(audit.cylinder_case_surface_gap<.002);assert.ok(audit.header_port_surface_gap<.001);
  assert.ok(audit.header_muffler_surface_gap<.02);assert.equal(audit.passed,true);
  assert.ok(audit.piston_crown_to_head_clearance>0);
  assert.ok(audit.opaque_cylinder_fraction>.75);assert.equal(audit.engine_passed,true);
  assert.ok(audit.engine_poses.length>=34);
  assert.ok(audit.axis_alignment_error<1e-5);
  for(const pose of audit.engine_poses){assert.ok(pose.big_pin_error<1e-5);assert.ok(pose.small_pin_error<1e-5);assert.ok(pose.rod_length_error<1e-5);assert.equal(pose.piston_casting_intersections,0);assert.equal(pose.rod_case_intersections,0);assert.equal(pose.crank_case_intersections,0);}
  assert.ok(audit.poses.length>=7);
  for(const pose of audit.poses){assert.equal(pose.shoe_environment_intersections,0);assert.equal(pose.leg_environment_intersections,0);assert.equal(pose.kick_environment_intersections,0);assert.ok(pose.sole_to_pedal_error<1e-5);}
});

test('Blender exchange preserves animation mounts, bind shape and texture coordinates',()=>{
  for(const name of ['CYLINDER','PISTON','CRANK','ROD','KICK','BOOT','LEG','MIRROR','EXHAUST_TIP'])assert.ok(gltf.nodes.some(n=>n.name===layout.prefix+'_'+name),name);
  const cylinder=gltf.nodes.find(n=>n.name==='RX100_CYLINDER');for(let i=0;i<3;i++)assert.ok(Math.abs(cylinder.translation[i]-layout.cylinder.mount[i])<1e-5);
  const boot=gltf.nodes.find(n=>n.name==='RX100_BOOT');assert.ok(!boot.translation||boot.translation.every(v=>Math.abs(v)<1e-5));
  assert.equal(gltf.nodes.find(n=>n.name==='RX100_KICK').children.length,3);
  assert.ok(!gltf.nodes.some(n=>n.name.startsWith('inspection /')||n.name==='Cube'));
  const shell=gltf.materials.find(m=>m.name.includes('inspection transparency'));
  assert.equal(shell.alphaMode,'BLEND');assert.ok(shell.pbrMetallicRoughness.baseColorFactor[3]<.3);
  assert.ok(!gltf.nodes.some(n=>n.name.includes('bore sleeve')),'no second cylinder over the source engine');
  const clothNode=gltf.nodes.find(n=>n.name==='RX100_TROUSER_MESH'),cloth=gltf.meshes[clothNode.mesh].primitives[0];
  const bounds=gltf.accessors[cloth.attributes.POSITION];assert.ok(Math.abs(bounds.max[1]-2.2)<1e-5);assert.ok(Math.abs(bounds.min[1])<1e-5);
  let triangles=0;
  for(const mesh of gltf.meshes)for(const primitive of mesh.primitives){
    assert.ok(primitive.material!==undefined,mesh.name+' lost its material slot');
    assert.ok(primitive.attributes.NORMAL!==undefined);assert.ok(primitive.attributes.TEXCOORD_0!==undefined,mesh.name+' missing UV');
    triangles+=gltf.accessors[primitive.indices].count/3;
  }
  assert.ok(triangles<100000,`triangle budget: ${triangles}`);
});

test('the engine stays on its measured bore axis with both rod pins connected through a full revolution',()=>{
  const rig=layout.mechanism,[cx,cy,cz]=rig.crank_center;
  assert.ok(layout.cylinder.angle<0); // Native fins lean toward the front wheel.
  for(let i=0;i<=360;i++){
    const p=enginePose(i*Math.PI/180,rig),[x,y,z]=p.crankPin;
    assert.ok(Math.abs(Math.hypot(x-cx,y-cy,z-cz)-rig.throw)<1e-10);
    assert.ok(Math.abs(Math.hypot(p.wrist[0]-x,p.wrist[1]-y,p.wrist[2]-z)-rig.rod_length)<1e-10);
    assert.equal(p.wrist[0],0);assert.equal(p.wrist[2],0);
    assert.ok(Math.abs(x-Math.sin(p.rodAngle)*rig.rod_length)<1e-10);
    assert.ok(Math.abs(p.wrist[1]-y-Math.cos(p.rodAngle)*rig.rod_length)<1e-10);
    assert.ok(p.pistonY+.056<rig.head_height);assert.ok(p.pistonY-.060>0);
  }
});
