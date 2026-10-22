"""CC110-inspired game asset, authored and executed in Blender via Blender MCP.

Authoring coordinates: X forward, Y up, Z right (camera at negative Z).
P converts those coordinates to Blender. Dimensions are 2.65 units/metre.
The editable source, GLB and mechanical audit are saved together.
"""
import bpy, math, json
from mathutils import Vector
from pathlib import Path

ROOT = Path('D:/project/engine-start-random')
OUT = ROOT / 'public/assets/models'
OUT.mkdir(parents=True, exist_ok=True)
SRC = ROOT / 'assets/blender'
SRC.mkdir(parents=True, exist_ok=True)
TAU = math.tau

def P(p): return Vector((p[0], -p[2], p[1]))
def mat(name, color, rough=.5, metal=0, grain=None):
    m=bpy.data.materials.new(name); m.use_nodes=True
    n=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
    n.inputs['Base Color'].default_value=(*color,1)
    n.inputs['Metallic'].default_value=metal
    n.inputs['Roughness'].default_value=rough
    m.diffuse_color=(*color,1)
    if grain:
        noise=m.node_tree.nodes.new('ShaderNodeTexNoise'); noise.inputs['Scale'].default_value=grain[0]
        bump=m.node_tree.nodes.new('ShaderNodeBump'); bump.inputs['Strength'].default_value=grain[1]; bump.inputs['Distance'].default_value=.008
        m.node_tree.links.new(noise.outputs['Fac'],bump.inputs['Height']); m.node_tree.links.new(bump.outputs['Normal'],n.inputs['Normal'])
    return m

# A new scene leaves the user's other scene data intact.
old=bpy.context.scene
scene=bpy.data.scenes.new('CC110_Blender_Rebuild')
bpy.context.window.scene=scene
paint=mat('Cub | deep olive enamel',(.053,.085,.065),.42,.16)
steel=mat('Frame | black powder coated steel',(.014,.019,.018),.47,.32)
rubber=mat('Rubber | charcoal',(.018,.021,.018),.87,0,(140,.12))
aluminum=mat('Engine | sand cast aluminum',(.33,.36,.35),.65,.82,(185,.24))
machined=mat('Engine | turned aluminum',(.52,.55,.54),.32,.90)
chrome=mat('Hardware | zinc and polished steel',(.60,.64,.65),.23,.96)
gasket=mat('Oil darkened gasket',(.025,.024,.019),.84,.15)
plastic=mat('ABS | satin black',(.021,.025,.024),.62,.04)
vinyl=mat('Saddle | grain vinyl',(.023,.027,.025),.83,0,(150,.15))
leather=mat('Boot | worn dark brown leather',(.062,.045,.031),.71,0,(95,.20))
thread=mat('Stitch | muted flax',(.23,.19,.12),.91)
denim=mat('Rider | indigo cotton twill',(.035,.052,.068),.95,0,(210,.15))
gold=mat('Piston | gold helper',(.50,.30,.065),.31,.86)
ceramic=mat('Plug | porcelain',(.72,.70,.61),.29)
red=mat('Rear optic | red',(.38,.012,.005),.28,.10)
amber=mat('Indicator | amber',(.65,.19,.012),.29,.06)
lens=mat('Headlight | fluted glass',(.43,.48,.42),.22,.25)

def empty(name,pos=(0,0,0),parent=None):
    o=bpy.data.objects.new(name,None); scene.collection.objects.link(o); o.location=P(pos); o.parent=parent; return o
asset=empty('CC110_ASSET')
static=empty('CC110_STATIC',parent=asset)
engine=empty('CC110_ENGINE',parent=asset)
body=empty('CC110_BODY',parent=asset)
lever=empty('CC110_KICK',(-.16,.78,-.48),asset)
shoe=empty('CC110_BOOT',parent=asset)
leg=empty('CC110_LEG',parent=asset)
mirror=empty('CC110_MIRROR',(1.12,2.66,-.38),asset)
tailpipe=empty('CC110_EXHAUST_TIP',(-2,.80,-.24),asset)
cylinder=empty('CC110_CYLINDER',(.29,.92,0),engine)
cylinder.rotation_euler.y=1.37
piston=empty('CC110_PISTON',(0,.23,0),cylinder)
crank=empty('CC110_CRANK',(0,-.075,-.08),cylinder)

def mesh(name,verts,faces,material,parent=static,smooth=False):
    data=bpy.data.meshes.new(name); data.from_pydata([P(v) for v in verts],[],faces); data.update()
    o=bpy.data.objects.new(name,data); scene.collection.objects.link(o);o.parent=parent
    o.data.materials.append(material)
    if smooth:
        for f in data.polygons:f.use_smooth=True
    return o
def bevel(o,w=.008,segments=3):
    mod=o.modifiers.new('Manufactured edge radii','BEVEL');mod.width=w;mod.segments=segments
    return o
