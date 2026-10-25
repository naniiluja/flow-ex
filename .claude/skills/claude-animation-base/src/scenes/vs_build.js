// vs_build.js: houses, halls, gates, walls and towns for "Việt sử". (x, y) is the middle of the base on the ground; s is the
// building's width unit (a building is roughly s wide and 0.6-1.2 s tall). All of it is flat Đông Hồ colour under brush ink.

const TILE = '#B5513A', THATCH = '#C9A04A', WALL = '#EADBB8', WOOD = '#8A5A3A';

// A Vietnamese roof: concave slopes, upturned eave tips. yEave is the eave line; h is the rise above it.
function roofPts(cx, yEave, w, h, up = 0) {
  const l = cx - w / 2, r = cx + w / 2;
  return [[l - w * .06, yEave - up], [l + w * .1, yEave - h * .2], [cx - w * .3, yEave - h * .9], [cx - w * .27, yEave - h], [cx + w * .27, yEave - h], [cx + w * .3, yEave - h * .9], [r - w * .1, yEave - h * .2], [r + w * .06, yEave - up], [r, yEave + 8], [l, yEave + 8]];
}
function vsRoof(cx, yEave, w, h, col, o = {}) {
  paint(roofPts(cx, yEave, w, h, o.up ?? h * .18), { wash: col, washOp: 255, fill: mixCol(col, DH.ink, .4), fillOp: 55, bleed: .25, tex: .6, border: .5, ink: DH.ink, sw: 1.2, curv: .12 });
  const rows = o.rows ?? 4;
  for (let i = 1; i <= rows; i++) { const k = i / (rows + 1), y = yEave - h * k * .8, hw = w * (.5 - k * .32); inkLine([[cx - hw, y], [cx, y + 5], [cx + hw, y]], .8, mixCol(col, DH.ink, .55), 'inkfine', .4); }
}
const post = (x, y0, y1, w, col = DH.red) => paint(rectPts(x - w / 2, y1, w, y0 - y1), { wash: col, washOp: 255, ink: DH.ink, sw: .9 });

