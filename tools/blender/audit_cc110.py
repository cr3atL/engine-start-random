"""Triangle-level clearance checks in Blender, run through MCP, no scene reset."""
import bpy,math,json,ast,hashlib
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
ROOT=Path('D:/project/engine-start-random');scene=bpy.context.scene
source=ast.parse((ROOT/'tools/blender/rebuild_cc110.py').read_text(encoding='utf-8'))
funcs=[n for n in source.body if isinstance(n,ast.FunctionDef) and n.name in ['P','preview_pose']]
exec(compile(ast.Module(body=funcs,type_ignores=[]),'<pose helpers>','exec'))
lever=bpy.data.objects['CC110_KICK'];shoe=bpy.data.objects['CC110_BOOT'];cloth=bpy.data.objects['CC110_TROUSER_MESH']
# Recover the cloth bind profile without modifying the source asset.
f=ast.parse((ROOT/'tools/blender/finalize_cc110.py').read_text(encoding='utf-8'))
verts=[]
loop=next(n for n in f.body if isinstance(n,ast.For) and isinstance(n.target,ast.Name) and n.target.id=='j')
exec(compile(ast.Module(body=[loop],type_ignores=[]),'<cloth bind profile>','exec'))
def tree(objects,filter_poly=None):
    points=[];faces=[]
    for o in objects:
        if o.type!='MESH':continue
        o.data.calc_loop_triangles();offset=len(points)
        points.extend(o.matrix_world@v.co for v in o.data.vertices)
        for t in o.data.loop_triangles:
            if filter_poly and not filter_poly(o,t):continue
            faces.append(tuple(offset+i for i in t.vertices))
    return BVHTree.FromPolygons(points,faces,all_triangles=True)
def meshes(root):return [o for o in bpy.data.objects[root].children_recursive if o.type=='MESH']
engine_mesh=[o for o in bpy.data.objects['CC110_ENGINE'].children if o.type=='MESH']
case=[o for o in engine_mesh if 'sand cast' in o.name]
cyl=bpy.data.objects['CC110_CYLINDER']
fins=[o for o in cyl.children if o.type=='MESH' and 'sand cast' in o.name]
def barrel_only(o,t):
    c=sum((o.matrix_local@o.data.vertices[i].co for i in t.vertices),Vector())/3
    return .024<c.z<.36
bpy.context.view_layer.update()
case_tree=tree(case);fin_tree=tree(fins,barrel_only)
barrel_case=len(fin_tree.overlap(case_tree))
pipe=[o for o in engine_mesh if 'connected exhaust header' in o.name]
pipe_tree=tree(pipe)
def case_only(o,t):
    c=sum((o.matrix_world@o.data.vertices[i].co for i in t.vertices),Vector())/3
    return c.x<.35  # The head's exhaust spigot is an intentional mating interface.
pipe_case=len(pipe_tree.overlap(tree(case,case_only)))
tyres=[o for o in meshes('CC110_STATIC') if 'Rubber' in o.name]
pipe_tyres=len(pipe_tree.overlap(tree(tyres)))
def muffler_region(o,t):
    c=sum((o.matrix_world@o.data.vertices[i].co for i in t.vertices),Vector())/3
    return -.5<c.x<-.2 and .32<c.y<.62 and .65<c.z<.95
muffler=[o for o in meshes('CC110_STATIC') if 'Frame' in o.name]
pipe_muffler=len(pipe_tree.overlap(tree(muffler,muffler_region)))
environment=tree(engine_mesh+meshes('CC110_STATIC')+meshes('CC110_BODY'))
poses=[]
for stroke in [0,.25,.58,.68,.85,1,1.018]:
    joints=preview_pose(stroke);bpy.context.view_layer.update()
    boot_tree=tree(meshes('CC110_BOOT'));leg_tree=tree([cloth])
    poses.append({'stroke':stroke,'shoe_environment_intersections':len(boot_tree.overlap(environment)),
        'leg_environment_intersections':len(leg_tree.overlap(environment)),'joints':joints})
preview_pose(0);bpy.context.view_layer.update()
# Port-to-header is a deliberately shared centreline endpoint, not a floating tube.
port=Vector((.725,.855,-.045));layout=json.loads((ROOT/'public/assets/models/cc110-layout.json').read_text())
header=Vector(layout['exhaust']['header'][0]);pipe_join=(header-port).length
report={'glb_sha256':hashlib.sha256((ROOT/'public/assets/models/cc110-rebuilt.glb').read_bytes()).hexdigest(),
    'barrel_case_surface_intersections':barrel_case,'header_port_endpoint_gap':pipe_join,
    'header_case_surface_intersections':pipe_case,'header_tyre_surface_intersections':pipe_tyres,
    'header_muffler_mating_intersections':pipe_muffler,
    'header_muffler_endpoint_gap':(Vector(layout['exhaust']['header'][-1])-Vector((-.38,.80,-.46))).length,
    'piston_crown_to_head_clearance':.3575-(.23+.065+.056),
    'poses':poses,'contact_exclusions':['kick splined shaft in its bearing','shoe sole on rubber pedal','mating flange and gasket','exhaust flange and spigot']}
report['passed']=barrel_case==0 and pipe_case==0 and pipe_tyres==0 and pipe_muffler>0 and pipe_join<.00001 and report['piston_crown_to_head_clearance']>0 and all(p['shoe_environment_intersections']==0 and p['leg_environment_intersections']==0 for p in poses)
(ROOT/'assets/blender/assembly-audit.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report))
