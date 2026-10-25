// vs_c12.js: chương 12, Đổi mới đến nay (scenes 85-91).

// ---------- 85: the 1980s: a queue at a state shop with ration coupons, a bowl of rice mixed with sweet potato ----------
scene('85', (t, lt, dur, S) => {
  vsCam(lt, dur, { x0: 540, y0: 1110, z0: 1.0, x1: 520, y1: 1090, z1: 1.1 });
  vsSky('grey', { key: 'sky' }); vsCloud(250, 330, 120, { key: 'c1' });
  vsShopRow(560, 1140, 1330, { key: 'cg', n: 3 });
  paint(rectPts(-100, 1330, 1300, 1300), { wash: '#B8A890', washOp: 255, ink: DH.ink, sw: 1.3 });
  const q = span(lt, cue(S, 'xếp', 0, 5.6) - 1.6, cue(S, 'phiếu', 0, 6.5));
  for (let i = 0; i < 7; i++) { const k = clamp(q * 1.4 - i * .1); vsMini(lerp(-80, 880 - i * 105, k), 1440 + (i % 2) * 14, 21, { key: `qu${i}`, t, ph: i, moving: k > 0 && k < 1, col: [DH.brown, DH.greyDk, DH.indigoDk][i % 3], hat: 'nonla', hold: 'none', skin: SKIN.tan, bob: .3 }); paint(rectPts(lerp(-80, 880 - i * 105, k) + 28, 1440 + (i % 2) * 14 - 98, 20, 26), { wash: DH.white, washOp: 255, ink: DH.ink, sw: .8 }); }
  nguoi(180, 1420, 46, { who: 'farmerW', t, holdR: 'bowl', aR: 1.3, mouth: 'sad', brow: 'sad', boilKey: 'bw' });
  camEnd();
});

// ---------- 86: Congress opens a great door; people walk out into the fields and the market ----------
scene('86', (t, lt, dur, S) => {
  vsCam(lt, dur, { x0: 540, y0: 1110, z0: 1.0, x1: 540, y1: 1090, z1: 1.08 });
  vsBackdrop({ sky: 'dawn', sunX: 540, sunY: 560, sunR: 120, rh: 960, seed: 551, land: '#86B565', land2: '#B7C77C', fore: false });
  const open = span(lt, cue(S, 'đổi', 0, 3.6) - .4, cue(S, 'mới', 0, 3.9) + 1.0);
  glow(540, 1050, 520 * open, '#FFE7A0', .6 * open);
  paint(rectPts(190, 620, 700, 760), { wash: '#FFF1C2', washOp: 255, ink: DH.ink, sw: 3 });
  vsRice(220, 520, 1300, 3, { t, key: 'rc', ripe: .6, size: 1.0 }); vsShopRow(580, 880, 1380, { key: 'mk', n: 2, minH: 150, rangeH: 100 });
  const w = 350 * (1 - open);
  paint(rectPts(190, 620, w, 760), { wash: DH.red, washOp: 255, fill: DH.redDk, fillOp: 60, ink: DH.ink, sw: 2.4 });
  paint(rectPts(890 - w, 620, w, 760), { wash: DH.red, washOp: 255, fill: DH.redDk, fillOp: 60, ink: DH.ink, sw: 2.4 });
  paint(ellPts(190 + w - 20, 1000, 14, 14, 8), { wash: DH.gold, ink: DH.ink, sw: 1 });
  const out = span(lt, cue(S, 'cho', 0, 4.4), dur);
  for (let i = 0; i < 6; i++) { const k = clamp(out * 1.4 - i * .12), tx = i % 2 ? 860 + (i >> 1) * 20 : 90 + (i >> 1) * 70; vsMini(lerp(540, tx, k), 1450 + (i % 3) * 24, 22, { key: `ou${i}`, t, ph: i, moving: k > 0 && k < 1, col: [DH.brown, DH.indigo, DH.green][i % 3], hat: 'nonla', dir: i % 2 ? 1 : -1 }); }
  camEnd();
});

