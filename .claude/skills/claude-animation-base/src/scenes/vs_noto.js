// vs_noto.js: chibi animals traced from Noto Emoji (Apache 2.0, see vs_noto_data.js) and painted like the Subaru trace: flat colour
// regions inside one thick dark outline, boiling a little. They replace vsElephant / vsHorse / vsBuffalo / vsTurtle / vsWhale /
// vsDragon with the SAME signatures; elephant and horse are scaled so the scenes' rider seats (documented in vs_animals.js) still
// land on their backs. The emoji cannot move their legs, so a walk is a bounce and a rock, a gallop a bigger one.
const NOTO_HUE = c => { const r = red(c) / 255, g = green(c) / 255, b = blue(c) / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0; if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return [(h * 60 + 360) % 360, mx ? d / mx : 0, mx]; };
// recolour the emoji's greens toward a target colour (the Lý gold dragon, Thủy Tinh's water dragon), keeping each shade's lightness
function notoTint(hex, target) {
  if (!target) return hex;
  const [h, s, v] = NOTO_HUE(color(hex)); if (h < 60 || h > 175 || s < .25) return hex;
  const [th, ts] = NOTO_HUE(color(target)); push(); colorMode(HSB, 360, 1, 1); const c = color(th, Math.min(1, ts * .9 + s * .1), Math.min(1, v * 1.3 + .05)); pop();
  return c.toString('#rrggbb');
}
// paint one traced animal: (ax, ay) = screen point of grid point (gx, gy), k = px per grid cell, mirrored when dir < 0
function notoPaint(name, ax, ay, gx, gy, k, o = {}) {
  const A = NOTO_DATA[name], dir = o.dir ?? 1, warp = o.warp;
  flushBrush();
  push(); translate(ax, ay); if (o.rot) rotate(o.rot); scale(dir * (1 + (o.sq || 0) * .5), 1 - (o.sq || 0));
  const D = dollPen(0, 0, k, clamp(1.9 * k, 2.4, 7)), pts = flat => { const p = []; for (let i = 0; i < flat.length; i += 2) { let px = flat[i] - gx, py = flat[i + 1] - gy; if (warp) [px, py] = warp(px, py); p.push([px, py]); } return p; };
  D.shape(pts(A.sil), DOLL.ink);
  for (const [col, flat] of A.regs) D.shape(pts(flat), notoTint(col, o.tint), false);
  pop();
}
const notoTop = (A, f) => { const c = Math.round(lerp(A.x0, A.x1, f)); return A.top[c] ?? A.y0; };
function notoGait(t, walk, amt) { if (walk == null) return { dy: 0, rot: 0, sq: 0 }; const p = walk * TAU; return { dy: -Math.abs(Math.sin(p)) * amt, rot: Math.sin(p) * .035 * amt / 8, sq: .03 * Math.cos(2 * p) }; }
// seat: rider feet at (x + sx * s, y - sy * s) over column f of the emoji's width. The back rises `over` above the seat, so the
// chibi animal is big enough for a big-headed rider and the rider's legs hang over its side, as a seated rider's do.
function notoRidden(name, x, y, s, o, sx, sy, f, amt, over = 1.32) {
  const A = NOTO_DATA[name], seatTop = notoTop(A, f), k = over * sy * s / (A.y1 - seatTop), dir = o.dir ?? 1, gx = lerp(A.x0, A.x1, f);
  const g = notoGait(o.t ?? T, o.walk ?? o.gallop, amt);
  push(); noStroke(); fill(DOLL.shadow); ellipse(x, y + 3, (A.x1 - A.x0) * k * .8, 18 * k / 3); pop();
  notoPaint(name, x + dir * sx * s, y + g.dy * k, gx, A.y1, k, { dir, rot: g.rot, sq: g.sq });
}
function ntElephant(x, y, s, o = {}) { notoRidden('elephant', x, y, s, o, -.1, 1.6, .55, 5); }
function ntHorse(x, y, s, o = {}) { notoRidden('horse', x, y, s, o, -.05, 1.36, .5, 9); }
function ntBuffalo(x, y, s, o = {}) {
  const A = NOTO_DATA.buffalo, k = 1.9 * s / (A.x1 - A.x0), g = notoGait(o.t ?? T, o.walk, 4);
  push(); noStroke(); fill(DOLL.shadow); ellipse(x, y + 3, 1.6 * s, .2 * s); pop();
  notoPaint('buffalo', x, y + g.dy * k, (A.x0 + A.x1) / 2, A.y1, k, { dir: o.dir ?? 1, rot: g.rot, sq: g.sq });
}
function ntTurtle(x, y, s, o = {}) {
  const A = NOTO_DATA.turtle, t = o.t ?? T, k = 2.4 * s / (A.x1 - A.x0);
  glow(x, y - s * .3, s * 2.2, '#FFE38A', o.glow ?? .45);
  notoPaint('turtle', x, y + Math.sin(t * 1.8) * s * .04, (A.x0 + A.x1) / 2, A.y1, k, { dir: o.dir ?? 1, rot: Math.sin(t * 1.3) * .03, tint: o.col || DH.gold });
}
function ntWhale(x, y, s, t, o = {}) {
  const A = NOTO_DATA.whale, k = 2.3 * s / (A.x1 - A.x0);
  notoPaint('whale', x, y + Math.sin(t * 2) * s * .04, (A.x0 + A.x1) / 2, (A.y0 + A.y1) / 2 + (A.y1 - A.y0) * .15, k, { dir: o.dir ?? 1, rot: Math.sin(t * 1.4) * .05, tint: o.col });
}
// the dragon coils upright; it swims by a travelling wave across its height and floats up by o.rise; gold unless o.col says otherwise
function ntDragon(x, y, s, o = {}) {
  const A = NOTO_DATA.dragon, t = o.t ?? T, h = s * 1.7 * Math.min(1.2, (o.span ?? 2.2) / 1.8), k = h / (A.y1 - A.y0), cy = (A.y0 + A.y1) / 2;
  const warp = (px, py) => [px + Math.sin(py * .09 - t * 3) * 3.2 * (1 - (py + 64) / 140), py];
  // o.rise 0..1 carries it all the way up into the sky (1.35 s above its start), not just off the ground
  const up = (o.rise ?? 0) * s * 1.35;
  glow(x, y - up, s * .9, '#FFF1C4', .25);
  notoPaint('dragon', x, y - up + Math.sin(t * 1.6) * s * .04, (A.x0 + A.x1) / 2, cy, k, { dir: o.dir ?? 1, warp, rot: Math.sin(t * 1.1) * .04, tint: o.col || DH.gold });
}
if (!location.search.includes('brushcast')) {
  vsElephant = ntElephant; vsHorse = ntHorse; vsBuffalo = ntBuffalo; vsTurtle = ntTurtle; vsWhale = ntWhale; vsDragon = ntDragon;
}
