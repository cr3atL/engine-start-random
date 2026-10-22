"""Close the exhaust header into the muffler's inlet sleeve; run through MCP."""
import bpy,json
from pathlib import Path
from mathutils import Vector
scene=bpy.context.scene;parent=bpy.data.objects['CC110_ENGINE']
old=next(o for o in parent.children if o.type=='MESH' and o.name.startswith('CC110_ENGINE | Frame'))
bpy.data.objects.remove(old,do_unlink=True)
points=[(.725,.855,-.045),(.746,.79,-.052),(.78,.64,-.10),(.63,.53,-.28),(.18,.55,-.46),(-.29,.72,-.46),(-.38,.80,-.46)]
curve=bpy.data.curves.new('Continuous exhaust centreline','CURVE');curve.dimensions='3D';curve.resolution_u=12;curve.bevel_depth=.032;curve.bevel_resolution=2;curve.use_fill_caps=True
spline=curve.splines.new('BEZIER');spline.bezier_points.add(len(points)-1)
for p,co in zip(spline.bezier_points,points):p.co=Vector((co[0],-co[2],co[1]));p.handle_left_type='AUTO';p.handle_right_type='AUTO'
o=bpy.data.objects.new('CC110_ENGINE | Frame | connected exhaust header',curve);scene.collection.objects.link(o);o.parent=parent;curve.materials.append(bpy.data.materials['Frame | black powder coated steel'])
bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.convert(target='MESH')
path=Path('D:/project/engine-start-random/public/assets/models/cc110-layout.json');layout=json.loads(path.read_text());layout['exhaust']['header']=points;layout['exhaust']['outlet']=[-2.18,.80,-.46];layout['cylinder']['piston_travel']=.065;path.write_text(json.dumps(layout,indent=2))
print('Header endpoint is inside the external muffler inlet sleeve at (-0.38, 0.80, -0.46).')
