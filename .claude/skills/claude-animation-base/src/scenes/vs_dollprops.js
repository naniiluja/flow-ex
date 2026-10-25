// vs_dollprops.js: props for the paper-doll world, in the same look (thick dark outline, one flat shade, boiling vertices).
// Dong Son details follow the Ngoc Lu drum: a 14-ray star, rings of dots and tangent circles, a band of feather-crowned people and
// stilt houses, 18 lac birds flying counterclockwise; the body is a bulging tang, a straight than and a flared foot, two pairs of
// handles, no frogs (frogs belong to later drums). Each function takes (x, y) = the base centre and s = width in px.
const DP = { bronze: '#C08A4A', bronzeLt: '#DDB277', bronzeDk: '#7A5128', patina: '#6E9C8A', wood: '#8A5A2B', woodLt: '#B07A45', woodDk: '#5E3B1C',
  straw: '#D9BD7A', sail: '#D8C08A', water: '#7FB3C8', waterDk: '#4E8AA6', red: '#C8322A', white: '#FFFFFF', ink: '#1E1E1E' };
const dpOW = 6;
// the crew of a boat are the cast's own paper dolls: drawn before the hull so the gunwale hides their legs. k = px per prop unit.
const DP_LAC = { hair: 'short', hat: 'feather', outfit: { kind: 'bare', col: '#7A4E2A', tattoo: '#2A3F5F' }, barefoot: true };
function dpCrew(x, y, k, t, list) {
  for (const [who, ux, uy, sz, o] of list) vsDollCast(who, x + ux * k, y + uy * k, sz * k, { t, shadow: false, item: null, ...o });
  flushBrush();
}   // outline px for props, so a big prop is not drawn with a rope-thick line

