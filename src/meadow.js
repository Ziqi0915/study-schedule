import * as T from 'three';

function randomSequence(seed){let state=seed>>>0;return()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296}}

// Rounded elliptical cross sections make plump young blades with a curved,
// tapered silhouette. They remain smooth from either side while orbiting.
function bladeGeometry(){
  const positions=[],colors=[],indices=[],rows=12,sides=8;
  for(let row=0;row<=rows;row++){
    const t=row/rows,profile=Math.sin(Math.PI*t),width=.007*(1-t)+.072*profile**.8,thickness=.003*(1-t)+.019*profile;
    for(let col=0;col<sides;col++){
      const angle=col/sides*Math.PI*2;
      positions.push(Math.cos(angle)*width,t,.36*t*t+Math.sin(angle)*thickness);
      const light=.70+.30*t;colors.push(light*.94,light,.85+.15*t);
    }
  }
  for(let row=0;row<rows;row++)for(let col=0;col<sides;col++){
    const a=row*sides+col,b=(row+1)*sides+col,c=row*sides+(col+1)%sides,d=(row+1)*sides+(col+1)%sides;
    indices.push(a,b,c,b,d,c);
  }
  const base=positions.length/3;positions.push(0,0,0);colors.push(.66,.7,.85);
  for(let col=0;col<sides;col++)indices.push(base,col,(col+1)%sides);
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
}

export function meadowIsOpen(x,z){
  if(Math.hypot(x,z)>4.95)return false;
  if(((x-.4)/1.58)**2+((z-1.1)/2.23)**2<1)return false;
  for(const [cx,cz,rx,rz] of [[-1.35,1.8,.70,.62],[2.8,1.4,.63,.56],[3,-.9,.87,.62],[-3.5,-1,.52,.48],[3,-2,.48,.48],[0,-3.8,.48,.48],[-3,2.3,.48,.48]]){
    if(((x-cx)/rx)**2+((z-cz)/rz)**2<1)return false;
  }
  return true;
}

