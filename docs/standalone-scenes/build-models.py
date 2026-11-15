"""Original Playgrid miniature models. Run: blender -b --python this-file.py.
Offline asset build only. Blender is not a runtime dependency. No imported models/textures.
"""
import bpy, math, sys
from pathlib import Path
from mathutils import Vector
OUT=Path(__file__).resolve().parents[2]/'node-server/public/assets/scenes';OUT.mkdir(parents=True,exist_ok=True)
scene=bpy.context.scene
scene.render.engine='CYCLES';scene.cycles.samples=48;scene.cycles.use_denoising=False
scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA';scene.render.film_transparent=True
scene.render.resolution_percentage=100;scene.render.threads_mode='FIXED';scene.render.threads=6
scene.view_settings.view_transform='AgX'

def material(name,color,rough=.28,metal=0):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal
 return m
ivory=material('polished ivory',(.88,.78,.57),.23);ebony=material('ebony',(.027,.048,.061),.22);gold=material('brushed brass',(.7,.43,.12),.25,.72)
colors=[material(n,c,.24) for n,c in [('coral',(.85,.075,.11)),('lime',(.24,.63,.035)),('gold',(.98,.57,.025)),('blue',(.025,.34,.85))]]
white=material('porcelain',(.92,.93,.87),.17);steel=material('naval steel',(.25,.34,.39),.36,.45);deck=material('deck',(.42,.44,.37),.55);window=material('glass',(.025,.085,.12),.15,.4)

def clear():
 for o in list(bpy.data.objects):bpy.data.objects.remove(o,do_unlink=True)
 scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.35,.43,.5,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.35

def finish(o,mat,bevel=0):
 o.data.materials.append(mat)
 if bevel:
  b=o.modifiers.new('soft machined edges','BEVEL');b.width=bevel;b.segments=3
 if o.type=='MESH':
  for f in o.data.polygons:f.use_smooth=True
  n=o.modifiers.new('weighted normals','WEIGHTED_NORMAL')
 return o

def cube(loc,scale,mat,bevel=.06):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.scale=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);return finish(o,mat,bevel)

def sphere(loc,r,mat,scale=None):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=40,ring_count=24,radius=r,location=loc);o=bpy.context.object
 if scale:o.scale=scale
 return finish(o,mat)

def lathe(profile,mat,segments=64):
 verts=[(r*math.cos(a*2*math.pi/segments),r*math.sin(a*2*math.pi/segments),z) for r,z in profile for a in range(segments)];faces=[]
 for k in range(len(profile)-1):
  for a in range(segments):b=(a+1)%segments;faces.append((k*segments+a,k*segments+b,(k+1)*segments+b,(k+1)*segments+a))
 mesh=bpy.data.meshes.new('turned profile');mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new('turned miniature',mesh);scene.collection.objects.link(o);return finish(o,mat,.015)

def camera(pos,target,ortho,res):
 bpy.ops.object.camera_add(location=pos);c=bpy.context.object;c.rotation_euler=(Vector(target)-c.location).to_track_quat('-Z','Y').to_euler();c.data.type='ORTHO';c.data.ortho_scale=ortho;scene.camera=c;scene.render.resolution_x=res[0];scene.render.resolution_y=res[1]
 for loc,power,size in [((-4,-5,8),650,5),((5,1,5),450,4),((-1,5,6),600,3)]:
  bpy.ops.object.light_add(type='AREA',location=loc);l=bpy.context.object;l.data.energy=power;l.data.shape='DISK';l.data.size=size;l.rotation_euler=(Vector(target)-l.location).to_track_quat('-Z','Y').to_euler()

def render(name,pos=(5,-8,6),target=(0,0,1),ortho=3,res=(256,320)):
 if (OUT/(name+'.png')).exists() and '--force' not in sys.argv:return
 camera(pos,target,ortho,res);scene.render.filepath=str(OUT/(name+'.png'));bpy.ops.render.render(write_still=True);print('ASSET',name,flush=True)

