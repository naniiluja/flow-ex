// vs_c03.js: chương 3, Bắc thuộc (scenes 16-23).

const HAN = '#5C4A7A', HAN_RED = '#7A2A2A';

// ---------- 16: northern officials, heavy taxes, a strange flag in the market ----------
scene('16', (t, lt, dur, S) => {
  vsCam(lt, dur, { x0: 600, y0: 1230, z0: 1.0, x1: 520, y1: 1210, z1: 1.1 });
  vsBackdrop({ sky: 'grey', sunX: 820, sunY: 340, sunR: 80, sunCol: '#E8E0D0', rh: 960, seed: 21, land: '#8FA070', land2: '#A3AC78', rocks: true });
  vsHut(150, 1230, 250, { key: 'h1' }); vsHut(900, 1220, 230, { key: 'h2' });
  const walk = clamp(lt / dur);
  const sx = lerp(-120, 420, ease(walk));
  vsSedan(sx, 1330, 330, t, { key: 's1', moving: walk < 1, roof: HAN, bearer: DH.brownDk });
  nguoi(sx, 1330 - 330 * .56, 17, { who: 'hanOfficial', t, noShadow: true, mouth: 'flat', lookX: .6, boilKey: 'off' });
  // villagers bow and carry tax sacks past the sedan
  const tax = span(lt, cue(S, 'thuế', 0, 2.4) - .2, cue(S, 'nặng', 0, 2.7) + 1.2);
  for (let i = 0; i < 5; i++) {
    const x = lerp(1250 + i * 120, 820 - i * 30, tax) - (1 - tax) * 0, y = 1400 + (i % 2) * 40;
    vsMini(x, y, 21, { key: `tx${i}`, t, ph: i, moving: tax > 0 && tax < 1, col: [DH.brown, DH.brownDk, DH.green][i % 3], hat: 'nonla', dir: -1 });
    vsSack(x + 20, y - 150, 90, { key: `sk${i}` });
  }
  const flag = span(lt, cue(S, 'hán', 0, 3.5), cue(S, 'hán', 0, 3.5) + .8);
  if (flag > 0) vsBanner(760, 1250, 500 * flag, { w: 260, fh: 150, col: HAN_RED, key: 'han', t });
  const forget = span(lt, cue(S, 'quên', 0, 8.8), dur - .2);
  for (let i = 0; i < 3; i++) nguoi(240 + i * 120, 1500, 30, { who: 'farmer', t, bow: .6 * forget, boilKey: `bw${i}` });
  camEnd();
});

// ---------- 17: Trưng Trắc and Trưng Nhị raise the flag at Mê Linh ----------
scene('17', (t, lt, dur, S) => {
  vsCam(lt, dur, { x0: 540, y0: 1160, z0: 1.0, x1: 540, y1: 1120, z1: 1.14 });
  vsBackdrop({ sky: 'dawn', sunX: 540, sunY: 520, sunR: 120, rh: 980, seed: 26, land: '#86B565', land2: '#8FBB68' });
  paint([[-80, 1480], [150, 1180], [420, 1090], [660, 1090], [930, 1180], [1160, 1480]], { wash: DH.earth, washOp: 255, fill: DH.brownDk, fillOp: 60, bleed: .3, curv: .25, ink: DH.ink, sw: 1.5 });
  const come = span(lt, cue(S, 'giết', 0, 1.1), cue(S, 'dựng', 0, 4.6));
  for (let i = 0; i < 14; i++) {
    const side = i % 2 ? 1 : -1, k = come * 1.15 - hash(i) * .3;
    vsMini(lerp(side < 0 ? -80 : 1160, side < 0 ? 220 + (i >> 1) * 55 : 860 - (i >> 1) * 55, clamp(k)), 1400 + (i % 3) * 30, 21, { key: `vl${i}`, t, ph: i, moving: k > 0 && k < 1, col: [DH.brown, DH.indigo, DH.green][i % 3], hat: 'nonla', hold: 'spear', dir: -side });
  }
  const raise = span(lt, cue(S, 'dựng', 0, 4.6), cue(S, 'cờ', 0, 4.9) + .7);
  nguoi(420, 1090, 50, { who: 'trungTrac', t, aR: lerp(0, 3.14, raise), holdR: raise > 0 ? 'flag' : undefined, mouth: raise > .5 ? 'shout' : 'flat', lookX: .4, boilKey: 'tt' });
  nguoi(660, 1090, 50, { who: 'trungNhi', t, flip: true, aR: lerp(0, 3.14, raise), holdR: raise > 0 ? 'flag' : undefined, mouth: raise > .5 ? 'shout' : 'flat', lookX: -.4, boilKey: 'tn' });
  camEnd();
});

