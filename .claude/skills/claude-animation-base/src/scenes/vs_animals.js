// vs_animals.js: animals and crowds for "Việt sử". Animals face right (dir -1 mirrors); (x, y) is the ground under the body.
// Riders: draw the animal, then nguoi() at the seat point each function documents, with its feet on that point.

// Elephant. s = body unit (the body is ~2s long, ~1.6s tall with legs). walk = gait phase in cycles. Rider seat (feet): (x - .1 s, y - 1.6 s), noShadow.
function vsElephant(x, y, s, o = {}) {
  boilSeed(`elephant ${o.key ?? 0}`);
  const t = o.t ?? T, walk = o.walk, grey = o.col || '#9A948A', dk = mixCol(grey, DH.ink, .35);
  vsFlip(x, o.dir ?? 1, () => {
    const legX = [-.62, -.3, .38, .7];
    legX.forEach((lx, i) => {
      const ph = walk == null ? 0 : Math.sin((walk + (i % 2 ? .5 : 0)) * TAU), lift = walk == null ? 0 : Math.max(0, ph) * .18 * s;
      paint(rrPts(x + lx * s - s * .16 + ph * s * .08, y - s * .78, s * .32, s * .78 - lift, s * .1), { wash: i === 1 || i === 3 ? dk : grey, washOp: 255, ink: DH.ink, sw: 1.3 });
    });
    paint(ellPts(x, y - s * .98, s * 1.02, s * .72, 26, 2), { wash: grey, washOp: 255, fill: DH.ink, fillOp: 35, bleed: .3, ink: DH.ink, sw: 1.7 });
    const bx = x + s * 1.08, by = y - s * 1.2;
    paint(ellPts(bx - s * .22, by + s * .05, s * .36, s * .5, 16), { wash: dk, washOp: 255, ink: DH.ink, sw: 1.3 });
    paint(ellPts(bx, by, s * .5, s * .5, 20, 1), { wash: grey, washOp: 255, ink: DH.ink, sw: 1.6 });
    const sway = Math.sin(t * 2.2) * s * .08;
    paint(ribbon([[bx + s * .3, by + s * .15], [bx + s * .62 + sway, by + s * .6], [bx + s * .5 + sway, by + s * 1.0], [bx + s * .62 + sway * 1.3, by + s * 1.2]], s * .36, s * .16), { wash: grey, washOp: 255, curv: .4, ink: DH.ink, sw: 1.5 });
    paint(ribbon([[bx + s * .26, by + s * .3], [bx + s * .7, by + s * .5], [bx + s * .78, by + s * .24]], s * .13, s * .04), { wash: '#FFF7E6', washOp: 255, curv: .4, ink: DH.ink, sw: 1 });
    paint(ellPts(bx + s * .14, by - s * .12, s * .06, s * .08, 8), { wash: DH.ink, ink: null });
    inkLine([[x - s * .98, y - s * 1.1], [x - s * 1.1, y - s * .7 + Math.sin(t * 3) * 4], [x - s * 1.05, y - s * .45]], 3, dk, 'ink', .4);
    paint([[x - s * .62, y - s * 1.62], [x + s * .58, y - s * 1.62], [x + s * .7, y - s * 1.2], [x - s * .72, y - s * 1.2]], { wash: o.cloth || DH.red, washOp: 255, ink: DH.ink, sw: 1.2, curv: .2 });
    paint([[x - s * .62, y - s * 1.28], [x + s * .6, y - s * 1.28], [x + s * .72, y - s * 1.2], [x - s * .74, y - s * 1.2]], { wash: DH.gold, washOp: 255, ink: null });
  });
}