base=[(0,0),(.49,0),(.53,.07),(.53,.16),(.48,.22),(.44,.28),(.4,.32),(.42,.36),(.34,.42),(.25,.65),(.2,.9),(.22,1.02),(.34,1.08),(.34,1.16),(.26,1.22)]
for side,mat in [('w',ivory),('b',ebony)]:
 for piece in ['P','R','N','B','Q','K']:
  clear();profile=base[:]
  if piece=='P':profile=[(r*.83,z*.78) for r,z in base];lathe(profile,mat);sphere((0,0,1.17),.28,mat)
  elif piece=='R':
   lathe(base[:10]+[(.3,.98),(.33,1.05),(.4,1.12),(.4,1.4),(.32,1.4),(.32,1.22),(0,1.22)],mat)
   for a in range(6):
    t=a*math.pi/3;o=cube((math.cos(t)*.32,math.sin(t)*.32,1.49),(.21,.2,.23),mat,.025);o.rotation_euler.z=t
  elif piece=='B':
   lathe(base,mat);head=sphere((0,0,1.5),.3,mat,scale=(.85,.85,1.4));sphere((0,0,1.94),.07,mat)
   # The characteristic miter cut is actual geometry.
   cut=cube((0,-.1,1.68),(.075,1,.6),mat,0);cut.rotation_euler.y=-.5
   m=head.modifiers.new('miter cut','BOOLEAN');m.object=cut;bpy.context.view_layer.objects.active=head;bpy.ops.object.modifier_apply(modifier=m.name);bpy.data.objects.remove(cut,do_unlink=True)
  elif piece=='Q':
   lathe(base+[(.22,1.35),(.27,1.56),(.39,1.75),(.32,1.82),(0,1.82)],mat)
   for a in range(7):
    t=a*2*math.pi/7;sphere((math.cos(t)*.31,math.sin(t)*.31,1.85),.085,mat)
   sphere((0,0,1.86),.1,mat)
  elif piece=='K':
   lathe(base+[(.2,1.36),(.27,1.52),(.31,1.56),(.3,1.64),(.14,1.7),(0,1.7)],mat)
   cube((0,0,1.99),(.13,.16,.65),mat,.025);cube((0,0,2.04),(.46,.16,.14),mat,.025)
  else:
   lathe(base[:7]+[(.29,.45),(.31,.56),(0,.56)],mat)
   # Original extruded horse silhouette, with ears, mane and inset eyes.
   pts=[(-.35,.45),(-.38,.75),(-.2,1.1),(-.1,1.4),(-.6,1.45),(-.7,1.58),(-.57,1.7),(-.18,1.96),(-.12,2.2),(.06,2.09),(.18,2.2),(.28,1.95),(.43,1.6),(.42,1.1),(.32,.72),(.33,.45)]
   v=[(x,y,z) for y in [-.14,.14] for x,z in pts];n=len(pts);faces=[tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
   me=bpy.data.meshes.new('knight');me.from_pydata(v,[],faces);o=bpy.data.objects.new('knight',me);scene.collection.objects.link(o);finish(o,mat,.075)
   for y in [-.19,.19]:sphere((-.12,y,1.76),.035,ebony if side=='w' else gold)
  render('chess-'+side+piece,target=(0,0,1.02),ortho=2.7)

for i,mat in enumerate(colors):
 clear();lathe([(0,0),(.47,0),(.5,.08),(.48,.2),(.4,.3),(.23,.48),(.18,.72),(.23,.8),(0,.8)],mat);sphere((0,0,1.01),.3,mat);render('pawn-'+str(i),target=(0,0,.65),ortho=1.8,res=(192,224))

# Naval miniatures. Long axis X, raised deckhouses, turrets, carrier aircraft and submarine sail.
for kind,length in [('carrier',6),('battleship',5),('destroyer',4.2),('submarine',4.2),('patrol',3)]:
 clear();L=length
 if kind=='submarine':
  sphere((0,0,.25),1,steel,scale=(L/2,.46,.35));cube((.2,0,.65),(.8,.3,.5),steel,.12);cube((.2,0,1),(.07,.07,.4),steel,.02)
 else:
  outline=[(-L/2,-.32),(-L/2+.25,-.53),(L/2-.75,-.48),(L/2,0),(L/2-.75,.48),(-L/2+.25,.53),(-L/2,.32)]
  n=len(outline);vs=[(x,y,z) for z in [0,.38] for x,y in outline];fs=[tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)];me=bpy.data.meshes.new('hull');me.from_pydata(vs,[],fs);ob=bpy.data.objects.new('hull',me);scene.collection.objects.link(ob);finish(ob,steel,.08)
  cube((-.25,0,.4),(L-.7,.78,.12),deck,.04)
  if kind=='carrier':
   cube((-.2,.27,.68),(1.3,.32,.43),steel,.04);cube((-.15,.27,.99),(.7,.3,.23),window,.025)
   for x in [-1.7,-.7,.5,1.4]:cube((x,-.13,.52),(.4,.07,.07),white,.015);cube((x,-.13,.54),(.12,.4,.045),white,.015)
   for x in [-2.1,-1.3,-.5,.3,1.1]:cube((x,-.35,.485),(.35,.025,.01),white,0)
  else:
   cube((-.35,0,.68),(1,.56,.45),steel,.04);cube((-.25,0,.98),(.6,.42,.24),window,.03);cube((-.4,0,1.3),(.05,.05,.5),steel,.015)
   for x in [-L*.33,L*.27]:
    # Turret housing and twin barrels, all within the ship silhouette.
    cube((x,0,.64),(.4,.42,.25),steel,.06)
    for y in [-.1,.1]:cube((x+.3,y,.7),(.58,.045,.045),steel,.015)
 render('ship-'+kind,pos=(0,-6,17),target=(0,0,.3),ortho=7.2,res=(640,180))

