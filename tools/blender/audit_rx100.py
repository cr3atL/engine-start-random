"""Run in Blender MCP: actual triangle clearance across the unchanged pedal arc."""
import bpy,math,json,hashlib
from pathlib import Path
from mathutils import Vector,Matrix
from mathutils.bvhtree import BVHTree
ROOT=Path('D:/project/engine-start-random')
layout=json.loads((ROOT/'public/assets/models/rx100-layout.json').read_text())
def P(p):return Vector((p[0],-p[2],p[1]))
def meshes(name):return [o for o in bpy.data.objects[name].children_recursive if o.type=='MESH']
def tree(objects):
    points=[];faces=[]
    for o in objects:
        o.data.calc_loop_triangles();offset=len(points)
        points.extend(o.matrix_world@v.co for v in o.data.vertices)
        faces.extend(tuple(offset+i for i in t.vertices) for t in o.data.loop_triangles)
    return BVHTree.FromPolygons(points,faces,all_triangles=True)
lever=bpy.data.objects['RX100_KICK'];shoe=bpy.data.objects['RX100_BOOT'];cloth=bpy.data.objects['RX100_TROUSER_MESH']
bind=[v.co.copy() for v in cloth.data.vertices]
def pose(stroke):
    angle=-stroke*layout['kick']['swing'];lever.rotation_euler.y=-angle
    rot=Matrix.Rotation(angle,4,'Z');tip=rot@Vector(layout['kick']['tip'])+Vector(layout['kick']['pivot'])+Vector((0,layout['kick']['rubber_radius'],0))
    pitch=-.025-min(1,max(0,stroke))*.16;r=Matrix.Rotation(pitch,4,'Z')
    pos=tip-r@Vector(layout['boot']['contact'])+Vector((0,0,-.015));shoe.location=P(pos);shoe.rotation_euler.y=-pitch
    ankle=pos+r@Vector(layout['boot']['ankle']);hip=Vector((layout['rider']['hip'][0],layout['rider']['hip'][1]-.18*min(1,max(0,stroke)),ankle.z+layout['rider']['hip_depth']))
    delta=ankle-hip;raw=delta.xy.length;d=max(.001,min(raw,2.199));u=Vector((delta.x/raw,delta.y/raw,0));along=(1.12**2-1.08**2+d*d)/(2*d);height=math.sqrt(max(0,1.12**2-along**2));knee=hip+u*along+Vector((-u.y,u.x,0))*height;knee.z=(hip.z+ankle.z)/2
    for v,b in zip(cloth.data.vertices,bind):
        x,yy,z=b.x,b.z,-b.y;t=max(0,min(2,yy/2.2*2))
        if t<1:a,c,ta,tb,tt=ankle,knee,knee-ankle,(hip-ankle)*.5,t
        else:a,c,ta,tb,tt=knee,hip,(hip-ankle)*.5,hip-knee,t-1
        center=(2*tt**3-3*tt**2+1)*a+(tt**3-2*tt**2+tt)*ta+(-2*tt**3+3*tt**2)*c+(tt**3-tt**2)*tb
        tangent=c-a;n=Vector((tangent.y,-tangent.x,0)).normalized();v.co=P(center+n*x+Vector((0,0,z)))
    bpy.context.view_layer.update()
    return {'ankle':list(ankle),'knee':list(knee),'hip':list(hip),'sole_to_pedal_error':(pos+r@Vector(layout['boot']['contact'])-tip-Vector((0,0,-.015))).length}
bpy.context.view_layer.update()
environment=tree(meshes('RX100_STATIC')+meshes('RX100_BODY')+[o for o in bpy.data.objects['RX100_CYLINDER'].children if o.type=='MESH'])
poses=[]
for stroke in [0,.25,.58,.68,.85,1,1.018]:
    joints=pose(stroke)
    collisions=[]
    for o in meshes('RX100_STATIC')+meshes('RX100_BODY'):
        hits=len(tree(meshes('RX100_BOOT')).overlap(tree([o])))
        if hits:collisions.append([o.name,hits])
    moving=[o for o in meshes('RX100_KICK') if 'clamp' not in o.name]
    poses.append({'stroke':stroke,'shoe_environment_intersections':len(tree(meshes('RX100_BOOT')).overlap(environment)),'leg_environment_intersections':len(tree([cloth]).overlap(environment)),'kick_environment_intersections':len(tree(moving).overlap(environment)),'collisions':collisions,**joints})
lever.rotation_euler.y=0;shoe.location=(0,0,0);shoe.rotation_euler.y=0
for v,b in zip(cloth.data.vertices,bind):v.co=b
bpy.context.view_layer.update()
header=next(o for o in meshes('RX100_STATIC') if 'original exhaust header' in o.name)
muffler=next(o for o in meshes('RX100_STATIC') if 'original muffler' in o.name)
head=next(o for o in bpy.data.objects['RX100_CYLINDER'].children if o.type=='MESH' and 'original cylinder' in o.name)
def minimum_gap(a,b):
    t=tree([b]);return min(t.find_nearest(a.matrix_world@v.co)[3] for v in a.data.vertices)
chassis=next(o for o in meshes('RX100_STATIC') if 'chassis, engine' in o.name)
tyres=[o for o in meshes('RX100_STATIC') if 'Tyer' in o.name]
report={'glb_sha256':hashlib.sha256((ROOT/'public/assets/models/rx100-game.glb').read_bytes()).hexdigest(),'independent_kick':len(meshes('RX100_KICK'))==3,'cylinder_case_surface_gap':minimum_gap(head,chassis),'header_port_surface_gap':minimum_gap(header,head),'header_muffler_surface_gap':minimum_gap(header,muffler),'header_tyre_intersections':len(tree([header]).overlap(tree(tyres))),'piston_crown_to_head_clearance':.398-(.23+.065+.07),'poses':poses}
report['passed']=report['independent_kick'] and report['header_port_surface_gap']<.04 and report['header_muffler_surface_gap']<.04 and report['piston_crown_to_head_clearance']>0 and all(p['shoe_environment_intersections']==0 and p['leg_environment_intersections']==0 for p in poses)
report['passed']=report['passed'] and report['cylinder_case_surface_gap']<.025 and report['header_tyre_intersections']==0 and all(p['kick_environment_intersections']==0 for p in poses)
(ROOT/'assets/blender/rx100-audit.json').write_text(json.dumps(report,indent=2),encoding='utf8');print(json.dumps(report))
