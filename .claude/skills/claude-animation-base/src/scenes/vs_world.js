// vs_world.js: sky, land, water, weather and plants for "Việt sử". Every function paints in whatever coordinate system is
// active (a camera is fine), takes explicit positions, and boils from a stable key (pass o.key when the thing moves, or its
// linework re-boils every frame).

const vsKey = (name, o, ...nums) => boilSeed(`${name} ${o && o.key != null ? o.key : nums.map(n => Math.round(n / 40)).join(',')}`);

// ---------- sky ----------
const SKIES = {
  day:   ['#A7D1DC', '#F4E9CC'], dawn: ['#EDB07A', '#F7E3B2'], dusk: ['#C9604B', '#F2B76F'], night: ['#1F2550', '#3C4C88'],
  fire:  ['#7A2A22', '#E0742F'], grey: ['#A9A59B', '#E8E1CF'], cave: ['#2E211C', '#5A4030'], gold: ['#F0C45C', '#F8EBC0'], storm: ['#4A5568', '#9AA3A8']
};
// Fills the area x -300..W+300, y0..y1 with a wash of the lower colour and a bled patch of the upper one.
function vsSky(kind = 'day', o = {}) {
  const [top, bot] = SKIES[kind] || SKIES.day, y0 = o.y0 ?? -300, y1 = o.y1 ?? H + 300, h = y1 - y0;
  vsKey('sky', o, 0);
  const flat = y => [[-420, y], [W + 420, y]];
  vsWide([[-420, y0], [-100, y0], [220, y0], [540, y0], [860, y0], [1180, y0], [W + 420, y0]], y1, { wash: bot, washOp: 255 });
  vsWide([[-420, y0], [-100, y0], [220, y0], [540, y0], [860, y0], [1180, y0], [W + 420, y0]], y0 + h * .62, { wash: mixCol(top, bot, .35), washOp: 255, fill: top, fillOp: 190, bleed: .5, tex: .55, border: .4 });
  vsWide([[-420, y0], [-100, y0], [220, y0], [540, y0], [860, y0], [1180, y0], [W + 420, y0]], y0 + h * .3, { fill: top, fillOp: 150, bleed: .45, tex: .5, border: .3 });
  if (kind === 'night') vsStars(o.stars ?? 40, o.t ?? T);
}
function vsStars(n, t, y0 = 40, y1 = 900) {
  for (let i = 0; i < n; i++) {
    const x = hash(i * 3.1) * W, y = lerp(y0, y1, hash(i * 7.7)), r = 5 + hash(i) * 8, tw = .75 + .25 * Math.sin(t * 3 + i * 2.1);
    paint(starPts(x, y, r * tw, .38, 4), { wash: '#FFF4C8', washOp: 255, ink: null });
  }
}
function vsSun(x, y, r, o = {}) {
  vsKey('sun', o, x, y);
  const rays = o.rays ?? 14, rot = (o.t ?? T) * .15;
  glow(x, y, r * 2.6, '#FFC766', .5);
  for (let i = 0; i < rays; i++) {
    const a = rot + i / rays * TAU, b = (i + .5) / rays * TAU + rot;
    paint([[x + Math.cos(a - .09) * r * 1.12, y + Math.sin(a - .09) * r * 1.12], [x + Math.cos((a + b) / 2) * r * 1.55, y + Math.sin((a + b) / 2) * r * 1.55], [x + Math.cos(a + .09) * r * 1.12, y + Math.sin(a + .09) * r * 1.12]], { wash: o.rayCol || DH.yellow, washOp: 255, ink: DH.ink, sw: .7 });
  }
  paint(ellPts(x, y, r, r, 30, 1.5), { wash: o.col || DH.red, washOp: 255, fill: DH.yellow, fillOp: 70, bleed: .2, ink: DH.ink, sw: 1.3 });
  paint(ellPts(x, y, r * .62, r * .62, 24, 1), { wash: o.core || DH.yellow, washOp: 230, ink: null });
}
function vsMoon(x, y, r, o = {}) {
  vsKey('moon', o, x, y);
  glow(x, y, r * 3.4, '#FFF1C2', .7);
  paint(ellPts(x, y, r, r, 28, 1), { wash: '#FFF3CB', washOp: 255, ink: DH.ink, sw: 1 });
  paint(ellPts(x - r * .25, y - r * .1, r * .22, r * .22, 12), { fill: '#E8D9A8', fillOp: 120, ink: null });
  paint(ellPts(x + r * .3, y + r * .25, r * .3, r * .3, 12), { fill: '#E8D9A8', fillOp: 100, ink: null });
}
// A swirl cloud in the Đông Hồ manner: a lobed body with a curl painted inside.
function vsCloud(x, y, s, o = {}) {
  vsKey('cloud', o, x, y);
  const pts = []; for (let i = 0; i < 48; i++) { const a = i / 48 * TAU, r = 1 + .16 * Math.cos(5 * a + (o.ph || 0)) + .06 * Math.cos(9 * a); pts.push([x + Math.cos(a) * s * r * 1.3, y + Math.sin(a) * s * r * .6]); }
  paint(pts, { wash: o.col || '#FFF8E6', washOp: o.op ?? 255, ink: o.ink === false ? null : DH.ink, sw: .9, curv: .5 });
  const sp = []; for (let k = 0; k < 14; k++) { const a = k * .55, r = s * (.05 + k * .018); sp.push([x - s * .25 + Math.cos(a) * r, y - s * .02 + Math.sin(a) * r * .8]); }
  inkLine(sp, .8, DH.skyDk, 'inkfine', .6);
}