// Horse. s = body unit (~1.8s long). gallop = gait phase. Rider seat (feet): (x - .05 s, y - 1.36 s), noShadow.
function vsHorse(x, y, s, o = {}) {
  boilSeed(`horse ${o.key ?? 0}`);
  const t = o.t ?? T, g = o.gallop, col = o.col || '#E8E0D0', dk = mixCol(col, DH.ink, .4), mane = o.mane || DH.ink;
  vsFlip(x, o.dir ?? 1, () => {
    const legs = [[-.6, 0], [-.4, .5], [.5, .25], [.7, .75]];
    legs.forEach(([lx, ph0], i) => {
      const a = g == null ? 0 : Math.sin((g + ph0) * TAU) * .6, lift = g == null ? 0 : Math.max(0, Math.cos((g + ph0) * TAU)) * .2 * s;
      const hipX = x + lx * s, hipY = y - s * .85, fx = hipX + Math.sin(a) * s * .5, fy = y - lift;
      paint(ribbon([[hipX, hipY], [(hipX + fx) / 2 + (lx > 0 ? s * .05 : -s * .05), (hipY + fy) / 2], [fx, fy]], s * .24, s * .13), { wash: i % 2 ? dk : col, washOp: 255, ink: DH.ink, sw: 1.2, curv: .3 });
      paint(ellPts(fx + s * .02, fy - s * .02, s * .1, s * .06, 8), { wash: DH.ink, ink: null });
    });
    paint(ellPts(x, y - s * 1.0, s * .88, s * .4, 22, 1.5), { wash: col, washOp: 255, fill: DH.ink, fillOp: 30, ink: DH.ink, sw: 1.5 });
    paint(ribbon([[x + s * .55, y - s * 1.1], [x + s * .9, y - s * 1.5], [x + s * 1.05, y - s * 1.88]], s * .7, s * .38), { wash: col, washOp: 255, curv: .3, ink: DH.ink, sw: 1.4 });
    paint([[x + s * .86, y - s * 2.02], [x + s * 1.3, y - s * 2.02], [x + s * 1.66, y - s * 1.72], [x + s * 1.64, y - s * 1.56], [x + s * 1.22, y - s * 1.64], [x + s * 1.0, y - s * 1.72]], { wash: col, washOp: 255, curv: .35, ink: DH.ink, sw: 1.4 });
    paint(ellPts(x + s * 1.22, y - s * 1.88, s * .04, s * .05, 6), { wash: DH.ink, ink: null });
    paint([[x + s * .92, y - s * 2.0], [x + s * .96, y - s * 2.24], [x + s * 1.06, y - s * 2.0]], { wash: col, washOp: 255, ink: DH.ink, sw: .8 });
    const mw = Math.sin(t * 6) * s * .03;
    paint(ribbon([[x + s * .88, y - s * 2.0], [x + s * .66 + mw, y - s * 1.7], [x + s * .5 + mw, y - s * 1.2]], s * .2, s * .1), { wash: mane, washOp: 255, curv: .3, ink: null });
    paint(ribbon([[x - s * .86, y - s * 1.02], [x - s * 1.18 + mw * 2, y - s * .8], [x - s * 1.2 + mw * 2, y - s * .3]], s * .16, s * .06), { wash: mane, washOp: 255, curv: .4, ink: null });
    paint([[x - s * .3, y - s * 1.36], [x + s * .3, y - s * 1.36], [x + s * .34, y - s * 1.12], [x - s * .34, y - s * 1.12]], { wash: o.cloth || DH.red, washOp: 255, ink: DH.ink, sw: 1, curv: .2 });
  });
}

function vsBuffalo(x, y, s, o = {}) {   // trâu: dark, heavy, horns swept back; head low
  boilSeed(`buffalo ${o.key ?? 0}`);
  const t = o.t ?? T, col = o.col || '#5D5560', walk = o.walk;
  vsFlip(x, o.dir ?? 1, () => {
    [-.5, -.22, .3, .56].forEach((lx, i) => { const ph = walk == null ? 0 : Math.sin((walk + (i % 2 ? .5 : 0)) * TAU) * s * .07; paint(rrPts(x + lx * s - s * .09 + ph, y - s * .6, s * .18, s * .6, s * .05), { wash: i % 2 ? mixCol(col, DH.ink, .3) : col, washOp: 255, ink: DH.ink, sw: 1.2 }); });
    paint(ellPts(x, y - s * .75, s * .78, s * .42, 22, 1.5), { wash: col, washOp: 255, fill: DH.ink, fillOp: 30, ink: DH.ink, sw: 1.5 });
    const hx = x + s * .78, hy = y - s * .66;
    paint(ellPts(hx, hy, s * .3, s * .26, 14), { wash: col, washOp: 255, ink: DH.ink, sw: 1.4 });
    paint(ellPts(hx + s * .22, hy + s * .1, s * .15, s * .12, 10), { wash: '#8A7B80', washOp: 255, ink: DH.ink, sw: .9 });
    paint(ribbon([[hx - s * .05, hy - s * .2], [hx - s * .4, hy - s * .45], [hx - s * .6, hy - s * .3]], s * .1, s * .03), { wash: '#E8E0D0', washOp: 255, curv: .4, ink: DH.ink, sw: .9 });
    paint(ellPts(hx + s * .06, hy - s * .06, s * .035, s * .04, 6), { wash: DH.ink, ink: null });
    inkLine([[x - s * .78, y - s * .8], [x - s * .92, y - s * .5 + Math.sin(t * 3) * 3], [x - s * .88, y - s * .25]], 2.4, DH.ink, 'ink', .4);
  });
}

