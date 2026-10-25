// vs_c08.js: chương 8, Tây Sơn (scenes 56-62).

const QING = '#2A4A8A', SIAM = '#C98A2A';

// ---------- 56: two lords, a river between them, starving people on both banks ----------
scene('56', (t, lt, dur, S) => {
  vsCam(lt, dur, { x0: 540, y0: 1130, z0: 1.0, x1: 540, y1: 1100, z1: 1.08 });
  vsBackdrop({ sky: 'grey', sunX: 840, sunY: 380, sunR: 80, sunCol: '#E8E0D0', rh: 960, seed: 311, land: '#8FA070', land2: '#A3AC78', fore: false });
  paint([[490, 1000], [590, 1000], [700, 1160], [800, 1500], [900, 2500], [180, 2500], [280, 1500], [380, 1160]], { wash: DH.water, washOp: 255, fill: DH.skyDk, fillOp: 60, curv: .2, ink: DH.ink, sw: 1.6 });
  for (let i = 0; i < 6; i++) { const y = 1090 + i * 95 + Math.sin(t * 2 + i) * 4, hw = 40 + i * 28, cx = 540 + Math.sin(t + i) * 10; inkLine([[cx - hw, y], [cx + hw, y]], 2.4, '#F4F8FA', 'ink', .3); }
  const l = span(lt, cue(S, 'trịnh', 0, 3.4) - .3, cue(S, 'trịnh', 0, 3.4) + .4), r = span(lt, cue(S, 'nguyễn', 0, 5.2) - .3, cue(S, 'nguyễn', 0, 5.2) + .4);
  if (l > 0) { vsBanner(230, 1330, 480 * l, { w: 240, fh: 150, kind: 'pennant', col: DH.indigo, key: 'bt', t }); nguoi(120, 1330, 40, { who: 'chuaTrinh', t, aR: 1.2, boilKey: 'ct' }); }
  if (r > 0) { vsBanner(850, 1330, 480 * r, { w: 240, fh: 150, kind: 'pennant', col: DH.red, key: 'bn', t }); nguoi(980, 1330, 40, { who: 'chuaNguyen', t, flip: true, aR: 1.2, boilKey: 'cn' }); }
  const hungry = span(lt, cue(S, 'dân', 0, 8.3), dur);
  for (let i = 0; i < 6; i++) vsMini(i < 3 ? 70 + i * 100 : 760 + (i - 3) * 100, 1430 + (i % 2) * 24, 18, { key: `dn${i}`, t, col: DH.brown, hat: 'nonla', hold: 'none', skin: SKIN.tan, bob: .2 });
  camEnd();
});

// ---------- 57: the three Nguyễn brothers hand out rice from the granary ----------
scene('57', (t, lt, dur, S) => {
  vsCam(lt, dur, { x0: 540, y0: 1130, z0: 1.0, x1: 540, y1: 1100, z1: 1.1 });
  vsBackdrop({ sky: 'day', sunX: 880, sunY: 330, rh: 960, seed: 321, land: '#86B565', land2: '#9CC36F', fore: false });
  vsHut(160, 1200, 280, { key: 'ap1' }); vsHut(900, 1190, 260, { key: 'ap2' });
  vsHall(540, 1230, 380, { key: 'kho', tiers: 1, wall: '#C9A04A' });
  const bros = span(lt, cue(S, 'ba', 0, 1.3), cue(S, 'nguyễn', 0, 2.1)), share = span(lt, cue(S, 'chia', 0, 8.3) - .6, dur);
  const names = ['nguyenNhac', 'nguyenHue', 'nguyenLu'];
  names.forEach((w, i) => { const k = clamp(bros * 1.4 - i * .2); nguoi(lerp(540, 340 + i * 190, ease(k)), 1400, 44, { who: w, t, aR: i === 1 && share > 0 ? 1.4 : .3, mouth: 'smile', boilKey: `br${i}` }); });
  for (let i = 0; i < 6; i++) {
    const k = clamp(share * 1.5 - i * .12), tx = 130 + i * 160;
    vsMini(lerp(540, tx, k), 1500 + (i % 2) * 24, 19, { key: `vl${i}`, t, ph: i, moving: k > 0 && k < 1, col: [DH.brown, DH.indigo, DH.green][i % 3], hat: 'nonla', cheer: k > .9 ? 1 : 0 });
    if (k > 0) vsSack(lerp(540, tx, k), 1430 - (k > .9 ? 0 : 20 * Math.sin(k * 3.14)), 70, { key: `sk${i}`, col: DH.white });
  }
  camEnd();
});

