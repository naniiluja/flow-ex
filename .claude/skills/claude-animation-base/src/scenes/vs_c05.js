// vs_c05.js: chương 5, Nhà Lý (scenes 32-38).

// ---------- 32: the monk-raised Lý Công Uẩn is made king, then finds Hoa Lư too cramped between its mountains ----------
scene('32', (t, lt, dur, S) => {
  vsCam(lt, dur, { x0: 540, y0: 1130, z0: 1.0, x1: 540, y1: 1100, z1: 1.1 });
  vsBackdrop({ sky: 'dawn', sunX: 540, sunY: 420, sunR: 110, rh: 960, seed: 111, land: '#86B565', land2: '#8FBB68' });
  const king = span(lt, cue(S, 'lên', 1, 5.6), cue(S, 'vua', 0, 6.5) + .3), hall = lt > cue(S, 'chùa', 0, 5);
  if (!hall) vsGate(540, 1230, 520, { key: 'chua', roof: '#7A8A72' });
  else vsHall(540, 1210, 600 * backOut(span(lt, 5.1, 5.9)), { key: 'dien', tiers: 2, gold: true });
  nguoi(540, 1340, 48, king > .5 ? { who: 'lyCongUan', t, hat: 'crown', hair: 'short', outfit: { kind: 'robe', col: DH.yellow, col2: DH.red }, aR: 1.4, boilKey: 'lcu' } : { who: 'lyCongUan', t, aR: .2, boilKey: 'lcu' });
  const squeeze = span(lt, cue(S, 'ông', 0, 7.1), dur - .2);
  const mass = (side) => paint([[side < 0 ? -420 : W + 420, 2100], [side < 0 ? -420 : W + 420, 720], [side < 0 ? lerp(-120, 280, squeeze) : lerp(W + 120, W - 280, squeeze), 760], [side < 0 ? lerp(-60, 420, squeeze) : lerp(W + 60, W - 420, squeeze), 1160], [side < 0 ? lerp(-100, 330, squeeze) : lerp(W + 100, W - 330, squeeze), 1500], [side < 0 ? lerp(-300, 180, squeeze) : lerp(W + 300, W - 180, squeeze), 2100]], { wash: '#6B7F6C', washOp: 255, fill: DH.greyDk, fillOp: 70, bleed: .3, curv: .3, ink: DH.ink, sw: 1.7 });
  if (squeeze > 0) { mass(-1); mass(1); }
  camEnd();
});

// ---------- 33: the dragon-boat fleet carries the king up the Red River to Đại La ----------
scene('33', (t, lt, dur, S) => {
  vsCam(lt, dur, { x0: 540, y0: 1130, z0: 1.0, x1: 620, y1: 1110, z1: 1.1 });
  vsBackdrop({ sky: 'dawn', sunX: 800, sunY: 420, sunR: 110, rh: 960, seed: 121, land: '#86B565', land2: '#8FBB68', fore: false });
  vsCrowd(-40, 1120, 1170, 1210, 22, 17, t, { cheer: true, seed: 5 });
  vsWater(1240, 2400, { t, key: 'rv', speed: 30, col: '#B5714F' });
  const go = lt / dur;
  [[0, 300, 1370, 520], [1, 640, 1340, 740], [2, 1060, 1390, 520]].forEach(([i, x0, y, s]) => vsDragonBoat(lerp(x0 - 260, x0 + 160, ease(go)) , y, s, { t, key: `db${i}` }));
  vsCrowd(-40, 1120, 1560, 1600, 0, 17, t, {});
  camEnd();
});

// ---------- 34: a golden dragon rises from the water as the boat lands; the city is named Thăng Long ----------
scene('34', (t, lt, dur, S) => {
  vsCam(lt, dur, { x0: 540, y0: 1130, z0: 1.0, x1: 540, y1: 1000, z1: 1.1 });
  vsBackdrop({ sky: 'dawn', sunX: 540, sunY: 460, sunR: 100, rh: 960, seed: 131, land: '#86B565', land2: '#8FBB68', fore: false });
  vsWall(-40, 1120, 1150, 190, { gate: true, key: 'dl' });
  vsWater(1240, 2400, { t, key: 'rv', speed: 30, col: '#B5714F' });
  vsDragonBoat(380, 1420, 420, { t, key: 'k' });
  nguoi(360, 1420 - 90, 30, { who: 'lyCongUan', t, hat: 'crown', hair: 'short', outfit: { kind: 'robe', col: DH.yellow, col2: DH.red }, noShadow: true, aR: 1.4, boilKey: 'vua' });
  const rise = span(lt, cue(S, 'rồng', 0, 2.2) - .3, cue(S, 'lên', 0, 2.8) + 1.6);
  if (rise > 0) { glow(640, 1100, 520 * rise, '#FFD78A', .6 * rise); vsDragon(lerp(640, 600, rise), 1420, 560, { t, key: 'dr', rise: .95 * rise, span: 1.2 }); }
  camEnd();
});

