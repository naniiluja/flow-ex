// vs_c02.js: chương 2, Văn Lang và Âu Lạc (scenes 08-15).

// ---------- 08: the dragon lord of the sea marries the fairy of the mountain; a bundle of a hundred eggs hatches ----------
scene('08', (t, lt, dur, S) => {
  vsSky('dawn', { key: 'sky' });
  vsCam(lt, dur, { x0: 540, y0: 990, z0: 1.02, x1: 540, y1: 960, z1: 1.12 });
  vsSun(540, 380, 100, { t, key: 'sun' }); vsCloud(170, 280, 120, { key: 'c1' }); vsCloud(900, 520, 100, { key: 'c2', ph: 2 });
  vsRidge(960, 300, '#8CA58F', { kind: 'karst', seed: 14, key: 'r1', pan: 420 });
  vsLand(1000, '#7CAE5F', { key: 'g1' });
  paint([[-500, 960], [470, 1000], [520, 1190], [470, 1330], [-500, 1330]], { wash: DH.water, washOp: 255, fill: DH.skyDk, fillOp: 70, bleed: .3, curv: .2, ink: DH.ink, sw: 1.2 });
  vsWater(1000, 1330, { t, key: 'sea', speed: 26, col: DH.water });
  vsLand(1190, '#9CC36F', { key: 'g2', amp: 5 });
  paint([[-500, 1000], [470, 1010], [520, 1190], [-500, 1330]], { wash: DH.water, washOp: 255, ink: null });
  vsFore(1460, '#9CC36F', { key: 'fore', seed: 6 });
  const meet = span(lt, cue(S, 'cưới', 0, 3), cue(S, 'cưới', 0, 3) + 1.4);
  nguoi(lerp(240, 430, meet), 1170, 52, { who: 'lacLong', t, walk: meet > 0 && meet < 1 ? t * 1.2 : null, lookX: .5, mouth: 'smile', boilKey: 'lac' });
  nguoi(lerp(860, 650, meet), 1170, 52, { who: 'auco', t, flip: true, walk: meet > 0 && meet < 1 ? t * 1.2 : null, lookX: -.5, mouth: 'smile', boilKey: 'au' });
  const sac = span(lt, cue(S, 'bọc', 0, 4.6), cue(S, 'bọc', 0, 4.6) + .8), open = span(lt, cue(S, 'nở', 0, 6.7), dur - .3);
  if (sac > 0) { glow(540, 1150, 260 * sac, '#FFF1C2', .7 * sac); vsEggSac(540, 1350, 230 * sac, t, { open, key: 'eggs', n: 40 }); }
  camEnd();
});

// ---------- 09: fifty go to the sea, fifty to the mountains; the eldest stays and becomes Hùng Vương ----------
scene('09', (t, lt, dur, S) => {
  vsCam(lt, dur, { x0: 540, y0: 980, z0: 1.0, x1: 540, y1: 960, z1: 1.1 });
  vsBackdrop({ sky: 'dawn', sunX: 540, sunY: 420, sunR: 110, rh: 960, seed: 9, land: '#86B565', land2: '#9CC36F' });
  paint([[-500, 1000], [260, 1010], [330, 1190], [-500, 1330]], { wash: DH.water, washOp: 255, ink: null });
  vsWater(1000, 1330, { t, key: 'sea', speed: 22 });
  vsLand(1190, '#9CC36F', { key: 'g2b', amp: 5 });
  const eldest0 = 0, left = span(lt, cue(S, 'xuống', 0, 1.3), cue(S, 'biển', 0, 1.7) + 1.8), right = span(lt, cue(S, 'lên', 0, 3.4), cue(S, 'núi', 0, 3.6) + 1.8);
  nguoi(130, 1180, 46, { who: 'lacLong', t, lookX: .5, aR: 2.3, boilKey: 'lac' });
  nguoi(950, 1180, 46, { who: 'auco', t, flip: true, lookX: -.5, aR: 2.3, boilKey: 'au' });
  for (let i = 0; i < 16; i++) {
    const row = i % 4, ph = hash(i * 7) * .25, y = 1210 + row * 38;
    vsMini(lerp(500, 120, clamp(left * 1.1 - ph)) - row * 14, y, 19, { key: `kl${i}`, t, ph: i, moving: left > 0 && left < 1, col: [DH.red, DH.indigo, DH.green][i % 3], hat: 'none', dir: -1 });
    vsMini(lerp(580, 960, clamp(right * 1.1 - ph)) + row * 14, y, 19, { key: `kr${i}`, t, ph: i + 3, moving: right > 0 && right < 1, col: [DH.yellow, DH.green, DH.red][i % 3], hat: 'none', dir: 1 });
  }
  const crown = span(lt, cue(S, 'vua', 0, 6.5), cue(S, 'vua', 0, 6.5) + .5), eldest = span(lt, cue(S, 'con', 1, 4.4), cue(S, 'cả', 0, 4.6) + .4);
  nguoi(540, 1160, 56, { who: 'hung', t, hat: crown > 0 ? 'feather' : 'none', hair: 'short', outfit: crown > 0 ? undefined : { kind: 'tunic', col: DH.red, col2: DH.yellow }, aR: crown > 0 ? 1.6 + .3 * Math.sin(t * 5) : .2, boilKey: 'eld' });
  camEnd();
});