// ---------- 58: night on the Tiền river; Tây Sơn boats strike the Siamese fleet from all sides ----------
scene('58', (t, lt, dur, S) => {
  vsCam(lt, dur, { x0: 540, y0: 1110, z0: 1.0, x1: 540, y1: 1090, z1: 1.1 });
  vsSky('night', { key: 'sky', t }); vsMoon(840, 420, 90, { t, key: 'mn' });
  vsRidge(1000, 150, '#35405F', { kind: 'hill', seed: 331, key: 'r1' });
  vsLand(1080, '#2D4A3A', { key: 'g1' });
  vsWater(1180, 2400, { t, key: 'tien', speed: 22, col: '#27406A' });
  const strike = span(lt, cue(S, 'đánh', 0, 7.9) - .6, cue(S, 'tan', 0, 8.2) + 1.2), burn = span(lt, cue(S, 'đánh', 0, 7.9), dur);
  [[0, 520, 1330], [1, 800, 1390]].forEach(([i, x, y]) => {
    vsWarship(x, y + 70 * burn * i, 470, { t, dir: -1, col: '#4A3220', sail: '#E0B060', shield: SIAM, flag: SIAM, key: `sm${i}`, ph: i, tilt: .12 * burn });
    if (burn > 0.3) { vsFire(x - 30, y - 100 + 70 * burn * i, 46 * burn, t, { key: `fx${i}`, glow: .6 }); vsSmoke(x - 30, y - 160, 70, t, { key: `sx${i}` }); }
  });
  [[-1, 160], [1, 960], [-1, 360], [1, 760]].forEach(([d, x1], i) => {
    const from = d < 0 ? -300 : 1400, x = lerp(from, x1, ease(strike)), y = 1330 + i * 40;
    vsCanoe(x, y, 300, { t, crew: 'soldier', key: `ts${i}`, ph: i, dir: d < 0 ? 1 : -1, col: DH.redDk });
    vsMini(x, y - 10, 18, { key: `tm${i}`, t, col: DH.red, hat: 'khan', hold: 'torch', dir: d < 0 ? 1 : -1 });
  });
  if (strike > 0.2 && strike < 1) for (let i = 0; i < 4; i++) glow(220 + i * 200 + Math.sin(t * 9 + i) * 40, 1250, 160 * (.5 + .5 * Math.abs(Math.sin(t * 12 + i * 2))), '#FFC766', .7);
  camEnd();
});