// ---------- land ----------
// Smooth ridge function by kind; returns 0..1 height at world x.
function ridgeH(kind, x, seed) {
  if (kind === 'karst') { let h = 0; for (let i = 0; i < 6; i++) { const c = (i * 260 + hash(seed + i) * 200), w = 55 + hash(seed + i * 9) * 70; h = Math.max(h, (.45 + .55 * hash(seed + i * 3)) * Math.exp(-Math.pow((x - c) / w, 4))); } return h; }
  if (kind === 'range') return .5 + .5 * Math.sin(x * .006 + seed) * Math.sin(x * .0023 + seed * 2) + .12 * Math.sin(x * .021 + seed);
  return .5 + .5 * Math.sin(x * .004 + seed) + .15 * Math.sin(x * .013 + seed * 3);
}
// A band of mountains whose base is y and whose peaks reach `amp` above it. pan shifts it sideways (parallax).
function vsRidge(y, amp, col, o = {}) {
  vsKey('ridge', o, y, amp);
  const kind = o.kind || 'hill', seed = o.seed || 1, pan = o.pan || 0, top = [];
  for (let x = -420; x <= W + 420; x += 24) top.push([x, y - amp * ridgeH(kind, x + pan, seed)]);
  vsWide(top, y + 400, { wash: col, washOp: 255, fill: mixCol(col, DH.ink, .35), fillOp: 55, bleed: .3, tex: .6, border: .5 });
  vsWideLine(top, o.sw ?? .9, DH.ink, 'ink', kind === 'karst' ? .15 : .3);
}
// Ground from y down to the bottom of the frame, with a wavy top edge.
function vsLand(y, col, o = {}) {
  vsKey('land', o, y);
  const top = [], amp = o.amp ?? 10, pan = o.pan || 0, bot = o.bottom ?? H + 300;
  for (let x = -420; x <= W + 420; x += 40) top.push([x, y + amp * Math.sin((x + pan) * .006 + (o.seed || 0)) + jit(2)]);
  vsWide(top, bot, { wash: col, washOp: 255, fill: o.col2 || mixCol(col, DH.ink, .3), fillOp: 70, bleed: .3, tex: .7, border: .5 });
  vsWideLine(top, 1.1);
}
// p5.brush drops (or fades) a wash or a stroke whose shape is much wider than the view once the camera is off-centre, so wide
// shapes are painted as chunks ~560 px wide that overlap a little, with no outline of their own; outlines are chunked lines.
function vsWide(top, bot, o) {
  const CH = 560;
  let i = 0;
  while (i < top.length - 1) {
    let j = i; while (j < top.length - 1 && top[j][0] - top[i][0] < CH) j++;
    const seg = top.slice(i, j + 1);
    paint([...seg, [seg[seg.length - 1][0] + 8, bot], [seg[0][0] - 8, bot]], { ...o, ink: null, curv: 0 });
    i = j;
  }
}
function vsWideLine(pts, sw = 1.1, col = DH.ink, br = 'ink', curv = .5) {
  const CH = 560;
  let i = 0;
  while (i < pts.length - 1) {
    let j = i; while (j < pts.length - 1 && pts[j][0] - pts[i][0] < CH) j++;
    inkLine(pts.slice(i, j + 1), sw, col, br, curv);
    i = j;
  }
}

