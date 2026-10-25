// vs_c07.js: chương 7, Lê Lợi và Nguyễn Trãi (scenes 47-55).

const MING = '#7A2A2A';
// A sword broken in two: blade (len along +y down from the top) and hilt, drawn at (x, y) = top of the piece.
function vsBlade(x, y, len, o = {}) {
  boilSeed(`blade ${o.key ?? 0}`);
  paint([[x - 16, y], [x + 16, y], [x + 10, y + len], [x, y + len + 30], [x - 10, y + len]], { wash: o.col || '#DDE6EC', washOp: 255, fill: DH.skyDk, fillOp: 50, ink: DH.ink, sw: 1.6, curv: .05 });
  inkLine([[x, y + 10], [x, y + len]], 1.2, '#8FA4B2', 'inkfine', 0);
}
function vsHilt(x, y, len, o = {}) {
  boilSeed(`hilt ${o.key ?? 0}`);
  paint(rectPts(x - 12, y, 24, len), { wash: DH.redDk, washOp: 255, ink: DH.ink, sw: 1.4 });
  paint(rectPts(x - 38, y - 18, 76, 22), { wash: DH.gold, washOp: 255, ink: DH.ink, sw: 1.4 });
  paint(ellPts(x, y + len + 10, 16, 16, 12), { wash: DH.gold, washOp: 255, ink: DH.ink, sw: 1.2 });
}

// ---------- 47: Trần fall, Hồ rise and fall quickly, then the Minh flag drapes over the capital ----------
scene('47', (t, lt, dur, S) => {
  vsCam(lt, dur, { x0: 540, y0: 1130, z0: 1.0, x1: 540, y1: 1100, z1: 1.08 });
  vsBackdrop({ sky: 'grey', sunX: 840, sunY: 380, sunR: 80, sunCol: '#E8E0D0', rh: 960, seed: 231, land: '#8FA070', land2: '#A3AC78', fore: false });
  vsWall(-40, 1120, 1160, 190, { gate: true, key: 'kt' });
  vsHall(540, 1010, 360, { key: 'ht', tiers: 2 });
  const ho = lt > cue(S, 'hồ', 0, 2.9), fallK = span(lt, cue(S, 'đổ', 0, 4.7) - .2, cue(S, 'đổ', 0, 4.7) + .7);
  vsFall(300, 1400, fallK, -1, () => vsBanner(300, 1400, 420, { w: 240, fh: 150, kind: ho ? undefined : 'pennant', col: ho ? DH.indigo : DH.red, key: 'bn', t }));
  const drape = span(lt, cue(S, 'minh', 0, 6.5) - .2, cue(S, 'minh', 0, 6.5) + 1.8);
  if (drape > 0) {
    paint([[160, 640], [920, 640], [920 + Math.sin(t * 2) * 8, 640 + 820 * drape], [540, 640 + 880 * drape + Math.sin(t * 3) * 10], [160 + Math.sin(t * 2) * 8, 640 + 820 * drape]], { wash: MING, washOp: 255, fill: DH.ink, fillOp: 40, ink: DH.ink, sw: 2, curv: .12 });
    if (drape > .7) paint(ellPts(540, 640 + 380 * drape, 90, 90, 20), { wash: DH.gold, washOp: 255, ink: DH.ink, sw: 1.2 });
  }
  camEnd();
});