// ---------- 18: the drum over the Hát river, sixty-five citadels rise, Tô Định cuts his beard and flees ----------
scene('18', (t, lt, dur, S) => {
  vsCam(lt, dur, { x0: 540, y0: 1150, z0: 1.0, x1: 600, y1: 1120, z1: 1.1 });
  vsSky('dusk', { key: 'sky' }); vsSun(540, 600, 130, { t, key: 'sun' });
  vsRidge(980, 220, '#8E7A8C', { kind: 'range', seed: 30, key: 'r1' });
  vsLand(1010, '#7A8E64', { key: 'g1' });
  vsWater(1040, 1400, { t, key: 'river', speed: 24, col: '#5E86A0' });
  const beat = lt > cue(S, 'trống', 0, .4) ? frac(t * 1.3) : 1;
  vsRipples(240, 1240, 330, frac(t * .8), { key: 'rp', n: 3, col: DH.redDk, });
  vsDrumSide(240, 1260, 380, { key: 'dr' });
  nguoi(80, 1370, 40, { who: 'trungTrac', t, aR: 1.57 + .5 * Math.sin(t * 8), holdR: 'staff', lookX: .6, mouth: 'shout', boilKey: 'tt' });
  // sixty-five citadels light up as flags along the far bank
  const flags = span(lt, cue(S, 'thành', 0, 2.8), cue(S, 'theo', 0, 3.9) + .5);
  for (let i = 0; i < 12; i++) { const k = clamp(flags * 12 - i); if (k > 0) vsBanner(80 + i * 85, 1020 + (i % 3) * 14, 150 * k, { w: 80, fh: 50, kind: 'pennant', col: [DH.red, DH.yellow][i % 2], key: `cf${i}`, t, ph: i }); }
  if (flags > .2) vsFire(250, 1010, 36, t, { key: 'wf1' });
  if (flags > .6) vsFire(820, 1000, 42, t, { key: 'wf2' });
  // Tô Định runs off to the left; the beard comes off on the cue "râu"
  const flee = span(lt, cue(S, 'trốn', 0, 7), dur);
  const shaved = lt > cue(S, 'râu', 0, 6.6);
  nguoi(lerp(880, 560, ease(seg(lt, cue(S, 'phải', 0, 5.5) - .8, cue(S, 'phải', 0, 5.5)))) - 220 * flee, 1390, 46, { who: 'hanGeneral', t, beard: shaved ? 'none' : 'goat', hat: lt > cue(S, 'tóc', 0, 6.1) ? 'none' : 'helmet', walk: flee > 0 ? t * 2.2 : null, flip: true, lookX: -.5, mouth: shaved ? 'o' : 'shout', aL: 2.5, boilKey: 'td' });
  camEnd();
});

// ---------- 19: the sisters on elephants against Mã Viện; then only the Hát river under the moon ----------
scene('19', (t, lt, dur, S) => {
  const cut = cue(S, 'gieo', 0, 6.2);
  if (lt < cut + .3) {
    vsCam(lt, dur, { x0: 540, y0: 1240, z0: 1.0, x1: 620, y1: 1220, z1: 1.1 });
    vsBackdrop({ sky: 'day', sunX: 900, sunY: 300, rh: 940, seed: 33, land: '#86B565', land2: '#8FBB68' });
    const crown = lt > cue(S, 'vua', 0, 1.3);
    vsHall(180, 1180, 320, { key: 'ml', tiers: 2, gold: true });
    const come = span(lt, cue(S, 'hán', 0, 5), cue(S, 'sang', 0, 5.7) + .5);
    nguoi(300, 1330, 46, { who: 'trungTrac', t, hat: crown ? 'crown' : 'wrap', aR: 1.0 + .3 * Math.sin(t * 2), boilKey: 'tt0' });
    if (come > 0 || lt > cue(S, 'hai', 0, 1.8)) {
      vsArmy(lerp(1500, 940, come), lerp(1900, 1290, come), 1380, 3, 4, 22, t, { col: HAN, trim: DH.gold, hat: 'helmet', moving: come < 1, dir: -1, hold: 'spear', plume: DH.red });
      vsBanner(lerp(1450, 880, come), 1400, 480, { w: 260, fh: 140, col: HAN_RED, key: 'mv', t });
    }
    const ride = clamp(lt / cut);
    vsElephant(lerp(380, 520, ride), 1500, 150, { t, walk: t * .5, key: 'e1', cloth: DH.red });
    vsElephant(lerp(120, 260, ride), 1520, 150, { t, walk: t * .5 + .3, key: 'e2', cloth: DH.indigo });
    nguoi(lerp(380, 520, ride) - 15, 1500 - 240, 36, { who: 'trungTrac', t, noShadow: true, aR: 3.14, holdR: 'sword', mouth: 'shout', boilKey: 'tt1' });
    nguoi(lerp(120, 260, ride) - 15, 1520 - 240, 36, { who: 'trungNhi', t, noShadow: true, aR: 3.14, holdR: 'sword', mouth: 'shout', boilKey: 'tn1' });
    const hb = [0, 1, 2].map(i => { const ax = 840 + i * 90, ay = 1290 + (i % 2) * 24; vsMini(ax, ay, 22, { key: `hb${i}`, t, col: HAN, trim: DH.gold, hat: 'helmet', plume: DH.red, hold: 'bow', dir: -1 }); return vsMiniBow(ax, ay, 22, -1); });
    vsArrows(t, 0, 0, 480, 1380, 0, { from: hb, h: 200, rate: .8, spread: 12 });
    camEnd();
  } else {
    vsCam(lt, dur, { x0: 540, y0: 1150, z0: 1.0, x1: 540, y1: 1130, z1: 1.08 });
    vsSky('night', { key: 'sky', t }); vsMoon(700, 420, 120, { t, key: 'mn' });
    vsRidge(1000, 200, '#35405F', { kind: 'range', seed: 40, key: 'r1' });
    vsWater(1030, 1480, { t, key: 'rv', speed: 20, col: '#27406A' });
    for (let i = 0; i < 9; i++) { const w = 120 - i * 9, y = 1070 + i * 38 + Math.sin(t * 2 + i) * 3; inkLine([[700 - w + Math.sin(t + i) * 12, y], [700 + w + Math.sin(t + i) * 12, y]], 3, '#F4E9C0', 'ink', .3); }
    vsRipples(540, 1320, 260, frac(t * .3), { key: 'rpl', n: 2, col: '#F4E9C0' });
    vsFore(1600, '#1D2B48', { key: 'frn', seed: 6 });
    camEnd();
  }
  if (lt > cut - .35 && lt < cut + .35) brushWipe((lt - (cut - .35)) / .7, ['#1F3358', '#2D4B80']);
});