// ---------- 87: ripe paddies, sacks of rice loaded onto a ship for export ----------
scene('87', (t, lt, dur, S) => {
  vsCam(lt, dur, { x0: 540, y0: 1110, z0: 1.0, x1: 600, y1: 1090, z1: 1.08 });
  vsBackdrop({ sky: 'day', sunX: 880, sunY: 340, rh: 940, seed: 561, land: '#B9C06A', land2: '#C9C870', fore: false });
  vsWater(1170, 1300, { t, key: 'rv', speed: 18, col: DH.water });
  vsSteamship(820, 1290, 520, { t, key: 'ss', dir: 1 });
  vsRice(-100, 1180, 1380, 3, { t, key: 'rc', ripe: 1, size: 1.4 });
  nguoi(250, 1470, 44, { who: 'farmer', t, aR: 1.0 + .4 * Math.sin(t * 3), holdR: 'sheaf', mouth: 'smile', boilKey: 'f1' });
  nguoi(480, 1480, 44, { who: 'farmerW', t, aR: 1.0 + .4 * Math.sin(t * 3 + 1), mouth: 'smile', boilKey: 'f2' });
  const sacks = span(lt, cue(S, 'đem', 0, 4.8), cue(S, 'tấn', 0, 6.6));
  for (let i = 0; i < 14; i++) if (sacks * 14 > i) vsSack(640 + (i % 5) * 62 + (Math.floor(i / 5) % 2) * 30, 1480 - Math.floor(i / 5) * 56, 90, { key: `sk${i}`, col: DH.white });
  camEnd();
});

// ---------- 88: ASEAN, the US, the WTO: more and more flags, and a round gate opens onto the world ----------
scene('88', (t, lt, dur, S) => {
  vsCam(lt, dur, { x0: 540, y0: 1110, z0: 1.0, x1: 540, y1: 1090, z1: 1.08 });
  vsBackdrop({ sky: 'day', sunX: 880, sunY: 320, rh: 980, seed: 571, land: '#86B565', land2: '#B7C77C', fore: false });
  const cols = [DH.indigo, DH.white, DH.green, DH.yellow, DH.orange, DH.pink, DH.sky, DH.tan];
  const n = Math.round(8 * span(lt, cue(S, 'asean', 0, 3.2) - .5, cue(S, 'mỹ', 0, 6.4)));
  for (let i = 0; i < 8; i++) if (i < n) vsBanner(80 + i * 130, 1390, 330, { w: 90, fh: 64, col: cols[i], key: `ff${i}`, t, ph: i });
  vsBanner(540, 1400, 540, { w: 300, fh: 200, kind: 'vn', key: 'vn', t });
  const wto = span(lt, cue(S, 'tổ', 0, 8.3), cue(S, 'giới', 0, 9.7));
  if (wto > 0) {
    paint(ellPts(540, 760, 260 * wto, 260 * wto, 36), { wash: '#2F6FB0', washOp: 255, ink: DH.ink, sw: 3 });
    paint(ellPts(500, 740, 110 * wto, 70 * wto, 14), { wash: DH.green, washOp: 255, ink: null }); paint(ellPts(610, 820, 80 * wto, 60 * wto, 14), { wash: DH.green, washOp: 255, ink: null });
    glow(540, 760, 420 * wto, '#FFE7A0', .45 * wto);
  }
  camEnd();
});

// ---------- 89: modern Hà Nội: towers beside the Temple of Literature, a metro train over the old quarter ----------
scene('89', (t, lt, dur, S) => {
  vsCam(lt, dur, { x0: 540, y0: 1110, z0: 1.0, x1: 540, y1: 1090, z1: 1.08 });
  vsSky('day', { key: 'sky' }); vsSun(880, 330, 80, { t, key: 'sun' }); vsCloud(220, 360, 110, { key: 'c1' });
  vsSkyline(-20, 1100, 1250, { key: 'hn', t, n: 8 });
  vsShopRow(-40, 1140, 1440, { key: 'oq', n: 8 });
  vsBridgeTrack(-100, 1300, 1110, { key: 'tr' });
  const go = clamp((lt - cue(S, 'tàu', 0, 4.6)) / 3.6);
  vsTrain(lerp(-1100, 1200, ease(go)), 1110, 360, { key: 'mt' });
  vsPavilion(300, 1470, 300, { key: 'vm' });
  paint(rectPts(-100, 1470, 1300, 1000), { wash: '#B8A890', washOp: 255, ink: DH.ink, sw: 1.3 });
  const phone = span(lt, cue(S, 'nhắn', 0, 5.5), cue(S, 'bè', 0, 6.9) + .5);
  for (let i = 0; i < 4; i++) { vsMini(560 + i * 120, 1560, 20, { key: `pp${i}`, t, col: [DH.red, DH.indigo, DH.green, DH.yellow][i], hat: 'none', cheer: phone > 0 ? .8 : 0 }); if (phone > 0) paint(ellPts(560 + i * 120, 1380 - 20 * phone, 26 * phone, 20 * phone, 10), { wash: DH.white, washOp: 255, ink: DH.ink, sw: 1.2 }); }
  camEnd();
});

