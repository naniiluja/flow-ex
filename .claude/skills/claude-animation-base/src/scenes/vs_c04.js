// vs_c04.js: chương 4, Ngô Quyền, Đinh Bộ Lĩnh, Lê Hoàn (scenes 24-31).

// Piecewise eased value: kf = [[time, value], ...].
const vsKf = (lt, kf) => {
  if (lt <= kf[0][0]) return kf[0][1];
  for (let i = 1; i < kf.length; i++) if (lt <= kf[i][0]) return lerp(kf[i - 1][1], kf[i][1], ease(seg(lt, kf[i - 1][0], kf[i][0])));
  return kf[kf.length - 1][1];
};
// The Bạch Đằng set: sky, hills, a left bank, the river (level lv 0 low tide .. 1 high tide) and a near bank strip.
function vsRiverSet(t, lv, o = {}) {
  vsSky(o.sky || 'day', { key: 'sky', t }); vsSun(o.sunX ?? 860, o.sunY ?? 330, 90, { t, key: 'sun' });
  vsCloud(220, 330, 120, { key: 'c1' }); vsCloud(740, 540, 95, { key: 'c2', ph: 2 });
  vsRidge(990, 240, '#8CA58F', { kind: 'karst', seed: o.seed ?? 81, key: 'r1' });
  vsRidge(1040, 110, '#6F9A6A', { kind: 'hill', seed: (o.seed ?? 81) + 3, key: 'r2' });
  vsLand(1080, '#7CAE5F', { key: 'g1' });
  vsWater(lerp(1330, 1170, lv), 2400, { t, key: 'river', speed: 24, col: o.water || DH.water });
}
const vsBank = (x0, x1, y, col = '#8FBB68') => paint([[x0, 2400], [x0, y], [(x0 + x1) / 2, y - 20], [x1, y + 40], [x1, 2400]], { wash: col, washOp: 255, fill: DH.greenDk, fillOp: 50, bleed: .3, curv: .2, ink: DH.ink, sw: 1.3 });

// ---------- 24: the Nam Hán fleet reaches the Bạch Đằng mouth, Ngô Quyền watches from the bank ----------
scene('24', (t, lt, dur, S) => {
  vsCam(lt, dur, { x0: 560, y0: 1110, z0: 1.0, x1: 520, y1: 1090, z1: 1.1 });
  vsRiverSet(t, .55);
  const come = span(lt, cue(S, 'thuyền', 0, 4.2) - .6, dur);
  [[0, 1480, 440, 1300], [1, 1900, 560, 1370], [2, 2300, 420, 1440]].forEach(([i, x0, s, y]) => {
    const x = lerp(x0, x0 - 1100, come);
    vsWarship(x, y, s, { t, ph: i * 2, dir: -1, col: '#3C3C44', sail: '#C9B88A', shield: DH.redDk, flag: HAN_RED, key: `sh${i}` });
  });
  vsBank(-200, 430, 1300);
  nguoi(250, 1300, 46, { who: 'ngoQuyen', t, lookX: .7, aR: lt > cue(S, 'ngô', 0, 7.3) ? 1.2 : .2, mouth: 'flat', boilKey: 'nq' });
  camEnd();
});

// ---------- 25: iron-tipped stakes planted in the riverbed, the rising tide hides them ----------
scene('25', (t, lt, dur, S) => {
  vsCam(lt, dur, { x0: 540, y0: 1110, z0: 1.0, x1: 540, y1: 1100, z1: 1.1 });
  const lv = vsKf(lt, [[0, .15], [cue(S, 'lúc', 0, 7.7), .15], [cue(S, 'lên', 0, 8.9), 1]]);
  vsRiverSet(t, 0);
  const plant = span(lt, cue(S, 'đóng', 0, 4.2), cue(S, 'sắt', 0, 5.8) + .8);
  vsStakes(220, 900, 1430, 12, { key: 'st', show: plant, h: 240 });
  vsWater(lerp(1330, 1170, lv), 2400, { t, key: 'river2', speed: 24, col: DH.water });
  vsCanoe(380, 1300, 330, { t, key: 'k1', ph: 1, crew: 'soldier' }); vsCanoe(740, 1320, 330, { t, key: 'k2', ph: 2, dir: -1, crew: 'soldier' });
  vsMini(380, 1290, 20, { key: 'p1', t, hat: 'nonla', col: DH.brown, hold: 'spear' }); vsMini(740, 1310, 20, { key: 'p2', t, hat: 'nonla', col: DH.green, hold: 'spear', dir: -1 });
  vsBank(-200, 260, 1280);
  nguoi(160, 1280, 46, { who: 'ngoQuyen', t, lookX: .7, aR: lt > cue(S, 'ông', 0, 3.9) ? 1.2 : .2, mouth: 'talk', talk: 1, boilKey: 'nq' });
  camEnd();
});

