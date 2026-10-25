// vs_people.js: the people of "Việt sử". nguoi() paints one chibi figure in Đông Hồ folk-print colours: flat bold colour
// under a brush-ink outline, a big round head, short legs. `u` is the body unit (a figure is about 9u tall). (x, y) is the
// point on the ground between the feet; y grows downward, so body-local coordinates below use negative y for "up".
//
// Body-local layout in u (front view; flip mirrors the whole figure):
//   head centre (0, -6.7), 5 wide, 4.7 tall.  shoulders (±1.65, -4.2).  hem of a long robe at -0.5.  feet at 0.
//   arms are 2.2u long; aL / aR measure the angle from "hanging down" (0) through "straight out" (1.57) to "straight up" (3.14).
// Everything draws ONE frame; motion comes from what the scene passes in (walk phase, arm angles, mouth, dx/dy, sq, rot).

const DH = {
  paper: '#F1E8CF', red: '#C8372D', redDk: '#8E2220', yellow: '#E7B232', indigo: '#2D4B80', indigoDk: '#1F3358',
  green: '#4F8A4B', greenDk: '#356536', brown: '#8A5A3A', brownDk: '#5E3B27', white: '#FFF8E6', pink: '#E98A86',
  ink: '#2B2233', grey: '#8F8B86', greyDk: '#5F5B58', gold: '#F2C14E', tan: '#D9B26F', sky: '#9CC9D8', skyDk: '#6AA2B8',
  water: '#5C95AE', earth: '#B5835A', sand: '#E3CFA0', stone: '#A59C8E', orange: '#E8833A', night: '#1F2550'
};
const SKIN = { fair: '#F2CFA6', tan: '#E4B287', dark: '#C98F63', pale: '#F6DEC0' };

let PERSON_N = 0;
// A scene function calls this first, so each person's boil seed is the same every frame of the shot.
const vsBegin = () => { PERSON_N = 0; };