// Golden turtle (Kim Quy). s = shell half-width. Swims in place with a gentle bob; head toward +x.
function vsTurtle(x, y, s, o = {}) {
  boilSeed(`turtle ${o.key ?? 0}`);
  const t = o.t ?? T, bob = Math.sin(t * 1.8) * s * .04, col = o.col || DH.gold, dk = mixCol(col, DH.brownDk, .5);
  glow(x, y - s * .3, s * 2.2, '#FFE38A', o.glow ?? .45);
  vsFlip(x, o.dir ?? 1, () => {
    for (const [fx, fy] of [[-.55, -.1], [.45, -.1]]) paint(ellPts(x + fx * s + Math.sin(t * 3 + fx) * s * .05, y + fy * s + bob, s * .3, s * .12, 10, 0, .3), { wash: col, washOp: 255, ink: DH.ink, sw: 1.1 });
    paint(ellPts(x + s * 1.05, y - s * .16 + bob, s * .3, s * .22, 14), { wash: col, washOp: 255, ink: DH.ink, sw: 1.4 });
    paint(ellPts(x + s * 1.14, y - s * .2 + bob, s * .035, s * .045, 6), { wash: DH.ink, ink: null });
    { const dome = []; for (let i = 0; i <= 14; i++) { const a = Math.PI * i / 14; dome.push([x + Math.cos(a) * s * .92, y - Math.sin(a) * s * .82 + bob]); } paint(dome, { wash: col, washOp: 255, fill: DH.red, fillOp: 50, bleed: .3, ink: DH.ink, sw: 1.8 }); }
    for (const [hx, hy] of [[-.4, -.35], [0, -.5], [.4, -.35], [-.2, -.2], [.2, -.2]]) paint(ellPts(x + hx * s, y + hy * s + bob, s * .13, s * .1, 6), { ink: DH.ink, sw: .9, fill: dk, fillOp: 70 });
  });
}

function vsBird(x, y, s, t, o = {}) {   // a flapping bird: two bent wings
  boilSeed(`bird ${o.key ?? Math.round(x / 30)}`);
  const f = Math.sin(t * 9 + (o.ph || 0)) * s * .55;
  inkLine([[x - s, y + f * .5], [x - s * .35, y - f * .3 - s * .12], [x, y], [x + s * .35, y - f * .3 - s * .12], [x + s, y + f * .5]], 2.2, o.col || DH.ink, 'ink', .5);
}
function vsBirds(x, y, n, s, t, o = {}) {   // a loose flock drifting right
  for (let i = 0; i < n; i++) vsBird(x + (hash(i) - .5) * s * 14 + ((t * (o.speed ?? 40)) % 40), y + (hash(i + 9) - .5) * s * 5, s * (.7 + hash(i + 2) * .6), t, { ph: i * 1.7, col: o.col, key: `b${i}` });
}