// ---------- 59: north to Thăng Long; the Lê king flees; Qing hosts arrive; Nguyễn Huệ takes the throne as Quang Trung ----------
scene('59', (t, lt, dur, S) => {
  const c1 = cue(S, 'cuối', 0, 2.1) - .2, c2 = cue(S, 'nguyễn', 0, 9.7) - .1;
  if (lt < c1 + .3) {
    vsCam(lt, dur, { x0: 540, y0: 1130, z0: 1.0, x1: 600, y1: 1110, z1: 1.08 });
    vsBackdrop({ sky: 'dawn', sunX: 540, sunY: 460, sunR: 110, rh: 960, seed: 341, land: '#86B565', land2: '#9CC36F', fore: false });
    const go = clamp(lt / c1);
    const x = lerp(-100, 720, ease(go));
    vsArmy(x - 560, x - 160, 1300, 3, 5, 20, t, { col: DH.red, trim: DH.gold, hat: 'khan', hold: 'spear', plume: DH.yellow, moving: go < 1 });
    vsHorse(x, 1470, 190, { t, gallop: t * 1.1, key: 'h' });
    nguoi(x - 10, 1470 - 258, 36, { who: 'nguyenHue', t, noShadow: true, aR: 1.4, holdR: 'sword', mouth: 'shout', boilKey: 'nh' });
    camEnd();
  } else if (lt < c2 + .3) {
    vsCam(lt, dur, { x0: 540, y0: 1130, z0: 1.0, x1: 540, y1: 1100, z1: 1.08 });
    vsBackdrop({ sky: 'grey', sunX: 840, sunY: 380, sunR: 80, sunCol: '#E8E0D0', rh: 960, seed: 343, land: '#8FA070', land2: '#A3AC78', fore: false });
    const fl = span(lt, cue(S, 'vua', 0, 3.7), cue(S, 'sang', 0, 4.4) + 1.5), qg = span(lt, cue(S, 'mấy', 0, 6.1), cue(S, 'long', 0, 8.8));
    nguoi(lerp(700, -200, fl), 1380, 42, { who: 'king', t, flip: true, walk: fl > 0 && fl < 1 ? t * 2.2 : null, mouth: 'o', boilKey: 'lk' });
    vsArmy(lerp(1500, 520, qg), lerp(2500, 1520, qg), 1260, 4, 8, 17, t, { col: QING, trim: DH.gold, hat: 'helmet', hold: 'spear', plume: DH.red, dir: -1, moving: qg < 1 });
    vsBanner(lerp(1500, 520, qg) + 20, 1260, 480, { w: 260, fh: 150, kind: 'qing', key: 'qb', t });
    camEnd();
  } else {
    vsCam(lt, dur, { x0: 540, y0: 1130, z0: 1.0, x1: 540, y1: 1090, z1: 1.12 });
    vsBackdrop({ sky: 'dawn', sunX: 540, sunY: 430, sunR: 110, rh: 960, seed: 345, land: '#86B565', land2: '#9CC36F', fore: false });
    paint([[130, 1480], [250, 1330], [830, 1330], [950, 1480]], { wash: '#C9B58A', washOp: 255, ink: DH.ink, sw: 1.6 });
    paint([[250, 1330], [300, 1250], [780, 1250], [830, 1330]], { wash: '#D8C9A0', washOp: 255, ink: DH.ink, sw: 1.6 });
    const up = span(lt, cue(S, 'ngôi', 0, 10.4), cue(S, 'đế', 0, 11.1) + .4);
    vsBanner(190, 1330, 560 * span(lt, cue(S, 'hiệu', 0, 11.8), cue(S, 'là', 0, 12.2) + .8), { w: 290, fh: 200, kind: 'red', key: 'qt', t });
    vsCrowd(100, 980, 1520, 1560, 14, 17, t, { cheer: true, seed: 13 });
    nguoi(540, 1250, 46, up > .5 ? { who: 'nguyenHue', t, hat: 'crown', outfit: { kind: 'robe', col: DH.yellow, col2: DH.red }, aR: 1.4, boilKey: 'nh' } : { who: 'nguyenHue', t, aR: .3, boilKey: 'nh' });
    camEnd();
  }
  if (lt > c1 - .35 && lt < c1 + .35) brushWipe((lt - (c1 - .35)) / .7, ['#8E2220', '#E8833A']);
  if (lt > c2 - .35 && lt < c2 + .35) brushWipe((lt - (c2 - .35)) / .7, ['#8E2220', '#E8833A']);
});

// ---------- 60: the early Tết at Tam Điệp, the king lifts a cup before his army ----------
scene('60', (t, lt, dur, S) => {
  vsCam(lt, dur, { x0: 540, y0: 1130, z0: 1.0, x1: 540, y1: 1100, z1: 1.1 });
  vsBackdrop({ sky: 'night', sunX: 840, sunY: 380, sun: false, clouds: false, rh: 960, seed: 351, land: '#2D4A3A', land2: '#355A44', fore: false, r1: '#35405F', r2: '#2E4A44' });
  vsFire(540, 1400, 54, t, { key: 'tet' });
  for (let i = 0; i < 10; i++) { const a = Math.PI * (.05 + .9 * i / 9), x = 540 - Math.cos(a) * 420; if (Math.abs(x - 540) < 120) continue; vsMini(x, 1450 + Math.sin(a) * 50, 21, { key: `tq${i}`, t, col: [DH.red, DH.indigo, DH.green][i % 3], hat: 'khan', hold: 'none', cheer: lt > cue(S, 'mừng', 0, 4.5) ? 1 : .2, dir: x < 540 ? 1 : -1 }); }
  const toast = span(lt, cue(S, 'mồng', 0, 2.9), cue(S, 'mừng', 0, 4.5));
  nguoi(540, 1300, 46, { who: 'nguyenHue', t, hat: 'crown', outfit: { kind: 'robe', col: DH.yellow, col2: DH.red }, aR: lerp(.3, 2.9, toast), holdR: 'cup', mouth: 'smile', boilKey: 'qt' });
  camEnd();
});

