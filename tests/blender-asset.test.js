import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';

const bytes=fs.readFileSync(new URL('../public/assets/models/cc110-rebuilt.glb',import.meta.url));
const gltf=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
const audit=JSON.parse(fs.readFileSync(new URL('../assets/blender/assembly-audit.json',import.meta.url)));

test('the shipped GLB is the exact model checked for mechanical intersections in Blender',()=>{
  assert.equal(bytes.toString('ascii',0,4),'glTF');assert.equal(bytes.readUInt32LE(4),2);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),audit.glb_sha256);
  assert.equal(audit.barrel_case_surface_intersections,0);
  assert.equal(audit.header_case_surface_intersections,0);assert.equal(audit.header_tyre_surface_intersections,0);
  assert.ok(audit.header_muffler_mating_intersections>0);assert.equal(audit.passed,true);
  assert.equal(audit.header_port_endpoint_gap,0);assert.equal(audit.header_muffler_endpoint_gap,0);
  assert.ok(audit.piston_crown_to_head_clearance>0);
  assert.ok(audit.poses.length>=7);
  for(const pose of audit.poses){assert.equal(pose.shoe_environment_intersections,0);assert.equal(pose.leg_environment_intersections,0);}
});

test('Blender exchange preserves animation mounts, bind shape and texture coordinates',()=>{
  for(const name of ['CC110_CYLINDER','CC110_PISTON','CC110_CRANK','CC110_ROD','CC110_KICK','CC110_BOOT','CC110_LEG','CC110_MIRROR','CC110_EXHAUST_TIP'])assert.ok(gltf.nodes.some(n=>n.name===name),name);
  const cylinder=gltf.nodes.find(n=>n.name==='CC110_CYLINDER');assert.ok(Math.abs(cylinder.translation[0]-.29)<1e-5);assert.ok(Math.abs(cylinder.translation[1]-.92)<1e-5);
  const boot=gltf.nodes.find(n=>n.name==='CC110_BOOT');assert.ok(!boot.translation||boot.translation.every(v=>Math.abs(v)<1e-5));
  const clothNode=gltf.nodes.find(n=>n.name==='CC110_TROUSER_MESH'),cloth=gltf.meshes[clothNode.mesh].primitives[0];
  const bounds=gltf.accessors[cloth.attributes.POSITION];assert.ok(Math.abs(bounds.max[1]-2.2)<1e-5);assert.ok(Math.abs(bounds.min[1])<1e-5);
  let triangles=0;
  for(const mesh of gltf.meshes)for(const primitive of mesh.primitives){
    assert.ok(primitive.attributes.NORMAL!==undefined);assert.ok(primitive.attributes.TEXCOORD_0!==undefined,mesh.name+' missing UV');
    triangles+=gltf.accessors[primitive.indices].count/3;
  }
  assert.ok(triangles<220000,`triangle budget: ${triangles}`);
});