function vsTufts(y0, y1, n, col = DH.greenDk, o = {}) {
  vsKey('tufts', o, y0);
  for (let i = 0; i < n; i++) {
    const x = hash(i * 5.3 + (o.seed || 0)) * (W + 100) - 50, y = lerp(y0, y1, hash(i * 2.9 + 1)), s = 14 + hash(i) * 14 * (o.size ?? 1);
    for (let k = -1; k <= 1; k++) inkLine([[x + k * s * .3, y], [x + k * s * .5, y - s * (.8 - Math.abs(k) * .2)]], 1.2, col, 'inkfine', .3);
  }
}
function vsRock(x, y, s, o = {}) {
  vsKey('rock', o, x, y);
  paint([[x - s, y], [x - s * .8, y - s * .6], [x - s * .2, y - s * .95], [x + s * .5, y - s * .8], [x + s, y - s * .2], [x + s * .9, y]], { wash: o.col || DH.stone, washOp: 255, fill: DH.ink, fillOp: 40, bleed: .3, ink: DH.ink, sw: 1, curv: .3 });
}

// ---------- water ----------
function vsWater(y0, y1, o = {}) {
  vsKey('water', o, y0);
  const col = o.col || DH.water, t = o.t ?? T;
  vsWide([[-420, y0], [-100, y0], [220, y0], [540, y0], [860, y0], [1180, y0], [W + 420, y0]], y1, { wash: col, washOp: 255, fill: mixCol(col, DH.ink, .3), fillOp: 60, bleed: .3, tex: .6, border: .4 });
  const rows = Math.max(2, Math.round((y1 - y0) / 55));
  for (let r = 0; r < rows; r++) {
    const y = lerp(y0 + 28, y1 - 10, r / Math.max(1, rows - 1)), sp = (o.speed ?? 30) * (1 + r * .15), step = 120;
    for (let x = -step + ((r * 47 + (t * sp)) % step); x < W + step; x += step) {
      const a = .5 + .5 * Math.sin(x * .02 + r);
      inkLine([[x - 26, y + 3], [x - 12, y - 6 * a], [x, y + 1], [x + 12, y - 6 * a], [x + 26, y + 3]], 1.1, o.waveCol || mixCol(col, '#FFFFFF', .55), 'inkfine', .4);
    }
  }
}