// ---------- 20: Triệu Thị Trinh on the mountain top over the East Sea ----------
scene('20', (t, lt, dur, S) => {
  vsCam(lt, dur, { x0: 540, y0: 1260, z0: 1.0, x1: 540, y1: 940, z1: 1.14 });
  vsSky('storm', { key: 'sky', t });
  vsCloud(200, 380, 130, { key: 'c1' }); vsCloud(850, 560, 120, { key: 'c2', ph: 2 });
  vsWater(1100, 2500, { t, key: 'sea', speed: 70, col: '#3E6A8C' });
  vsWaves(540, 1180, 1000, t);
  paint([[-200, 2500], [-200, 1500], [150, 1180], [330, 940], [440, 830], [500, 780], [620, 780], [690, 830], [870, 1180], [1280, 1500], [1280, 2500]], { wash: '#6F7F6A', washOp: 255, fill: DH.greyDk, fillOp: 70, bleed: .3, curv: .15, ink: DH.ink, sw: 1.7 });
  vsRock(300, 1160, 120, { key: 'rk1' }); vsRock(820, 1180, 110, { key: 'rk2' });
  const kinh = span(lt, cue(S, 'kình', 0, 10) - .6, cue(S, 'kình', 0, 10) + .6);
  if (kinh > 0) vsWhale(760, lerp(1700, 1560, kinh), 480, t, { key: 'wh' });
  const call = span(lt, cue(S, 'bà', 0, 6.8), cue(S, 'nói', 0, 7) + .7), wind = .7 + .3 * Math.sin(t * 3);
  nguoi(560, 815, 40, { who: 'baTrieu', t, aL: 1.9, aR: 1.0 + call, mouth: call > .2 ? 'shout' : 'flat', lookX: .6, dx: 6 * wind, hair: 'long', boilKey: 'bt' });
  for (let i = 0; i < 7; i++) { const x = (t * 280 + i * 190) % 1500 - 200, y = 620 + i * 90; inkLine([[x, y], [x + 120, y - 8], [x + 220, y + 6]], 1.4, '#E7EEF2', 'inkfine', .5); }
  camEnd();
});

