# Modeling workflow

- The user requires all subsequent 3D modeling work to be performed in Blender through Blender MCP.
- Use Blender for geometry, proportions, topology, UVs, and model material authoring. Export game-ready assets (normally GLB) for Babylon.js integration.
- Keep gameplay and interaction changes outside modeling tasks unless the user requests them.
- If Blender MCP is unavailable, report the missing connection and pause dependent modeling. Do not silently substitute procedural Babylon.js geometry or direct Blender automation for the requested MCP workflow.
- Before declaring a modeling fix complete, inspect the integrated result from the gameplay camera and an oblique view, including relevant animated contact poses. Check component intersections and mechanical connections.
