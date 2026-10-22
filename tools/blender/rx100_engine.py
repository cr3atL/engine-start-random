"""Executed by prepare_rx100.py inside Blender MCP; all points are engine-local."""
def material(name,color,metallic,roughness):
    m=bpy.data.materials.new(name);m.use_nodes=True
    p=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
    p.inputs['Base Color'].default_value=(*color,1);p.inputs['Metallic'].default_value=metallic;p.inputs['Roughness'].default_value=roughness
    m.diffuse_color=(*color,1);return m
aluminum=material('RX100 turned piston aluminum',(.42,.45,.46),.8,.28)
steel=material('RX100 forged connecting rod steel',(.22,.25,.27),.85,.32)
ring_metal=material('RX100 compression ring steel',(.065,.075,.08),.8,.34)
bronze=material('RX100 wrist bearing bronze',(.37,.22,.065),.8,.32)
bore_material=material('RX100 native bored aluminum',(.16,.18,.19),.75,.38)
xray=material('RX100 original shell / inspection transparency',(.34,.38,.39),.15,.55)
next(n for n in xray.node_tree.nodes if n.type=='BSDF_PRINCIPLED').inputs['Alpha'].default_value=.20
xray.diffuse_color=(.34,.38,.39,.20);xray.use_backface_culling=True
prop=xray.bl_rna.properties.get('surface_render_method')
if prop and 'DITHERED' in [i.identifier for i in prop.enum_items]:xray.surface_render_method='DITHERED'

def mesh_part(name,points,faces,mat,parent):
    me=bpy.data.meshes.new(name+' geometry');me.from_pydata([P(p) for p in points],[],faces);me.materials.append(mat)
    o=bpy.data.objects.new(name,me);scene.collection.objects.link(o);o.parent=parent
    bm=bmesh.new();bm.from_mesh(me);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(me);bm.free()
    uv=me.uv_layers.new(name='Machining UV')
    for poly in me.polygons:
        for li in poly.loop_indices:
            q=me.vertices[me.loops[li].vertex_index].co;uv.data[li].uv=(q.x*5,q.z*5)
    return o
def annulus(name,center,outer,inner,depth,mat,parent,axis='Z',segments=48):
    points=[]
    for zz in [-depth/2,depth/2]:
        for radius in [outer,inner]:
            for i in range(segments):
                a=i/segments*math.tau;x=math.cos(a)*radius;y=math.sin(a)*radius
                q=Vector((x,y,zz)) if axis=='Z' else Vector((x,zz,y))
                points.append(tuple(q+Vector(center)))
    faces=[];n=segments
    for i in range(n):
        j=(i+1)%n
        faces.extend([(i,j,n+j,n+i),(2*n+i,3*n+i,3*n+j,2*n+j),(i,2*n+i,2*n+j,j),(n+i,n+j,3*n+j,3*n+i)])
    o=mesh_part(name,points,faces,mat,parent)
    for p in o.data.polygons:p.use_smooth=p.index%4>=2
    return o
def disc_part(name,center,radius,depth,mat,parent,axis='Z'):
    # A tiny inner radius keeps topology shared with the machined ring helper.
    return annulus(name,center,radius,.0001,depth,mat,parent,axis)
def marker(name,parent,point):return empty(name,parent,point)

mount(barrel,cylinder)
# Clip only the bore's interior. Unlike a boolean across overlapping fin bricks,
# this retains every source exterior face, including the exhaust mating port.
barrel.data.materials.clear();barrel.data.materials.append(source_material);barrel.data.materials.append(bore_material)
bm=bmesh.new();bm.from_mesh(barrel.data)
radial_planes=[Vector((math.cos(i*math.tau/8),0,math.sin(i*math.tau/8))) for i in range(8)]
for normal in radial_planes:
    bmesh.ops.bisect_plane(bm,geom=list(bm.verts)+list(bm.edges)+list(bm.faces),plane_co=P(normal*.086),plane_no=P(normal),dist=.000001)