// ---------- weather and effects ----------
function vsRain(t, o = {}) {
  vsKey('rain', o, 0);
  const n = o.n ?? 70, len = o.len ?? 70, col = o.col || '#DDE7EE';
  for (let i = 0; i < n; i++) {
    const sp = 900 + hash(i) * 500, x = (hash(i * 3.7) * (W + 300) - 100 + t * sp * .28) % (W + 300) - 100, y = ((hash(i * 7.1) * H + t * sp) % (H + 200)) - 100;
    inkLine([[x, y], [x - len * .26, y + len]], 1.6, col, 'inkfine', 0);
  }
}
function vsFire(x, y, s, t, o = {}) {
  vsKey('fire', o, x, y);
  glow(x, y - s * 1.2, s * 3.4, '#FF9A3C', o.glow ?? .8);
  for (let i = 0; i < 3; i++) {
    const k = i === 0 ? 1 : i === 1 ? .66 : .38, f = 1 + .12 * Math.sin(t * 13 + i * 2), ox = Math.sin(t * 7 + i) * s * .06;
    paint([[x - s * .62 * k, y], [x - s * .5 * k, y - s * .8 * k], [x - s * .12 * k + ox, y - s * 1.3 * k * f], [x + s * .06 * k, y - s * 2.1 * k * f], [x + s * .3 * k + ox, y - s * 1.2 * k * f], [x + s * .58 * k, y - s * .7 * k], [x + s * .62 * k, y]],
      { wash: [DH.red, DH.orange, DH.gold][i], washOp: 255, curv: .4, ink: i === 0 ? DH.ink : null, sw: .9 });
  }
}
function vsSmoke(x, y, s, t, o = {}) {
  vsKey('smoke', o, x, y);
  const n = o.n ?? 5;
  for (let i = 0; i < n; i++) {
    const k = frac(t * .35 + i / n), r = s * (.35 + k * .9);
    paint(ellPts(x + Math.sin(k * 5 + i) * s * .5 + (o.drift || 0) * k * s * 2, y - k * s * 4.5, r, r * .85, 14), { wash: o.col || '#CFC8BA', washOp: 255 * (1 - k) * .85, ink: null });
  }
}
function vsDust(x, y, s, t, o = {}) {
  vsKey('dust', o, x, y);
  for (let i = 0; i < 6; i++) { const k = frac(t * 1.4 + i / 6), r = s * (.3 + k * .8); paint(ellPts(x - k * s * 3 * (o.dir ?? 1), y - k * s * .6, r, r * .7, 12), { wash: '#D8C7A0', washOp: 200 * (1 - k), ink: null }); }
}
// Arrows in flight. `from` is a list of [x, y] bow positions (each loosing one arrow per cycle, out of step with the others)
// or a single point plus o.spread for a mass volley; each arrow arcs to (x1, y1) and only exists while it is in the air.
function vsArrows(t, x0, y0, x1, y1, n, o = {}) {
  vsKey('arrows', o, 0);
  const src = o.from ?? Array.from({ length: n }, (_, i) => [x0, y0 + (i - n / 2) * (o.spread ?? 18)]);
  src.forEach(([sx, sy], i) => {
    const k = frac(t * (o.rate ?? .9) + (o.phase ?? 0) + i / src.length + hash(i) * .1), j = (i - src.length / 2) * (o.spread ?? 18) * 1.4;
    const [ax, ay] = arcPt([sx, sy], [x1, y1 + j], o.h ?? 160, k), [bx, by] = arcPt([sx, sy], [x1, y1 + j], o.h ?? 160, Math.max(0, k - .05));
    inkLine([[bx, by], [ax, ay]], 2.2, DH.ink, 'ink', 0);
    paint([[ax, ay]].flatMap(([px, py]) => { const d = Math.hypot(ax - bx, ay - by) || 1, ux = (ax - bx) / d, uy = (ay - by) / d; return [[px + ux * 9, py + uy * 9], [px - uy * 4, py + ux * 4], [px + uy * 4, py - ux * 4]]; }), { wash: DH.grey, washOp: 255, ink: null });
  });
}

