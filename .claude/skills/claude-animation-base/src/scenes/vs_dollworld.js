// vs_dollworld.js: animals and buildings in the paper-doll look (thick dark outline, flat colour, one shade), replacing the
// Đông Hồ brush versions with the SAME signatures, so every scene picks them up. Load after vs_build/vs_things/vs_animals.
// Researched before drawing (2026-10-23):
//  - Lý dragon: smooth round body in a sine of many humps, no scales and no horns, a "fire crest" trunk rising from the nose,
//    the pearl held in the MOUTH, a row of low fins along the spine, four legs of three claws with hair tufts at the elbow.
//  - Đông Sơn stilt house (Ngọc Lũ drum): a boat-shaped saddle roof with both ridge ends swept up, a bird on the ridge, posts, a ladder.
//  - Northern đình: the roof is most of the building, four đao corners curling up, mũi hài tiles, two dragons facing a moon on the ridge.
//  - Northern nhà tranh: three bays, mud-and-straw walls, a half-metre thatch of rice straw, the middle bay open, bamboo screens beside.
//  - Swamp buffalo: dark grey, big crescent horns sweeping out and back with the tips turning in, a long tail with a tuft.
//  - War elephant: a mahout on the neck and a howdah seat on the back (Đông Sơn dagger hilts).
const DW = { ink: '#1E1E1E', thatch: '#D9B66A', thatchDk: '#B08A45', mud: '#C9A57A', mudDk: '#A9845C', wood: '#8A5A2B', woodDk: '#5E3B1C',
  tile: '#B5513A', tileDk: '#8C3A28', gold: '#E8B23A', goldDk: '#B98420', red: '#C8322A', redDk: '#8E2220', stone: '#B9B0A2', stoneDk: '#8F877C',
  wall: '#EADBB8', grey: '#9C978F', greyDk: '#6F6A63', buff: '#5D5862', buffDk: '#3F3B44', horn: '#E9DFC8', white: '#FFFFFF' };
// a pen in s/100 units at (x, y), mirrored when dir < 0; the outline stays a fixed screen thickness range
function dwPen(x, y, s, dir = 1, w = 4.5) {
  flushBrush();
  push(); translate(x, y); if (dir < 0) scale(-1, 1);
  return dollPen(0, 0, s / 100, clamp(w * s / 100, 2.2, 7));
}
const dwEnd = () => pop();
const dwRib = (P, w0, w1) => ribbon(P, w0, w1);