function nguoi(x, y, u, o = {}) {
  if (o.who) o = { ...CAST[o.who], ...o };      // explicit options win over the cast sheet
  const id = o.boilKey ?? `${o.who || 'p'}${++PERSON_N}`, rs = part => boilSeed(`nguoi ${id} ${part}`);
  const sw = clamp(u / 15, .45, 2.4) * (o.swMul || 1), J = u * .05, t = o.t ?? T, seed = o.seed || 0;
  const skin = SKIN[o.skin || 'fair'] || o.skin, skinDk = mixCol(skin, DH.brownDk, .22);
  const out = { kind: 'robe', col: DH.indigo, col2: DH.yellow, ...(o.outfit || {}) };
  const col = out.col, col2 = out.col2, dk = mixCol(col, DH.ink, .3), pants = out.pants || DH.brownDk;
  const bob = o.still ? 0 : Math.sin(t * 2.4 + seed * 3) * .05;
  const P = a => a.map(([px, py]) => [px * u, py * u]);
  const ink = (w = 1) => ({ ink: DH.ink, sw: sw * w });
  const walk = o.walk, sq = o.sq || 0;
  const aL = o.aL ?? .12, aR = o.aR ?? .12;
  const headDy = (o.bow || 0) * .9 + bob, headRot = o.tilt || 0;

  rs('shadow');
  if (!o.noShadow) {
    const f = 1 - Math.min(.5, Math.abs(o.dy || 0) * .06);
    paint(ellPts(x + (o.dx || 0) * u, y + u * .1, u * 2.8 * f, u * .55 * f, 20), { fill: DH.ink, fillOp: 80, bleed: .25, tex: .3, border: .1, ink: null });
  }

  push();
  translate(x + (o.dx || 0) * u, y + (o.dy || 0) * u);
  if (o.rot) rotate(o.rot);
  scale((o.flip ? -1 : 1) * (o.sx ?? 1) * (1 + sq * .5), (o.sy ?? 1) * (1 - sq));

  // hair behind the head (long hair falls over the shoulders)
  rs('hairBack');
  if (o.hair === 'long') push(), translate(0, headDy * u),
    paint(P([[-2.75, -7.6], [-3.1, -5], [-2.6, -3.3], [-1.2, -3.1], [1.2, -3.1], [2.6, -3.3], [3.1, -5], [2.75, -7.6]]), { wash: o.hairCol || DH.ink, washOp: 255, curv: .35, ...ink(.8) }), pop();

  // legs and feet (a long robe hides the legs; the feet still peek out)
  rs('legs');
  const longRobe = out.kind === 'robe' || out.kind === 'skirt';
  for (const s of [-1, 1]) {
    const ph = walk == null ? 0 : Math.sin((walk + (s > 0 ? .5 : 0)) * TAU), lift = walk == null ? 0 : Math.max(0, ph) * .55;
    const lx = s * .85 + (walk == null ? 0 : ph * .55), top = longRobe ? -1.2 : -2.5;
    if (!longRobe) paint(rrPts((lx - .5) * u, top * u, 1 * u, (-top - lift - .1) * u, .3 * u, J * .5), { wash: out.kind === 'fur' || out.kind === 'bare' ? skin : pants, washOp: 255, ...ink(.8) });
    const shoe = o.barefoot ? skin : o.shoe || DH.ink;
    paint(ellPts(lx * u + .1 * u, (-.28 - lift) * u, .85 * u, .38 * u, 12), { wash: shoe, washOp: 255, ink: o.barefoot ? DH.ink : null, sw: sw * .6 });
  }

  // torso
  rs('torso');
  push(); translate(0, bob * u * .6);
  switch (out.kind) {
    case 'robe': {
      paint(P([[-1.55, -4.5], [-1.85, -3], [-2.25, -.8], [-1.1, -.45], [0, -.4], [1.1, -.45], [2.25, -.8], [1.85, -3], [1.55, -4.5], [.7, -4.75], [-.7, -4.75]]), { wash: col, washOp: 255, curv: .25, ...ink() });
      paint(P([[-2.2, -1.25], [-2.28, -.8], [-1.1, -.45], [0, -.4], [1.1, -.45], [2.28, -.8], [2.2, -1.25], [0, -1.05]]), { wash: col2, washOp: 255, ink: null });
      paint(P([[-1.88, -3], [1.88, -3], [1.78, -2.5], [-1.78, -2.5]]), { wash: col2, washOp: 255, ink: DH.ink, sw: sw * .6 });
      inkLine(P([[-.75, -4.7], [0, -3.3], [.75, -4.7]]), sw * 1.2, col2, 'ink', 0);
      inkLine(P([[-.75, -4.7], [0, -3.3], [.75, -4.7]]), sw * .5, DH.ink, 'inkfine', 0);
      break;
    }
    case 'skirt': {
      paint(P([[-1.4, -4.5], [-1.5, -3.4], [-1.3, -2.7], [1.3, -2.7], [1.5, -3.4], [1.4, -4.5], [.6, -4.7], [-.6, -4.7]]), { wash: out.top || col2, washOp: 255, curv: .25, ...ink() });
      paint(P([[-1.3, -2.9], [-2.6, -.6], [-1, -.35], [0, -.3], [1, -.35], [2.6, -.6], [1.3, -2.9]]), { wash: col, washOp: 255, curv: .25, ...ink() });
      paint(P([[-2.3, -1.2], [-2.6, -.6], [-1, -.35], [0, -.3], [1, -.35], [2.6, -.6], [2.3, -1.2], [0, -1]]), { wash: col2, washOp: 255, ink: null });
      paint(P([[-1.45, -3.0], [1.45, -3.0], [1.4, -2.65], [-1.4, -2.65]]), { wash: DH.ink, washOp: 255, ink: null });
      break;
    }
    case 'tunic': case 'uniform': case 'suit': {
      paint(P([[-1.6, -4.5], [-1.9, -3.3], [-1.85, -2.2], [1.85, -2.2], [1.9, -3.3], [1.6, -4.5], [.7, -4.75], [-.7, -4.75]]), { wash: col, washOp: 255, curv: .25, ...ink() });
      inkLine(P([[-.7, -4.7], [0, -3.7], [.7, -4.7]]), sw * .8, DH.ink, 'inkfine', 0);
      if (out.kind === 'tunic') paint(P([[-1.9, -2.7], [1.9, -2.7], [1.85, -2.2], [-1.85, -2.2]]), { wash: col2, washOp: 255, ink: null });
      if (out.kind === 'suit') { for (const s of [-1, 1]) paint(P([[s * .9, -3.5], [s * 1.6, -3.5], [s * 1.6, -2.9], [s * .9, -2.9]]), { wash: mixCol(col, DH.ink, .12), washOp: 255, ink: DH.ink, sw: sw * .4 }); inkLine(P([[0, -4.4], [0, -2.3]]), sw * .6, DH.ink, 'inkfine', 0); }
      if (out.kind === 'uniform') paint(P([[-1.9, -2.75], [1.9, -2.75], [1.87, -2.3], [-1.87, -2.3]]), { wash: DH.brownDk, washOp: 255, ink: null });
      break;
    }
    case 'armor': {
      paint(P([[-1.6, -4.5], [-1.9, -3.3], [-1.85, -2], [1.85, -2], [1.9, -3.3], [1.6, -4.5], [.7, -4.75], [-.7, -4.75]]), { wash: col, washOp: 255, curv: .25, ...ink() });
      paint(P([[-1.5, -4.3], [1.5, -4.3], [1.4, -2.7], [-1.4, -2.7]]), { wash: col2, washOp: 255, curv: .2, ...ink(.7) });
      for (const k of [-.9, 0, .9]) inkLine(P([[k * 1.2, -4.2], [k * 1.2, -2.8]]), sw * .4, DH.ink, 'inkfine', 0);
      paint(P([[-1.95, -2.4], [1.95, -2.4], [2.1, -1.2], [-2.1, -1.2]]), { wash: dk, washOp: 255, curv: .2, ...ink(.7) });
      for (const s of [-1, 1]) paint(ellPts(s * 1.75 * u, -4.2 * u, .95 * u, .6 * u, 12), { wash: col2, washOp: 255, ...ink(.7) });
      paint(P([[-2, -2.6], [2, -2.6], [2, -2.2], [-2, -2.2]]), { wash: DH.red, washOp: 255, ink: null });
      break;
    }
    case 'fur': {   // prehistoric wrap: bare chest and a ragged fur skirt
      paint(P([[-1.55, -4.5], [-1.8, -3.2], [-1.7, -2.3], [1.7, -2.3], [1.8, -3.2], [1.55, -4.5], [.7, -4.75], [-.7, -4.75]]), { wash: skin, washOp: 255, curv: .25, ...ink() });
      paint(P([[-1.9, -3.1], [-2.1, -1.2], [-1.5, -1.5], [-1, -.9], [-.4, -1.45], [.2, -.8], [.8, -1.4], [1.4, -1], [2.1, -1.2], [1.9, -3.1], [0, -3.4]]), { wash: out.col, washOp: 255, ...ink(.8) });
      break;
    }
    case 'bare': {
      paint(P([[-1.55, -4.5], [-1.8, -3.2], [-1.7, -2.3], [1.7, -2.3], [1.8, -3.2], [1.55, -4.5], [.7, -4.75], [-.7, -4.75]]), { wash: skin, washOp: 255, curv: .25, ...ink() });
      paint(P([[-1.75, -2.8], [1.75, -2.8], [1.7, -2.1], [-1.7, -2.1]]), { wash: col, washOp: 255, ...ink(.7) });
      break;
    }
  }
  outfitExtras(out, u, sw, skin);
  pop();

  // arms (+ what they hold)
  rs('arms');
  const SH = 1.65, SY = -4.15, LEN = 2.2;
  const arm = (side, a, hold, tag) => {
    boilSeed(`nguoi ${id} arm${tag}`);
    const px = side * SH * u, py = (SY + bob * .6) * u, hx = px + side * LEN * u * Math.sin(a), hy = py + LEN * u * Math.cos(a);
    const nx = side * Math.cos(a), ny = -Math.sin(a), bend = (o.bend ?? .25) * u;
    const mid = [(px + hx) / 2 + nx * bend, (py + hy) / 2 + ny * bend];
    const sleeve = out.kind === 'fur' || out.kind === 'bare' ? skin : col;
    paint(ribbon([[px, py], mid, [hx, hy]], 1.15 * u, .95 * u), { wash: sleeve, washOp: 255, curv: .4, ...ink(.8) });
    paint(ellPts(hx, hy, .56 * u, .56 * u, 10), { wash: skin, washOp: 255, ...ink(.7) });
    if (hold) item(typeof hold === 'string' ? hold : hold.k, hx, hy, u, sw, typeof hold === 'string' ? { t } : { t, ...hold });
  };
  if (!o.armsLate) { arm(-1, aL, o.holdL, 'L'); arm(1, aR, o.holdR, 'R'); }

  // head
  rs('head');
  push(); translate(0, (-6.7 + headDy) * u); if (headRot) rotate(headRot); translate(0, 6.7 * u);
  const hc = -6.7, look = (o.lookX || 0) * .22;
  paint(ellPts(look * u * .3, hc * u, 2.55 * u, 2.35 * u, 26, J), { wash: skin, washOp: 255, ...ink() });
  for (const s of [-1, 1]) paint(ellPts(s * 2.5 * u, (hc + .15) * u, .45 * u, .6 * u, 8), { wash: skin, washOp: 255, ...ink(.6) });
  paint(ellPts(look * u * .3, (hc + 1.05) * u, 1.9 * u, 1.1 * u, 14), { fill: skinDk, fillOp: 55, bleed: .3, tex: .7, border: .8, ink: null });

  // face
  rs('face');
  const fx = look * u, ey = (hc + .15) * u;
  const mood = o.eyes || 'open';
  const blink = o.t != null && mood === 'open' && frac(t * .31 + seed * .37) < .035;
  for (const s of [-1, 1]) {
    const ex = fx + s * .98 * u;
    paint(ellPts(fx + s * 1.62 * u, (hc + 1.25) * u, .7 * u, .38 * u, 12), { fill: DH.pink, fillOp: 150 * (o.blush ?? 1), bleed: .2, ink: null });
    if (blink || mood === 'closed') inkLine([[ex - .5 * u, ey + .05 * u], [ex, ey + .25 * u], [ex + .5 * u, ey + .05 * u]], sw * 1.1, DH.ink, 'ink', .4);
    else if (mood === 'happy') inkLine([[ex - .55 * u, ey + .3 * u], [ex, ey - .3 * u], [ex + .55 * u, ey + .3 * u]], sw * 1.2, DH.ink, 'ink', .4);
    else if (mood === 'wide') { paint(ellPts(ex, ey, .55 * u, .7 * u, 12), { wash: DH.white, washOp: 255, ink: DH.ink, sw: sw * .6 }); paint(ellPts(ex + look * u * .3, ey, .22 * u, .3 * u, 8), { wash: DH.ink, ink: null }); }
    else {
      paint(ellPts(ex + look * u * .15, ey, .26 * u, .42 * u, 10), { wash: DH.ink, washOp: 255, ink: null });
      if (u > 12) paint(ellPts(ex + look * u * .15 - .08 * u, ey - .14 * u, .08 * u, .1 * u, 6), { wash: DH.white, washOp: 230, ink: null });
    }
    const brow = o.brow ?? (mood === 'angry' ? -1 : mood === 'sad' ? 1 : 0);   // -1 slants down to the middle, 1 up
    const by = ey - .85 * u;
    if (mood !== 'closed' || brow) inkLine([[ex - .5 * u, by + (s * brow * -.18) * u], [ex + .5 * u, by + (s * brow * .18) * u]], sw * 1.1, o.browCol || DH.ink, 'inkfine', 0);
  }
  // mouth
  const my = (hc + 1.35) * u, talk = o.talk != null ? Math.max(0, Math.sin(o.talk * TAU * 2.6)) : 0;
  const mouth = o.mouth || 'smile';
  if (mouth === 'smile' && talk > .25) paint(ellPts(fx, my + .05 * u, .5 * u, (.25 + talk * .3) * u, 10), { wash: '#4A1F2A', ink: DH.ink, sw: sw * .5 });
  else if (mouth === 'smile') inkLine([[fx - .6 * u, my - .05 * u], [fx, my + .3 * u], [fx + .6 * u, my - .05 * u]], sw, DH.ink, 'ink', .5);
  else if (mouth === 'flat') inkLine([[fx - .5 * u, my + .1 * u], [fx + .5 * u, my + .1 * u]], sw, DH.ink, 'ink', 0);
  else if (mouth === 'sad') inkLine([[fx - .55 * u, my + .3 * u], [fx, my - .05 * u], [fx + .55 * u, my + .3 * u]], sw, DH.ink, 'ink', .5);
  else if (mouth === 'open') paint(ellPts(fx, my + .05 * u, .55 * u, (.4 + talk * .25) * u, 10), { wash: '#4A1F2A', ink: DH.ink, sw: sw * .5 });
  else if (mouth === 'shout') { paint(ellPts(fx, my + .1 * u, .85 * u, (.7 + talk * .25) * u, 12), { wash: '#4A1F2A', ink: DH.ink, sw: sw * .6 }); paint(ellPts(fx, my + .45 * u, .5 * u, .22 * u, 8), { wash: DH.pink, ink: null }); }
  else if (mouth === 'o') paint(ellPts(fx, my + .1 * u, .3 * u, .36 * u, 10), { wash: '#4A1F2A', ink: null });
  else if (mouth === 'grin') paint(P([[-.9 + look, -5.35 + .1], [.9 + look, -5.35 + .1], [.6 + look, -4.75], [-.6 + look, -4.75]]), { wash: '#4A1F2A', ink: DH.ink, sw: sw * .5, curv: .3 });

  // nose (a tiny stroke), then beard, then hair and hat on top
  inkLine([[fx - .08 * u, (hc + .75) * u], [fx + .12 * u, (hc + 1) * u]], sw * .45, mixCol(skinDk, DH.ink, .5), 'inkfine', 0);
  rs('beard');
  beardDraw(o.beard, u, sw, fx, hc, o.beardCol || DH.ink, my);
  rs('hair'); hairDraw(o.hair, u, sw, hc, o.hairCol || DH.ink);
  rs('hat'); hatDraw(o.hat, u, sw, hc, o.hatCol, t);
  pop();   // head

  if (o.armsLate) { arm(-1, aL, o.holdL, 'L'); arm(1, aR, o.holdR, 'R'); }
  rs('draw'); if (o.draw) o.draw(u, sw);
  pop();
  rs('after');
}

