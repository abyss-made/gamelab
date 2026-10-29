// Original Mini Golf courses for Playgrid (18 holes in three courses of six). Every hole is drawn on a 700x440
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

const BY_ID = Object.fromEntries(COURSES.map((c) => [c.id, c]));
const TOUR = { id: 'tour', name: 'Playgrid Open (18 holes)', blurb: 'All three courses', holes: COURSES.flatMap((c) => c.holes.map((h) => ({ ...h, course: c.name }))) };
BY_ID.tour = TOUR;

module.exports = { COURSES, BY_ID, W, H, rect };