// ---------- plants ----------
function vsBamboo(x, y, h, o = {}) {
  vsKey('bamboo', o, x, y);
  const n = o.n ?? 5, t = o.t ?? T, sway = (o.sway ?? 1);
  for (let i = 0; i < n; i++) {
    const bx = x + (i - (n - 1) / 2) * h * .09 + hash(i) * 10, hh = h * (.8 + hash(i + 3) * .35), lean = (hash(i * 2) - .5) * .12 + Math.sin(t * 1.3 + i) * .02 * sway;
    const P = []; for (let k = 0; k <= 6; k++) P.push([bx + lean * hh * (k / 6) * (k / 6), y - hh * k / 6]);
    paint(ribbon(P, h * .035, h * .022), { wash: i % 2 ? DH.green : mixCol(DH.green, DH.yellow, .25), washOp: 255, ink: DH.ink, sw: .8, curv: .3 });
    for (let k = 1; k <= 5; k++) { const [px, py] = P[k]; inkLine([[px - h * .02, py], [px + h * .02, py]], 1.1, DH.ink, 'inkfine', 0); }
    const [tx, ty] = P[6];
    for (let l = -2; l <= 2; l++) { const a = -1.57 + l * .6 + Math.sin(t * 2 + i + l) * .07 * sway, len = h * .22; paint(ribbon([[tx, ty + l * 2], [tx + Math.cos(a) * len * .55, ty + Math.sin(a) * len * .55], [tx + Math.cos(a) * len, ty + Math.sin(a) * len]], h * .045, 2), { wash: DH.greenDk, washOp: 255, ink: DH.ink, sw: .6, curv: .3 }); }
  }
}
function vsPalm(x, y, h, o = {}) {
  vsKey('palm', o, x, y);
  const t = o.t ?? T, lean = o.lean ?? .12, P = []; for (let k = 0; k <= 5; k++) P.push([x + lean * h * (k / 5) * (k / 5) * 2, y - h * k / 5]);
  paint(ribbon(P, h * .07, h * .045), { wash: DH.brown, washOp: 255, ink: DH.ink, sw: 1, curv: .3 });
  const [tx, ty] = P[5];
  for (let l = 0; l < 7; l++) { const a = -3.14 + l * .52 + Math.sin(t * 1.7 + l) * .05, len = h * .5; paint(ribbon([[tx, ty], [tx + Math.cos(a) * len * .55, ty + Math.sin(a) * len * .55 - len * .15], [tx + Math.cos(a) * len, ty + Math.sin(a) * len * .8 + len * .2]], h * .06, 3), { wash: DH.green, washOp: 255, ink: DH.ink, sw: .8, curv: .4 }); }
}
function vsBanana(x, y, s, o = {}) {
  vsKey('banana', o, x, y);
  const t = o.t ?? T;
  paint(rrPts(x - s * .12, y - s * 1.1, s * .24, s * 1.1, s * .08), { wash: DH.green, washOp: 255, ink: DH.ink, sw: 1 });
  for (let l = 0; l < 5; l++) { const a = -3.14 + l * .78 + Math.sin(t * 1.5 + l) * .04, len = s * .95; paint(ribbon([[x, y - s * 1.05], [x + Math.cos(a) * len * .5, y - s * 1.05 + Math.sin(a) * len * .5 - len * .1], [x + Math.cos(a) * len, y - s * 1.05 + Math.sin(a) * len * .6 + len * .1]], s * .38, s * .06), { wash: DH.green, washOp: 255, ink: DH.ink, sw: .8, curv: .4 }); }
}
function vsBanyan(x, y, s, o = {}) {
  vsKey('banyan', o, x, y);
  const trunk = [[x - s * .22, y], [x - s * .14, y - s * .6], [x - s * .3, y - s * 1.1], [x + s * .3, y - s * 1.1], [x + s * .14, y - s * .6], [x + s * .22, y]];
  paint(trunk, { wash: DH.brown, washOp: 255, curv: .3, ink: DH.ink, sw: 1.1 });
  for (let i = 0; i < 5; i++) inkLine([[x + (i - 2) * s * .1, y - s * 1.0], [x + (i - 2) * s * .13, y - s * .1]], 1.2, DH.brownDk, 'inkfine', .3);
  const blobs = [[0, -1.5, 1.0, .55], [-.75, -1.3, .65, .4], [.75, -1.32, .68, .42], [-.35, -1.85, .6, .35], [.4, -1.85, .6, .35]];
  for (const [bx, by, rx, ry] of blobs) paint(ellPts(x + bx * s, y + by * s, rx * s, ry * s, 22, 2), { wash: DH.green, washOp: 255, fill: DH.greenDk, fillOp: 70, bleed: .3, ink: DH.ink, sw: 1 });
  for (let i = 0; i < 7; i++) inkLine([[x + (i - 3) * s * .26, y - s * 1.2], [x + (i - 3) * s * .27, y - s * (.5 + hash(i) * .5)]], .9, DH.brownDk, 'inkfine', 0);
}
function vsTree(x, y, s, o = {}) {
  vsKey('tree', o, x, y);
  paint(rrPts(x - s * .08, y - s * .8, s * .16, s * .8, s * .05), { wash: DH.brown, washOp: 255, ink: DH.ink, sw: 1 });
  paint(ellPts(x, y - s * 1.1, s * .55, s * .5, 18, 2), { wash: o.col || DH.green, washOp: 255, fill: DH.greenDk, fillOp: 70, bleed: .3, ink: DH.ink, sw: 1 });
  if (o.flowers) for (let i = 0; i < 6; i++) paint(ellPts(x + (hash(i) - .5) * s, y - s * (.9 + hash(i + 4) * .5), s * .06, s * .06, 8), { wash: o.flowers, ink: null });
}
// Rice: rows of stalks on a paddy, ripe = 0 green .. 1 golden
function vsRice(x0, x1, y, rows, o = {}) {
  vsKey('rice', o, y);
  const t = o.t ?? T, ripe = o.ripe ?? 0, col = mixCol(DH.green, DH.yellow, ripe), sc = o.size ?? 1;
  for (let r = 0; r < rows; r++) {
    const yy = y + r * 26 * sc;
    for (let x = x0 + (r % 2) * 11; x < x1; x += 22) {
      const sway = Math.sin(t * 2 + x * .03 + r) * 3;
      inkLine([[x, yy], [x + sway * .5, yy - 22 * sc], [x + sway + (ripe > .5 ? 5 : 0), yy - 38 * sc]], 2.6, col, 'ink', .4);
      if (ripe > .5) paint(ellPts(x + sway + 4, yy - 34 * sc, 3.5 * sc, 7 * sc, 6, 0, .5), { wash: DH.yellow, ink: null });
    }
  }
}
function vsLotus(x, y, s, o = {}) {
  vsKey('lotus', o, x, y);
  paint(ellPts(x, y, s, s * .35, 18, 1), { wash: DH.green, washOp: 255, ink: DH.ink, sw: .8 });
  if (o.flower !== false) for (const a of [-.5, 0, .5]) paint([[x, y - s * .1], [x + a * s * .8, y - s * .9], [x + a * s * .8 + s * .22, y - s * .15]], { wash: DH.pink, washOp: 255, curv: .4, ink: DH.ink, sw: .7 });
}