// Period details laid over the torso (flags on o.outfit): collar 'cross' (giao lĩnh) | 'mao' (stand collar), patch (square rank badge),
// scale (lamellar armour rows), tattoo (Đông Sơn swirls), necklace (bead ring colour), fringe (hanging feather colours), scarf (neck band).
function outfitExtras(out, u, sw, skin) {
  const P = a => a.map(([px, py]) => [px * u, py * u]), line = (pts, w, c, br = 'inkfine') => inkLine(P(pts), sw * w, c, br, 0);
  if (out.collar === 'cross') { line([[-.8, -4.7], [.95, -2.7]], 1.3, out.col2, 'ink'); line([[-.8, -4.7], [.95, -2.7]], .5, DH.ink); line([[.8, -4.7], [-.4, -3.4]], .9, DH.ink); }
  if (out.collar === 'mao') paint(P([[-.75, -4.8], [.75, -4.8], [.7, -4.3], [-.7, -4.3]]), { wash: mixCol(out.col, DH.ink, .12), washOp: 255, ink: DH.ink, sw: sw * .5 });
  if (out.scale) {
    for (let r = 0; r < 5; r++) {
      const y = -4.2 + r * .32; line([[-1.4, y], [1.4, y]], .35, DH.ink);
      for (let c = -4; c <= 4; c++) line([[c * .32 + (r % 2) * .16, y], [c * .32 + (r % 2) * .16, y + .32]], .3, DH.ink);
    }
  }
  if (out.patch) paint(P([[-.65, -4.1], [.65, -4.1], [.65, -3.1], [-.65, -3.1]]), { wash: out.patch, washOp: 255, ink: DH.ink, sw: sw * .6 });
  if (out.tattoo) for (const [x, y] of [[-.9, -3.9], [.9, -3.9], [0, -3.1]]) line([[x - .35, y], [x - .1, y - .3], [x + .2, y - .05], [x + .1, y + .25], [x - .15, y + .2]], .8, out.tattoo);
  if (out.necklace) for (let i = 0; i <= 6; i++) { const a = i / 6 * Math.PI, x = -Math.cos(a) * 1.05, y = -4.55 + Math.sin(a) * .55; paint(ellPts(x * u, y * u, .17 * u, .17 * u, 6), { wash: i % 2 ? out.necklace : DH.red, ink: DH.ink, sw: sw * .3 }); }
  if (out.fringe) for (let i = 0; i < 9; i++) { const x0 = -1.9 + i * .475, c = out.fringe[i % out.fringe.length]; paint(P([[x0, -2.3], [x0 + .475, -2.3], [x0 + .24, -1.0]]), { wash: c, washOp: 255, ink: DH.ink, sw: sw * .4 }); }
  if (out.scarf) { paint(P([[-1.15, -4.75], [1.15, -4.75], [1.0, -4.2], [-1.0, -4.2]]), { wash: out.scarf, washOp: 255, ink: DH.ink, sw: sw * .5 }); for (let i = -2; i <= 2; i++) paint(ellPts(i * .42 * u, -4.5 * u, .07 * u, .07 * u, 5), { wash: DH.white, ink: null }); }
}

