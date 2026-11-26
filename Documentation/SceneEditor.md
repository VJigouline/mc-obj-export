# Using it in SceneEditor

[SceneEditor](https://github.com/VJigouline/SceneEditor) saves scenes with mc-obj-export from the **Scene** tab: choose the format under **Select output format**, then **Save Scene**. The **Wavefront OBJ with materials (zip)** format writes a zip of the .obj, its .mtl and PNG textures, which SceneEditor and most 3D programs open.

The transform gizmo and light helpers are left out. Warnings, such as objects the format can't hold, go to the browser console, and a scene that can't be saved gives a **Failure** message.
