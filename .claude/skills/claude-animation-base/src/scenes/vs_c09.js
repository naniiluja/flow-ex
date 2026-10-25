// vs_c09.js: chương 9, Nhà Nguyễn và Pháp (scenes 63-68).

// ---------- 63: Gia Long on the throne at Huế, the map unrolled, the country named Việt Nam ----------
scene('63', (t, lt, dur, S) => {
  vsCam(lt, dur, { x0: 540, y0: 1130, z0: 1.0, x1: 540, y1: 1100, z1: 1.08 });
  vsBackdrop({ sky: 'dawn', sunX: 540, sunY: 420, sunR: 110, rh: 960, seed: 411, land: '#86B565', land2: '#9CC36F', fore: false });
  vsNgoMon(540, 1200, 760, { key: 'nm' });
  const crown = lt > cue(S, 'ngôi', 0, 4.9);
  vsThrone(400, 1440, 230, { key: 'th' });
  nguoi(400, 1440 - 23, 40, crown ? { who: 'giaLong', t, noShadow: true, aR: 1.3, boilKey: 'gl' } : { who: 'nguyenAnh', t, noShadow: true, boilKey: 'gl', hat: 'helmet', outfit: { kind: 'armor', col: DH.red, col2: DH.gold } });
  const map = span(lt, cue(S, 'tên', 0, 9.5) - .3, cue(S, 'nam', 0, 11.1));
  paint(rectPts(700, 1260, 300, 420 * Math.max(.02, ease(span(lt, cue(S, 'hai', 1, 8.9) - .5, cue(S, 'hai', 1, 8.9) + .6)))), { wash: '#F0E4C6', washOp: 255, ink: DH.ink, sw: 1.3 });
  if (map > 0) vsMapVN(712, 1282, 330 * map, { key: 'map', col: DH.red });
  camEnd();
});

// ---------- 64: French gunboats enter Đà Nẵng bay and fire on the shore ----------
scene('64', (t, lt, dur, S) => {
  vsCam(lt, dur, { x0: 540, y0: 1110, z0: 1.0, x1: 600, y1: 1090, z1: 1.1 });
  vsSky('dusk', { key: 'sky' }); vsSun(300, 560, 100, { t, key: 'sun' });
  vsRidge(980, 260, '#7A8E8A', { kind: 'range', seed: 421, key: 'r1' });
  vsWater(1160, 2400, { t, key: 'bay', speed: 22, col: '#5E86A0' });
  paint([[640, 2400], [640, 1240], [800, 1180], [1180, 1170], [1180, 2400]], { wash: '#A3AC78', washOp: 255, curv: .2, ink: DH.ink, sw: 1.5 });
  vsPalm(900, 1260, 330, { key: 'p1' }); vsHut(1020, 1330, 220, { key: 'h' });
  const come = span(lt, cue(S, 'tàu', 0, 1.6) - .5, cue(S, 'nổ', 0, 2.7) + .5);
  [[0, 160, 1380, 460], [1, -40, 1480, 360]].forEach(([i, x0, y, s]) => {
    const x = lerp(x0 - 500, x0 + 420, ease(come));
    vsSteamship(x, y, s, { t, key: `fs${i}`, ph: i, dir: 1 });
    vsSmoke(x - s * .1, y - s * .7, 80, t, { key: `fm${i}`, col: DH.greyDk });
  });
  const fire = lt > cue(S, 'nổ', 0, 2.7);
  if (fire) for (let i = 0; i < 3; i++) { const k = frac(t * 1.2 + i * .33); glow(820 + i * 120, 1250 - k * 40, 120 * (1 - k), '#FFC766', .9 * (1 - k)); vsSmoke(820 + i * 120, 1230, 60 + 40 * k, t, { key: `bm${i}` }); }
  camEnd();
});