function beardDraw(kind, u, sw, fx, hc, col, my) {
  if (!kind || kind === 'none') return;
  const P = a => a.map(([px, py]) => [px * u + fx, py * u]);
  if (kind === 'goat') paint(P([[-.95, hc + 1.8], [-.5, hc + 3.3], [0, hc + 4.1], [.5, hc + 3.3], [.95, hc + 1.8], [.4, hc + 2.15], [-.4, hc + 2.15]]), { wash: col, washOp: 255, curv: .35, ink: DH.ink, sw: sw * .6 });
  else if (kind === 'long') paint(P([[-2.0, hc + .9], [-1.5, hc + 3.3], [-.6, hc + 4.9], [0, hc + 5.4], [.6, hc + 4.9], [1.5, hc + 3.3], [2.0, hc + .9], [1.0, hc + 1.9], [0, hc + 2.2], [-1.0, hc + 1.9]]), { wash: col, washOp: 255, curv: .35, ink: DH.ink, sw: sw * .6 });
  else if (kind === 'thin') for (const k of [-.5, 0, .5]) inkLine(P([[k * .9, hc + 1.9], [k * 1.1, hc + 2.7], [k * .9, hc + 3.5]]), sw * .6, col, 'inkfine', .4);
  else if (kind === 'moustache') for (const s of [-1, 1]) inkLine(P([[s * .15, hc + 1.5], [s * .9, hc + 1.65], [s * 1.6, hc + 1.35], [s * 1.9, hc + 1.7]]), sw * 1.3, col, 'ink', .6);
}

function hairDraw(kind, u, sw, hc, col) {
  if (!kind || kind === 'none') return;
  const P = a => a.map(([px, py]) => [px * u, py * u]);
  if (['short', 'bun', 'long', 'white'].includes(kind)) {
    const c = kind === 'white' ? '#F4F0E6' : col;
    paint(P([[-2.6, hc - .2], [-2.5, hc - 1.6], [-1.6, hc - 2.3], [0, hc - 2.6], [1.6, hc - 2.3], [2.5, hc - 1.6], [2.6, hc - .2], [2.0, hc - 1.0], [1.0, hc - 1.4], [0, hc - 1.0], [-1.0, hc - 1.4], [-2.0, hc - 1.0]]), { wash: c, washOp: 255, curv: .3, ink: DH.ink, sw: sw * .7 });
    if (kind === 'bun') paint(ellPts(.3 * u, (hc - 3.0) * u, 1.0 * u, .95 * u, 14), { wash: c, washOp: 255, ink: DH.ink, sw: sw * .7 });
  }
}