for y in [-.01,.365]:bmesh.ops.bisect_plane(bm,geom=list(bm.verts)+list(bm.edges)+list(bm.faces),plane_co=P((0,y,0)),plane_no=P((0,1,0)),dist=.000001)
remove=[]
for f in bm.faces:
    p=f.calc_center_median();q=Vector((p.x,p.z,-p.y))
    if -.009999<q.y<.364999 and all(q.dot(n)<.085999 for n in radial_planes):remove.append(f)
bmesh.ops.delete(bm,geom=remove,context='FACES')
# The inner wall belongs to the native casting mesh; it is not another sleeve.
wall=[]
for yy in [0,.36]:
    wall.append([bm.verts.new(P((math.cos(i*math.tau/64)*.086,yy,math.sin(i*math.tau/64)*.086))) for i in range(64)])
for i in range(64):
    j=(i+1)%64;f=bm.faces.new((wall[0][i],wall[0][j],wall[1][j],wall[1][i]));f.material_index=1
bm.to_mesh(barrel.data);bm.free()
# Open the native case's internal passage without capping the old artist's
# overlapping case pieces. The exterior side walls and circular rim stay intact.
case_to_engine=cylinder.matrix_world.inverted()@case.matrix_world
case.data.transform(case_to_engine)
bm=bmesh.new();bm.from_mesh(case.data)
for co,no in [((-.155,0,0),(1,0,0)),((.155,0,0),(1,0,0)),((0,-.28,0),(0,1,0)),((0,.12,0),(0,1,0)),((0,0,-.09),(0,0,1)),((0,0,.09),(0,0,1))]:
    bmesh.ops.bisect_plane(bm,geom=list(bm.verts)+list(bm.edges)+list(bm.faces),plane_co=P(co),plane_no=P(no),dist=.000001)
inside=[f for f in bm.faces if (lambda c:abs(c.x)<.154999 and -.279999<c.z<.119999 and abs(c.y)<.089999)(f.calc_center_median())]
bmesh.ops.delete(bm,geom=inside,context='FACES');bm.to_mesh(case.data);bm.free()
case.data.transform(case_to_engine.inverted())
barrel.data.materials.append(xray)
xray_index=len(barrel.data.materials)-1
bm=bmesh.new();bm.from_mesh(barrel.data)
for co,no in [((-.105,0,0),(1,0,0)),((.105,0,0),(1,0,0)),((0,.012,0),(0,1,0)),((0,.348,0),(0,1,0)),((0,0,-.004),(0,0,1))]:
    bmesh.ops.bisect_plane(bm,geom=list(bm.verts)+list(bm.edges)+list(bm.faces),plane_co=P(co),plane_no=P(no),dist=.000001)
for f in bm.faces:
    c=f.calc_center_median()
    if abs(c.x)<.104999 and .012001<c.z<.347999 and -c.y<-.004001:f.material_index=xray_index
bm.to_mesh(barrel.data);bm.free()

# A small round viewing area in the existing crankcase leaves the native rim,
# fasteners and lower casting solid. The top channel reveals the rod connection.
case.data.materials.append(xray);bm=bmesh.new();bm.from_mesh(case.data)
cx,cy=crank_world.x,crank_world.y;radius=.128
planes=[(P((cx+math.cos(a)*radius,cy+math.sin(a)*radius,0)),P((math.cos(a),math.sin(a),0))) for a in [i*math.tau/16 for i in range(16)]]
planes.extend([(P((cx-.075,0,0)),P((1,0,0))),(P((cx+.075,0,0)),P((1,0,0))),(P((0,cy+.04,0)),P((0,1,0))),(P((0,cy+.21,0)),P((0,1,0))),(P((0,0,-.004)),P((0,0,1)))])
for co,no in planes:bmesh.ops.bisect_plane(bm,geom=list(bm.verts)+list(bm.edges)+list(bm.faces),plane_co=co,plane_no=no,dist=.000001)
for f in bm.faces:
    c=f.calc_center_median();q=Vector((c.x,c.z,-c.y));d=q-Vector((cx,cy,0))
    inside=all(d.x*math.cos(i*math.tau/16)+d.y*math.sin(i*math.tau/16)<radius-.000001 for i in range(16))
    channel=abs(d.x)<.074999 and .040001<d.y<.209999
    f.material_index=1 if q.z<-.004001 and (inside or channel) else 0