// ---------- 26: the tide goes out, the stake tips show like teeth ----------
scene('26', (t, lt, dur, S) => {
  vsCam(lt, dur, { x0: 540, y0: 1110, z0: 1.0, x1: 560, y1: 1090, z1: 1.1 });
  const lv = vsKf(lt, [[0, .4], [cue(S, 'lên', 0, 2.1), 1], [cue(S, 'xuống', 0, 2.4) + .3, .75], [cue(S, 'rút', 0, 5.2), .9], [dur - .2, 0]]);
  vsRiverSet(t, 0);
  vsStakes(180, 920, 1430, 14, { key: 'st', h: 240 });
  vsWater(lerp(1330, 1170, lv), 2400, { t, key: 'river2', speed: 24, col: DH.water });
  const in_ = span(lt, cue(S, 'thuyền', 0, 3.7) - .3, cue(S, 'vào', 0, 4.6) + .5);
  const stuck = span(lt, cue(S, 'rút', 0, 5.2), dur);
  const x = lerp(1500, 780, in_);
  vsWarship(x, 1330 + 50 * stuck, 520, { t, dir: -1, col: '#3C3C44', sail: '#C9B88A', shield: DH.redDk, flag: HAN_RED, key: 'en', tilt: .1 * stuck });
  camEnd();
});

// ---------- 27: lure, turn, fight; enemy ships pierced, burning and sinking ----------
scene('27', (t, lt, dur, S) => {
  vsCam(lt, dur, { x0: 540, y0: 1110, z0: 1.0, x1: 540, y1: 1090, z1: 1.1 });
  const turn = cue(S, 'quay', 0, 2.6), tide = cue(S, 'rút', 0, 3.7);
  const lv = vsKf(lt, [[0, 1], [tide - .3, 1], [tide + .8, 0]]);
  vsRiverSet(t, 0, { sky: lt > cue(S, 'mắc', 0, 4.7) ? 'fire' : 'day' });
  vsStakes(200, 900, 1430, 12, { key: 'st', h: 240 });
  vsWater(lerp(1330, 1170, lv), 2400, { t, key: 'river2', speed: 24, col: DH.water });
  const burn = span(lt, cue(S, 'vỡ', 0, 5.4), dur), sink = span(lt, cue(S, 'chìm', 0, 6.0), dur);
  // enemy ships: chase left, then jam on the stakes
  [[0, 1180, 1340], [1, 1560, 1400]].forEach(([i, x0, y]) => {
    const chase = span(lt, 0, cue(S, 'mắc', 0, 4.7));
    const x = lerp(x0, x0 - 520, chase) + (i === 0 ? 0 : 60);
    const yy = y + sink * 130, tilt = .16 * span(lt, cue(S, 'mắc', 0, 4.7), cue(S, 'tan', 0, 5.6)) + .35 * sink;
    vsWarship(x, yy, 470, { t, dir: -1, col: '#3C3C44', sail: lt > cue(S, 'vỡ', 0, 5.4) ? '#6A5A4A' : '#C9B88A', shield: DH.redDk, flag: HAN_RED, key: `en${i}`, ph: i * 2, tilt });
    if (burn > 0) { vsFire(x - 40, yy - 100, 46 * burn, t, { key: `f${i}`, glow: .5 }); vsSmoke(x - 40, yy - 160, 70, t, { key: `sm${i}` }); }
  });
  // Việt boats lure to the left, turn on "quay lại" and strike back
  const back = span(lt, turn, cue(S, 'đánh', 0, 3.2) + 1.5);
  [0, 1, 2].forEach(i => {
    const x = lerp(lerp(900, 360, span(lt, 0, turn)) - i * 130, 1050, back) + (i === 1 ? 40 : 0);
    const dir = lt < turn ? -1 : 1;
    vsCanoe(x, 1330 + i * 14, 300, { t, crew: 'soldier', key: `v${i}`, ph: i, dir });
    vsMini(x, 1318 + i * 14, 20, { key: `vm${i}`, t, hat: 'nonla', col: [DH.red, DH.indigo, DH.green][i], hold: 'spear', dir });
  });
  camEnd();
});