function hatDraw(kind, u, sw, hc, hcol, t) {
  if (!kind || kind === 'none') return;
  const P = a => a.map(([px, py]) => [px * u, py * u]), ink = w => ({ ink: DH.ink, sw: sw * w });
  const top = hc - 2.3;
  switch (kind) {
    case 'nonla': {
      paint(P([[-3.5, hc - .6], [0, hc - 3.9], [3.5, hc - .6], [0, hc - 1.0]]), { wash: hcol || DH.tan, washOp: 255, curv: .12, ...ink(.9) });
      for (const k of [-1.9, -.6, .7, 1.9]) inkLine(P([[k * .5, hc - 3.2 + Math.abs(k) * .5], [k * 1.1, hc - 1.1]]), sw * .35, DH.brownDk, 'inkfine', 0);
      inkLine(P([[-2.2, hc - .6], [-1.6, hc + 2.0], [1.6, hc + 2.0], [2.2, hc - .6]]), sw * .7, DH.red, 'inkfine', .4);
      break;
    }
    case 'khandong': {
      paint(P([[-2.6, hc - .8], [-2.4, hc - 2.0], [-1.6, hc - 3.3], [0, hc - 3.9], [1.6, hc - 3.3], [2.4, hc - 2.0], [2.6, hc - .8], [0, hc - 1.0]]), { wash: hcol || DH.ink, washOp: 255, curv: .35, ...ink(.9) });
      paint(P([[-2.6, hc - 1.0], [2.6, hc - 1.0], [2.5, hc - .35], [-2.5, hc - .35]]), { wash: mixCol(hcol || DH.ink, DH.white, .15), washOp: 255, ink: DH.ink, sw: sw * .5 });
      break;
    }
    case 'khan': {
      paint(P([[-2.6, hc - .5], [-2.4, hc - 1.7], [0, hc - 2.4], [2.4, hc - 1.7], [2.6, hc - .5], [0, hc - .9]]), { wash: hcol || DH.red, washOp: 255, curv: .3, ...ink(.8) });
      paint(P([[2.2, hc - 1.0], [3.4, hc - .5], [3.1, hc + .5], [2.3, hc - .2]]), { wash: hcol || DH.red, washOp: 255, ...ink(.6) });
      break;
    }
    case 'feather': {
      paint(P([[-2.6, hc - .9], [2.6, hc - .9], [2.5, hc - .3], [-2.5, hc - .3]]), { wash: DH.red, washOp: 255, ...ink(.7) });
      paint(P([[-1.6, hc - .85], [-1.2, hc - .85], [-1.2, hc - .35], [-1.6, hc - .35]]), { wash: DH.yellow, ink: null });
      paint(P([[1.2, hc - .85], [1.6, hc - .85], [1.6, hc - .35], [1.2, hc - .35]]), { wash: DH.yellow, ink: null });
      const cols = [DH.indigo, DH.yellow, DH.red, DH.yellow, DH.indigo];
      for (let i = -2; i <= 2; i++) {
        const sway = Math.sin(t * 1.6 + i) * .08, a = i * .3 + sway, len = 3.2 - Math.abs(i) * .35;
        const bx = i * .85, by = hc - .9;
        paint(ribbon([[bx, by], [bx + Math.sin(a) * len * .5 + .0, by - Math.cos(a) * len * .5], [bx + Math.sin(a) * len, by - Math.cos(a) * len]].map(([px, py]) => [px * u, py * u]), .85 * u, .25 * u), { wash: cols[i + 2], washOp: 255, curv: .4, ...ink(.6) });
      }
      break;
    }
    case 'helmet': {
      paint(P([[-2.9, hc - .5], [-2.7, hc - 1.9], [-1.6, hc - 3.1], [0, hc - 3.5], [1.6, hc - 3.1], [2.7, hc - 1.9], [2.9, hc - .5], [0, hc - .9]]), { wash: hcol || DH.greyDk, washOp: 255, curv: .35, ...ink(.9) });
      paint(P([[-3.0, hc - 1.0], [3.0, hc - 1.0], [3.0, hc - .45], [-3.0, hc - .45]]), { wash: DH.brown, washOp: 255, ink: DH.ink, sw: sw * .5 });
      const sway = Math.sin(t * 3) * .15;
      paint(ribbon(P([[0, hc - 3.5], [.2 + sway, hc - 4.4], [.7 + sway, hc - 5.0]]), .9 * u, .3 * u), { wash: DH.red, washOp: 255, curv: .4, ...ink(.6) });
      break;
    }
    case 'crown': {   // vua: tall gold hat with a jewel
      paint(P([[-2.7, hc - .6], [-2.2, hc - 2.6], [-1.3, hc - 4.4], [0, hc - 4.9], [1.3, hc - 4.4], [2.2, hc - 2.6], [2.7, hc - .6], [0, hc - 1.0]]), { wash: hcol || DH.gold, washOp: 255, curv: .3, ...ink(.9) });
      paint(P([[-2.7, hc - 1.3], [2.7, hc - 1.3], [2.6, hc - .5], [-2.6, hc - .5]]), { wash: DH.red, washOp: 255, ...ink(.6) });
      paint(ellPts(0, (hc - 2.8) * u, .55 * u, .6 * u, 10), { wash: DH.red, ink: DH.ink, sw: sw * .5 });
      inkLine(P([[-1.4, hc - 2.0], [-.7, hc - 3.7]]), sw * .5, DH.redDk, 'inkfine', 0); inkLine(P([[1.4, hc - 2.0], [.7, hc - 3.7]]), sw * .5, DH.redDk, 'inkfine', 0);
      break;
    }
    case 'canhchuon': {   // quan văn: black hat with two wings
      paint(P([[-2.4, hc - .6], [-2.0, hc - 1.9], [-.9, hc - 2.7], [.9, hc - 2.7], [2.0, hc - 1.9], [2.4, hc - .6], [0, hc - .9]]), { wash: hcol || DH.ink, washOp: 255, curv: .3, ...ink(.8) });
      for (const s of [-1, 1]) paint(P([[s * 2.1, hc - 1.9], [s * 4.6, hc - 2.2], [s * 4.9, hc - 1.7], [s * 2.2, hc - 1.4]]), { wash: DH.indigoDk, washOp: 255, curv: .3, ...ink(.7) });
      break;
    }
    case 'mucoi': {   // bộ đội: pith helmet with a yellow star
      paint(P([[-3.1, hc - .6], [-2.8, hc - 2.0], [-1.7, hc - 3.1], [0, hc - 3.4], [1.7, hc - 3.1], [2.8, hc - 2.0], [3.1, hc - .6], [0, hc - 1.1]]), { wash: hcol || DH.green, washOp: 255, curv: .35, ...ink(.9) });
      paint(P([[-3.6, hc - .95], [3.6, hc - .95], [3.5, hc - .35], [-3.5, hc - .35]]), { wash: mixCol(hcol || DH.green, DH.ink, .2), washOp: 255, curv: .2, ...ink(.7) });
      paint(starPts(0, (hc - 1.9) * u, .6 * u, .4, 5), { wash: DH.yellow, washOp: 255, ink: DH.ink, sw: sw * .4 });
      break;
    }
    case 'cap': {     // French képi / soldier cap
      paint(P([[-2.7, hc - .5], [-2.4, hc - 2.0], [0, hc - 2.6], [2.4, hc - 2.0], [2.7, hc - .5], [0, hc - .9]]), { wash: hcol || DH.indigoDk, washOp: 255, curv: .3, ...ink(.8) });
      paint(P([[-2.7, hc - 1.2], [2.7, hc - 1.2], [2.65, hc - .55], [-2.65, hc - .55]]), { wash: DH.red, ink: null });
      paint(P([[-1.6, hc - .5], [3.1, hc - .35], [3.0, hc + .1], [-1.5, hc + .05]]), { wash: DH.ink, ink: null });
      break;
    }
    case 'phoc': {   // Lý-Trần quan văn: black cap with two flat wings (phốc đầu)
      paint(P([[-2.3, hc - .6], [-2.0, hc - 2.2], [-.9, hc - 3.0], [.9, hc - 3.0], [2.0, hc - 2.2], [2.3, hc - .6], [0, hc - .9]]), { wash: hcol || DH.ink, washOp: 255, curv: .3, ...ink(.8) });
      for (const s of [-1, 1]) paint(P([[s * 2.0, hc - 1.6], [s * 4.4, hc - 1.7], [s * 4.4, hc - 1.25], [s * 2.0, hc - 1.15]]), { wash: hcol || DH.ink, washOp: 255, ...ink(.6) });
      break;
    }
    case 'tuphuong': {   // tứ phương bình đính: flat square-topped cap, narrow at the top
      paint(P([[-2.5, hc - .5], [-1.8, hc - 2.9], [1.8, hc - 2.9], [2.5, hc - .5], [0, hc - .9]]), { wash: hcol || DH.brownDk, washOp: 255, curv: .12, ...ink(.8) });
      paint(P([[-2.55, hc - 1.0], [2.55, hc - 1.0], [2.5, hc - .45], [-2.5, hc - .45]]), { wash: DH.ink, washOp: 255, ink: null });
      break;
    }
    case 'casque': {   // French colonial pith helmet, white, with a small spike
      paint(P([[-3.2, hc - .5], [-2.9, hc - 2.2], [-1.6, hc - 3.4], [0, hc - 3.7], [1.6, hc - 3.4], [2.9, hc - 2.2], [3.2, hc - .5], [0, hc - 1.0]]), { wash: hcol || '#F2EFE6', washOp: 255, curv: .35, ...ink(.9) });
      paint(P([[-3.7, hc - .9], [3.7, hc - .9], [3.5, hc - .3], [-3.5, hc - .3]]), { wash: mixCol(hcol || '#F2EFE6', DH.ink, .08), washOp: 255, curv: .2, ...ink(.7) });
      paint(P([[-.15, hc - 3.7], [0, hc - 4.4], [.15, hc - 3.7]]), { wash: DH.gold, ink: null });
      break;
    }
    case 'thanh': {   // Qing official cap: round cone, red tassel fanned over it, button on top
      paint(P([[-2.7, hc - .5], [-2.3, hc - 1.9], [-.8, hc - 3.1], [.8, hc - 3.1], [2.3, hc - 1.9], [2.7, hc - .5], [0, hc - .9]]), { wash: hcol || DH.ink, washOp: 255, curv: .3, ...ink(.8) });
      for (let k = -3; k <= 3; k++) inkLine(P([[0, hc - 3.1], [k * .55, hc - 1.5]]), sw * .5, DH.red, 'inkfine', .3);
      paint(ellPts(0, (hc - 3.3) * u, .35 * u, .35 * u, 8), { wash: DH.red, ink: DH.ink, sw: sw * .4 });
      break;
    }
    case 'tienhien': {   // Han civil official: black cap with a tall back and two ear tabs
      paint(P([[-2.3, hc - .6], [-2.0, hc - 2.4], [-.9, hc - 3.4], [1.2, hc - 3.4], [2.0, hc - 2.4], [2.3, hc - .6], [0, hc - .9]]), { wash: hcol || DH.ink, washOp: 255, curv: .3, ...ink(.8) });
      for (const s of [-1, 1]) paint(P([[s * 2.1, hc - 2.0], [s * 2.8, hc - 3.2], [s * 3.0, hc - 1.2], [s * 2.2, hc - 1.0]]), { wash: hcol || DH.ink, washOp: 255, ...ink(.6) });
      break;
    }
    case 'wrap': {    // headband tied behind, a single band
      paint(P([[-2.6, hc - 1.0], [2.6, hc - 1.0], [2.55, hc - .35], [-2.55, hc - .35]]), { wash: hcol || DH.red, washOp: 255, ...ink(.6) });
      break;
    }
    case 'flower': {
      paint(P([[-2.6, hc - 1.0], [2.6, hc - 1.0], [2.55, hc - .45], [-2.55, hc - .45]]), { wash: DH.yellow, washOp: 255, ...ink(.6) });
      for (const s of [-1.4, 0, 1.4]) paint(starPts(s * u, (hc - 1.4) * u, .55 * u, .5, 5), { wash: DH.red, ink: DH.ink, sw: sw * .4 });
      break;
    }
  }
}

