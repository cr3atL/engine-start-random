import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial.js';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture.js';
import { CubeTexture } from '@babylonjs/core/Materials/Textures/cubeTexture.js';
import { Texture } from '@babylonjs/core/Materials/Textures/texture.js';
import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import {assetUrl} from './asset-url.js';

const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
export function createWorkshopMaterials(scene){
  let seed=4177;const random=()=>{seed=seed*16807%2147483647;return(seed-1)/2147483646;};
  const size=512;
  function texture(name,paint){const t=new DynamicTexture(name,{width:size,height:size},scene,true);paint(t.getContext());t.update();return t;}
  const cast=texture('cast aluminum: fine pores and trapped oil',ctx=>{
    ctx.fillStyle='#cacdd0';ctx.fillRect(0,0,size,size);
    for(let i=0;i<18000;i++){
      const v=Math.floor(110+random()*130),r=.3+random()*1.0;
      ctx.fillStyle=`rgba(${v},${v+2},${v+3},${.05+random()*.11})`;ctx.fillRect(random()*size,random()*size,r,r);
    }
    for(const [x,y,r]of[[18,420,160],[473,492,170],[488,82,105]]){
      const g=ctx.createRadialGradient(x,y,5,x,y,r);g.addColorStop(0,'#26221b4a');g.addColorStop(.42,'#3e342a20');g.addColorStop(1,'#29271f00');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);
    }
    for(let i=0;i<100;i++){
      const x=random()*size,y=random()*size;ctx.strokeStyle=random()>.5?'#f7fbff26':'#414a5023';ctx.lineWidth=.4;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+2+random()*7,y+random()*2);ctx.stroke();
    }
  });
  const brushed=texture('machining lines',ctx=>{
    ctx.fillStyle='#d2d6d9';ctx.fillRect(0,0,size,size);
    for(let y=0;y<size;y++){ctx.fillStyle=`rgba(65,75,84,${random()*.07})`;ctx.fillRect(0,y,size,.35);}
    for(let i=0;i<130;i++){ctx.fillStyle='#f5f7fa15';ctx.fillRect(random()*size,random()*size,6+random()*32,.5);}
  });
  const paint=texture('aged deep red enamel',ctx=>{
    ctx.fillStyle='#e5e0d8';ctx.fillRect(0,0,size,size);
    for(let i=0;i<9000;i++){ctx.fillStyle=`rgba(77,58,49,${random()*.08})`;ctx.fillRect(random()*size,random()*size,1,1);}
    for(let i=0;i<45;i++){const x=random()*size,y=random()*size;ctx.fillStyle='#71645175';ctx.fillRect(x,y,1+random()*4,.5+random());}
  });
  const leatherTex=texture('leather grain and ankle wrinkles',ctx=>{
    ctx.fillStyle='#c3b6a6';ctx.fillRect(0,0,size,size);
    for(let i=0;i<24000;i++){ctx.fillStyle=random()>.5?'#32271c25':'#d8d2c91f';ctx.fillRect(random()*size,random()*size,1+random()*1.2,.5+random());}
    for(let i=0;i<16;i++){const y=140+i*8;ctx.strokeStyle='#41302120';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(75,y);ctx.bezierCurveTo(180,y-8,250,y+6,365,y-3);ctx.stroke();}
  });
  const clothTex=texture('denim weave',ctx=>{
    ctx.fillStyle='#bfc8cc';ctx.fillRect(0,0,size,size);
    for(let i=-size;i<size*2;i+=3){ctx.strokeStyle=i%2?'#242e3b19':'#e0e3db28';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(i-size,size);ctx.stroke();}
  });
  function normal(name,type){
    return texture(name,ctx=>{
      const image=ctx.createImageData(size,size),data=image.data;
      for(let y=0;y<size;y++)for(let x=0;x<size;x++){
        const i=(y*size+x)*4;
        const gx=type==='brushed'?(random()-.5)*4:(random()-.5)*(type==='leather'?24:16);
        const gy=type==='brushed'?Math.sin(y*3.2)*7+(random()-.5)*3:(random()-.5)*(type==='leather'?26:16);
        data[i]=128+gx;data[i+1]=128+gy;data[i+2]=254;data[i+3]=255;
      }
      ctx.putImageData(image,0,0);
    });
  }
  const castNormal=normal('subtle cast pitting normals','cast'),brushNormal=normal('fine turned metal normals','brushed'),leatherNormal=normal('leather relief normals','leather');
  // Prefiltered HDR capture supplies both diffuse irradiance and roughness-correct
  // reflections. The 205 KB file is bundled locally; there is no runtime CDN call.
  const reflections=CubeTexture.CreateFromPrefilteredData(assetUrl('assets/studio.env'),scene);
  reflections.name='Babylon studio IBL';reflections.rotationY=.55;
  scene.environmentTexture=reflections;scene.environmentIntensity=.75;
  function surface(name,color,spec=.2,power=32,map=null){
    const m=new StandardMaterial(name,scene);m.diffuseColor=Color3.FromHexString(color);m.specularColor=new Color3(spec,spec,spec);m.specularPower=power;if(map)m.diffuseTexture=map;return m;
  }
  function alloy(name,color,roughness,reflectivity,map=cast,bump=castNormal){
    const m=new PBRMaterial(name,scene);m.albedoColor=Color3.FromHexString(color);m.albedoTexture=map;m.metallic=.72+reflectivity*.30;m.roughness=roughness;
    m.bumpTexture=bump;m.bumpTexture.level=bump===castNormal?.38:.22;
    m.reflectionTexture=reflections;m.environmentIntensity=.95;m.directIntensity=1.0;
    m.useRadianceOverAlpha=false;m.useSpecularOverAlpha=false;return m;
  }
  const metal=alloy('cast aluminum with oily recesses','#929ba3',.67,.12);
  const machined=alloy('turned aluminum and piston face','#8d9ba6',.38,.30,brushed,brushNormal);
  const edge=alloy('polished steel edge','#b4bec6',.23,.48,brushed,brushNormal);
  const dark=alloy('blackened oiled steel','#27333c',.5,.12);
  const oil=alloy('oily cavities','#0c151a',.28,.08);
  const rust=surface('dark heat-stained exhaust','#645449',.35,50,cast);
  const black=surface('matte aged rubber','#11171a',.07,14);
  const red=new PBRMaterial('deep worn red enamel',scene);red.albedoColor=Color3.FromHexString('#b0261b').toLinearSpace();red.albedoTexture=paint;red.metallic=.12;red.roughness=.24;red.reflectionTexture=reflections;red.environmentIntensity=.85;red.clearCoat.isEnabled=true;red.clearCoat.intensity=.65;red.clearCoat.roughness=.15;
  const hide=new Texture(assetUrl('assets/boot-leather-albedo.png'),scene,false,false,Texture.TRILINEAR_SAMPLINGMODE);hide.uScale=2;hide.vScale=1.5;hide.anisotropicFilteringLevel=4;
  const leather=new PBRMaterial('real worn work boot leather',scene);leather.albedoTexture=hide;leather.albedoColor=Color3.FromHexString('#aaa397');leather.metallic=0;leather.roughness=.69;leather.bumpTexture=leatherNormal;leather.bumpTexture.level=.16;leather.reflectionTexture=reflections;leather.environmentIntensity=.75;
  const sole=surface('rubber sole','#151916',.05,8);
  const denim=new PBRMaterial('dry indigo denim twill',scene);denim.albedoColor=Color3.FromHexString('#36434b').toLinearSpace();denim.albedoTexture=clothTex;denim.metallic=0;denim.roughness=.94;denim.reflectionTexture=reflections;denim.environmentIntensity=.6;
  const seam=surface('subtle trouser stitching','#434944',.02,4);
  const brass=alloy('gold piston','#c7a24c',.24,.25,brushed,brushNormal);
  const skin=surface('mechanic skin','#b99a79',.15,16),cloth=surface('workwear','#4a625c',.08,12,clothTex);
  const white=surface('porcelain','#c9cac1',.25,55),eye=surface('eye','#111b1b',.1,20);
  const lampOff=surface('unlit indicator','#1e332b',.5,90),lampOn=surface('lit indicator','#8eae67',.5,90);lampOn.emissiveColor=Color3.FromHexString('#8baa57').scale(.65);
  function coated(name,color,roughness,metallic=0,map=null){const m=new PBRMaterial(name,scene);m.albedoColor=Color3.FromHexString(color).toLinearSpace();m.albedoTexture=map;m.roughness=roughness;m.metallic=metallic;m.reflectionTexture=reflections;m.environmentIntensity=.85;return m;}
  const cubPaint=coated('CC110 matte armored green enamel','#344a41',.53,.06,paint);cubPaint.clearCoat.isEnabled=true;cubPaint.clearCoat.intensity=.06;cubPaint.clearCoat.roughness=.50;
  const frame=coated('black powder-coated chassis','#161a1a',.42,.20,cast);
  const wheelMaterial=coated('matte cast wheel coating','#151716',.68,.10,cast);
  const lace=surface('waxed cotton boot laces','#5a574b',.07,8,clothTex);
  const cuffMaterial=coated('folded denim reverse weave','#6a716d',.96,0,clothTex);
  const plastic=coated('unpainted satin ABS','#202220',.65,0);
  const tire=coated('dry tire rubber','#20221f',.91,0,cast);
  const seatMaterial=coated('textured saddle vinyl','#242625',.76,0,leatherTex);seatMaterial.bumpTexture=leatherNormal;seatMaterial.bumpTexture.level=.14;
  const lens=coated('clear headlight reflector and optical glass','#b9c2c1',.16,.4,brushed);lens.clearCoat.isEnabled=true;lens.clearCoat.intensity=1;lens.clearCoat.roughness=.10;
  const amber=coated('ribbed amber optical plastic','#e88513',.28,.1);amber.clearCoat.isEnabled=true;amber.clearCoat.intensity=.8;
  const tail=coated('red tail light lens','#84170f',.24,.05);tail.clearCoat.isEnabled=true;tail.clearCoat.intensity=.8;
  return {surface,metal,machined,edge,dark,oil,rust,black,red,leather,sole,denim,seam,brass,skin,cloth,white,eye,lampOff,lampOn,cast,cubPaint,frame,plastic,tire,seatMaterial,lens,amber,tail,wheelMaterial,lace,cuffMaterial};
}
