// Writes three.js scenes as Wavefront OBJ with an MTL material library and PNG textures: meshes
// with normals, texture coordinates and vertex colours, lines and points, in world coordinates.
// The files are returned separately and as one zip.

import * as THREE from 'three';
import { zipSync } from 'three/examples/jsm/libs/fflate.module.js';
import { collectWorld, fileName, materialColor, toZUp, triangles, UNITS, type CollectOptions, type ExportFile, type Unit } from './common.js';
import { imageToPng } from './png.js';

export { collectWorld, type CollectOptions, type ExportFile, type Unit, UNITS } from './common.js';
export { encodePng, imageToPng } from './png.js';

export interface ObjOptions extends CollectOptions {
  /** Writes the material library and textures. Default true. */
  materials?: boolean;
  /** Writes textures as PNG files beside the model. Default true. */
  textures?: boolean;
  /** Writes vertex colours after the positions (v x y z r g b), as many programs read. Default true. */
  vertexColors?: boolean;
  /** The unit coordinates are written in. Default 'meter', as three.js uses. */
  unit?: Unit;
  /** Turns three.js's Y up into Z up. Default false. */
  zUp?: boolean;
  /** The files' name, without extension. Default 'scene'. */
  name?: string;
}

export interface ObjExportResult {
  /** The .obj, .mtl and textures, zipped: the file to download. */
  zip: ExportFile;
  /** The same files, separately. */
  files: ExportFile[];
  warnings: string[];
  stats: { objects: number; vertices: number; faces: number; lines: number; points: number; materials: number; textures: number };
}

const num = (v: number) => (Math.abs(v) < 1e-12 ? '0' : String(+v.toPrecision(8)));
const clean = (s: string) => s.replace(/\s+/g, '_').replace(/[^\w.-]/g, '') || 'material';

/** The texture maps MTL can name, with their keywords. */
const MAPS: [keyof THREE.MeshStandardMaterial, string][] = [
  ['map', 'map_Kd'],
  ['emissiveMap', 'map_Ke'],
  ['alphaMap', 'map_d'],
  ['normalMap', 'norm'],
  ['bumpMap', 'map_Bump'],
  ['roughnessMap', 'map_Pr'],
  ['metalnessMap', 'map_Pm'],
];