// ---------- 35: Văn Miếu: teachers, pupils, and the pass list hung on the gate ----------
scene('35', (t, lt, dur, S) => {
  vsCam(lt, dur, { x0: 540, y0: 1130, z0: 1.0, x1: 540, y1: 1100, z1: 1.1 });
  vsBackdrop({ sky: 'day', sunX: 880, sunY: 330, rh: 960, seed: 141, land: '#86B565', land2: '#B7C77C', fore: false });
  vsWall(-40, 1120, 1170, 160, { key: 'vm' });
  vsPavilion(540, 1170, 380, { key: 'kv' });
  vsGate(540, 1300, 440, { key: 'vmg' });
  const list = span(lt, cue(S, 'đỗ', 0, 7.1) - .3, cue(S, 'ra', 0, 7.2));
  if (list > 0) { paint(rectPts(300, 1330, 480 * list, 200 * list), { wash: DH.red, washOp: 255, ink: DH.ink, sw: 1.3 }); for (let i = 0; i < 5; i++) inkLine([[330, 1360 + i * 30 * list], [330 + 400 * list, 1360 + i * 30 * list]], 2, DH.yellow, 'ink', 0); }
  const teach = span(lt, cue(S, 'lập', 0, 2.2), cue(S, 'chữ', 0, 3.9));
  nguoi(190, 1410, 40, { who: 'thayDo', t, talk: 1, mouth: 'talk', aR: 1.2 + .3 * Math.sin(t * 2), holdR: 'scroll', boilKey: 'td' });
  nguoi(890, 1410, 40, { who: 'thayDo', t, flip: true, talk: 1, mouth: 'talk', outfit: { kind: 'robe', col: DH.indigoDk, col2: DH.indigo }, boilKey: 'td2' });
  for (let i = 0; i < 6; i++) vsMini(330 + i * 90, 1470 + (i % 2) * 22, 19, { key: `hs${i}`, t, col: [DH.brown, DH.indigo, DH.green][i % 3], hat: i % 2 ? 'hair' : 'none', cheer: i === 2 && list > 0 ? 1 : 0 });
  camEnd();
});

// ---------- 36: Lý Thường Kiệt strikes first across the border, burns the grain stores, falls back to the Như Nguyệt line ----------
scene('36', (t, lt, dur, S) => {
  const cut = cue(S, 'rồi', 0, 6) - .1;
  if (lt < cut + .3) {
    vsCam(lt, dur, { x0: 540, y0: 1130, z0: 1.0, x1: 600, y1: 1110, z1: 1.08 });
    vsBackdrop({ sky: 'dawn', sunX: 880, sunY: 380, rh: 960, seed: 151, land: '#8FA070', land2: '#A3AC78', fore: false });
    const go = clamp(lt / cut), x = lerp(-60, 720, ease(go));
    vsBanner(520, 1260, 380, { w: 200, fh: 120, kind: 'pennant', col: DH.redDk, key: 'bd', t });
    vsArmy(x - 560, x - 160, 1300, 3, 5, 20, t, { col: DH.red, trim: DH.gold, hat: 'helmet', moving: go < 1, hold: 'spear', plume: DH.yellow });
    vsHorse(x, 1470, 190, { t, gallop: t * 1.1, key: 'h', dir: 1 });
    nguoi(x - 10, 1470 - 258, 36, { who: 'lyThuongKiet', t, noShadow: true, aR: 1.4, holdR: 'sword', mouth: 'shout', boilKey: 'ltk' });
    const burn = span(lt, cue(S, 'kho', 0, 3.7), cue(S, 'lương', 0, 3.9) + 1);
    vsHut(980, 1300, 280, { key: 'kho' });
    if (burn > 0) { vsFire(980, 1250, 70 * burn, t, { key: 'bf' }); vsSmoke(980, 1100, 80, t, { key: 'bs' }); }
    camEnd();
  } else {
    vsCam(lt, dur, { x0: 540, y0: 1130, z0: 1.0, x1: 540, y1: 1100, z1: 1.1 });
    vsBackdrop({ sky: 'dusk', sunX: 300, sunY: 560, sunR: 100, rh: 960, seed: 153, land: '#7A8E64', land2: '#8FA070', fore: false });
    vsWater(1220, 2400, { t, key: 'nn', speed: 22, col: DH.water });
    const fence = span(lt, cue(S, 'lập', 0, 6.9), cue(S, 'tuyến', 0, 6.9) + .8);
    vsStakes(60, 1020, 1240, 22, { key: 'pt', show: fence, h: 200 });
    vsArmy(120, 520, 1180, 2, 5, 18, t, { col: DH.red, trim: DH.gold, hat: 'helmet', hold: 'spear', plume: DH.yellow });
    vsArmy(620, 1000, 1180, 2, 5, 18, t, { col: DH.red, trim: DH.gold, hat: 'helmet', hold: 'spear', plume: DH.yellow });
    camEnd();
  }
  if (lt > cut - .35 && lt < cut + .35) brushWipe((lt - (cut - .35)) / .7, ['#B8893A', '#E7B232']);
});

