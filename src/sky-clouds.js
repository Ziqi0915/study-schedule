import * as T from 'three';
import {MarchingCubes} from 'three/addons/objects/MarchingCubes.js';

// Blend the lobes into one surface, so translucent clouds have no sphere seams.
export function createCloudGeometry(variant=0){
  const lobes=[[-1.16,-.13,0,.67,.49,.55],[-.48,.15,.03,.83,.72,.69],[.42,.3,0,.79,.87,.68],[1.12,-.08,.02,.68,.52,.53],[0,-.26,.08,1.2,.48,.62]];
  const resolution=40,extent=2.5,material=new T.MeshBasicMaterial();
  const field=new MarchingCubes(resolution,material,false,false,16000);field.isolation=0;
  const blend=(a,b)=>{const h=Math.max(.24-Math.abs(a-b),0)/.24;return Math.min(a,b)-h*h*.24*.25};
  for(let z=0;z<resolution;z++)for(let y=0;y<resolution;y++)for(let x=0;x<resolution;x++){
    const px=(x/resolution*2-1)*extent,py=(y/resolution*2-1)*extent,pz=(z/resolution*2-1)*extent;
    let d=10;
    for(let i=0;i<lobes.length;i++){
      const [cx,cy,cz,rx,ry,rz]=lobes[i],offset=Math.sin(variant*2.7+i*1.9)*.13;
      const q=Math.hypot((px-cx)/(rx*(1+offset)),(py-cy-offset)/ry,(pz-cz)/rz)-1;
      d=blend(d,q*Math.min(rx,ry,rz));
    }
    field.field[x+y*resolution+z*resolution*resolution]=-d;
  }
  field.update();
  const geometry=new T.BufferGeometry(),positions=field.positionArray.slice(0,field.count*3),normals=field.normalArray.slice(0,field.count*3),colors=new Float32Array(field.count*3);
  for(let i=0;i<positions.length;i+=3){
    positions[i]*=extent;positions[i+1]*=extent;positions[i+2]*=extent;
    const length=Math.hypot(normals[i],normals[i+1],normals[i+2])||1;
    normals[i]/=length;normals[i+1]/=length;normals[i+2]/=length;
    const soft=Math.max(0,Math.min(1,(positions[i+1]+.65)/1.8));
    colors[i]=.87+.13*soft;colors[i+1]=.9+.1*soft;colors[i+2]=.95+.05*soft;
  }
  geometry.setAttribute('position',new T.BufferAttribute(positions,3));geometry.setAttribute('normal',new T.BufferAttribute(normals,3));geometry.setAttribute('color',new T.BufferAttribute(colors,3));geometry.computeBoundingSphere();
  field.geometry.dispose();material.dispose();return geometry;
}