/** Writes the scene as OBJ, MTL and PNG textures. */
export async function exportObj(root: THREE.Object3D, options: ObjOptions = {}): Promise<ObjExportResult> {
  const s = 1 / UNITS[options.unit ?? 'meter'];
  const transform = options.zUp ? toZUp(s) : new THREE.Matrix4().makeScale(s, s, s);
  const normalTransform = new THREE.Matrix3().getNormalMatrix(transform);
  const base = fileName(options.name, 'obj').replace(/\.obj$/, '');
  const objects = collectWorld(root, options);
  const warnings: string[] = [];
  const withMaterials = options.materials !== false;
  const obj: string[] = [`# Exported by mc-obj-export, ${options.unit ?? 'meter'}`];
  if (withMaterials) obj.push(`mtllib ${base}.mtl`);

  const materialNames = new Map<THREE.Material, string>();
  const used = new Set<string>();
  const nameOf = (m: THREE.Material) => {
    let n = materialNames.get(m);
    if (!n) {
      n = clean(m.name || `material_${materialNames.size + 1}`);
      for (let i = 1; used.has(n); i++) n = `${clean(m.name || 'material')}_${i}`;
      used.add(n);
      materialNames.set(m, n);
    }
    return n;
  };

  let vOffset = 1;
  let tOffset = 1;
  let nOffset = 1;
  const stats = { objects: 0, vertices: 0, faces: 0, lines: 0, points: 0, materials: 0, textures: 0 };
  const c = new THREE.Color();
  for (const o of objects) {
    const g = o.geometry;
    g.applyMatrix4(transform);
    const p = g.getAttribute('position');
    const uv = g.getAttribute('uv');
    const n = o.kind === 'mesh' ? g.getAttribute('normal') : undefined;
    const vc = g.getAttribute('color');
    const colors = options.vertexColors !== false && !!vc && o.materials.some((m) => (m as THREE.MeshStandardMaterial).vertexColors);
    stats.objects++;
    obj.push(`o ${o.name}`);
    for (let i = 0; i < p.count; i++) {
      let line = `v ${num(p.getX(i))} ${num(p.getY(i))} ${num(p.getZ(i))}`;
      if (colors) {
        c.setRGB(vc!.getX(i), vc!.getY(i), vc!.getZ(i)).convertLinearToSRGB();
        line += ` ${num(c.r)} ${num(c.g)} ${num(c.b)}`;
      }
      obj.push(line);
    }
    if (uv) for (let i = 0; i < uv.count; i++) obj.push(`vt ${num(uv.getX(i))} ${num(uv.getY(i))}`);
    if (n) {
      const v = new THREE.Vector3();
      for (let i = 0; i < n.count; i++) {
        v.fromBufferAttribute(n, i).applyMatrix3(normalTransform).normalize();
        obj.push(`vn ${num(v.x)} ${num(v.y)} ${num(v.z)}`);
      }
    }
    const ref = (i: number) => `${vOffset + i}${uv || n ? `/${uv ? tOffset + i : ''}` : ''}${n ? `/${nOffset + i}` : ''}`;
    if (o.kind === 'mesh') {
      let current: THREE.Material | undefined;
      for (const t of triangles(g)) {
        const material = o.materials[t.group] ?? o.materials[0];
        if (withMaterials && material && material !== current) {
          current = material;
          obj.push(`usemtl ${nameOf(material)}`);
        }
        obj.push(`f ${ref(t.a)} ${ref(t.b)} ${ref(t.c)}`);
        stats.faces++;
      }
    } else {
      if (withMaterials && o.materials[0]) obj.push(`usemtl ${nameOf(o.materials[0])}`);
      const index = (i: number) => (g.index ? g.index.getX(i) : i);
      const count = g.index ? g.index.count : p.count;
      if (o.kind === 'points') {
        const ids: number[] = [];
        for (let i = 0; i < count; i++) ids.push(vOffset + index(i));
        for (let i = 0; i < ids.length; i += 64) obj.push(`p ${ids.slice(i, i + 64).join(' ')}`);
        stats.points += count;
      } else {
        // Segments pair up their vertices; strips and loops join them in order.
        const segments = (o.object as THREE.LineSegments).isLineSegments;
        if (segments) for (let i = 0; i + 1 < count; i += 2) obj.push(`l ${vOffset + index(i)} ${vOffset + index(i + 1)}`);
        else {
          const ids: number[] = [];
          for (let i = 0; i < count; i++) ids.push(vOffset + index(i));
          if ((o.object as THREE.LineLoop).isLineLoop && ids.length) ids.push(ids[0]!);
          obj.push(`l ${ids.join(' ')}`);
        }
        stats.lines += segments ? Math.floor(count / 2) : Math.max(0, count - 1);
      }
    }
    vOffset += p.count;
    if (uv) tOffset += uv.count;
    if (n) nOffset += n.count;
    stats.vertices += p.count;
    g.dispose();
  }

  const files: ExportFile[] = [{ name: `${base}.obj`, data: new TextEncoder().encode(obj.join('\n') + '\n'), mimeType: 'model/obj' }];
  if (withMaterials) {
    const mtl: string[] = ['# Exported by mc-obj-export'];
    const textureFiles = new Map<THREE.Texture, string>();
    for (const [m, name] of materialNames) {
      const std = m as THREE.MeshStandardMaterial;
      const kd = materialColor(m).convertLinearToSRGB();
      mtl.push('', `newmtl ${name}`, `Kd ${num(kd.r)} ${num(kd.g)} ${num(kd.b)}`);
      if (std.emissive) {
        const ke = std.emissive.clone().multiplyScalar(std.emissiveIntensity ?? 1).convertLinearToSRGB();
        if (ke.r || ke.g || ke.b) mtl.push(`Ke ${num(ke.r)} ${num(ke.g)} ${num(ke.b)}`);
      }
      const roughness = std.roughness ?? (m instanceof THREE.MeshPhongMaterial ? Math.sqrt(2 / (m.shininess + 2)) : 1);
      const metalness = std.metalness ?? 0;
      // Specular from metalness, shininess from roughness, and the PBR extension's Pr and Pm.
      const ks = new THREE.Color(0.04, 0.04, 0.04).lerp(materialColor(m), metalness).convertLinearToSRGB();
      mtl.push(`Ks ${num(ks.r)} ${num(ks.g)} ${num(ks.b)}`, `Ns ${num(Math.min(1000, Math.max(0, 2 / Math.max(roughness, 0.03) ** 2 - 2)))}`, `Pr ${num(roughness)}`, `Pm ${num(metalness)}`);
      if (m.transparent && m.opacity < 1) mtl.push(`d ${num(m.opacity)}`);
      mtl.push(`illum ${metalness > 0.5 ? 3 : 2}`);
      if (options.textures === false) continue;
      for (const [key, keyword] of MAPS) {
        const texture = std[key] as THREE.Texture | null | undefined;
        if (!texture?.isTexture) continue;
        let file = textureFiles.get(texture);
        if (!file) {
          const png = await imageToPng(texture.image, texture.flipY);
          if (!png) {
            warnings.push(`The ${String(key)} of ${name} could not be read, and was left out`);
            continue;
          }
          const stem = clean(texture.name || `${name}_${String(key)}`);
          file = `${stem}.png`;
          for (let i = 1; files.some((f) => f.name === file); i++) file = `${stem}_${i}.png`;
          files.push({ name: file, data: png, mimeType: 'image/png' });
          textureFiles.set(texture, file);
          stats.textures++;
        }
        mtl.push(`${keyword} ${file}`);
      }
    }
    stats.materials = materialNames.size;
    files.splice(1, 0, { name: `${base}.mtl`, data: new TextEncoder().encode(mtl.join('\n') + '\n'), mimeType: 'text/plain' });
  }
  if (!objects.length) warnings.push('There is nothing to write');
  const zip = zipSync(Object.fromEntries(files.map((f) => [f.name, f.data])));
  return { zip: { name: `${base}.zip`, data: zip, mimeType: 'application/zip' }, files, warnings, stats };
}
