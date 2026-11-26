# Getting started

## Install

```sh
npm install three github:VJigouline/mc-obj-export
```

## Write a file

`exportObj(root, options)` writes the scenes under `root`, usually a scene, as `.obj`, `.mtl` and PNG textures. It returns a promise of the result.

```ts
import { exportObj } from 'mc-obj-export';

const result = await exportObj(scene, { name: 'model' });
for (const warning of result.warnings) console.warn(warning);
const file = result.zip;    // or result.files, one by one

// In a browser, download it:
const link = document.createElement('a');
link.href = URL.createObjectURL(new Blob([file.data], { type: file.mimeType }));
link.download = file.name;
link.click();

// In Node, write it:
// fs.writeFileSync(file.name, file.data);
```

## Units and orientation

Coordinates are written in metres and Y up unless `unit` and `zUp` say otherwise.

## Options

- **`onlyVisible`** (default true): Leaves out hidden objects and those under hidden parents.
- **`filter`** (default —): A function that decides, for each object, whether it is exported, such as one leaving out an editor's helpers.
- **`materials`** (default true): Writes the material library and textures.
- **`textures`** (default true): Writes textures as PNG files.
- **`vertexColors`** (default true): Writes vertex colours.
- **`unit`** (default 'meter'): The unit coordinates are written in: 'micron', 'millimeter', 'centimeter', 'meter', 'inch' or 'foot'.
- **`zUp`** (default false): Turns three.js's Y up into Z up.
- **`name`** (default 'scene'): The files' name, without extension.

See the [API](API.md) for the whole result.