# Houses and hotels reflect the existing server's real upgrade level.
for level in [1,2,3,4]:
 clear();count=min(level,3)
 if level<4:
  for i in range(count):
   x=(i-(count-1)/2)*.65;cube((x,0,.3),(.55,.55,.6),ivory,.025)
   verts=[(x-.33,-.34,.58),(x+.33,-.34,.58),(x,-.34,.92),(x-.33,.34,.58),(x+.33,.34,.58),(x,.34,.92)];me=bpy.data.meshes.new('roof');me.from_pydata(verts,[],[(0,1,2),(3,5,4),(0,3,4,1),(1,4,5,2),(2,5,3,0)]);o=bpy.data.objects.new('roof',me);scene.collection.objects.link(o);finish(o,colors[1],.02);cube((x,-.283,.2),(.13,.02,.3),window,.005)
 else:
  cube((0,0,.7),(1.1,.8,1.4),ivory,.04);cube((0,0,1.45),(1.2,.9,.16),colors[0],.04)
  for z in [.3,.65,1]:
   for x in [-.33,0,.33]:cube((x,-.405,z),(.14,.025,.18),window,.008)
 render('building-'+str(level),pos=(3,-5,4),target=(0,0,.65),ortho=2.8,res=(256,224))

# A sculpted miniature car and top hat, used for actual player tokens only.
tycoon_mats=[colors[0],colors[3],colors[1],colors[2],material('purple token',(.4,.16,.73),.24),material('teal token',(.035,.65,.55),.24)]
for idx,mat in enumerate(tycoon_mats):
 clear();cube((0,0,.25),(.95,.48,.25),mat,.1);cube((-.05,0,.48),(.45,.43,.35),mat,.09);cube((.11,0,.5),(.02,.45,.2),window,.02)
 for x in [-.31,.31]:
  for y in [-.25,.25]:sphere((x,y,.17),.13,ebony,scale=(1,.55,1))
 render('car-'+str(idx),pos=(4,-6,4),target=(0,0,.3),ortho=1.7,res=(192,160))

# Botanical miniatures are placed only outside the native course polygon.
leaf=material('garden leaves',(.12,.36,.035),.62);leaflight=material('sunlit leaves',(.31,.53,.065),.6);bark=material('bark',(.2,.09,.035),.65);rock=material('slate',(.24,.32,.3),.7)
for kind in ['tree','rock','bumper']:
 clear()
 if kind=='tree':
  cube((0,0,.6),(.2,.2,1.2),bark,.06)
  for i in range(9):
   t=i*2.4;r=.42 if i<7 else .1;sphere((math.cos(t)*r,math.sin(t)*r,1.2+(i%3)*.23),.45,leaflight if i%3==0 else leaf,scale=(1,1,.85))
 elif kind=='rock':
  for i in range(3):
   bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=.45,location=((i-1)*.35,.1*(i%2),.25));o=bpy.context.object;o.scale=(1,.8,.7);finish(o,rock,.025)
 else:
  lathe([(0,0),(.7,0),(.75,.12),(.7,.3),(.58,.4),(.5,.55),(0,.55)],gold);sphere((0,0,.5),.4,colors[0],scale=(1,1,.5))
 render('garden-'+kind,pos=(0,-5,11),target=(0,0,.7),ortho=2.1,res=(256,256))
