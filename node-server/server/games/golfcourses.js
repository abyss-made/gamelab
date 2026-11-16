// Original Mini Golf courses for Playgrid (30 holes in five courses, plus the stable original tour). Every hole uses a 700x440
// board. Geometry:
//   poly      fairway outline (the boundary is a solid wall)
//   walls     extra solid obstacles (polygons, also solid on the inside)
//   bumpers   round obstacles {x, y, r}
//   sand      slow zones {x, y, w, h}
//   water     hazards {x, y, w, h}: landing in one costs a stroke and returns the ball to where it was hit from
const W = 700;
const H = 440;
const rect = (x1, y1, x2, y2) => [[x1, y1], [x2, y1], [x2, y2], [x1, y2]];

const COURSES = [
  {
    id: 'meadow',
    name: 'Meadow Mini',
    blurb: 'Gentle opening holes',
    holes: [
      { name: 'Straight Shot', par: 2, poly: rect(60, 170, 640, 270), tee: [120, 220], cup: [580, 220] },
      { name: 'Dogleg', par: 3, poly: [[60, 60], [340, 60], [340, 250], [640, 250], [640, 390], [60, 390]], tee: [110, 110], cup: [590, 320] },
      { name: 'Bumper Park', par: 3, poly: rect(60, 110, 640, 330), bumpers: [{ x: 260, y: 220, r: 24 }, { x: 400, y: 160, r: 22 }, { x: 400, y: 280, r: 22 }], tee: [110, 220], cup: [590, 220] },
      { name: 'Sand Trap', par: 3, poly: rect(60, 130, 640, 310), sand: [{ x: 270, y: 130, w: 150, h: 110 }], tee: [110, 220], cup: [590, 220] },
      { name: 'Water Bridge', par: 3, poly: rect(60, 100, 640, 340), water: [{ x: 290, y: 100, w: 100, h: 130 }], tee: [110, 200], cup: [590, 200] },
      { name: 'The Gate', par: 3, poly: rect(60, 110, 640, 330), walls: [rect(330, 110, 350, 205), rect(330, 235, 350, 330)], tee: [110, 170], cup: [590, 270] },
    ],
  },
  {
    id: 'canyon',
    name: 'Canyon Run',
    blurb: 'Bends, islands and sand',
    holes: [
      { name: 'S-Bend', par: 3, poly: [[60, 60], [400, 60], [400, 180], [640, 180], [640, 380], [300, 380], [300, 260], [60, 260]], tee: [110, 160], cup: [590, 330] },
      { name: 'Island Hop', par: 3, poly: rect(60, 80, 640, 360), walls: [rect(280, 150, 420, 290)], tee: [110, 220], cup: [590, 220] },
      { name: 'Sand Valley', par: 3, poly: rect(60, 100, 640, 340), sand: [{ x: 200, y: 100, w: 60, h: 240 }, { x: 440, y: 100, w: 60, h: 240 }], tee: [110, 220], cup: [590, 220] },
      { name: 'Zigzag', par: 4, poly: rect(60, 80, 640, 360), walls: [rect(220, 80, 240, 260), rect(400, 180, 420, 360)], tee: [110, 300], cup: [590, 140] },
      { name: 'Pinball', par: 3, poly: rect(60, 100, 640, 340), bumpers: [{ x: 230, y: 180, r: 18 }, { x: 230, y: 260, r: 18 }, { x: 350, y: 220, r: 18 }, { x: 470, y: 180, r: 18 }, { x: 470, y: 260, r: 18 }], tee: [110, 220], cup: [590, 220] },
      { name: 'The Moat', par: 3, poly: rect(60, 90, 640, 350), water: [{ x: 470, y: 90, w: 40, h: 110 }, { x: 470, y: 240, w: 40, h: 110 }], tee: [110, 220], cup: [590, 220] },
    ],
  },
  {
    id: 'skyline',
    name: 'Skyline Gauntlet',
    blurb: 'The tough finish',
    holes: [
      { name: 'Switchback', par: 5, poly: rect(60, 60, 640, 380), walls: [rect(60, 160, 500, 180), rect(200, 260, 640, 280)], tee: [110, 110], cup: [590, 330] },
      { name: 'Bumper Alley', par: 4, poly: rect(60, 130, 640, 310), bumpers: [{ x: 200, y: 190, r: 16 }, { x: 200, y: 250, r: 16 }, { x: 320, y: 220, r: 16 }, { x: 440, y: 190, r: 16 }, { x: 440, y: 250, r: 16 }], sand: [{ x: 500, y: 130, w: 60, h: 180 }], tee: [110, 220], cup: [600, 220] },
      { name: 'Pillars & Pond', par: 3, poly: rect(60, 80, 640, 360), water: [{ x: 250, y: 150, w: 200, h: 140 }], tee: [110, 220], cup: [590, 220] },
      { name: 'The Funnel', par: 3, poly: [[60, 60], [640, 170], [640, 270], [60, 380]], bumpers: [{ x: 350, y: 220, r: 16 }], tee: [100, 220], cup: [610, 220] },
      { name: 'Double Dogleg', par: 4, poly: [[60, 60], [280, 60], [280, 220], [480, 220], [480, 100], [640, 100], [640, 380], [60, 380]], sand: [{ x: 300, y: 300, w: 100, h: 70 }], tee: [110, 110], cup: [600, 150] },
      { name: 'Grand Finale', par: 5, poly: rect(60, 60, 640, 380), walls: [rect(300, 60, 320, 260), rect(440, 180, 460, 380)], bumpers: [{ x: 540, y: 120, r: 18 }], sand: [{ x: 120, y: 250, w: 100, h: 100 }], water: [{ x: 330, y: 310, w: 100, h: 70 }], tee: [110, 330], cup: [590, 120] },
    ],
  },
];