// ---------- held things ----------
// item(kind, handX, handY, u, sw, opts): drawn at the hand, around (0, 0). opts.tilt rotates it about the hand (radians).
function item(k, hx, hy, u, sw, o = {}) {
  push(); translate(hx, hy); if (o.tilt) rotate(o.tilt);
  const P = a => a.map(([px, py]) => [px * u, py * u]), t = o.t ?? T, ink = w => ({ ink: DH.ink, sw: sw * w });
  const pole = (y0, y1, w = .34, col = DH.brown) => paint(P([[-w / 2, y0], [w / 2, y0], [w / 2, y1], [-w / 2, y1]]), { wash: col, washOp: 255, ...ink(.6) });
  switch (k) {
    case 'staff': pole(2.6, -6.2); break;
    case 'spear':
      pole(2.8, -6.6, .3);
      paint(P([[-.38, -6.5], [0, -8.2], [.38, -6.5]]), { wash: DH.grey, washOp: 255, ...ink(.7) });
      paint(P([[-.4, -6.3], [.4, -6.3], [.35, -5.5], [-.35, -5.5]]), { wash: DH.red, washOp: 255, ink: null });
      break;
    case 'sword':
      paint(P([[-.28, -.6], [.28, -.6], [.2, -5.4], [0, -5.9], [-.2, -5.4]]), { wash: '#D9D9D6', washOp: 255, ...ink(.6) });
      paint(P([[-.9, -.7], [.9, -.7], [.9, -.35], [-.9, -.35]]), { wash: DH.gold, washOp: 255, ...ink(.6) });
      pole(.2, -.4, .38, DH.red);
      break;
    case 'flag': {
      const w = (o.w ?? 4.4), hgt = o.h ?? 2.8, top = o.top ?? -7;
      pole(2.8, top - .2, .32, DH.brownDk);
      const pts = [], n = 8; for (let i = 0; i <= n; i++) pts.push([.16 + i / n * w, top + Math.sin(t * 5 + i * .7) * .22 * (i / n) + 0]);
      for (let i = n; i >= 0; i--) pts.push([.16 + i / n * w, top + hgt + Math.sin(t * 5 + i * .7) * .22 * (i / n)]);
      paint(P(pts), { wash: o.col || DH.red, washOp: 255, ...ink(.8) });
      if (o.star) paint(starPts((.16 + w * .5) * u, (top + hgt / 2 + Math.sin(t * 5 + 3) * .1) * u, hgt * .34 * u, .4, 5), { wash: DH.yellow, washOp: 255, ink: DH.ink, sw: sw * .5 });
      if (o.mark) paint(ellPts((.16 + w * .5) * u, (top + hgt / 2) * u, hgt * .28 * u, hgt * .28 * u, 14), { wash: DH.yellow, washOp: 255, ink: DH.ink, sw: sw * .5 });
      break;
    }
    case 'torch': {
      pole(1.5, -2.4, .4, DH.brownDk);
      const fl = 1 + Math.sin(t * 17) * .08;
      glow(0, -3.3 * u, 4.2 * u, '#FFB347', .8);
      paint(P([[-.65, -2.3], [-.3, -3.8 * fl], [0, -4.8 * fl], [.35, -3.7 * fl], [.7, -2.3]]), { wash: DH.orange, washOp: 255, curv: .4, ...ink(.6) });
      paint(P([[-.3, -2.4], [0, -3.6 * fl], [.3, -2.4]]), { wash: DH.gold, washOp: 255, curv: .4, ink: null });
      break;
    }
    case 'brush': pole(1.2, -2.8, .22, DH.brownDk); paint(P([[-.22, -2.8], [0, -3.8], [.22, -2.8]]), { wash: DH.ink, washOp: 255, ink: null }); break;
    case 'scroll':
      if (o.open) paint(P([[-1.0, -.6], [1.0, -.6], [1.0, 3.8], [-1.0, 3.8]]), { wash: DH.white, washOp: 255, ...ink(.7) });
      paint(P([[-1.2, -.6], [1.2, -.6], [1.2, .2], [-1.2, .2]]), { wash: DH.white, washOp: 255, ...ink(.7) });
      for (const s of [-1.3, 1.3]) paint(ellPts(s * u, -.2 * u, .22 * u, .5 * u, 8), { wash: DH.red, ink: DH.ink, sw: sw * .4 });
      break;
    case 'paper':
      paint(P([[-1.3, -1.2], [1.3, -1.2], [1.3, 1.8], [-1.3, 1.8]]), { wash: DH.white, washOp: 255, ...ink(.7) });
      for (let i = 0; i < 5; i++) inkLine(P([[-.9, -.6 + i * .5], [.9, -.6 + i * .5]]), sw * .3, DH.greyDk, 'inkfine', 0);
      break;
    case 'bow': {
      const arcPts = []; for (let i = 0; i <= 8; i++) { const a = -1.1 + i / 8 * 2.2; arcPts.push([Math.cos(a) * 1.6 - .8, Math.sin(a) * 3.0]); }
      paint(ribbon(P(arcPts), .42 * u, .2 * u), { wash: DH.brown, washOp: 255, curv: .3, ...ink(.5) });
      inkLine(P([arcPts[0], arcPts[8]]), sw * .35, DH.ink, 'inkfine', 0);
      break;
    }
    case 'crossbow': {
      pole(2.2, -2.2, .4, DH.brownDk);
      paint(ribbon(P([[-2.8, -1.8], [0, -2.9], [2.8, -1.8]]), .45 * u, .3 * u), { wash: DH.brown, washOp: 255, curv: .4, ...ink(.5) });
      inkLine(P([[-2.8, -1.8], [0, -1.4], [2.8, -1.8]]), sw * .35, DH.ink, 'inkfine', 0);
      break;
    }
    case 'bowdrawn': {   // drawn longbow at full draw; hand = the bow grip, the string is pulled back to the other hand at (-pull, 0)
      const pull = o.pull ?? 3.3, arcPts = []; for (let i = 0; i <= 8; i++) { const a = -1.15 + i / 8 * 2.3; arcPts.push([Math.cos(a) * 1.5 - .7, Math.sin(a) * 3.1]); }
      paint(ribbon(P(arcPts), .42 * u, .2 * u), { wash: DH.brown, washOp: 255, curv: .3, ...ink(.5) });
      const top = arcPts[0], bot = arcPts[8];
      inkLine(P([top, [-pull, 0], bot]), sw * .3, DH.ink, 'inkfine', 0);
      if (o.nock ?? true) {
        inkLine(P([[-pull, 0], [1.4, 0]]), sw * .45, DH.brownDk, 'ink', 0);
        paint(P([[1.2, -.28], [1.9, 0], [1.2, .28]]), { wash: DH.grey, washOp: 255, ink: null });
      }
      break;
    }
    case 'crossbowaim': {   // nỏ: stock on the line of both hands, limb across the front, bolt laid in the groove
      const pull = o.pull ?? 3.3;
      paint(P([[-pull - .3, -.2], [2.8, -.2], [2.8, .3], [-pull - .3, .3]]), { wash: DH.brownDk, washOp: 255, ...ink(.6) });
      const limb = []; for (let i = 0; i <= 8; i++) { const a = -1.2 + i / 8 * 2.4; limb.push([2.0 + Math.cos(a) * .9 - .45, Math.sin(a) * 3.0]); }
      paint(ribbon(P(limb), .4 * u, .22 * u), { wash: DH.brown, washOp: 255, curv: .3, ...ink(.5) });
      inkLine(P([limb[0], [.2, -.1], limb[8]]), sw * .3, DH.ink, 'inkfine', 0);
      if (o.nock ?? true) {
        inkLine(P([[.2, -.35], [3.2, -.35]]), sw * .45, DH.ink, 'ink', 0);
        paint(P([[3.0, -.65], [3.7, -.35], [3.0, -.05]]), { wash: DH.grey, washOp: 255, ink: null });
      }
      break;
    }
    case 'axe': pole(1.6, -2.6, .3); paint(P([[-.1, -2.5], [1.4, -2.9], [1.5, -1.5], [-.1, -1.8]]), { wash: DH.stone, washOp: 255, ...ink(.7) }); break;
    case 'orange': paint(ellPts(0, -.4 * u, .85 * u, .85 * u, 14), { wash: DH.orange, washOp: 255, ...ink(.8) }); paint(P([[0, -1.3], [.7, -1.7], [.5, -1.1]]), { wash: DH.green, ink: null }); break;
    case 'rifle': pole(1.8, -3.6, .3, DH.brownDk); paint(P([[-.15, -3.6], [.15, -3.6], [.15, -6.4], [-.15, -6.4]]), { wash: DH.greyDk, washOp: 255, ink: null }); break;
    case 'bundle': {   // tay nải on a stick over the shoulder
      pole(2.4, -3.8, .3);
      paint(ellPts(0, -4.6 * u, 1.3 * u, 1.1 * u, 14), { wash: o.col || DH.red, washOp: 255, ...ink(.8) });
      break;
    }
    case 'bowl': paint(P([[-.8, -.5], [.8, -.5], [.55, .2], [-.55, .2]]), { wash: DH.white, washOp: 255, curv: .3, ...ink(.7) }); break;
    case 'sheaf': {   // bó lúa
      for (let i = -2; i <= 2; i++) inkLine(P([[i * .22, 0], [i * .5, -2.4]]), sw * 1.6, DH.yellow, 'ink', .3);
      paint(P([[-.6, -.9], [.6, -.9], [.6, -.5], [-.6, -.5]]), { wash: DH.red, ink: null });
      break;
    }
    case 'cup': paint(P([[-.5, -.6], [.5, -.6], [.35, .2], [-.35, .2]]), { wash: DH.yellow, washOp: 255, ...ink(.6) }); break;
    case 'fan': pole(1.4, -1.6, .22, DH.brownDk); paint(ellPts(0, -2.4 * u, 1.1 * u, 1.0 * u, 14), { wash: DH.yellow, washOp: 255, ...ink(.7) }); break;
    case 'fist': break;
  }
  pop();
}

