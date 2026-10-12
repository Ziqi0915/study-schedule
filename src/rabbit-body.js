import * as T from 'three';
import {MarchingCubes} from 'three/addons/objects/MarchingCubes.js';

// Coordinates are shared with the character's clothes and shoulder pivots.
// The neck opening is deliberately broad and flat, then tucked into the head.
const SHIRT_DEPTH = .70;
export const RABBIT_SHOULDER = {x: .49, y: 1.26, angle: .50};
const shirtCurve = new T.CatmullRomCurve3([
  new T.Vector3(.39, .68, 0),
  new T.Vector3(.48, .75, 0),
  new T.Vector3(.52, .89, 0),
  new T.Vector3(.515, 1.00, 0),
  new T.Vector3(.485, 1.13, 0),
  new T.Vector3(.44, 1.26, 0),
  new T.Vector3(.33, 1.38, 0),
], false, 'centripetal');
const shirtProfile = shirtCurve.getPoints(96).map(p => new T.Vector2(p.x, p.y));

function shirtRadius(y) {
  if (y < .68 || y > 1.38) return 0;
  for (let i = 1; i < shirtProfile.length; i++) {
    const low = shirtProfile[i - 1], high = shirtProfile[i];
    if (y <= high.y) {
      const t = (y - low.y) / (high.y - low.y);
      return T.MathUtils.lerp(low.x, high.x, t);
    }
  }
  return .33;
}

export function rabbitShirtFront(x, y) {
  const radius = shirtRadius(y);
  return SHIRT_DEPTH * Math.sqrt(Math.max(0, radius * radius - x * x));
}

export function createRabbitShirtGeometry() {
  // A single surface replaces the hard intersections of separate sleeves.
  const geometry = implicitGeometry(shirtDistance,64,.98,1.05);
  const positions=geometry.attributes.position;
  const uv=[],indices=[],weights=[];
  for(let i=0;i<positions.count;i++) {
    const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i);
    const side=x<0?-1:1,local=armCoordinates(x,y,side);
    const sleeveWeight=T.MathUtils.smoothstep(torsoDistance(x,y,z)-sleeveDistance(local.x,local.y,z),-.065,.065);
    // Cloth stripes turn with the sleeve and meet the torso progressively.
    const stripeY=T.MathUtils.lerp(y,1.33+local.y,sleeveWeight);
    uv.push(.5,(stripeY-.60)/.78);
    // Keep the torso fixed; gradually transfer the sleeve to its shoulder.
    const influence=sleeveWeight*T.MathUtils.smoothstep(-local.y,-.035,.24);
    indices.push(0,side<0?1:2,0,0);
    weights.push(1-influence,influence,0,0);
  }
  geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
  geometry.setAttribute('skinIndex',new T.Uint16BufferAttribute(indices,4));
  geometry.setAttribute('skinWeight',new T.Float32BufferAttribute(weights,4));
  return geometry;
}

function armCoordinates(x,y,side) {
  const angle=side*RABBIT_SHOULDER.angle,c=Math.cos(angle),s=Math.sin(angle);
  const dx=x-side*RABBIT_SHOULDER.x,dy=y-RABBIT_SHOULDER.y;
  return {x:c*dx+s*dy,y:-s*dx+c*dy};
}

function torsoDistance(x,y,z) {
  const radius=shirtRadius(T.MathUtils.clamp(y,.68,1.38));
  return Math.max(Math.hypot(x,z/SHIRT_DEPTH)-radius,.68-y,y-1.38);
}

function sleeveDistance(x,y,z) {
  return ellipsoidDistance(x,y+.21,z,.19,.30,.20);
}

function shirtDistance(x,y,z) {
  let d=torsoDistance(x,y,z);
  for(const side of [-1,1]) {
    const local=armCoordinates(x,y,side);
    d=smoothUnion(d,sleeveDistance(local.x,local.y,z),.065);
  }
  return d;
}

function ellipsoidDistance(x, y, z, rx, ry, rz) {
  const k0 = Math.hypot(x / rx, y / ry, z / rz);
  const k1 = Math.hypot(x / (rx * rx), y / (ry * ry), z / (rz * rz));
  return k1 > 1e-9 ? k0 * (k0 - 1) / k1 : -Math.min(rx, ry, rz);
}

function smoothUnion(a, b, blend) {
  const h = Math.max(blend - Math.abs(a - b), 0) / blend;
  return Math.min(a, b) - h * h * blend * .25;
}

function trousersDistance(x, y, z) {
  // The pelvis continues into both short trouser legs. Each leg has nearly
  // straight sides and a rounded ankle, rather than an individual thigh ball.
  const hip = ellipsoidDistance(x, y - .565, z - .01, .49, .325, .305);
  const nearestY = T.MathUtils.clamp(y, .225, .425);
  const legRadius = T.MathUtils.lerp(.207, .225, T.MathUtils.clamp((y - .12) / .40, 0, 1));
  let legs = Infinity;
  for (const side of [-1, 1]) {
    const leg = ellipsoidDistance(x - side * .245, y - nearestY, z - .015, legRadius, .125, .245);
    legs = smoothUnion(legs, leg, .045);
  }
  return smoothUnion(hip, legs, .065);
}

export function rabbitTrouserFront(x, y) {
  if (trousersDistance(x, y, .01) >= 0) return 0;
  let low = .01, high = .40;
  for (let i = 0; i < 22; i++) {
    const middle = (low + high) / 2;
    if (trousersDistance(x, y, middle) < 0) low = middle;
    else high = middle;
  }
  return (low + high) / 2;
}

export function createRabbitTrouserGeometry() {
  return implicitGeometry(trousersDistance,72,.70,.48);
}

function implicitGeometry(distance,resolution,extent,centerY) {
  // MarchingCubes only needs a material for initialization; callers own their
  // final clothing material, and the temporary allocation is disposed here.
  const temporaryMaterial = new T.MeshBasicMaterial();
  const polygonizer = new MarchingCubes(resolution, temporaryMaterial, false, false, 50000);
  polygonizer.isolation = 0;
  for (let z = 0; z < resolution; z++) {
    const pz = (z / resolution * 2 - 1) * extent;
    for (let y = 0; y < resolution; y++) {
      const py = (y / resolution * 2 - 1) * extent + centerY;
      for (let x = 0; x < resolution; x++) {
        const px = (x / resolution * 2 - 1) * extent;
        polygonizer.field[x + y * resolution + z * resolution * resolution] = -distance(px, py, pz);
      }
    }
  }
  polygonizer.update();
  if (!polygonizer.count || polygonizer.count >= polygonizer.positionArray.length / 3) {
    polygonizer.geometry.dispose();
    temporaryMaterial.dispose();
    throw new Error('Rabbit clothing exceeded its geometry buffer.');
  }
  const positions = polygonizer.positionArray.slice(0, polygonizer.count * 3);
  const normals = polygonizer.normalArray.slice(0, polygonizer.count * 3);
  for (let i = 0; i < positions.length; i += 3) {
    positions[i] *= extent;
    positions[i + 1] = positions[i + 1] * extent + centerY;
    positions[i + 2] *= extent;
    const length = Math.hypot(normals[i], normals[i + 1], normals[i + 2]) || 1;
    normals[i] /= length; normals[i + 1] /= length; normals[i + 2] /= length;
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new T.BufferAttribute(normals, 3));
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  polygonizer.geometry.dispose();
  temporaryMaterial.dispose();
  return geometry;
}