// ---------- 37: moonlit night at the Như Nguyệt river; a poem drifts from the little shrine across to the Song camp ----------
scene('37', (t, lt, dur, S) => {
  vsCam(lt, dur, { x0: 540, y0: 1130, z0: 1.0, x1: 600, y1: 1110, z1: 1.08 });
  vsSky('night', { key: 'sky', t }); vsMoon(780, 440, 110, { t, key: 'mn' });
  vsRidge(1010, 200, '#35405F', { kind: 'range', seed: 161, key: 'r1' });
  vsLand(1100, '#2D4A3A', { key: 'g1' });
  vsWater(1230, 2400, { t, key: 'nn', speed: 20, col: '#27406A' });
  vsLand(1330, '#355A44', { key: 'g2', amp: 5 });
  // Song camp on the far (north) bank: dim banners and tents
  const camp = span(lt, 0, 1.2);
  for (let i = 0; i < 8; i++) vsBanner(580 + i * 70, 1110 + (i % 2) * 10, 200 * camp, { w: 70, fh: 46, col: '#8A7A5A', key: `sc${i}`, t, ph: i });
  vsArmy(620, 1000, 1160, 1, 6, 15, t, { col: '#8A7A5A', hat: 'helmet', hold: 'spear', plume: DH.yellow });
  // the shrine with a lit lamp
  vsHall(230, 1390, 400, { key: 'den', tiers: 1 });
  glow(230, 1300, 320, '#FFD78A', .65 + .1 * Math.sin(t * 3));
  const poem = lt > cue(S, 'ngâm', 0, 6.1) - .2 ? frac((lt - cue(S, 'ngâm', 0, 6.1)) * .45) : -1;
  if (poem >= 0) vsRipples(330, 1290, 700, poem, { key: 'po', n: 4, col: '#F4E9C0' });
  camEnd();
});

// ---------- 38: the Song camp wavers and withdraws, Thường Kiệt offers peace ----------
scene('38', (t, lt, dur, S) => {
  vsCam(lt, dur, { x0: 600, y0: 1130, z0: 1.0, x1: 560, y1: 1100, z1: 1.08 });
  vsBackdrop({ sky: 'dawn', sunX: 860, sunY: 400, sunR: 100, rh: 960, seed: 171, land: '#8FA070', land2: '#A3AC78', fore: false });
  const sway = span(lt, cue(S, 'nghe', 0, .7), cue(S, 'núng', 0, 1.6) + .6), leave = span(lt, cue(S, 'giặc', 0, 7.0), dur);
  const xo = leave * 520;
  vsArmy(560 + xo, 1000 + xo, 1260, 3, 5, 20, t, { col: '#8A7A5A', hat: 'helmet', hold: 'spear', plume: DH.yellow, moving: leave > 0 && leave < 1 });
  for (let i = 0; i < 4; i++) vsFall(640 + i * 110 + xo, 1250, .22 * sway * (1 - leave), i % 2 ? 1 : -1, () => vsBanner(640 + i * 110 + xo, 1250, 360 * (1 - .8 * leave), { w: 120, fh: 80, col: '#8A7A5A', key: `sf${i}`, t, ph: i }));
  const talk = span(lt, cue(S, 'đề', 0, 4.5), cue(S, 'hại', 0, 6.5));
  paint([[-300, 2300], [-300, 1330], [150, 1300], [360, 1330], [520, 1400], [600, 2300]], { wash: DH.earth, washOp: 255, fill: DH.brownDk, fillOp: 60, bleed: .3, curv: .25, ink: DH.ink, sw: 1.4 });
  nguoi(260, 1330, 48, { who: 'lyThuongKiet', t, aR: talk > 0 ? 1.0 + .3 * Math.sin(t * 3) : .6, holdR: talk > 0 ? 'scroll' : undefined, lookX: .6, mouth: talk > 0 ? 'talk' : 'flat', talk: talk > 0 ? 1 : 0, boilKey: 'ltk' });
  camEnd();
});
