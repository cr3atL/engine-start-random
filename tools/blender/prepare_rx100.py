"""Run through Blender MCP. Adapt Kamesh.Hamare's CC BY RX100 to the game."""
import bpy,bmesh,math,json
from pathlib import Path
from mathutils import Vector,Matrix

ROOT=Path('D:/project/engine-start-random')
S=2.2
def P(p):return Vector((p[0],-p[2],p[1]))
def G(p):return Vector((-p[1]*S,p[2]*S,p[0]*S))
def source_to_blender(p):return P(G(p))

scene=bpy.data.scenes.new('RX100_Game_Asset');bpy.context.window.scene=scene
before=set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=str(ROOT/'.qa/rx100/original.glb'),merge_vertices=True)
imported=list(set(bpy.data.objects)-before)
body=next(o for o in imported if o.type=='MESH' and o.name.startswith('RX100_Body'))
original=body.data.copy();original.transform(body.matrix_world)
source_material=body.data.materials[0]
parts=json.loads((ROOT/'tools/blender/rx100-components.json').read_text())
used=set()
def indices(seeds):
    return set(i for seed in seeds for p in parts if seed in p['indices'] for i in p['indices'])
def extract(name,seeds):
    keep=indices(seeds);used.update(keep)
    mesh=original.copy();mesh.name=name+' geometry';bm=bmesh.new();bm.from_mesh(mesh)
    bmesh.ops.delete(bm,geom=[v for v in bm.verts if v.index not in keep],context='VERTS');bm.to_mesh(mesh);bm.free()
    o=bpy.data.objects.new(name,mesh);scene.collection.objects.link(o);return o
def empty(name,parent=None,pos=(0,0,0)):
    # Previous inspection scenes remain available without stealing canonical names.
    old=bpy.data.objects.get(name)
    if old:old.name='inspection / '+name
    n=bpy.data.objects.new(name,None);scene.collection.objects.link(n);n.parent=parent;n.location=P(pos);return n
asset=empty('RX100_ASSET')
static=empty('RX100_STATIC',asset);tank=empty('RX100_BODY',asset)
engine=empty('RX100_ENGINE',asset)
kick_pivot=G((-.1637,.1188,.39725))
kick=empty('RX100_KICK',asset,kick_pivot)
mirror_pos=G((-.180,-.375,1.240));mirror=empty('RX100_MIRROR',asset,mirror_pos)
tip_pos=G((-.184,.940,.3375));exhaust=empty('RX100_EXHAUST_TIP',asset,tip_pos)
cylinder_pos=Vector((.44,1.122,0));cylinder_angle=.39
cylinder=empty('RX100_CYLINDER',engine,cylinder_pos);cylinder.rotation_euler.y=-cylinder_angle
piston=empty('RX100_PISTON',cylinder,(0,.23,0));crank=empty('RX100_CRANK',cylinder,(0,-.075,-.08));rod=empty('RX100_ROD',cylinder)
boot=empty('RX100_BOOT',asset);leg=empty('RX100_LEG',asset)
bpy.context.view_layer.update()
transform=Matrix(((0,-S,0,0),(-S,0,0,0),(0,0,S,0),(0,0,0,1)))
def mount(o,parent):
    # The game uses the opposite handedness for its side-camera coordinates.
    o.data.transform(transform);o.data.flip_normals()
    o.data.transform(parent.matrix_world.inverted());o.parent=parent;o.matrix_parent_inverse=Matrix.Identity(4)
    o.matrix_basis=Matrix.Identity(4);o['source']='Kamesh.Hamare / Yamaha RX100 / CC BY 4.0'
    return o

hub=extract('RX100 kick axle clamp',[22888]);arm=extract('RX100 kick arm',[25129]);tread=extract('RX100 kick rubber',[23508])
hinge=Vector((-.131,.105,.575));turn=Vector((0,-.9,.435)).normalized().rotation_difference(Vector((-1,0,0))).to_matrix()
for v in tread.data.vertices:
    q=turn@(v.co-hinge);q.x*=1.35;v.co=hinge+q
for o in [hub,arm,tread]:
    for v in o.data.vertices:v.co.x-=.04
    mount(o,kick)
# A real shaft joins the moved clamp to the original case, rather than leaving a gap.
bpy.ops.mesh.primitive_cylinder_add(vertices=24,radius=.029,depth=.14,location=P((kick_pivot.x,kick_pivot.y,kick_pivot.z+.065)))
shaft=bpy.context.object;shaft.name='RX100 kick shaft into crankcase';shaft.rotation_euler.x=math.pi/2
bpy.ops.object.transform_apply(location=False,rotation=True,scale=True)
shaft.data.materials.append(bpy.data.materials.get('Hardware | zinc and polished steel') or source_material)
world=shaft.matrix_world.copy();shaft.parent=static;shaft.matrix_world=world

