import * as T from 'three';
import {luminousPetal,luminousBloom} from './night-flowers';
import { MarchingCubes } from 'three/addons/objects/MarchingCubes.js';

const HEAD = { x: .80, y: .70, z: .60, cy: 1.98 };
const WHITE = 0xfffcf3;
const INK = 0x211d1b;
let headTemplate;

// An analytic, closed toy sculpture: the ears blend into the round head rather
// than meeting it along the seam of intersecting spheres or an extruded outline.
function ellipsoidDistance(x, y, z, rx, ry, rz) {
  const k0 = Math.hypot(x / rx, y / ry, z / rz);
  const k1 = Math.hypot(x / (rx * rx), y / (ry * ry), z / (rz * rz));
  return k1 > 1e-9 ? k0 * (k0 - 1) / k1 : -Math.min(rx, ry, rz);
}

function smoothUnion(a, b, blend) {
  const h = Math.max(blend - Math.abs(a - b), 0) / blend;
  return Math.min(a, b) - h * h * blend * .25;
}

function sculptureDistance(x, y, z) {
  const dy = y - HEAD.cy;
  // The physical mascot has full lower cheeks and a soft, flatter chin.
  // Keep the upper head elliptical and broaden only the lower half.
  const shapedY = dy < 0 ? -HEAD.y * (Math.abs(dy) / HEAD.y) ** 1.2 : dy;
  let d = ellipsoidDistance(x, shapedY, z, HEAD.x, HEAD.y, HEAD.z);
  for (const side of [-1, 1]) {
    const angle = -side * .18;
    const dx = x - side * .31, dy = y - 2.79;
    const c = Math.cos(angle), s = Math.sin(angle);
    // Thick capsule ears have parallel sides and a rounded end, like the video.
    const ex = c * dx + s * dy, ey = -s * dx + c * dy;
    const nearest = Math.max(-.16, Math.min(.16, ey));
    const ear = Math.hypot(ex, ey - nearest, z * (.21 / .19)) - .21;
    d = smoothUnion(d, ear, .105);
  }
  return d;
}

function headGeometry(material) {
  if (!headTemplate) {
    const resolution = 64, extent = 1.2, centerY = 2.2;
    const polygonizer = new MarchingCubes(resolution, material, false, false, 30000);
    polygonizer.isolation = 0;
    for (let z = 0; z < resolution; z++) {
      const pz = (z / resolution * 2 - 1) * extent;
      for (let y = 0; y < resolution; y++) {
        const py = (y / resolution * 2 - 1) * extent + centerY;
        for (let x = 0; x < resolution; x++) {
          const px = (x / resolution * 2 - 1) * extent;
          polygonizer.field[x + y * resolution + z * resolution * resolution] = -sculptureDistance(px, py, pz);
        }
      }
    }
    polygonizer.update();
    if (!polygonizer.count || polygonizer.count >= polygonizer.positionArray.length / 3) {
      polygonizer.geometry.dispose();
      throw new Error('Rabbit head sculpture exceeded its geometry buffer.');
    }
    const positions = polygonizer.positionArray.slice(0, polygonizer.count * 3);
    const normals = polygonizer.normalArray.slice(0, polygonizer.count * 3);
    for (let i = 0; i < positions.length; i += 3) {
      positions[i] *= extent;
      positions[i + 1] = positions[i + 1] * extent + centerY;
      positions[i + 2] *= extent;
      const length = Math.hypot(normals[i], normals[i + 1], normals[i + 2]) || 1;
      normals[i] /= length;
      normals[i + 1] /= length;
      normals[i + 2] /= length;
    }
    headTemplate = new T.BufferGeometry();
    headTemplate.setAttribute('position', new T.BufferAttribute(positions, 3));
    headTemplate.setAttribute('normal', new T.BufferAttribute(normals, 3));
    headTemplate.computeBoundingBox();
    headTemplate.computeBoundingSphere();
    polygonizer.geometry.dispose();
  }
  // Each scene owns its geometry and can dispose it independently.
  return headTemplate.clone();
}

function frontSurface(x, y) {
  const q = 1 - (x / HEAD.x) ** 2 - Math.abs((y - HEAD.cy) / HEAD.y) ** (y < HEAD.cy ? 2.4 : 2);
  return HEAD.z * Math.sqrt(Math.max(q, .001));
}

