import { Engine } from '@babylonjs/core/Engines/engine.js';
import { Scene } from '@babylonjs/core/scene.js';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color.js';
import { Vector3, Quaternion, Matrix } from '@babylonjs/core/Maths/math.vector.js';
import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData.js';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture.js';
import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera.js';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight.js';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight.js';
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator.js';
import '@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent.js';
import { paintWheel, paintStopFeedback } from './lottery.js';
import {stopEnvelope} from './feedback.js';
import { createWorkshopMaterials } from './materials.js';
import { createPedalMotion, solveKnee } from './pedal.js';
import { createModeling } from './modeling.js';
import { firstIgnition, pistonRepair } from './performance.js';
import { createBlenderMotorcycle } from './blender-motorcycle.js';

const V=(x=0,y=0,z=0)=>new Vector3(x,y,z),clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const smooth=t=>{t=clamp(t);return t*t*(3-2*t);};
const TAU=Math.PI*2;
export function createWorld(canvas) {
  const engine=new Engine(canvas,true,{stencil:true,powerPreference:'high-performance'}),scene=new Scene(engine);
  scene.clearColor=Color4.FromHexString('#555552ff');scene.ambientColor=Color3.Black();
  scene.imageProcessingConfiguration.toneMappingEnabled=true;scene.imageProcessingConfiguration.exposure=1.05;scene.imageProcessingConfiguration.contrast=1.04;
  const mainCamera=new FreeCamera('shoe, kick starter and engine',V(.26,1.48,-5.0),scene);
  mainCamera.setTarget(V(.23,1.35,0));mainCamera.minZ=.05;mainCamera.maxZ=35;mainCamera.fov=.65;
  const internalCamera=new FreeCamera('inside the crankcase',V(0,0,-5.2),scene);internalCamera.setTarget(V(0,0,0));internalCamera.minZ=.05;internalCamera.maxZ=20;
  scene.activeCamera=mainCamera;
  const sky=new HemisphericLight('yard fill',V(0,1,-.3),scene);sky.intensity=.65;sky.groundColor=Color3.FromHexString('#7b7975');
  const sun=new DirectionalLight('warm sidelight',V(.6,-1,.6),scene);sun.position.set(-4,6,-5);sun.intensity=1.45;sun.diffuse=Color3.FromHexString('#fff0d8');
  const rim=new DirectionalLight('cold metal reflection',V(-1,-.2,.35),scene);rim.intensity=.32;rim.diffuse=Color3.FromHexString('#a6c5cf');
  const shadows=new ShadowGenerator(innerWidth<650?1024:2048,sun);shadows.useContactHardeningShadow=true;shadows.contactHardeningLightSizeUVRatio=.04;shadows.filteringQuality=ShadowGenerator.QUALITY_MEDIUM;shadows.bias=.00035;shadows.normalBias=.008;shadows.darkness=.28;
  const side=new TransformNode('side close-up',scene),interior=new TransformNode('engine interior',scene);interior.setEnabled(false);
  const bike=new TransformNode('motorcycle',scene);bike.parent=side;
  let serial=0,seed=789,modelParent=bike;
  const rnd=()=>{seed=seed*16807%2147483647;return(seed-1)/2147483646;};
  const {surface,metal,machined,edge,dark,oil,rust,black,red,leather,sole,denim,seam,brass,skin,cloth,white,eye,lampOff,lampOn,cast,cubPaint,frame,plastic,tire,seatMaterial,lens,amber,tail,wheelMaterial,lace,cuffMaterial}=createWorkshopMaterials(scene);
  function attach(m,pos,mat,parent=modelParent,casts=true){m.parent=parent;m.position.copyFromFloats(...pos);m.material=mat;m.isPickable=false;m.receiveShadows=true;if(casts)shadows.addShadowCaster(m,false);return m;}
  function box(name,pos,size,mat,parent=modelParent,rot=null,casts=true){const m=MeshBuilder.CreateBox(name+serial++,{width:size[0],height:size[1],depth:size[2]},scene);if(rot)m.rotation.copyFromFloats(...rot);return attach(m,pos,mat,parent,casts);}
  function ball(name,pos,size,mat,parent=modelParent){const m=MeshBuilder.CreateSphere(name+serial++,{diameter:1,segments:16},scene);m.scaling.copyFromFloats(...size);return attach(m,pos,mat,parent);}
  function cyl(name,pos,d,h,mat,parent=modelParent,rot=null,tess=24){const m=MeshBuilder.CreateCylinder(name+serial++,{diameter:d,height:h,tessellation:tess},scene);if(rot)m.rotation.copyFromFloats(...rot);return attach(m,pos,mat,parent);}
  const disc=(name,pos,d,h,mat,parent=modelParent,tess=32)=>cyl(name,pos,d,h,mat,parent,[Math.PI/2,0,0],tess);
  function torus(name,pos,d,t,mat,parent=modelParent){const m=MeshBuilder.CreateTorus(name+serial++,{diameter:d,thickness:t,tessellation:48},scene);m.rotation.x=Math.PI/2;return attach(m,pos,mat,parent);}
  function link(name,a,b,d,mat,parent=modelParent){const m=cyl(name,[0,0,0],d,1,mat,parent,null,12);setLink(m,Vector3.FromArray(a),Vector3.FromArray(b));return m;}
  function setLink(mesh,a,b){const dir=b.subtract(a);mesh.position.copyFrom(a.add(b).scale(.5));mesh.scaling.y=dir.length();mesh.rotationQuaternion=Quaternion.FromUnitVectorsToRef(Vector3.Up(),dir.normalize(),new Quaternion());}
  function node(name,parent=modelParent){const n=new TransformNode(name,scene);n.parent=parent;return n;}
  const {loft,plate,rounded,tube,outline,lathe,ribbon,sweep,smoothOutline}=createModeling(scene,attach);
  function bolt(x,y,z,parent=modelParent,scale=1){disc('washer',[x,y,z],.105*scale,.02*scale,dark,parent,24);const m=disc('hex bolt',[x,y,z-.026*scale],.078*scale,.045*scale,edge,parent,6);m.rotation.y=.1;return m;}
  function label(text,pos,width,height,parent=modelParent){const tex=new DynamicTexture('stamped '+text,{width:512,height:128},scene,false),ctx=tex.getContext();ctx.clearRect(0,0,512,128);ctx.fillStyle='#c2bda780';ctx.font='600 65px monospace';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,64);tex.hasAlpha=true;tex.update();const mat=surface(text,'#ffffff',.1,12);mat.diffuseTexture=tex;mat.useAlphaFromDiffuseTexture=true;const m=MeshBuilder.CreatePlane(text,{width,height,sideOrientation:Mesh.DOUBLESIDE},scene);return attach(m,pos,mat,parent,false);}
  // The yard is a quiet backdrop. It never becomes a separate gameplay subject.
  const concrete=surface('old concrete','#85847e',.05,8,cast),plaster=surface('yard wall','#8a8983',.06,8,cast);
  box('concrete ground',[0,-.1,2],[30,.2,24],concrete,side,null,false);
  box('blurred courtyard wall',[0,6,3.8],[25,12,.2],plaster,side,null,false);
  box('wall skirting',[0,.35,3.63],[25,.65,.12],dark,side,null,false);
  for(let i=0;i<6;i++)box('wall joint',[-8+i*3.2,2.5,3.66],[.03,5,.025],dark,side,null,false);
  // All motorcycle, engine, lever, boot and trouser geometry is authored in Blender.
  const model=createBlenderMotorcycle(scene,bike,shadows,{metal,leather,denim,brass,dark});
  const {tank,seat,staticRoots,powertrain,cylinder,piston,pistonParts,crank,rod,lever,boot,exhaust,mirrorPivot,arrivingPiston,updateTrouser,layout}=model;
  modelParent=powertrain;
  const lights=[];
  // Small mechanic lives in an opening next to the crankcase, not on the rider.
  const mechanic=node('factory mechanic');mechanic.position.set(...layout.mechanic.home);mechanic.setEnabled(false);
  const hatch=node('mechanic hatch');hatch.position.set(...layout.mechanic.hatch);
  const hatchPlate=disc('open inspection hatch',[0,0,0],.37,.045,dark,hatch);hatchPlate.rotation.y=-.9;
  const man=node('mechanic body',mechanic);
  rounded('tailored work jacket',[0,.18,0],[.27,.34,.22],.065,cloth,man,.028);
  box('jacket seam',[0,.19,-.125],[.012,.29,.01],seam,man);
  for(const x of [-.075,.075]){rounded('jacket pocket',[x,.20,-.118],[.09,.095,.017],.012,cloth,man,.004);link('pocket stitched edge',[x-.035,.235,-.132],[x+.035,.235,-.132],.003,seam,man);}
  for(let i=0;i<3;i++)disc('jacket button',[.012,.12+i*.075,-.137],.015,.008,dark,man,12);
  const mechanicLegs=[];
  for(const x of [-.07,.07]){
    const upper=link('mechanic upper trouser',[x,.04,.025],[x,-.05,.015],.082,cloth,man);
    const lower=link('mechanic lower trouser',[x,-.05,.015],[x,-.145,.015],.075,cloth,man);
    const shoe=rounded('mechanic work boot',[x+.025,-.17,-.015],[.12,.065,.15],.025,leather,man,.012);
    mechanicLegs.push({upper,lower,shoe});
  }
  const serviceStep=node('folding service step',mechanic);
  rounded('mechanic foothold',[.23,.065,-.06],[.43,.035,.25],.02,dark,serviceStep,.008);
  for(const x of [.045,.39])link('folding step brace',[x,-.08,.03],[x,.05,-.13],.014,edge,serviceStep);
  for(const x of [-.05,.05]){const collar=rounded('jacket collar',[x,.35,-.072],[.07,.065,.018],.01,cloth,man,.004);collar.rotation.z=x<0?-.4:.4;}
  const head=node('mechanic head',man);head.position.set(0,.47,-.02);
  ball('mechanic face',[0,0,0],[.235,.28,.23],skin,head);ball('mechanic nose',[.01,-.015,-.123],[.063,.069,.065],skin,head);
  for(const x of [-.118,.118])ball('ear',[x,-.012,0],[.037,.065,.045],skin,head);
  for(const x of [-.053,.053]){ball('eye white',[x,.035,-.107],[.05,.04,.025],white,head);ball('pupil',[x,.032,-.124],[.02,.027,.014],eye,head);box('eyebrow',[x,.078,-.104],[.065,.015,.017],dark,head);}
  const mouth=box('mechanic mouth',[0,-.077,-.105],[.07,.018,.015],eye,head);
  ball('mechanic cap',[0,.13,.01],[.27,.11,.26],cloth,head);box('cap visor',[0,.108,-.11],[.25,.025,.16],cloth,head);
  const arms=[],palms=[],armLinks=[];
  for(const x of [-.15,.15]){
    const a=node('mechanic arm',man);a.position.set(x,.30,0);
    const upper=link('sleeve',[0,0,0],[x*.15,-.14,-.06],.083,cloth,a),lower=link('forearm',[x*.15,-.14,-.06],[x*.1,-.22,-.12],.06,skin,a);
    const palm=node('open hand',a);palm.position.set(x*.1,-.24,-.13);ball('palm',[0,0,0],[.075,.075,.027],skin,palm);
    for(let i=0;i<4;i++)link('finger',[-.027+i*.018,-.025,0],[-.029+i*.019,-.075+Math.abs(i-1.5)*.009,0],.014,skin,palm);
    link('thumb',[.029,0,0],[.057,-.024,0],.018,skin,palm);arms.push(a);palms.push(palm);armLinks.push({upper,lower});
  }
  const handwheel=node('hand crank',mechanic);handwheel.position.set(.13,.07,-.12);
  torus('manual starter',[0,0,0],.15,.022,edge,handwheel);link('crank arm',[0,0,0],[.075,0,-.02],.023,metal,handwheel);disc('crank handle',[.075,0,-.04],.04,.07,leather,handwheel);
  const oilcan=node('oil can',mechanic);oilcan.position.set(.18,.1,-.16);oilcan.setEnabled(false);box('oil can body',[0,0,0],[.1,.1,.075],red,oilcan);link('oil spout',[.04,.03,0],[.17,.11,0],.016,brass,oilcan);
  modelParent=bike;
  // A near-full-frame steel chamber houses the mechanical prize rotor.
  box('engine interior back',[0,0,.55],[16,16,.3],dark,interior,null,false);
  const chamber=disc('flywheel well',[0,0,.29],4.45,.35,oil,interior,80);
  torus('well outer casing',[0,0,.04],4.1,.19,metal,interior);
  torus('well dark seal',[0,0,-.04],3.88,.07,black,interior);
  torus('polished rotor rim',[0,0,-.10],3.69,.11,edge,interior);
  for(let i=0;i<8;i++){const a=i*TAU/8;const x=Math.sin(a)*2.25,y=Math.cos(a)*2.25;ball('casting bolt lug',[x,y,.22],[.46,.57,.33],dark,interior);bolt(x,y,-.02,interior,1.7);}
  for(let i=0;i<6;i++){const x=-2.9+i*.16;box('case cooling rib',[x,.15,.18],[.07,6,.2],metal,interior,[0,0,-.11],false);}
  for(let i=0;i<4;i++)link('cast metal web',[-3,-2+i*.33,.22],[3,-2+i*.33,.22],.055,dark,interior);
  const rotor=node('mechanical roulette',interior);
  const wheelTexture=new DynamicTexture('painted rotor',{width:1024,height:1024},scene,false);paintWheel(wheelTexture.getContext());wheelTexture.hasAlpha=true;wheelTexture.update();
  const rotorMat=surface('old enamel on machined steel','#ffffff',.26,65);rotorMat.diffuseTexture=wheelTexture;rotorMat.useAlphaFromDiffuseTexture=true;
  const face=MeshBuilder.CreatePlane('enamel sectors',{width:3.6,height:3.6,sideOrientation:Mesh.DOUBLESIDE},scene);attach(face,[0,0,-.135],rotorMat,rotor,false);
  const stopTexture=new DynamicTexture('selected enamel reflection',{width:1024,height:1024},scene,false);stopTexture.hasAlpha=true;stopTexture.getContext().clearRect(0,0,1024,1024);stopTexture.update();
  const stopMat=surface('stop reflection','#ffffff',0,1);stopMat.diffuseTexture=stopTexture;stopMat.useAlphaFromDiffuseTexture=true;stopMat.disableLighting=true;stopMat.emissiveColor=Color3.White();stopMat.alpha=0;
  const stopFace=face.clone('selected sector light',rotor);stopFace.position.z=-.143;stopFace.material=stopMat;stopFace.setEnabled(false);
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
  disc('bearing housing',[0,0,-.19],1.06,.17,dark,rotor,48);torus('bearing bevel',[0,0,-.30],.92,.085,metal,rotor);
  disc('hub face',[0,0,-.31],.71,.12,metal,rotor,32);disc('hex spindle nut',[0,0,-.42],.30,.14,dark,rotor,6);disc('nut face',[0,0,-.50],.13,.025,oil,rotor,12);
  for(let i=0;i<3;i++){const a=i*TAU/3;bolt(Math.cos(a)*.27,Math.sin(a)*.27,-.37,rotor,.62);}
  const pointer=node('fixed metal pointer',interior);
  const pm=new Mesh('tapered metal index',scene),vd=new VertexData();vd.positions=[-.14,1.99,-.30,.14,1.99,-.30,0,1.57,-.40];vd.indices=[0,2,1];vd.normals=[0,0,-1,0,0,-1,0,0,-1];vd.applyToMesh(pm);attach(pm,[0,0,0],edge,pointer,false);pm.material.backFaceCulling=false;
  link('pointer ridge',[0,1.96,-.32],[0,1.65,-.395],.027,dark,pointer);bolt(0,2.03,-.32,pointer,1.5);
  const gleam=surface('contact glint','#e8c582',.5,90);gleam.emissiveColor=Color3.FromHexString('#d8ba79').scale(.8);
  const contact=ball('index contact',[0,1.6,-.43],[.065,.065,.035],gleam,interior);contact.setEnabled(false);
  // Reused smoke, spark, and gold dust meshes keep mobile allocations bounded.
  const smokeMat=surface('smoke','#9f9f8c',0,1);smokeMat.alpha=.42;
  const sparkMat=surface('ignition arc','#d4f8fb',.4,30);sparkMat.emissiveColor=Color3.FromHexString('#72b8e9');
  const pools=[];for(let i=0;i<22;i++){const m=ball('smoke puff',[0,-10,0],[1,1,1],smokeMat,side);m.setEnabled(false);pools.push({m,life:0,max:1,v:V()});}
  let pi=0;
  function smoke(x,y,z,burst=false){const p=pools[pi++%pools.length];p.life=p.max=.7+rnd()*.7;p.m.setEnabled(true);p.m.position.set(x,y,z);p.v.set(-.25-rnd()*.25,.3+rnd()*.3,(rnd()-.5)*.15);p.m.scaling.setAll(burst?.18:.1);}
  const electric=[];for(let i=0;i<3;i++){const m=link('blue ignition spark',[-.14+i*.012,.49,-.045],[-.11+i*.012,.53,-.045],.005,sparkMat,cylinder);m.setEnabled(false);electric.push(m);}
  const pedalMotion=createPedalMotion();
  let clock=0,inputStroke=0,kickAge=99,kickPower=0,enginePhase=0,angle=0,shot='side',reaction=null,reactionTime=0,helpers=new Set(),ignitions=0,running=false,smokeAge=0,hitAge=99,stopAge=99,hitWeight=1;
  const pedalTip=V(...layout.kick.tip);
  let homePos=V(),homeAim=V(),homeFov=.65,portrait=false;
  function resize(){
    const w=canvas.clientWidth,h=canvas.clientHeight,aspect=w/h;
    engine.setHardwareScalingLevel(1/Math.min(devicePixelRatio||1,w<650?1.5:1.8));engine.resize();
    portrait=aspect<.85;mainCamera.fov=portrait?.91:.56;
    mainCamera.position.set(portrait?.46:.75,portrait?1.70:1.95,portrait?-4.3:-4.8);
    homeAim.set(portrait?.08:-.10,portrait?1.20:1.08,0);mainCamera.setTarget(homeAim);
    homePos.copyFrom(mainCamera.position);homeFov=mainCamera.fov;
    // Match rotor width to the portrait frame and its height to a landscape frame.
    internalCamera.fov=2*Math.atan(Math.max(2.0,1.96/aspect)/5.2);
  }
  resize();window.addEventListener('resize',resize);
  function setShot(value){shot=value;side.setEnabled(value==='side');interior.setEnabled(value==='interior');scene.activeCamera=value==='side'?mainCamera:internalCamera;}
  function update(dt,render=true){
    clock+=dt;kickAge+=dt;hitAge+=dt;stopAge+=dt;if(reaction)reactionTime+=dt;
    let stroke=pedalMotion.step(dt);
    if(running)stroke=0;
    lever.rotation.z=-stroke*layout.kick.swing;
    const tip=Vector3.TransformCoordinates(pedalTip,Matrix.RotationZ(lever.rotation.z)).add(lever.position).add(V(0,layout.kick.rubber_radius,0));
    let footLift=0;
    const firstFire=reaction?.kind==='spark'&&!reaction.success?firstIgnition(reactionTime):null;
    if(firstFire)footLift=firstFire.y;
    if(pedalMotion.mode==='return')footLift+=.075*Math.sin(Math.PI*clamp(pedalMotion.age/.62));
    if(running)footLift=.28*smooth(reactionTime/1.2);
    const pitch=-.025-clamp(stroke)*.16+footLift*.12+(firstFire?.pitch||0);
    const shoeRotation=Matrix.RotationZ(pitch);
    const soleContact=Vector3.TransformNormal(V(...layout.boot.contact),shoeRotation);
    const bootPos=tip.subtract(soleContact).add(V(firstFire?.x||0,footLift,-.015));boot.position.copyFrom(bootPos);boot.rotation.z=pitch;
    const ankle=bootPos.add(Vector3.TransformNormal(V(...layout.boot.ankle),shoeRotation));
    const hip=V(layout.rider.hip[0],layout.rider.hip[1]-.18*clamp(stroke),ankle.z+layout.rider.hip_depth),joint=solveKnee(hip,ankle,layout.rider.thigh,layout.rider.shin);
    const kneePos=V(joint.x,joint.y,joint.z);
    updateTrouser(ankle,kneePos,hip);
    let rpm=0,shake=0;
    if(reaction){
      const t=reactionTime;
      if(reaction.kind==='spark'){
        rpm=reaction.success?32:firstFire.rpm;
        shake=(reaction.success?.012:.022)*(rpm/30);
      }else if(reaction.kind==='piston'){
        const repair=pistonRepair(t,[...helpers]);rpm=repair.rpm;
        if(repair.jammed){enginePhase=Math.PI*.5+repair.shove*.035+repair.load*.028;shake=repair.load*.006+repair.shove*.004;}
        else if(t>=repair.release&&t<repair.release+.34)shake=.026;
      }else if(reaction.kind==='blank'){rpm=10*(1-smooth(t/.9));shake=.006;}
      else if(reaction.kind==='gift'){rpm=t>1.0&&t<1.7?8:0;}
      if(reaction.kind==='spark'&&(reaction.success?t<.25:firstFire.spark))electric.forEach(m=>m.setEnabled(Math.sin(t*90)>0));else electric.forEach(m=>m.setEnabled(false));
    }
    if(kickAge<.35)rpm=13;
    if(pedalMotion.mode==='drag'&&!running)enginePhase=Math.max(0,stroke)*TAU*1.2;
    enginePhase+=dt*rpm;crank.rotation.z=enginePhase;
    const pistonY=.23+Math.sin(enginePhase)*.065;piston.position.y=pistonY;
    if(reaction?.helper==='gold'&&reactionTime<1.0){
      const t=smooth(reactionTime/.95);piston.setEnabled(false);arrivingPiston.setEnabled(true);
      const destination=Vector3.TransformCoordinates(Vector3.TransformCoordinates(V(0,.23,0),cylinder.computeWorldMatrix(true)),Matrix.Invert(powertrain.computeWorldMatrix(true)));
      arrivingPiston.position.copyFrom(Vector3.Lerp(V(.48,1.90,-.83),destination,t));arrivingPiston.rotation.z=layout.cylinder.angle;
    }else{piston.setEnabled(true);arrivingPiston.setEnabled(false);}
    setLink(rod,V(Math.cos(enginePhase)*.043,-.075+Math.sin(enginePhase)*.043,-.08),V(0,pistonY-.04,-.08));
    const stomp=kickAge>.16&&kickAge<.3?Math.sin((kickAge-.16)*100)*Math.exp(-(kickAge-.16)*24)*.012*kickPower:0;
    const vibration=Math.sin(clock*(running?71:53))*shake+stomp;
    bike.position.set(vibration*.6,Math.cos(clock*67)*shake*.4,0);
    tank.rotation.z=vibration*.08;
    smokeAge+=dt;
    if(shot==='side'&&smokeAge>(running?.2:.35)&&rpm>1){smokeAge=0;smoke(...layout.exhaust.outlet);}
    for(const p of pools){if(p.life<=0)continue;p.life-=dt;p.m.position.addInPlace(p.v.scale(dt));p.m.scaling.scaleInPlace(1+dt*.65);p.m.visibility=clamp(p.life/p.max);if(p.life<=0)p.m.setEnabled(false);}
    if(helpers.has('mechanic')){
      const t=reactionTime;man.position.set(0,Math.sin(clock*2)*.006,0);man.rotation.setAll(0);
      head.position.set(0,.47,-.02);
      head.rotation.set(0,0,Math.sin(clock*1.8)*.035);
      handwheel.rotation.z-=dt*(rpm>0?10:inputStroke*8);
      mouth.scaling.y=running&&t>2?1:1+Math.abs(Math.sin(clock*18))*(rpm>0?2:0);
      arms[0].rotation.x=rpm>0?Math.sin(clock*10)*.6:0;
      arms[1].rotation.x=rpm>0?Math.cos(clock*10)*.6:0;
      arms.forEach((a,i)=>{a.position.set(i? .15:-.15,.30,0);a.rotation.z=0;palms[i].rotation.setAll(0);
        setLink(armLinks[i].upper,V(),V((i?.15:-.15)*.15,-.14,-.06));
        setLink(armLinks[i].lower,V((i?.15:-.15)*.15,-.14,-.06),V((i?.15:-.15)*.1,-.22,-.12));
        palms[i].position.set((i?.15:-.15)*.1,-.24,-.13);
      });
      mechanicLegs.forEach(({upper,lower,shoe},i)=>{const x=i?.07:-.07;setLink(upper,V(x,.04,.025),V(x,-.05,.015));setLink(lower,V(x,-.05,.015),V(x,-.145,.015));shoe.position.set(x+.025,-.17,-.015);shoe.rotation.z=0;});
      if(reaction?.kind==='spark'&&!reaction.success&&t>.6&&t<1.9){arms[1].rotation.z=-1.7;arms[1].rotation.x=0;}else arms[1].rotation.z=0;
      if(reaction?.helper==='mechanic'){
        mechanic.position.y=layout.mechanic.home[1]-.55*(1-smooth((t-.12)/.7));hatchPlate.rotation.y=-.9*smooth(t/.6);
      }else mechanic.position.y=layout.mechanic.home[1];
      if(running&&t>2.6){arms[1].rotation.x=1.35;arms[1].rotation.z=-.2;palms[1].rotation.x=.22;head.rotation.z=-.07;}
      if(reaction?.kind==='piston'&&t<pistonRepair(t,[...helpers]).duration){
        const repair=pistonRepair(t,[...helpers]);
        man.position.set(repair.x+repair.shoulder*.08,repair.y,0);man.rotation.z=repair.lean;
        head.position.set(-repair.shoulder*.17,.47-repair.shoulder*.10,-.02);
        head.rotation.z=repair.look;
        const turn=smooth(t/.7)*(1-smooth((t-repair.duration+.6)/.6));
        head.rotation.y=-.9*turn;
        const inverse=Matrix.RotationZ(-man.rotation.z);
        for(let i=0;i<2;i++){
          const a=arms[i],shoulder=Vector3.Lerp(V(i?.15:-.15,.30,0),V(i?.105:.035,.30,i?-.075:.055),turn);
          a.position.copyFrom(shoulder);a.rotation.setAll(0);
          const rest=V(i?.025:-.025,-.23,-.13);
          const contactWorld=Vector3.TransformCoordinates(V(.06,.28,-.08),cylinder.computeWorldMatrix(true));
          const handContact=Vector3.TransformCoordinates(contactWorld,Matrix.Invert(mechanic.computeWorldMatrix(true))).add(V(i*.02,-i*.027,-i*.022));
          const target=Vector3.TransformCoordinates(handContact.subtract(man.position),inverse).subtract(shoulder);
          const tucked=V(i?.07:.015,-.06,-.14);
          const hand=Vector3.Lerp(Vector3.Lerp(rest,tucked,repair.shoulder),target,repair.hands);
          const elbow=hand.scale(.51).add(V(-.035,-.055,-.016));
          setLink(armLinks[i].upper,V(),elbow);setLink(armLinks[i].lower,elbow,hand);
          palms[i].position.copyFrom(hand);palms[i].rotation.z=repair.hands*Math.PI/2-repair.shoulder*.45;
        }
        mechanicLegs.forEach(({upper,lower,shoe},i)=>{
          const s=t/repair.speed,up=smooth((s-(i?.50:.30))/.35),down=1-smooth((s-3.60)/.65),step=up*down;
          const foot=Vector3.Lerp(V(i?.095:-.045,-.17,-.015),V(i?.28:.12,.08,-.075),step);
          foot.y+=Math.sin(step*Math.PI)*.045;
          const localFoot=Vector3.TransformCoordinates(foot.subtract(man.position),inverse);
          const hip=V(i?.07:-.07,.04,.025),joint=hip.add(localFoot).scale(.5).add(V(-.035,0,0));
          setLink(upper,hip,joint);setLink(lower,joint,localFoot.add(V(-.015,.025,0)));shoe.position.copyFrom(localFoot);shoe.rotation.z=-repair.lean;
        });
        mouth.scaling.x=1+repair.load*.4;mouth.scaling.y=1+repair.load*1.5;
        handwheel.setEnabled(false);
      }else handwheel.setEnabled(true);
      if(oilcan.isEnabled())oilcan.rotation.z=Math.sin(clock*2)*.07;
    }
    if(running&&helpers.has('gold')){
      const expand=smooth((reactionTime-2.4)/1.2),s=.53+expand*.9;
      exhaust.scaling.y=exhaust.scaling.z=s/.53;
      exhaust.rotation.z=Math.sin(clock*25)*.01*expand;
    }
    const gagPan=running&&helpers.has('gold')?smooth((reactionTime-2.1)/1.0):0;
    mainCamera.position.copyFrom(homePos.add(V(-.68*gagPan,0,0)));
    mainCamera.setTarget(homeAim.add(V(-.68*gagPan,-.25*gagPan,0)));
    mainCamera.fov=homeFov+(portrait?.11:0)*gagPan;
    // An ordinary successful engine slowly shakes its mirror out of alignment.
    if(running&&!helpers.size&&reactionTime>2.3)mirrorPivot.rotation.z=smooth((reactionTime-2.3)/2)*1.2;
    rotor.rotation.z=-angle;
    const feedback=stopEnvelope(stopAge,reducedMotion.matches);
    pointer.rotation.z=(hitAge<.10?Math.sin(hitAge*32)*.018*hitWeight:0)+feedback.shake*.032;
    contact.setEnabled(hitAge<.045||stopAge<.065);
    stopMat.alpha=feedback.glow*.72;stopFace.setEnabled(stopAge<.52);
    if(render)scene.render();
  }
  // Detail stays in the geometry, but static hardware shares draw calls on phones.
  // Convert the merged world-space vertices back into their animated parent's space.
  const moving=new Set([...lights,...electric]);
  for(const parent of [bike,powertrain,boot,cylinder,tank,seat,...staticRoots]){
    const batches=new Map();
    for(const m of scene.meshes.filter(m=>m.parent===parent&&!moving.has(m))){
      const group=batches.get(m.material)||[];group.push(m);batches.set(m.material,group);
    }
    for(const meshes of batches.values()){
      if(meshes.length<2)continue;
      const inverse=Matrix.Invert(parent.computeWorldMatrix(true));
      meshes.forEach(m=>shadows.removeShadowCaster(m));
      const merged=Mesh.MergeMeshes(meshes,true,true);
      if(merged){merged.name=parent.name+' / batched '+merged.material.name;merged.bakeTransformIntoVertices(inverse);merged.parent=parent;merged.receiveShadows=true;merged.isPickable=false;shadows.addShadowCaster(merged,false);}
    }
  }
  function react(result,run){
    reaction=result;reactionTime=0;running=result.success;ignitions=run.ignitions;helpers=new Set(run.helpers);
    if(!running)pedalMotion.returnFromBottom();
    lights.forEach((l,i)=>l.material=i<ignitions?lampOn:lampOff);
    model.setGold(helpers.has('gold'));
    mechanic.setEnabled(helpers.has('mechanic'));hatch.setEnabled(helpers.has('mechanic'));
    if(result.helper==='oil')oilcan.setEnabled(true);
    setShot('side');
  }
  function reset(){
    reaction=null;reactionTime=0;inputStroke=0;kickAge=99;enginePhase=0;angle=0;running=false;ignitions=0;hitAge=99;stopAge=99;stopFace.setEnabled(false);helpers.clear();pedalMotion.reset();
    model.setGold(false);piston.setEnabled(true);arrivingPiston.setEnabled(false);mechanic.setEnabled(false);hatch.setEnabled(false);oilcan.setEnabled(false);
    lights.forEach(l=>l.material=lampOff);mirrorPivot.rotation.setAll(0);exhaust.rotation.z=0;
    exhaust.scaling.setAll(1);
    arms.forEach(a=>a.rotation.setAll(0));palms.forEach(p=>p.rotation.setAll(0));electric.forEach(m=>m.setEnabled(false));pools.forEach(p=>{p.life=0;p.m.setEnabled(false);});bike.position.setAll(0);setShot('side');
  }
  hatch.setEnabled(false);
  return {engine,scene,update,react,reset,setShot,
    setStroke(value){inputStroke=clamp(value);pedalMotion.setTarget(inputStroke);},
    releasePedal(){inputStroke=0;pedalMotion.release();},
    kick(power){inputStroke=0;kickAge=0;kickPower=power;pedalMotion.kick(power);},
    setWheelAngle(value){angle=value;},
    pointerTick(weight=1){hitAge=0;hitWeight=weight;},
    stopWheel(slot,kind){stopAge=0;paintStopFeedback(stopTexture.getContext(),slot,kind);stopTexture.update();},
    shoeAnchor(){const point=boot.getAbsolutePosition().add(V(.1,-.04,-.02));const p=Vector3.Project(point,Matrix.Identity(),scene.getTransformMatrix(),mainCamera.viewport.toGlobal(engine.getRenderWidth(),engine.getRenderHeight()));return{x:p.x/engine.getRenderWidth()*canvas.clientWidth,y:p.y/engine.getRenderHeight()*canvas.clientHeight};},
    async whenReady(){await model.ready();await scene.whenReadyAsync();},
    getStats(){return{meshes:scene.meshes.length,shot,helpers:[...helpers],running,model:model.getStats()};},
    dispose(){window.removeEventListener('resize',resize);scene.dispose();engine.dispose();},
  };
}