// ---------- 10: eighteen reigns, paddies and a dyke, Sơn Tinh against Thuỷ Tinh ----------
scene('10', (t, lt, dur, S) => {
  vsCam(lt, dur, { x0: 540, y0: 980, z0: 1.0, x1: 540, y1: 960, z1: 1.1 });
  vsBackdrop({ sky: 'day', sunX: 900, sunY: 300, rh: 940, seed: 12, land: '#86B565', land2: '#8FBB68' });
  const crowns = clamp((lt - cue(S, 'mười', 0, .9)) / 1.3);
  for (let i = 0; i < 18; i++) if (i < crowns * 18) vsCrownIcon(70 + (i % 9) * 118, 150 + Math.floor(i / 9) * 110, 38 * backOut(clamp(crowns * 18 - i)));
  const farm = 1;
  vsRice(60, 460, 1260, 3, { t, key: 'rice', ripe: .2, size: 1.2 });
  vsBuffalo(780, 1250, 200, { t, walk: t * .7, key: 'buf' });
  nguoi(640, 1250, 48, { who: 'farmer', t, walk: t * .7, aR: 1.0, holdR: 'staff', lookX: .5, boilKey: 'f1' });
  nguoi(230, 1200, 48, { who: 'farmerW', t, aL: 1.2 + .4 * Math.sin(t * 3), lookX: .5, boilKey: 'f2' });
  const dyke = span(lt, cue(S, 'cấy', 0, 3.6), cue(S, 'nước', 1, 4) + .6);
  paint([[-80, 1190], [200, 1190 - 70 * dyke], [900, 1190 - 70 * dyke], [1200, 1190]], { wash: DH.earth, washOp: 255, fill: DH.brownDk, fillOp: 60, bleed: .3, curv: .25, ink: DH.ink, sw: 1.3 });
  const fight = span(lt, cue(S, 'sơn', 0, 6.9), cue(S, 'sơn', 0, 6.9) + .8);
  if (fight > 0) {
    const tide = .5 + .5 * Math.sin(t * 2.2), push = span(lt, cue(S, 'dâng', 0, 8.8) - .8, cue(S, 'dâng', 0, 8.8) + .2);
    const sx = 270, sy = lerp(900, 640, fight);
    paint([[sx - 190, 1020], [sx - 120, 800], [sx, 600 + (1 - fight) * 300], [sx + 120, 800], [sx + 190, 1020]], { wash: '#6F9A6A', washOp: 255, curv: .3, ink: DH.ink, sw: 1.6 });
    nguoi(sx, sy + 50, 40, { who: 'hung', t, hat: 'none', hair: 'short', outfit: { kind: 'armor', col: DH.green, col2: DH.greenDk }, aR: 2.4 + .3 * Math.sin(t * 6), holdR: 'staff', mouth: 'shout', talk: t, brow: -1, noShadow: true, boilKey: 'sontinh' });
    vsDragon(770, lerp(1000, 700, fight), 130, { t, col: DH.skyDk, span: 1.6, key: 'thuytinh' });
    for (let i = 0; i < 6; i++) { const wx = 540 + i * 100, wh = (40 + 50 * tide) * (1 + push); paint([[wx - 70, 1190], [wx - 20, 1190 - wh], [wx + 30, 1190]], { wash: DH.water, washOp: 220, curv: .4, ink: DH.ink, sw: .8 }); }
  }
  camEnd();
});

