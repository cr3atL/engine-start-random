import {SceneLoader} from '@babylonjs/core/Loading/sceneLoader.js';
import '@babylonjs/loaders/glTF/2.0/glTFLoader.js';
import {TransformNode} from '@babylonjs/core/Meshes/transformNode.js';
import {Material} from '@babylonjs/core/Materials/material.js';
import {VertexData} from '@babylonjs/core/Meshes/mesh.vertexData.js';
import {Vector3,Quaternion} from '@babylonjs/core/Maths/math.vector.js';
import {assetUrl} from './asset-url.js';
import layout from '../public/assets/models/rx100-layout.json';

const V=(x=0,y=0,z=0)=>new Vector3(x,y,z);

/** Geometry comes exclusively from the Blender GLB. These nodes retain the
 * existing gameplay clock and pedal solver, so loading a model adds no rules. */
export function createBlenderMotorcycle(scene,bike,shadows,materials){
  const node=(name,parent=bike)=>{const n=new TransformNode(name,scene);n.parent=parent;return n;};
  const tank=node('Blender bodywork'),seat=node('saddle motion mount');
  const powertrain=node('helper performance mount');powertrain.position.y=.22;powertrain.scaling.setAll(.64);
  const cylinder=node('Blender cylinder');cylinder.position.set(...layout.cylinder.mount);cylinder.rotation.z=layout.cylinder.angle;
  const piston=node('Blender piston',cylinder);piston.position.set(0,.23,0);
  const crank=node('Blender crank',cylinder);crank.position.set(0,-.075,-.08);
  const rod=node('Blender connecting rod',cylinder);
  const lever=node('Blender kickstarter');lever.position.set(...layout.kick.pivot);
  const boot=node('Blender boot');
  const exhaust=node('Blender exhaust tip');exhaust.position.set(...layout.exhaust.pivot);
  const mirrorPivot=node('Blender mirror');mirrorPivot.position.set(...layout.mirror.pivot);
  const arrivingPiston=node('gold piston being installed',powertrain);arrivingPiston.scaling.setAll(1/.64);arrivingPiston.setEnabled(false);
  const pistonParts=[];let cloth=null,bind=null,positions=null,indices=null,loadError=null,ready=false;
  let clothPose=null;
  function updateTrouser(ankle,knee,hip){
    clothPose=[ankle.clone(),knee.clone(),hip.clone()];
    if(!cloth)return;
    const n0=V(knee.y-ankle.y,ankle.x-knee.x,0).normalize(),n1=V(hip.y-knee.y,knee.x-hip.x,0).normalize();
    for(let i=0;i<bind.length;i+=3){
      const t=Math.max(0,Math.min(2,bind[i+1]/2.2*2)),offset=bind[i],depth=bind[i+2];let center,n;
      if(t<1){center=Vector3.Hermite(ankle,knee.subtract(ankle),knee,hip.subtract(ankle).scale(.5),t);n=n0;}
      else{center=Vector3.Hermite(knee,hip.subtract(ankle).scale(.5),hip,hip.subtract(knee),t-1);n=n1;}
      positions[i]=center.x+n.x*offset;positions[i+1]=center.y+n.y*offset;positions[i+2]=center.z+depth;
    }
    const normals=[];VertexData.ComputeNormals(positions,indices,normals,{useRightHandedSystem:true});
    cloth.updateVerticesData('position',positions);cloth.updateVerticesData('normal',normals);cloth.refreshBoundingInfo();
  }
  const readyPromise=SceneLoader.ImportMeshAsync('',assetUrl('assets/models/'),layout.asset,scene).then(result=>{
    // Blender exports our authoring coordinates directly as glTF Y-up. Babylon's
    // default glTF root reflects X; remove that conversion for the existing game axes.
    const root=result.meshes[0];root.rotationQuaternion=Quaternion.Identity();root.scaling.setAll(1);root.parent=bike;
    const objects=[...result.transformNodes,...result.meshes];
    const find=name=>{name=layout.prefix+'_'+name;const n=objects.find(o=>o.name===name);if(!n)throw new Error(`Missing Blender mount: ${name}`);return n;};
    const transfer=(name,target,skip=[])=>{for(const child of [...find(name).getChildren()])if(!skip.map(n=>layout.prefix+'_'+n).includes(child.name))child.parent=target;};
    transfer('STATIC',bike);transfer('BODY',tank);
    transfer('ENGINE',bike,['CYLINDER']);
    transfer('CYLINDER',cylinder,['PISTON','CRANK','ROD']);
    transfer('PISTON',piston);transfer('CRANK',crank);transfer('ROD',rod);
    transfer('KICK',lever);transfer('BOOT',boot);
    transfer('MIRROR',mirrorPivot);transfer('EXHAUST_TIP',exhaust);
    for(const m of result.meshes){
      m.isPickable=false;m.receiveShadows=true;
      // The removed root reflection also reverses the expected face winding.
      m.sideOrientation=Material.CounterClockWiseSideOrientation;
      if(m.getTotalVertices())shadows.addShadowCaster(m,false);
      const mat=m.material;if(!mat)continue;
      if(mat.name.includes('sand cast'))mat.bumpTexture=materials.metal.bumpTexture;
      if(mat.name.includes('leather')){mat.albedoTexture=materials.leather.albedoTexture;mat.albedoColor.set(1,.84,.65);mat.bumpTexture=materials.leather.bumpTexture;}
      if(mat.name.includes('cotton')){mat.albedoTexture=materials.denim.albedoTexture;mat.albedoColor.set(.26,.32,.38);}
    }
    pistonParts.push(...piston.getChildMeshes());
    for(const original of pistonParts){const copy=original.clone('gift / '+original.name,arrivingPiston);copy.material=original.material.name.includes('turned')?materials.brass:materials.dark;shadows.addShadowCaster(copy,false);}
    cloth=find('TROUSER_MESH');cloth.parent=bike;cloth.bakeCurrentTransformIntoVertices();
    cloth.makeGeometryUnique();bind=Float32Array.from(cloth.getVerticesData('position'));positions=Float32Array.from(bind);indices=cloth.getIndices();
    cloth.markVerticesDataAsUpdatable('position',true);cloth.markVerticesDataAsUpdatable('normal',true);
    // Babylon materials used by the existing result animation remain local to the piston.
    pistonParts.forEach(m=>{m.metadata={originalMaterial:m.material};});
    if(clothPose)updateTrouser(...clothPose);
    ready=true;return result;
  }).catch(error=>{loadError=error;throw error;});
  return {tank,seat,powertrain,cylinder,piston,crank,rod,lever,boot,exhaust,mirrorPivot,arrivingPiston,pistonParts,
    staticRoots:[],updateTrouser,layout,
    ready:()=>readyPromise,
    setGold(enabled){pistonParts.forEach(m=>m.material=enabled&&m.metadata.originalMaterial.name.includes('turned')?materials.brass:m.metadata.originalMaterial);},
    getStats:()=>({asset:'Yamaha RX100 / Blender',ready,error:loadError?.message,clothVertices:bind?.length/3||0}),
  };
}
