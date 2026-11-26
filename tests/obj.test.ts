import * as THREE from 'three';
import { unzipSync } from 'three/examples/jsm/libs/fflate.module.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { describe, expect, it } from 'vitest';
import { encodePng, exportObj } from '../src/index.js';

function scene() {
  const s = new THREE.Scene();
  const pixels = new Uint8Array([255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 255, 255, 255]);
  const texture = new THREE.DataTexture(pixels, 2, 2);
  texture.name = 'checker';
  const box = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ name: 'Crate', color: 0xff8000, roughness: 0.5, map: texture }));
  box.name = 'Box';
  box.position.x = 2;
  const line = new THREE.Line(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 1, 1, 0], 3)), new THREE.LineBasicMaterial({ name: 'Wire' }));
  const points = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([0, 5, 0, 1, 5, 0], 3)));
  s.add(box, line, points);
  return s;
}

const text = (f: { data: Uint8Array }) => new TextDecoder().decode(f.data);

describe('OBJ', () => {
  it('writes the OBJ, MTL and textures, separately and zipped', async () => {
    const r = await exportObj(scene(), { name: 'crate' });
    expect(r.files.map((f) => f.name)).toEqual(['crate.obj', 'crate.mtl', 'checker.png']);
    expect(Object.keys(unzipSync(r.zip.data)).sort()).toEqual(['checker.png', 'crate.mtl', 'crate.obj']);
    expect(r.stats).toMatchObject({ objects: 3, faces: 12, lines: 2, points: 2, materials: 3, textures: 1 });
    const obj = text(r.files[0]!);
    expect(obj).toContain('mtllib crate.mtl');
    expect(obj).toContain('o Box');
    expect(obj).toContain('usemtl Crate');
    expect(obj).toMatch(/^l \d+ \d+ \d+$/m);
    expect(obj).toMatch(/^p \d+ \d+$/m);
    const mtl = text(r.files[1]!);
    expect(mtl).toContain('newmtl Crate');
    expect(mtl).toContain('Kd 1 0.5');
    expect(mtl).toContain('map_Kd checker.png');
    expect(r.files[2]!.data.subarray(1, 4)).toEqual(new TextEncoder().encode('PNG'));
  });

  it('is read back by three.js with its materials, in place', async () => {
    const r = await exportObj(scene());
    const materials = new MTLLoader().parse(text(r.files[1]!), '');
    materials.preload();
    const model = new OBJLoader().setMaterials(materials).parse(text(r.files[0]!));
    const box = model.getObjectByName('Box') as THREE.Mesh;
    expect(box).toBeTruthy();
    expect((box.material as THREE.MeshPhongMaterial).name).toBe('Crate');
    const size = new THREE.Box3().setFromObject(box).getSize(new THREE.Vector3());
    expect(size.x).toBeCloseTo(1);
    expect(new THREE.Box3().setFromObject(box).min.x).toBeCloseTo(1.5);
    expect(box.geometry.getAttribute('uv')).toBeTruthy();
    expect(box.geometry.getAttribute('normal')).toBeTruthy();
  });

  it('writes vertex colours, other units and Z up, without materials', async () => {
    const s = new THREE.Scene();
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0], 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute([1, 0, 0, 1, 0, 0, 1, 0, 0], 3));
    s.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true })));
    const r = await exportObj(s, { materials: false, unit: 'millimeter', zUp: true });
    expect(r.files).toHaveLength(1);
    const obj = text(r.files[0]!);
    expect(obj).not.toContain('mtllib');
    expect(obj).toContain('v 1000 0 0 1 0 0');
    // (0, 1, 0) Y up is (0, 0, 1) Z up.
    expect(obj).toContain('v 0 0 1000 1 0 0');
  });

  it('encodes PNG', () => {
    const png = encodePng(1, 1, new Uint8Array([1, 2, 3, 4]));
    expect(Array.from(png.subarray(0, 8))).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  });
});