// ---------- crowds ----------
// A cheap figure for crowds and armies: round head, little body, optional hat and spear. (x, y) = feet.
function vsMini(x, y, u, o = {}) {
  boilSeed(`mini ${o.key ?? Math.round(x / 20)} ${Math.round(y / 20)}`);
  const bob = (o.bob ?? 1) * Math.abs(Math.sin((o.t ?? T) * 5 + (o.ph || 0))) * u * .25 * (o.moving ? 1 : 0), cheer = o.cheer ?? 0, col = o.col || DH.indigo, skin = o.skin || SKIN.fair;
  const yy = y - bob, dir = o.dir ?? 1;
  paint(ellPts(x, y + u * .05, u * 1.5, u * .3, 12), { fill: DH.ink, fillOp: 60, bleed: .3, ink: null });
  paint(rectPts(x - u * .65, yy - u * 1.1, u * .5, u * 1.1), { wash: o.pants || DH.brownDk, washOp: 255, ink: DH.ink, sw: .6 });
  paint(rectPts(x + u * .15, yy - u * 1.1, u * .5, u * 1.1), { wash: o.pants || DH.brownDk, washOp: 255, ink: DH.ink, sw: .6 });
  paint([[x - u * 1.2, yy - u * 3.2], [x - u * 1.4, yy - u * 1.0], [x + u * 1.4, yy - u * 1.0], [x + u * 1.2, yy - u * 3.2]], { wash: col, washOp: 255, ink: DH.ink, sw: .8 });
  if (o.trim) paint(rectPts(x - u * 1.3, yy - u * 1.5, u * 2.6, u * .4), { wash: o.trim, washOp: 255, ink: null });
  const hand = (side, up) => { const hx = x + side * u * (1.5 + up * .3), hy = yy - u * (2.4 + up * 1.8); inkLine([[x + side * u * 1.1, yy - u * 2.8], [hx, hy]], Math.max(1.2, u * .17), col, 'ink', 0); paint(ellPts(hx, hy, u * .4, u * .4, 8), { wash: skin, ink: null }); return [hx, hy]; };
  const shooter = o.hold === 'bow' || o.hold === 'crossbow';
  if (shooter) vsMiniShooter(x, yy, u, dir, col, skin, o);
  const [lx, ly] = shooter ? [x, yy] : hand(-1, cheer), [rx, ry] = shooter ? [x, yy] : hand(1, o.hold ? 0 : cheer);
  paint(ellPts(x, yy - u * 4.3, u * 1.3, u * 1.2, 14), { wash: skin, washOp: 255, ink: DH.ink, sw: .8 });
  paint(ellPts(x + dir * u * .3, yy - u * 4.3, u * .15, u * .2, 6), { wash: DH.ink, ink: null });
  if (o.hat === 'nonla') paint([[x - u * 2, yy - u * 4.7], [x, yy - u * 6.7], [x + u * 2, yy - u * 4.7]], { wash: DH.tan, washOp: 255, ink: DH.ink, sw: .8 });
  else if (o.hat === 'helmet') { paint([[x - u * 1.4, yy - u * 4.5], [x - u * 1.2, yy - u * 5.6], [x, yy - u * 6], [x + u * 1.2, yy - u * 5.6], [x + u * 1.4, yy - u * 4.5]], { wash: DH.greyDk, washOp: 255, curv: .3, ink: DH.ink, sw: .8 }); paint([[x - u * .2, yy - u * 5.9], [x, yy - u * 7], [x + u * .3, yy - u * 5.9]], { wash: o.plume || DH.red, ink: null }); }
  else if (o.hat === 'mucoi') paint([[x - u * 1.7, yy - u * 4.7], [x - u * 1.3, yy - u * 5.8], [x + u * 1.3, yy - u * 5.8], [x + u * 1.7, yy - u * 4.7]], { wash: DH.green, washOp: 255, curv: .25, ink: DH.ink, sw: .8 });
  else if (o.hat === 'hair') paint([[x - u * 1.3, yy - u * 4.6], [x - u * 1.1, yy - u * 5.4], [x + u * 1.1, yy - u * 5.4], [x + u * 1.3, yy - u * 4.6]], { wash: DH.ink, washOp: 255, curv: .3, ink: null });
  else if (o.hat === 'feather') for (let i = -1; i <= 1; i++) paint([[x + i * u * .6 - u * .2, yy - u * 5.4], [x + i * u * .9, yy - u * 7.2], [x + i * u * .6 + u * .2, yy - u * 5.4]], { wash: [DH.red, DH.yellow, DH.indigo][i + 1], washOp: 255, ink: DH.ink, sw: .5 });
  if (o.hold === 'spear') { inkLine([[rx, ry + u * 3], [rx, ry - u * 6]], Math.max(1, u * .1), DH.brownDk, 'ink', 0); paint([[rx - u * .4, ry - u * 5.7], [rx, ry - u * 7.4], [rx + u * .4, ry - u * 5.7]], { wash: DH.grey, ink: DH.ink, sw: .5 }); }
  if (o.hold === 'flag') { inkLine([[rx, ry + u * 3], [rx, ry - u * 7]], Math.max(1, u * .1), DH.brownDk, 'ink', 0); paint([[rx, ry - u * 7], [rx + u * 3.4, ry - u * 6.6], [rx + u * 3.4, ry - u * 4.6], [rx, ry - u * 4.8]], { wash: o.flag || DH.red, ink: DH.ink, sw: .6 }); if (o.flagStar) paint(starPts(rx + u * 1.7, ry - u * 5.6, u * .8, .4, 5), { wash: DH.yellow, washOp: 255, ink: null }); }
  if (o.hold === 'rifle') inkLine([[rx - u * .6, ry + u * 1.4], [rx + u * .6, ry - u * 4]], Math.max(1, u * .11), DH.ink, 'ink', 0);
  if (o.hold === 'torch') { inkLine([[rx, ry + u], [rx, ry - u * 2]], Math.max(1, u * .1), DH.brownDk, 'ink', 0); paint([[rx - u * .6, ry - u * 2], [rx, ry - u * 4.2], [rx + u * .6, ry - u * 2]], { wash: DH.orange, ink: null }); }
}
// Where an arrow leaves the bow: just ahead of the leading hand, for a nguoi() archer (aR 1.9, aL -1.9, bowdrawn) and for a vsMini archer.
function vsNguoiBow(x, y, u, flip) { return [x + (flip ? -1 : 1) * 5.1 * u, y - 4.86 * u]; }
function vsMiniBow(x, y, u, dir) { return [x + dir * u * 5.5, y - u * 3.5]; }
// A mini at full draw: the leading arm holds the bow out at shoulder height, the other hand pulls the string to the chest;
// returns nothing, o.nock=false hides the arrow on the string (it has just flown).
function vsMiniShooter(x, yy, u, dir, col, skin, o) {
  const sy = yy - u * 2.8, fx = x + dir * u * 4.1, fy = yy - u * 3.5, bx = x + dir * u * .4, by = yy - u * 3.5;
  inkLine([[x + dir * u * 1.1, sy], [fx, fy]], Math.max(1.2, u * .17), col, 'ink', 0);
  inkLine([[x - dir * u * 1.1, sy], [bx, by]], Math.max(1.2, u * .17), col, 'ink', 0);
  const bow = [];
  for (let i = 0; i <= 8; i++) { const a = -1.15 + i / 8 * 2.3; bow.push([fx + dir * (Math.cos(a) * u * 1.5 - u * .7), fy + Math.sin(a) * u * 3.1]); }
  if (o.hold === 'crossbow') {
    paint(rectPts(Math.min(bx, fx + dir * u * 2.6) - u * .1, fy - u * .2, Math.abs(fx + dir * u * 2.6 - bx) + u * .2, u * .45), { wash: DH.brownDk, washOp: 255, ink: DH.ink, sw: .5 });
  }
  paint(ribbon(bow, u * .42, u * .2), { wash: DH.brown, washOp: 255, curv: .3, ink: DH.ink, sw: .5 });
  inkLine([bow[0], [bx, by], bow[8]], Math.max(.8, u * .05), DH.ink, 'inkfine', 0);
  if (o.nock ?? true) {
    inkLine([[bx, by], [fx + dir * u * 1.4, fy]], Math.max(1.1, u * .09), DH.brownDk, 'ink', 0);
    paint([[fx + dir * u * 1.2, fy - u * .3], [fx + dir * u * 1.9, fy], [fx + dir * u * 1.2, fy + u * .3]], { wash: DH.grey, washOp: 255, ink: null });
  }
  paint(ellPts(fx, fy, u * .4, u * .4, 8), { wash: skin, ink: null });
  paint(ellPts(bx, by, u * .4, u * .4, 8), { wash: skin, ink: null });
}
// n minis scattered over x0..x1 and y0..y1 (rows further down are larger and drawn later), variety from hash.
function vsCrowd(x0, x1, y0, y1, n, u, t, o = {}) {
  const cols = o.cols || [DH.brown, DH.indigo, DH.green, DH.red, DH.yellow, '#9C6A8A'], hats = o.hats || ['nonla', 'hair', 'none'];
  const items = []; for (let i = 0; i < n; i++) items.push({ i, x: lerp(x0, x1, hash(i * 3.3 + (o.seed || 0))), y: lerp(y0, y1, hash(i * 5.1 + 2 + (o.seed || 0))) });
  items.sort((a, b) => a.y - b.y);
  for (const { i, x, y } of items) {
    const k = lerp(.8, 1.15, (y - y0) / Math.max(1, y1 - y0));
    vsMini(x, y, u * k, { key: `c${i}`, col: cols[i % cols.length], hat: hats[i % hats.length], t, ph: i * 1.3, moving: o.moving, cheer: o.cheer ? .6 + .4 * Math.sin(t * 6 + i) : 0, hold: o.hold, dir: o.dir ?? 1, flag: o.flag, skin: i % 3 ? SKIN.fair : SKIN.tan });
  }
}
// A block of soldiers in `rows` rows, `cols` per row, marching or standing, all holding the same thing.
function vsArmy(x0, x1, y, rows, cols, u, t, o = {}) {
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const x = lerp(x0, x1, cols === 1 ? .5 : c / (cols - 1)) + (r % 2) * u * 1.2, yy = y + r * u * 1.9;
    vsMini(x, yy, u, { key: `a${r}-${c}`, col: o.col || DH.indigo, trim: o.trim, hat: o.hat || 'helmet', hold: o.hold ?? 'spear', plume: o.plume, t, ph: c * .9 + r, moving: o.moving, dir: o.dir ?? 1, pants: o.pants, flag: o.flag, skin: o.skin });
  }
}