# A real procedural walnut surface for the native billiard rail / board frame.
clear();wood=material('walnut',(.3,.1,.025),.28);nodes=wood.node_tree.nodes;links=wood.node_tree.links;tex=nodes.new('ShaderNodeTexNoise');tex.inputs['Scale'].default_value=3;tex.inputs['Detail'].default_value=3;mapping=nodes.new('ShaderNodeVectorMath');mapping.operation='MULTIPLY';mapping.inputs[1].default_value=(2,65,3);coord=nodes.new('ShaderNodeTexCoord');links.new(coord.outputs['Generated'],mapping.inputs[0]);links.new(mapping.outputs[0],tex.inputs[0]);ramp=nodes.new('ShaderNodeValToRGB');ramp.color_ramp.elements[0].color=(.035,.009,.003,1);ramp.color_ramp.elements[1].color=(.31,.105,.024,1);links.new(tex.outputs['Fac'],ramp.inputs[0]);links.new(ramp.outputs[0],nodes.get('Principled BSDF').inputs['Base Color']);cube((0,0,0),(4,4,.1),wood,.01);render('walnut',pos=(0,0,8),target=(0,0,0),ortho=4,res=(512,512))

clear();water=material('ocean',(.015,.13,.19),.16,.28);nodes=water.node_tree.nodes;links=water.node_tree.links;tex=nodes.new('ShaderNodeTexNoise');tex.inputs['Scale'].default_value=26;tex.inputs['Detail'].default_value=3;tex.inputs['Roughness'].default_value=.68;bump=nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.35;bump.inputs['Distance'].default_value=.15;links.new(tex.outputs['Fac'],bump.inputs['Height']);links.new(bump.outputs['Normal'],nodes.get('Principled BSDF').inputs['Normal']);cube((0,0,0),(6,6,.05),water,0);render('ocean',pos=(0,-1,8),target=(0,0,0),ortho=5.8,res=(640,640))
# Original central exchange miniature: decorative civic scenery, never player-owned properties.
clear();paving=material('limestone plaza',(.42,.53,.45),.65);road=material('city roads',(.07,.16,.2),.65);facade=material('city limestone',(.72,.69,.52),.42);glass=material('city glass',(.035,.18,.24),.2,.45)
cube((0,0,-.12),(6,5,.3),road,.15)
for x in [-1.5,0,1.5]:cube((x,0,.045),(.12,4.8,.02),paving,.01)
for y in [-1.5,0,1.5]:cube((0,y,.045),(5.8,.12,.02),paving,.01)
for i,(x,y,w,h) in enumerate([(-2,-1,.8,1),(-1.1,1,.8,2.2),(.1,1.4,.7,1.7),(1.4,1.2,.8,2.6),(2,-.7,.7,1.3),(-2,1.3,.6,1.5),(1,-1.5,.6,.8),(-.7,-1.6,.8,.7)]):
 cube((x,y,h/2+.08),(w,w,h),facade,.04);cube((x,y,h+.1),(w+.1,w+.1,.12),steel,.03)
 for z in [n*.3+.3 for n in range(int(h/.3)-1)]:
  for xx in [-w*.27,w*.27]:cube((x+xx,y-w/2-.01,z),(.13,.025,.14),glass,.005)
for x,y in [(-2.4,-1.9),(-1.6,.3),(.7,.5),(2.4,.2)]:
 cube((x,y,.23),(.08,.08,.4),bark,.01);sphere((x,y,.52),.26,leaflight,scale=(1,1,1.1))
render('exchange-city',pos=(7,-10,10),target=(0,0,.45),ortho=8.8,res=(640,512))