mount(extract('RX100 fuel tank and cap',[988,88]),tank)
mirror_indices=[p['indices'][0] for p in parts if p['high'][0]<-.17 and p['low'][2]>1.23]
mount(extract('RX100 right mirror',mirror_indices),mirror)
fin_seeds=[p['indices'][0] for p in parts if p['vertices']==24 and p['low'][2]>.55 and p['high'][2]<.735 and p['low'][1]>-.30 and p['high'][1]<-.05 and p['low'][0]>-.09 and p['high'][0]<.09]
barrel=extract('RX100 original cylinder and head',[0,*fin_seeds])
header=extract('RX100 original exhaust header',[50])
mount(header,static)
muffler=extract('RX100 original muffler',[22523])
# Split the actual rear outlet at a common plane. Its boundary stays coincident.
tail=muffler.copy();tail.data=muffler.data.copy();scene.collection.objects.link(tail);tail.name='RX100 expanding exhaust outlet'
for o,front in [(muffler,False),(tail,True)]:
    bm=bmesh.new();bm.from_mesh(o.data)
    bmesh.ops.bisect_plane(bm,geom=list(bm.verts)+list(bm.edges)+list(bm.faces),dist=.000001,plane_co=(0,.94,0),plane_no=(0,1,0),clear_inner=front,clear_outer=not front)
    bm.to_mesh(o.data);bm.free()
mount(muffler,static);mount(tail,exhaust)