// ---------- 11: the Qin come down; lowland and mountain peoples fight together ----------
scene('11', (t, lt, dur, S) => {
  vsCam(lt, dur, { x0: 540, y0: 980, z0: 1.0, x1: 540, y1: 960, z1: 1.1 });
  vsBackdrop({ sky: 'grey', sun: false, clouds: true, rh: 930, seed: 6, land: '#7C9E5A', land2: '#8DAA66' });
  const march = clamp(lt / (dur - 2));
  const qin = span(lt, cue(S, 'quân', 0, 1.4), cue(S, 'xuống', 0, 2.9));
  vsArmy(-260 + 420 * qin, 160 + 420 * qin, 1190, 3, 5, 21, t, { col: DH.ink, trim: DH.greyDk, hat: 'helmet', plume: DH.ink, hold: 'spear', moving: qin < 1, dir: 1, pants: DH.greyDk });
  vsBanner(100 + 420 * qin, 1220, 420, { t, col: DH.ink, key: 'qin' });
  const allies = span(lt, cue(S, 'người', 0, 3.3), cue(S, 'việt', 1, 5.6)), volley = lt > cue(S, 'hợp', 0, 6.5);
  const hill = span(lt, cue(S, 'âu', 0, 6.1), cue(S, 'núi', 0, 6.3)), bows = [];
  if (allies > 0) {
    const cx = lerp(1250, 700, allies);
    nguoi(cx, 1230, 50, { who: 'chieftain', t, flip: true, walk: allies < 1 ? t * 1.3 : null, ...(volley ? { holdR: { k: 'bowdrawn' }, aR: 1.9, aL: -1.9, bend: .1 } : { holdR: 'bow', aR: 2.0 }), boilKey: 'lac1' });
    if (volley) bows.push(vsNguoiBow(cx, 1230, 50, true));
    vsMini(lerp(1350, 960, allies), 1240, 20, { key: 'l2', t, moving: allies < 1, hat: 'feather', col: DH.red, hold: volley ? 'bow' : 'spear', dir: -1 });
    vsMini(lerp(1420, 1040, allies), 1215, 20, { key: 'l3', t, moving: allies < 1, hat: 'feather', col: DH.yellow, hold: volley ? 'bow' : 'spear', dir: -1 });
    if (volley) { bows.push(vsMiniBow(lerp(1350, 960, allies), 1240, 20, -1), vsMiniBow(lerp(1420, 1040, allies), 1215, 20, -1)); }
  }
  if (hill > 0) {
    paint([[760, 1010], [860, 700], [1060, 700], [1300, 1010]], { wash: '#8A7A5A', washOp: 255, curv: .25, fill: DH.brownDk, fillOp: 50, ink: DH.ink, sw: 1.5 });
    for (let i = 0; i < 4; i++) {
      const mx = 880 + i * 70, my = 706 + (i % 2) * 6;
      vsMini(mx, my, 19 * hill, { key: `av${i}`, t, hat: 'feather', col: DH.green, hold: volley ? 'bow' : 'none', cheer: volley ? 0 : .5 + .5 * Math.sin(t * 5 + i), dir: -1 });
      if (volley) bows.push(vsMiniBow(mx, my, 19, -1));
    }
  }
  if (volley) vsArrows(t, 0, 0, 330, 1180, 0, { from: bows, h: 220, rate: .8, spread: 14 });
  camEnd();
});