function vsHut(x, y, s, o = {}) {
  boilSeed(`hut ${o.key ?? Math.round(x / 40)}`);
  paint(rectPts(x - s * .36, y - s * .32, s * .72, s * .32), { wash: o.wall || WALL, washOp: 255, ink: DH.ink, sw: 1.1 });
  paint(rectPts(x - s * .07, y - s * .24, s * .14, s * .24), { wash: DH.brownDk, washOp: 255, ink: DH.ink, sw: .8 });
  vsRoof(x, y - s * .28, s * .95, s * .62, o.roof || THATCH, { rows: 5 });
}
function vsStilt(x, y, s, o = {}) {
  boilSeed(`stilt ${o.key ?? Math.round(x / 40)}`);
  for (const k of [-.34, -.12, .12, .34]) post(x + k * s, y, y - s * .36, s * .045, WOOD);
  paint(rectPts(x - s * .42, y - s * .42, s * .84, s * .07), { wash: WOOD, washOp: 255, ink: DH.ink, sw: .9 });
  paint(rectPts(x - s * .36, y - s * .78, s * .72, s * .36), { wash: o.wall || '#D9C08A', washOp: 255, ink: DH.ink, sw: 1 });
  paint(rectPts(x - s * .07, y - s * .7, s * .14, s * .28), { wash: DH.brownDk, washOp: 255, ink: DH.ink, sw: .7 });
  vsRoof(x, y - s * .74, s * 1.05, s * .6, o.roof || THATCH, { rows: 5 });
  inkLine([[x + s * .38, y - s * .36], [x + s * .52, y]], 2, WOOD, 'ink', 0);
}
function vsHouse(x, y, s, o = {}) {
  boilSeed(`house ${o.key ?? Math.round(x / 40)}`);
  paint(rectPts(x - s * .4, y - s * .4, s * .8, s * .4), { wash: o.wall || WALL, washOp: 255, ink: DH.ink, sw: 1.1 });
  paint(rectPts(x - s * .09, y - s * .3, s * .18, s * .3), { wash: o.door || DH.red, washOp: 255, ink: DH.ink, sw: .8 });
  for (const k of [-.26, .26]) paint(rectPts(x + k * s - s * .06, y - s * .3, s * .12, s * .14), { wash: DH.brownDk, washOp: 255, ink: DH.ink, sw: .7 });
  vsRoof(x, y - s * .36, s * 1.05, s * .5, o.roof || TILE, {});
}
// Communal hall (đình) or palace hall: broad curved roof on red pillars, steps in front. o.tiers = 1 or 2, o.gold for a gold roof.
function vsHall(x, y, s, o = {}) {
  boilSeed(`hall ${o.key ?? Math.round(x / 40)}`);
  const tiers = o.tiers ?? 1, roof = o.roof || (o.gold ? DH.gold : TILE), wallH = s * .26;
  paint(rectPts(x - s * .56, y - s * .06, s * 1.12, s * .06), { wash: DH.stone, washOp: 255, ink: DH.ink, sw: 1 });
  paint(rectPts(x - s * .5, y - s * .06 - wallH, s, wallH), { wash: o.wall || DH.redDk, washOp: 255, ink: DH.ink, sw: 1.1 });
  for (let i = 0; i <= 4; i++) post(x - s * .45 + i * s * .225, y - s * .06, y - s * .06 - wallH, s * .04, DH.red);
  paint(rectPts(x - s * .09, y - s * .06 - wallH * .85, s * .18, wallH * .85), { wash: DH.brownDk, washOp: 255, ink: DH.ink, sw: .8 });
  const eave = y - s * .06 - wallH;
  if (tiers === 2) {
    vsRoof(x, eave, s * 1.18, s * .3, roof, { rows: 3 });
    paint(rectPts(x - s * .3, eave - s * .38, s * .6, s * .12), { wash: o.wall || DH.redDk, washOp: 255, ink: DH.ink, sw: 1 });
    vsRoof(x, eave - s * .3, s * .8, s * .3, roof, { rows: 3 });
  } else vsRoof(x, eave, s * 1.2, s * .46, roof, { rows: 4 });
  const top = eave - (tiers === 2 ? s * .6 : s * .46);
  if (o.dragons !== false) for (const side of [-1, 1]) {
    const ex = x + side * s * (tiers === 2 ? .8 * .27 : 1.2 * .27);
    paint([[ex, top + 4], [ex + side * s * .06, top - s * .08], [ex + side * s * .02, top - s * .14], [ex - side * s * .02, top - s * .06]], { wash: DH.gold, washOp: 255, curv: .4, ink: DH.ink, sw: .8 });
  }
}
function vsGate(x, y, s, o = {}) {   // làng gate / tam quan: three openings under a roof
  boilSeed(`gate ${o.key ?? Math.round(x / 40)}`);
  for (const k of [-.4, -.14, .14, .4]) post(x + k * s, y, y - s * .5, s * .06, DH.red);
  paint(rectPts(x - s * .46, y - s * .58, s * .92, s * .1), { wash: DH.redDk, washOp: 255, ink: DH.ink, sw: 1 });
  vsRoof(x, y - s * .56, s * 1.12, s * .3, o.roof || TILE, { rows: 2 });
}
// Citadel wall: x0..x1 at ground y, h tall, crenellated; gate tower in the middle if o.gate.
function vsWall(x0, x1, y, h, o = {}) {
  boilSeed(`wall ${o.key ?? Math.round(x0 / 40)}`);
  const col = o.col || '#C9B58A';
  paint(rectPts(x0, y - h, x1 - x0, h), { wash: col, washOp: 255, fill: DH.ink, fillOp: 35, bleed: .2, ink: DH.ink, sw: 1.3 });
  for (let x = x0; x < x1 - 20; x += 44) paint(rectPts(x + 4, y - h - 22, 30, 24), { wash: col, washOp: 255, ink: DH.ink, sw: 1 });
  for (let x = x0 + 30; x < x1; x += 90) inkLine([[x, y - h + 10], [x + 70, y - h + 10]], .8, mixCol(col, DH.ink, .5), 'inkfine', 0);
  if (o.gate) { const gx = (x0 + x1) / 2; paint([[gx - h * .28, y], [gx - h * .28, y - h * .5], [gx, y - h * .78], [gx + h * .28, y - h * .5], [gx + h * .28, y]], { wash: DH.brownDk, washOp: 255, curv: .25, ink: DH.ink, sw: 1.1 }); }
}
// Earth rampart with a bamboo palisade on top (Cổ Loa, and old villages).
function vsRampart(x0, x1, y, h, o = {}) {
  boilSeed(`rampart ${o.key ?? Math.round(x0 / 40)}`);
  const pts = [[x0, y]]; for (let x = x0; x <= x1; x += 40) pts.push([x, y - h * (.75 + .25 * Math.sin(x * .02))]); pts.push([x1, y]);
  paint(pts, { wash: DH.earth, washOp: 255, fill: DH.brownDk, fillOp: 60, bleed: .3, ink: DH.ink, sw: 1.2, curv: .25 });
  for (let x = x0 + 10; x < x1; x += 26) paint([[x, y - h * .8], [x + 6, y - h * .8 - 38], [x + 12, y - h * .8]], { wash: DH.green, washOp: 255, ink: DH.ink, sw: .8 });
}
// Tháp Rùa: three little tiers on an islet.
function vsTowerTurtle(x, y, s, o = {}) {
  boilSeed(`thaprua ${o.key ?? 0}`);
  paint(ellPts(x, y, s * .7, s * .12, 20), { wash: DH.stone, washOp: 255, ink: DH.ink, sw: 1 });
  for (let i = 0; i < 3; i++) {
    const w = s * (.52 - i * .12), yy = y - s * .02 - i * s * .24;
    paint(rectPts(x - w / 2, yy - s * .17, w, s * .17), { wash: '#E5D7B5', washOp: 255, ink: DH.ink, sw: 1 });
    paint(rectPts(x - w * .15, yy - s * .13, w * .3, s * .1), { wash: DH.brownDk, washOp: 255, ink: null });
    vsRoof(x, yy - s * .16, w * 1.25, s * .08, '#9B7A4A', { rows: 1 });
  }
}
function vsPavilion(x, y, s, o = {}) {   // Khuê Văn Các: two floors on four stilts
  boilSeed(`khuevan ${o.key ?? 0}`);
  for (const k of [-.32, .32]) post(x + k * s, y, y - s * .3, s * .07, DH.brownDk);
  paint(rectPts(x - s * .4, y - s * .34, s * .8, s * .06), { wash: DH.stone, washOp: 255, ink: DH.ink, sw: 1 });
  paint(rectPts(x - s * .3, y - s * .58, s * .6, s * .24), { wash: DH.redDk, washOp: 255, ink: DH.ink, sw: 1 });
  for (let i = -1; i <= 1; i++) paint(ellPts(x + i * s * .16, y - s * .46, s * .045, s * .045, 10), { wash: DH.gold, washOp: 255, ink: DH.ink, sw: .6 });
  vsRoof(x, y - s * .56, s * .8, s * .18, TILE, { rows: 2 });
  paint(rectPts(x - s * .24, y - s * .8, s * .48, s * .2), { wash: DH.redDk, washOp: 255, ink: DH.ink, sw: 1 });
  vsRoof(x, y - s * .76, s * .64, s * .2, TILE, { rows: 2 });
}
function vsNgoMon(x, y, s, o = {}) {   // Huế: broad gate with a roofed pavilion above
  boilSeed(`ngomon ${o.key ?? 0}`);
  paint(rectPts(x - s * .62, y - s * .26, s * 1.24, s * .26), { wash: '#D8C291', washOp: 255, fill: DH.ink, fillOp: 30, ink: DH.ink, sw: 1.3 });
  for (const k of [-.36, -.12, .12, .36]) paint([[x + k * s - s * .05, y], [x + k * s - s * .05, y - s * .15], [x + k * s, y - s * .2], [x + k * s + s * .05, y - s * .15], [x + k * s + s * .05, y]], { wash: DH.brownDk, washOp: 255, ink: DH.ink, sw: .8, curv: .3 });
  paint(rectPts(x - s * .5, y - s * .5, s, s * .24), { wash: DH.yellow, washOp: 255, ink: DH.ink, sw: 1 });
  for (let i = 0; i <= 5; i++) post(x - s * .45 + i * s * .18, y - s * .26, y - s * .5, s * .03, DH.red);
  vsRoof(x, y - s * .48, s * 1.1, s * .26, DH.yellow, { rows: 3 });
  for (const side of [-1, 1]) { paint(rectPts(x + side * s * .62 - s * .12, y - s * .5, s * .24, s * .5), { wash: '#D8C291', washOp: 255, ink: DH.ink, sw: 1 }); vsRoof(x + side * s * .62, y - s * .5, s * .38, s * .14, DH.yellow, { rows: 1 }); }
}
function vsPalace(x, y, s, o = {}) {   // Dinh Độc Lập: modern, wide, louvered, with a flagpole
  boilSeed(`ddl ${o.key ?? 0}`);
  paint(rectPts(x - s * .62, y - s * .08, s * 1.24, s * .08), { wash: DH.stone, washOp: 255, ink: DH.ink, sw: 1 });
  paint(rectPts(x - s * .56, y - s * .3, s * 1.12, s * .22), { wash: '#EFE5CC', washOp: 255, ink: DH.ink, sw: 1.2 });
  paint(rectPts(x - s * .46, y - s * .52, s * .92, s * .22), { wash: '#F3EAD3', washOp: 255, ink: DH.ink, sw: 1.2 });
  for (let i = 0; i < 12; i++) inkLine([[x - s * .52 + i * s * .095, y - s * .29], [x - s * .52 + i * s * .095, y - s * .09]], 1.6, DH.greyDk, 'inkfine', 0);
  for (let i = 0; i < 10; i++) paint(rectPts(x - s * .43 + i * s * .095, y - s * .48, s * .05, s * .14), { wash: DH.brownDk, washOp: 255, ink: null });
  paint(rectPts(x - s * .35, y - s * .58, s * .7, s * .06), { wash: '#E8DCBF', washOp: 255, ink: DH.ink, sw: 1 });
  inkLine([[x, y - s * .58], [x, y - s * 1.0]], 3, DH.greyDk, 'ink', 0);
}
function vsNhaRong(x, y, s, o = {}) {   // Bến Nhà Rồng: three bays, curved roof with two dragons
  boilSeed(`nharong ${o.key ?? 0}`);
  paint(rectPts(x - s * .5, y - s * .3, s, s * .3), { wash: '#F0E4C6', washOp: 255, ink: DH.ink, sw: 1.2 });
  for (let i = 0; i < 5; i++) paint(rectPts(x - s * .44 + i * s * .2, y - s * .24, s * .1, s * .2), { wash: DH.green, washOp: 255, ink: DH.ink, sw: .8 });
  vsRoof(x, y - s * .28, s * 1.1, s * .3, '#9B3D2B', { rows: 3 });
  for (const side of [-1, 1]) { const ex = x + side * s * .18; paint([[ex, y - s * .56], [ex + side * s * .08, y - s * .68], [ex + side * s * .03, y - s * .76], [ex - side * .0, y - s * .64]], { wash: DH.gold, washOp: 255, curv: .4, ink: DH.ink, sw: .9 }); }
}
// Tall modern town: towers with window grids. t animates a few lit windows.
function vsSkyline(x0, x1, y, o = {}) {
  boilSeed(`skyline ${o.key ?? 0}`);
  const t = o.t ?? T, n = o.n ?? 9;
  for (let i = 0; i < n; i++) {
    const w = 90 + hash(i * 2 + 1) * 80, h = (o.minH ?? 260) + hash(i * 3 + 2) * (o.rangeH ?? 420), x = lerp(x0, x1, i / (n - 1)) - w / 2;
    const col = [DH.indigo, '#7F9DB0', '#B9C6C0', '#8F8B86'][i % 4];
    paint(rectPts(x, y - h, w, h), { wash: col, washOp: 255, fill: DH.ink, fillOp: 30, ink: DH.ink, sw: 1.2 });
    for (let r = 0; r < Math.floor(h / 46); r++) for (let c = 0; c < Math.floor(w / 30); c++) {
      const lit = hash(i * 31 + r * 7 + c) > .55 + .0 * t;
      paint(rectPts(x + 10 + c * 28, y - h + 14 + r * 44, 14, 20), { wash: lit ? '#F6E7A8' : mixCol(col, DH.ink, .2), washOp: 255, ink: null });
    }
    if (i === 3) paint([[x + w * .5 - 6, y - h], [x + w * .5, y - h - 90], [x + w * .5 + 6, y - h]], { wash: DH.greyDk, washOp: 255, ink: DH.ink, sw: .8 });
  }
}
function vsShopRow(x0, x1, y, o = {}) {   // phố cổ: narrow tube houses of different heights and colours
  boilSeed(`shops ${o.key ?? 0}`);
  const cols = ['#E8C98A', '#D98E73', '#9DB7A0', '#EBD8A0', '#C9A0A0'];
  let x = x0, i = 0;
  while (x < x1) {
    const w = 120 + hash(i) * 50, h = 260 + hash(i + 5) * 160;
    paint(rectPts(x, y - h, w, h), { wash: cols[i % cols.length], washOp: 255, ink: DH.ink, sw: 1.1 });
    paint(rectPts(x + w * .2, y - h * .45, w * .6, h * .45), { wash: DH.brownDk, washOp: 255, ink: DH.ink, sw: .8 });
    paint(rectPts(x + w * .25, y - h * .85, w * .5, h * .18), { wash: DH.sky, washOp: 255, ink: DH.ink, sw: .8 });
    paint([[x - 6, y - h], [x + w / 2, y - h - 36], [x + w + 6, y - h]], { wash: TILE, washOp: 255, ink: DH.ink, sw: 1 });
    x += w + 4; i++;
  }
}
function vsTrain(x, y, s, o = {}) {   // elevated metro train
  boilSeed(`train ${o.key ?? 0}`);
  for (let c = 0; c < 3; c++) {
    const cx = x + c * s * 1.02;
    paint(rrPts(cx, y - s * .42, s, s * .36, s * .1), { wash: c === 0 ? '#F3EAD3' : '#EFE5CC', washOp: 255, ink: DH.ink, sw: 1.2 });
    for (let w = 0; w < 4; w++) paint(rectPts(cx + s * .08 + w * s * .22, y - s * .36, s * .15, s * .14), { wash: DH.sky, washOp: 255, ink: DH.ink, sw: .7 });
    paint(rectPts(cx, y - s * .16, s, s * .05), { wash: DH.red, washOp: 255, ink: null });
  }
}
function vsBridgeTrack(x0, x1, y, o = {}) {
  boilSeed(`track ${o.key ?? 0}`);
  paint(rectPts(x0, y, x1 - x0, 26), { wash: DH.stone, washOp: 255, ink: DH.ink, sw: 1.2 });
  for (let x = x0 + 80; x < x1; x += 260) paint(rectPts(x, y + 26, 34, 380), { wash: DH.stone, washOp: 255, ink: DH.ink, sw: 1.1 });
}