// ---------- 65: the court signs treaties; the map turns red as land is ceded ----------
scene('65', (t, lt, dur, S) => {
  vsCam(lt, dur, { x0: 540, y0: 1100, z0: 1.0, x1: 540, y1: 1070, z1: 1.1 });
  vsSky('grey', { key: 'sky' });
  paint(rectPts(-200, -300, 1480, 2000), { wash: '#D9C49A', washOp: 255, ink: null });
  paint(rectPts(-200, 1450, 1480, 1000), { wash: '#8A5A3A', washOp: 255, ink: DH.ink, sw: 1.3 });
  const red = span(lt, cue(S, 'nhường', 0, 2.7), cue(S, 'quyền', 0, 7));
  paint(rectPts(640, 690, 380, 520), { wash: '#F0E4C6', washOp: 255, ink: DH.ink, sw: 2 });
  vsMapVN(672, 725, 440, { key: 'map', col: mixCol(DH.green, DH.red, red) });
  paint(rectPts(80, 1290, 520, 210), { wash: DH.brownDk, washOp: 255, ink: DH.ink, sw: 1.5 });
  paint(rectPts(180, 1252, 320, 44), { wash: DH.white, washOp: 255, ink: DH.ink, sw: 1 });
  const sign = span(lt, cue(S, 'ký', 0, 1.9), cue(S, 'ước', 0, 2.3) + 1.0);
  inkLine([[220, 1270], [220 + 220 * sign, 1274 + Math.sin(sign * 14) * 6]], 3, DH.ink, 'ink', .4);
  nguoi(300, 1400, 46, { who: 'king', t, aR: 1.0 + .3 * Math.sin(t * 6), holdR: 'brush', mouth: 'sad', brow: 'sad', lookX: .2, boilKey: 'vua' });
  nguoi(840, 1470, 40, { who: 'french', t, flip: true, mouth: 'smile', aR: .6, boilKey: 'fr' });
  camEnd();
});

// ---------- 66: the young king Hàm Nghi issues the Cần Vương edict; fires flare up across the highlands ----------
scene('66', (t, lt, dur, S) => {
  vsCam(lt, dur, { x0: 540, y0: 1110, z0: 1.0, x1: 540, y1: 1080, z1: 1.08 });
  vsSky('dusk', { key: 'sky' }); vsMoon(840, 420, 90, { t, key: 'mn' });
  vsRidge(960, 300, '#5E6A7A', { kind: 'range', seed: 431, key: 'r1' });
  vsRidge(1030, 160, '#3F5A50', { kind: 'hill', seed: 435, key: 'r2' });
  vsLand(1100, '#355A44', { key: 'g1' });
  const f = [cue(S, 'hương', 0, 5.9), cue(S, 'ba', 0, 6.6), cue(S, 'yên', 0, 7.2)];
  [[200, 1000], [540, 960], [900, 1010]].forEach(([x, y], i) => { const k = span(lt, f[i], f[i] + .5); if (k > 0) vsFire(x, y, 44 * k, t, { key: `fi${i}` }); });
  const rise = span(lt, cue(S, 'nước', 0, 3.4), cue(S, 'vua', 1, 4.5) + .5);
  for (let i = 0; i < 6; i++) { const k = clamp(rise * 1.3 - i * .1); if (k > 0) vsMini(lerp(i % 2 ? 1250 : -100, 120 + i * 160, k), 1450 + (i % 2) * 28, 19, { key: `cv${i}`, t, moving: k < 1, col: [DH.red, DH.indigo, DH.green][i % 3], hat: 'khan', hold: 'torch', dir: i % 2 ? -1 : 1 }); }
  const edict = span(lt, cue(S, 'xuống', 0, 1.8), cue(S, 'chiếu', 0, 2.1) + .5);
  nguoi(540, 1350, 40, { who: 'hamNghi', t, aR: lerp(.3, 3.14, edict), holdR: edict > 0 ? 'scroll' : undefined, mouth: edict > .5 ? 'shout' : 'flat', boilKey: 'hn' });
  camEnd();
});

