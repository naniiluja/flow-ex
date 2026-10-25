// vs_c01.js: chương 1, Tiền sử (scenes 01-07). Feet line ≈ 1150-1210; captions sit at y 1250-1400, so faces stay above ~1050.
// Heroes are drawn at u ≈ 50 (about 450 px tall); the lower third is filled with foreground (vsFore) rather than left bare.

// ---------- 01: the hook. The S-shaped land at dawn; an empty throne, sound, and a flag appear as the words name them ----------
scene('01', (t, lt, dur, S) => {
  const rise = span(lt, 0, 3.4);
  vsSky('dawn', { key: 'sky' });
  vsCam(lt, dur, { x0: 540, y0: 1000, z0: 1.0, x1: 470, y1: 960, z1: 1.16 });
  vsSun(600, lerp(980, 500, rise), 170, { t, key: 'sun' });
  vsCloud(170, 330, 140, { key: 'c1' }); vsCloud(930, 640, 120, { key: 'c2', ph: 2 }); vsCloud(240, 820, 100, { key: 'c3', ph: 4, op: 230 });
  vsBirds(780, 360, 5, 15, t);
  paint(rectPts(560, 560, 1000, 1700), { wash: DH.water, washOp: 255, fill: DH.skyDk, fillOp: 70, bleed: .4, ink: null });
  vsWater(560, 1900, { t, key: 'sea', speed: 14 });
  vsMapVN(20, 560, 1280, { key: 'map', neighbors: true });
  const throneK = span(lt, cue(S, 'quan', 0, 3.1), cue(S, 'quan', 0, 3.1) + .5);
  if (throneK > 0) vsThrone(350, 820, 200 * throneK, { key: 'th' });
  const ripple = lt - cue(S, 'tiếng', 0, 6.1);
  if (ripple > 0) vsRipples(520, 1290, 380, ripple * .45, { key: 'rp' });
  const flagK = span(lt, cue(S, 'việt', 0, 5.3), cue(S, 'việt', 0, 5.3) + .6);
  if (flagK > 0) vsBanner(390, 1190 + (1 - flagK) * 120, 330 * flagK, { t, kind: 'vn', key: 'flag' });
  camEnd();
  if (lt > dur - .6) iris(540, 1000, lerp(1700, 0, easeIn(seg(lt, dur - .6, dur - .02))), DH.ink);
});

// ---------- 02: the cave. Fire, a man knapping a stone axe, a woman with a bowl, a basket of snails, a hunter's spear ----------
function caveBackdrop() {
  vsSky('cave', { key: 'cave' });
  for (let i = 0; i < 9; i++) paint(ellPts(120 + i * 130, 500 + hash(i) * 500, 140, 90, 14), { fill: '#7A5A42', fillOp: 55, bleed: .4, tex: .8, ink: null });
  paint(ellPts(840, 520, 330, 440, 28, 3), { wash: '#A7D1DC', washOp: 255, ink: DH.ink, sw: 2.4 });
  paint([[520, 880], [700, 600], [860, 740], [1010, 520], [1200, 760], [1200, 980], [520, 980]], { wash: '#6E9B6E', washOp: 255, curv: .25, ink: null });
  vsTree(980, 900, 240, { key: 'cavetree' });
  const pts = [[-40, -20]]; for (let i = 0; i <= 10; i++) pts.push([i * 110, 90 + hash(i * 3) * 220 * (i % 2 ? 1 : .4)]); pts.push([W + 60, -20]);
  paint(pts, { wash: '#2A1D18', washOp: 255, ink: DH.ink, sw: 1.6, curv: .05 });
  vsLand(1190, '#6B4A35', { key: 'floor', amp: 4 });
  vsFore(1380, '#6B4A35', { key: 'fore', rocks: true, seed: 4, tuft: '#3A2A22' });
}
scene('02', (t, lt, dur, S) => {
  vsCam(lt, dur, { x0: 540, y0: 1000, z0: 1.03, x1: 520, y1: 980, z1: 1.1 });
  caveBackdrop();
  glow(450, 1060, 700, '#FF9A3C', .5);
  vsFire(450, 1190, 82, t, { key: 'fire', glow: .9 });
  const strike = lt > cue(S, 'đập', 0, 3), sw = Math.sin(t * TAU * 1.5), a = 1.9 + .75 * sw;
  nguoi(230, 1190, 52, { who: 'caveman', t, aR: strike ? a : 1.1, aL: 1.1, holdR: 'axe', lookX: .5, mouth: 'smile', boilKey: 'cm' });
  vsRock(370, 1190, 38, { key: 'stone', col: '#8F867A' });
  if (strike && sw < -.85) paint(starPts(372, 1110, 22, .4, 6), { wash: DH.yellow, ink: DH.ink, sw: .5 });
  nguoi(660, 1190, 52, { who: 'cavewoman', t, flip: true, aR: 1.2, holdR: 'bowl', lookX: -.5, boilKey: 'cw' });
  const shells = span(lt, cue(S, 'ốc', 0, 4.8), cue(S, 'ốc', 0, 4.8) + .5);
  paint([[800, 1190], [815, 1110], [945, 1110], [960, 1190]], { wash: '#B9714A', washOp: 255, curv: .2, ink: DH.ink, sw: 1.2 });
  for (let i = 0; i < 8; i++) if (i < shells * 8) vsShell(830 + (i % 4) * 34, 1112 - Math.floor(i / 4) * 5, 20);
  const hunt = span(lt, cue(S, 'săn', 0, 6), cue(S, 'săn', 0, 6) + 1.2);
  if (hunt > 0) nguoi(lerp(1300, 1000, hunt), 1190, 50, { who: 'caveman', flip: true, t, holdR: 'spear', aR: 2.3, walk: hunt < 1 ? t * 1.3 : null, skin: 'dark', hair: 'long', boilKey: 'hunter' });
  camEnd();
  if (lt < .6) iris(540, 1000, lerp(0, 1700, easeOut(lt / .6)), DH.ink);
});

