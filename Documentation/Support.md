# Format and limits

## What is written

- Meshes, as triangles with normals and texture coordinates, a `usemtl` wherever the material changes.
- Lines (`l`) and points (`p`).
- Vertex colours after the positions (`v x y z r g b`), as Blender, MeshLab and many others read.
- Materials: diffuse, specular and emissive colours, shininess, opacity, and the PBR extension's roughness (Pr) and metalness (Pm).
- Colour, emissive, alpha, normal, bump, roughness and metalness maps, as PNG files.

## Units and orientation

Coordinates are written in metres and Y up unless `unit` and `zUp` say otherwise.

## Limits

OBJ has no hierarchy, lights, cameras or animation; objects are written in world coordinates. Textures are read through a canvas in browsers; in Node, only textures with raw 8-bit pixels (DataTexture) are written, and others are left out with a warning.