bm.to_mesh(case.data);bm.free()

# Remove coplanar subdivision left by the inspection masks, keeping material
# and UV boundaries. This preserves the native fin silhouette on mobile.
for o in [barrel,case]:
    bm=bmesh.new();bm.from_mesh(o.data)
    bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.000001)
    bmesh.ops.dissolve_limit(bm,angle_limit=.0001,use_dissolve_boundaries=False,verts=list(bm.verts),edges=list(bm.edges),delimit={'MATERIAL','UV'})
    bm.to_mesh(o.data);bm.free()

# One concentric piston with a real hollow skirt, crown and through wrist pin.
annulus('RX100 piston skirt',(0,-.012,0),.074,.061,.096,aluminum,piston,'Y')
disc_part('RX100 piston crown',(0,.041,0),.074,.030,aluminum,piston,'Y')
for i,yy in enumerate([.020,.035,.050]):annulus('RX100 piston compression ring '+str(i),(0,yy,0),.076,.073,.004,ring_metal,piston,'Y')
disc_part('RX100 piston wrist pin',(0,-.018,0),.010,.145,steel,piston)
for z in [-.068,.068]:annulus('RX100 piston pin boss',(0,-.018,z),.017,.0101,.012,aluminum,piston)
marker('RX100_WRIST_JOINT',piston,mechanism['wrist'])

# Two crank webs share a single main-shaft axis, with one eccentric crank pin.
r=mechanism['throw']
for z in [-.052,.052]:
    annulus('RX100 crank web',(0,0,z),.108,.017,.018,steel,crank)
    annulus('RX100 crank machined face',(0,0,z+(-.010 if z<0 else .010)),.087,.077,.002,aluminum,crank)
disc_part('RX100 crank main shaft',(0,0,0),.017,.158,aluminum,crank)
disc_part('RX100 crank eccentric pin',(r,0,0),.015,.132,aluminum,crank)
annulus('RX100 crank pin collar',(r,0,-.064),.021,.015,.004,aluminum,crank)
marker('RX100_CRANK_PIN_JOINT',crank,(r,0,0))

# Fixed-length rod: both eyes are geometry at the actual pin centers. Runtime
# only rotates/translates this rigid object; it never scales its length.
L=mechanism['rod_length']
annulus('RX100 rod big end',(0,0,0),.029,.0155,.027,steel,rod)
annulus('RX100 rod small end',(0,L,0),.020,.0105,.022,bronze,rod)
profile=[(-.017,.020),(-.011,.070),(-.009,L-.045),(-.014,L-.014),(.014,L-.014),(.009,L-.045),(.011,.070),(.017,.020)]
points=[(x,y,z) for z in [-.009,.009] for x,y in profile];n=len(profile)
faces=[tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
mesh_part('RX100 forged rod beam',points,faces,steel,rod)
marker('RX100_ROD_BIG_JOINT',rod,(0,0,0));marker('RX100_ROD_SMALL_JOINT',rod,(0,L,0))

def engine_pose(phase):
    c=Vector(mechanism['crank_center']);pin=c+Vector((r*math.cos(phase),r*math.sin(phase),0))
    wrist_y=pin.y+math.sqrt(L*L-pin.x*pin.x)
    return pin,wrist_y-mechanism['wrist'][1],math.atan2(pin.x,wrist_y-pin.y)
pin,py,angle=engine_pose(0)
piston.location=P((0,py,0));crank.location=P(mechanism['crank_center']);rod.location=P(pin);rod.rotation_euler.y=-angle
mechanism['top_phase']=math.acos(-mechanism['crank_center'][0]/(L+r))
mechanism['bottom_phase']=-math.acos(mechanism['crank_center'][0]/(L-r))
mechanism['bore_radius']=.086;mechanism['head_height']=.379937
mechanism['measured_axis']=list(axis);mechanism['native_axis_offset']=axis_offset