// ---------- 48: forced to mine gold, dive for pearls and pay salt tax ----------
scene('48', (t, lt, dur, S) => {
  vsCam(lt, dur, { x0: 540, y0: 1130, z0: 1.0, x1: 540, y1: 1100, z1: 1.06 });
  vsBackdrop({ sky: 'grey', sunX: 840, sunY: 380, sunR: 80, sunCol: '#E8E0D0', rh: 960, seed: 241, land: '#8FA070', land2: '#A3AC78', fore: false });
  const a = span(lt, cue(S, 'núi', 0, 1.3) - .2, cue(S, 'núi', 0, 1.3) + .5), b = span(lt, cue(S, 'biển', 0, 2.4) - .2, cue(S, 'biển', 0, 2.4) + .5), c = span(lt, cue(S, 'thuế', 0, 3.8) - .2, cue(S, 'thuế', 0, 3.8) + .5);
  if (a > 0) {
    paint([[-100, 1450], [60, 1050], [300, 860], [520, 1050], [620, 1450]], { wash: '#8A6A4A', washOp: 255, fill: DH.brownDk, fillOp: 60, curv: .2, ink: DH.ink, sw: 1.6 });
    paint(ellPts(260, 1360, 100 * a, 130 * a, 20), { wash: '#2B2233', washOp: 255, ink: DH.ink, sw: 1.4 });
    for (let i = 0; i < 3; i++) vsMini(120 + i * 70 + Math.sin(t * 3 + i) * 6, 1480, 17, { key: `mn${i}`, t, ph: i, moving: true, col: DH.brown, hat: 'nonla', hold: 'none' });
    vsSack(430, 1470, 80, { key: 'gd', col: DH.gold });
  }
  if (b > 0) {
    vsWater(1300, 2400, { t, key: 'sea', speed: 26, col: DH.water });
    vsCanoe(780, 1360, 280, { t, key: 'dv' });
    vsMini(780, 1350, 17, { key: 'dvm', t, hat: 'none', col: DH.brown });
    const dive = Math.abs(Math.sin(t * 1.4));
    vsDollHeadAt(680, 1420 + dive * 100, 20, { hair: 'short' });
    for (let i = 0; i < 4; i++) paint(ellPts(690 + i * 10, 1380 - frac(t * .7 + i * .25) * 110, 6, 6, 8), { wash: '#E8F3F8', washOp: 200, ink: null });
  }
  if (c > 0) {
    paint(rectPts(790, 1300, 400, 600), { wash: '#A3AC78', washOp: 255, ink: DH.ink, sw: 1.3 });
    for (let i = 0; i < 4; i++) vsSack(960 + (i % 2) * 70, 1330 - Math.floor(i / 2) * 60, 90, { key: `sl${i}`, col: DH.white });
    nguoi(900, 1440, 38, { who: 'hanOfficial', t, aR: 1.2 + .3 * Math.sin(t * 3), mouth: 'smile', boilKey: 'of' });
  }
  camEnd();
});

// ---------- 49: Lê Lợi refuses an official's hat and raises the red flag in the forest ----------
scene('49', (t, lt, dur, S) => {
  vsCam(lt, dur, { x0: 540, y0: 1130, z0: 1.0, x1: 540, y1: 1090, z1: 1.1 });
  vsBackdrop({ sky: 'dawn', sunX: 540, sunY: 480, sunR: 100, rh: 940, seed: 251, land: '#6F9A5A', land2: '#7CAE5F', fore: false });
  for (let i = 0; i < 5; i++) { vsTree(60 + i * 250, 1180 + (i % 2) * 20, 330, { key: `tr${i}` }); }
  const refuse = span(lt, cue(S, 'không', 0, 5.5), cue(S, 'nhận', 0, 5.7) + .8), flag = span(lt, cue(S, 'dựng', 0, 7.4), cue(S, 'cờ', 0, 7.7) + 1.2);
  const leave = span(lt, cue(S, 'nhận', 0, 5.7) + .4, cue(S, 'năm', 0, 7) + .2);
  nguoi(lerp(700, 1300, leave), 1400, 46, { who: 'hanOfficial', t, flip: true, walk: leave > 0 && leave < 1 ? t * 2 : null, aL: 1.4, boilKey: 'of' });
  if (leave < 1) paint([[lerp(630, 1230, leave), 1230], [lerp(660, 1260, leave), 1180], [lerp(700, 1300, leave), 1230]], { wash: DH.ink, washOp: 255, ink: null });
  nguoi(420, 1400, 48, { who: 'leLoi', t, lookX: refuse > 0 && refuse < 1 ? Math.sin(t * 8) * .6 : .5, aR: flag > 0 ? 3.14 : .3, holdR: flag > 0 ? 'flag' : undefined, mouth: flag > 0 ? 'shout' : 'flat', brow: refuse > 0 && flag === 0 ? 'angry' : undefined, boilKey: 'll' });
  camEnd();
});