def smooth_closed(points,steps=5):
    out=[]
    for i in range(len(points)):
        a,b,c,d=[Vector(points[(i+j)%len(points)]) for j in [-1,0,1,2]]
        for k in range(steps):
            t=k/steps;out.append(tuple(.5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t)))
    return out
def plate(name,pos,outline,depth,material,parent=static,radius=.008):
    verts=[(pos[0]+x,pos[1]+y,pos[2]+z) for z in [-depth/2,depth/2] for x,y in outline]
    n=len(outline);faces=[tuple(reversed(range(n))),tuple(range(n,2*n))]
    faces += [(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    return bevel(mesh(name,verts,faces,material,parent),radius)
def box(name,pos,size,material,parent=static,r=.01):
    x,y,z=size
    return plate(name,pos,[(-x/2,-y/2),(x/2,-y/2),(x/2,y/2),(-x/2,y/2)],z,material,parent,r)
def tube(name,points,r,material,parent=static,sides=12):
    curve=bpy.data.curves.new(name,'CURVE');curve.dimensions='3D';curve.resolution_u=14
    curve.bevel_depth=r;curve.bevel_resolution=2;curve.resolution_u=12
    spline=curve.splines.new('BEZIER');spline.bezier_points.add(len(points)-1)
    for b,p in zip(spline.bezier_points,points):b.co=P(p);b.handle_left_type='AUTO';b.handle_right_type='AUTO'
    curve.use_fill_caps=True
    o=bpy.data.objects.new(name,curve);scene.collection.objects.link(o);o.parent=parent;o.data.materials.append(material);return o
def rod(name,a,b,r,material,parent=static,n=24):
    a,b=Vector(a),Vector(b);axis=(b-a).normalized();side=axis.cross(Vector((0,0,1)))
    if side.length<.01:side=axis.cross(Vector((0,1,0)))
    side.normalize();other=axis.cross(side).normalized()
    verts=[tuple(p+r*(side*math.cos(TAU*i/n)+other*math.sin(TAU*i/n))) for p in [a,b] for i in range(n)]
    faces=[tuple(reversed(range(n))),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    o=mesh(name,verts,faces,material,parent,True);return bevel(o,min(r*.13,.004),2)
def disc(name,pos,r,depth,material,parent=static,n=48):
    return rod(name,(pos[0],pos[1],pos[2]-depth/2),(pos[0],pos[1],pos[2]+depth/2),r,material,parent,n)
def bolt(name,pos,parent=static,rad=.017):
    disc(name+' washer',pos,rad*1.45,.004,machined,parent,24)
    return disc(name+' hex',(pos[0],pos[1],pos[2]-.009),rad,.016,chrome,parent,6)
def revolve(name,profile,material,parent=static,pos=(0,0,0),n=64):
    # profile = radius, axial depth; rotational axis Z in authoring coordinates.
    verts=[(pos[0]+r*math.cos(TAU*i/n),pos[1]+r*math.sin(TAU*i/n),pos[2]+z) for r,z in profile for i in range(n)]
    faces=[(j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i) for j in range(len(profile)-1) for i in range(n)]
    return mesh(name,verts,faces,material,parent,True)
def loft(name,rows,material,parent=static,n=32):
    # Soft elliptical cross section: x, half width, top, bottom.
    sampled=[]
    for k in range(len(rows)-1):
        a,b,c,d=[Vector(rows[min(len(rows)-1,max(0,k+j))]) for j in [-1,0,1,2]]
        for s in range(5):
            t=s/5;sampled.append(.5*(2*b+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t))
    sampled.append(Vector(rows[-1]));verts=[]
    for x,w,top,bottom in sampled:
        for i in range(n):
            a=TAU*i/n;c=math.cos(a);si=math.sin(a)
            verts.append((x,(top+bottom)/2+math.copysign(abs(c)**.65,c)*(top-bottom)/2,math.copysign(abs(si)**.8,si)*max(.001,w)))
    faces=[tuple(reversed(range(n))),tuple(range((len(sampled)-1)*n,len(sampled)*n))]
    faces += [(j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i) for j in range(len(sampled)-1) for i in range(n)]
    return mesh(name,verts,faces,material,parent,True)
def sweep_shell(name,anchors,material,parent=body):
    # Formed rounded-rectangle sections, thin changes in cross section, subdivision.
    verts=[];n=16
    for j,(x,y,rx,rz) in enumerate(anchors):
        prev=Vector(anchors[max(0,j-1)][:2]);nxt=Vector(anchors[min(len(anchors)-1,j+1)][:2]);t=(nxt-prev).normalized();normal=Vector((-t.y,t.x))
        for i in range(n):
            a=TAU*i/n;c=math.cos(a);s=math.sin(a);off=math.copysign(abs(c)**.65,c)*rx
            verts.append((x+normal.x*off,y+normal.y*off,math.copysign(abs(s)**.65,s)*rz))
    faces=[tuple(reversed(range(n))),tuple(range((len(anchors)-1)*n,len(anchors)*n))]+[(j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i) for j in range(len(anchors)-1) for i in range(n)]
    o=mesh(name,verts,faces,material,parent,True);sub=o.modifiers.new('Pressed panel continuity','SUBSURF');sub.levels=2;return o

# Wheels, chassis and running gear: real proportions, no sphere tires.
for x in [-1.60,1.6595]:
    revolve('80-90 R17 rounded tire',[(.565,-.075),(.61,-.102),(.69,-.094),(.744,-.052),(.762,0),(.744,.052),(.69,.094),(.61,.102),(.565,.075)],rubber,pos=(x,.763,0),n=96)
    revolve('Cast alloy rim',[(.13,-.06),(.54,-.06),(.574,-.07),(.578,-.052),(.555,-.038),(.55,.038),(.578,.052),(.574,.07),(.54,.06),(.13,.06)],steel,pos=(x,.763,0))
    disc('Axle hub',(x,.763,0),.125,.19,steel)
    for i in range(10):
        a=i*TAU/10
        outline=[(math.cos(a+off)*r,math.sin(a+off)*r) for r,off in [(.12,-.13),(.55,-.045),(.55,.035),(.12,.15)]]
        plate('Tapered ten spoke casting',(x,.763,0),outline,.058,steel,radius=.007)
    for i in range(72):
        a=i*TAU/72
        for z in [-.047,.047]:
            p=(x+math.cos(a)*.755,.763+math.sin(a)*.755,z)
            o=box('Shallow block tread',p,(.037,.008,.055),rubber,r=.003)
            # Rotate around its own centre after baking the manufacturing origin.
            o.data.transform(__import__('mathutils').Matrix.Translation(-P(p)));o.location=P(p);o.rotation_euler.y=-(a-math.pi/2)
    if x>0:
        revolve('Front brake friction disc',[(.16,-.123),(.275,-.123),(.275,-.137),(.16,-.137),(.16,-.123)],machined,pos=(x,.763,0))
        for i in range(32):
            a=i*TAU/32;disc('Rotor drilled recess',(x+.24*math.cos(a),.763+.24*math.sin(a),-.14),.008,.002,gasket,n=12)
        box('Floating brake caliper',(x-.24,.90,-.17),(.11,.19,.08),steel,r=.025)
    else:disc('Rear drum plate',(x,.763,-.115),.13,.022,steel)
    bolt('Axle',(x,.763,-.18),rad=.026)

for z in [-.14,.14]:
    tube('Welded backbone rail',[(-1.25,1.80,z),(-.55,1.63,z),(-.40,.93,z)],.036,steel)
    rod('Box swingarm',(-1.60,.763,z),(-.43,.89,z),.044,steel)
    rod('Engine hanger',(-.47,1.40,z),(-.40,.84,z),.032,steel)
    rod('Telescopic fork lower',(1.6595,.763,z),(1.38,1.39,z),.046,aluminum)
    rod('Chromed fork stanchion',(1.38,1.36,z),(1.02,2.13,z),.027,chrome)
    rod('Fork gaiter core',(1.38,1.39,z),(1.19,1.82,z),.046,rubber)
    for i in range(15):
        y=1.40+i*.029;x=1.38-(y-1.39)*.44
        rod('Accordion gaiter fold',(x,y-.006,z),(x-.006,y+.006,z),.055,rubber,n=24)
    rod('Front mudguard stay',(1.64,.80,z),(1.53,1.52,z),.010,steel)
    rod('Rear shock damper',(-1.56,.85,z*1.55),(-1.40,1.69,z*1.55),.030,chrome)
    spring=[]
    for i in range(157):
        t=i/156;a=t*TAU*12;spring.append((-1.54+.12*t+.052*math.cos(a),.99+.57*t,z*1.55+.052*math.sin(a)))
    tube('Rear suspension coil',spring,.009,steel)
    for xx,yy in [(-1.56,.85),(-1.40,1.70)]:bolt('Shock eye',(xx,yy,z*1.55-.035),rad=.021)

def fender(name,x,a0,a1,material,width=.28):
    verts=[];N=49;W=9
    for j in range(W):
        z=(j/(W-1)-.5)*width;rr=.823+.021*math.cos(z/width*math.pi)
        for i in range(N):
            a=(a0+(a1-a0)*i/(N-1))*math.pi/180;verts.append((x+rr*math.cos(a),.763+rr*math.sin(a),z))
    faces=[(j*N+i,j*N+i+1,(j+1)*N+i+1,(j+1)*N+i) for j in range(W-1) for i in range(N-1)]
    o=mesh(name,verts,faces,material,static,True);solid=o.modifiers.new('Stamped sheet thickness','SOLIDIFY');solid.thickness=.009;bevel(o,.004,2)
fender('Front crowned mudguard',1.6595,35,141,steel)
fender('Rear pressed steel mudguard',-1.60,80,192,paint,.30)
box('Rear splash flap',(-2.43,.68,.0),(.055,.36,.28),rubber,r=.01)
box('Enclosed chain guard',(-1.07,.86,.13),(1.32,.15,.15),steel,r=.055)
sweep_shell('Cub step-through pressed backbone',[(-.44,1.75,.17,.22),(-.32,1.57,.17,.21),(-.12,1.43,.14,.18),(.08,1.45,.14,.18),(.35,1.64,.15,.19),(.65,1.95,.17,.21),(.77,2.12,.17,.19),(.68,2.37,.14,.16)],paint)
loft('Underseat fuel tank shroud',[(-1.83,.10,1.73,1.56),(-1.65,.20,1.83,1.53),(-1.25,.23,1.90,1.43),(-.76,.26,1.96,1.39),(-.37,.23,1.94,1.42),(-.16,.08,1.68,1.44)],paint,body)
plate('Side cover olive perimeter',(-.70,1.50,-.245),smooth_closed([(-.35,.10),(-.22,.22),(.16,.18),(.30,.06),(.20,-.22),(-.24,-.22)]),.04,paint,body,.012)
plate('Black inset battery cover',(-.70,1.50,-.273),smooth_closed([(-.31,.08),(-.19,.18),(.13,.15),(.26,.04),(.17,-.18),(-.20,-.18)]),.023,plastic,body,.009)
loft('Single saddle upholstered cushion',[(-1.28,.03,2.00,1.90),(-1.19,.23,2.06,1.89),(-.88,.265,2.08,1.88),(-.50,.25,2.06,1.89),(-.31,.18,2.02,1.91),(-.27,.025,1.98,1.93)],vinyl,body)
tube('Saddle perimeter welt',[(-1.19,1.95,-.23),(-.88,1.94,-.266),(-.50,1.94,-.25),(-.32,1.96,-.18)],.003,rubber,body)
tube('Rear carrier perimeter',[(-2.08,1.91,-.27),(-1.29,1.91,-.27),(-1.18,1.91,-.17),(-1.18,1.91,.17),(-1.29,1.91,.27),(-2.08,1.91,.27),(-2.12,1.91,.17),(-2.12,1.91,-.17),(-2.08,1.91,-.27)],.016,steel)
for x in [-1.98,-1.81,-1.64,-1.47,-1.30]:rod('Carrier cross slat',(x,1.91,-.24),(x,1.91,.24),.011,steel)
for z in [-.23,.23]:rod('Rack structural brace',(-2.0,1.90,z),(-1.48,1.67,z),.013,steel)
rod('Steering head',(.75,2.35,0),(.91,1.98,0),.065,steel)
for z in [-.36,.36]:
    tube('Handlebar',[(.77,2.38,0),(.78,2.56,z*.35),(.93,2.66,z),(1.25,2.66,z)],.020,steel)
    rod('Rubber handle grip',(1.12,2.66,z),(1.35,2.66,z),.031,rubber)
    box('Switchgear',(1.08,2.66,z),(.09,.085,.08),plastic,r=.018)
tube('Front brake lever',[(1.10,2.64,-.40),(1.18,2.61,-.48),(1.36,2.61,-.49)],.009,machined)
box('Speedometer pod',(.81,2.58,0),(.24,.18,.24),plastic,r=.065)
rod('Headlamp bucket',(.95,2.18,0),(1.12,2.18,0),.158,plastic,n=64)
rod('Headlamp bezel',(1.12,2.18,0),(1.145,2.18,0),.162,chrome,n=64)
rod('Headlamp glass',(1.145,2.18,0),(1.153,2.18,0),.145,lens,n=64)
for z in [-.17,.17]:tube('Headlamp cage hoop',[(.96,1.98,z),(1.20,1.98,z),(1.22,2.37,z),(.96,2.37,z)],.012,steel)
for z in [-.20,.20]:rod('Headlamp cage crossbar',(1.22,2.02,z),(1.22,2.33,z),.010,steel)
for x,y in [(-2.02,1.73),(1.06,2.18)]:
    for z in [-.30,.30]:
        rod('Indicator stalk',(x,y,z*.45),(x,y,z),.012,steel)
        disc('Indicator bucket',(x,y,z),.05,.08,plastic)
        disc('Amber fluted indicator',(x,y,z+(-.043 if z<0 else .043)),.041,.009,amber)
box('Tail lamp',(-2.12,1.74,0),(.12,.15,.22),plastic,r=.025)
box('Red tail lens',(-2.185,1.74,0),(.02,.115,.18),red,r=.01)
tube('Hydraulic brake hose',[(1.10,2.65,-.34),(.89,2.34,-.24),(1.16,1.86,-.17),(1.38,1.35,-.18),(1.43,.95,-.18)],.006,rubber)
tube('Throttle cable',[(1.10,2.65,-.35),(.74,2.33,-.15),(.62,1.87,.01),(.38,1.32,.05)],.005,rubber)
rod('Footrest crossbar',(-.45,.68,.22),(-.45,.68,-.48),.018,steel)
disc('Rider rubber footpeg',(-.45,.68,-.48),.041,.21,rubber)
for z in [-.075,.075]:rod('Centre stand',(-.40,.65,z),(-.54,.025,z),.014,steel)
rod('Centre stand shoe',(-.66,.021,-.13),(-.37,.021,.13),.014,steel)

# The engine is mounted as a mechanical assembly, with no hidden cylinder.
case_outline=smooth_closed([(-.52,.13),(-.40,.28),(-.13,.31),(.16,.25),(.37,.13),(.40,-.05),(.25,-.24),(-.27,-.27),(-.48,-.16)])
case=plate('Crankcase main casting',(-.10,.84,0),case_outline,.43,aluminum,engine,.020)
plate('Crankcase side gasket',(-.10,.84,-.222),[(x*.98,y*.98) for x,y in case_outline],.012,gasket,engine,.004)
plate('Removable crankcase cover',(-.10,.84,-.259),[(x*.97,y*.96) for x,y in case_outline],.064,aluminum,engine,.016)
revolve('Domed clutch inspection cover',[(.001,-.348),(.12,-.342),(.205,-.320),(.235,-.291),(.238,-.286)],machined,engine,pos=(-.17,.86,0))
disc('Clutch centre service cap',(-.17,.86,-.349),.048,.010,machined,engine)
box('Slotted inspection screw',(-.17,.86,-.356),(.051,.005,.002),gasket,engine,.001)
revolve('Rear gearbox cap',[(.001,-.326),(.095,-.320),(.125,-.292),(.13,-.285)],aluminum,engine,pos=(-.43,.82,0))
for x,y in [(-.52,.99),(-.50,.67),(-.19,.59),(.17,.67),(.25,.92),(.13,1.07)]:bolt('Case M6 bolt',(x,y,-.302),engine,.014)
for x in [-.43,-.10]:rod('Engine mounting boss',(x,1.03,0),(x,1.24,0),.042,aluminum,engine)
rod('Oil drain screw',(-.16,.55,0),(-.16,.59,0),.025,chrome,engine,6)

# Base flange is at local Y=0; barrel starts beyond it. A real cutaway removes
# the front sector, instead of drawing a piston on top of an uncut solid block.
base=box('Cylinder base flange',(0,.012,0),(.335,.035,.33),machined,cylinder,.018)
box('Cylinder base paper gasket',(0,-.009,0),(.32,.008,.315),gasket,cylinder,.008)
verts=[];faces=[];N=48
for y in [.025,.365]:
    for r in [.116,.142]:
        for i in range(N):
            a=(-45+270*i/(N-1))*math.pi/180;verts.append((r*math.cos(a),y,r*math.sin(a)))
for i in range(N-1):
    for a,b in [(0,N),(2*N,3*N),(0,2*N),(N,3*N)]:faces.append((a+i,a+i+1,b+i+1,b+i))
for i in [0,N-1]:faces.append((i,N+i,3*N+i,2*N+i))
mesh('Open cylinder liner | true section',verts,faces,gasket,cylinder,True)
for i in range(10):
    y=.038+i*.034;w=.17-(i/9)*.012;d=.165
    # Cross-section in XZ; open notch on the camera side has two machined lips.
    outline=[(-w,-d),(-.082,-d),(-.082,-.025),(.082,-.025),(.082,-d),(w,-d),(w,d),(-w,d)]
    verts=[(x,yy,z) for yy in [y-.006,y+.006] for x,z in outline];n=len(outline)
    faces=[tuple(reversed(range(n))),tuple(range(n,2*n))]+[(j,(j+1)%n,(j+1)%n+n,j+n) for j in range(n)]
    bevel(mesh('Cutaway cooling fin %02d'%i,verts,faces,aluminum,cylinder),.003,2)
for x in [-.086,.086]:rod('Cutaway machined lip',(x,.025,-.172),(x,.36,-.172),.007,machined,cylinder,12)
head=box('Cylinder head',(0,.425,0),(.335,.135,.34),aluminum,cylinder,.026)
box('Rocker cover gasket',(0,.498,0),(.29,.009,.30),gasket,cylinder,.007)
box('Rocker valve cover',(0,.527,0),(.30,.054,.31),machined,cylinder,.025)
for x in [-.125,.125]:
    for z in [-.118,.118]:rod('Head through stud',(x,.37,z),(x,.56,z),.008,chrome,cylinder,12)
for y in [.39,.46]:bolt('Head side screw',(.13,y,-.177),cylinder,.012)
# Low profile spark plug, perpendicular to the top face of the horizontal head.
plugroot=empty('CC110_PLUG',(.73,1.135,-.045),engine)
rod('Plug hex',(0,0,0),(0,.046,0),.029,machined,plugroot,6)
rod('Plug ceramic core',(0,.035,0),(0,.115,0),.019,ceramic,plugroot)
for i in range(4):rod('Porcelain rib',(0,.05+i*.013,0),(0,.057+i*.013,0),.023,ceramic,plugroot)
rod('High voltage boot',(0,.112,0),(0,.162,0),.024,rubber,plugroot)
tube('Spark plug high tension lead',[(.73,1.29,-.045),(.66,1.39,-.02),(.32,1.36,.03),(-.02,1.24,.08)],.010,rubber,engine)
rod('Injection throttle body',(.41,1.22,.035),(.41,1.35,.035),.047,machined,engine)
tube('Intake rubber manifold',[(.66,1.15,.06),(.57,1.24,.06),(.41,1.23,.035)],.034,rubber,engine)
tube('Airbox intake hose',[(.41,1.35,.035),(.27,1.44,.075),(-.21,1.41,.095)],.044,rubber,engine)
box('Air filter box',(-.16,1.36,.07),(.28,.24,.25),plastic,engine,.04)

# Piston/rod roots are independent animation mounts exported with the assembly.
rod('Piston skirt',(0,-.060,0),(0,.056,0),.073,machined,piston,48)
for yy in [.015,.036,.052]:rod('Piston compression ring',(0,yy-.003,0),(0,yy+.003,0),.076,gasket,piston,48)
disc('Piston gudgeon pin',(0,-.018,-.076),.019,.008,machined,piston,24)
disc('Crank flywheel',(0,0,0),.080,.025,steel,crank)
disc('Crank eccentric pin',(.043,0,-.018),.017,.016,chrome,crank)
conrod=empty('CC110_ROD',parent=cylinder)
rod('Forged connecting rod',(0,-.5,0),(0,.5,0),.016,chrome,conrod,16)

# Exhaust flange, header centreline, muffler and shield are separate components.
port=(.725,.855,-.045)
rod('Exhaust port spigot',(.725,.89,-.045),port,.039,aluminum,engine)
rod('Exhaust flange',(.725,.862,-.045),(.725,.845,-.045),.058,machined,engine)
for z in [-.094,.004]:rod('Exhaust flange stud',(.725,.88,z),(.725,.836,z),.009,chrome,engine,6)
header_points=[port,(.746,.79,-.052),(.78,.64,-.10),(.63,.53,-.21),(.18,.55,-.24),(-.29,.72,-.24),(-.38,.80,-.24)]
tube('Continuous bent exhaust header',header_points,.032,steel,engine)
loft('Black steel muffler',[(-2.0,.035,.835,.765),(-1.91,.080,.88,.72),(-1.59,.095,.894,.706),(-.47,.084,.884,.716),(-.27,.035,.835,.765)],steel)
# Shift muffler to its true side plane; loft authored around z=0.
m=bpy.data.objects['Black steel muffler'];m.location.y=.24
shield=box('Brushed stainless heat shield',(-1.12,.80,-.347),(1.70,.19,.018),machined,r=.052)
for i in range(22):box('Pressed shield slot',(-1.78+i*.059,.80,-.359),(.018,.082,.003),gasket,r=.006)
for x in [-1.86,-.37]:bolt('Heat shield fastener',(x,.80,-.362),rad=.013)
for x in [-1.55,-.40]:rod('Exhaust hanger',(x,.83,-.19),(x+.03,1.01,-.13),.014,steel)
# Tip uses a local -X axis; its radial scale may be animated for the existing gag.
rod('Exhaust tail tip',(-.18,0,0),(0,0,0),.045,steel,tailpipe)
rod('Tail opening',(-.183,0,0),(-.181,0,0),.036,gasket,tailpipe)

# Lever and foot are separate manufactured objects with contact-aware animation.
disc('Kickstarter splined shaft',(0,0,.10),.044,.23,machined,lever)
bolt('Kickstarter pinch bolt',(0,0,-.025),lever,.017)
tube('Forged kickstarter arm',[(0,0,0),(-.035,.15,-.015),(-.13,.36,-.032),(-.14,.425,-.06),(-.10,.46,-.10)],.016,chrome,lever)
disc('Folding pedal hinge',(-.10,.46,-.105),.028,.04,machined,lever)
disc('Kick rubber pedal',(-.10,.46,-.14),.044,.205,rubber,lever)
for i in range(9):disc('Pedal grip rib',(-.10,.46,-.23+i*.022),.047,.005,rubber,lever,32)
rows=[(-.30,.002,.015,-.065),(-.278,.078,.095,-.07),(-.23,.103,.16,-.068),(-.145,.106,.225,-.059),(-.06,.107,.192,-.054),(.035,.119,.125,-.049),(.16,.133,.091,-.044),(.265,.119,.081,-.039),(.322,.063,.052,-.033),(.34,.002,.005,-.012)]
loft('Lasted leather boot upper',rows,leather,shoe,40)
loft('Protective toe overlay',[(x,w+.002,t+.003,b) for x,w,t,b in rows if x>=.16],rubber,shoe,32)
loft('Stitched leather welt',[(x,w+.006,b+.004,b-.020) for x,w,t,b in rows],leather,shoe)
loft('Moulded rubber outsole',[(x,w+.008,b-.018,b-.045) for x,w,t,b in rows],rubber,shoe)
box('Separate heel block',(-.215,-.105,0),(.15,.044,.18),rubber,shoe,.018)
for i in range(5):
    for z in [-.075,.075]:box('Sole tread block',(.015+i*.05,-.099+i*.005,z),(.033,.013,.05),rubber,shoe,.003)
# Soft shaft and tongue are continuous leather surfaces, not an ankle cylinder.
loft('Boot shaft and heel quarter',[(-.286,.045,.08,-.04),(-.255,.087,.21,-.02),(-.21,.11,.278,.002),(-.15,.111,.279,.010),(-.09,.085,.21,.02),(-.060,.025,.13,.03)],leather,shoe,40)
loft('Leather lacing tongue',[(-.21,.050,.286,.254),(-.16,.056,.272,.239),(-.11,.054,.229,.201),(-.055,.048,.190,.166),(.014,.035,.143,.121)],leather,shoe)
for side in [-1,1]:
    tube('Quarter stitched seam',[(-.27,.015,side*.085),(-.24,.12,side*.103),(-.17,.20,side*.11),(-.06,.13,side*.11),(.04,.047,side*.118)],.0018,thread,shoe)
    for i in range(22):
        x=-.25+i*.025;z=side*(.10+.027*math.sin(i/21*math.pi));rod('Welt lockstitch',(x,-.052+i*.0008,z),(x+.008,-.052+i*.0008,z),.0014,thread,shoe,6)
for i in range(5):
    x=-.18+i*.039;y=.272-i*.031
    for z in [-.061,.061]:disc('Lace eyelet',(x,y,z),.009,.004,steel,shoe,16)
    tube('Crossed cotton lace',[(x,y,-.061),(x+.02,y+.007,0),(x+.035,y-.022,.061)],.0032,thread,shoe)
    tube('Crossed cotton lace',[(x,y,.061),(x+.02,y+.010,0),(x+.035,y-.022,-.061)],.0032,thread,shoe)
tube('Tied lace bow',[(-.11,.239,0),(-.15,.253,-.045),(-.10,.249,-.058),(-.09,.241,0),(-.15,.253,.045),(-.10,.249,.058),(-.11,.239,0)],.0025,thread,shoe)

# A real Blender cloth mesh in an unbent bind shape; Babylon deforms the same
# vertices along the existing solved ankle/knee/hip. No regenerated JS leg.
verts=[];faces=[];R=65;N=32
for j in range(R):
    s=j/(R-1);radius=.110+.067*math.sin(s*math.pi*.68)**1.1
    for i in range(N+1):
        a=i/N*TAU
        fold=(.008*math.sin(s*155+math.cos(a)*2.6)+.003*math.sin(s*245+math.sin(a)))*math.exp(-s*10)*(.3+.7*abs(math.sin(a)))+.010*math.sin((s-.5)*82+math.cos(a)*2)*math.exp(-((s-.5)/.09)**2)*max(.15,-math.cos(a))
        rr=radius+fold+.010*math.exp(-((s-.025)/.025)**2)
        verts.append((math.cos(a)*rr,s*2.2,math.sin(a)*rr*.94))
for j in range(R-1):
    for i in range(N):
        a=j*(N+1)+i;b=a+N+1;faces.append((a,a+1,b+1,b))
cloth=mesh('CC110_TROUSER_MESH',verts,faces,denim,leg,True)
# Roll at the hem authored in the mesh, preserving deformation and silhouette.
rod('Mirror stem',(0,0,0),(-.02,.37,-.025),.010,steel,mirror)
disc('Rear view mirror housing',(-.02,.43,-.025),.11,.026,plastic,mirror)
disc('Mirror glass',(-.02,.43,-.042),.097,.003,chrome,mirror)

# Name-critical mounts and interface sizes are exported as metadata.
manifest={
 'version':1,'units_per_metre':2.65,'wheelbase':3.2595,
 'cylinder':{'mount':[.29,.92,0],'angle':-1.37,'base_y':0,'barrel':[.025,.365],'piston_z':0,'piston_rest':.23,'piston_travel':.075},
 'exhaust':{'port':list(port),'header':header_points,'radius':.032,'outlet':[-2.18,.80,-.24]},
 'kick':{'pivot':[-.16,.78,-.48],'tip':[-.10,.46,-.14],'rubber_radius':.047},
 'boot':{'contact':[.12,-.08,0],'ankle':[-.17,.265,0]},
 'cloth':{'height':2.2,'rings':R,'sides':N},
 'roots':[o.name for o in [static,engine,body,cylinder,piston,crank,conrod,lever,shoe,leg,mirror,tailpipe]],
}
(OUT/'cc110-layout.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')

# Resolve all modifier geometry in Blender and ensure outward winding. The
# exchange asset is batched by animated root and material, keeping mobile cost bounded.
for o in list(scene.objects):
    if o.type not in {'MESH','CURVE'}:continue
    bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
    if o.type=='CURVE':bpy.ops.object.convert(target='MESH')
    for mod in list(o.modifiers):bpy.ops.object.modifier_apply(modifier=mod.name)
    import bmesh
    bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free()
for parent in [static,engine,body,cylinder,piston,crank,conrod,lever,shoe,mirror,tailpipe]:
    groups={}
    for o in list(parent.children):
        if o.type=='MESH':groups.setdefault(o.active_material.name,[]).append(o)
    for material,objects in groups.items():
        bpy.ops.object.select_all(action='DESELECT')
        for o in objects:o.select_set(True)
        bpy.context.view_layer.objects.active=objects[0]
        if len(objects)>1:bpy.ops.object.join()
        objects[0].name=parent.name+' | '+material

# Preview resting pose, removable before export to keep runtime bind coordinates.
def preview_pose(stroke=0):
    angle=-stroke*1.7;lever.rotation_euler.y=-angle
    tip=Vector((-.10,.46));c=math.cos(angle);s=math.sin(angle)
    tip=Vector((c*tip.x-s*tip.y-.16,s*tip.x+c*tip.y+.78+.047))
    pitch=-.025-stroke*.16;c=math.cos(pitch);s=math.sin(pitch)
    contact=Vector((c*.12+s*.08,s*.12-c*.08));boot=tip-contact
    shoe.location=P((boot.x,boot.y,-.635));shoe.rotation_euler.y=-pitch
    ankle=Vector((boot.x+c*(-.17)-s*.265,boot.y+s*(-.17)+c*.265,-.635))
    hip=Vector((-.90,2.92-.18*stroke,-.610))
    delta=ankle-hip;d=delta.xy.length;u=Vector((delta.x/d,delta.y/d,0));along=(1.12**2-1.08**2+d*d)/(2*d);h=math.sqrt(max(0,1.12**2-along**2))
    knee=hip+u*along+Vector((-u.y,u.x,0))*h;knee.z=(hip.z+ankle.z)/2
    for v,original in zip(cloth.data.vertices,verts):
        x,yy,z=original;t=yy/2.2*2
        if t<1:a,b,ta,tb,tt=ankle,knee,knee-ankle,(hip-ankle)*.5,t
        else:a,b,ta,tb,tt=knee,hip,(hip-ankle)*.5,hip-knee,t-1
        center=(2*tt**3-3*tt**2+1)*a+(tt**3-2*tt**2+tt)*ta+(-2*tt**3+3*tt**2)*b+(tt**3-tt**2)*tb
        tangent=b-a;n=Vector((tangent.y,-tangent.x,0)).normalized();v.co=P(center+n*x+Vector((0,0,z)))
    return {'ankle':list(ankle),'knee':list(knee),'hip':list(hip)}

# GLB exported in bind shape; runtime roots attach to the existing motion solver.
bpy.ops.object.select_all(action='DESELECT')
for o in asset.children_recursive+[asset]:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'cc110-rebuilt.glb'),use_selection=True,export_format='GLB',export_yup=True,export_animations=False,export_extras=True)
preview_pose(0)
world=bpy.data.worlds.new('Neutral inspection studio');scene.world=world;world.use_nodes=True
next(n for n in world.node_tree.nodes if n.type=='BACKGROUND').inputs[0].default_value=(.23,.23,.23,1)
scene.unit_settings.scale_length=1/2.65
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type=='VIEW_3D':
            area.spaces.active.shading.type='SOLID'
            area.spaces.active.clip_end=100
bpy.ops.wm.save_as_mainfile(filepath=str(SRC/'cc110-rebuilt.blend'))
print(json.dumps({'file':str(SRC/'cc110-rebuilt.blend'),'glb_bytes':(OUT/'cc110-rebuilt.glb').stat().st_size,'meshes':sum(o.type=='MESH' for o in scene.objects),'triangles':sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in scene.objects if o.type=='MESH')}))