// ---------- 03: grind, pot, sow, settle ----------
scene('03', (t, lt, dur, S) => {
  const gy = 1170;
  vsSky('day', { key: 'sky' });
  vsCam(lt, dur, { x0: 540, y0: 980, z0: 1.02, x1: 580, y1: 960, z1: 1.12 });
  vsSun(880, 330, 100, { t, key: 'sun' }); vsCloud(260, 300, 120, { key: 'c1' });
  vsRidge(940, 280, '#8CA58F', { kind: 'karst', seed: 3, key: 'r1' }); vsRidge(1010, 130, '#6F9A6A', { kind: 'hill', seed: 7, key: 'r2' });
  vsLand(1000, '#7CAE5F', { key: 'g1' });
  const hut = span(lt, cue(S, 'dựng', 0, 7), cue(S, 'dựng', 0, 7) + .8);
  if (hut > 0) vsHut(860, 1040, 340 * backOut(hut), { key: 'hut' });
  vsWater(1235, 1345, { t, key: 'stream', speed: 24 });
  vsLand(1345, '#8DBA6B', { key: 'g2', amp: 6 });
  vsFore(1500, '#8DBA6B', { key: 'fore', seed: 6, n: 11 });
  const sow = lt > cue(S, 'trồng', 0, 2.9);
  vsRice(60, 480, 1110, Math.floor(span(lt, cue(S, 'trồng', 0, 2.9) + .6, dur) * 3) + (sow ? 1 : 0), { t, key: 'rice', size: 1.3 });
  const aRw = sow ? 1.6 + .6 * Math.sin(t * 6) : .5;
  nguoi(250, gy, 52, { who: 'cavewoman', t, aR: aRw, aL: .6, holdR: sow ? null : 'axe', lookX: .3, boilKey: 'w1' });
  // seeds leave the sowing hand itself (nguoiHand), wherever the swinging arm has put it this frame
  const sowHand = nguoiHand(250, gy, 52, { who: 'cavewoman', aR: aRw }, 1);
  if (sow) for (let i = 0; i < 6; i++) { const k = frac(t * 2 + i / 6), [px, py] = arcPt(sowHand, [sowHand[0] + 90 + i * 16, 1170], 70, k); paint(ellPts(px, py, 8, 6, 8), { wash: DH.yellow, ink: DH.ink, sw: .6 }); }
  const pot = span(lt, cue(S, 'nặn', 0, 3), cue(S, 'nặn', 0, 3) + 2.2);
  paint(rectPts(560, gy - 90, 150, 90), { wash: '#B9976A', washOp: 255, ink: DH.ink, sw: 1.2 });
  nguoi(635, gy - 90, 48, { who: 'farmer', hat: 'none', hair: 'short', t, aR: 1.1 + .4 * Math.sin(t * 4), aL: 1.1, noShadow: true, outfit: { kind: 'bare', col: DH.brownDk }, boilKey: 'potter' });
  if (pot > 0) vsPot(635, gy - 90, 92 * (.4 + .6 * pot), { key: 'pot' });
  camEnd();
});