// ---------- 50: the blade from the fisherman's net and the hilt from the banyan fit together ----------
scene('50', (t, lt, dur, S) => {
  vsCam(lt, dur, { x0: 540, y0: 1130, z0: 1.0, x1: 540, y1: 1090, z1: 1.08 });
  vsBackdrop({ sky: 'dusk', sunX: 540, sunY: 520, sunR: 100, rh: 960, seed: 261, land: '#6F9A5A', land2: '#7CAE5F', fore: false });
  const join = span(lt, cue(S, 'hai', 0, 6.3), cue(S, 'khít', 0, 7.8)), gl = span(lt, cue(S, 'hai', 0, 6.3), dur);
  // left: the fisherman and his net; right: Lê Lợi under the banyan
  vsWater(1330, 2400, { t, key: 'sea', speed: 24, col: DH.water });
  vsCanoe(210, 1370, 300, { t, key: 'cn' });
  nguoi(210, 1360, 34, { who: 'leThan', t, aR: 1.8 + .3 * Math.sin(t * 2), mouth: 'o', boilKey: 'lt' });
  vsBanyan(880, 1350, 320, { key: 'bn' });
  nguoi(720, 1420, 42, { who: 'leLoi', t, flip: true, aR: lt > cue(S, 'nhặt', 0, 4.3) ? 2.6 : .3, lookX: -.4, boilKey: 'll' });
  const bx = lerp(150, 540, ease(join)), by = lerp(1160, 880, ease(join)) ;
  const hx = lerp(860, 540, ease(join)), hy = lerp(950, 880 - 120, ease(join));
  const showBlade = lt > cue(S, 'lưỡi', 0, 3.3), showHilt = lt > cue(S, 'chuôi', 0, 5.0);
  if (gl > 0) glow(540, 880, 150 + 520 * gl, '#FFF1C2', .75 * gl);
  if (showBlade) vsBlade(bx, by, 260, { key: 'b' });
  if (showHilt) vsHilt(hx, join > .95 ? by - 120 : hy, 110, { key: 'h' });
  camEnd();
});

// ---------- 51: starving rebels, Lê Lai rides out in the king's yellow robe as bait ----------
scene('51', (t, lt, dur, S) => {
  vsCam(lt, dur, { x0: 540, y0: 1130, z0: 1.0, x1: 600, y1: 1110, z1: 1.08 });
  vsBackdrop({ sky: 'dusk', sunX: 220, sunY: 560, sunR: 100, rh: 960, seed: 271, land: '#5F8A50', land2: '#6F9A5A', fore: false });
  for (let i = 0; i < 4; i++) vsTree(40 + i * 330, 1170, 320, { key: `tr${i}` });
  vsFire(330, 1400, 40, t, { key: 'cf' });
  for (let i = 0; i < 5; i++) { const a = Math.PI * (.1 + .8 * i / 4); vsMini(330 - Math.cos(a) * 190, 1440 + Math.sin(a) * 40, 19, { key: `ea${i}`, t, col: [DH.brown, DH.green, DH.indigo][i % 3], hat: 'none', hold: 'none', dir: i < 2 ? 1 : -1, cheer: 0 }); }
  const ride = span(lt, cue(S, 'ra', 0, 8.6) - .2, cue(S, 'hy', 0, 9.9)), fall = span(lt, cue(S, 'hy', 0, 9.9), cue(S, 'hy', 0, 9.9) + .8), flee = span(lt, cue(S, 'thoát', 0, 11.1) - 1.2, dur);
  vsArmy(980, 1280, 1330, 2, 4, 18, t, { col: MING, trim: DH.gold, hat: 'helmet', hold: 'spear', plume: DH.red, dir: -1 });
  if (lt > cue(S, 'lai', 0, 6.7) - .5) {
    const x = lerp(560, 920, ease(ride));
    vsFall(x, 1500, fall, 1, () => { vsHorse(x, 1500, 160, { t, gallop: ride > 0 && fall < .1 ? t * 1.4 : null, key: 'h', dir: 1 }); nguoi(x - 8, 1500 - 218, 34, { who: 'leLai', t, noShadow: true, aR: 1.4, holdR: 'sword', mouth: 'shout', boilKey: 'lai' }); });
  }
  if (flee > 0) nguoi(lerp(560, -200, flee), 1420, 40, { who: 'leLoi', t, flip: true, walk: t * 2, boilKey: 'll' });
  camEnd();
});