// ---------- 12: Thục Phán becomes An Dương Vương and raises the spiral citadel of Cổ Loa ----------
scene('12', (t, lt, dur, S) => {
  vsCam(lt, dur, { x0: 540, y0: 980, z0: 1.0, x1: 540, y1: 960, z1: 1.08 });
  vsBackdrop({ sky: 'dusk', sunX: 840, sunY: 520, sunR: 120, rh: 960, seed: 17, land: '#7C9E5A', land2: '#8DAA66', clouds: false });
  const king = span(lt, cue(S, 'lên', 0, 2), cue(S, 'lên', 0, 2) + .5), city = span(lt, cue(S, 'thành', 0, 5.8) - .5, dur - .5);
  const small = span(lt, cue(S, 'thành', 0, 5.8) - .4, cue(S, 'thành', 0, 5.8) + .6);
  nguoi(lerp(540, 250, small), 1240, lerp(58, 40, small), { who: 'anDuong', t, hat: king > 0 ? 'helmet' : 'wrap', hatCol: king > 0 ? DH.gold : DH.red, aR: 1.3, lookX: .3, mouth: 'open', talk: t * .5, boilKey: 'king' });
  if (city > 0) {
    const cx = 640, cy = 700, rings = [330, 230, 130];
    for (let ri = 0; ri < 3; ri++) {
      const k = clamp(city * 3.2 - ri * .9), n = Math.floor(48 * k), P = [];
      for (let i = 0; i <= n; i++) { const a = i / 48 * TAU * 1.0 - 1.57, r = rings[ri] * (1 - i / 48 * .04); P.push([cx + Math.cos(a) * r * 1.0, cy + Math.sin(a) * r * .62]); }
      if (P.length > 2) { paint(ribbon(P, 56 - ri * 8, 48 - ri * 8), { wash: DH.earth, washOp: 255, ink: DH.ink, sw: 1.3, curv: .4 }); inkLine(P, 1.2, DH.water, 'inkfine', .5); }
    }
    if (city > .85) vsBanner(cx, cy + 20, 150, { t, kind: 'pennant', col: DH.red, key: 'cl' });
  }
  camEnd();
});

// ---------- 13: the golden turtle gives a claw; the divine crossbow breaks the siege ----------
scene('13', (t, lt, dur, S) => {
  vsCam(lt, dur, { x0: 540, y0: 980, z0: 1.0, x1: 520, y1: 960, z1: 1.08 });
  vsBackdrop({ sky: 'day', sunX: 880, sunY: 280, rh: 960, seed: 8, land: '#7C9E5A', land2: '#8DAA66', gy1: 1010, gy2: 1260 });
  vsWall(300, 880, 1040, 170, { gate: true, key: 'w' });
  vsWater(1190, 1330, { t, key: 'moat', speed: 18 });
  const turtle = span(lt, cue(S, 'rùa', 0, 1.2), cue(S, 'rùa', 0, 1.2) + .8);
  vsTurtle(210, lerp(1400, 1285, turtle), 120, { t, key: 'kq', glow: .8 * turtle });
  const claw = span(lt, cue(S, 'móng', 0, 2.4), cue(S, 'móng', 0, 2.4) + 1.0), shoot = lt > cue(S, 'bắn', 0, 4.1);
  nguoi(560, 1260, 52, { who: 'anDuong', t, ...(claw > .95 ? { aR: 1.9, aL: -1.9, bend: .1, holdR: { k: 'crossbowaim', nock: !shoot || frac(t * 1.3) < .75 }, lookX: .3 } : { aR: 1.2, lookX: -.4, flip: true }), boilKey: 'king' });
  // the claw flies from the turtle into An Dương Vương's outstretched hand (nguoiHand), not to a guessed point
  const kingHand = nguoiHand(560, 1260, 52, { who: 'anDuong', aR: 1.2, flip: true }, 1);
  if (claw > 0 && claw < .95) { const [px, py] = arcPt([260, 1290], kingHand, 100, claw); paint([[px - 10, py], [px, py - 28], [px + 10, py]], { wash: DH.gold, washOp: 255, ink: DH.ink, sw: .8 }); glow(px, py - 12, 60, '#FFE38A', .8); }
  if (shoot) vsArrows(t, 0, 0, 1050, 1180, 0, { from: [vsNguoiBow(560, 1260, 52, false)], h: 150, rate: 1.3, spread: 24, phase: .75 });
  const fall = span(lt, cue(S, 'ngã', 0, 6.2), cue(S, 'ngã', 0, 6.2) + 1.0);
  for (let i = 0; i < 5; i++) vsFall(930 + (i % 3) * 70, 1190 + (i % 2) * 40, clamp(fall * 1.3 - i * .1), 1, () => vsMini(930 + (i % 3) * 70, 1190 + (i % 2) * 40, 18, { key: `q${i}`, t, col: DH.ink, hat: 'helmet', hold: 'spear', dir: -1 }));
  camEnd();
});

