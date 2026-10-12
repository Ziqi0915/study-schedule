import * as T from 'three';
import {luminousPetal,luminousBloom} from './night-flowers';
import {TessellateModifier} from 'three/addons/modifiers/TessellateModifier.js';
import {mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {addRabbitHead} from './rabbit-head';
import {RABBIT_SHOULDER,createRabbitShirtGeometry,rabbitShirtFront,createRabbitTrouserGeometry,rabbitTrouserFront} from './rabbit-body';
import {finishTextile} from './textiles';

// Shared sculpted characters with physical mascot proportions.
function sculpt(parent, mat) {
  function mesh(geometry, color, x=0, y=0, z=0, p=parent) {
    const m=new T.Mesh(geometry,mat(color));m.position.set(x,y,z);
    m.castShadow=true;m.receiveShadow=true;p.add(m);return m;
  }
  function oval(color,x,y,z,sx,sy=sx,sz=sx,p=parent) {
    const m=mesh(new T.SphereGeometry(1,24,16),color,x,y,z,p);
    m.scale.set(sx,sy,sz);return m;
  }
  function stroke(color,points,r=.02,p=parent) {
    return mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(v=>new T.Vector3(...v))),Math.max(12,points.length*5),r,7,false),color,0,0,0,p);
  }
  function patch(shape,color,z,depth=.025,bevel=.025,p=parent) {
    return mesh(new T.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelThickness:bevel,bevelSize:bevel,bevelSegments:5,steps:1,curveSegments:20}),color,0,0,z,p);
  }
  function rounded(x,y,w,h,r=.08) {
    const s=new T.Shape();s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);return s;
  }
  return {mesh,oval,stroke,patch,rounded};
}
const P={white:0xfffcf3,ink:0x201c1b,blush:0xe8a0bb,red:0xa63f36,denim:0x355a80,cuff:0x7d9baf,thread:0xc8aa6d,leaf:0x428847,orange:0xf48935};