// ---------- 52: Nguyễn Trãi by lamplight; Lam Sơn soldiers listen at the door ----------
scene('52', (t, lt, dur, S) => {
  vsCam(lt, dur, { x0: 540, y0: 1100, z0: 1.0, x1: 560, y1: 1070, z1: 1.1 });
  paint(rectPts(-200, -300, 1480, 2000), { wash: '#4A3326', washOp: 255, ink: null });
  paint(rectPts(-200, 1450, 1480, 1000), { wash: '#6A4A32', washOp: 255, ink: DH.ink, sw: 1.3 });
  glow(300, 900, 520, '#FFC766', .5 + .08 * Math.sin(t * 7));
  paint(rectPts(610, 700, 380, 760), { wash: '#2B3A5A', washOp: 255, ink: DH.ink, sw: 4 });
  for (let i = 0; i < 4; i++) vsMini(660 + i * 80, 1450, 20, { key: `dm${i}`, t, col: [DH.red, DH.indigo, DH.green][i % 3], hat: 'helmet', hold: 'spear' });
  paint(rectPts(80, 1290, 460, 220), { wash: DH.brownDk, washOp: 255, ink: DH.ink, sw: 1.5 });
  paint(rectPts(150, 1255, 300, 40), { wash: DH.white, washOp: 255, ink: DH.ink, sw: 1 });
  paint(rectPts(240, 920, 70, 30), { wash: DH.redDk, washOp: 255, ink: DH.ink, sw: 1 });
  vsFire(275, 920, 12, t, { key: 'lamp', glow: .9 });
  nguoi(300, 1390, 50, { who: 'nguyenTrai', t, talk: 1, mouth: 'talk', aR: 1.1 + .4 * Math.sin(t * 2), lookX: .5, boilKey: 'nt' });
  const say = span(lt, cue(S, 'khuyên', 0, 5.0), dur);
  if (say > 0) for (let i = 0; i < 3; i++) inkLine([[540 + i * 8, 1160 - i * 40], [600 + i * 10, 1150 - i * 40]], 2, DH.gold, 'ink', .2);
  camEnd();
});

// ---------- 53: ambush at Chi Lăng pass; General Liễu Thăng falls from his horse; the Ming army withdraws ----------
scene('53', (t, lt, dur, S) => {
  vsCam(lt, dur, { x0: 540, y0: 1130, z0: 1.0, x1: 540, y1: 1100, z1: 1.06 });
  vsSky('dawn', { key: 'sky' });
  vsRidge(960, 200, '#8CA58F', { kind: 'karst', seed: 281, key: 'r1' });
  const cliff = (side) => paint([[side < 0 ? -300 : W + 300, 2200], [side < 0 ? -300 : W + 300, 640], [side < 0 ? 190 : W - 190, 720], [side < 0 ? 300 : W - 300, 1100], [side < 0 ? 170 : W - 170, 1500], [side < 0 ? 330 : W - 330, 2200]], { wash: '#6B7F6C', washOp: 255, fill: DH.greyDk, fillOp: 70, bleed: .3, curv: .3, ink: DH.ink, sw: 1.8 });
  paint(rectPts(-300, 1180, 1680, 1200), { wash: '#B7A57C', washOp: 255, ink: DH.ink, sw: 1.4 });
  cliff(-1); cliff(1);
  const amb = span(lt, cue(S, 'phục', 0, 2.5), cue(S, 'phục', 0, 2.5) + .6);
  for (let i = 0; i < 4; i++) { vsMini(60 + i * 40, 780 + i * 110, 21, { key: `ls${i}`, t, col: DH.red, hat: 'helmet', hold: amb > 0 ? 'bow' : 'spear', cheer: amb > 0 ? 0 : amb }); vsMini(1020 - i * 40, 780 + i * 110, 21, { key: `rs${i}`, t, col: DH.red, hat: 'helmet', hold: 'spear', dir: -1, cheer: amb }); }
  const fall = span(lt, cue(S, 'giết', 0, 3.5), cue(S, 'giết', 0, 3.5) + .8), retreat = span(lt, cue(S, 'xin', 0, 6.2), dur);
  if (amb > 0 && fall < 1) vsArrows(t, 0, 0, 640, 1340, 0, { from: [0, 1, 2, 3].map(i => vsMiniBow(60 + i * 40, 780 + i * 110, 21, 1)), key: 'ar', h: 200, rate: .9, spread: 14 });
  vsArmy(lerp(720, 1500, retreat) , lerp(1020, 1800, retreat), 1330, 3, 4, 19, t, { col: MING, hat: 'helmet', hold: 'spear', dir: 1, moving: retreat > 0 });
  const hx = 420;
  vsFall(hx, 1440, fall, -1, () => { vsHorse(hx, 1440, 170, { t, dir: 1, key: 'lt' }); nguoi(hx - 8, 1440 - 231, 36, { who: 'hanGeneral', t, noShadow: true, mouth: fall > 0 ? 'o' : 'shout', aR: 1.0, holdR: 'sword', boilKey: 'ltg' }); });
  camEnd();
});

