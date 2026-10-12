import * as T from 'three';
import {createNightFlowers,luminousPetal,luminousBloom} from './night-flowers';
import {addLivingMeadow} from './meadow';
import {createCloudGeometry} from './sky-clouds';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {addRabbit,addBeeCarrot} from './characters';
import {createTextilePalette,decoratePlushGarden} from './textiles';
const C={green:0x6d995e,leaf:0x4e8452,yellow:0xf5c84e,pink:0xeb8da3,cream:0xfff7df,white:0xfffcf0,blue:0x496982,orange:0xee8545};
export function createWorld(el,theme,onReady,hour=theme===1?1:.42){
 const scene=new T.Scene();const night=theme===1;let viewChanged=true;let nightFlowers=null,flowerNight=0;
 const renderer=new T.WebGLRenderer({antialias:true,alpha:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.setClearColor(0xf6f1e3,1);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.3;el.appendChild(renderer.domElement);
 const skyCanvas=document.createElement('canvas');skyCanvas.width=512;skyCanvas.height=512;const skyCtx=skyCanvas.getContext('2d');
 const skyTexture=new T.CanvasTexture(skyCanvas);skyTexture.colorSpace=T.SRGBColorSpace;
 const skyDome=new T.Mesh(new T.SphereGeometry(60,48,24),new T.MeshBasicMaterial({map:skyTexture,side:T.BackSide,depthWrite:false}));
 skyDome.name='sky';skyDome.frustumCulled=false;scene.add(skyDome);
 const skyKeys=[
  {t:0,c:['#f4a57c','#f7c09a','#fbd8b4','#fff1dc','#f6ecdf'],hemi:0xffc9a6,hemiI:1.15,sunC:0xffb56a,sunI:2.05,exp:1.1,at:[-7,4.5]},
  {t:.28,c:['#5aa6e0','#78bcee','#b7daf4','#f3f6ee','#e7f0dc'],hemi:0xfff6e4,hemiI:1.65,sunC:0xfff0d2,sunI:3.3,exp:1.26,at:[-4,10]},
  {t:.48,c:['#3d8fd4','#4f9edc','#7ebbe8','#f4efe2','#e3ecd2'],hemi:0xfff8e5,hemiI:1.9,sunC:0xffedcf,sunI:3.6,exp:1.3,at:[-2,12]},
  {t:.64,c:['#e36a42','#f09458','#f6c08a','#f8d7b0','#f0d2b4'],hemi:0xffb090,hemiI:1.05,sunC:0xff7a45,sunI:1.7,exp:1.12,at:[3,5]},
  {t:.76,c:['#5d7384','#6e8796','#8ea4b0','#c5d0d4','#d5ddd8'],hemi:0xb7c4cc,hemiI:.75,sunC:0x9aa8b0,sunI:.45,exp:1.05,at:[2,7]},
  {t:.80,c:['#6e9fe0','#c9a6e4','#f0b4c6','#f3d27a','#e8f3ea'],hemi:0xffe4d0,hemiI:1.5,sunC:0xffd0a4,sunI:2.15,exp:1.18,at:[-1,9]},
  {t:.88,c:['#e8eef6','#f4f7fb','#f8fafc','#ffffff','#f7f9fc'],hemi:0xf5f8fc,hemiI:1.2,sunC:0xf7fbff,sunI:.9,exp:1.22,at:[1,8]},
  {t:1,c:['#070e26','#0c1c48','#16356e','#1e4e8c','#2a62a4'],hemi:0x8ea0d4,hemiI:.55,sunC:0x8ea6d0,sunI:.32,exp:.92,at:[6,3.2]}
 ];
 const skyStops=[0,.38,.6,.84,1];
 function mixHex(a,b,u){const ch=s=>Math.round(((a>>s)&255)*(1-u)+((b>>s)&255)*u);return (ch(16)<<16)|(ch(8)<<8)|ch(0)}
 function mixCss(a,b,u){return '#'+mixHex(parseInt(a.slice(1),16),parseInt(b.slice(1),16),u).toString(16).padStart(6,'0')}
 const defaultView=theme===0?new T.Vector3(6.5,5.8,14):new T.Vector3(11,9,13);
 const camera=new T.PerspectiveCamera(theme===0?30:34,1,.1,100);camera.position.copy(defaultView);
 const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,theme===0?.85:1.1,0);controls.enableDamping=true;controls.minDistance=9;controls.maxDistance=26;controls.maxPolarAngle=Math.PI/2.12;controls.enablePan=false;
 const skyLight=new T.HemisphereLight(0xfff8e5,0x82957b,theme===0?1.8:2.3);scene.add(skyLight);const sun=new T.DirectionalLight(0xffedcf,theme===0?3.2:4);sun.position.set(-5,12,8);sun.castShadow=true;sun.shadow.mapSize.set(theme===0?1024:2048,theme===0?1024:2048);Object.assign(sun.shadow.camera,{left:-9,right:9,top:9,bottom:-9});sun.shadow.bias=-.0005;sun.shadow.normalBias=.025;sun.shadow.radius=3;if(theme===0)sun.shadow.autoUpdate=false;scene.add(sun);
 const lamp=theme===0?.9:1.12;let skyStuck=false,skyT=hour;const skyR=57.2,sunAnchors=[new T.Vector3(),new T.Vector3(),new T.Vector3()];
 function setSky(value){
  const t=Math.min(1,Math.max(0,value));
  let i=0;while(i<skyKeys.length-2&&t>skyKeys[i+1].t)i++;
  const a=skyKeys[i],b=skyKeys[i+1],u=b.t===a.t?0:(t-a.t)/(b.t-a.t);
  const gradient=skyCtx.createLinearGradient(0,0,0,512);
  skyStops.forEach((stop,index)=>gradient.addColorStop(stop,mixCss(a.c[index],b.c[index],u)));
  skyCtx.fillStyle=gradient;skyCtx.fillRect(0,0,512,512);
  skyTexture.needsUpdate=true;
  const gate=(start,end,fade=.08)=>Math.max(0,Math.min(1,Math.min((t-(start-fade))/fade,((end+fade)-t)/fade)));
  const cloudW=Math.max(gate(0,.66,.1),gate(.7,.82,.05)*.85);
  const sunset=gate(.59,.66,.04),rainW=gate(.70,.74,.035),rbW=gate(.79,.81,.025),snowW=gate(.86,.90,.04),starW=gate(.98,1.08,.06);
  skyT=t;sunPivot.visible=false;flowerNight=starW;nightFlowers?.setNight(starW);
  const cloudOpacity=Math.min(1,Math.max(cloudW*(1-starW),rainW*.92,snowW*.55));
  const warm=Math.max(0,1-t/.4),cloudTint=mixHex(mixHex(mixHex(mixHex(0xfff7ee,0xffc7a4,warm),0xff8d58,sunset*.9),0x9eb0c0,rainW),0xfbfdff,snowW);
  cloudTintHex=cloudTint;cloudMats.forEach(m=>{m.opacity=cloudOpacity;m.color.setHex(cloudTint)});
  clouds.forEach(g=>{
   g.visible=cloudOpacity>.04;const s=g.userData.s*(1+rainW*.06);
   g.scale.set(s,s*.88,s*.72);
   g.userData.weather={rain:rainW,snow:snowW,rainbow:rbW,sunset,star:starW};
  });
  rain.visible=rainW>.04;rainMat.opacity=rainW;snow.visible=snowW>.04;snowMats.forEach(m=>m.opacity=snowW);
  rbGroup.visible=rbW>.04;rbMats.forEach((m,i)=>m.opacity=.8*Math.min(1,Math.max(0,rbW*1.6-i*.1)));applyCover(snowW*snowW*(3-2*snowW));
  starDotMat.opacity=starW;starLineMat.opacity=starW;starGroup.visible=starW>.04;feltClouds.forEach(g=>g.visible=false);
  skyLight.color.setHex(mixHex(a.hemi,b.hemi,u));skyLight.intensity=baseHemiI=(a.hemiI+(b.hemiI-a.hemiI)*u)*lamp;
  sun.color.setHex(mixHex(a.sunC,b.sunC,u));sun.intensity=baseSunI=(a.sunI+(b.sunI-a.sunI)*u)*lamp;
  sun.position.set(a.at[0]+(b.at[0]-a.at[0])*u,a.at[1]+(b.at[1]-a.at[1])*u,8);
  renderer.toneMappingExposure=baseExp=a.exp+(b.exp-a.exp)*u;
  if(theme===0)sun.shadow.needsUpdate=true;
  viewChanged=true;
 }
 const skyFx=new T.Group();skyFx.name='sky-weather';scene.add(skyFx);
 function plain(color,opacity=1,extra){return new T.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,toneMapped:false,side:T.DoubleSide,...extra})}
 function hash(n){const x=Math.sin(n*127.1)*43758.5453;return x-Math.floor(x)}
 function scatter(count,width,depth,lift,height=7,seed=0){return Array.from({length:count},(_,i)=>({x:(hash(i*3+seed)-.5)*width,y:hash(i*3+1+seed)*height+lift,z:(hash(i*3+2+seed)-.5)*depth,s:.6+hash(i*5+seed)*.8,drift:hash(i*7+seed)*6.2}))}
 function sprite(w,h,draw){const cv=document.createElement('canvas');cv.width=w;cv.height=h;draw(cv.getContext('2d'),w,h);const tx=new T.CanvasTexture(cv);tx.colorSpace=T.SRGBColorSpace;return tx}
 const glowTex=sprite(128,128,(c,w)=>{const g=c.createRadialGradient(w/2,w/2,0,w/2,w/2,w/2);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.3,'rgba(255,255,255,.5)');g.addColorStop(.65,'rgba(255,255,255,.12)');g.addColorStop(1,'rgba(255,255,255,0)');c.fillStyle=g;c.fillRect(0,0,w,w)});
 const flakeTex=sprite(64,64,(c,w)=>{const g=c.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.5,'rgba(255,255,255,1)');g.addColorStop(.72,'rgba(214,228,244,.85)');g.addColorStop(1,'rgba(160,185,215,0)');c.fillStyle=g;c.fillRect(0,0,w,w)});
 const crystalTex=sprite(128,128,(c)=>{c.translate(64,64);c.lineCap='round';const arms=(lw,col)=>{c.strokeStyle=col;c.lineWidth=lw;for(let i=0;i<6;i++){c.save();c.rotate(i*Math.PI/3);c.beginPath();c.moveTo(0,0);c.lineTo(0,-50);c.moveTo(0,-26);c.lineTo(-13,-39);c.moveTo(0,-26);c.lineTo(13,-39);c.stroke();c.restore()}};arms(14,'rgba(150,178,212,.55)');arms(7,'#ffffff')});
 const dropTex=sprite(32,128,(c,w,h)=>{const g=c.createLinearGradient(0,0,w,0);g.addColorStop(0,'rgba(120,152,185,0)');g.addColorStop(.25,'rgba(120,152,185,.55)');g.addColorStop(.5,'rgba(255,255,255,1)');g.addColorStop(.75,'rgba(120,152,185,.55)');g.addColorStop(1,'rgba(120,152,185,0)');c.fillStyle=g;c.fillRect(0,0,w,h);c.globalCompositeOperation='destination-in';const v=c.createLinearGradient(0,0,0,h);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(.65,'rgba(0,0,0,.75)');v.addColorStop(.94,'rgba(0,0,0,1)');v.addColorStop(1,'rgba(0,0,0,.4)');c.fillStyle=v;c.fillRect(0,0,w,h)});
 const sunPivot=new T.Group();sunPivot.frustumCulled=false;skyFx.add(sunPivot);
 const sunHalo=new T.Mesh(new T.PlaneGeometry(2.6,2.6),plain(0xffe9a8,.6,{map:glowTex}));sunHalo.position.z=-.02;sunHalo.renderOrder=3;
 const rayMat=plain(0xffd45c,.9);
 const rayShape=new T.Shape();rayShape.moveTo(-.12,0);rayShape.quadraticCurveTo(-.1,.3,0,.56);rayShape.quadraticCurveTo(.1,.3,.12,0);rayShape.closePath();
 const rayGeo=new T.ShapeGeometry(rayShape),sunRays=new T.Group();sunRays.position.z=-.01;
 for(let i=0;i<12;i++){const a=i/12*Math.PI*2,r=new T.Mesh(rayGeo,rayMat);r.position.set(-Math.sin(a)*.8,Math.cos(a)*.8,0);r.rotation.z=a;r.scale.setScalar(i%2?.72:1);r.renderOrder=3;sunRays.add(r)}
 const sunDisc=new T.Mesh(new T.CircleGeometry(.62,40),plain(0xfff7dc,1));sunDisc.renderOrder=3;
 sunPivot.add(sunHalo,sunRays,sunDisc);
 const cloudMats=[],clouds=[],cloudMotion=[];
 const cloudMat=new T.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:1,emissive:0xd6e0eb,emissiveIntensity:.22,transparent:true,depthWrite:false});cloudMats.push(cloudMat);
 const cloudGeometries=Array.from({length:3},(_,i)=>createCloudGeometry(i));
 [2.3,1.8,2.5,1.7].forEach((s,n)=>{
  const g=new T.Group();g.visible=false;g.userData={s,phase:n*1.73,baseRotation:(n%3-1)*.09};skyFx.add(g);clouds.push(g);
  const cloud=new T.Mesh(cloudGeometries[n%3],cloudMat);cloud.name='soft-sky-cloud';cloud.rotation.z=(n%3-1)*.09;g.add(cloud);
  cloudMotion.push(t=>{
   const weather=g.userData.weather||{},rain=weather.rain||0,snow=weather.snow||0,rainbow=weather.rainbow||0;
   const speed=.12+rain*.26+snow*.08+rainbow*.18;
   const anchor=g.userData.anchor||(g.userData.anchor=g.position.clone());
   g.position.x=anchor.x+Math.sin(t*speed+g.userData.phase)*(.035+rain*.12+rainbow*.06);
   g.position.y=anchor.y+Math.sin(t*speed*.7+g.userData.phase)*(.018+rain*.045+snow*.015);
   g.rotation.z=g.userData.baseRotation+Math.sin(t*(.26+rain*.8)+g.userData.phase)*(.012+rain*.04);
   const pulse=1+Math.sin(t*.7+g.userData.phase)*(.012+rainbow*.025);
   g.scale.set(g.userData.s*(1+rain*.06)*pulse,g.userData.s*.88*(1+Math.sin(t*.55+g.userData.phase)*(.01+snow*.018)),g.userData.s*.72);
  });
 });
 const rainSeeds=scatter(150,17,15,.2,6.2),snowSeeds=scatter(80,16,14,.3,6.8),crystalSeeds=scatter(26,16,14,.3,6.8,500);
 const rain=new T.Group(),rainMat=plain(0xdcecfa,0,{map:dropTex});
 const rainDrops=new T.InstancedMesh(new T.PlaneGeometry(.07,.8),rainMat,rainSeeds.length);rainDrops.frustumCulled=false;rainDrops.renderOrder=4;
 const rippleGeo=new T.RingGeometry(.72,1,32);
 const ripples=Array.from({length:18},()=>{const m=new T.Mesh(rippleGeo,plain(0xd6eaf8,0));m.rotation.x=-Math.PI/2;m.visible=false;m.userData.age=1;m.renderOrder=4;return m});
 rain.add(rainDrops,...ripples);skyFx.add(rain);
 const snow=new T.Group(),snowDotMat=plain(0xffffff,0,{map:flakeTex}),snowCrystalMat=plain(0xffffff,0,{map:crystalTex}),snowMats=[snowDotMat,snowCrystalMat];
 const snowDots=new T.InstancedMesh(new T.PlaneGeometry(.34,.34),snowDotMat,snowSeeds.length),snowCrystals=new T.InstancedMesh(new T.PlaneGeometry(.46,.46),snowCrystalMat,crystalSeeds.length);
 snowDots.frustumCulled=snowCrystals.frustumCulled=false;snowDots.renderOrder=snowCrystals.renderOrder=4;snow.add(snowDots,snowCrystals);skyFx.add(snow);
 const starGroup=new T.Group();skyFx.add(starGroup);const feltClouds=[];
 const starPin=sprite(32,32,(c,w)=>{const g=c.createRadialGradient(16,16,0,16,16,15);g.addColorStop(0,'#fff');g.addColorStop(.22,'#fff');g.addColorStop(.4,'rgba(255,255,255,.55)');g.addColorStop(.7,'rgba(255,255,255,.08)');g.addColorStop(1,'rgba(255,255,255,0)');c.fillStyle=g;c.fillRect(0,0,w,w)});
 const starDotMat=plain(0xfffef8,0,{map:starPin,blending:T.AdditiveBlending});
 const starN=9000,starDots=new T.InstancedMesh(new T.PlaneGeometry(1,1),starDotMat,starN),starAnchor=new T.Object3D(),starCol=new T.Color();
 for(let n=0;n<starN;n++){const y=Math.max(-1,Math.min(1,1-(n+.5)/starN*2+(hash(n+2)-.5)*.05)),ring=Math.sqrt(Math.max(0,1-y*y)),theta=2.399963229728653*n+(hash(n+4)-.5)*.9,rad=skyR*(.988+hash(n)*.016);starAnchor.position.set(Math.cos(theta)*ring*rad,y*rad,Math.sin(theta)*ring*rad);starAnchor.up.set(0,1,0);starAnchor.lookAt(0,0,0);const bright=hash(n+8);const sz=bright>.94?.95+hash(n+5)*.35:bright>.72?.55+hash(n+6)*.22:.34+hash(n+7)*.16;starAnchor.scale.set(sz,sz,1);starAnchor.updateMatrix();starDots.setMatrixAt(n,starAnchor.matrix);starCol.set(bright>.94?'#fffef4':bright>.72?'#f7f9ff':'#d5def2');starDots.setColorAt(n,starCol)}
 starDots.instanceMatrix.needsUpdate=true;if(starDots.instanceColor)starDots.instanceColor.needsUpdate=true;starDots.frustumCulled=false;starDots.renderOrder=2;starGroup.add(starDots);
 const starLineMat=plain(0xfffef8,0,{map:starPin,blending:T.AdditiveBlending}),starLineN=46,starLine=new T.InstancedMesh(new T.PlaneGeometry(1,1),starLineMat,starLineN);
 starLine.frustumCulled=false;starLine.renderOrder=2;starGroup.add(starLine);
 let baseHemiI=1,baseSunI=1,baseExp=1.3,cloudTintHex=0xffffff,lastFlash=0;
 const rbGroup=new T.Group();rbGroup.visible=false;skyFx.add(rbGroup);
 const rbCols=[0xff6b6b,0xff9f4a,0xffd95a,0x7ed68c,0x6cc4ea,0x7b8ee6,0xb78be3];
 const rbMats=rbCols.map(c=>plain(c,0,{vertexColors:true}));
 function rbGeo(r0,r1){const g=new T.RingGeometry(r0,r1,72,1,0,Math.PI),p=g.attributes.position,col=new Float32Array(p.count*4);for(let i=0;i<p.count;i++){const k=Math.min(1,Math.max(0,Math.sin(Math.atan2(p.getY(i),p.getX(i)))*3.4));col.set([1,1,1,k*k*(3-2*k)],i*4)}g.setAttribute('color',new T.BufferAttribute(col,4));return g}
 rbCols.forEach((c,i)=>{const m=new T.Mesh(rbGeo(3.35-(i+1)*.26,3.35-i*.26+.012),rbMats[i]);m.renderOrder=-1;rbGroup.add(m)});
 const snowLayer=new T.Group();snowLayer.visible=false;skyFx.add(snowLayer);
 const snowShade=new T.MeshStandardMaterial({color:0xf7fbff,roughness:1});const snowCapGeo=new T.SphereGeometry(1,16,12);
 const snowParts=[],floes=[];
 function snowMesh(geo,x,y,z,sx,sy,sz,mode){const m=new T.Mesh(geo,snowShade);m.position.set(x,y,z);m.receiveShadow=true;snowLayer.add(m);snowParts.push({m,sx,sy,sz,mode});return m}
 {
  const ball=new T.SphereGeometry(1,20,14);
  if(theme===0){
   const slabGeo=new T.CylinderGeometry(5,5.1,.14,64);slabGeo.translate(0,.07,0);
   snowMesh(slabGeo,0,.1,0,1.06,1,1.06,'y');
   for(let i=0;i<64;i++){const a=hash(i*5+900)*6.283,r=Math.sqrt(hash(i*5+901))*4.7,s=.28+hash(i*5+902)*.38;snowMesh(ball,Math.cos(a)*r,.2,Math.sin(a)*r,s,s*(.3+hash(i*5+903)*.15),s,'all')}
  }else{
   if(theme===1)snowMesh(ball,2.6,.57,1.15,1.45,.09,1,'all');else snowMesh(ball,1.8,.575,1.6,1.08,.08,1.08,'all');
   const keep=theme===1?[[2.6,1.15,2.3],[-.6,1.4,2.3]]:[[1.8,1.6,1.8],[-1.9,.8,1.5],[2.7,-2.2,1.5],[-2,-2.3,2.2],[-3.6,-2.8,1.5]];
   const floeGeo=new T.CylinderGeometry(1,.94,.08,24);
   for(let i=0,n=0;n<9&&i<80;i++){
    const a=hash(i*5+910)*6.283,r=2.2+hash(i*5+911)*2.6,x=Math.cos(a)*r,z=Math.sin(a)*r;
    if(keep.some(k=>Math.hypot(x-k[0],z-k[1])<k[2]))continue;
    const s=.3+hash(i*5+912)*.3,m=snowMesh(floeGeo,x,.13,z,s,1,s*(.8+hash(i*5+913)*.3),'all');m.rotation.y=hash(i*5+914)*3;floes.push({m,ph:hash(i*5+915)*6.28});n++;
   }
  }
 }
 const plantCaps=[];let meadowSnow=null;
 function plantCap(parent,x,y,z,sx,sy,sz){const m=new T.Mesh(snowCapGeo,snowShade);m.position.set(x,y,z);m.scale.set(0,0,0);m.receiveShadow=true;parent.add(m);plantCaps.push({m,sx,sy,sz});return m}
 function applyCover(c){snowLayer.visible=c>.02;snowParts.forEach(({m,sx,sy,sz,mode})=>m.scale.set(mode==='y'?sx:sx*c,sy*c,mode==='y'?sz:sz*c));plantCaps.forEach(({m,sx,sy,sz})=>{m.visible=c>.02;m.scale.set(sx*c,sy*c,sz*c)});meadowSnow?.(c)}
 const bolt=new T.Group();bolt.visible=false;skyFx.add(bolt);
 const boltCoreMat=plain(0xffffff,0),boltGlowMat=plain(0xb9ccff,0,{blending:T.AdditiveBlending}),boltFlareMat=plain(0xcfdcff,0,{map:glowTex,blending:T.AdditiveBlending});
 const boltCore=new T.Mesh(new T.BufferGeometry(),boltCoreMat),boltGlow=new T.Mesh(new T.BufferGeometry(),boltGlowMat),boltFlare=new T.Mesh(new T.PlaneGeometry(1,1),boltFlareMat);
 boltCore.renderOrder=boltGlow.renderOrder=boltFlare.renderOrder=5;boltCore.frustumCulled=boltGlow.frustumCulled=false;
 bolt.add(boltGlow,boltCore,boltFlare);
 function jag(a,b,off,depth,out){if(depth<=0){out.push(b);return}const m=[(a[0]+b[0])/2+(Math.random()-.5)*off,(a[1]+b[1])/2+(Math.random()-.5)*off*.35];jag(a,m,off*.55,depth-1,out);jag(m,b,off*.55,depth-1,out)}
 function ribbon(paths,w){
  const pos=[],idx=[];
  paths.forEach(path=>{const n=path.length,base=pos.length/3;
   for(let i=0;i<n;i++){const a=path[Math.max(0,i-1)],b=path[Math.min(n-1,i+1)];let dx=b[0]-a[0],dy=b[1]-a[1];const l=Math.hypot(dx,dy)||1;dx/=l;dy/=l;const k=w*(path.taper?1-.55*i/(n-1):1)*(path.w||1);pos.push(path[i][0]-dy*k,path[i][1]+dx*k,0,path[i][0]+dy*k,path[i][1]-dx*k,0)}
   for(let i=0;i<n-1;i++){const o=base+i*2;idx.push(o,o+1,o+2,o+1,o+3,o+2)}
  });
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setIndex(idx);return g;
 }
 function makeBolt(x0,y0,x1,y1){
  const main=[[0,y0]];jag([0,y0],[x1-x0,y1],4.6,5,main);main.taper=true;const paths=[main];
  for(let k=0;k<4;k++){const i=6+Math.floor(Math.random()*(main.length-14)),s=main[i],dir=Math.random()<.5?-1:1,e=[s[0]+dir*(2.4+Math.random()*3.4),s[1]-(2.8+Math.random()*4.2)],br=[s];jag(s,e,1.8,3,br);br.taper=true;br.w=.62;paths.push(br)}
  boltCore.geometry.dispose();boltGlow.geometry.dispose();boltCore.geometry=ribbon(paths,.18);boltGlow.geometry=ribbon(paths,.72);
  boltFlare.position.set(x1-x0,y1,.02);boltFlare.scale.setScalar(8);
 }
 let nextStrike=1.2,strikeT=-9,strikeAmp=0,strikeBolt=false;
 function lightningStep(t){
  if(rain.visible&&rainMat.opacity>.6&&t>=nextStrike){
   nextStrike=t+2.2+Math.random()*4.5;strikeT=t;strikeAmp=.6+Math.random()*.4;strikeBolt=Math.random()<.7;
   if(strikeBolt){const pool=clouds.filter(g=>g.visible),g=pool[Math.floor(Math.random()*pool.length)];if(!g)strikeBolt=false;else{const x0=g.position.x+(Math.random()-.5)*2.4,z=g.position.z,y0=g.position.y-.6,x1=x0+(Math.random()-.5)*7;makeBolt(x0,y0,x1,y0-(14+Math.random()*6));bolt.position.set(x0,0,z)}}
  }
  const a=t-strikeT,e=a<0?0:a<.07?1:a<.12?.2:a<.2?.9:Math.max(0,1-(a-.2)/.45),flash=e*strikeAmp;
  bolt.visible=strikeBolt&&e>0;
  if(bolt.visible){bolt.rotation.y=Math.atan2(camera.position.x-bolt.position.x,camera.position.z-bolt.position.z);boltCoreMat.opacity=Math.min(1,e*1.2);boltGlowMat.opacity=e*.55;boltFlareMat.opacity=e*.9}
  if(flash>0||lastFlash>0){
   skyLight.intensity=baseHemiI+flash*2.2;sun.intensity=baseSunI+flash*2.5;renderer.toneMappingExposure=baseExp+flash*.3;
   skyDome.material.color.setScalar(1+flash*.9);cloudMat.color.setHex(cloudTintHex).multiplyScalar(1+flash*.8);
  }
  lastFlash=flash;
 }
 const dummy=new T.Object3D(),q1=new T.Quaternion(),q2=new T.Quaternion(),zAxis=new T.Vector3(0,0,1),slant=new T.Quaternion().setFromAxisAngle(zAxis,.14);let lastT=0,rippleI=0;
 function put(m,i,x,y,z,sx,sy,q){dummy.position.set(x,y,z);dummy.quaternion.copy(q);dummy.scale.set(sx,sy,1);dummy.updateMatrix();m.setMatrixAt(i,dummy.matrix)}
 function splash(x,z){if(Math.random()>.4)return;const m=ripples[rippleI++%ripples.length];m.position.set(x,.21,z);m.userData.age=0;m.scale.setScalar(.05);m.visible=true}
 function tickWeather(t){
  const dt=Math.min(.1,Math.max(0,t-lastT));lastT=t;const cq=camera.quaternion;
  lightningStep(t);
  if(rbGroup.visible){const cx=camera.position.x,cz=camera.position.z,l=Math.hypot(cx,cz)||1;rbGroup.position.set(-cx/l*5.2,.85,-cz/l*5.2);rbGroup.rotation.y=Math.atan2(cx-rbGroup.position.x,cz-rbGroup.position.z)}
  if(snowLayer.visible)floes.forEach(f=>{f.m.position.y=.13+Math.sin(t*1.1+f.ph)*.012;f.m.rotation.y+=dt*.05});
  if(sunPivot.visible){sunRays.rotation.z=t*.12;sunHalo.scale.setScalar(1+Math.sin(t*.9)*.035)}
  if(rain.visible){
   q1.copy(cq).multiply(slant);
   rainSeeds.forEach((p,i)=>{
    p.y-=9.5*p.s*dt;p.x+=1.3*p.s*dt;
    const inside=p.x*p.x+p.z*p.z<25;
    if(p.y<(inside?.2:-4)){if(inside)splash(p.x,p.z);p.y=6+Math.random()*.7;p.x=(Math.random()-.5)*17-1.2;p.z=(Math.random()-.5)*15}
    put(rainDrops,i,p.x,p.y,p.z,1,p.s,q1);
   });
   rainDrops.instanceMatrix.needsUpdate=true;
   ripples.forEach(m=>{if(!m.visible)return;m.userData.age+=dt;const k=m.userData.age/.8;if(k>=1){m.visible=false;return}m.scale.setScalar(.06+.42*(1-(1-k)*(1-k)));m.material.opacity=.7*(1-k)*rainMat.opacity});
  }
  if(snow.visible){
   const fall=(mesh,seeds,spin)=>{
    seeds.forEach((p,i)=>{
     p.y-=.95*p.s*dt;p.x+=(Math.sin(t*.8+p.drift)*.5+.2)*dt*p.s;p.z+=Math.cos(t*.55+p.drift*1.7)*.3*dt;
     const inside=p.x*p.x+p.z*p.z<30,floor=inside?.24:-3.5;
     if(p.y<floor){p.y=6.8+Math.random()*.5;p.x=(Math.random()-.5)*16;p.z=(Math.random()-.5)*14}
     const sc=p.s*Math.min(1,Math.max(0,(p.y-floor)/(inside?.9:1.5)));
     if(spin){q2.setFromAxisAngle(zAxis,t*(.4+p.s*.3)*(i%2?1:-1)+p.drift);q1.copy(cq).multiply(q2)}else q1.copy(cq);
     put(mesh,i,p.x,p.y,p.z,sc,sc,q1);
    });
    mesh.instanceMatrix.needsUpdate=true;
   };
   fall(snowDots,snowSeeds,false);fall(snowCrystals,crystalSeeds,true);
  }
 }

 setSky(hour);
 const world=new T.Group();scene.add(world);const moving=[tickWeather,...cloudMotion];const mats=new Map();const textiles=theme===0?createTextilePalette():null;
 const denimColors=new Set([0x355a80,0x2e5075,0x9eb0bc]);const plushColors=new Set([0xfffcf3,0xfffcf0,0xf5d273]);
 function mat(color){if(!mats.has(color))mats.set(color,textiles?textiles.get(color,denimColors.has(color)?'denim':plushColors.has(color)?'plush':'felt'):new T.MeshStandardMaterial({color,roughness:.8}));return mats.get(color)}
 function mesh(g,color,parent=world,x=0,y=0,z=0){const m=new T.Mesh(g,mat(color));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m}
 function ball(p,c,x,y,z,sx,sy=sx,sz=sx){const m=mesh(new T.SphereGeometry(1,24,16),c,p,x,y,z);m.scale.set(sx,sy,sz);return m}
 function box(p,c,x,y,z,w,h,d){return mesh(new T.BoxGeometry(w,h,d),c,p,x,y,z)}
 function cyl(p,c,x,y,z,r,h,r2=r){return mesh(new T.CylinderGeometry(r2,r,h,48),c,p,x,y,z)}
 function group(x=0,y=0,z=0){const g=new T.Group();g.position.set(x,y,z);world.add(g);return g}
 function label(text,w,h){const cv=document.createElement('canvas');cv.width=1024;cv.height=256;const ctx=cv.getContext('2d');ctx.fillStyle='#fff8df';ctx.textAlign='center';ctx.textBaseline='middle';let size=108;ctx.font=`900 ${size}px sans-serif`;while(size>40&&ctx.measureText(text).width>960){size-=4;ctx.font=`900 ${size}px sans-serif`}ctx.fillText(text,512,128);const tx=new T.CanvasTexture(cv);const m=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:tx,transparent:true,side:T.DoubleSide}));return m}
 cyl(world,night?0x54618c:theme===0?0xd4bf9d:0xb3ba89,0,-.32,0,5.4,.65);cyl(world,night?0x487d9e:theme===2?0x80bfc5:0x66a64e,0,.02,0,5.36,.16);
 // sculpted pebble edge
 for(let i=0;i<55;i++){const a=i/55*Math.PI*2;ball(world,night?0x7a87ae:0xe1d4b3,Math.cos(a)*5.1,.17,Math.sin(a)*5.1,.19,.13,.17)}
 function flower(x,z,size=1,color=C.pink){const g=group(x,.16,z);g.scale.setScalar(size);cyl(g,C.leaf,0,.48,0,.045,.85);const leaf=ball(g,C.green,.17,.35,0,.23,.065,.12);leaf.rotation.z=.5;for(let i=0;i<5;i++){const a=i*Math.PI*2/5;luminousPetal(ball(g,color,Math.cos(a)*.23,1+Math.sin(a)*.23,0,.19,.19,.095))}luminousPetal(ball(g,C.yellow,0,1,.1,.14,.14,.08),1.2);luminousBloom(g,[0,1,.06],1.6);plantCap(g,0,1.02,.02,.58,.36,.52);plantCap(g,.16,.42,0,.26,.09,.16);moving.push(t=>{g.rotation.z=Math.sin(t*1.2+x)*.065});return g}
 function bush(x,z,s=1){const g=group(x,.15,z);for(let i=0;i<5;i++)ball(g,i%2?C.green:C.leaf,Math.sin(i*2.3)*.4,.35+i%2*.2,Math.cos(i*2.3)*.3,.52,.55,.5).name='felt-shrub';plantCap(g,0,.82,0,.9,.32,.78);plantCap(g,.12,.5,.08,.55,.18,.48);g.scale.setScalar(s);return g}
 function rabbit(x,z,scale=1){return addRabbit(world,moving,mat,x,z,scale,theme)}
 function carrot(x,z){const g=group(x,.24,z);ball(g,C.orange,0,.45,0,.43,.47,.4);for(let i=0;i<3;i++){const leaf=ball(g,C.leaf,(i-1)*.17,.96,0,.13,.3,.11);leaf.rotation.z=(1-i)*.4}for(const s of [-1,1]){ball(g,C.white,s*.15,.52,.36,.1,.14,.04);ball(g,0x30312d,s*.15,.52,.397,.05,.075,.022)}ball(g,0x30312d,0,.3,.39,.08,.03,.02);moving.push(t=>{g.rotation.z=Math.sin(t*1.7+z)*.09});return g}
 function bee(x,y,z){const g=group(x,y,z);ball(g,C.yellow,0,0,0,.3,.29,.44);for(const k of [-.18,.12]){const stripe=cyl(g,0x554431,0,0,k,.3,.09);stripe.rotation.x=Math.PI/2}for(const s of [-1,1]){ball(g,0xfff8ed,s*.28,.2,0,.24,.08,.33);ball(g,0x302c29,s*.1,.07,.4,.045)}moving.push(t=>{g.position.y=y+Math.sin(t*2+x)*.23;g.position.x=x+Math.sin(t*.8)*.4;g.rotation.z=Math.sin(t*5)*.12})}
 function arch(){const g=group(0,.16,-1.8);mesh(new T.TorusGeometry(1.85,.24,20,56,Math.PI),C.leaf,g,0,1.55,0);for(const s of [-1,1])cyl(g,C.leaf,s*1.85,.8,0,.24,1.6);const l=label('STAYREAL',2.6,.55);l.position.set(0,2.65,.26);g.add(l);const colors=[C.pink,C.yellow,C.white,0xf3b7c8,0xffd56a];for(let i=0;i<13;i++){const a=(i+.5)/13*Math.PI,blossom=new T.Group(),color=colors[i%colors.length];blossom.position.set(Math.cos(a)*2.02,1.55+Math.sin(a)*2.02,.22);blossom.scale.setScalar(.55);g.add(blossom);for(let p=0;p<5;p++){const ang=p/5*Math.PI*2,petal=ball(blossom,color,Math.cos(ang)*.2,Math.sin(ang)*.2,.02,.085,.2,.045);petal.rotation.z=ang-Math.PI/2;luminousPetal(petal)}luminousPetal(ball(blossom,0xfff1b8,0,0,.06,.095,.095,.05),1.15);luminousBloom(blossom,[0,0,.04],1.1);plantCap(blossom,0,.02,.06,.64,.32,.56)}}
 function fence(x,z,n=5){const g=group(x,.12,z);for(let i=0;i<n;i++){box(g,C.cream,i*.43,.48,0,.14,.9,.13);const cap=mesh(new T.ConeGeometry(.105,.16,4),C.cream,g,i*.43,.99,0);cap.rotation.y=Math.PI/4}box(g,C.cream,(n-1)*.215,.35,0,n*.43,.09,.09);box(g,C.cream,(n-1)*.215,.7,0,n*.43,.09,.09)}
 function cloud(x,y,z){const g=group(x,y,z);feltClouds.push(g);for(let i=0;i<4;i++)ball(g,night?0xa0a5cc:C.white,(i-1.5)*.4,Math.sin(i)*.13,0,.45,.25,.25).name='felt-cloud';moving.push(t=>{
   const weather=g.userData.weather||{};
   const rain=weather.rain||0,snow=weather.snow||0,rainbow=weather.rainbow||0,sunset=weather.sunset||0;
   const speed=.18+rain*.32+snow*.10+rainbow*.22;
   const bob=Math.sin(t*speed+g.userData.phase)*(.035+rain*.08+snow*.025);
   g.position.x=x+Math.sin(t*speed+x+g.userData.phase)*(.18+rain*.30+rainbow*.18);
   g.position.y=y+bob;
   g.rotation.z=g.userData.baseRotation+Math.sin(t*(.32+rain*.8)+g.userData.phase)*(.018+rain*.055);
   const pulse=1+Math.sin(t*.7+g.userData.phase)*(.018+rainbow*.035);
   g.scale.x*=pulse;g.scale.y*=1+Math.sin(t*.55+g.userData.phase)*(.012+snow*.025);
  })}
 function boat(x,z,large=false){const g=group(x,.42,z);const hull=ball(g,large?0x253e68:0xb76f3e,0,0,0,large?1.8:1.1,.35,large?.85:.48);box(g,C.cream,0,.35,0,large?3:1.75,.18,large?1.3:.75);box(g,large?C.cream:0xc99755,0,.65,-.08,large?2.15:1.1,.5,large?.85:.65);box(g,large?C.yellow:0xdaa343,0,.97,0,large?2.4:1.4,.12,large?1:.8);for(let i=0;i<5;i++)box(g,0x477a96,(i-2)*(large?.4:.21),.7,large?.46:.34, .13,.21,.7); // windows
 moving.push(t=>{g.position.y=.43+Math.sin(t*1.2+x)*.09;g.rotation.z=Math.sin(t*1.3)*.035;g.position.x=x+Math.sin(t*.3)*.23});return g}
 if(theme===0){
 arch();rabbit(.65,1.2,1.22);world.traverse(o=>{if(o.name==='garden-iris'){plantCap(o,-.18,2.12,.06,.72,.28,.62);plantCap(o,-.12,1.45,0,.14,.08,.12);plantCap(o,-.16,1.85,0,.16,.08,.12)}});addBeeCarrot(world,moving,mat,-1.35,1.8);bee(-2.8,2.7,.3);bee(3,3,-1);
 const meadowFlowers=addLivingMeadow(world,moving);meadowSnow=meadowFlowers.setSnow;for(const seed of meadowFlowers)flower(seed.x,seed.z,seed.size,seed.color);
 for(let i=0;i<56;i++){const a=i*2.399;const r=3.4+(i%4)*.30;flower(Math.cos(a)*r,Math.sin(a)*r,.38+(i%4)*.10,[C.pink,C.yellow,C.white,0xdd7756][i%4])}
 for(const p of [[-3.5,-1],[3,-2],[0,-3.8],[-3,2.3]])bush(...p);
 fence(-1.4,-3.7,8);fence(2.5,-2.7,4);
 const path=mesh(new T.CylinderGeometry(1.4,1.4,.025,48),0xe5d4b0,world,.4,.125,1.1);path.scale.set(1,1,1.5);
 const sign=group(2.8,.2,1.4);box(sign,0xc59253,0,.65,0,1.5,.95,.12);box(sign,0x475447,0,.67,.075,1.32,.78,.02);const l=label('have a mojo day!',1.18,.32);l.position.set(0,.7,.1);sign.add(l);for(const s of [-1,1])box(sign,0xc59253,s*.52,.23,0,.09,.5,.1);
 const cart=group(3,.4,-.9);box(cart,0xb89261,0,.32,0,1.25,.55,.75);for(let i=0;i<3;i++)box(cart,0xcda774,0,.12+i*.18,.40,1.3,.13,.045);for(const s of [-1,1]){const w=cyl(cart,0x6e5138,s*.7,0,0,.27,.12);w.rotation.z=Math.PI/2;const hub=cyl(cart,0xb89261,s*.78,0,0,.12,.13);hub.rotation.z=Math.PI/2}box(cart,0xb89261,.96,.3,0,.8,.065,.09);for(let i=0;i<6;i++){const f=flower(2.6+i*.16,-.9+(i%2)*.18,.47,[C.yellow,C.pink,C.white][i%3]);f.position.y=.78}
 } else if(theme===1){
 // The seated bunny rests on a pier, matching the poster's river terrace.
 box(world,0xa6acb7,2.6,.29,1.15,2.9,.45,1.95);box(world,C.cream,2.6,.525,1.15,3.02,.08,2.04);
 for(let i=0;i<8;i++)cyl(world,C.cream,1.25+i*.38,.84,.25,.035,.55);
 box(world,C.cream,2.58,1.12,.25,2.8,.055,.055);box(world,C.cream,2.58,.79,.25,2.8,.035,.035);
 rabbit(2.3,1.2,.86);const pierCarrot=carrot(3.6,1.6);pierCarrot.position.y=.60;boat(-.6,1.4,true);const moon=ball(world,C.yellow,.8,4.5,-3.3,1.62,1.62,.36);for(let i=0;i<8;i++)ball(world,0xe7b848,.8+Math.sin(i*2.4)*1.2,4.5+Math.cos(i*2.4)*1.2,-2.95,.14+(i%3)*.05,.14,.025);
 const tower=group(-3,.12,-2);cyl(tower,C.cream,0,2,0,.17,4);for(const y of [1,2.8,4]){ball(tower,0xc76c95,0,y,0,y===2.8?.65:.4,.38,y===2.8?.65:.4);cyl(tower,0x656494,0,y-.05,0,y===2.8?.66:.41,.14)}cyl(tower,C.cream,0,4.7,0,.06,1.2);ball(tower,C.yellow,0,5.32,0,.09);
 for(let i=0;i<8;i++){const x=-1.9+i*.7;const h=.7+(i*7%5)*.32;box(world,[0x526d9e,0x6588ab,0x7270a0][i%3],x,h/2,-3.2,.48,h,.55);for(let k=0;k<3;k++)box(world,C.yellow,x,h*.25+k*.25,-2.91,.09,.1,.02)}
 for(let i=0;i<18;i++){const a=i*2.4;ball(world,C.yellow,Math.cos(a)*4.1,2.6+(i%5)*.6,-2-Math.sin(a),.045)}
 for(let i=0;i<18;i++){const ring=mesh(new T.TorusGeometry(.22+(i%3)*.1,.012,5,32),0xb6d9da,world,Math.sin(i*4)*4.3,.16,Math.cos(i*4)*4.1);ring.rotation.x=Math.PI/2;moving.push(t=>{ring.scale.setScalar(1+Math.sin(t+i)*.2)})}
 }else{
 // Cream stone landing supports the lakeside sitting pose.
 cyl(world,0xd7c4a5,1.8,.30,1.6,1.15,.45);cyl(world,0xecdbc0,1.8,.535,1.6,1.18,.06);
 for(let i=0;i<7;i++){const a=i*.9;ball(world,0xf5e8d0,1.8+Math.cos(a)*.89,.575,1.6+Math.sin(a)*.89,.12,.014,.09)}
 rabbit(1.8,1.6,1);carrot(.3,2.4);boat(-1.9,.8);boat(2.7,-2.2);
 const bridge=group(-2,.2,-2.3);const arc=mesh(new T.TorusGeometry(1.1,.2,10,40,Math.PI),0xe9d5b3,bridge,0,0,0);arc.scale.set(1.7,1,1);for(let i=0;i<13;i++){const x=(i-6)*.28;const y=Math.sqrt(Math.max(0,1-(x/1.85)**2));box(bridge,C.cream,x,y+.33,.2,.075,.45,.08)}
 const pagoda=group(-3.6,.2,-2.8);for(let i=0;i<5;i++){const w=1.15-i*.15;box(pagoda,0xf1d3ab,0,.25+i*.48,0,w,.4,w);const roof=mesh(new T.ConeGeometry(w*.87,.32,4),0x967495,pagoda,0,.53+i*.48,0);roof.rotation.y=Math.PI/4}cyl(pagoda,C.yellow,0,2.9,0,.04,.55);
 for(let i=0;i<18;i++){const a=i*2.4,r=3.4+(i%3)*.35;const x=Math.cos(a)*r,z=Math.sin(a)*r;const leaf=cyl(world,C.green,x,.21,z,.43,.045);plantCap(leaf,0,.08,0,.42,.045,.42);if(i%2===0)flower(x,z,.55,C.pink);moving.push(t=>{leaf.position.y=.22+Math.sin(t+i)*.025})}
 const balloon=group(3.1,4.3,-1.8);ball(balloon,C.yellow,0,.4,0,.63,.84,.63);for(const s of [-1,1])cyl(balloon,0xb39756,s*.3,-.5,0,.018,.75);box(balloon,0xcf9345,0,-.95,0,.62,.4,.5);const l=label('DREAM',.85,.25);l.position.set(0,.4,.61);balloon.add(l);moving.push(t=>{balloon.position.y=4.3+Math.sin(t*.7)*.22;balloon.rotation.z=Math.sin(t*.5)*.08});
 for(const p of [[-4,1],[3.8,1],[.3,-4]])bush(...p,.7);
 }
 cloud(-3.7,theme===0?3.8:4.5,-2.7);cloud(3.7,theme===0?4.1:5,-3.7);setSky(hour);
 if(theme===0){decoratePlushGarden(world);nightFlowers=createNightFlowers(world,scene,glowTex);nightFlowers.setNight(flowerNight)}
 const clock=new T.Clock();let raf;let paused=false;let lastRender=-1,lastShadow=-1,time=0;
 controls.addEventListener('change',()=>{viewChanged=true});
 const skyDir=new T.Vector3(),skyRight=new T.Vector3(),skyUp=new T.Vector3();
 function skyPoint(rx,uy,target){camera.getWorldDirection(skyDir);skyRight.crossVectors(skyDir,camera.up).normalize();skyUp.crossVectors(skyRight,skyDir).normalize();skyDir.addScaledVector(skyRight,rx).addScaledVector(skyUp,uy).normalize();const bb=camera.position.dot(skyDir),tp=-bb+Math.sqrt(Math.max(0,bb*bb-(camera.position.lengthSq()-skyR*skyR)));return target.copy(camera.position).addScaledVector(skyDir,tp)}
 function stickSky(){if(skyStuck||el.clientWidth<2)return;skyStuck=true;controls.update();[[-.26,.17],[.04,.20],[.27,.15],[-.34,.02]].forEach(([rx,uy],i)=>{if(!clouds[i])return;skyPoint(rx,uy,clouds[i].position);clouds[i].lookAt(0,0,0)});for(let i=0;i<starLineN;i++){const main=i<32,u=main?i/31:(i-32)/13,rx=main?-.55+Math.pow(u,.85)*.95+(hash(i+3)-.5)*.04:.08+u*.22,uy=main?.04+u*.13+Math.sin(u*Math.PI)*.045+(hash(i+9)-.5)*.016:.16-u*.08+(hash(i+5)-.5)*.014;skyPoint(rx,uy,starAnchor.position);starAnchor.up.set(0,1,0);starAnchor.lookAt(0,0,0);const sz=.5+hash(i+80)*.34+(main&&u>.35&&u<.6?.2:0);starAnchor.scale.set(sz,sz,1);starAnchor.updateMatrix();starLine.setMatrixAt(i,starAnchor.matrix)}starLine.instanceMatrix.needsUpdate=true;setSky(skyT)}
 function resize(){const w=el.clientWidth,h=el.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.zoom=Math.min(1,camera.aspect/(theme===0?1.45:1.0));camera.updateProjectionMatrix();stickSky();viewChanged=true}
 const ro=new ResizeObserver(resize);ro.observe(el);resize();
 function render(){raf=requestAnimationFrame(render);const dt=clock.getDelta();if(!paused)time+=dt;controls.update();
   if((!paused||viewChanged||nightFlowers?.transitioning)&&clock.elapsedTime-lastRender>=1/30){
     moving.forEach(f=>f(time));
     nightFlowers?.update(lastRender<0?dt:clock.elapsedTime-lastRender,time,camera);
     if(theme===0&&(lastShadow<0||time-lastShadow>.25)){sun.shadow.needsUpdate=true;lastShadow=time}
     renderer.render(scene,camera);lastRender=clock.elapsedTime;viewChanged=false;
   }
 }
 render();onReady?.();return {pause(v){paused=v;viewChanged=true},setSky,reset(){camera.position.copy(defaultView);controls.target.set(0,theme===0?.85:1.1,0);controls.update();viewChanged=true},zoom(f){camera.position.sub(controls.target).multiplyScalar(f).add(controls.target);viewChanged=true},dispose(){cancelAnimationFrame(raf);ro.disconnect();controls.dispose();const geometries=new Set(),materials=new Set(),textures=new Set();scene.traverse(o=>{if(o.isInstancedMesh)o.dispose();if(o.isSkinnedMesh)o.skeleton.dispose();if(o.geometry)geometries.add(o.geometry);if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m))});materials.forEach(m=>{Object.values(m).forEach(v=>{if(v?.isTexture)textures.add(v)});m.dispose()});textures.forEach(t=>t.dispose());geometries.forEach(g=>g.dispose());mats.forEach(m=>{if(!materials.has(m))m.dispose()});textiles?.disposeUnused(materials);renderer.dispose();renderer.domElement.remove()}};
}