export function addRabbit(world,moving,mat,x,z,scale=1,theme=0) {
  const g=new T.Group();g.name='video-reference-rabbit';g.position.set(x,.2,z);g.scale.setScalar(scale);world.add(g);
  const {oval,stroke,patch,rounded,mesh}=sculpt(g,mat);
  const sitting=theme!==0,lake=theme===2;
  const seatBottom=lake?.43:.40;
  const body=new T.Group();g.add(body);
  // UV stripes follow the rounded shirt and sleeves, with no detached bands.
  function stripedFabric(bands,shirt=false) {
    const canvas=document.createElement('canvas');canvas.width=16;canvas.height=512;
    const ctx=canvas.getContext('2d');
    for(let row=0;row<512;row++) {
      const v=(row+.5)/512;
      if(shirt) {
        // Keep only a narrow white shirt edge under the chin, followed by red.
        // These bands use body height, so the collar doesn't stretch at a pole.
        const y=1.38-v*.78;
        ctx.fillStyle=y>=1.28||Math.floor((1.28-y)/.11)%2?'#fff9ed':'#b74035';
      } else {
        const y=(Math.cos(Math.PI*v)+1)/2;
        ctx.fillStyle=Math.floor(y*bands)%2?'#b74035':'#fff9ed';
      }
      ctx.fillRect(0,row,16,1);
    }
    const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
    const fabric=mat(P.white).clone();fabric.map=texture;fabric.roughness=.88;if(theme===0)finishTextile(fabric,'canvas');return fabric;
  }
  const shirtFabric=!lake?stripedFabric(8,true):null;
  const torso=new T.SkinnedMesh(createRabbitShirtGeometry(),shirtFabric||mat(0x73a4be));
  torso.name='continuous-rabbit-shirt-and-sleeves';
  torso.castShadow=true;torso.receiveShadow=true;
  const rootBone=new T.Bone();torso.add(rootBone);
  // The shared shirt bends around the shoulder instead of opening a seam.
  const arms=[];
  for(const side of [-1,1]) {
    const arm=new T.Bone();arm.position.set(side*RABBIT_SHOULDER.x,RABBIT_SHOULDER.y,0);
    arm.rotation.z=side*RABBIT_SHOULDER.angle;rootBone.add(arm);arms.push(arm);
    oval(P.white,0,-.53,.015,.175,.19,.16,arm).name='plush-paw';
  }
  torso.bind(new T.Skeleton([rootBone,...arms]));body.add(torso);
  if(lake) {
    patch(rounded(-.46,.45,.92,.78,.1),0x73a4be,.19,.035,.025,body);
    for(const side of [-1,1]) {
      const lapel=new T.Shape();lapel.moveTo(side*.06,1.38);lapel.lineTo(side*.35,1.27);lapel.lineTo(side*.19,1.03);lapel.closePath();patch(lapel,0x94bbcf,.30,.025,.007,body);
    }
    stroke(0x527d98,[[0,.46,.35],[0,1.05,.35]],.018,body);
    patch(rounded(.16,.73,.22,.19,.035),0x396788,.34,.02,.008,body);
    const emblem=mesh(new T.TorusGeometry(.10,.016,6,24),P.white,-.22,.84,.35,body);emblem.rotation.z=.4;
    stroke(P.white,[[-.27,.76,.35],[-.18,.92,.35]],.013,body);
  } else {
    if(sitting)oval(P.denim,0,.63,.015,.47,.23,.31,body);
    else mesh(createRabbitTrouserGeometry(),P.denim,0,0,0,body).name='continuous-overall-trousers';
    function bodyFront(x,y) {
      const trousers=sitting?.015+.31*Math.sqrt(Math.max(0,1-(x/.47)**2-((y-.63)/.23)**2)):rabbitTrouserFront(x,y);
      return Math.max(rabbitShirtFront(x,y),trousers);
    }
    function fittedPatch(shape,color,offset,depth,bevel) {
      const object=patch(shape,color,0,depth,bevel,body);
      // Subdivide before bending: otherwise a broad front triangle cuts
      // through the round shirt instead of following its curved surface.
      const geometry=new TessellateModifier(.06,6).modify(object.geometry);
      object.geometry.dispose();object.geometry=geometry;
      const vertices=object.geometry.attributes.position;
      for(let i=0;i<vertices.count;i++)vertices.setZ(i,vertices.getZ(i)+bodyFront(vertices.getX(i),vertices.getY(i))+offset);
      object.geometry.deleteAttribute('normal');
      const smooth=mergeVertices(object.geometry);object.geometry.dispose();object.geometry=smooth;
      object.geometry.computeVertexNormals();
      return object;
    }
    // Thin cloth follows the torso, including the pocket and its stitches.
    fittedPatch(rounded(-.38,.65,.76,.52,.07),P.denim,.020,.035,.012);
    for(const side of [-1,1]) {
      stroke(P.denim,[[side*.34,1.31,-.14],[side*.33,1.36,.02],[side*.32,1.29,bodyFront(side*.32,1.29)+.025],[side*.29,1.08,bodyFront(side*.29,1.08)+.045]],.05,body);
      oval(P.thread,side*.29,1.08,bodyFront(side*.29,1.08)+.092,.046,.046,.014,body);
      for(let i=0;i<4;i++) {
        const y=1.24-i*.036;
        stroke(P.thread,[[side*.31,y,bodyFront(side*.31,y)+.09],[side*.31,y-.015,bodyFront(side*.31,y-.015)+.09]],.006,body);
      }
    }
    const pocket=new T.Shape();pocket.moveTo(-.22,.91);pocket.lineTo(.22,.91);pocket.lineTo(.20,.75);pocket.quadraticCurveTo(0,.61,-.20,.75);pocket.closePath();fittedPatch(pocket,0x2e5075,.074,.012,.006);
    function stitch(x0,y0,x1,y1) {stroke(P.thread,[[x0,y0,bodyFront(x0,y0)+.095],[x1,y1,bodyFront(x1,y1)+.095]],.006,body)}
    for(let i=0;i<7;i++)stitch(-.19+i*.058,.889,-.163+i*.058,.889);
    for(const side of [-1,1])for(let i=0;i<4;i++)stitch(side*(.18-i*.018),.83-i*.035,side*(.175-i*.018),.813-i*.035);
    if(!sitting)for(let i=0;i<4;i++) {
      const y=.54-i*.04;
      stroke(P.thread,[[0,y,rabbitTrouserFront(0,y)+.012],[.006,y-.020,rabbitTrouserFront(.006,y-.020)+.012]],.005,body);
    }
  }
  for(const side of [-1,1]) {
    const leg=new T.Group();leg.position.set(side*.245,sitting?seatBottom+.225:.48,0);body.add(leg);
    // Extend seated legs horizontally, with their soles facing forward.
    // Their underside and the pelvis share the same support height.
    if(sitting)leg.rotation.x=-Math.PI/2;
    if(sitting)oval(lake?0x6598b3:P.denim,0,-.14,.015,.225,.29,.24,leg);
    oval(lake?0x87b2c8:0x9eb0bc,0,-.36,.04,.23,.045,.24,leg);
    oval(lake?0x343536:P.white,0,-.47,.13,.265,.065,.35,leg);
    oval(lake?0x343536:P.red,0,-.40,.16,.25,.125,.31,leg);
    if(!lake) {
      oval(P.white,0,-.31,.23,.14,.06,.16,leg);
      for(let i=0;i<2;i++)stroke(P.white,[[-.115,-.30+i*.03,.23],[0,-.285+i*.03,.29],[.115,-.30+i*.03,.23]],.016,leg);
    }
  }
  oval(P.white,0,.61,-.33,.19,.18,.16,body).name='plush-tail';
  // The chin sits directly on the shirt. Animate around this joint so a head
  // tilt cannot pull the whole sculpture away from the shoulders.
  const headPivot=new T.Group();headPivot.position.y=1.36;g.add(headPivot);
  const head=addRabbitHead(headPivot,mat);head.scale.set(1.055,1,1.035);head.position.y=-1.34;
  // Garden iris and lake lotus leaf umbrella are held by the left hand.
  let plant=null;
  if(theme===0) {
    plant=new T.Group();plant.name='garden-iris';plant.position.set(-.78,.46,.12);plant.rotation.z=.1;g.add(plant);luminousBloom(plant,[-.18,2.10,.04],1.9,.55);
    stroke(P.leaf,[[0,0,0],[-.10,.7,0],[-.15,1.55,0],[-.19,2.1,0]],.046,plant);
    const leaf=oval(P.leaf,-.19,.84,-.02,.115,.54,.045,plant);leaf.rotation.z=.38;
    for(let i=0;i<6;i++) {const angle=i*Math.PI/3;const p=oval(i%2?0x6f579b:0x8370ad,-.18+Math.cos(angle)*.33,2.10+Math.sin(angle)*.31,.02,.28,.38,.10,plant);p.rotation.z=angle-Math.PI/2;luminousPetal(p,.22);if(i<3)luminousPetal(oval(0xf4cf5b,-.18+Math.cos(angle)*.16,2.10+Math.sin(angle)*.16,.13,.10,.13,.025,plant))}
  } else if(lake) {
    plant=new T.Group();plant.position.set(-.93,.7,.08);g.add(plant);
    stroke(P.leaf,[[0,0,0],[-.04,1.3,0],[-.12,2.45,0]],.043,plant);
    const leaf=oval(0x64a840,-.1,2.55,0,.94,.09,.67,plant);leaf.rotation.z=-.12;
    for(let i=0;i<7;i++) {const a=i*Math.PI*2/7;stroke(0x529636,[[-.1,2.64,0],[-.1+Math.cos(a)*.42,2.65,Math.sin(a)*.31],[-.1+Math.cos(a)*.85,2.59,Math.sin(a)*.57]],.014,plant)}
    oval(0xe9f8d9,.2,2.67,.12,.075,.035,.07,plant);
  }
  const baseY=sitting?.565-seatBottom*scale:.2;g.position.y=baseY;
  // Keep feet/the seated pelvis planted while the head, arms and prop move.
  moving.push(t=>{g.rotation.y=.32+Math.sin(t*.65)*.045;arms[1].rotation.z=RABBIT_SHOULDER.angle+Math.sin(t*1.6)*.045;headPivot.rotation.z=Math.sin(t*.72)*.018;if(plant)plant.rotation.z=.08+Math.sin(t*.8)*.025});
  return g;
}

