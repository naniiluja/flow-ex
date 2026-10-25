// gach_props.js: set pieces for "Gạch và con mèo trú mưa" (room, alley, cat, clock, umbrella, bag, rain).
// Everything is a pure function of time, painted with paint()/inkLine() so it boils like Clawd does.
const G = (() => {
  const CAT = '#A3A9BC', CAT_DK = '#6F7690';
  const RAIN = mixCol(PAL.sky, PAL.indigo, .5);
  const WOOD = mixCol(PAL.clayDk, PAL.paper, .4);
  const BRICK = mixCol(PAL.clay, PAL.paper, .55);
  const SW = 2;

  // Rain streaks inside a rectangle. Each streak slides along its own slanted line and is clipped to the rectangle.
  function rainIn(t, x0, y0, w, h, n, speed, col, o = {}) {
    const key = o.key || 'rain', slant = o.slant ?? .16, len0 = o.len ?? 80, line = o.sw ?? 1;
    for (let i = 0; i < n; i++) {
      boilSeed(key + i);
      const ph = frac(hash(i * 7 + 1) + t * speed * (.85 + .3 * hash(i + 3)));
      const len = len0 * (.7 + .6 * hash(i + 11));
      const yTop = y0 - len + ph * (h + len), xBase = x0 + hash(i * 13 + 5) * w;
      const ya = Math.max(y0, yTop), yb = Math.min(y0 + h, yTop + len);
      if (yb - ya < 8) continue;
      const xAt = y => xBase - slant * (y - y0);
      inkLine([[xAt(ya), ya], [xAt(yb), yb]], line, col, 'inkfine', 0);
    }
  }
  // An expanding ring where a drop lands. k = 0..1 of its life.
  const splash = (x, y, k, col = RAIN, s = 1) => {
    if (k <= 0 || k >= 1) return;
    paint(ellPts(x, y, (6 + 30 * k) * s, (2 + 9 * k) * s, 14), { ink: col, sw: 1 });
  };
  const splashes = (t, x0, x1, y0, y1, n, key, s = 1) => {
    for (let i = 0; i < n; i++) {
      boilSeed(key + i);
      splash(lerp(x0, x1, hash(i * 5 + 2)), lerp(y0, y1, hash(i * 9 + 4)), frac(t * 1.6 + hash(i)), RAIN, s);
    }
  };

  // ---------- alarm clock ----------
  // M = minutes since 12:00 on a 12-hour face (so 495 = 8:15). shake 0..1 rattles it, ring 0..1 paints the sound marks.
  function clock(x, y, r, o = {}) {
    const { M = 450, shake = 0, ring = 0, t = 0, dy = 0 } = o;
    const jx = shake * Math.sin(t * 95) * r * .05, jy = shake * Math.cos(t * 77) * r * .035, rot = shake * Math.sin(t * 61) * .06;
    push(); translate(x + jx, y + jy + dy); rotate(rot);
    boilSeed('clock');
    const metal = mixCol(PAL.ochre, PAL.ink, .22);
    for (const s of [-1, 1]) inkLine([[s * r * .55, r * .85], [s * r * .8, r * 1.22]], SW * 1.4, PAL.ink, 'ink', 0);
    for (const s of [-1, 1]) paint(ellPts(s * r * .62, -r * .9, r * .36, r * .26, 14, 0, s * .55), { wash: metal, ink: PAL.ink, sw: SW * .8 });
    inkLine([[0, -r * 1.02], [0, -r * 1.22]], SW * 1.2, PAL.ink, 'ink', 0);
    paint(ellPts(0, 0, r, r, 30, 1), { wash: PAL.ochre, fill: PAL.clayLt, fillOp: 70, ink: PAL.ink, sw: SW });
    paint(ellPts(0, 0, r * .78, r * .78, 26, .8), { wash: PAL.cream, ink: PAL.ink, sw: SW * .5 });
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * TAU, big = i % 3 === 0;
      inkLine([[Math.cos(a) * r * (big ? .6 : .67), Math.sin(a) * r * (big ? .6 : .67)], [Math.cos(a) * r * .73, Math.sin(a) * r * .73]], big ? SW * .8 : SW * .45, PAL.ink, 'inkfine', 0);
    }
    const am = ((M % 60) / 60) * TAU - Math.PI / 2, ah = ((M % 720) / 720) * TAU - Math.PI / 2;
    inkLine([[0, 0], [Math.cos(ah) * r * .38, Math.sin(ah) * r * .38]], SW * 1.5, PAL.ink, 'ink', 0);
    inkLine([[0, 0], [Math.cos(am) * r * .58, Math.sin(am) * r * .58]], SW * 1.1, PAL.ink, 'ink', 0);
    paint(ellPts(0, 0, r * .07, r * .07, 8), { wash: PAL.ink, ink: null });
    if (ring > 0.01) {
      for (const s of [-1, 1]) for (let k = 0; k < 2; k++) {
        const ph = frac(t * 5 + k * .5), rr = r * (1.3 + ph * .5), base = s > 0 ? 0 : Math.PI, pts = [];
        for (let j = 0; j <= 6; j++) { const a = base + (j / 6 - .5) * 1.3; pts.push([Math.cos(a) * rr, Math.sin(a) * rr - r * .1]); }
        inkLine(pts, SW * .8 * ring * (1 - ph * .6), PAL.ink, 'inkfine', .4);
      }
    }
    pop();
  }

  // ---------- umbrella ----------
  // Open: (x, y) = where the pole meets the canopy centre, s = canopy radius, rot tilts it around that point.
  function umbrella(x, y, s, o = {}) {
    const col = o.col || PAL.rose, dk = mixCol(col, PAL.ink, .3);
    push(); translate(x, y); rotate(o.rot || 0);
    boilSeed('umb' + (o.key || ''));
    const pl = o.pole ?? 2.1;
    inkLine([[0, -s * .1], [0, s * pl]], SW * 1.5, PAL.ink, 'ink', 0);
    inkLine([[0, s * pl], [s * .08, s * (pl + .24)], [s * .3, s * (pl + .2)], [s * .34, s * (pl - .02)]], SW * 1.5, PAL.ink, 'ink', .5);
    const P = [];
    for (let i = 0; i <= 14; i++) { const a = Math.PI + i / 14 * Math.PI; P.push([Math.cos(a) * s, Math.sin(a) * s * .62]); }
    for (let j = 0; j < 4; j++) { P.push([s - j * s / 2, 0]); P.push([s - (j + .5) * s / 2, s * .16]); }
    P.push([-s, 0]);
    paint(P, { wash: col, fill: dk, fillOp: 50, ink: PAL.ink, sw: SW, curv: .15 });
    for (let j = 0; j <= 4; j++) inkLine([[0, -s * .62], [s - j * s / 2, -s * .05]], SW * .45, dk, 'inkfine', .3);
    pop();
  }
  // Closed, leaning on a wall: (x, y) = the foot of the handle on the ground.
  function umbrellaClosed(x, y, s, o = {}) {
    push(); translate(x, y); rotate(o.rot ?? -.1);
    boilSeed('umbc');
    const col = o.col || PAL.rose;
    inkLine([[0, 0], [0, -s * 2.1]], SW * 1.4, PAL.ink, 'ink', 0);
    inkLine([[0, 0], [-s * .06, s * .22], [-s * .28, s * .25], [-s * .32, s * .02]], SW * 1.4, PAL.ink, 'ink', .5);
    paint([[-s * .3, -s * 2.0], [s * .3, -s * 2.0], [s * .13, -s * 4.0], [0, -s * 4.25], [-s * .13, -s * 4.0]], { wash: col, fill: mixCol(col, PAL.ink, .3), fillOp: 50, ink: PAL.ink, sw: SW, curv: .2 });
    inkLine([[-s * .1, -s * 2.05], [-s * .05, -s * 3.9]], SW * .5, mixCol(col, PAL.ink, .4), 'inkfine', 0);
    inkLine([[-s * .3, -s * 2.4], [s * .3, -s * 2.4]], SW * .8, PAL.ink, 'ink', 0);
    pop();
  }

  // ---------- backpack: (x, y) = bottom centre; draws in the current transform so it can ride on an arm ----------
  function bag(x, y, s, o = {}) {
    push(); translate(x, y); rotate(o.rot || 0);
    boilSeed('bag');
    inkLine([[-s * .55, -s * 1.55], [-s * .8, -s * 2.2], [s * .8, -s * 2.2], [s * .55, -s * 1.55]], SW * 1.1, PAL.ink, 'ink', .4);
    paint(rrPts(-s, -s * 1.8, s * 2, s * 1.8, s * .5, 1), { wash: PAL.teal, fill: mixCol(PAL.teal, PAL.ink, .3), fillOp: 55, ink: PAL.ink, sw: SW });
    paint(rrPts(-s * .75, -s * 1.15, s * 1.5, s * .8, s * .2, .6), { wash: mixCol(PAL.teal, PAL.cream, .3), ink: PAL.ink, sw: SW * .6 });
    paint(ellPts(0, -s * .75, s * .1, s * .1, 8), { wash: PAL.ochre, ink: PAL.ink, sw: SW * .4 });
    pop();
  }

  // ---------- the cat ----------
  // (x, y) = ground point under the body; u = size unit; flip faces left. pose: 'sit' | 'walk' | 'peek'.
  // o.look -1..1 turns the eyes, o.blink 0..1 closes them, o.tail adds to the tail's wag, o.step is the walk phase.
  function cat(x, y, u, o = {}) {
    const { pose = 'sit', t = 0, flip = false, look = 0, blink = 0, tail = 0, dy = 0, sq = 0, step = 0, k = 1, wet = 0 } = o;
    const d = flip ? -1 : 1, sy = 1 - sq;
    const P = pts => pts.map(([a, b]) => [x + d * a * u, y + dy * u + b * u * sy]);
    const col = wet ? mixCol(CAT, CAT_DK, wet * .6) : CAT;
    const eye = (cx, cy) => {
      const w = u * .2, h = u * .34 * (1 - blink * .9);
      paint(ellPts(...P([[cx + look * .16, cy]])[0], w * .55, Math.max(h, u * .05), 10), { wash: PAL.ink, ink: null });
    };
    const head = (cx, cy, cut) => {
      const ex = cx - 1.45, ey = cy - 1.2;
      paint(P([[ex, ey + .1], [ex + .3, ey - 1.85], [ex + 1.5, ey - .5]]), { wash: col, ink: PAL.ink, sw: SW * .9 });
      paint(P([[ex + 1.55, ey - .5], [ex + 2.8, ey - 1.85], [ex + 2.95, ey + .1]]), { wash: col, ink: PAL.ink, sw: SW * .9 });
      paint(P([[ex + .5, ey - .35], [ex + .35, ey - 1.15], [ex + 1.05, ey - .5]]), { wash: PAL.rose, washOp: 160, ink: null });
      paint(P([[ex + 1.95, ey - .5], [ex + 2.6, ey - 1.15], [ex + 2.45, ey - .35]]), { wash: PAL.rose, washOp: 160, ink: null });
      paint(ellPts(...P([[cx, cy]])[0], 2.15 * u, 1.85 * u, 22, .8), { wash: col, fill: CAT_DK, fillOp: 35, ink: PAL.ink, sw: SW });
      eye(cx - .8, cy - .15); eye(cx + .8, cy - .15);
      paint(P([[cx - .22, cy + .35], [cx + .22, cy + .35], [cx, cy + .6]]), { wash: PAL.rose, ink: PAL.ink, sw: SW * .35 });
      inkLine(P([[cx, cy + .6], [cx - .35, cy + .95], [cx - .75, cy + .85]]), SW * .45, PAL.ink, 'inkfine', .5);
      inkLine(P([[cx, cy + .6], [cx + .35, cy + .95], [cx + .75, cy + .85]]), SW * .45, PAL.ink, 'inkfine', .5);
      for (const s of [-1, 1]) for (const r of [-.1, .22]) inkLine(P([[cx + s * 1.25, cy + .45 + r], [cx + s * 2.4, cy + .35 + r * 2.2]]), SW * .3, PAL.ink, 'inkfine', 0);
      if (cut) return;
    };
    boilSeed('cat' + pose);
    if (pose === 'peek') {   // only the head, rising from behind a ledge at y; k 0..1 is how far it has come up
      head(0, -3.4, true);
      return;
    }
    const wag = Math.sin(t * 2.4) * .7 + tail;
    if (pose === 'sit') {
      paint(ribbon(P([[-3.1, -.7], [-4.6, -.15 + wag * .2], [-5.5, -1.6 + wag * .3], [-5.1, -3.2 + wag * .9]]), .95 * u, .55 * u), { wash: col, ink: PAL.ink, sw: SW });
      paint(P([[-2.9, 0], [-3.7, -1.6], [-3.3, -3.6], [-1.9, -5.1], [-.3, -5.9], [1.2, -5.7], [2.1, -4.5], [2.3, -2.6], [2.0, -.9], [2.2, 0]]),
        { wash: col, fill: CAT_DK, fillOp: 40, ink: PAL.ink, sw: SW, curv: .7 });
      paint(ellPts(...P([[1.2, -2.6]])[0], .85 * u, 1.9 * u, 14, .6), { wash: mixCol(col, PAL.cream, .5), ink: null });
      for (let i = 0; i < 3; i++) inkLine(P([[-2.9 + i * .55, -4.6 + i * .5], [-2.5 + i * .55, -3.5 + i * .5]]), SW * .6, CAT_DK, 'ink', 0);
      paint(rrPts(d > 0 ? x + .9 * u : x - 1.8 * u, y + dy * u - 1.1 * u * sy, .9 * u, 1.1 * u * sy, .3 * u, .4), { wash: col, ink: PAL.ink, sw: SW * .7 });
      head(1.5, -7.4);
    } else {   // walk, facing the way d points
      const hip = [-2.1, 1.7];
      paint(ribbon(P([[-3.0, -4.3], [-4.3, -5.4], [-4.7, -7.3 - wag * .3], [-3.9, -8.8 - wag * .5]]), .95 * u, .5 * u), { wash: col, ink: PAL.ink, sw: SW });
      hip.forEach((hx, i) => {
        for (const ph of [0, Math.PI]) {
          const a = step * TAU + ph + i * Math.PI * .5, fx = hx + Math.sin(a) * 1.1, fy = -.2 - Math.max(0, Math.cos(a)) * .8;
          inkLine(P([[hx, -2.7], [fx, fy]]), SW * 1.5, CAT_DK, 'ink', 0);
        }
      });
      paint(P([[-3.0, -3.6], [-2.2, -5.0], [1.6, -5.1], [3.0, -4.4], [3.1, -3.0], [1.8, -2.4], [-2.0, -2.4]]), { wash: col, fill: CAT_DK, fillOp: 40, ink: PAL.ink, sw: SW, curv: .7 });
      for (let i = 0; i < 3; i++) inkLine(P([[-1.6 + i * 1.1, -4.9], [-1.5 + i * 1.1, -3.9]]), SW * .6, CAT_DK, 'ink', 0);
      head(4.3, -5.2);
    }
  }

  // ---------- the room (S1-S3). World x: bed at the left, window above it, door at the right ----------
  const ROOM = { wall: mixCol(PAL.indigo, PAL.paper, .78), floor: mixCol(PAL.clayDk, PAL.paper, .5) };
  const WIN = { x: 370, y: 190, w: 480, h: 620 };
  const FLOOR_Y = 1440, DOOR = { x: 1180, y: 420, w: 340 };
  function room(t, o = {}) {
    const { catK = 0, catLook = 0, rainK = 1, umbrella: showUmbrella = true, bag: showBag = true } = o;
    boilSeed('room');
    paint(rectPts(-800, -500, 3400, 2300), { wash: ROOM.wall, ink: null });
    paint(ellPts(610, 520, 700, 560, 28, 12), { fill: PAL.sky, fillOp: 55, bleed: .3, tex: .5, ink: null });
    paint(rectPts(-800, FLOOR_Y, 3400, 800), { wash: ROOM.floor, fill: PAL.clayDk, fillOp: 45, bleed: .1, tex: .6, ink: null });
    inkLine([[-300, FLOOR_Y], [500, FLOOR_Y + 3], [1000, FLOOR_Y - 2]], SW * .8, PAL.ink, 'ink', .4);
    inkLine([[1000, FLOOR_Y - 2], [1500, FLOOR_Y + 2], [2000, FLOOR_Y]], SW * .8, PAL.ink, 'ink', .4);
    for (let i = 0; i < 6; i++) {
      const yy = FLOOR_Y + 140 + i * 130;
      boilSeed('board' + i);
      inkLine([[-300, yy], [500, yy + 4], [1400, yy - 3]], .8, mixCol(PAL.clayDk, PAL.paper, .3), 'inkfine', .3);
    }
    // window: glass, passing cloud, the cat peeking from outside, rain, frame, sill
    const { x, y, w, h } = WIN;
    boilSeed('glass');
    paint(rectPts(x, y, w, h, 1), { wash: mixCol(PAL.sky, PAL.paper, .25), fill: PAL.sky, fillOp: 60, bleed: .2, tex: .4, ink: null });
    const cx = x + w / 2 + 70 * Math.sin(t * .25);
    boilSeed('cloud');
    for (const [dx, dy, rx, ry] of [[-90, 60, 120, 60], [0, 30, 150, 80], [100, 70, 110, 55], [30, 90, 170, 50]])
      paint(ellPts(cx + dx, y + 150 + dy, rx, ry, 20, 5), { wash: mixCol(PAL.indigo, PAL.paper, .5), fill: PAL.indigo, fillOp: 35, bleed: .2, tex: .5, ink: null });
    if (catK > 0.01) cat(x + 330, y + h, 24 * backOut(catK), { pose: 'peek', t, look: catLook, flip: true, blink: Math.sin(t * 2.2 + 1.3) > .96 ? 1 : 0 });
    rainIn(t, x, y, w, h, Math.round(46 * rainK), 1.1, RAIN, { key: 'win', slant: .22, len: 90 });
    boilSeed('drips');
    for (let i = 0; i < 4; i++) {
      const dx = x + 60 + i * 120 + hash(i) * 30, k = frac(t * .12 + hash(i + 9)), dyy = y + 70 + k * 460;
      inkLine([[dx, dyy], [dx + 3, dyy + 30 + 30 * hash(i + 4)]], 1.3, mixCol(RAIN, PAL.paper, .3), 'inkfine', 0);
    }
    for (const [fx, fy, fw, fh] of [[x - 18, y - 18, w + 36, 24], [x - 18, y + h - 6, w + 36, 24], [x - 18, y - 18, 24, h + 36], [x + w - 6, y - 18, 24, h + 36], [x + w / 2 - 8, y, 16, h], [x, y + h * .46, w, 16]])
      paint(rectPts(fx, fy, fw, fh, 1.2), { wash: WOOD, ink: PAL.ink, sw: SW * .8 });
    paint(rectPts(x - 50, y + h + 14, w + 100, 36, 2), { wash: WOOD, fill: PAL.clayDk, fillOp: 50, ink: PAL.ink, sw: SW });
    // the door to the street (open): a wet grey wall of rain
    boilSeed('door');
    paint(rectPts(DOOR.x, DOOR.y, DOOR.w, FLOOR_Y + 140 - DOOR.y, 1), { wash: mixCol(PAL.sky, PAL.indigo, .2), fill: PAL.indigo, fillOp: 35, bleed: .2, tex: .5, ink: null });
    rainIn(t, DOOR.x, DOOR.y, DOOR.w, FLOOR_Y + 140 - DOOR.y, Math.round(70 * rainK), 1.5, mixCol(PAL.indigo, PAL.sky, .35), { key: 'door', slant: .2, len: 150, sw: 1.3 });
    splashes(t, DOOR.x + 10, DOOR.x + DOOR.w - 10, FLOOR_Y + 90, FLOOR_Y + 130, 9, 'dsp', .9);
    for (const [fx, fy, fw, fh] of [[DOOR.x - 24, DOOR.y - 24, 24, FLOOR_Y + 190 - DOOR.y], [DOOR.x - 24, DOOR.y - 24, DOOR.w + 24, 24]])
      paint(rectPts(fx, fy, fw, fh, 1.2), { wash: WOOD, ink: PAL.ink, sw: SW * .8 });
    paint(rectPts(DOOR.x - 24, FLOOR_Y + 130, DOOR.w + 24, 30, 1.5), { wash: WOOD, ink: PAL.ink, sw: SW * .8 });
    if (showUmbrella) umbrellaClosed(1085, FLOOR_Y + 120, 60, { rot: .08 });
    if (showBag) bag(770, FLOOR_Y + 151, 39);
    // bed (head at the left), pillow, bedside table
    boilSeed('bed');
    paint(rrPts(300, 1090, 70, 440, 18, 1), { wash: WOOD, fill: PAL.clayDk, fillOp: 50, ink: PAL.ink, sw: SW });
    paint(rectPts(318, 1512, 22, 70, 1), { wash: WOOD, ink: PAL.ink, sw: SW * .8 });
    paint(rectPts(780, 1512, 22, 70, 1), { wash: WOOD, ink: PAL.ink, sw: SW * .8 });
    paint(rrPts(300, 1470, 520, 52, 16, 1), { wash: WOOD, ink: PAL.ink, sw: SW });
    paint(rrPts(318, 1335, 500, 150, 42, 1.2), { wash: mixCol(PAL.rose, PAL.paper, .55), fill: PAL.rose, fillOp: 55, bleed: .1, tex: .5, ink: PAL.ink, sw: SW });
    paint(rrPts(350, 1225, 250, 120, 54, 1.2), { wash: PAL.cream, fill: PAL.sky, fillOp: 40, ink: PAL.ink, sw: SW });
    paint(rrPts(800, 1330, 210, 230, 14, 1), { wash: WOOD, fill: PAL.clayDk, fillOp: 45, ink: PAL.ink, sw: SW });
    paint(rrPts(822, 1385, 166, 70, 10, .8), { wash: mixCol(WOOD, PAL.ink, .12), ink: PAL.ink, sw: SW * .6 });
    paint(ellPts(905, 1420, 11, 11, 10), { wash: PAL.ochre, ink: PAL.ink, sw: SW * .5 });
  }

  // ---------- the alley with the tin awning (S4-S7). sun 0..1 warms the colours and stops the rain ----------
  const GY = 1500, AWN = { x0: 500, x1: 1150, yl: 925, yr: 825 };
  function alley(t, o = {}) {
    const { sun = 0, rainK = 1, drum = 0 } = o;
    const cool = (a, b) => mixCol(a, b, sun);
    const sky = cool(mixCol(PAL.teal, PAL.paper, .62), mixCol(PAL.ochre, PAL.cream, .62));
    boilSeed('asky');
    paint(rectPts(-900, -500, 3600, 2400), { wash: sky, ink: null });
    paint(ellPts(560, 380, 760, 380, 26, 14), { fill: cool(PAL.sky, PAL.ochre), fillOp: 80, bleed: .3, tex: .5, ink: null });
    // far houses
    for (const [hx, hw, hh, c] of [[-420, 300, 560, PAL.teal], [-60, 260, 420, PAL.indigo], [1260, 300, 640, PAL.teal], [1560, 280, 480, PAL.indigo]]) {
      boilSeed('house' + hx);
      paint(rectPts(hx, GY - hh, hw, hh, 2), { wash: cool(mixCol(c, PAL.paper, .62), mixCol(PAL.clay, PAL.paper, .62)), fill: c, fillOp: 25, bleed: .1, tex: .5, ink: PAL.ink, sw: SW * .6 });
      paint([[hx - 20, GY - hh], [hx + hw / 2, GY - hh - 120], [hx + hw + 20, GY - hh]], { wash: cool(mixCol(c, PAL.ink, .15), PAL.clayDk), ink: PAL.ink, sw: SW * .7 });
      for (let i = 0; i < 3; i++) paint(rrPts(hx + 40 + i * 80, GY - hh + 80, 46, 70, 6, .6), { wash: cool(mixCol(PAL.sky, PAL.paper, .3), PAL.ochre), ink: PAL.ink, sw: SW * .5 });
    }
    // the house that owns the awning
    boilSeed('wall');
    paint(rectPts(AWN.x0 + 20, 470, AWN.x1 - AWN.x0 + 10, GY - 470, 2), { wash: cool(BRICK, mixCol(PAL.clayLt, PAL.cream, .4)), fill: PAL.clayDk, fillOp: 30, bleed: .1, tex: .6, ink: PAL.ink, sw: SW });
    paint(rrPts(880, 1000, 150, GY - 1000, 8, 1), { wash: cool(mixCol(PAL.teal, PAL.ink, .15), mixCol(PAL.sap, PAL.ink, .15)), fill: PAL.ink, fillOp: 30, ink: PAL.ink, sw: SW });
    for (let i = 0; i < 6; i++) inkLine([[890, 1040 + i * 72], [1020, 1040 + i * 72]], SW * .6, PAL.ink, 'inkfine', 0);
    // rain behind the awning (above the roof), on the left street and on the right street
    if (rainK > 0) {
      rainIn(t, -900, -100, 1400, GY + 100, Math.round(90 * rainK), 1.2, RAIN, { key: 'rl', len: 110, sw: 1.1 });
      rainIn(t, AWN.x0, -100, AWN.x1 - AWN.x0, 800, Math.round(34 * rainK), 1.2, RAIN, { key: 'rt', len: 110, sw: 1.1 });
      rainIn(t, AWN.x1, -100, 1000, GY + 100, Math.round(60 * rainK), 1.2, RAIN, { key: 'rr', len: 110, sw: 1.1 });
    }
    // ground: wet street, a drier patch under the awning, puddles
    boilSeed('ground');
    paint(rectPts(-900, GY, 3600, 800), { wash: cool(mixCol(PAL.indigo, PAL.paper, .55), mixCol(PAL.clayLt, PAL.paper, .5)), fill: PAL.indigo, fillOp: 35, bleed: .1, tex: .6, ink: null });
    paint(ellPts((AWN.x0 + AWN.x1) / 2, GY + 120, (AWN.x1 - AWN.x0) / 2 - 20, 130, 26, 6), { fill: cool(PAL.paper, PAL.cream), fillOp: 70, bleed: .45, tex: .4, ink: null });
    inkLine([[-400, GY], [500, GY + 2], [1200, GY - 2], [1900, GY]], SW * .8, PAL.ink, 'ink', .4);
    for (const [px, py, pw] of [[150, 1640, 240], [-120, 1770, 200], [1380, 1560, 230], [1700, 1760, 200]]) {
      boilSeed('pud' + px);
      paint(ellPts(px, py, pw, pw * .2, 24, 3), { wash: cool(mixCol(PAL.sky, PAL.paper, .35), mixCol(PAL.ochre, PAL.cream, .5)), fill: PAL.sky, fillOp: 60, ink: PAL.ink, sw: SW * .6 });
    }
    if (rainK > 0) splashes(t, -300, 480, GY + 50, GY + 380, Math.round(10 * rainK), 'spl', 1.3);
    if (rainK > 0) splashes(t, AWN.x1 + 20, 1800, GY + 50, GY + 380, Math.round(8 * rainK), 'spr', 1.3);
    // shade under the awning
    boilSeed('shade');
    paint(rectPts(AWN.x0 + 20, AWN.yl, AWN.x1 - AWN.x0, GY - AWN.yl, 2), { fill: PAL.indigo, fillOp: 40, bleed: .3, tex: .5, ink: null });
    // the tin roof: slanted, corrugated, with a post at each end
    boilSeed('roof');
    const roof = [[AWN.x0 - 30, AWN.yl], [AWN.x1 + 40, AWN.yr], [AWN.x1 + 40, AWN.yr + 62], [AWN.x0 - 30, AWN.yl + 74]];
    paint(roof, { wash: cool(mixCol(PAL.teal, PAL.cream, .35), mixCol(PAL.ochre, PAL.cream, .4)), fill: PAL.teal, fillOp: 40, ink: PAL.ink, sw: SW * 1.2 });
    for (let i = 1; i < 22; i++) {
      const k = i / 22, rx = lerp(AWN.x0 - 30, AWN.x1 + 40, k), ry = lerp(AWN.yl, AWN.yr, k);
      inkLine([[rx, ry + 3], [rx, lerp(AWN.yl + 74, AWN.yr + 62, k) - 3]], SW * .5, PAL.ink, 'inkfine', 0);
    }
    inkLine([[AWN.x0 - 30, AWN.yl + 74], [AWN.x0, AWN.yl + 74]], 1, PAL.ink, 'inkfine', 0);
    for (const px of [AWN.x0 + 10, AWN.x1 + 20]) paint(rectPts(px - 9, px < 800 ? AWN.yl + 74 : AWN.yr + 62, 18, GY - (px < 800 ? AWN.yl + 74 : AWN.yr + 62), 1), { wash: WOOD, ink: PAL.ink, sw: SW * .9 });
    // drops bouncing on the tin (drum: 0..1 how loud)
    if (drum > 0) {
      for (let i = 0; i < 14; i++) {
        boilSeed('drum' + i);
        const k = frac(t * 2.2 + hash(i)), rx = lerp(AWN.x0, AWN.x1, hash(i * 3 + 1)), ry = lerp(AWN.yl, AWN.yr, (rx - AWN.x0) / (AWN.x1 - AWN.x0)) - 10;
        const up = Math.abs(Math.sin(k * Math.PI)) * 40 * drum;
        paint(ellPts(rx, ry - up, 5, 7, 8), { wash: PAL.sky, ink: PAL.ink, sw: SW * .4 });
      }
    }
    // drip line along the front edge of the roof
    if (rainK > 0) {
      for (let i = 0; i < 5; i++) {
        boilSeed('drip' + i);
        const k = frac(t * 1.7 + hash(i * 7)), dx = AWN.x0 - 22 + hash(i) * 10;
        paint(ellPts(dx - i * 4, AWN.yl + 78 + k * 520, 3.2, 7, 8), { wash: PAL.sky, ink: PAL.ink, sw: SW * .4 });
      }
    }
    if (sun > 0) glow(980, 330, 800, '#FFD98A', .9 * sun);
  }

  return { rainIn, splash, splashes, clock, umbrella, umbrellaClosed, bag, cat, room, alley, ROOM_FLOOR: FLOOR_Y, GY, AWN, DOOR, WIN };
})();