// ---------- 28: Ngô Quyền on the throne at Cổ Loa, the chain of Bắc thuộc breaks and falls ----------
scene('28', (t, lt, dur, S) => {
  vsCam(lt, dur, { x0: 540, y0: 1130, z0: 1.0, x1: 540, y1: 1090, z1: 1.12 });
  vsBackdrop({ sky: 'dawn', sunX: 540, sunY: 430, sunR: 120, rh: 960, seed: 91, land: '#86B565', land2: '#8FBB68' });
  vsHall(540, 1160, 640, { key: 'cl', tiers: 2, gold: true });
  const king = span(lt, cue(S, 'xưng', 0, 1.3), cue(S, 'vương', 0, 1.4) + .5);
  vsThrone(540, 1330, 220, { key: 'th' });
  nguoi(540, 1330 - 220 * .1, 38, { who: 'ngoQuyen', t, hat: king > 0 ? 'crown' : 'helmet', outfit: king > 0 ? { kind: 'robe', col: DH.red, col2: DH.gold } : undefined, noShadow: true, aR: king > 0 ? 1.4 : .3, boilKey: 'nq' });
  const fall = span(lt, cue(S, 'bắc', 0, 4.4) - .3, cue(S, 'bắc', 0, 4.4) + 1.0), snap = span(lt, cue(S, 'dứt', 0, 3.1) - .2, cue(S, 'dứt', 0, 3.1) + .6);
  if (lt > cue(S, 'chấm', 0, 2.8) - .4 && fall < 1) vsChain(120, 960, lerp(560, 1400, easeIn(fall)), snap, { key: 'ch' });
  if (fall >= 1) vsChain(120, 960, 1400, 1, { key: 'ch' });
  vsCrowd(60, 1020, 1380, 1440, 18, 21, t, { cheer: true, seed: 7 });
  camEnd();
});

// ---------- 29: twelve warlords; the herd boy of Hoa Lư plays general with reed plumes ----------
scene('29', (t, lt, dur, S) => {
  const cut = cue(S, 'có', 0, 3.2);
  if (lt < cut + .3) {
    vsCam(lt, dur, { x0: 540, y0: 1110, z0: 1.0, x1: 540, y1: 1090, z1: 1.06 });
    vsBackdrop({ sky: 'grey', sunX: 840, sunY: 340, sunR: 80, sunCol: '#E8E0D0', rh: 960, seed: 95, land: '#8FA070', land2: '#A3AC78' });
    const cols = [DH.red, DH.indigo, DH.green, DH.yellow, DH.orange, '#9C6A8A', DH.redDk, DH.greenDk, DH.brown, DH.pink, DH.indigoDk, DH.tan];
    const pop = clamp((lt - cue(S, 'mười', 0, 1.7)) / .9 * 12 / 12);
    for (let i = 0; i < 12; i++) {
      const k = clamp(pop * 12 - i), x = 90 + (i % 6) * 180 + (i >= 6 ? 90 : 0), y = i < 6 ? 1230 : 1360;
      if (k > 0) vsBanner(x, y, 330 * backOut(k), { w: 150, fh: 100, kind: 'pennant', col: cols[i], key: `w${i}`, t, ph: i });
    }
    camEnd();
  } else {
    vsCam(lt, dur, { x0: 540, y0: 1110, z0: 1.0, x1: 540, y1: 1090, z1: 1.1 });
    vsBackdrop({ sky: 'day', sunX: 880, sunY: 330, rh: 940, seed: 97, land: '#86B565', land2: '#9CC36F' });
    vsBuffalo(160, 1230, 190, { t, key: 'bf', walk: t * .3 });
    const flagUp = span(lt, cue(S, 'lau', 0, 6.6), cue(S, 'cờ', 0, 7.0) + .5), line = span(lt, cue(S, 'bày', 0, 7.3), cue(S, 'chơi', 0, 8.4));
    nguoi(540, 1300, 48, { who: 'boy', t, aR: lerp(.3, 3.14, flagUp), holdR: flagUp > 0 ? 'flag' : undefined, mouth: 'grin', boilKey: 'dbl' });
    for (let i = 0; i < 12; i++) {
      const row = i >> 2, col = i % 4, tx = 130 + col * 230 + row * 30, ty = 1400 + row * 24;
      const k = clamp(line * 1.3 - i * .06);
      vsMini(lerp(540 + (i % 2 ? 300 : -300), tx, k), ty, 18, { key: `kd${i}`, t, ph: i, moving: k > 0 && k < 1, col: [DH.red, DH.indigo, DH.green][i % 3], hat: 'none', hold: 'flag', flag: DH.white, dir: 1 });
    }
    camEnd();
  }
  if (lt > cut - .35 && lt < cut + .35) brushWipe((lt - (cut - .35)) / .7, ['#B8893A', '#E7B232']);
});