export function addBeeCarrot(world,moving,mat,x,z) {
  const g=new T.Group();g.name='carrot-in-bee-costume';g.position.set(x,.22,z);world.add(g);
  const {oval,stroke,mesh}=sculpt(g,mat);
  const gold=0xf5d273,brown=0x684331;
  // Pale golden hood surrounds an orange carrot face; leaves remain exposed.
  oval(gold,0,1.29,0,.59,.62,.36).name='bee-plush-hood';
  oval(0xf5b650,0,1.28,.30,.46,.46,.13);
  oval(P.orange,0,1.28,.40,.385,.385,.055);
  for(const side of [-1,1]) {
    const white=oval(P.white,side*.145,1.40,.456,.115,.17,.027);white.rotation.z=side*.16;
    const eye=oval(0x344974,side*.145,1.40,.483,.067,.12,.019);eye.rotation.z=side*.16;
    stroke(gold,[[side*.35,1.78,0],[side*.52,2.01,.02],[side*.60,2.11,.04]],.027);
    oval(0xf0bf4c,side*.6,2.13,.04,.14);
    oval(brown,side*.34,.10,.06,.13,.13,.17);
  }
  stroke(P.ink,[[-.14,1.15,.469],[-.06,1.12,.469],[0,1.17,.469],[.075,1.12,.469],[.15,1.15,.469],[.16,1.21,.469]],.026);
  for(let i=0;i<3;i++) {const leaf=oval(i%2?0x67a342:P.leaf,(i-1)*.145,1.97,0,.14,.27,.08);leaf.rotation.z=(1-i)*.30;stroke(0x80b553,[[(i-1)*.14,1.83,.083],[(i-1)*.17,2.07,.083]],.016)}
  // Bee suit is a rounded abdomen with fitted horizontal brown bands.
  oval(gold,0,.54,0,.40,.52,.30);
  for(const y of [.25,.56,.84]) {
    const r=.40*Math.sqrt(1-((y-.54)/.52)**2);
    const stripe=mesh(new T.CylinderGeometry(r,r,.13,36),brown,0,y,0);stripe.scale.z=.765;
  }
  const stinger=mesh(new T.ConeGeometry(.10,.20,16),brown,0,-.01,-.10);stinger.rotation.z=Math.PI;
  const wings=[];
  for(const side of [-1,1]) {
    const wing=new T.Group();wing.position.set(side*.30,.63,-.20);g.add(wing);wings.push(wing);
    const top=oval(0xeaf3ed,side*.20,.16,0,.30,.16,.075,wing);top.rotation.z=side*.55;
    const lower=oval(0xeaf3ed,side*.18,-.15,0,.24,.14,.07,wing);lower.rotation.z=-side*.4;
    oval(brown,side*.41,.69,.17,.12,.14,.115);
  }
  // The sunflower held by the costumed carrot is visible in the poster.
  stroke(P.leaf,[[-.10,.33,.34],[-.36,.72,.37]],.025);
  for(let i=0;i<9;i++){const a=i*Math.PI*2/9;const petal=oval(0xe9b73e,-.37+Math.cos(a)*.20,.83+Math.sin(a)*.20,.42,.09,.15,.028);petal.rotation.z=a-Math.PI/2;luminousPetal(petal)}
  luminousPetal(oval(0x9b682e,-.37,.83,.457,.165,.165,.035),.7);luminousBloom(g,[-.37,.83,.47],.9,.7);
  for(const [dx,dy] of [[-.04,.04],[.07,.035],[.02,-.075]])oval(brown,-.37+dx,.83+dy,.493,.025,.025,.012);
  moving.push(t=>{g.position.y=.24+Math.sin(t*2)*.07;g.rotation.y=.32+Math.sin(t*.75)*.06;g.rotation.z=-.08+Math.sin(t*1.5)*.06;wings.forEach((w,i)=>{w.rotation.y=Math.sin(t*8)*(i?-.20:.20)})});
  return g;
}