// ---------- 61: war elephants and wet-straw shields storm the Ngọc Hồi fort; Tôn Sĩ Nghị flees on a bare horse ----------
scene('61', (t, lt, dur, S) => {
  vsCam(lt, dur, { x0: 540, y0: 1130, z0: 1.0, x1: 640, y1: 1110, z1: 1.1 });
  vsBackdrop({ sky: 'dawn', sunX: 300, sunY: 480, sunR: 100, rh: 960, seed: 361, land: '#8FA070', land2: '#A3AC78', fore: false });
  vsRampart(660, 1400, 1260, 170, { key: 'nh' });
  vsFire(1000, 1130, 38, t, { key: 'fort', glow: .4 }); vsSmoke(1000, 1000, 80, t, { key: 'fs' });
  const charge = span(lt, cue(S, 'xông', 0, 6.2) - 1.0, cue(S, 'hồi', 0, 7.1) + .4), flee = span(lt, cue(S, 'không', 0, 7.9), dur);
  const adv = lerp(-100, 420, ease(span(lt, cue(S, 'sáng', 0, 3.5), cue(S, 'xông', 0, 6.2))));
  vsDust(adv + 140, 1480, 150, t, { key: 'ed' });
  [[0, 1460, 200], [1, 1500, 160]].forEach(([i, y, s]) => {
    const x = adv + 80 + i * -230 + charge * 160;
    vsElephant(x, y, s, { t, walk: t * .8 + i * .3, key: `we${i}`, cloth: DH.red });
    nguoi(x - 0.1 * s, y - 1.6 * s, 34, { who: 'nguyenHue', t, noShadow: true, aR: 1.4, holdR: 'sword', mouth: 'shout', boilKey: `rd${i}` });
  });
  for (let i = 0; i < 8; i++) {
    const x = adv - 280 - (i % 4) * 90, y = 1400 + (i >> 2) * 70;
    vsMini(x, y, 20, { key: `sh${i}`, t, ph: i, moving: true, col: DH.red, hat: 'khan', hold: 'none' });
    paint(ellPts(x + 36, y - 80, 36, 52, 12), { wash: '#D8C06A', washOp: 255, fill: DH.brownDk, fillOp: 70, ink: DH.ink, sw: 1.3 });
  }
  vsHorse(lerp(1000, 1700, ease(flee)), 1400, 170, { t, gallop: flee > 0 ? t * 1.4 : null, key: 'sh', dir: 1, cloth: null });
  nguoi(lerp(1000, 1700, ease(flee)) - 8, 1400 - 231, 36, { who: 'thanhGeneral', t, noShadow: true, aR: .6, mouth: 'o', boilKey: 'tsn' });
  camEnd();
});

// ---------- 62: an empty hall, the yellow flag drooping, one apricot blossom branch opening ----------
scene('62', (t, lt, dur, S) => {
  vsCam(lt, dur, { x0: 540, y0: 1130, z0: 1.0, x1: 540, y1: 1100, z1: 1.1 });
  vsBackdrop({ sky: 'dusk', sunX: 300, sunY: 560, sunR: 100, rh: 960, seed: 371, land: '#8FA070', land2: '#A3AC78', fore: false });
  vsHall(620, 1230, 640, { key: 'dien', tiers: 2, gold: true });
  vsFall(190, 1420, .3, -1, () => vsBanner(190, 1420, 520, { w: 250, fh: 170, kind: 'red', key: 'bn', t: 0 }));
  const bloom = span(lt, cue(S, 'mới', 0, 2.1) - .5, dur - .5);
  inkLine([[-100, 560], [180, 600], [420, 540], [700, 620]], 7, DH.brownDk, 'ink', .5);
  inkLine([[180, 600], [260, 760], [200, 880]], 4, DH.brownDk, 'ink', .5);
  inkLine([[420, 540], [520, 440], [640, 400]], 4, DH.brownDk, 'ink', .5);
  [[160, 590], [260, 740], [200, 870], [300, 570], [420, 540], [520, 450], [640, 410], [560, 600], [680, 620]].forEach(([x, y], i) => {
    const k = clamp(bloom * 9 - i * .6) ; if (k <= 0) return;
    for (let j = 0; j < 5; j++) { const a = j / 5 * Math.PI * 2 + i; paint(ellPts(x + Math.cos(a) * 16 * k, y + Math.sin(a) * 16 * k, 13 * k, 11 * k, 8), { wash: DH.yellow, washOp: 255, ink: DH.ink, sw: .7 }); }
    paint(ellPts(x, y, 7 * k, 7 * k, 8), { wash: DH.orange, ink: null });
  });
  camEnd();
});
