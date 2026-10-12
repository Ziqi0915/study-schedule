import * as T from 'three';

function seeded(seed=1) {
  let state=seed>>>0;
  return ()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296};
}

// Seamless procedural height maps; no model or texture downloads are required.
function textileHeight(kind) {
  const size=256,canvas=document.createElement('canvas');canvas.width=canvas.height=size;
  const ctx=canvas.getContext('2d'),pixels=ctx.createImageData(size,size),random=seeded(kind==='denim'?97:41);
  const gridSize=64,grid=Float32Array.from({length:gridSize*gridSize},()=>random());
  function noise(x,y) {
    const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy;
    const at=(a,b)=>grid[((b+gridSize)%gridSize)*gridSize+(a+gridSize)%gridSize];
    const a=T.MathUtils.lerp(at(ix,iy),at(ix+1,iy),fx),b=T.MathUtils.lerp(at(ix,iy+1),at(ix+1,iy+1),fx);
    return T.MathUtils.lerp(a,b,fy);
  }
  for(let y=0;y<size;y++)for(let x=0;x<size;x++) {
    const grain=noise(x/4,y/4),fine=random();
    const weave=kind==='denim'?.5+.25*Math.sin((x+y)*Math.PI/2)+.25*Math.sin((x-y)*Math.PI/4):.5+.25*Math.cos(x*Math.PI/2)+.25*Math.cos(y*Math.PI/2);
    const value=Math.round(255*(grain*.60+fine*.15+weave*.25));const i=(y*size+x)*4;
    pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=value;pixels.data[i+3]=255;
  }
  ctx.putImageData(pixels,0,0);const texture=new T.CanvasTexture(canvas);
  texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.anisotropy=4;return texture;
}