// ---------- 30: Đinh Bộ Lĩnh ends the twelve warlords, is crowned at Hoa Lư between limestone peaks ----------
scene('30', (t, lt, dur, S) => {
  vsCam(lt, dur, { x0: 540, y0: 1100, z0: 1.0, x1: 540, y1: 1090, z1: 1.1 });
  vsSky('dawn', { key: 'sky' }); vsSun(540, 460, 100, { t, key: 'sun' });
  vsRidge(900, 380, '#7F9A88', { kind: 'karst', seed: 101, key: 'r1' });
  vsRidge(1000, 300, '#6F9A6A', { kind: 'karst', seed: 104, key: 'r2' });
  vsLand(1060, '#7CAE5F', { key: 'g1' });
  const hall = span(lt, cue(S, 'kinh', 0, 7.3), cue(S, 'lư', 0, 8.1) + .5);
  if (hall > 0) vsHall(540, 1120, 520 * backOut(hall), { key: 'hl', tiers: 2, gold: true });
  vsLand(1220, '#9CC36F', { key: 'g2', amp: 5 });
  vsFore(1460, '#9CC36F', { key: 'fore', seed: 11 });
  const cols = [DH.red, DH.indigo, DH.green, DH.yellow, DH.orange, '#9C6A8A', DH.redDk, DH.greenDk, DH.brown, DH.pink, DH.indigoDk, DH.tan];
  const bow = span(lt, cue(S, 'dẹp', 0, 1.4), cue(S, 'quân', 0, 2.6) + .6);
  for (let i = 0; i < 12; i++) {
    const a = Math.PI * (.12 + .76 * (i / 11)), x = 540 - Math.cos(a) * 420, y = 1360 - Math.sin(a) * 90;
    vsBanner(x, y, 300 * (1 - .8 * bow), { w: 130 * (1 - .3 * bow), fh: 90 * (1 - .4 * bow), kind: 'pennant', col: cols[i], key: `w${i}`, t, ph: i });
  }
  const crown = lt > cue(S, 'ngôi', 0, 3.3);
  vsBanner(540, 1420, 480, { w: 300, fh: 200, kind: 'pennant', col: DH.yellow, key: 'dai', t });
  nguoi(540, 1400, 44, { who: 'dinhBoLinh', t, hat: crown ? 'crown' : 'helmet', aR: crown ? 3.14 : .3, boilKey: 'dbl' });
  camEnd();
});

// ---------- 31: Lê Hoàn on a warship beats the Song fleet, which retreats into mist ----------
scene('31', (t, lt, dur, S) => {
  vsCam(lt, dur, { x0: 540, y0: 1110, z0: 1.0, x1: 600, y1: 1090, z1: 1.1 });
  vsRiverSet(t, .6, { sky: 'dawn', sunX: 780, sunY: 400 });
  const chase = span(lt, cue(S, 'đánh', 0, 3.5), dur), mist = span(lt, cue(S, 'bại', 0, 4.0), cue(S, 'cõi', 0, 6.3));
  [[0, 640, 1330], [1, 960, 1380], [2, 1280, 1440]].forEach(([i, x0, y]) => vsWarship(lerp(x0, x0 + 520, chase), y, 420, { t, dir: 1, col: '#8A7A5A', sail: '#E8C97A', shield: DH.yellow, flag: DH.yellow, key: `so${i}`, ph: i * 2 }));
  if (mist > 0) [[820, 1100, 300], [1040, 1230, 340], [700, 1300, 280], [980, 980, 320], [1150, 1120, 340], [760, 960, 260]].forEach(([x, y, r], i) => vsCloud(x, y, r * (.6 + .4 * mist), { key: `mst${i}`, op: 255 * mist, ph: i }));
  vsWarship(300, 1400, 560, { t, dir: 1, col: DH.brownDk, sail: '#E6D6A8', shield: DH.indigo, flag: DH.red, key: 'lh' });
  nguoi(260, 1400 - 560 * .24, 36, { who: 'leHoan', t, noShadow: true, aR: 1.4 + .5 * Math.sin(t * 2), holdR: 'sword', mouth: lt > cue(S, 'đánh', 0, 3.5) ? 'shout' : 'flat', lookX: .5, boilKey: 'lh1' });
  camEnd();
});