# Keep the source cylinder and every cooling fin intact. Its own shell is the
# inspection view, rather than adding a second cylinder around the same space.
mount(barrel,cylinder)
xray=bpy.data.materials.new('RX100 original cylinder / inspection transparency');xray.use_nodes=True
shader=next(n for n in xray.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
shader.inputs['Base Color'].default_value=(.34,.40,.42,1)
shader.inputs['Metallic'].default_value=.25;shader.inputs['Roughness'].default_value=.52
shader.inputs['Alpha'].default_value=.10;xray.diffuse_color=(.34,.40,.42,.10)
xray.use_backface_culling=True
# Read available enums instead of relying on a Blender-version-specific mode.
prop=xray.bl_rna.properties.get('surface_render_method')
if prop:
    modes=[i.identifier for i in prop.enum_items]
    if 'DITHERED' in modes:xray.surface_render_method='DITHERED'
barrel.data.materials.append(xray)
bm=bmesh.new();bm.from_mesh(barrel.data)
bmesh.ops.bisect_plane(bm,geom=list(bm.verts)+list(bm.edges)+list(bm.faces),plane_co=P((0,.405,0)),plane_no=P((0,1,0)),dist=.000001)
for face in bm.faces:
    if face.calc_center_median().z<.405:face.material_index=1
bm.to_mesh(barrel.data);bm.free()
cut=[]
# Preserve authored footwear and trousers, and the existing internal moving parts.
def copy_children(old_name,parent):
    source=bpy.data.objects[old_name]
    for child in source.children:
        if child.type!='MESH':continue
        o=child.copy();o.data=child.data.copy();scene.collection.objects.link(o);o.name='RX100 '+child.name.split(' | ')[-1];o.parent=parent;o.matrix_parent_inverse=Matrix.Identity(4);o.matrix_basis=child.matrix_basis.copy()
copy_children('CC110_BOOT',boot)
copy_children('CC110_PISTON',piston);copy_children('CC110_CRANK',crank);copy_children('CC110_ROD',rod)
old_cloth=bpy.data.objects.get('RX100_TROUSER_MESH')
if old_cloth:old_cloth.name='inspection / RX100_TROUSER_MESH'
cloth_source=bpy.data.objects['CC110_TROUSER_MESH'];cloth=cloth_source.copy();cloth.data=cloth_source.data.copy();scene.collection.objects.link(cloth);cloth.name='RX100_TROUSER_MESH';cloth.parent=leg;cloth.matrix_basis=Matrix.Identity(4)
for j in range(65):
    s=j/64;radius=.110+.067*math.sin(s*math.pi*.68)**1.1
    for i in range(33):
        a=i/32*math.tau
        fold=(.008*math.sin(s*155+math.cos(a)*2.6)+.003*math.sin(s*245+math.sin(a)))*math.exp(-s*10)*(.3+.7*abs(math.sin(a)))+.010*math.sin((s-.5)*82+math.cos(a)*2)*math.exp(-((s-.5)/.09)**2)*max(.15,-math.cos(a))
        rr=radius+fold+.010*math.exp(-((s-.025)/.025)**2)
        cloth.data.vertices[j*33+i].co=P((math.cos(a)*rr,s*2.2,math.sin(a)*rr*.94))

# Remove the extracted vertices from the static body using their original indices.
mesh=original.copy();bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.delete(bm,geom=[v for v in bm.verts if v.index in used],context='VERTS');bm.to_mesh(mesh);bm.free()
static_body=bpy.data.objects.new('RX100 chassis, engine cases and hardware',mesh);scene.collection.objects.link(static_body);mount(static_body,static)
import_world={o:o.matrix_world.copy() for o in imported}
for o in imported:
    if o.type=='MESH' and o!=body:
        o.data.transform(import_world[o]);o.parent=None;o.matrix_world=Matrix.Identity(4);mount(o,static)
for o in imported:
    if o.type!='MESH' or o==body:bpy.data.objects.remove(o,do_unlink=True)

# Preserve the imported PBR atlas; reduce resolution in Blender for mobile memory.
texture_dir=ROOT/'assets/blender/rx100-textures';texture_dir.mkdir(exist_ok=True)
for mat in {m for o in asset.children_recursive if o.type=='MESH' for m in o.data.materials if m}:
    if mat in [source_material] or mat.name.startswith('Tyer1'):
        mat.name='RX100 source PBR / '+mat.name;mat.diffuse_color=(.35,.35,.35,1)
        for n in mat.node_tree.nodes:
            if n.type=='TEX_IMAGE' and n.image:
                image=n.image;size=2048 if mat==source_material else 1024
                if image.size[0]>size:image.scale(size,size)
                image.pack()
    # Every exchange mesh needs UVs; added bore and shaft use a small planar map.
for o in asset.children_recursive:
    if o.type!='MESH':continue
    uv=o.data.uv_layers.active or o.data.uv_layers.new(name='Surface UV')
    if o==shaft:
        for poly in o.data.polygons:
            for li in poly.loop_indices:
                p=o.data.vertices[o.data.loops[li].vertex_index].co;uv.data[li].uv=(p.x*3,p.z*3)
scene.unit_settings.scale_length=1
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type=='VIEW_3D':area.spaces.active.shading.type='SOLID';area.spaces.active.shading.color_type='MATERIAL'
bpy.context.view_layer.update()
tread_points=[kick.matrix_world.inverted()@tread.matrix_world@v.co for v in tread.data.vertices]
# Contact under the inner forefoot, near the outer half of the unfolded rubber.
local_tip=Vector((sum(p.x for p in tread_points)/len(tread_points),sum(p.z for p in tread_points)/len(tread_points),-sum(p.y for p in tread_points)/len(tread_points)))
local_tip.z=min(-p.y for p in tread_points)*.82+local_tip.z*.18
layout={'asset':'rx100-game.glb','prefix':'RX100','units_per_metre':2.65,'source_scale':S,
    'cylinder':{'mount':list(cylinder_pos),'angle':cylinder_angle,'inspection':'original transparent shell','piston_rest':.23,'piston_travel':.065},
    'kick':{'pivot':list(kick_pivot),'tip':list(local_tip),'rubber_radius':.035,'swing':1.7},
    'boot':{'contact':[.12,-.08,.10],'ankle':[-.17,.265,0]},
    'rider':{'hip':[-.90,2.92,0],'hip_depth':-.08,'thigh':1.12,'shin':1.08},
    'mirror':{'pivot':list(mirror_pos)},'exhaust':{'pivot':list(tip_pos),'outlet':list(G((-.184,1.045,.3375)))},
    'mechanic':{'home':[.32,1.20,-.70],'hatch':[-.22,1.12,-.65]},
    'credit':{'title':'Yamaha RX100','author':'Kamesh.Hamare','url':'https://sketchfab.com/3d-models/yamaha-rx100-7615fba3db6e4e1ebd0d11eac80a0050','license':'CC BY 4.0'}}
(ROOT/'public/assets/models/rx100-layout.json').write_text(json.dumps(layout,indent=2),encoding='utf8')
bpy.data.libraries.write(str(ROOT/'assets/blender/rx100-game.blend'),{scene},fake_user=True)
bpy.ops.object.select_all(action='DESELECT')
for o in [asset,*asset.children_recursive]:o.select_set(True)
bpy.context.view_layer.objects.active=asset
bpy.ops.export_scene.gltf(filepath=str(ROOT/'public/assets/models/rx100-game.glb'),use_selection=True,use_active_scene=True,export_format='GLB',export_yup=True,export_animations=False,export_extras=True)
print(json.dumps({'asset':layout['asset'],'kick':layout['kick'],'meshes':sum(o.type=='MESH' for o in asset.children_recursive),'bytes':(ROOT/'public/assets/models/rx100-game.glb').stat().st_size,'window_faces_removed':len(cut)}))
