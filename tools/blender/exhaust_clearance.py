"""Move the side-mounted silencer outside the clutch cover, through Blender MCP."""
import bpy,bmesh,json
from mathutils import Vector
scene=bpy.context.scene;count=0
for o in bpy.data.objects['CC110_STATIC'].children:
    if o.type!='MESH':continue
    bm=bmesh.new();bm.from_mesh(o.data);seen=set();inv=o.matrix_local.inverted()
    for start in bm.verts:
        if start in seen:continue
        component=set();todo=[start]
        while todo:
            v=todo.pop()
            if v in component:continue
            component.add(v);todo.extend(e.other_vert(v) for e in v.link_edges)
        seen.update(component);points=[o.matrix_local@v.co for v in component]
        lo=[min(p[i] for p in points) for i in range(3)];hi=[max(p[i] for p in points) for i in range(3)];mid=[(a+b)/2 for a,b in zip(lo,hi)]
        muffler=hi[0]-lo[0]>1.3 and hi[0]<-.20 and .65<lo[2] and hi[2]<.96
        shield=-2.03<mid[0]<-.25 and abs(mid[2]-.80)<.025 and .32<mid[1]<.41
        hanger=hi[0]-lo[0]<.10 and .81<lo[2]<.86 and .99<hi[2]<1.04 and .11<mid[1]<.21
        if muffler or shield or hanger:
            for v in component:
                p=o.matrix_local@v.co
                p.y+=.22 if not hanger else .22*max(0,min(1,(1.01-p.z)/.18))
                v.co=inv@p
            count+=1
    bm.to_mesh(o.data);bm.free()
bpy.data.objects['CC110_EXHAUST_TIP'].location.y=.46
print('Moved silencer, shield, shield screws and hangers outward:',count,'components')
