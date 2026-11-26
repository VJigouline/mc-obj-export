# API

## `exportObj(root, options?)`

Writes `.obj`, `.mtl` and PNG textures and returns a promise of a `ObjExportResult`.

### Options

| Option | Default | Meaning |
| --- | --- | --- |
| `onlyVisible` | true | Leaves out hidden objects and those under hidden parents. |
| `filter` | — | A function that decides, for each object, whether it is exported, such as one leaving out an editor's helpers. |
| `materials` | true | Writes the material library and textures. |
| `textures` | true | Writes textures as PNG files. |
| `vertexColors` | true | Writes vertex colours. |
| `unit` | 'meter' | The unit coordinates are written in: 'micron', 'millimeter', 'centimeter', 'meter', 'inch' or 'foot'. |
| `zUp` | false | Turns three.js's Y up into Z up. |
| `name` | 'scene' | The files' name, without extension. |

### `ObjExportResult`

| Field | Type | Meaning |
| --- | --- | --- |
| `zip` | `ExportFile` | The .obj, .mtl and textures, zipped. |
| `files` | `ExportFile[]` | The same files, separately. |
| `stats` | object | Objects, vertices, faces, lines, points, materials and textures. |
| `warnings` | `string[]` | What was left out, and why. |

`ExportFile` is `{ name, data, mimeType }`, with `data` a `Uint8Array`.

See the package's `index.d.ts` for every exported type and helper.