export function addRabbitHead(parent, mat) {
  const group = new T.Group();
  group.name = 'round-video-reference-rabbit-head';
  parent.add(group);

  function mesh(geometry, color, p = group) {
    const object = new T.Mesh(geometry, mat(color));
    object.castShadow = true;
    object.receiveShadow = true;
    p.add(object);
    return object;
  }

  function oval(color, x, y, z, rx, ry, rz, p = group) {
    const object = mesh(new T.SphereGeometry(1, 24, 16), color, p);
    object.position.set(x, y, z);
    object.scale.set(rx, ry, rz);
    return object;
  }

  // A small curved patch is almost flush with the head. Its points follow the
  // front ellipsoid, so the face remains attached when seen from the side.
  function facePatch(color, cx, cy, rx, ry, angle = 0) {
    const segments = 40, rings = 5, vertices = [], indices = [];
    const c = Math.cos(angle), s = Math.sin(angle);
    const point = (u, v) => {
      const x = cx + c * u - s * v, y = cy + s * u + c * v;
      vertices.push(x, y, frontSurface(x, y) + .010);
    };
    point(0, 0);
    for (let ring = 1; ring <= rings; ring++) {
      for (let i = 0; i < segments; i++) {
        const a = i / segments * Math.PI * 2;
        point(Math.cos(a) * rx * ring / rings, Math.sin(a) * ry * ring / rings);
      }
    }
    for (let i = 0; i < segments; i++) indices.push(0, 1 + i, 1 + (i + 1) % segments);
    for (let ring = 1; ring < rings; ring++) {
      const inner = 1 + (ring - 1) * segments, outer = inner + segments;
      for (let i = 0; i < segments; i++) {
        const next = (i + 1) % segments;
        indices.push(inner + i, outer + i, outer + next, inner + i, outer + next, inner + next);
      }
    }
    const geometry = new T.BufferGeometry();
    geometry.setAttribute('position', new T.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    const object = mesh(geometry, color);
    // Graphic facial marks should not cast detached shadows on their own head.
    object.castShadow = false;
    return object;
  }

  mesh(headGeometry(mat(WHITE)), WHITE).name = 'seamless-rounded-head-and-ears';
  for (const side of [-1, 1]) {
    facePatch(INK, side * .27, 1.96, .057, .105, -side * .08);
    facePatch(0xefd0ce, side * .51, 1.79, .082, .038, side * .12);
  }
  facePatch(INK, 0, 1.83, .033, .030);
  const smile2d = new T.SplineCurve([
    new T.Vector2(-.128, 1.759), new T.Vector2(-.100, 1.721),
    new T.Vector2(-.057, 1.720), new T.Vector2(0, 1.752),
    new T.Vector2(.057, 1.720), new T.Vector2(.100, 1.721),
    new T.Vector2(.128, 1.759),
  ]);
  const smilePoints = smile2d.getPoints(48).map(p => new T.Vector3(p.x, p.y, frontSurface(p.x, p.y) + .018));
  const smile = mesh(new T.TubeGeometry(new T.CatmullRomCurve3(smilePoints), 64, .017, 8, false), INK);
  smile.castShadow = false;
  for (const side of [-1, 1]) oval(INK, side * .128, 1.759, frontSurface(side * .128, 1.759) + .018, .017, .017, .017).castShadow = false;

  // Tiny flower heads sit around the brow, with leaves behind them. Each flower
  // faces out from the curved sculpture instead of forming a flat headband.
  const pastels = [0xf3b9c4, 0xfff3dc, 0xd2bce9, 0xf6d5a0, 0xd5e1c0, 0xf4c5d0];
  const flowerXs = [-.67, -.54, -.37, -.20, -.035, .13, .29, .45, .59, .69];
  flowerXs.forEach((x, i) => {
    const y = 2.555 - .245 * (Math.abs(x) / .70) ** 1.35;
    const z = frontSurface(x, y);
    const flower = new T.Group();luminousBloom(flower,[0,0,.035],.24,.55);
    flower.position.set(x, y, z + .033);
    const normal = new T.Vector3(x / (HEAD.x * HEAD.x), (y - HEAD.cy) / (HEAD.y * HEAD.y), z / (HEAD.z * HEAD.z)).normalize();
    flower.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), normal);
    flower.rotateZ(i * .45);
    group.add(flower);
    const size = i % 3 === 0 ? .074 : .060;
    const leaf = oval(0x719761, -.052, -.006, -.004, .029, .072, .014, flower);
    leaf.rotation.z = -.75;
    for (let petal = 0; petal < 5; petal++) {
      const a = petal / 5 * Math.PI * 2;
      const p = oval(pastels[i % pastels.length], Math.sin(a) * size * .63, Math.cos(a) * size * .63, .008, size * .43, size * .67, .021, flower);
      p.rotation.z = -a;luminousPetal(p,.65);
    }
    luminousPetal(oval(0xf0cf77, 0, 0, .035, size * .33, size * .33, .020, flower),.8);
  });

  // A genuinely tapered, solid carrot hair clip sits sideways at the left ear.
  const carrot = new T.Group();
  carrot.name = 'sideways-carrot-hair-clip';
  carrot.position.set(-.39, 2.605, .235);
  carrot.rotation.z = -.26;
  group.add(carrot);
  const root = mesh(new T.ConeGeometry(.088, .34, 32, 1, false), 0xf08b32, carrot);
  root.rotation.z = Math.PI / 2;
  oval(0xf08b32, .14, 0, 0, .040, .088, .088, carrot);
  for (let i = 0; i < 3; i++) {
    const leaf = oval(i % 2 ? 0x508343 : 0x68904b, .21 + i * .02, (i - 1) * .050, 0, .045, .104, .033, carrot);
    leaf.rotation.z = -.65 - i * .36;
  }
  for (let i = 0; i < 3; i++) {
    const x = -.065 + i * .066;
    const r = (.34 / 2 + x) / .34 * .088;
    const points = [new T.Vector3(x, -r * .3, r * .97), new T.Vector3(x + .014, r * .2, r * .99)];
    mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points), 5, .005, 6, false), 0xcf722b, carrot);
  }
  return group;
}