// ---------- animals ----------
function dwElephant(x, y, s, o = {}) {
  const t = o.t ?? T, walk = o.walk, D = dwPen(x, y, s, o.dir ?? 1), col = o.col || DW.grey, dk = dcDark(col, .78);
  const leg = (lx, i) => { const ph = walk == null ? 0 : Math.sin((walk + (i % 2 ? .5 : 0)) * TAU), lift = walk == null ? 0 : Math.max(0, ph) * 14; return [lx + ph * 7, lift]; };
  for (const [i, lx] of [[1, -34], [3, 40]]) { const [px, lift] = leg(lx, i); D.shape(dollRR(px - 16, -80, 32, 80 - lift, 12), dk); }
  D.line([[-100, -112], [-112, -74 + 5 * Math.sin(t * 3)], [-106, -50]], dk, 6); D.shape(dollEll(-106, -48, 6, 9), DW.greyDk);
  D.shape(dollEll(0, -100, 104, 70), col);
  for (const [i, lx] of [[0, -62], [2, 66]]) { const [px, lift] = leg(lx, i); D.shape(dollRR(px - 17, -78, 34, 78 - lift, 12), col); for (const k of [-8, 0, 8]) D.shape(dollEll(px + k, -4 - lift, 3.5, 3), DW.white, false); }
  const sw = 8 * Math.sin(t * 2.2);
  D.shape(dwRib([[128, -120], [158, -86], [162 + sw, -40], [150 + sw * 1.3, -14], [136 + sw * 1.3, -20]], 34, 12), col);
  D.shape(dollEll(112, -128, 50, 48), col);
  D.shape(dwRib([[124, -98], [162, -84], [170, -104]], 12, 4), DW.horn);
  D.shape([...dollArc(80, -124, 34, 46, -1.9, 1.9, 14)], dk);
  D.shape(dollEll(128, -142, 6, 7), DW.ink, false); D.shape(dollEll(126, -145, 2, 2), DW.white, false);
  // howdah: a red cloth with a gold hem on the back, a low railed seat; the mahout sits on the neck in the scenes that want one
  D.shape([[-66, -164], [62, -164], [74, -118], [-78, -118]], o.cloth || DW.red);
  D.shape([[-78, -126], [74, -126], [76, -116], [-80, -116]], DW.gold);
  D.shape(dollRR(-50, -178, 92, 16, 5), DW.gold); D.line([[-44, -178], [-44, -196]], DW.woodDk, 5); D.line([[36, -178], [36, -196]], DW.woodDk, 5);
  dwEnd();
}
function dwHorse(x, y, s, o = {}) {
  const t = o.t ?? T, g = o.gallop, col = o.col || '#E8E0D0', dk = dcDark(col, .78), mane = o.mane || '#3A2A20', D = dwPen(x, y, s, o.dir ?? 1);
  const legs = [[-60, 0], [-40, .5], [50, .25], [70, .75]];
  const legPts = ([lx, p0]) => { const a = g == null ? 0 : Math.sin((g + p0) * TAU) * .55, lift = g == null ? 0 : Math.max(0, Math.cos((g + p0) * TAU)) * 22, bend = g == null ? 0 : Math.max(0, -Math.sin((g + p0) * TAU)) * 18; const kx = lx + Math.sin(a) * 30, ky = -48 - lift * .4; return [[lx, -90], [kx, ky], [kx + (lx > 0 ? -1 : 1) * bend * .5 + Math.sin(a) * 10, -lift]]; };
  for (const i of [1, 3]) { const P = legPts(legs[i]); D.shape(dwRib(P, 22, 12), dk); D.shape(dollEll(P[2][0], P[2][1] - 2, 8, 5), DW.ink, false); }
  const mw = 3 * Math.sin(t * 6);
  D.shape(dwRib([[-86, -104], [-112 + mw * 2, -84], [-116 + mw * 2, -36]], 18, 6), mane);
  D.shape(dollEll(0, -100, 90, 42), col);
  for (const i of [0, 2]) { const P = legPts(legs[i]); D.shape(dwRib(P, 24, 13), col); D.shape(dollEll(P[2][0], P[2][1] - 2, 8, 5), DW.ink, false); }
  D.shape([[40, -132], [78, -178], [94, -206], [116, -196], [104, -160], [92, -104], [60, -82]], col);   // neck
  D.shape(dwRib([[92, -206], [86 + mw, -172], [62 + mw, -128]], 18, 8), mane);
  D.shape([[94, -210], [118, -214], [150, -192], [170, -170], [166, -154], [146, -152], [118, -168], [100, -186]], col);   // head
  D.shape([[100, -208], [104, -232], [114, -210]], col);
  D.shape(dollEll(124, -194, 4.5, 5), DW.ink, false); D.shape(dollEll(160, -160, 3, 2.5), DW.ink, false);
  if (o.cloth !== null) { D.shape([[-32, -138], [32, -138], [36, -110], [-36, -110]], o.cloth || DW.red); D.shape([[-36, -116], [36, -116], [38, -108], [-38, -108]], DW.gold); }
  dwEnd();
}
function dwBuffalo(x, y, s, o = {}) {
  const t = o.t ?? T, walk = o.walk, col = o.col || DW.buff, dk = DW.buffDk, D = dwPen(x, y, s, o.dir ?? 1);
  const ph = i => walk == null ? 0 : Math.sin((walk + (i % 2 ? .5 : 0)) * TAU) * 7;
  for (const [i, lx] of [[1, -24], [3, 32]]) D.shape(dollRR(lx - 9 + ph(i), -62, 18, 62, 6), dk);
  D.line([[-78, -84], [-92, -54 + 3 * Math.sin(t * 3)], [-88, -28]], dk, 5); D.shape(dollEll(-88, -24, 6, 9), DW.ink);
  D.shape(dollEll(0, -76, 80, 42), col);
  for (const [i, lx] of [[0, -50], [2, 56]]) D.shape(dollRR(lx - 10 + ph(i), -60, 20, 60, 6), col);
  // head held low and forward; big crescent horns sweep out and back over the neck, the tips curling in
  const horn = (dx, c) => D.shape([[72 + dx, -100], [56 + dx, -126], [24 + dx, -138], [-6 + dx, -128], [-2 + dx, -116], [24 + dx, -122], [48 + dx, -112], [64 + dx, -92]], c);
  horn(-10, '#CFC4AC');
  D.shape([[50, -96], [92, -98], [116, -70], [124, -40], [104, -28], [84, -40], [60, -70]], col);
  D.shape(dollEll(112, -38, 17, 14), '#8C8088');
  D.shape(dollEll(106, -42, 3, 2.5), DW.ink, false); D.shape(dollEll(118, -40, 3, 2.5), DW.ink, false);
  D.shape(dollEll(88, -78, 4.5, 5), DW.ink, false);
  D.shape(dollEll(62, -96, 11, 6), dk);
  horn(0, DW.horn);
  dwEnd();
}
function dwTurtle(x, y, s, o = {}) {
  const t = o.t ?? T, bob = Math.sin(t * 1.8) * 4, col = o.col || DW.gold, dk = DW.goldDk;
  glow(x, y - s * .3, s * 2.2, '#FFE38A', o.glow ?? .45);
  const D = dwPen(x, y + bob * s / 100, s, o.dir ?? 1);
  for (const fx of [-55, 45]) D.shape(dollEll(fx + Math.sin(t * 3 + fx) * 5, -6, 30, 12), col);
  D.shape(dollEll(104, -18, 28, 22), col); D.shape(dollEll(114, -22, 4, 4.5), DW.ink, false);
  D.shape([...dollArc(0, -4, 94, 84, Math.PI, 2 * Math.PI, 26)], col);
  // hexagonal shell plates
  const hex = (cx, cy, r) => Array.from({ length: 6 }, (_, i) => [cx + Math.cos(i * Math.PI / 3) * r, cy + Math.sin(i * Math.PI / 3) * r * .8]);
  for (const [hx, hy] of [[0, -54], [-40, -30], [40, -30], [-20, -14], [20, -14]]) D.line([...hex(hx, hy, 17), hex(hx, hy, 17)[0]], dk, 3);
  D.line([[-94, -6], [94, -6]], dk, 3);
  dwEnd();
}
function dwWhale(x, y, s, t, o = {}) {
  const sw = Math.sin(t * 2) * 3, D = dwPen(x, y, s), col = o.col || '#3E5A82';
  D.shape([[-95, -10], [-130, -55 + sw], [-110, -15], [-135, 10 + sw], [-90, 5]], col);
  D.shape([[-100, 0], [-80, -35 + sw], [-20, -55], [50, -45], [90, -10], [80, 10], [-30, 12]], col);
  D.shape([[-60, 4], [70, 0], [60, 10], [-30, 12]], '#C9D8E4', false);
  D.shape(dollEll(55, -22, 4, 5), DW.white); D.shape(dollEll(55, -22, 2, 2.5), DW.ink, false);
  for (const i of [-1, 0, 1]) D.line([[10, -50], [10 + i * 20, -90], [10 + i * 35, -65]], '#DDEBF2', 4);
  dwEnd();
}
// Lý dragon: smooth sine body (no scales), low spine fins, three-clawed legs with elbow tufts, a fire-crest trunk from the nose,
// the pearl in its mouth, no horns. Same body path signature as before: o.span (width in s), o.rise (head lift), o.col.
function dwDragon(x, y, s, o = {}) {
  const t = o.t ?? T, col = o.col || DW.gold, dk = dcDark(col, .72), belly = mixCol(col, '#FFF4D6', .55), n = 16, P = [];
  const span = o.span ?? 2.2, amp = s * .2 * Math.min(1, span / 1.6);
  for (let i = 0; i <= n; i++) { const k = i / n; P.push([x + (k - .5) * s * span, y + Math.sin(k * Math.PI * 3.4 - t * 2.2) * amp * (.55 + .45 * k) - k * (o.rise ?? 0) * s]); }
  flushBrush();
  const ow = clamp(s * .022, 2.5, 7), D = dollPen(0, 0, 1, ow), C = through(P, 6), N = C.length;
  const nrm = i => { const a = C[Math.max(0, i - 1)], b = C[Math.min(N - 1, i + 1)], d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return [(b[1] - a[1]) / d, -(b[0] - a[0]) / d]; };
  const w0 = s * .05, w1 = s * .19, wAt = i => lerp(w0, w1, Math.pow(i / (N - 1), .7));
  const side = (i, f) => { const [nx, ny] = nrm(i), w = wAt(i) * f; return [C[i][0] + nx * w, C[i][1] + ny * w]; };
  const leg = (i, far, ph) => {
    const [hx, hy] = side(i, -.2), sw = Math.sin(t * 3 + ph) * s * .03, c1 = far ? dk : col;
    const knee = [hx + s * .1 + sw, hy + s * .16], foot = [hx + s * .02 + sw, hy + s * .26];
    D.shape(dwRib([[hx, hy], knee], s * .11, s * .07), c1);
    D.shape(dwRib([knee, foot], s * .07, s * .05), c1);
    D.shape([[knee[0] - s * .02, knee[1] - s * .02], [knee[0] - s * .16, knee[1] - s * .06], [knee[0] - s * .1, knee[1] + s * .01], [knee[0] - s * .14, knee[1] + s * .05], [knee[0], knee[1] + s * .03]], DW.red);
    for (const a of [-.6, .1, .8]) D.shape(dwRib([foot, [foot[0] + Math.cos(a) * s * .06, foot[1] + Math.sin(a) * s * .05 + s * .01], [foot[0] + Math.cos(a) * s * .085, foot[1] + Math.sin(a) * s * .05 + s * .035]], s * .025, s * .008), DW.horn);
  };
  leg(Math.round(N * .32), true, 1); leg(Math.round(N * .7), true, 2.5);
  for (let i = 4; i < N - 8; i += 4) {   // spine fins, each tip laid on the next one
    const a = side(i, .9), b = side(i + 4, 1.55), c = side(i + 4, .9);
    D.shape([a, b, c], DW.red);
  }
  // tail ends in a flame tuft
  const [tx, ty] = C[0], [ux, uy] = C[3];
  D.shape([[tx, ty], [tx - s * .14, ty - s * .1], [tx - s * .06, ty - s * .01], [tx - s * .16, ty + s * .04], [tx - s * .04, ty + s * .04], [ux, uy]], DW.red);
  D.shape(dwRib(P, w0 * 2, w1 * 2), col);
  D.line(C.slice(2, -4).map((p, i) => side(i + 2, -.55)), belly, Math.max(3, s * .05));
  D.line(C.slice(2, -4).map((p, i) => side(i + 2, -.55)), dk, Math.max(1.5, s * .008));
  leg(Math.round(N * .4), false, 0); leg(Math.round(N * .78), false, 1.7);
  // head on the last segment: rounded skull, open mouth biting the pearl, a big flame crest curling up from the nose, mane behind
  const [hx, hy] = C[N - 1], [qx, qy] = C[N - 5], a = Math.atan2(hy - qy, hx - qx), hs = s * .36;
  push(); translate(hx, hy); rotate(a);
  const H = dollPen(0, 0, hs / 100, ow), open = 8 + 5 * Math.sin(t * 3);
  for (const [dx, dy, l] of [[-20, -30, .6], [-30, -6, .5]]) H.shape([[dx, dy - 10], [dx - 70 * l, dy - 34], [dx - 40 * l, dy - 4], [dx - 78 * l, dy + 10], [dx, dy + 10]], DW.red);
  H.shape([[-10, 18], [40, 14], [96, 22 + open], [70, 40 + open * .5], [10, 42]], dk);   // lower jaw
  H.shape([[-30, -30], [6, -52], [52, -46], [96, -20], [104, 4 - open * .3], [60, 8], [10, 16], [-26, 20]], col);   // skull and upper jaw
  H.shape(dollEll(102, 14, 20), DW.white);   // the pearl, held in the mouth
  H.shape([[82, -8], [96, 14], [84, 12]], DW.white, false);   // fang curling over
  H.shape([[92, -24], [120, -66], [106, -100], [138, -84], [128, -60], [150, -66], [134, -34], [104, -12]], DW.red);   // fire crest from the nose
  H.shape([[100, -60], [112, -82], [124, -74]], '#F28A1E', false);
  H.shape(dollEll(36, -24, 15, 14), DW.white); H.shape(dollEll(40, -24, 7, 8), DW.ink, false); H.shape(dollEll(42, -27, 2.5, 2.5), DW.white, false);
  H.line([[12, -40], [40, -50], [62, -42]], dk, 6);
  pop();
  glow(hx + Math.cos(a) * hs * 1.02, hy + Math.sin(a) * hs * 1.02 + Math.cos(a) * hs * .14, s * .2, '#FFF1C4', .55);
}

