import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { Curve3 } from '@babylonjs/core/Maths/math.path.js';

const TAU=Math.PI*2;
const cat=(a,b,c,d,t)=>.5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t);
const signed=(x,p)=>Math.sign(x)*Math.pow(Math.abs(x),p);

export function createModeling(scene,attach){
  function mesh(name,positions,indices,uvs,pos,mat,parent){
    // Babylon's default left-handed winding is clockwise when viewed from outside.
    for(let i=0;i<indices.length;i+=3){const swap=indices[i+1];indices[i+1]=indices[i+2];indices[i+2]=swap;}
    const normals=[];VertexData.ComputeNormals(positions,indices,normals);
    const data=new VertexData();Object.assign(data,{positions,indices,normals,uvs});
    const m=new Mesh(name,scene);data.applyToMesh(m);return attach(m,pos,mat,parent);
  }
  function loft(name,rows,mat,parent,{pos=[0,0,0],roundness=1,steps=5,sides=32}={}){
    const rings=[];
    for(let r=0;r<rows.length-1;r++)for(let k=0;k<steps;k++){
      const t=k/steps;const row=rows[r].map((v,i)=>cat(rows[Math.max(0,r-1)][i],v,rows[r+1][i],rows[Math.min(rows.length-1,r+2)][i],t));
      row[1]=Math.max(.001,row[1]);rings.push(row);
    }
    rings.push(rows.at(-1));
    const positions=[],indices=[],uvs=[];
    rings.forEach(([x,w,top,bottom,zc=0],r)=>{
      for(let i=0;i<=sides;i++){
        const a=i/sides*TAU,s=Math.sin(a),c=Math.cos(a);
        positions.push(x,(top+bottom)/2+signed(s,roundness)*(top-bottom)/2,zc+signed(c,roundness)*w);
        uvs.push(r/(rings.length-1),i/sides);
      }
    });
    for(let r=0;r<rings.length-1;r++)for(let i=0;i<sides;i++){
      const a=r*(sides+1)+i,b=a+sides+1;indices.push(a,b,a+1,b,b+1,a+1);
    }
    for(const [ring,front]of[[0,true],[rings.length-1,false]]){
      const [x,w,top,bottom,zc=0]=rings[ring],base=positions.length/3;
      positions.push(x,(top+bottom)/2,zc);uvs.push(.5,.5);
      for(let i=0;i<=sides;i++){const offset=(ring*(sides+1)+i)*3;positions.push(...positions.slice(offset,offset+3));uvs.push(i/sides,front?0:1);}
      for(let i=0;i<sides;i++)indices.push(...(front?[base,base+1+i,base+2+i]:[base,base+2+i,base+1+i]));
    }
    return mesh(name,positions,indices,uvs,pos,mat,parent);
  }
  function outline(width,height,radius){
    radius=Math.min(radius,width/2,height/2);
    const points=[];
    for(const [x,y,start]of[[width/2-radius,height/2-radius,0],[-width/2+radius,height/2-radius,Math.PI/2],[-width/2+radius,-height/2+radius,Math.PI],[width/2-radius,-height/2+radius,Math.PI*1.5]])
      for(let i=0;i<=8;i++){const a=start+i/8*Math.PI/2;points.push([x+Math.cos(a)*radius,y+Math.sin(a)*radius]);}
    return points;
  }
  // Convex outlines with separate planar caps and a real rounded metal edge.
  function plate(name,pos,points,depth,bevel,mat,parent){
    const area=points.reduce((sum,p,i)=>{const next=points[(i+1)%points.length];return sum+p[0]*next[1]-next[0]*p[1];},0);
    if(area<0)points=points.slice().reverse();
    const w=Math.max(...points.map(p=>Math.abs(p[0])))*2,h=Math.max(...points.map(p=>Math.abs(p[1])))*2;
    const inset=1-bevel/Math.min(w,h)*2;
    const layers=[[-depth/2,inset],[-depth/2+bevel*.3,1-bevel/Math.min(w,h)*.55],[-depth/2+bevel,1],[depth/2-bevel,1],[depth/2,inset]];
    const positions=[],indices=[],uvs=[],n=points.length;
    for(const [z,s]of layers)for(const [x,y]of points){positions.push(x*s,y*s,z);uvs.push(x/w+.5,y/h+.5);}
    for(let r=0;r<layers.length-1;r++)for(let i=0;i<n;i++){
      const a=r*n+i,b=r*n+(i+1)%n;indices.push(a,b,a+n,b,b+n,a+n);
    }
    for(const [z,s,front]of[[-depth/2,inset,true],[depth/2,inset,false]]){
      const base=positions.length/3;positions.push(0,0,z);uvs.push(.5,.5);
      for(const [x,y]of points){positions.push(x*s,y*s,z);uvs.push(x/w+.5,y/h+.5);}
      for(let i=0;i<n;i++){const a=base+1+i,b=base+1+(i+1)%n;indices.push(...(front?[base,b,a]:[base,a,b]));}
    }
    return mesh(name,positions,indices,uvs,pos,mat,parent);
  }
  function rounded(name,pos,size,radius,mat,parent,bevel=Math.min(size[2]*.24,.02)){
    return plate(name,pos,outline(size[0],size[1],radius),size[2],bevel,mat,parent);
  }
  function tube(name,points,radius,mat,parent,{closed=false,tessellation=12}={}){
    const vectors=points.map(p=>Vector3.FromArray(p));
    const path=vectors.length>2&&vectors.length<50?Curve3.CreateCatmullRomSpline(vectors,5,closed).getPoints():vectors;
    const m=MeshBuilder.CreateTube(name,{path,radius,tessellation,cap:closed?Mesh.NO_CAP:Mesh.CAP_ALL},scene);
    return attach(m,[0,0,0],mat,parent);
  }
  function lathe(name,shape,mat,parent){
    const m=MeshBuilder.CreateLathe(name,{shape:shape.map(([r,y])=>new Vector3(r,y,0)),tessellation:96,cap:Mesh.NO_CAP},scene);
    return attach(m,[0,0,0],mat,parent);
  }
  function ribbon(name,rows,mat,parent){
    const positions=[],indices=[],uvs=[],length=rows[0].length;
    rows.forEach((row,r)=>row.forEach((p,i)=>{positions.push(...p);uvs.push(i/(length-1),r/(rows.length-1));}));
    for(let r=0;r<rows.length-1;r++)for(let i=0;i<length-1;i++){
      const a=r*length+i,b=a+length;indices.push(a,a+1,b,b,a+1,b+1);
    }
    // Mudguards are thin pressed shells; their underside needs its own normals.
    const count=positions.length/3,frontIndices=indices.slice();positions.push(...positions);uvs.push(...uvs);
    for(let i=0;i<frontIndices.length;i+=3)indices.push(frontIndices[i]+count,frontIndices[i+2]+count,frontIndices[i+1]+count);
    return mesh(name,positions,indices,uvs,[0,0,0],mat,parent);
  }
  function sweep(name,anchors,mat,parent){
    const centers=[];
    for(let r=0;r<anchors.length-1;r++)for(let k=0;k<10;k++){
      const t=k/10;centers.push(anchors[r].map((v,i)=>cat(anchors[Math.max(0,r-1)][i],v,anchors[r+1][i],anchors[Math.min(anchors.length-1,r+2)][i],t)));
    }
    centers.push(anchors.at(-1));
    const positions=[],indices=[],uvs=[],sides=40;
    centers.forEach(([x,y,w,d],r)=>{
      const before=centers[Math.max(0,r-1)],after=centers[Math.min(centers.length-1,r+1)],dx=after[0]-before[0],dy=after[1]-before[1],l=Math.hypot(dx,dy);
      for(let i=0;i<=sides;i++){
        const a=i/sides*TAU,n=signed(Math.cos(a),.32)*w;
        positions.push(x+dy/l*n,y-dx/l*n,signed(Math.sin(a),.32)*d);uvs.push(r/(centers.length-1),i/sides);
      }
    });
    for(let r=0;r<centers.length-1;r++)for(let i=0;i<sides;i++){const a=r*(sides+1)+i,b=a+sides+1;indices.push(a,b,a+1,b,b+1,a+1);}
    for(const [r,start]of[[0,true],[centers.length-1,false]]){
      const base=positions.length/3,[x,y]=centers[r];positions.push(x,y,0);uvs.push(.5,.5);
      for(let i=0;i<=sides;i++){const j=(r*(sides+1)+i)*3;positions.push(...positions.slice(j,j+3));uvs.push(i/sides,.5);}
      for(let i=0;i<sides;i++)indices.push(...(start?[base,base+1+i,base+2+i]:[base,base+2+i,base+1+i]));
    }
    return mesh(name,positions,indices,uvs,[0,0,0],mat,parent);
  }
  function smoothOutline(points,steps=5){return Curve3.CreateCatmullRomSpline(points.map(([x,y])=>new Vector3(x,y,0)),steps,true).getPoints().slice(0,-1).map(p=>[p.x,p.y]);}
  return {loft,outline,plate,rounded,tube,lathe,ribbon,sweep,smoothOutline};
}
