"""Geometry refinements identified during in-game visual review. Execute via MCP."""
import bpy,bmesh,math,ast
from pathlib import Path
from mathutils import Vector
scene=bpy.context.scene
def P(p):return Vector((p[0],-p[2],p[1]))
shoe=bpy.data.objects['CC110_BOOT']
rubber_mesh=next(o for o in shoe.children if o.type=='MESH' and 'Rubber' in o.name)
bm=bmesh.new();bm.from_mesh(rubber_mesh.data)
seen=set();delete=[]
for start in bm.verts:
    if start in seen:continue
    component=set();todo=[start]
    while todo:
        v=todo.pop()
        if v in component:continue
        component.add(v);todo.extend(e.other_vert(v) for e in v.link_edges)
    seen.update(component)
    if min(v.co.x for v in component)>.14 and max(v.co.z for v in component)>.04:
        delete.extend(component)
bmesh.ops.delete(bm,geom=delete,context='VERTS');bm.to_mesh(rubber_mesh.data);bm.free()
# Follow the actual boot surface, rather than recomputing a different toe curve.
upper=next(o for o in shoe.children if o.type=='MESH' and 'leather' in o.name)
data=upper.data;data.update()
faces=[p for p in data.polygons if all(data.vertices[i].co.x>.145 for i in p.vertices) and p.center.z>-.025]
used=sorted({i for p in faces for i in p.vertices});remap={v:i for i,v in enumerate(used)}
verts=[tuple(data.vertices[i].co+data.vertices[i].normal*.0045) for i in used]
mesh=bpy.data.meshes.new('Toe overlay conforming surface');mesh.from_pydata(verts,[],[tuple(remap[i] for i in p.vertices) for p in faces]);mesh.update()
o=bpy.data.objects.new('Conforming protective toe overlay',mesh);scene.collection.objects.link(o);o.parent=shoe;o.data.materials.append(bpy.data.materials['Rubber | charcoal'])
for p in mesh.polygons:p.use_smooth=True
# The visible upper mounts now continue all the way to the chassis.
parent=bpy.data.objects['CC110_ENGINE']
for a,b in [((-.43,1.14,.035),(-.50,1.49,.035)),((-.10,1.14,.035),(-.04,1.43,.035))]:
    aa,bb=P(a),P(b);direction=bb-aa
    bpy.ops.mesh.primitive_cylinder_add(vertices=24,radius=.022,depth=direction.length,location=(aa+bb)/2)
    o=bpy.context.object;o.name='Connected engine hanger';o.parent=parent;o.rotation_mode='QUATERNION';o.rotation_quaternion=Vector((0,0,1)).rotation_difference(direction.normalized());o.data.materials.append(bpy.data.materials['Frame | black powder coated steel'])
print('Removed intersecting toe shell; rebuilt conforming overlay; connected engine stays to backbone.')
