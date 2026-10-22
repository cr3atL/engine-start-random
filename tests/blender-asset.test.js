import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';

const layout=JSON.parse(fs.readFileSync(new URL('../public/assets/models/rx100-layout.json',import.meta.url)));
const bytes=fs.readFileSync(new URL('../public/assets/models/'+layout.asset,import.meta.url));
const gltf=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
const audit=JSON.parse(fs.readFileSync(new URL('../assets/blender/rx100-audit.json',import.meta.url)));

test('the shipped GLB is the exact model checked for mechanical intersections in Blender',()=>{
  assert.equal(bytes.toString('ascii',0,4),'glTF');assert.equal(bytes.readUInt32LE(4),2);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),audit.glb_sha256);
  assert.equal(audit.independent_kick,true);assert.equal(audit.header_tyre_intersections,0);
  assert.ok(audit.cylinder_case_surface_gap<.001);assert.ok(audit.header_port_surface_gap<.001);
  assert.ok(audit.header_muffler_surface_gap<.02);assert.equal(audit.passed,true);
  assert.ok(audit.piston_crown_to_head_clearance>0);
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
    assert.ok(primitive.attributes.NORMAL!==undefined);assert.ok(primitive.attributes.TEXCOORD_0!==undefined,mesh.name+' missing UV');
    triangles+=gltf.accessors[primitive.indices].count/3;
  }
  assert.ok(triangles<100000,`triangle budget: ${triangles}`);
});