// ---------- buildings ----------
// nhà tranh: thick rice-straw roof, mud walls, the middle bay open, screens either side
function dwHut(x, y, s, o = {}) {
  const D = dwPen(x, y, s);
  D.shape([[-40, 0], [40, 0], [40, -34], [-40, -34]], o.wall || DW.mud);
  for (const k of [-40, -14, 14, 40]) D.shape(dollRR(k - 3, -36, 6, 36, 2), DW.woodDk);
  D.shape(dollRR(-9, -26, 18, 26, 3), DW.woodDk);
  for (const k of [-27, 27]) { D.shape(dollRR(k - 8, -26, 16, 16, 2), '#C8B07A'); for (let j = -5; j <= 5; j += 5) D.line([[k + j, -26], [k + j, -10]], DW.thatchDk, 1.6); }
  D.shape([[-52, -30], [-38, -62], [-14, -76], [14, -76], [38, -62], [52, -30], [36, -27], [-36, -27]], DW.thatch);
  for (let k = -40; k <= 40; k += 8) D.line([[k * .9, -70 + Math.abs(k) * .2], [k * 1.2, -32]], DW.thatchDk, 1.6);
  D.line([[-15, -76], [15, -76]], DW.thatchDk, 5);
  dwEnd();
}
// Đông Sơn stilt house: posts, floor, light bamboo walls, a boat-shaped roof whose ridge ends sweep up, a bird on the ridge
function dwStilt(x, y, s, o = {}) {
  const D = dwPen(x, y, s);
  for (const k of [-34, -12, 12, 34]) D.shape(dollRR(k - 2.5, -40, 5, 40, 2), DW.woodDk);
  D.line([[44, 0], [30, -38]], DW.wood, 3); for (let j = 1; j < 5; j++) D.line([[44 - j * 2.8, -j * 7.6], [50 - j * 2.8, -j * 7.6]], DW.wood, 2);
  D.shape(dollRR(-44, -44, 88, 7, 2), DW.wood);
  D.shape([[-34, -44], [34, -44], [34, -62], [-34, -62]], '#D8C08A');
  D.shape(dollRR(-6, -60, 12, 16, 2), DW.woodDk);
  D.shape([[-48, -58], [-60, -110], [-30, -86], [0, -82], [30, -86], [60, -110], [48, -58]], DW.thatch);
  for (let k = -36; k <= 36; k += 9) D.line([[k, -84 + Math.abs(k) * .05], [k * 1.1, -60]], DW.thatchDk, 1.6);
  D.shape([[2, -84], [10, -92], [18, -90], [12, -84]], DW.woodDk); D.shape(dollEll(6, -90, 4), DW.woodDk);
  dwEnd();
}
// a roof with four curling đao corners and mũi hài tile courses; on a big roof, two small dragons on the ridge face a moon
function dwRoof(D, cx, yE, w, h, col, ridge) {
  const l = cx - w / 2, r = cx + w / 2, top = yE - h * .9, dk = dcDark(col, .78);
  const half = sd => { const e = sd < 0 ? l : r, i = -sd; return [[e + i * w * .06, yE], [e - i * 2, yE - h * .3], [e - i * 10, yE - h * .62], [e - i * 13, yE - h * .9], [e - i * 4, yE - h * .76], [e + i * w * .1, yE - h * .34], [e + i * w * .2, top]]; };
  D.shape([...half(-1), ...half(1).reverse()], col);
  for (let k = 1; k < 4; k++) { const f = k / 4, yy = yE - h * .9 * f; D.line([[l + w * .08 + w * .12 * f, yy], [r - w * .08 - w * .12 * f, yy]], dk, 1.8); }
  D.line([[l + w * .2, top], [r - w * .2, top]], DW.ink, 4);
  if (!ridge) return;
  const m = Math.max(5, w * .045);
  D.shape(dollEll(cx, top - m * 1.1, m), DW.gold);
  for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; D.line([[cx + Math.cos(a) * m * 1.3, top - m * 1.1 + Math.sin(a) * m * 1.3], [cx + Math.cos(a) * m * 1.7, top - m * 1.1 + Math.sin(a) * m * 1.7]], DW.red, 1.6); }
  for (const sd of [-1, 1]) {   // a little dragon: body arching from the ridge end toward the moon, head raised, tail curled
    const x0 = cx + sd * w * .28, x1 = cx + sd * m * 2.6;
    D.shape(dwRib([[x0 + sd * m, top - m * 1.6], [x0, top - m * .3], [(x0 + x1) / 2, top - m * 1.3], [x1, top - m * .5]], m * .55, m * .85), DW.gold);
    D.shape(dollEll(x1, top - m * 1.0, m * .6, m * .55), DW.gold);
    D.shape([[x1, top - m * 1.4], [x1 - sd * m * .2, top - m * 2.4], [x1 + sd * m * .5, top - m * 1.5]], DW.red);
  }
}
function dwHall(x, y, s, o = {}) {
  const D = dwPen(x, y, s), tiers = o.tiers ?? 1, roof = o.roof || (o.gold ? DW.gold : DW.tile);
  D.shape(dollRR(-58, -7, 116, 7, 2), DW.stone);
  D.shape([[-46, -7], [46, -7], [46, -30], [-46, -30]], o.wall || '#E2C9A0');
  for (const k of [-46, -28, -9, 9, 28, 46]) D.shape(dollRR(k - 2.5, -32, 5, 25, 1.5), DW.red);
  D.shape(dollRR(-8, -26, 16, 19, 2), DW.woodDk);
  if (tiers > 1) {
    D.shape([[-30, -38], [30, -38], [30, -52], [-30, -52]], o.wall || '#E2C9A0');
    for (const k of [-30, -10, 10, 30]) D.shape(dollRR(k - 2, -52, 4, 14, 1), DW.red);
    dwRoof(D, 0, -30, 128, 22, roof, false);
    dwRoof(D, 0, -50, 84, 22, roof, true);
  } else dwRoof(D, 0, -30, 128, 30, roof, true);
  dwEnd();
}
function dwGate(x, y, s, o = {}) {
  const D = dwPen(x, y, s), roof = o.roof || DW.tile;
  for (const k of [-42, -30, 30, 42]) D.shape(dollRR(k - 2.5, -40, 5, 40, 2), DW.red);
  for (const k of [-14, 14]) D.shape(dollRR(k - 3, -56, 6, 56, 2), DW.red);
  D.shape(dollRR(-45, -44, 30, 6, 2), DW.redDk); D.shape(dollRR(15, -44, 30, 6, 2), DW.redDk); D.shape(dollRR(-17, -60, 34, 7, 2), DW.redDk);
  dwRoof(D, -32, -43, 30, 12, roof, false); dwRoof(D, 32, -43, 30, 12, roof, false);
  dwRoof(D, 0, -59, 46, 20, roof, true);
  dwEnd();
}
function dwWall(x0, x1, y, h, o = {}) {
  flushBrush();
  const col = o.col || '#C9B58A', dk = dcDark(col, .8), D = dollPen(0, 0, 1, 5);
  D.shape([[x0, y], [x1, y], [x1, y - h], [x0, y - h]], col);
  for (let yy = y - h + 26; yy < y; yy += 26) D.line([[x0 + 4, yy], [x1 - 4, yy]], dk, 2);
  for (let xx = x0, r = 0; xx < x1; xx += 46, r++) D.shape([[xx + 4, y - h], [xx + 30, y - h], [xx + 30, y - h - 22], [xx + 4, y - h - 22]], col);
  if (o.gate) { const cx = (x0 + x1) / 2, gw = Math.min(150, h * .9); D.shape([[cx - gw / 2, y], [cx - gw / 2, y - h * .55], ...dollArc(cx, y - h * .55, gw / 2, gw * .45, Math.PI, 2 * Math.PI, 12), [cx + gw / 2, y]], DW.woodDk); D.line([[cx, y], [cx, y - h * .55 - gw * .45]], DW.ink, 3); }
}
function dwThrone(x, y, s, o = {}) {
  const D = dwPen(x, y, s), col = o.col || DW.gold;
  D.shape(dollRR(-62, -10, 124, 10, 3), DW.redDk);
  D.shape([[-42, -10], [-46, -62], [-34, -120], [-12, -150], [0, -162], [12, -150], [34, -120], [46, -62], [42, -10]], col);
  D.shape(dollRR(-34, -70, 68, 60, 6), DW.red);
  D.shape(dollEll(0, -110, 17, 20), DW.red);
  for (const sd of [-1, 1]) D.shape(dollRR(sd * 50 - 6, -86, 12, 46, 4), col);
  dwEnd();
}
if (!location.search.includes('brushcast')) {
  vsElephant = dwElephant; vsHorse = dwHorse; vsBuffalo = dwBuffalo; vsTurtle = dwTurtle; vsWhale = dwWhale; vsDragon = dwDragon;
  vsHut = dwHut; vsStilt = dwStilt; vsHall = dwHall; vsGate = dwGate; vsWall = dwWall; vsThrone = dwThrone;
}