// a lac bird in profile, heading +x (beak), crest and tail feathers up; drawn in a local frame (c, dir, up)
function dpBird(D, c, dir, up, sz, col) {
  const P = [[16, 0], [8, -2], [5, -8], [3, -3], [-2, -4], [-9, -11], [-7, -3], [-20, -6], [-25, -1], [-19, 2], [-4, 4], [6, 3]];
  D.shape(P.map(([u, v]) => [c[0] + (u * dir[0] - v * up[0]) * sz, c[1] + (u * dir[1] - v * up[1]) * sz]), col, false);
}
function dpDrumTop(x, y, s, o = {}) {
  flushBrush();
  const D = dollPen(x, y, s / 200, dpOW), R = 100, a0 = o.rot || 0;
  const ring = (r, col = DP.bronzeDk, w = 1.6) => D.line(dollArc(0, 0, r, r, 0, TAU, 60), col, w);
  D.shape(dollEll(0, 0, R), DP.bronze);
  for (const r of [96, 90, 70, 64, 46, 40, 24]) ring(r);
  for (let i = 0; i < 64; i++) { const a = a0 + i / 64 * TAU; D.shape(dollEll(Math.cos(a) * 93, Math.sin(a) * 93, 1.3), DP.bronzeDk, false); }
  for (let i = 0; i < 36; i++) { const a = a0 + i / 36 * TAU; D.line(dollArc(Math.cos(a) * 43, Math.sin(a) * 43, 2.4, 2.4, 0, TAU, 10), DP.bronzeDk, 1.2); }
  for (let i = 0; i < 18; i++) {   // 18 lac birds flying counterclockwise between the 70 and 90 rings
    const a = a0 + i / 18 * TAU, cc = [Math.cos(a) * 80, Math.sin(a) * 80], dir = [Math.sin(a), -Math.cos(a)], up = [Math.cos(a), Math.sin(a)];
    dpBird(D, cc, dir, up, .55, DP.bronzeDk);
  }
  for (let i = 0; i < 12; i++) {   // people with feather crowns and stilt houses, alternating, in the 46-64 band
    const a = a0 + i / 12 * TAU, cx = Math.cos(a) * 55, cy = Math.sin(a) * 55, ux = Math.cos(a), uy = Math.sin(a), tx = -uy, tyy = ux;
    const at = (u, v) => [cx + u * tx + v * ux, cy + u * tyy + v * uy];
    if (i % 2) { D.line([at(-12, 6), at(-9, -4), at(9, -4), at(12, 6), at(-12, 6)], DP.bronzeDk, 1.6); D.line([at(-6, -4), at(-6, -9)], DP.bronzeDk, 1.2); D.line([at(6, -4), at(6, -9)], DP.bronzeDk, 1.2); }
    else { D.shape(dollEll(...at(0, 1), 2.4), DP.bronzeDk, false); for (const k of [-3, 0, 3]) D.line([at(k * .6, 3), at(k, 8)], DP.bronzeDk, 1.1); D.line([at(0, -1), at(0, -8)], DP.bronzeDk, 1.4); }
  }
  const star = []; for (let i = 0; i < 28; i++) { const a = a0 - Math.PI / 2 + i / 28 * TAU, r = i % 2 ? 7 : 24; star.push([Math.cos(a) * r, Math.sin(a) * r]); }
  D.shape(star, DP.bronzeLt, false); D.line([...star, star[0]], DP.bronzeDk, 1.4);
  for (let i = 0; i < 14; i++) { const a = a0 - Math.PI / 2 + (i + .5) / 14 * TAU; D.line([[Math.cos(a) * 10, Math.sin(a) * 10], [Math.cos(a) * 19, Math.sin(a) * 19]], DP.bronzeDk, 1); }
  D.line(dollArc(0, 0, 86, 86, 3.6, 4.5, 14), 'rgba(255,240,210,.5)', 3);
}
function dpDrumSide(x, y, s, o = {}) {
  flushBrush();
  const D = dollPen(x, y, s / 190, dpOW), t = o.t ?? 0;
  for (const sx of [-1, 1]) for (const dy of [0, 12]) D.line([[sx * 74, -104 + dy], [sx * 92, -98 + dy], [sx * 92, -84 + dy], [sx * 73, -80 + dy]], DP.bronzeDk, 5);
  const right = [[80, -130], [90, -108], [86, -90], [72, -76], [70, -58], [69, -42], [78, -22], [86, -4]];
  const body = [...right, ...dollArc(0, -4, 86, 12, 0, Math.PI, 16).slice(1, -1), ...right.slice().reverse().map(([a, b]) => [-a, b])];
  D.shape(body, DP.bronze);
  for (const [px, py, rx, ry] of [[-70, -100, 10, 14], [-58, -30, 12, 8], [-64, -62, 5, 9], [40, -16, 9, 5]]) D.shape(dollEll(px, py, rx, ry), DP.patina, false);
  for (const [yy, rx] of [[-112, 89], [-88, 84], [-76, 72], [-44, 70], [-26, 79]]) D.line(dollArc(0, yy, rx, 10, .08, Math.PI - .08, 18), DP.bronzeDk, 2.2);
  for (const bx of [-40, 22]) {   // two boats with feather-crowned rowers on the tang band
    D.shape([[bx - 26, -98], [bx + 22, -98], [bx + 30, -110], [bx + 25, -95], [bx + 18, -92], [bx - 20, -92], [bx - 30, -106]], DP.bronzeDk, false);
    for (const k of [-12, -2, 8]) { D.shape(dollEll(bx + k, -102, 2.2), DP.bronzeDk, false); D.line([[bx + k, -104], [bx + k + 2, -110]], DP.bronzeDk, 1.2); }
  }
  for (let px = -60; px <= 60; px += 20) D.line([[px, -73], [px, -47]], DP.bronzeDk, 1.6);
  for (let px = -50; px <= 50; px += 20) dpBird(D, [px, -60], [1, 0], [0, -1], .3, DP.bronzeDk);
  D.shape(dollEll(0, -130, 80, 13), DP.bronzeLt);
  const st = []; for (let i = 0; i < 28; i++) { const a = i / 28 * TAU, r = i % 2 ? 6 : 20; st.push([Math.cos(a) * r, -130 + Math.sin(a) * r * .16]); }
  D.shape(st, DP.bronzeDk, false);
  for (const rr of [44, 62]) D.line(dollArc(0, -130, rr, rr * .16, 0, TAU, 40), DP.bronzeDk, 1.4);
  if (o.hi > .02) D.line(dollArc(0, -100, 88, 10, .1, Math.PI - .1, 18), DP.red, 2 + 5 * o.hi);
  D.line([[58, -118], [66, -60]], 'rgba(255,240,210,.55)', 5);
  if (o.glow) glow(x, y - 130 * s / 190, s * .5, '#FFD27A', o.glow);
}
// Dong Son boat as drawn on the drums: crescent hull, both ends swept high, a bird-head prow, feather-crowned crew, a little drum
function dpBoatDongSon(x, y, s, o = {}) {
  flushBrush();
  const D = dollPen(x, y, s / 280, dpOW), t = o.t ?? 0, bob = 2 * Math.sin(t * 2.4);
  const hull = [[-104, -26 + bob], [-128, -88 + bob], [-118, -92 + bob], [-96, -44 + bob], [96, -44 + bob], [120, -94 + bob], [140, -98 + bob], [146, -90 + bob], [130, -86 + bob], [108, -26 + bob], [80, -6 + bob], [-76, -6 + bob]];
  for (let i = 0; i < 4; i++) { const ox = -60 + i * 38, sw = 8 * Math.sin(t * 3 + i); D.line([[ox, -40 + bob], [ox - 18 + sw, 6]], DP.woodDk, 5); }
  dpCrew(x, y, D.k, t, [['lac', -72, -38 + bob, 62, { spec: DP_LAC }], ['lac', -36, -38 + bob, 62, { spec: DP_LAC }], ['lac', 40, -38 + bob, 62, { spec: DP_LAC, item: 'spear' }], ['lac', 76, -38 + bob, 62, { spec: DP_LAC }]]);
  D.shape(hull, DP.wood);
  D.line([[-96, -36 + bob], [100, -36 + bob]], DP.woodLt, 4);
  for (let i = -80; i <= 80; i += 12) D.shape(dollEll(i, -22 + bob, 2.2), DP.woodDk, false);
  D.shape([[120, -94 + bob], [140, -112 + bob], [152, -110 + bob], [140, -98 + bob]], DP.wood);
  D.shape(dollEll(141, -103 + bob, 2), DP.ink, false);
  for (const sx of [-1, 0]) D.shape([[-128 + sx * 6, -88 + bob], [-140 + sx * 6, -112 + bob], [-124 + sx * 6, -96 + bob]], DP.woodLt);
  D.shape(dollRR(-12, -66 + bob, 24, 22, 4), DP.bronze);
  vsDollWater(D, t);
}
function vsDollWater(D, t) {
  for (let i = -3; i <= 3; i++) { const wx = i * 52 + 10 * Math.sin(t * 1.5 + i); D.line(dollArc(wx, 4, 16, 5, Math.PI, 2 * Math.PI, 8), DP.waterDk, 4); }
}
function dpCanoe(x, y, s, o = {}) {
  flushBrush();
  const D = dollPen(x, y, s / 220, dpOW), bob = 2 * Math.sin((o.t ?? 0) * 2.4);
  if (o.crew) dpCrew(x, y, D.k, o.t ?? 0, [[o.crew, -10, -27 + bob, 62, { item: o.crew === 'soldier' ? 'spear' : 'staff' }]]);
  D.shape([[-104, -30 + bob], [104, -30 + bob], [92, -12 + bob], [70, -4 + bob], [-70, -4 + bob], [-92, -12 + bob]], DP.wood);
  D.shape([[-92, -30 + bob], [92, -30 + bob], [84, -24 + bob], [-84, -24 + bob]], DP.woodDk, false);
  for (const k of [-50, 10, 60]) D.line([[k, -18 + bob], [k + 18, -16 + bob]], DP.woodDk, 2.5);
  vsDollWater(D, o.t ?? 0);
}
// Tran war boat (SUY ĐOÁN: no contemporary picture survives): long oared hull, a woven arched roof, painted eye on the bow, a pennant
function dpTranBoat(x, y, s, o = {}) {
  flushBrush();
  const D = dollPen(x, y, s / 300, dpOW), t = o.t ?? 0, bob = 2 * Math.sin(t * 2.4);
  for (let i = 0; i < 8; i++) { const ox = -100 + i * 28, sw = 10 * Math.sin(t * 4 + i * .5); D.line([[ox, -34 + bob], [ox - 22 + sw, 8]], DP.woodDk, 5); }
  dpCrew(x, y, D.k, t, [['soldier', -110, -48 + bob, 54, { item: 'spear' }], ['soldier', 64, -45 + bob, 54, {}], ['soldier', 116, -44 + bob, 54, {}]]);
  D.shape([[-140, -52 + bob], [140, -46 + bob], [150, -60 + bob], [158, -58 + bob], [126, -10 + bob], [-120, -10 + bob], [-150, -60 + bob]], DP.wood);
  D.shape([[-140, -46 + bob], [140, -40 + bob], [132, -30 + bob], [-130, -34 + bob]], DP.red);
  D.shape([...dollArc(-10, -50 + bob, 70, 34, Math.PI, 2 * Math.PI, 18)], DP.straw);
  for (let k = -70; k <= 50; k += 15) D.line([[k, -52 + bob], [k + 4, -78 + bob + Math.abs(k + 10) * .3]], '#B5994F', 2);
  D.shape(dollEll(128, -34 + bob, 7, 5), DP.white); D.shape(dollEll(129, -34 + bob, 3), DP.ink, false);
  D.line([[100, -46 + bob], [100, -132 + bob]], DP.woodDk, 4);
  const fw = 4 * Math.sin(t * 6);
  D.shape([[100, -132 + bob], [140, -124 + bob + fw], [100, -112 + bob]], DP.red);
  vsDollWater(D, t);
}
// Yuan tower ship (lau thuyen): high stern castle, windows, two masts with battened mat sails
function dpYuanJunk(x, y, s, o = {}) {
  flushBrush();
  const D = dollPen(x, y, s / 300, dpOW), t = o.t ?? 0, bob = 2 * Math.sin(t * 2);
  D.shape([[-160, -140 + bob], [-88, -140 + bob], [-88, -64 + bob], [120, -64 + bob], [156, -98 + bob], [132, -10 + bob], [-126, -10 + bob], [-160, -64 + bob]], '#5B4636');
  D.line([[-160, -128 + bob], [-88, -128 + bob]], '#7A6048', 4);
  for (const wx of [-148, -122]) D.shape(dollRR(wx, -116 + bob, 16, 16, 2), '#2E2620');
  for (let wx = -70; wx <= 100; wx += 28) D.shape(dollRR(wx, -48 + bob, 14, 12, 2), '#2E2620');
  for (const [mx, h] of [[0, 190], [84, 145]]) {
    D.line([[mx, -64 + bob], [mx, -60 - h + bob]], DP.woodDk, 6);
    const sail = [[mx - 50, -80 - h * .1 + bob], [mx + 50, -80 - h * .1 + bob], [mx + 44, -55 - h + bob], [mx - 44, -60 - h + bob]];
    D.shape(sail, DP.sail);
    for (let k = 1; k < 6; k++) { const f = k / 6; D.line([[mx - 50 + 6 * f, -80 - h * .1 - (h * .9 - 20) * f + bob], [mx + 50 - 6 * f, -80 - h * .1 - (h * .9 - 25) * f + bob]], '#9C8457', 3); }
  }
  dpCrew(x, y, D.k, t, [['mongol', -50, -64 + bob, 54, { item: 'spear' }], ['mongol', 134, -78 + bob, 54, {}], ['mongol', -124, -140 + bob, 54, {}]]);
  vsDollWater(D, t);
}
// Bach Dang stakes: sharpened wooden stakes driven into the river bed, showing at low tide
function dpStakes(x, y, s, o = {}) {
  flushBrush();
  const D = dollPen(x, y, s / 240, dpOW);
  for (let i = 0; i < 6; i++) {
    const sx = -100 + i * 40, lean = (i % 2 ? 8 : -6), h = 70 + (i % 3) * 14;
    D.shape([[sx - 8, 0], [sx + 8, 0], [sx + 7 + lean * .6, -h + 14], [sx + lean, -h], [sx - 7 + lean * .6, -h + 14]], DP.wood);
    D.line([[sx - 6 + lean * .5, -h + 16], [sx + 6 + lean * .5, -h + 16]], DP.woodDk, 3);
  }
  D.shape([[-130, -12], [130, -12], [130, 4], [-130, 4]], 'rgba(127,179,200,.75)', false);
  vsDollWater(D, o.t ?? 0);
}
// a bow, an arrow with a bronze head and fletching, and a basket quiver: the parts on their own
function dpBowSet(x, y, s) {
  flushBrush();
  const D = dollPen(x, y, s / 200, dpOW);
  D.line([[-60, -190], [-76, -150], [-80, -100], [-76, -50], [-60, -10]], DP.woodDk, 9); D.line([[-60, -190], [-76, -150], [-80, -100], [-76, -50], [-60, -10]], DP.woodLt, 4);
  D.line([[-60, -190], [-60, -10]], '#EDE6D6', 2);
  D.shape(dollRR(-86, -112, 12, 24, 4), DP.red);
  D.line([[-20, -40], [-20, -175]], DP.woodLt, 4);
  D.shape([[-20, -190], [-14, -172], [-26, -172]], DP.bronze);
  for (const sx of [-1, 1]) D.shape([[-20, -52], [-20 + sx * 9, -44], [-20 + sx * 9, -34], [-20, -40]], DP.red);
  D.shape([[30, -10], [62, -10], [68, -120], [24, -120]], DP.straw);
  for (let k = -100; k <= -30; k += 18) D.line([[28, k], [64, k]], '#B5994F', 2.5);
  for (const [ax, ay] of [[34, -150], [46, -158], [58, -148]]) { D.line([[ax, -118], [ax, ay]], DP.woodLt, 4); D.shape([[ax, ay - 14], [ax + 5, ay], [ax - 5, ay]], DP.bronze); }
}
// the Co Loa crossbow: wooden stock, prod, string, the bronze trigger (lay no) found at Co Loa, a bronze-tipped bolt
function dpCrossbowSet(x, y, s) {
  flushBrush();
  const D = dollPen(x, y, s / 200, dpOW);
  D.shape(dollRR(-90, -70, 170, 16, 6), DP.wood);
  D.line([[-80, -130], [-70, -95], [-68, -62], [-70, -30], [-80, 6]], DP.woodDk, 10); D.line([[-80, -130], [-70, -95], [-68, -62], [-70, -30], [-80, 6]], DP.woodLt, 4.5);
  D.line([[-80, -130], [10, -64], [-80, 6]], '#EDE6D6', 2);
  D.shape([[4, -54], [24, -54], [26, -36], [16, -24], [8, -36]], DP.bronze);
  D.shape(dollEll(14, -46, 3), DP.bronzeDk, false);
  D.line([[10, -74], [-104, -74]], DP.woodLt, 4); D.shape([[-120, -74], [-104, -80], [-104, -68]], DP.bronze);
}
// held items for vsDollCast: a drawn bow that looses an arrow from the bow itself, and a crossbow at the shoulder
const DP_ITEMS = {
  bowdraw(D, c) {
    const p = (c.t % 1.6) / 1.6, pull = p < .55 ? Math.sin(p / .55 * Math.PI / 2) : p < .6 ? 1 - (p - .55) / .05 : 0;
    const gx = -90, gy = -66, top = [-72 + 12 * pull, -150], bot = [-72 + 12 * pull, 18], nock = [-72 + 64 * pull, gy];
    D.line([top, [gx + 2, -110], [gx, gy], [gx + 2, -22], bot], DP.woodDk, 9); D.line([top, [gx + 2, -110], [gx, gy], [gx + 2, -22], bot], DP.woodLt, 4);
    D.line([top, nock, bot], '#8C8378', 2);
    const fly = p < .58 ? 0 : (p - .58) * 900, tail = nock[0] - fly, head = tail - 96;
    if (p < .58 || head > -420) {
      D.line([[tail, gy], [head + 10, gy]], DP.woodLt, 4); D.shape([[head, gy], [head + 14, gy - 5], [head + 14, gy + 5]], DP.bronze);
      for (const sy of [-1, 1]) D.shape([[tail, gy], [tail + 10, gy + sy * 8], [tail + 16, gy + sy * 8], [tail + 8, gy]], DP.red);
    }
    D.shape(dollEll(gx, gy, 9), DOLL.white); D.shape(dollEll(nock[0] + 4, gy, 9), DOLL.white);
  },
  crossbow(D, c) {
    const p = (c.t % 1.6) / 1.6, kick = p > .5 && p < .58 ? 4 : 0;
    D.rot(-.04, 0, -60);
    D.shape(dollRR(-86 + kick, -66, 150, 14, 6), DP.wood);
    D.line([[-80 + kick, -98], [-70 + kick, -80], [-68 + kick, -59], [-70 + kick, -38], [-80 + kick, -20]], DP.woodDk, 9); D.line([[-80 + kick, -98], [-70 + kick, -80], [-68 + kick, -59], [-70 + kick, -38], [-80 + kick, -20]], DP.woodLt, 4);
    const loaded = p < .5 || p > .9, sx = loaded ? 10 : -64;
    D.line([[-80 + kick, -98], [sx + kick, -62], [-80 + kick, -20]], '#8C8378', 1.6);
    D.shape([[2, -52], [20, -52], [22, -36], [12, -26], [6, -36]], DP.bronze);
    const fly = loaded ? 0 : (p - .5) * 1400;
    if (loaded || fly < 600) { D.line([[8 - fly, -70], [-94 - fly, -70]], DP.woodLt, 4); D.shape([[-108 - fly, -70], [-94 - fly, -76], [-94 - fly, -64]], DP.bronze); }
    D.rot(0);
    D.shape(dollEll(14, -42, 9), DOLL.white); D.shape(dollEll(-40, -52, 9), DOLL.white);
  }
};
// a props sheet page with captions
function dpCaption(txt, x, y, fs = 26) { letter(txt, x, y, fs, '#1E1E1E', { ink: false, font: `600 ${fs}px "Helvetica Neue", Arial, sans-serif` }); }