// The original 18-hole tour is stable; Harbor Links is a separate six-hole course.
const ORIGINAL_COURSES = COURSES.slice();
COURSES.push({id:'harbor',name:'Harbor Links',blurb:'Slopes, piers and tidal hazards',holes:[
 {name:'Breeze Lane',par:3,poly:rect(60,100,640,340),slopes:[{x:250,y:140,w:150,h:160,ax:180,ay:0}],tee:[110,220],cup:[590,220]},
 {name:'Split Current',par:3,poly:rect(60,60,640,380),water:[{x:280,y:130,w:140,h:180}],tee:[110,220],cup:[590,220]},
 {name:'Quay Corner',par:4,poly:[[60,60],[640,60],[640,380],[450,380],[450,240],[60,240]],bumpers:[{x:480,y:190,r:24}],tee:[110,140],cup:[550,330]},
 {name:'Tide Pools',par:4,poly:rect(60,60,640,380),water:[{x:200,y:60,w:60,h:210},{x:430,y:170,w:60,h:210}],sand:[{x:295,y:240,w:90,h:80}],tee:[110,300],cup:[590,110]},
 {name:'Bankers Bend',par:4,poly:[[60,120],[160,60],[540,60],[640,120],[640,320],[540,380],[160,380],[60,320]],walls:[rect(330,100,350,270)],slopes:[{x:220,y:130,w:100,h:100,ax:0,ay:180}],tee:[110,220],cup:[590,220]},
 {name:'Lighthouse',par:4,poly:rect(60,60,640,380),walls:[rect(290,120,410,320)],bumpers:[{x:540,y:120,r:25}],slopes:[{x:450,y:180,w:80,h:80,ax:180,ay:0}],tee:[110,220],cup:[560,220]}
]});
const BY_ID = Object.fromEntries(COURSES.map((c) => [c.id, c]));
// Coastal Club is an original course for the rebuilt game. All artwork and collision
// geometry share these definitions; the established courses/tour remain unchanged.
const COASTAL = { id: 'coastal', name: 'Coastal Club', blurb: 'Island fairways, crate banks and lagoon shortcuts', holes: [
  { name: 'Palm Promenade', par: 3, poly: [[65,70],[610,70],[610,350],[410,350],[410,235],[65,235]], tee: [115,150], cup: [530,295], bumpers: [{x:350,y:150,r:18}] },
  { name: 'Crate Escape', par: 3, poly: rect(60,60,640,380), walls: [rect(250,100,330,230),rect(420,235,500,340)], tee: [110,310], cup: [585,110] },
  { name: 'Lagoon Bend', par: 3, poly: rect(60,60,640,380), water: [{x:215,y:150,w:270,h:140}], tee: [110,220], cup: [590,220] },
  { name: 'Sandy Shortcut', par: 4, poly: [[60,110],[110,60],[590,60],[640,110],[640,330],[590,380],[110,380],[60,330]], sand: [{x:245,y:60,w:180,h:130}], walls: [rect(300,245,330,380)], tee: [115,295], cup: [585,120] },
  { name: 'Split Decision', par: 3, poly: rect(60,60,640,380), walls: [rect(310,140,390,300)], slopes: [{x:170,y:75,w:120,h:60,ax:100,ay:0}], sand: [{x:400,y:305,w:110,h:75}], tee: [110,220], cup: [590,220] },
  { name: 'Clubhouse Finish', par: 4, poly: rect(60,60,640,380), walls: [rect(260,60,285,250),rect(430,220,455,380)], bumpers: [{x:550,y:150,r:22}], tee: [110,130], cup: [585,310] },
] };
COURSES.push(COASTAL);
BY_ID.coastal = COASTAL;
// An original obstacle-arena course. Gates switch between shots, never mid-replay.
// Every opening has a permanent bypass; no waiting for a clock or impossible seed.
const GAUNTLET = { id:'gauntlet', name:'Party Gauntlet', blurb:'Switchbacks, bounce gardens and shot-switch gates', holes:[
  {name:'Ribbon Run',par:4,poly:[[60,60],[640,60],[640,205],[230,205],[230,260],[640,260],[640,380],[60,380],[60,155],[480,155],[480,115],[60,115]],tee:[110,320],cup:[110,85],bumpers:[{x:420,y:320,r:19},{x:560,y:130,r:18}],walls:[rect(325,270,345,325)]},
  {name:'Bounce Boulevard',par:3,poly:[[60,110],[110,60],[590,60],[640,110],[640,330],[590,380],[110,380],[60,330]],tee:[110,220],cup:[590,220],bumpers:[{x:245,y:145,r:27},{x:245,y:295,r:27},{x:350,y:220,r:29},{x:455,y:145,r:27},{x:455,y:295,r:27}],slopes:[{x:150,y:185,w:60,h:70,ax:155,ay:0}]},
  {name:'Gatecrasher',par:4,poly:rect(60,60,640,380),tee:[110,220],cup:[590,220],walls:[rect(255,60,275,170),rect(255,270,275,380),rect(425,60,445,170),rect(425,270,445,380)],gates:[{id:'A',phase:0,poly:rect(255,170,275,225)},{id:'B',phase:1,poly:rect(425,215,445,270)}],bumpers:[{x:350,y:110,r:20},{x:350,y:330,r:20}]},
  {name:'Slime Shortcut',par:4,poly:rect(60,60,640,380),tee:[110,310],cup:[590,120],water:[{x:225,y:140,w:100,h:160},{x:405,y:140,w:95,h:160}],walls:[rect(320,60,340,140),rect(385,300,405,380)],slopes:[{x:350,y:165,w:40,h:110,ax:0,ay:-150}],bumpers:[{x:555,y:295,r:24}]},
  {name:'Pinch Point',par:4,poly:[[60,60],[250,60],[250,145],[450,145],[450,60],[640,60],[640,380],[450,380],[450,295],[250,295],[250,380],[60,380]],tee:[110,300],cup:[590,130],bumpers:[{x:295,y:195,r:21},{x:405,y:245,r:21}],walls:[rect(170,135,195,240),rect(510,200,535,305)],gates:[{id:'A',phase:0,poly:rect(340,145,360,205)}]},
  {name:'Victory Lap',par:5,poly:rect(60,60,640,380),tee:[110,320],cup:[590,110],walls:[rect(210,145,230,380),rect(410,60,430,270)],bumpers:[{x:310,y:190,r:25},{x:530,y:310,r:23}],gates:[{id:'A',phase:0,poly:rect(210,60,230,102)},{id:'B',phase:1,poly:rect(410,328,430,380)}],slopes:[{x:465,y:75,w:70,h:65,ax:130,ay:0}]},
]};
COURSES.push(GAUNTLET);
BY_ID.gauntlet = GAUNTLET;
const TOUR = { id: 'tour', name: 'Playgrid Open (18 holes)', blurb: 'All three courses', holes: ORIGINAL_COURSES.flatMap((c) => c.holes.map((h) => ({ ...h, course: c.name }))) };
BY_ID.tour = TOUR;

module.exports = { COURSES, BY_ID, W, H, rect };
