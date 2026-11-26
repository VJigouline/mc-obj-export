# mc-obj-export

A Wavefront OBJ exporter for [three.js](https://threejs.org/), written in TypeScript. It writes three.js scenes as Wavefront OBJ with an MTL material library and PNG textures, returned separately and as one zip: meshes with normals, texture coordinates and vertex colours, lines and points, in world coordinates. It was made for [SceneEditor](https://github.com/VJigouline/SceneEditor), and works in any three.js application.

```ts
import { exportObj } from 'mc-obj-export';

const { zip: file } = await exportObj(scene);
// file.data is a Uint8Array: download it, or write it to disk.
const url = URL.createObjectURL(new Blob([file.data], { type: file.mimeType }));
```

## What it writes

- Meshes, as triangles with normals and texture coordinates, a `usemtl` wherever the material changes.
- Lines (`l`) and points (`p`).
- Vertex colours after the positions (`v x y z r g b`), as Blender, MeshLab and many others read.
- Materials: diffuse, specular and emissive colours, shininess, opacity, and the PBR extension's roughness (Pr) and metalness (Pm).
- Colour, emissive, alpha, normal, bump, roughness and metalness maps, as PNG files.

OBJ has no hierarchy, lights, cameras or animation; objects are written in world coordinates. Textures are read through a canvas in browsers; in Node, only textures with raw 8-bit pixels (DataTexture) are written, and others are left out with a warning. See [Format and limits](Documentation/Support.md) for the details.

## Install

The package is not on the npm registry. Install it from GitHub:

```sh
npm install github:VJigouline/mc-obj-export
```

`three` (r160 or later) is a peer dependency. The package builds itself on install.

## Documentation

- [Getting started](Documentation/GettingStarted.md)
- [API](Documentation/API.md)
- [Format and limits](Documentation/Support.md)
- [Using it in SceneEditor](Documentation/SceneEditor.md)

## Development

```sh
npm install
npm test           # unit tests, with Vitest
npm run typecheck
npm run build      # dist/
```

The tests write files and read them back with three.js's loaders. It needs Node.js 22 or later.

## Licence

[MIT](LICENSE)
