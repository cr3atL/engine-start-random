"""Independent mesh/marker audit, executed after the existing pedal audit."""
rig=layout['mechanism'];cyl=bpy.data.objects['RX100_CYLINDER'];pis=bpy.data.objects['RX100_PISTON'];rot=bpy.data.objects['RX100_CRANK'];con=bpy.data.objects['RX100_ROD']
native_case=next(o for o in meshes('RX100_STATIC') if 'original crankcase' in o.name)
def surface_tree(objects,opaque=False):
    points=[];faces=[]
    for o in objects:
        o.data.calc_loop_triangles();offset=len(points);points.extend(o.matrix_world@v.co for v in o.data.vertices)
        for t in o.data.loop_triangles:
            if opaque and 'inspection transparency' in o.data.materials[o.data.polygons[t.polygon_index].material_index].name:continue
            faces.append(tuple(offset+i for i in t.vertices))
    return BVHTree.FromPolygons(points,faces,all_triangles=True)
def joint(name):return bpy.data.objects[name].matrix_world.translation.copy()
def apply_phase(phase):
    center=Vector(rig['crank_center']);pin=center+Vector((rig['throw']*math.cos(phase),rig['throw']*math.sin(phase),0))
    rise=math.sqrt(rig['rod_length']**2-pin.x**2);py=pin.y+rise-rig['wrist'][1]
    pis.location=P((0,py,0));rot.location=P(center);rot.rotation_euler.y=-phase
    con.location=P(pin);con.rotation_euler.y=-math.atan2(pin.x,rise);con.scale=(1,1,1)
    bpy.context.view_layer.update();return py
opaque_barrel=surface_tree([head],True);opaque_case=surface_tree([native_case],True)
engine_poses=[]
for phase in [i*math.tau/32 for i in range(32)]+[rig['top_phase'],rig['bottom_phase']]:
    py=apply_phase(phase);big=joint('RX100_ROD_BIG_JOINT');small=joint('RX100_ROD_SMALL_JOINT');wrist=joint('RX100_WRIST_JOINT');pin=joint('RX100_CRANK_PIN_JOINT')
    engine_poses.append({'phase':phase,'piston_y':py,'big_pin_error':(big-pin).length,'small_pin_error':(small-wrist).length,'rod_length_error':abs((small-big).length-rig['rod_length']),'piston_casting_intersections':len(surface_tree(meshes('RX100_PISTON')).overlap(opaque_barrel)),'rod_case_intersections':len(surface_tree(meshes('RX100_ROD')).overlap(opaque_case)),'crank_case_intersections':len(surface_tree(meshes('RX100_CRANK')).overlap(opaque_case))})
apply_phase(0)
opaque_area=sum(f.area for f in head.data.polygons if 'inspection transparency' not in head.data.materials[f.material_index].name);total_area=sum(f.area for f in head.data.polygons)
report['engine_poses']=engine_poses;report['opaque_cylinder_fraction']=opaque_area/total_area
report['piston_crown_to_head_clearance']=rig['head_height']-max(p['piston_y'] for p in engine_poses)-.056
report['piston_radial_clearance']=rig['bore_radius']-.076
report['measured_cylinder_axis']=rig['measured_axis'];report['actual_cylinder_axis']=list((cyl.matrix_world.to_3x3()@P((0,1,0))).normalized())
report['axis_alignment_error']=(P(rig['measured_axis'])-Vector(report['actual_cylinder_axis'])).length
report['engine_passed']=all(p['big_pin_error']<1e-5 and p['small_pin_error']<1e-5 and p['rod_length_error']<1e-5 and p['piston_casting_intersections']==0 and p['rod_case_intersections']==0 and p['crank_case_intersections']==0 for p in engine_poses) and report['axis_alignment_error']<1e-5 and report['piston_crown_to_head_clearance']>0 and report['piston_radial_clearance']>0 and report['opaque_cylinder_fraction']>.75
report['passed']=report['passed'] and report['engine_passed']