// ---------- 04: a village forms; people carry earth baskets to raise the dyke; the chief points ----------
scene('04', (t, lt, dur, S) => {
  vsSky('day', { key: 'sky' });
  vsCam(lt, dur, { x0: 560, y0: 980, z0: 1.02, x1: 520, y1: 960, z1: 1.12 });
  vsSun(900, 300, 90, { t, key: 'sun' });
  vsRidge(900, 260, '#8CA58F', { kind: 'karst', seed: 11, key: 'r1' }); vsRidge(985, 120, '#6F9A6A', { kind: 'hill', seed: 4, key: 'r2' });
  vsLand(1000, '#86B565', { key: 'g1' });
  const huts = Math.floor(span(lt, cue(S, 'làng', 0, 1.2), cue(S, 'làng', 1, 3.2) + .6) * 6) + 1;
  [[130, 1040, 240], [370, 1050, 260], [620, 1040, 240], [850, 1050, 255], [1040, 1040, 230], [-40, 1055, 220]].forEach(([x, y, s], i) => { if (i < huts) vsStilt(x, y, s * backOut(clamp(huts - i)), { key: `h${i}` }); });
  vsLand(1190, '#9CC36F', { key: 'g2', amp: 5 });
  vsFore(1460, '#9CC36F', { key: 'fore', seed: 5 });
  const dyke = span(lt, cue(S, 'đắp', 0, 4.5), dur - .5);
  paint([[430, 1420], [600, 1420 - 80 * dyke], [800, 1420 - 140 * dyke], [1160, 1420 - 140 * dyke], [1300, 1420]], { wash: DH.earth, washOp: 255, fill: DH.brownDk, fillOp: 60, bleed: .3, curv: .25, ink: DH.ink, sw: 1.4 });
  nguoi(220, 1240, 54, { who: 'chieftain', t, aR: 1.9, holdL: 'staff', aL: .3, lookX: .6, mouth: 'open', talk: t * .6, boilKey: 'chief' });
  for (let i = 0; i < 5; i++) {
    const k = frac(t * .14 + i / 5), x = lerp(450, 1000, k), top = 1420 - 140 * dyke * clamp((x - 430) / 400);
    vsMini(x, top + 28, 26, { key: `p${i}`, t, ph: i, moving: true, col: [DH.brown, DH.indigo, DH.green][i % 3], hat: 'hair', dir: 1 });
    paint([[x - 30, top - 92], [x + 30, top - 92], [x + 20, top - 62], [x - 20, top - 62]], { wash: '#B9976A', washOp: 255, ink: DH.ink, sw: .8 });
  }
  camEnd();
});

// ---------- 05: casting bronze ----------
scene('05', (t, lt, dur, S) => {
  vsSky('dusk', { key: 'sky' });
  vsCam(lt, dur, { x0: 520, y0: 990, z0: 1.04, x1: 560, y1: 960, z1: 1.12 });
  vsRidge(980, 250, '#7B5B67', { kind: 'karst', seed: 21, key: 'r1' });
  vsLand(1080, '#6E4A38', { key: 'g1' });
  vsFore(1400, '#6E4A38', { key: 'fore', seed: 8, tuft: '#3A2A22' });
  const lit = span(lt, cue(S, 'nấu', 0, 2), cue(S, 'nấu', 0, 2) + 1.2), pour = span(lt, cue(S, 'rót', 0, 5), cue(S, 'rót', 0, 5) + 1.4);
  glow(500, 1020, 700 * (.4 + .6 * lit), '#FF9A3C', .6 * lit);
  vsFurnace(380, 1210, 340, t, { pour: lit > .5 ? pour : 0, key: 'fur' });
  nguoi(130, 1210, 50, { who: 'smith', t, aL: 1.9 + .5 * Math.sin(t * 5), aR: 1.3, holdL: 'fan', lookX: .6, boilKey: 's1' });
  const drumK = span(lt, cue(S, 'trống', 0, dur - 3), dur - .5);
  nguoi(900, 1210, 50, { who: 'smith', t, flip: true, aR: 1.5, aL: 1.0, lookX: -.5, mouth: 'open', talk: t * .5, boilKey: 's2' });
  if (drumK > 0) { glow(700, 1120 - 150 * drumK, 420 * drumK, '#FFD27A', .8); vsDrumSide(700, 1210 - 120 * drumK, 300 * (.5 + .5 * drumK), { key: 'dr' }); }
  camEnd();
});