// Foreground band from y to the bottom: darker ground with a few big tufts and pebbles, so the lower third never reads as empty.
function vsFore(y, col, o = {}) {
  vsKey('fore', o, y);
  const top = [], pan = o.pan || 0;
  for (let x = -420; x <= W + 420; x += 40) top.push([x, y + 14 * Math.sin((x + pan) * .005 + (o.seed || 1))]);
  const dk = mixCol(col, DH.ink, o.dark ?? .18);
  vsWide(top, H + 300, { wash: dk, washOp: 255, fill: mixCol(col, DH.ink, .4), fillOp: 55, bleed: .3, tex: .7, border: .5 });
  vsWideLine(top, 1.1);
  for (let i = 0; i < (o.n ?? 9); i++) {
    const x = hash(i * 4.3 + (o.seed || 1)) * (W + 200) - 100, yy = y + 90 + hash(i * 2.2 + 3) * (H - y - 130), s = 22 + hash(i) * 26;
    if (o.rocks && i % 3 === 0) { vsRock(x, yy, s * .9, { key: `fr${i}`, col: mixCol(DH.stone, dk, .35) }); continue; }
    for (let k = -2; k <= 2; k++) inkLine([[x + k * s * .22, yy], [x + k * s * .4, yy - s * (1 - Math.abs(k) * .18)]], 1.6, o.tuft || mixCol(col, DH.ink, .55), 'ink', .3);
  }
}
