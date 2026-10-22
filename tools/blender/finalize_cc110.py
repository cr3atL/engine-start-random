"""Run in Blender through MCP after rebuilding or resuming the saved scene."""
import bpy, math, json, ast
from pathlib import Path
from mathutils import Vector
ROOT=Path('D:/project/engine-start-random')
scene=bpy.context.scene
asset=bpy.data.objects['CC110_ASSET']
lever=bpy.data.objects['CC110_KICK'];shoe=bpy.data.objects['CC110_BOOT'];cloth=bpy.data.objects['CC110_TROUSER_MESH']
verts=[]
for j in range(65):
    s=j/64;radius=.110+.067*math.sin(s*math.pi*.68)**1.1
    for i in range(33):
        a=i/32*math.tau
        fold=(.008*math.sin(s*155+math.cos(a)*2.6)+.003*math.sin(s*245+math.sin(a)))*math.exp(-s*10)*(.3+.7*abs(math.sin(a)))+.010*math.sin((s-.5)*82+math.cos(a)*2)*math.exp(-((s-.5)/.09)**2)*max(.15,-math.cos(a))
        rr=radius+fold+.010*math.exp(-((s-.025)/.025)**2)
        verts.append((math.cos(a)*rr,s*2.2,math.sin(a)*rr*.94))
source=ast.parse((ROOT/'tools/blender/rebuild_cc110.py').read_text(encoding='utf-8'))
funcs=[n for n in source.body if isinstance(n,ast.FunctionDef) and n.name in ['P','preview_pose']]
exec(compile(ast.Module(body=funcs,type_ignores=[]),'<Blender pose helpers>','exec'))
for o in scene.objects:
    if o.type=='MESH' and o!=cloth and len(o.data.polygons)>15000 and not o.get('mobile_optimized'):
        bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
        mod=o.modifiers.new('Mobile topology reduction','DECIMATE');mod.ratio=.55
        bpy.ops.object.modifier_apply(modifier=mod.name);o['mobile_optimized']=True

# Export exactly the authored object hierarchy at canonical bind coordinates.
shoe.location=(0,0,0);shoe.rotation_euler=(0,0,0);lever.rotation_euler=(0,0,0)
for v,p in zip(cloth.data.vertices,verts):v.co=P(p)
# Real exchange UVs are needed for the leather, denim and microscopic roughness.
for o in scene.objects:
    if o.type!='MESH':continue
    uv=o.data.uv_layers.active or o.data.uv_layers.new(name='Surface UV')
    if o==cloth:
        for poly in o.data.polygons:
            for li in poly.loop_indices:
                vi=o.data.loops[li].vertex_index
                uv.data[li].uv=((vi%33)/32,(vi//33)/64*5)
    else:
        for poly in o.data.polygons:
            axis=max(range(3),key=lambda k:abs(poly.normal[k]));axes=[k for k in range(3) if k!=axis]
            for li in poly.loop_indices:
                p=o.data.vertices[o.data.loops[li].vertex_index].co
                uv.data[li].uv=(p[axes[0]]*2,p[axes[1]]*2)
scene.unit_settings.scale_length=1
bpy.ops.object.select_all(action='DESELECT')
for o in [asset,*asset.children_recursive]:o.select_set(True)
bpy.context.view_layer.objects.active=asset
bpy.ops.export_scene.gltf(filepath=str(ROOT/'public/assets/models/cc110-rebuilt.glb'),use_selection=True,export_format='GLB',export_yup=True,export_animations=False,export_extras=True)
manifest=json.loads((ROOT/'public/assets/models/cc110-layout.json').read_text())
manifest['cylinder']['piston_z']=0
if 'CC110_ROD' not in manifest['roots']:manifest['roots'].append('CC110_ROD')
(ROOT/'public/assets/models/cc110-layout.json').write_text(json.dumps(manifest,indent=2))
preview_pose(0)
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type=='VIEW_3D':
            area.spaces.active.shading.type='SOLID';area.spaces.active.shading.color_type='MATERIAL';area.spaces.active.overlay.show_overlays=False
bpy.ops.object.select_all(action='DESELECT')
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/blender/cc110-mcp.blend'))
print(json.dumps({'bytes':(ROOT/'public/assets/models/cc110-rebuilt.glb').stat().st_size,'triangles':sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in scene.objects if o.type=='MESH')}))