// ---------- 67: Phan Bội Châu sends youths to Japan by ship; Phan Châu Trinh teaches under a banyan ----------
scene('67', (t, lt, dur, S) => {
  const cut = cue(S, 'phan', 1, 6.0) - .1;
  if (lt < cut + .3) {
    vsCam(lt, dur, { x0: 540, y0: 1130, z0: 1.0, x1: 600, y1: 1100, z1: 1.08 });
    vsSky('dawn', { key: 'sky' }); vsSun(300, 480, 100, { t, key: 'sun' });
    vsRidge(1000, 150, '#8CA58F', { kind: 'hill', seed: 441, key: 'r1' });
    vsWater(1180, 2400, { t, key: 'sea', speed: 22, col: DH.water });
    vsSteamship(820, 1340, 520, { t, key: 'ss', dir: 1 });
    const board = span(lt, cue(S, 'sang', 0, 3.8) - 1.4, cue(S, 'nhật', 0, 4.0) + .6);
    paint([[60, 1480], [80, 1260], [340, 1260], [360, 1480]], { wash: '#A3AC78', washOp: 255, ink: DH.ink, sw: 1.4 });
    nguoi(220, 1400, 44, { who: 'phanBoiChau', t, aR: 1.3, mouth: 'talk', talk: 1, boilKey: 'pbc' });
    for (let i = 0; i < 5; i++) { const k = clamp(board * 1.5 - i * .12); vsMini(lerp(300, 640 + i * 20, k), 1470 - 30 * k, 20, { key: `th${i}`, t, ph: i, moving: k > 0 && k < 1, col: [DH.indigo, DH.brown, DH.green][i % 3], hat: 'cap', hold: 'bundle' }); }
    camEnd();
  } else {
    vsCam(lt, dur, { x0: 540, y0: 1130, z0: 1.0, x1: 540, y1: 1090, z1: 1.1 });
    vsBackdrop({ sky: 'day', sunX: 880, sunY: 330, rh: 960, seed: 443, land: '#86B565', land2: '#9CC36F', fore: false });
    vsBanyan(780, 1300, 520, { key: 'bn' });
    nguoi(300, 1400, 46, { who: 'phanChauTrinh', t, talk: 1, mouth: 'talk', aR: 1.2 + .3 * Math.sin(t * 2), holdR: 'scroll', boilKey: 'pct' });
    for (let i = 0; i < 8; i++) vsMini(430 + (i % 4) * 110, 1470 + (i >> 2) * 36, 19, { key: `hs${i}`, t, col: [DH.brown, DH.indigo, DH.green][i % 3], hat: i % 2 ? 'nonla' : 'hair', hold: 'none' });
    camEnd();
  }
  if (lt > cut - .35 && lt < cut + .35) brushWipe((lt - (cut - .35)) / .7, ['#1F3358', '#6AA2B8']);
});

// ---------- 68: two roads fork into fog; the end of both is not yet visible ----------
scene('68', (t, lt, dur, S) => {
  vsCam(lt, dur, { x0: 540, y0: 1130, z0: 1.0, x1: 540, y1: 1090, z1: 1.1 });
  vsBackdrop({ sky: 'grey', sunX: 540, sunY: 460, sunR: 90, sunCol: '#E8E0D0', rh: 1000, seed: 451, land: '#8FA070', land2: '#A3AC78', fore: false });
  paint([[300, 2300], [450, 1450], [270, 1120], [170, 1052], [225, 1046], [345, 1110], [560, 1450], [640, 2300]], { wash: '#C9B58A', washOp: 255, ink: null, curv: .25 });
  paint([[440, 2300], [520, 1450], [735, 1110], [855, 1046], [910, 1052], [815, 1120], [650, 1450], [790, 2300]], { wash: '#C9B58A', washOp: 255, ink: null, curv: .25 });
  inkLine([[300, 2300], [450, 1450], [270, 1120], [170, 1052], [225, 1046], [345, 1110], [540, 1400]], 1.6, DH.ink, 'ink', .25);
  inkLine([[790, 2300], [650, 1450], [815, 1120], [910, 1052], [855, 1046], [735, 1110], [540, 1400]], 1.6, DH.ink, 'ink', .25);
  const fog = .6 + .25 * Math.sin(t * .6);
  [[130, 1020, 170], [320, 990, 150], [760, 990, 150], [950, 1020, 170], [540, 1010, 130]].forEach(([x, y, r], i) => vsCloud(x, y, r, { key: `fg${i}`, op: 235, ph: i }));
  camEnd();
});