// ---------- the cast ----------
// Spread into nguoi() with { who: 'name' }. Colours follow Đông Hồ prints: red, yellow, indigo, green, black on warm paper.
const CAST = {
  // people of the stone and bronze ages
  caveman: { skin: 'tan', hair: 'short', outfit: { kind: 'fur', col: DH.brown }, barefoot: true, mouth: 'smile' },
  cavewoman: { skin: 'tan', hair: 'long', outfit: { kind: 'fur', col: DH.brown }, barefoot: true, mouth: 'smile' },
  farmer: { skin: 'tan', hair: 'short', hat: 'nonla', outfit: { kind: 'tunic', col: DH.brown, col2: DH.brownDk, pants: DH.brownDk }, barefoot: true },
  farmerW: { skin: 'tan', hair: 'long', hat: 'nonla', outfit: { kind: 'skirt', col: DH.brownDk, col2: DH.yellow, top: DH.brown }, barefoot: true },
  smith: { skin: 'tan', hair: 'short', hat: 'wrap', hatCol: DH.red, outfit: { kind: 'bare', col: DH.brownDk }, barefoot: true },
  chieftain: { skin: 'tan', hair: 'short', hat: 'feather', beard: 'thin', outfit: { kind: 'fur', col: DH.brownDk, tattoo: '#2A3F5F', necklace: '#1E8A7A', fringe: [DH.red, '#1E8A7A', DH.yellow] }, barefoot: true },
  // legendary and ancient rulers
  hung: { skin: 'fair', hair: 'short', hat: 'feather', beard: 'thin', outfit: { kind: 'robe', col: '#B5342A', col2: '#C8963E', necklace: '#1E8A7A', tattoo: '#2A3F5F' }, barefoot: true },
  auco: { skin: 'fair', hair: 'long', hat: 'flower', outfit: { kind: 'skirt', col: '#A8432A', col2: '#C8963E', top: '#C9A66B', necklace: '#1E8A7A' }, barefoot: true },
  lacLong: { skin: 'fair', hair: 'long', beard: 'thin', hat: 'feather', outfit: { kind: 'robe', col: '#1E8A7A', col2: '#C8963E', necklace: DH.red, tattoo: '#2A3F5F' }, barefoot: true },
  anDuong: { skin: 'fair', hair: 'short', hat: 'wrap', hatCol: '#C8963E', beard: 'goat', outfit: { kind: 'robe', col: '#2A3340', col2: '#C8963E', collar: 'cross', necklace: '#C8963E' } },
  // soldiers
  soldier: { skin: 'tan', hair: 'short', hat: 'helmet', outfit: { kind: 'armor', col: DH.indigo, col2: DH.grey }, holdR: 'spear' },
  king: { skin: 'fair', hair: 'short', hat: 'crown', beard: 'thin', outfit: { kind: 'robe', col: '#E8B923', col2: '#C8102E', collar: 'cross' } },
  mandarin: { skin: 'fair', hair: 'short', hat: 'phoc', hatCol: '#1A1A1A', beard: 'thin', outfit: { kind: 'robe', col: '#6A2C70', col2: '#C8963E', collar: 'cross', patch: '#C8963E' } },
  // chapter 3-4: women leaders, northern officials, early emperors
  trungTrac: { skin: 'fair', hair: 'long', hat: 'wrap', hatCol: '#E8B923', outfit: { kind: 'armor', col: '#E8B923', col2: '#C8102E' } },
  trungNhi: { skin: 'fair', hair: 'long', hat: 'wrap', hatCol: '#C8102E', outfit: { kind: 'armor', col: '#C8102E', col2: '#E8B923' } },
  baTrieu: { skin: 'fair', hair: 'long', hat: 'khan', hatCol: '#E8B923', outfit: { kind: 'tunic', col: '#E8B923', col2: '#A8432A', pants: '#A8432A' } },
  hanOfficial: { skin: 'pale', hair: 'short', hat: 'tienhien', hatCol: '#1C1C1C', beard: 'long', outfit: { kind: 'robe', col: '#8C1C13', col2: '#C8963E', collar: 'cross' } },
  hanGeneral: { skin: 'pale', hair: 'short', hat: 'helmet', hatCol: '#1C1C1C', beard: 'goat', outfit: { kind: 'armor', col: '#1C1C1C', col2: '#B87333', scale: true } },
  lyBi: { skin: 'fair', hair: 'short', hat: 'khandong', hatCol: DH.ink, beard: 'thin', outfit: { kind: 'robe', col: DH.brownDk, col2: '#E8B923', collar: 'cross' } },
  ngoQuyen: { skin: 'tan', hair: 'short', hat: 'tuphuong', hatCol: DH.brownDk, beard: 'thin', outfit: { kind: 'armor', col: '#7A5230', col2: '#C8963E' } },
  dinhBoLinh: { skin: 'tan', hair: 'short', hat: 'crown', beard: 'goat', outfit: { kind: 'robe', col: '#A81C2B', col2: '#E8B923', collar: 'cross' } },
  leHoan: { skin: 'tan', hair: 'short', hat: 'tuphuong', hatCol: DH.brownDk, beard: 'goat', outfit: { kind: 'armor', col: '#7A5230', col2: '#A81C2B' } },
  // chapter 5-6: Lý and Trần
  lyCongUan: { skin: 'fair', hair: 'none', outfit: { kind: 'robe', col: DH.brown, col2: DH.brownDk }, barefoot: true, mouth: 'smile' },
  lyThuongKiet: { skin: 'tan', hair: 'short', hat: 'helmet', hatCol: '#6B7078', beard: 'goat', outfit: { kind: 'armor', col: '#8C919A', col2: '#C8963E' } },
  songSoldier: { skin: 'pale', hair: 'short', hat: 'helmet', hatCol: '#6B7078', outfit: { kind: 'armor', col: '#6B7078', col2: '#8C1C13', scale: true }, holdR: 'spear' },
  thayDo: { skin: 'fair', hair: 'short', hat: 'khandong', beard: 'long', outfit: { kind: 'robe', col: DH.brownDk, col2: DH.brown } },
  tranNhanTong: { skin: 'fair', hair: 'short', hat: 'khandong', hatCol: '#2A2A2A', beard: 'thin', outfit: { kind: 'robe', col: '#E8B923', col2: '#A81C2B', collar: 'cross' } },
  elder: { skin: 'tan', hair: 'white', beard: 'long', hat: 'khan', hatCol: '#1A1A1A', outfit: { kind: 'robe', col: '#222222', col2: '#555555', collar: 'cross' }, barefoot: true },
  hungDao: { skin: 'fair', hair: 'short', hat: 'khandong', hatCol: '#1A1A1A', beard: 'thin', outfit: { kind: 'robe', col: '#6A2C70', col2: '#C8963E', collar: 'cross', patch: '#C8963E' } },
  quocToan: { skin: 'fair', hair: 'short', hat: 'tuphuong', hatCol: '#2F5DA8', outfit: { kind: 'tunic', col: '#2F5DA8', col2: '#F4F1E6', pants: DH.brownDk } },
  binhTrong: { skin: 'tan', hair: 'short', hat: 'tuphuong', hatCol: DH.brownDk, beard: 'moustache', outfit: { kind: 'bare', col: DH.brownDk }, barefoot: true },
  mongol: { skin: 'tan', hair: 'short', hat: 'helmet', hatCol: '#6A4A2A', beard: 'moustache', outfit: { kind: 'fur', col: '#7A4E2A' } },
  // chapter 7: Lam Sơn
  leLoi: { skin: 'tan', hair: 'short', hat: 'khan', hatCol: DH.ink, beard: 'goat', outfit: { kind: 'armor', col: '#7A5230', col2: '#C8963E' } },
  leThan: { skin: 'tan', hair: 'short', hat: 'nonla', outfit: { kind: 'tunic', col: DH.indigoDk, col2: DH.indigo, pants: DH.brownDk }, barefoot: true },
  leLai: { skin: 'tan', hair: 'short', hat: 'helmet', hatCol: DH.gold, beard: 'moustache', outfit: { kind: 'robe', col: DH.yellow, col2: DH.red } },
  nguyenTrai: { skin: 'fair', hair: 'short', hat: 'canhchuon', hatCol: '#1A1A1A', beard: 'thin', outfit: { kind: 'robe', col: '#2F5DA8', col2: '#F4F1E6', collar: 'cross', patch: '#E8B923' } },
  minhSoldier: { skin: 'pale', hair: 'short', hat: 'helmet', hatCol: '#5A2A2A', outfit: { kind: 'armor', col: '#B3202A', col2: '#8C8C8C', scale: true }, holdR: 'spear' },
  // chapter 8: Tây Sơn
  chuaTrinh: { skin: 'fair', hair: 'short', hat: 'tuphuong', hatCol: '#2A2A2A', beard: 'thin', outfit: { kind: 'robe', col: '#2A2A2A', col2: '#E8B923', collar: 'cross' } },
  chuaNguyen: { skin: 'fair', hair: 'short', hat: 'khandong', hatCol: '#1A1A1A', beard: 'thin', outfit: { kind: 'robe', col: '#C8352B', col2: '#E8B923', collar: 'cross' } },
  nguyenNhac: { skin: 'tan', hair: 'short', hat: 'khan', hatCol: DH.brownDk, beard: 'moustache', outfit: { kind: 'tunic', col: DH.brown, col2: DH.brownDk, pants: DH.brownDk } },
  nguyenHue: { skin: 'tan', hair: 'short', hat: 'khan', hatCol: '#C8102E', beard: 'moustache', outfit: { kind: 'armor', col: '#8E1B3A', col2: '#C8102E' } },
  nguyenLu: { skin: 'tan', hair: 'short', hat: 'khan', hatCol: DH.green, outfit: { kind: 'tunic', col: DH.green, col2: DH.greenDk, pants: DH.brownDk } },
  thanhGeneral: { skin: 'pale', hair: 'short', hat: 'thanh', hatCol: '#1F3A5F', beard: 'moustache', outfit: { kind: 'robe', col: '#1F3A5F', col2: '#C8963E', collar: 'cross', patch: '#E8B923' } },
  // chapter 9-10: Nguyễn dynasty, French, modern figures
  nguyenAnh: { skin: 'tan', hair: 'short', hat: 'helmet', hatCol: DH.gold, beard: 'moustache', outfit: { kind: 'armor', col: DH.red, col2: DH.gold } },
  giaLong: { skin: 'fair', hair: 'short', hat: 'crown', beard: 'moustache', outfit: { kind: 'robe', col: '#F2B705', col2: '#A81C2B', collar: 'cross' } },
  hamNghi: { skin: 'fair', hair: 'short', hat: 'crown', outfit: { kind: 'robe', col: '#F2B705', col2: '#A81C2B', collar: 'cross' } },
  french: { skin: 'pale', hair: 'short', hat: 'casque', hatCol: '#F2EFE6', beard: 'moustache', outfit: { kind: 'suit', col: '#F2EFE6', col2: DH.greyDk } },
  frenchSoldier: { skin: 'pale', hair: 'short', hat: 'cap', hatCol: '#1F2F5A', outfit: { kind: 'uniform', col: '#1F2F5A', col2: '#C8963E' }, holdR: 'rifle' },
  phanBoiChau: { skin: 'fair', hair: 'short', hat: 'khandong', beard: 'long', outfit: { kind: 'robe', col: DH.brownDk, col2: DH.brown } },
  phanChauTrinh: { skin: 'fair', hair: 'short', beard: 'moustache', outfit: { kind: 'suit', col: '#2A2A2A', col2: DH.white } },
  nguyenTatThanh: { skin: 'tan', hair: 'short', hat: 'cap', hatCol: DH.brownDk, outfit: { kind: 'tunic', col: '#7A8A9A', col2: DH.greyDk, pants: DH.brownDk } },
  hoChiMinh: { skin: 'tan', hair: 'white', beard: 'goat', outfit: { kind: 'uniform', col: '#D9C98B', col2: '#B8A670', collar: 'mao' } },
  cadre: { skin: 'tan', hair: 'short', outfit: { kind: 'suit', col: DH.indigoDk, col2: DH.white } },
  giap: { skin: 'tan', hair: 'short', hat: 'cap', hatCol: '#7A8A5A', outfit: { kind: 'uniform', col: '#7A8A5A', col2: '#5A6A3A' }, mouth: 'flat' },
  deCastries: { skin: 'pale', hair: 'short', hat: 'cap', hatCol: '#F2EFE6', beard: 'moustache', outfit: { kind: 'uniform', col: '#F2EFE6', col2: DH.gold } },
  bodoi: { skin: 'tan', hair: 'short', hat: 'mucoi', outfit: { kind: 'uniform', col: '#6A8A4A', col2: '#4A6A2A' }, holdR: 'rifle' },
  boy: { skin: 'tan', hair: 'short', outfit: { kind: 'tunic', col: DH.brown, col2: DH.brownDk, pants: DH.brownDk }, barefoot: true }
};