// ---------- 14: a wedding and a swap: the crossbow is exchanged, the gates open ----------
scene('14', (t, lt, dur, S) => {
  vsCam(lt, dur, { x0: 540, y0: 980, z0: 1.0, x1: 540, y1: 960, z1: 1.1 });
  vsBackdrop({ sky: 'dusk', sunX: 220, sunY: 520, rh: 960, seed: 19, land: '#7C9E5A', land2: '#8DAA66', clouds: false });
  vsGate(760, 1170, 520, { key: 'g' });
  const swap = span(lt, cue(S, 'tráo', 0, 5.4), cue(S, 'tráo', 0, 5.4) + .9);
  nguoi(330, 1230, 52, { who: 'auco', t, outfit: { kind: 'skirt', col: DH.red, col2: DH.yellow, top: DH.yellow }, hat: 'flower', aR: 1.4, lookX: .4, boilKey: 'bride' });
  nguoi(520, 1230, 52, { who: 'mandarin', t, flip: true, hat: 'khan', hatCol: DH.indigo, beard: 'none', outfit: { kind: 'robe', col: DH.indigo, col2: DH.yellow }, aL: swap > 0 ? 1.6 : .3, holdL: swap > 0 && swap < .5 ? 'crossbow' : null, lookX: -.4, boilKey: 'groom' });
  if (swap > .5) { push(); translate(0, 0); pop(); }
  const gate = span(lt, cue(S, 'quân', 0, 6.7), cue(S, 'vào', 0, 7.5));
  if (gate > 0) for (let i = 0; i < 4; i++) vsMini(lerp(1250, 700, clamp(gate * 1.2 - i * .1)) + i * 70, 1250 + (i % 2) * 20, 20, { key: `z${i}`, t, moving: gate < 1, col: DH.redDk, hat: 'helmet', hold: 'spear', dir: -1 });
  camEnd();
});

// ---------- 15: the king rides to the sea; the north takes the land for a thousand years ----------
scene('15', (t, lt, dur, S) => {
  const night = span(lt, cue(S, 'từ', 0, 8.4), cue(S, 'từ', 0, 8.4) + 1.6);
  vsCam(lt, dur, { x0: 540, y0: 980, z0: 1.02, x1: 560, y1: 960, z1: 1.1 });
  vsSky(night > .5 ? 'night' : 'dusk', { key: 'sky', t });
  if (night < .5) vsSun(300, 640 + 140 * night, 170, { t, key: 'sun', col: DH.red });
  else vsMoon(300, 520, 100, { key: 'moon' });
  vsRidge(980, 240, night > .5 ? '#3C4C6A' : '#8A6B72', { kind: 'karst', seed: 23, key: 'r1' });
  vsLand(1060, night > .5 ? '#3E5A4A' : '#6E8A58', { key: 'g1' });
  vsWater(1060, 1330, { t, key: 'sea', speed: 34, col: night > .5 ? '#2F4A7A' : DH.water });
  vsLand(1330, night > .5 ? '#46614E' : '#8B9F5E', { key: 'g2', amp: 4 });
  vsFore(1500, night > .5 ? '#46614E' : '#8B9F5E', { key: 'fore', seed: 2 });
  const ride = clamp(lt / cue(S, 'sử', 0, 3.6));
  if (ride < 1.0) { vsHorse(lerp(-100, 700, ease(ride)), 1360, 230, { t, gallop: t * 1.8, key: 'h' }); nguoi(lerp(-100, 700, ease(ride)) - 12, 1360 - 1.36 * 230, 34, { who: 'anDuong', t, noShadow: true, aR: 1.0, boilKey: 'kr' }); }
  else { vsHorse(700, 1360, 230, { t, gallop: null, key: 'h' }); nguoi(688, 1360 - 1.36 * 230, 34, { who: 'anDuong', t, noShadow: true, aR: 1.0, boilKey: 'kr' }); }
  const turtle = span(lt, cue(S, 'biển', 0, 3.2), cue(S, 'biển', 0, 3.2) + .8) * (1 - night);
  if (turtle > 0) vsTurtle(900, 1250 + 40 * (1 - turtle), 90, { t, key: 'kq2', glow: .6 });
  if (night > 0) { for (let i = 0; i < 9; i++) vsMini(120 + i * 110, 1420 + (i % 3) * 30, 20, { key: `e${i}`, t, col: DH.ink, hat: 'helmet', hold: 'flag', flag: DH.ink, dir: 1, plume: DH.ink }); }
  camEnd();
});
