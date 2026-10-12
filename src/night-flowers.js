import * as T from 'three';

// Explicit flower tags keep shared yellow/cream materials on the rabbit,
// carrots and scenery from becoming emissive along with the blossoms.
export function luminousPetal(mesh,gain=1){mesh.userData.flowerGlow=gain;return mesh}
export function luminousBloom(group,position,diameter,gain=1){group.userData.flowerBloom={position,diameter,gain};return group}

export function createNightFlowers(world,scene,glowTexture){
  const materials=new Map(),blooms=[];
  world.traverse(object=>{
    const gain=object.userData.flowerGlow;
    if(gain&&object.isMesh){
      const source=object.material,key=`${source.uuid}-${gain}`;
      if(!materials.has(key)){
        const material=source.clone();
        // Preserve the procedural fabric shader when cloning a textile material.
        material.onBeforeCompile=(shader,renderer)=>{
          source.onBeforeCompile.call(material,shader,renderer);
          shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\n totalEmissiveRadiance *= 0.38 + 0.62 * pow(abs(normal.z), 0.65);');
        };
        material.customProgramCacheKey=()=>source.customProgramCacheKey()+'-flower-glow-v1';
        material.emissive.copy(source.color).lerp(new T.Color(0xffdf9b),.84);
        material.emissiveIntensity=0;
        materials.set(key,{material,gain});
      }
      object.material=materials.get(key).material;
    }
    if(object.userData.flowerBloom)blooms.push({object,...object.userData.flowerBloom});
  });
  const group=new T.Group();group.name='starry-garden-flower-lights';scene.add(group);
  const haloMaterial=new T.MeshBasicMaterial({map:glowTexture,color:0xffcf82,transparent:true,opacity:0,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false});
  const halos=new T.InstancedMesh(new T.PlaneGeometry(1,1),haloMaterial,blooms.length);
  halos.name='flower-halos';halos.frustumCulled=false;group.add(halos);
  const moteMaterial=haloMaterial.clone();moteMaterial.color.setHex(0xffe6b2);
  const motes=new T.InstancedMesh(new T.PlaneGeometry(1,1),moteMaterial,blooms.length*2);
  motes.name='flower-pollen-lights';motes.frustumCulled=false;group.add(motes);
  // A few broad, shadowless fill lights hint at warm light on nearby leaves.
  const lights=[[-2.6,1,1.7],[2.5,1,1],[0,2,2.8]].map(([x,y,z])=>{
    const light=new T.PointLight(0xffd69a,0,5,2);light.position.set(x,y,z);group.add(light);return light;
  });
  const dummy=new T.Object3D(),position=new T.Vector3(),scale=new T.Vector3(),tint=new T.Color();
  let amount=0,target=0;
  return {
    setNight(value){target=T.MathUtils.clamp(value,0,1)},
    get transitioning(){return Math.abs(amount-target)>.001},
    update(dt,time,camera){
      amount=T.MathUtils.lerp(amount,target,1-Math.exp(-Math.min(dt,.1)*7));
      if(Math.abs(amount-target)<.001)amount=target;
      group.visible=amount>0;
      const breath=.94+.06*Math.sin(time*.85);
      materials.forEach(({material,gain})=>{material.emissiveIntensity=amount*3.4*gain*breath});
      haloMaterial.opacity=amount*.82;moteMaterial.opacity=amount*.9;
      lights.forEach(light=>{light.intensity=amount*2.2*breath});
      if(!group.visible)return;
      world.updateMatrixWorld(true);
      blooms.forEach((b,i)=>{
        position.fromArray(b.position).applyMatrix4(b.object.matrixWorld);
        b.object.getWorldScale(scale);
        const diameter=b.diameter*1.45*Math.max(scale.x,scale.y,scale.z),pulse=.88+.12*Math.sin(time*1.1+i*2.4);
        dummy.position.copy(position);dummy.quaternion.copy(camera.quaternion);dummy.scale.setScalar(diameter*(.98+.04*pulse));dummy.updateMatrix();halos.setMatrixAt(i,dummy.matrix);
        tint.setScalar(pulse*b.gain);halos.setColorAt(i,tint);
        for(let k=0;k<2;k++){
          const phase=i*2.399+k*2.8+time*.28;
          dummy.position.copy(position).add(new T.Vector3(Math.cos(phase)*diameter*.28,diameter*(.16+.24*(.5+.5*Math.sin(phase*.8))),Math.sin(phase)*diameter*.24));
          dummy.scale.setScalar(diameter*(.038+.018*Math.sin(phase*1.7)**2));dummy.updateMatrix();motes.setMatrixAt(i*2+k,dummy.matrix);
          tint.setScalar((.55+.45*Math.sin(time*.8+i*1.7+k)**2)*b.gain);motes.setColorAt(i*2+k,tint);
        }
      });
      halos.instanceMatrix.needsUpdate=true;halos.instanceColor.needsUpdate=true;
      motes.instanceMatrix.needsUpdate=true;motes.instanceColor.needsUpdate=true;
    }
  };
}