export function finishTextile(material,kind='felt',heightMap) {
  material.roughness=kind==='denim'?.9:.98;material.metalness=0;
  material.bumpMap=heightMap||textileHeight(kind);material.bumpScale=kind==='plush'?.0025:kind==='denim'?.002:.004;
  material.userData.textile=kind;
  const repeat=kind==='denim'?2.4:kind==='canvas'?1.8:1.25;
  material.onBeforeCompile=shader=>{
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vTextilePosition;\nvarying vec3 vTextileNormal;')
      .replace('#include <begin_vertex>','#include <begin_vertex>\nvTextilePosition=position;\nvTextileNormal=normal;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
      varying vec3 vTextilePosition;
      varying vec3 vTextileNormal;`)
      .replace('#include <normal_fragment_maps>',`// Tri-planar mapping also covers the seamless head, which has no UV seams.
        vec3 textileWeights=pow(abs(normalize(vTextileNormal)),vec3(4.0));
        textileWeights/=max(dot(textileWeights,vec3(1.0)),0.001);
        vec3 tp=vTextilePosition*${repeat.toFixed(2)};
        float textileHeight=dot(vec3(texture2D(bumpMap,tp.yz).r,texture2D(bumpMap,tp.zx).r,texture2D(bumpMap,tp.xy).r),textileWeights);
        vec3 textileDx=dFdx(-vViewPosition),textileDy=dFdy(-vViewPosition);
        vec3 textileR1=cross(textileDy,normal),textileR2=cross(normal,textileDx);
        float textileDet=dot(textileDx,textileR1);
        vec3 textileGradient=sign(textileDet)*(dFdx(textileHeight*bumpScale)*textileR1+dFdy(textileHeight*bumpScale)*textileR2);
        normal=normalize(abs(textileDet)*normal-textileGradient);
        diffuseColor.rgb*=0.94+0.10*textileHeight;`);
  };
  material.customProgramCacheKey=()=>`stayreal-textile-${kind}-v1`;
  return material;
}

export function createTextilePalette() {
  const materials=new Map(),textures=new Map();
  return {get(color,kind='felt') {
    const key=`${color}-${kind}`;
    if(!materials.has(key)) {
      if(!textures.has(kind))textures.set(kind,textileHeight(kind));
      const m=kind==='plush'?new T.MeshPhysicalMaterial({color,sheen:.5,sheenColor:new T.Color(color),sheenRoughness:.9}):new T.MeshStandardMaterial({color});
      finishTextile(m,kind,textures.get(kind));materials.set(key,m);
    }
    return materials.get(key);
  },disposeUnused(used) {
    materials.forEach(m=>{if(!used.has(m))m.dispose()});
  }};
}

// Short opaque fiber geometry gives a real soft silhouette, not just a noise map.
// Instancing keeps thousands of fibers to one draw per tufted object.
function addShortPile(object,material,{count=1000,length=.022,seed=19,clearFace=false}={}) {
  const geometry=object.geometry,p=geometry.attributes.position,n=geometry.attributes.normal,index=geometry.index;
  if(!n)return;
  const faces=(index?index.count:p.count)/3,areas=new Float64Array(faces);
  const a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3(),ab=new T.Vector3(),ac=new T.Vector3();let area=0;
  const vertex=(face,corner)=>index?index.getX(face*3+corner):face*3+corner;
  for(let f=0;f<faces;f++){a.fromBufferAttribute(p,vertex(f,0));b.fromBufferAttribute(p,vertex(f,1));c.fromBufferAttribute(p,vertex(f,2));area+=ab.subVectors(b,a).cross(ac.subVectors(c,a)).length()*.5;areas[f]=area}
  if(area===0)return;
  const random=seeded(seed),tufts=new T.InstancedMesh(new T.ConeGeometry(.14,1,3,1),material,count);
  tufts.name='short-textile-pile';tufts.castShadow=false;tufts.receiveShadow=true;
  const point=new T.Vector3(),normal=new T.Vector3(),temp=new T.Vector3(),matrix=new T.Matrix4(),rotation=new T.Quaternion(),scale=new T.Vector3(),up=new T.Vector3(0,1,0),tint=new T.Color();let placed=0;
  for(let sample=0;sample<count*2&&placed<count;sample++) {
    const pick=random()*area;let lo=0,hi=faces-1;while(lo<hi){const mid=(lo+hi)>>1;if(areas[mid]<pick)lo=mid+1;else hi=mid}
    const s=Math.sqrt(random()),v=random(),weights=[1-s,s*(1-v),s*v];point.set(0,0,0);normal.set(0,0,0);
    for(let corner=0;corner<3;corner++){const i=vertex(lo,corner);point.addScaledVector(temp.fromBufferAttribute(p,i),weights[corner]);normal.addScaledVector(temp.fromBufferAttribute(n,i),weights[corner])}
    if(clearFace&&point.z>.30&&((Math.abs(Math.abs(point.x)-.27)<.09&&Math.abs(point.y-1.96)<.15)||(Math.abs(point.x)<.18&&point.y>1.68&&point.y<1.9)))continue;
    normal.normalize();const size=length*(.65+random()*.65);point.addScaledVector(normal,size*.37);
    normal.add(new T.Vector3((random()-.5)*.45,(random()-.5)*.45,(random()-.5)*.45)).normalize();
    rotation.setFromUnitVectors(up,normal);scale.set(size,size,size);matrix.compose(point,rotation,scale);tufts.setMatrixAt(placed,matrix);
    tint.setScalar(.85+random()*.15);tufts.setColorAt(placed,tint);placed++;
  }
  tufts.count=placed;tufts.instanceMatrix.needsUpdate=true;if(tufts.instanceColor)tufts.instanceColor.needsUpdate=true;
  tufts.computeBoundingSphere();object.add(tufts);
}

export function decoratePlushGarden(world) {
  const objects=[];world.traverse(o=>{if(o.isMesh)objects.push(o)});
  const pileMaterials=new Map();
  for(const object of objects) {
    let config;
    if(object.name==='seamless-rounded-head-and-ears')config={count:22000,length:.010,clearFace:true};
    else if(object.name==='plush-paw'||object.name==='plush-tail')config={count:600,length:.07};
    else if(object.name==='felt-cloud')config={count:1100,length:.025};
    else if(object.name==='felt-shrub')config={count:650,length:.025};
    else if(object.name==='bee-plush-hood')config={count:1800,length:.04};
    if(!config)continue;
    const color=object.material.color.getHex();if(!pileMaterials.has(color))pileMaterials.set(color,new T.MeshStandardMaterial({color,roughness:1}));
    addShortPile(object,pileMaterials.get(color),{...config,seed:objects.indexOf(object)*71+29});
  }
}

export function addFeltGround(world,material) {
  const random=seeded(734),count=4500,grass=new T.InstancedMesh(new T.SphereGeometry(.047,5,3),material,count);
  const matrix=new T.Matrix4(),p=new T.Vector3(),q=new T.Quaternion(),scale=new T.Vector3(),color=new T.Color();let placed=0;
  for(let i=0;i<count*2&&placed<count;i++) {
    const angle=random()*Math.PI*2,r=Math.sqrt(random())*5.02,x=Math.cos(angle)*r,z=Math.sin(angle)*r;
    // Keep the cream footpath and the actors' landing free from ground fibers.
    if(((x-.4)/1.4)**2+((z-1.1)/2.05)**2<1)continue;
    p.set(x,.112+random()*.012,z);q.setFromEuler(new T.Euler((random()-.5)*.35,random()*Math.PI,(random()-.5)*.35));
    scale.set(.65+random()*.6,.5+random()*.3,.65+random()*.6);matrix.compose(p,q,scale);grass.setMatrixAt(placed,matrix);
    color.setHex([0x6a8d44,0x7f9d50,0x92ad65,0xa4b879][Math.floor(random()*4)]).multiplyScalar(.8+random()*.2);grass.setColorAt(placed,color);placed++;
  }
  grass.count=placed;grass.instanceMatrix.needsUpdate=true;grass.instanceColor.needsUpdate=true;grass.receiveShadow=true;grass.name='felt-meadow';world.add(grass);
}