// ---------- 21: Bà Triệu charges on an elephant, the spear breaks, the elephant kneels ----------
scene('21', (t, lt, dur, S) => {
  vsCam(lt, dur, { x0: 520, y0: 1250, z0: 1.0, x1: 640, y1: 1240, z1: 1.1 });
  vsBackdrop({ sky: 'dusk', sunX: 220, sunY: 560, sunR: 110, rh: 950, seed: 51, land: '#8FA070', land2: '#A3AC78' });
  vsRice(-200, 1300, 1330, 3, { t, key: 'rc', ripe: .5, size: 1.3 });
  const lose = span(lt, cue(S, 'thua', 0, 5.3) - .6, cue(S, 'thua', 0, 5.3) + .8), go = clamp(lt / cue(S, 'thua', 0, 5.3));
  vsArmy(lerp(1700, 1020, ease(go)), lerp(2100, 1360, ease(go)), 1390, 3, 4, 22, t, { col: '#7A4E2A', trim: DH.gold, hat: 'helmet', moving: lose < 1, dir: -1, hold: 'spear', plume: DH.red });
  const ex = lerp(80, 560, ease(go)), ey = 1520;
  vsDust(ex - 200, ey, 70, t, { key: 'dst' });
  vsFall(ex, ey, .1 * lose, -1, () => {
    vsElephant(ex, ey, 190, { t, walk: lose < .3 ? t * 1.0 : null, key: 'be', cloth: DH.yellow });
    nguoi(ex - 19, ey - 304, 40, { who: 'baTrieu', t, noShadow: true, aR: lose > .3 ? 1.0 : 3.14, holdR: lose > .3 ? undefined : 'spear', mouth: lose > .3 ? 'sad' : 'shout', boilKey: 'bt' });
  });
  camEnd();
});

// ---------- 22: Lý Bí is crowned, peach blossoms, the Vạn Xuân flag ----------
scene('22', (t, lt, dur, S) => {
  vsCam(lt, dur, { x0: 540, y0: 1160, z0: 1.0, x1: 540, y1: 1120, z1: 1.14 });
  vsBackdrop({ sky: 'dawn', sunX: 540, sunY: 400, sunR: 120, rh: 960, seed: 61, land: '#86B565', land2: '#8FBB68' });
  vsHall(540, 1240, 640, { key: 'dien', tiers: 2, gold: true });
  const flee = span(lt, cue(S, 'đuổi', 0, 2.8), cue(S, 'hộ', 0, 3.5) + .8);
  for (let i = 0; i < 3; i++) nguoi(lerp(260 + i * 150, -300, flee), 1450, 30, { who: 'hanOfficial', t, walk: flee > 0 && flee < 1 ? t * 2 : null, flip: true, boilKey: `ho${i}`, mouth: 'o' });
  const crown = lt > cue(S, 'ngôi', 0, 4);
  nguoi(540, 1370, 46, { who: 'lyBi', t, hat: crown ? 'crown' : 'helmet', aR: crown ? 3.14 : .3, boilKey: 'lb' });
  const ban = span(lt, cue(S, 'vạn', 0, 6.9) - .3, cue(S, 'xuân', 0, 7.2) + .6);
  if (ban > 0) {
    vsBanner(150, 1330, 560 * ban, { w: 280, fh: 190, kind: 'pennant', col: DH.yellow, key: 'vx', t });
    vsBanner(930, 1330, 560 * ban, { w: -280, fh: 190, kind: 'pennant', col: DH.red, key: 'vx2', t });
  }
  const bloom = span(lt, cue(S, 'xuân', 0, 7.2), dur);
  vsPetals(t, 14 + Math.round(26 * bloom), DH.pink, { key: 'pt' });
  glow(540, 520, 400 * bloom, '#FFD78A', .5 * bloom);
  camEnd();
});

// ---------- 23: torches passed from hand to hand through the ages ----------
scene('23', (t, lt, dur, S) => {
  vsCam(lt, dur, { x0: 540, y0: 1170, z0: 1.0, x1: 540, y1: 1130, z1: 1.08 });
  vsSky('night', { key: 'sky', t });
  vsRidge(1000, 220, '#2E3A5A', { kind: 'range', seed: 71, key: 'r1' });
  vsLand(1060, '#2D4A3A', { key: 'g1' });
  vsLand(1240, '#355A44', { key: 'g2', amp: 5 });
  vsFore(1560, '#1F3A30', { key: 'fore', seed: 8 });
  const crowd = span(lt, cue(S, 'mỗi', 0, 5.8), dur);
  vsCrowd(-40, 1120, 1250, 1290, Math.round(26 * crowd), 14, t, { hold: 'torch', seed: 3 });
  const lights = [cue(S, 'mai', 0, 4.1), cue(S, 'phùng', 0, 4.7), cue(S, 'mỗi', 0, 5.8), cue(S, 'dựng', 0, 6.7), cue(S, 'chống', 0, 7.1)];
  const cast = [{ who: 'vang' }, { who: 'soldier' }, { who: 'chieftain' }, { who: 'farmer' }, { who: 'farmerW' }];
  cast.forEach((c, i) => {
    const on = span(lt, lights[i], lights[i] + .5), x = 150 + i * 195;
    const o = { who: c.who === 'vang' ? 'ngoQuyen' : c.who, t, aR: lerp(0, 3.14, on), holdR: on > 0 ? 'torch' : undefined, lookX: .3, boilKey: `ch${i}` };
    nguoi(x, 1400 + (i % 2) * 40, 44, o);
    if (on > 0) glow(x + 40, 1400 + (i % 2) * 40 - 420, 220 * on, '#FFC766', .7 * on);
  });
  camEnd();
});