export function addLivingMeadow(world,moving){
  const random=randomSequence(7941),tufts=[],flowers=[];
  for(let i=0;i<5000&&tufts.length<480;i++){
    const a=random()*Math.PI*2,r=Math.sqrt(random())*4.92,x=Math.cos(a)*r,z=Math.sin(a)*r;
    if(!meadowIsOpen(x,z))continue;
    // Loose patches of taller growth alternate with low areas, with a shorter
    // foreground at the entrance to keep the path and shoes visible.
    const patch=.5+.5*Math.sin(x*1.45+Math.sin(z*1.7))*Math.cos(z*1.15);
    const foreground=z>2.4&&Math.abs(x)<2.2?.55:1;
    tufts.push({x,z,height:(.16+patch*.40+random()*.16)*foreground,angle:random()*Math.PI*2});
  }
  for(let i=0;i<3000&&flowers.length<48;i++){
    const a=random()*Math.PI*2,r=Math.sqrt(random())*4.65,x=Math.cos(a)*r,z=Math.sin(a)*r;
    if(!meadowIsOpen(x,z)||flowers.some(f=>Math.hypot(x-f.x,z-f.z)<.40))continue;
    flowers.push({x,z,size:.19+random()*.24,color:[0xfff7df,0xf5c84e,0xeb8da3,0xc4a0d8][flowers.length%4]});
  }
  const time={value:0},snowAmount={value:0};
  const material=new T.MeshPhysicalMaterial({color:0xffffff,vertexColors:true,roughness:.72,metalness:0,clearcoat:.40,clearcoatRoughness:.28});
  material.onBeforeCompile=shader=>{
    shader.uniforms.meadowTime=time;shader.uniforms.meadowSnow=snowAmount;
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nuniform float meadowTime;')
      .replace('#include <begin_vertex>',`#include <begin_vertex>
        float phase=instanceMatrix[3].x*.8+instanceMatrix[3].z*.65;
        transformed.x+=sin(meadowTime*1.3+phase)*.09*position.y*position.y;
        transformed.z+=cos(meadowTime*.9+phase)*.035*position.y*position.y;`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nuniform float meadowSnow;')
      .replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.rgb=mix(diffuseColor.rgb,vec3(0.975,0.985,1.0),meadowSnow);');
  };
  material.customProgramCacheKey=()=> 'living-meadow-wind-snow-v1';
  const grass=new T.InstancedMesh(bladeGeometry(),material,tufts.length*6);
  grass.name='fresh-layered-grass';grass.receiveShadow=true;grass.frustumCulled=false;world.add(grass);
  const dummy=new T.Object3D(),tint=new T.Color(),dewSeeds=[];
  const greens=[0x38984e,0x57b844,0x8bd650,0x3ea56a,0x66bd57];
  tufts.forEach((tuft,i)=>{
    for(let j=0;j<6;j++){
      const angle=tuft.angle+j*2.399,spread=.025+random()*.07;
      dummy.position.set(tuft.x+Math.cos(angle)*spread,.115,tuft.z+Math.sin(angle)*spread);
      dummy.rotation.set(0,angle,0);dummy.scale.set(.48+random()*.55,tuft.height*(.65+random()*.60),tuft.height*(.8+random()*.5));dummy.updateMatrix();
      grass.setMatrixAt(i*6+j,dummy.matrix);tint.setHex(greens[(i+j)%greens.length]);grass.setColorAt(i*6+j,tint);
      if(j===2&&i%5===0)dewSeeds.push({matrix:dummy.matrix.clone(),t:.64+random()*.16,radius:.024+random()*.012,phase:dummy.position.x*.8+dummy.position.z*.65});
    }
  });
  grass.instanceMatrix.needsUpdate=true;grass.instanceColor.needsUpdate=true;
  const dewMaterial=new T.MeshPhysicalMaterial({color:0xd3ffe8,roughness:.06,metalness:.05,clearcoat:1,clearcoatRoughness:.02,transparent:true,opacity:.76,depthWrite:false});
  const dew=new T.InstancedMesh(new T.SphereGeometry(1,10,8),dewMaterial,dewSeeds.length);dew.name='meadow-dewdrops';dew.frustumCulled=false;world.add(dew);
  const highlights=new T.InstancedMesh(new T.SphereGeometry(1,6,4),new T.MeshBasicMaterial({color:0xf0fff6,transparent:true}),dewSeeds.length);highlights.name='dew-highlights';highlights.frustumCulled=false;world.add(highlights);
  const caps=new T.InstancedMesh(new T.SphereGeometry(1,12,8),new T.MeshStandardMaterial({color:0xf7fbff,roughness:1}),tufts.length);caps.name='meadow-snow';caps.frustumCulled=false;caps.receiveShadow=true;caps.visible=false;world.add(caps);
  const capBase=tufts.map(tuft=>{const cap={x:tuft.x,y:.1+tuft.height*.72,z:tuft.z,sx:.12+tuft.height*.55,sy:.05+tuft.height*.14,sz:.1+tuft.height*.48,angle:tuft.angle};dummy.position.set(cap.x,cap.y,cap.z);dummy.rotation.set(-.35,cap.angle,0);dummy.scale.set(cap.sx,cap.sy,cap.sz);dummy.updateMatrix();caps.setMatrixAt(tufts.indexOf(tuft),dummy.matrix);return cap});caps.instanceMatrix.needsUpdate=true;
  const point=new T.Vector3();
  function animate(t){
    time.value=t;
    dewSeeds.forEach((seed,i)=>{
      const h=seed.t;
      point.set(Math.sin(t*1.3+seed.phase)*.09*h*h,h,.36*h*h+.019*Math.sin(Math.PI*h)+Math.cos(t*.9+seed.phase)*.035*h*h).applyMatrix4(seed.matrix);
      dummy.position.copy(point);dummy.rotation.set(0,0,0);dummy.scale.set(seed.radius,seed.radius*.86,seed.radius);dummy.updateMatrix();dew.setMatrixAt(i,dummy.matrix);
      dummy.position.add(new T.Vector3(-seed.radius*.35,seed.radius*.58,seed.radius*.5));dummy.scale.setScalar(seed.radius*.26);dummy.updateMatrix();highlights.setMatrixAt(i,dummy.matrix);
    });
    dew.instanceMatrix.needsUpdate=true;highlights.instanceMatrix.needsUpdate=true;
  }
  animate(0);moving.push(animate);
  flowers.setSnow=c=>{const k=Math.max(0,Math.min(1,c));snowAmount.value=k;dewMaterial.opacity=.76*(1-k);highlights.material.opacity=1-k;caps.visible=k>.02;if(!caps.visible)return;capBase.forEach((cap,i)=>{dummy.position.set(cap.x,cap.y,cap.z);dummy.rotation.set(-.35,cap.angle,0);dummy.scale.set(cap.sx*k,cap.sy*k,cap.sz*k);dummy.updateMatrix();caps.setMatrixAt(i,dummy.matrix)});caps.instanceMatrix.needsUpdate=true};
  return flowers;
}