// ---------- 54: coronation, then Nguyễn Trãi reads the proclamation; a long scroll unrolls down the steps ----------
scene('54', (t, lt, dur, S) => {
  vsCam(lt, dur, { x0: 540, y0: 1130, z0: 1.0, x1: 540, y1: 1090, z1: 1.1 });
  vsBackdrop({ sky: 'dawn', sunX: 540, sunY: 430, sunR: 110, rh: 960, seed: 291, land: '#86B565', land2: '#B7C77C', fore: false });
  vsHall(540, 1150, 620, { key: 'dien', tiers: 2, gold: true });
  const king = span(lt, cue(S, 'lên', 0, 1.6), cue(S, 'ngôi', 0, 2.0) + .4);
  vsThrone(540, 1270, 190, { key: 'th' });
  nguoi(540, 1270 - 19, 32, king > .5 ? { who: 'leLoi', t, hat: 'crown', outfit: { kind: 'robe', col: DH.yellow, col2: DH.red }, noShadow: true, aR: 1.4, boilKey: 'll' } : { who: 'leLoi', t, noShadow: true, boilKey: 'll' });
  const read = span(lt, cue(S, 'viết', 0, 3.4), cue(S, 'cáo', 0, 4.7) + .8), unroll = span(lt, cue(S, 'bài', 0, 5.2), dur);
  paint(rectPts(110, 1350, 360 * ease(read), 36), { wash: DH.red, washOp: 255, ink: DH.ink, sw: 1.2 });
  nguoi(230, 1420, 44, { who: 'nguyenTrai', t, talk: unroll > 0 ? 1 : 0, mouth: unroll > 0 ? 'talk' : 'smile', aL: 1.0, aR: 1.2, holdR: 'scroll', boilKey: 'nt' });
  if (unroll > 0) paint([[180, 1420], [320, 1420], [320 + Math.sin(t * 2) * 6, 1420 + 200 * unroll], [180, 1420 + 210 * unroll]], { wash: DH.white, washOp: 255, fill: DH.tan, fillOp: 50, ink: DH.ink, sw: 1.3, curv: .1 });
  vsCrowd(560, 1060, 1420, 1480, 12, 18, t, { cheer: true, seed: 11 });
  camEnd();
});

// ---------- 55: the golden turtle takes the sword back on the Hồ Gươm lake ----------
scene('55', (t, lt, dur, S) => {
  vsCam(lt, dur, { x0: 540, y0: 1130, z0: 1.0, x1: 540, y1: 1100, z1: 1.1 });
  vsSky('dawn', { key: 'sky' }); vsSun(540, 480, 100, { t, key: 'sun' }); vsCloud(230, 330, 110, { key: 'c1' });
  vsRidge(1000, 150, '#8CA58F', { kind: 'hill', seed: 301, key: 'r1' });
  vsLand(1060, '#7CAE5F', { key: 'g1' });
  vsTowerTurtle(900, 1180, 250, { key: 'tt' });
  vsWater(1180, 2400, { t, key: 'lake', speed: 14, col: '#7FB0C8' });
  const up = span(lt, cue(S, 'nổi', 0, 4.0) - .2, cue(S, 'lên', 0, 4.2) + .8), give = span(lt, cue(S, 'trả', 0, 5.5), cue(S, 'thần', 0, 6.0) + .5);
  if (up > 0) { vsRipples(740, 1400, 360, frac(t * .5), { key: 'rp', n: 3, col: '#F4E9C0' }); vsTurtle(740, lerp(1500, 1400, up), 300, { t, key: 'tu' }); glow(740, 1330, 300 * up, '#FFE7A0', .5 * up); }
  vsDragonBoat(260, 1440, 420, { t, key: 'bo' });
  nguoi(240, 1330, 28, { who: 'leLoi', t, hat: 'crown', outfit: { kind: 'robe', col: DH.yellow, col2: DH.red }, noShadow: true, aR: lerp(.3, 1.57, give), holdR: 'sword', boilKey: 'll' });
  camEnd();
});