// ---------- 90: the stakes in the river, the elders of Diên Hồng, flag-bearers growing in number ----------
scene('90', (t, lt, dur, S) => {
  vsCam(lt, dur, { x0: 540, y0: 1110, z0: 1.0, x1: 540, y1: 1090, z1: 1.1 });
  vsBackdrop({ sky: 'dusk', sunX: 540, sunY: 480, sunR: 110, rh: 960, seed: 581, land: '#7A8E64', land2: '#8FA070', fore: false });
  vsWater(1180, 1330, { t, key: 'rv', speed: 18, col: DH.water });
  const stk = span(lt, cue(S, 'cọc', 0, 7.8) - 1.0, cue(S, 'đằng', 0, 8.9));
  vsStakes(100, 980, 1320, 14, { key: 'st', show: stk, h: 200 });
  const eld = span(lt, cue(S, 'cụ', 0, 9.6) - .6, cue(S, 'diên', 0, 10.0) + .4);
  [0, 1, 2].forEach(i => { if (eld > 0) nguoi(300 + i * 240, 1410, 36, { who: 'elder', t, aR: lerp(.3, 3.14, eld), holdR: 'staff', boilKey: `el${i}`, hair: i % 2 ? 'none' : 'white' }); });
  const crowd = span(lt, cue(S, 'dân', 0, 5.0), dur);
  vsCrowd(-40, 1120, 1500, 1620, Math.round(3 + 40 * crowd), 17, t, { hold: 'flag', flag: DH.red, flagStar: true, cheer: true, seed: 23 });
  camEnd();
});

// ---------- 91: the bronze drum in a Hà Nội museum case; the star at its centre glows; a child and an elder look on ----------
scene('91', (t, lt, dur, S) => {
  vsCam(lt, dur, { x0: 540, y0: 1090, z0: 1.0, x1: 540, y1: 1060, z1: 1.08 });
  vsSky('cave', { key: 'sky' });
  paint(rectPts(-200, -300, 1480, 2000), { wash: '#5A4A3E', washOp: 255, ink: null });
  paint(rectPts(-200, 1460, 1480, 1000), { wash: '#3A2C24', washOp: 255, ink: DH.ink, sw: 1.3 });
  glow(540, 880, 640, '#FFE7A0', .3);
  paint(rectPts(160, 480, 760, 980), { wash: '#BFD6E0', washOp: 70, ink: DH.ink, sw: 4 });
  paint(rectPts(160, 1380, 760, 80), { wash: DH.brownDk, washOp: 255, ink: DH.ink, sw: 1.5 });
  const star = span(lt, cue(S, 'ngôi', 0, 4.1), cue(S, 'sao', 0, 5.2) + .6);
  vsDrumTop(540, 900, 300, { rot: t * .06, figs: true, glow: .4 + .5 * star, key: 'drum' });
  const look = span(lt, cue(S, 'cùng', 0, 4.2) - 1.2, cue(S, 'cùng', 0, 4.2) + .3);
  nguoi(lerp(1300, 760, look), 1560, 30, { who: 'boy', t, flip: true, walk: look > 0 && look < 1 ? t * 1.6 : null, lookX: -.3, boilKey: 'kid' });
  nguoi(lerp(1500, 900, look), 1590, 42, { who: 'elder', t, flip: true, walk: look > 0 && look < 1 ? t * 1.4 : null, lookX: -.3, boilKey: 'old' });
  camEnd();
});
