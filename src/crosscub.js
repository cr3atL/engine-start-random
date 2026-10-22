// Proportions checked against Honda's CC110 side elevation: 1,230 mm wheelbase,
// 784 mm saddle and 80/90-17 tyres. Scene scale is 2.65 units per metre.
export function buildCrossCub(h){
  const {bike,scene,node,loft,rounded,plate,tube,link,cyl,disc,torus,box,ball,bolt,label,
    paint,frame,plastic,rubber,metal,machined,edge,oil,lens,amber,seatMaterial}=h;
  const TAU=Math.PI*2,staticRoots=[];
  const rear=-1.60,front=1.6595,axle=.763;
  function arch(name,x,a0,a1,r,mat,depth=.28){
    const root=node(name,bike);staticRoots.push(root);
    // A shell with a crowned cross-section and a rolled lower edge, not a torus.
    const path=[];for(let i=0;i<=48;i++){const a=(a0+(a1-a0)*i/48)*Math.PI/180;path.push([x+Math.cos(a)*r,axle+Math.sin(a)*r,0]);}
    const ribbons=[];
    for(let j=0;j<=8;j++){
      const z=(j/8-.5)*depth,raise=.055*Math.cos((j/8-.5)*Math.PI)-.025;
      ribbons.push(path.map(([px,py])=>[px+(px-x)/r*raise,py+(py-axle)/r*raise,z]));
    }
    h.ribbon(name,ribbons,mat,root);
    for(const z of [-depth/2,depth/2])tube(name+' hem',path.map(([px,py])=>[x+(px-x)*(r-.025)/r,axle+(py-axle)*(r-.025)/r,z]),.004,mat,root);
    return root;
  }
  for(const x of [rear,front]){
    const wheel=node('CC110 cast wheel',bike);wheel.position.set(x,axle,0);staticRoots.push(wheel);
    const tyre=h.lathe('80/90-17 tire',[[.568,-.071],[.635,-.101],[.705,-.090],[.752,-.052],[.762,0],[.752,.052],[.705,.09],[.635,.101],[.568,.071]],rubber,wheel);
    tyre.rotation.x=Math.PI/2;
    for(const z of [-.079,.079]){
      torus('cast rim flange',[0,0,z],1.150,.019,frame,wheel);
      torus('tire bead',[0,0,z],1.185,.014,rubber,wheel);
      torus('tire sidewall moulding',[0,0,z*1.20],1.292,.006,rubber,wheel);
    }
    torus('rim well',[0,0,0],1.123,.062,frame,wheel);
    for(let i=0;i<10;i++){
      const a=i*TAU/10;
      const p=(r,b=a)=>[Math.cos(b)*r,Math.sin(b)*r,-.022];
      const start=p(.125,a+.12),end=p(.55,a-.025),dx=end[0]-start[0],dy=end[1]-start[1],l=Math.hypot(dx,dy),nx=dy/l,ny=-dx/l;
      const cx=(start[0]+end[0])/2,cy=(start[1]+end[1])/2;
      plate('tapered cast wheel spoke',[cx,cy,0],[[start[0]-cx+nx*.030,start[1]-cy+ny*.030],[end[0]-cx+nx*.020,end[1]-cy+ny*.020],[end[0]-cx-nx*.020,end[1]-cy-ny*.020],[start[0]-cx-nx*.030,start[1]-cy-ny*.030]],.066,.007,h.wheelMaterial,wheel);
    }
    disc('wheel hub',[0,0,0],.26,.19,frame,wheel,48);
    if(x>0){
      torus('front brake friction ring',[0,0,-.126],.486,.052,machined,wheel);
      for(let i=0;i<6;i++){
        const a=i*TAU/6;link('brake rotor carrier',[Math.cos(a)*.10,Math.sin(a)*.10,-.125],[Math.cos(a+.18)*.23,Math.sin(a+.18)*.23,-.125],.025,machined,wheel);
      }
      for(let i=0;i<36;i++){
        const a=i*TAU/36;disc('drilled brake rotor hole',[Math.cos(a)*.24,Math.sin(a)*.24,-.155],.012,.003,oil,wheel,8);
      }
      rounded('front brake caliper',[-.25,.13,-.168],[.125,.20,.085],.022,frame,wheel,.007);
    }else disc('rear brake drum face',[0,0,-.119],.245,.025,frame,wheel,48);
    disc('axle collar',[0,0,-.157],.09,.033,metal,wheel,32);bolt(0,0,-.188,wheel,.40);
    // Shallow, staggered semi-block tread; narrow grooves retain the rubber profile.
    for(let i=0;i<84;i++)for(const z of [-.052,.052]){
      const a=i*TAU/84+(z>0?.019:0),m=box('tread shoulder block',[Math.sin(a)*.755,Math.cos(a)*.755,z],[.035,.008,.058],rubber,wheel);
      m.rotation.z=-a+(z>0?.32:-.32);
    }
    label('80 / 90 — 17',[.0,-.63,-.103],.26,.035,wheel);
  }
  arch('front painted mudguard',front,41,134,.814,frame,.267);
  arch('rear pressed mudguard',rear,76,150,.818,paint,.30);
  // The long pressed rear skirt reaches beyond the tyre, as on the real Cub.
  h.sweep('swept rear mudguard tail',[[-1.85,1.72,.18,.18],[-2.13,1.54,.13,.17],[-2.30,1.20,.10,.15],[-2.43,.97,.08,.14],[-2.66,.84,.015,.13]],paint,bike);
  const flap=rounded('rear rubber splash flap',[-2.64,.69,.01],[.12,.30,.015],.025,rubber,bike,.004);flap.rotation.z=.30;
  // Backbone and the low U-shaped step-through are the defining Cub silhouette.
  const body=node('CC110 formed bodywork',bike);staticRoots.push(body);
  loft('under-seat fuel cell cover',[[-1.90,.12,1.73,1.56],[-1.75,.18,1.83,1.54],[-1.45,.21,1.88,1.50],[-1.28,.225,1.89,1.43],[-.93,.255,1.97,1.39],[-.49,.24,1.94,1.38],[-.25,.19,1.87,1.42],[-.17,.13,1.67,1.40]],paint,body,{roundness:.48,steps:8,sides:48});
  h.sweep('pressed step-through backbone',[
    [-.30,1.68,.205,.23],[-.18,1.48,.17,.205],[.01,1.42,.145,.19],
    [.21,1.49,.15,.19],[.46,1.73,.16,.205],[.72,1.99,.19,.215],
    [.77,2.17,.18,.195],[.67,2.39,.155,.17]],paint,body);
  // The actual frame is hidden under body panels; only mounting structure is exposed.
  tube('steel backbone under shell',[[-1.20,1.84,.04],[-.42,1.67,.04],[.03,1.34,.04],[.55,1.72,.04],[.71,2.37,.04]],.052,frame,bike);
  for(const z of [-.13,.13]){
    link('swingarm pivot to axle',[rear,axle,z],[-.50,.91,z],.060,frame,bike);
    link('engine suspension bracket',[-.46,1.34,z],[-.40,.78,z],.045,frame,bike);
  }
  rounded('enclosed chain case',[-1.06,.85,.14],[1.30,.17,.19],.065,frame,bike,.009);
  for(const x of [-1.47,-.56])bolt(x,.88,-.005,bike,.32);
  const sidePoints=h.smoothOutline([[-.35,.12],[-.23,.23],[.18,.18],[.33,.06],[.25,-.22],[-.23,-.23],[-.36,-.10]],6);
  plate('battery cover rim',[-.70,1.48,-.244],sidePoints,.052,.012,paint,bike);
  plate('satin black side cover',[-.70,1.48,-.278],sidePoints.map(([x,y])=>[x*.90,y*.88]),.035,.009,plastic,bike);
  label('CC110',[-.73,1.49,-.302],.38,.14,bike);
  label('THE CROSSOVER',[-.72,1.395,-.304],.33,.029,bike);
  for(const [x,y]of[[-.99,1.61],[-.43,1.52],[-.50,1.30]])bolt(x,y,-.31,bike,.29);
  const badge=rounded('seat-side model badge',[-.71,1.845,-.25],[.37,.074,.016],.032,plastic,bike,.003);
  label('CROSS CUB',[-.71,1.845,-.261],.30,.042,bike);
  const name=label('HONDA',[.405,1.735,-.229],.61,.13,bike);name.rotation.z=.77;
  // Injection moulding joins and four true-size M6 fasteners.
  tube('backbone panel join',[[.105,1.33,-.173],[.125,1.43,-.194],[.21,1.59,-.188]],.0025,plastic,bike);
  for(const [x,y,z]of[[.15,1.32,-.18],[.59,1.81,-.22],[.73,2.12,-.21],[.59,2.38,-.16]])bolt(x,y,z,bike,.27);
  plate('black intake and electrical shroud',[.48,1.44,-.02],[[-.28,-.12],[.0,.25],[.33,.54],[.24,.04],[.10,-.20]],.32,.008,plastic,bike);
  // Single saddle, under-seat tank cap concealed exactly as on a step-through Cub.
  const seat=node('CC110 single saddle',bike);seat.position.set(-.73,1.985,0);staticRoots.push(seat);
  loft('sculpted single saddle',[[-.55,.03,.020,-.08],[-.47,.235,.08,-.09],[-.21,.265,.095,-.11],[.19,.255,.08,-.11],[.40,.21,.04,-.09],[.44,.025,-.015,-.055]],seatMaterial,seat,{roundness:.43,steps:8,sides:40});
  tube('saddle sewn perimeter',[[-.48,-.04,-.225],[-.20,-.075,-.263],[.18,-.075,-.255],[.39,-.035,-.20]],.004,rubber,seat);
  rounded('steel saddle pan',[-.73,1.887,0],[.82,.035,.40],.07,frame,bike,.006);
  for(const x of [-1.02,-.39])link('saddle rubber mounting',[x,1.83,0],[x,1.90,0],.065,rubber,bike);
  // The rack is a welded tubular assembly with thin, separate stamped slats.
  tube('rear carrier perimeter',[[-2.08,1.913,-.28],[-1.18,1.913,-.28],[-1.12,1.913,-.20],[-1.12,1.913,.20],[-1.18,1.913,.28],[-2.08,1.913,.28],[-2.12,1.913,.20],[-2.12,1.913,-.20],[-2.08,1.913,-.28]],.018,frame,bike);
  for(let i=0;i<5;i++)link('carrier slat',[-1.97+i*.16,1.906,-.25],[-1.97+i*.16,1.906,.25],.023,frame,bike);
  for(const z of [-.23,.23]){link('rack mounting brace',[-1.95,1.91,z],[-1.47,1.70,z],.025,frame,bike);link('rack forward support',[-1.19,1.91,z],[-1.19,1.75,z],.025,frame,bike);}
  for(const z of [-.215,.215]){
    const shock=node('CC110 rear suspension',bike);shock.position.set(-1.47,.87,z);shock.rotation.z=-.16;staticRoots.push(shock);
    cyl('rear shock lower body',[0,.18,0],.073,.36,machined,shock);cyl('rear shock rod',[0,.49,0],.033,.55,edge,shock);
    tube('black rear spring',Array.from({length:217},(_,i)=>{const a=i/216*TAU*13;return[Math.cos(a)*.057,.23+i/216*.65,Math.sin(a)*.057];}),.012,frame,shock);
    for(const y of [0,.90]){disc('damper mounting eye',[0,y,0],.10,.07,frame,shock,32);bolt(0,y,-.05,shock,.35);}
  }
  for(const z of [-.145,.145]){
    link('front fork lower casting',[front,axle,z],[1.37,1.38,z],.096,metal,bike);
    link('fork stanchion',[1.38,1.34,z],[1.05,2.11,z],.055,edge,bike);
    link('fork dust gaiter',[1.38,1.38,z],[1.19,1.84,z],.104,rubber,bike);
    for(let i=0;i<15;i++){const y=1.40+i*.029,x=1.38-(y-1.38)*.413;const ring=torus('fork gaiter fold',[x,y,z],.101,.012,rubber,bike);ring.rotation.set(0,0,-.39);}
    link('front guard bracket',[front,.84,z],[1.55,1.55,z],.018,frame,bike);
  }
  link('steering bearing barrel',[.90,1.98,0],[.74,2.36,0],.135,frame,bike);
  for(const y of [1.99,2.11])link('fork triple clamp',[1.08,y,-.19],[1.08,y,.19],.065,frame,bike);
  tube('handlebar tubing',[[.76,2.39,.04],[.78,2.57,-.10],[.91,2.65,-.29],[1.15,2.66,-.39]],.022,frame,bike);
  link('right grip',[1.13,2.66,-.39],[1.35,2.66,-.39],.061,rubber,bike);
  for(let i=0;i<9;i++)disc('grip rib',[1.15+i*.020,2.66,-.39],.063,.004,rubber,bike).rotation.set(0,0,Math.PI/2);
  rounded('right switch housing',[1.10,2.66,-.39],[.085,.09,.08],.018,plastic,bike,.006);
  tube('brake lever',[[1.10,2.65,-.43],[1.15,2.61,-.48],[1.36,2.61,-.50]],.010,metal,bike);
  const speedo=rounded('instrument pod',[.81,2.59,0],[.26,.20,.25],.065,plastic,bike,.010);speedo.rotation.z=.25;
  tube('front brake hydraulic line',[[1.09,2.65,-.35],[.90,2.36,-.27],[1.12,1.93,-.19],[1.37,1.34,-.19],[1.45,.94,-.18]],.009,rubber,bike);
  tube('throttle cable',[[1.12,2.65,-.36],[.75,2.39,-.22],[.66,1.93,-.12],[.25,1.26,.04]],.007,rubber,bike);
  // Circular headlight, separate black protective cage, clear front optic.
  const head=node('protected round headlamp',bike);head.position.set(1.02,2.18,0);staticRoots.push(head);
  const bucket=cyl('headlamp body',[0,0,0],.31,.19,plastic,head,[0,0,Math.PI/2],48);
  const bezel=cyl('headlamp metal rim',[.11,0,0],.32,.025,metal,head,[0,0,Math.PI/2],64);
  cyl('headlamp optical lens',[.127,0,0],.289,.008,lens,head,[0,0,Math.PI/2],64);
  tube('headlamp cage',[[.17,-.19,-.21],[.17,.19,-.21],[.17,.23,-.15],[.17,.23,.15],[.17,.19,.21],[.17,-.19,.21],[.17,-.22,.15],[.17,-.22,-.15],[.17,-.19,-.21]],.014,frame,head);
  for(const z of [-.20,.20])link('cage mounting arm',[-.18,0,z],[.17,0,z],.014,frame,head);
  for(const x of [-2.0,1.07]){
    const y=x<0?1.73:2.18;link('indicator mount',[x,y,0],[x,y,-.27],.021,frame,bike);
    disc('indicator black housing',[x,y,-.285],.10,.08,plastic,bike,32);disc('amber indicator lens',[x,y,-.329],.082,.012,amber,bike,32);
  }
  rounded('tail lamp body',[-2.10,1.74,0],[.12,.16,.23],.023,plastic,bike,.006);
  link('tail lamp mounting stay',[-2.08,1.90,0],[-2.10,1.74,0],.027,frame,bike);
  rounded('red tail optic',[-2.17,1.74,0],[.025,.12,.20],.012,h.tail,bike,.004);
  link('footpeg cross tube',[-.45,.68,.24],[-.45,.68,-.48],.038,frame,bike);
  disc('folding rider peg',[-.45,.68,-.46],.085,.24,rubber,bike,32);
  for(let i=0;i<8;i++)disc('footpeg rib',[-.45,.68,-.56+i*.025],.09,.006,rubber,bike,24);
  tube('under engine protection bar',[[.54,.65,-.18],[.48,.47,-.21],[-.35,.46,-.21],[-.50,.61,-.18]],.026,machined,bike);
  for(const z of [-.08,.08])link('center stand leg',[-.39,.65,z],[-.50,.035,z],.027,frame,bike);
  link('center stand foot',[-.63,.020,-.12],[-.33,.020,.12],.027,frame,bike);
  return {body,seat,staticRoots};
}