// ---------- 06: the drum face, ring by ring ----------
scene('06', (t, lt, dur, S) => {
  vsSky('cave', { key: 'sky' });
  const star = span(lt, cue(S, 'ngôi', 0, .4), cue(S, 'ngôi', 0, .4) + .6);
  vsCam(lt, dur, { x0: 540, y0: 900, z0: 1.0, x1: 540, y1: 900, z1: 1.1 });
  const pulseOf = (a, b) => Math.max(0, Math.min(1, seg(lt, a, a + .3)) * (1 - seg(lt, b, b + .4)));
  vsDrumTop(540, 860, 480, { rot: lt * .12, figs: true, glow: .5 + .4 * star, key: 'drum',
    hiFigs: pulseOf(cue(S, 'người', 0, 2.2), cue(S, 'thuyền', 0, 3.4)), hiBoats: pulseOf(cue(S, 'thuyền', 0, 3.4), cue(S, 'chim', 0, 4.4)), hiBirds: pulseOf(cue(S, 'chim', 0, 4.4), cue(S, 'thời', 0, 6)) });
  camEnd();
});

// ---------- 07: villages along the river become a country ----------
scene('07', (t, lt, dur, S) => {
  vsSky('dawn', { key: 'sky' });
  vsCam(lt, dur, { x0: 400, y0: 980, z0: 1.05, x1: 680, y1: 960, z1: 1.05 });
  vsSun(520, 440, 130, { t, key: 'sun' }); vsCloud(160, 300, 130, { key: 'c1' }); vsCloud(940, 540, 110, { key: 'c2', ph: 3 });
  vsRidge(960, 270, '#8CA58F', { kind: 'karst', seed: 5, key: 'r1', pan: 120 }); vsRidge(1010, 120, '#6F9A6A', { kind: 'hill', seed: 8, key: 'r2' });
  vsLand(1010, '#86B565', { key: 'g1' });
  vsWater(1120, 1290, { t, key: 'river', speed: 30 });
  vsLand(1290, '#9CC36F', { key: 'g2', amp: 6 });
  vsFore(1500, '#9CC36F', { key: 'fore', seed: 3 });
  [[40, 1075, 230], [350, 1065, 240], [670, 1070, 230], [980, 1065, 240]].forEach(([x, y, s], i) => { vsStilt(x, y, s, { key: `n${i}` }); vsSmoke(x + 10, y - s * .8, 16, t, { key: `sm${i}`, n: 3 }); });
  [[190, 1370, 240], [520, 1380, 250], [830, 1370, 240]].forEach(([x, y, s], i) => vsHut(x, y, s, { key: `b${i}` }));
  vsCanoe(420, 1215, 320, { t, key: 'cn1', crew: 'farmer' }); vsCanoe(840, 1240, 300, { t, ph: 2, dir: -1, key: 'cn2', crew: 'farmer' });
  const flagK = span(lt, cue(S, 'nước', 0, 2.6), cue(S, 'nước', 0, 2.6) + .8);
  if (flagK > 0) vsBanner(600, 1390, 520 * flagK, { t, w: 260, fh: 180, kind: 'pennant', col: DH.red, key: 'bn' });
  const drumK = span(lt, cue(S, 'văn', 0, dur - 1.5), cue(S, 'văn', 0, dur - 1.5) + .6);
  if (drumK > 0) vsDrumTop(700, 560, 140 * drumK, { key: 'dtop', glow: .8, figs: false });
  camEnd();
});
