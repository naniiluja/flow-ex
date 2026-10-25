// vs_c06.js: chương 6, Nhà Trần (scenes 39-46).

const MONGOL_BROWN = '#7A4E2A';

// The Diên Hồng hall: the king stands before elders in a half ring. up 0..1 raises their staffs; shout opens their mouths.
function vsDienHong(t, up, shout, S, lt) {
  vsBackdrop({ sky: 'dawn', sunX: 540, sunY: 420, sunR: 110, rh: 960, seed: 181, land: '#9C8A66', land2: '#B7A57C', fore: false });
  vsHall(540, 1130, 660, { key: 'dh', tiers: 2, gold: true });
  const n = 7;
  for (let i = 0; i < n; i++) {
    const a = Math.PI * (.08 + .84 * i / (n - 1)), x = 540 - Math.cos(a) * 480, y = 1400 + Math.sin(a) * 70 - 40;
    nguoi(x, y, 30, { who: 'elder', t, flip: x > 540, aR: lerp(.4, 3.14, up), holdR: 'staff', mouth: shout ? 'shout' : 'flat', hair: i % 2 ? 'white' : 'none', boilKey: `el${i}` });
  }
  nguoi(540, 1250, 40, { who: 'tranNhanTong', t, aR: shout ? 1.2 : .4 + .3 * Math.sin(t * 2), mouth: shout ? 'smile' : 'talk', talk: shout ? 0 : 1, boilKey: 'tnt' });
}

// ---------- 39: the Trần take over; Mongol horsemen sweep down like a brown wave over red earth ----------
scene('39', (t, lt, dur, S) => {
  vsCam(lt, dur, { x0: 540, y0: 1130, z0: 1.0, x1: 500, y1: 1110, z1: 1.1 });
  vsBackdrop({ sky: 'dusk', sunX: 840, sunY: 420, sunR: 100, rh: 960, seed: 191, land: '#B5714F', land2: '#C4825A', fore: false });
  const flag = span(lt, cue(S, 'lên', 0, 1.2), cue(S, 'lý', 0, 1.9));
  if (flag > 0) vsBanner(180, 1260, 460 * flag, { w: 260, fh: 160, kind: 'pennant', col: lt > cue(S, 'lý', 0, 1.9) ? DH.red : DH.yellow, key: 'fl', t });
  const come = span(lt, cue(S, 'quân', 0, 3.9), dur);
  vsDust(1100 - come * 1200, 1450, 160, t, { key: 'dst' });
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
    const x = lerp(1500 + c * 190 + r * 60, 280 + c * 190 + r * 60 - 120, come), y = 1330 + r * 55;
    vsHorse(x, y, 130, { t, gallop: t * 1.3 + c * .2, key: `mh${r}${c}`, dir: -1, col: ['#6A4A2A', '#3C2A1A', '#9A7A5A'][(r + c) % 3] });
    vsMini(x + 6, y - 1.36 * 130, 15, { key: `mr${r}${c}`, t, col: MONGOL_BROWN, hat: 'helmet', hold: 'spear', dir: -1, skin: SKIN.tan });
  }
  camEnd();
});

// ---------- 40: King Trần Nhân Tông asks the elders at Diên Hồng: make peace or fight? ----------
scene('40', (t, lt, dur, S) => {
  vsCam(lt, dur, { x0: 540, y0: 1130, z0: 1.0, x1: 540, y1: 1100, z1: 1.1 });
  vsDienHong(t, 0, false, S, lt);
  camEnd();
});

// ---------- 41: the whole hall shouts "Đánh" with raised staffs ----------
scene('41', (t, lt, dur, S) => {
  vsCam(lt, dur, { x0: 540, y0: 1130, z0: 1.0, x1: 540, y1: 1100, z1: 1.12 });
  vsDienHong(t, span(lt, 0, .5), true, S, lt);
  camEnd();
});

// ---------- 42: Trần Hưng Đạo writes the Hịch by lamplight, a tear falls on the desk ----------
scene('42', (t, lt, dur, S) => {
  vsCam(lt, dur, { x0: 540, y0: 1100, z0: 1.0, x1: 540, y1: 1070, z1: 1.12 });
  vsSky('cave', { key: 'sky' });
  paint(rectPts(-200, 700, 1480, 1700), { wash: '#4A3326', washOp: 255, ink: null });
  paint(rectPts(-200, 1450, 1480, 1000), { wash: '#6A4A32', washOp: 255, ink: DH.ink, sw: 1.3 });
  glow(780, 900, 520, '#FFC766', .55 + .08 * Math.sin(t * 7));
  // lamp, desk, scroll
  paint(rectPts(740, 1180, 80, 60), { wash: DH.redDk, washOp: 255, ink: DH.ink, sw: 1 });
  vsFire(780, 1180, 14, t, { key: 'lamp', glow: .9 });
  nguoi(480, 1390, 52, { who: 'hungDao', t, aR: 1.0 + .25 * Math.sin(t * 6), holdR: 'brush', mouth: 'sad', brow: 'sad', lookX: .2, boilKey: 'hd' });
  paint(rectPts(150, 1290, 760, 260), { wash: DH.brownDk, washOp: 255, ink: DH.ink, sw: 1.5 });
  paint(rectPts(330, 1262, 360, 36), { wash: DH.white, washOp: 255, ink: DH.ink, sw: 1 });
  for (let i = 0; i < 3; i++) inkLine([[350, 1272 + i * 9], [350 + 300 * clamp(lt / 4 - i * .15), 1272 + i * 9]], 2, DH.ink, 'inkfine', 0);
  const tear = frac((lt - cue(S, 'giận', 0, 5.6)) * .9);
  if (lt > cue(S, 'căm', 0, 5.5)) paint(ellPts(430, 1000 + tear * 260, 7, 11, 8), { wash: '#BFE3F5', washOp: 255, ink: null });
  camEnd();
});

// ---------- 43: Quốc Toản crushes the orange, raises his own embroidered banner and gathers troops ----------
scene('43', (t, lt, dur, S) => {
  vsCam(lt, dur, { x0: 540, y0: 1130, z0: 1.0, x1: 540, y1: 1100, z1: 1.1 });
  vsBackdrop({ sky: 'day', sunX: 880, sunY: 330, rh: 960, seed: 201, land: '#86B565', land2: '#B7C77C', fore: false });
  vsWall(-40, 1120, 1170, 150, { key: 'cung' });
  const squeeze = span(lt, cue(S, 'bóp', 0, 6.3), cue(S, 'nát', 0, 6.5) + .4);
  const flag = span(lt, cue(S, 'thêu', 0, 9.3), cue(S, 'chữ', 0, 9.8) + .6), join = span(lt, cue(S, 'chiêu', 0, 8.1), cue(S, 'riêng', 0, 8.8) + 1.2);
  for (let i = 0; i < 8; i++) {
    const k = clamp(join * 1.4 - i * .09);
    vsMini(lerp(i % 2 ? 1250 : -100, 120 + (i >> 1) * 110 + (i % 2) * 540, k), 1470 + (i % 3) * 18, 19, { key: `qm${i}`, t, ph: i, moving: k > 0 && k < 1, col: [DH.red, DH.indigo, DH.green][i % 3], hat: 'helmet', hold: 'spear', cheer: flag > .5 ? .8 : 0, dir: i % 2 ? -1 : 1 });
  }
  nguoi(540, 1400, 48, { who: 'quocToan', t, aR: flag > 0 ? 3.14 : 1.2, holdR: flag > 0 ? 'flag' : 'orange', sq: .06 * squeeze, mouth: squeeze > 0 && flag === 0 ? 'shout' : 'grin', brow: 'angry', boilKey: 'qt' });
  if (squeeze > 0 && flag === 0) for (let i = 0; i < 5; i++) paint(ellPts(610 + i * 6 - 12, 1160 + frac(t * 1.2 + i * .2) * 190, 5, 9, 8), { wash: DH.orange, washOp: 255, ink: null });
  camEnd();
});

// ---------- 44: Trần Bình Trọng, bound, refuses the crown of a northern king ----------
scene('44', (t, lt, dur, S) => {
  vsCam(lt, dur, { x0: 540, y0: 1130, z0: 1.0, x1: 540, y1: 1100, z1: 1.1 });
  vsBackdrop({ sky: 'grey', sunX: 840, sunY: 380, sunR: 80, sunCol: '#E8E0D0', rh: 960, seed: 211, land: '#B5714F', land2: '#C4825A', fore: false });
  vsArmy(660, 1060, 1180, 2, 4, 20, t, { col: MONGOL_BROWN, hat: 'helmet', hold: 'spear', skin: SKIN.tan });
  const offer = span(lt, cue(S, 'dụ', 0, 5.2), cue(S, 'vương', 0, 5.5) + .4), no = span(lt, cue(S, 'ta', 0, 7.0), cue(S, 'nam', 0, 8.0));
  paint(rectPts(720, 1320, 150, 120), { wash: DH.redDk, washOp: 255, ink: DH.ink, sw: 1.2 });
  if (offer > 0) vsCrownIcon(795, 1290 - 20 * offer, 90 * offer);
  nguoi(300, 1420, 50, { who: 'binhTrong', t, aL: .1, aR: .1, mouth: no > 0 ? 'shout' : 'flat', brow: 'angry', lookX: no > 0 && no < 1 ? Math.sin(t * 9) * .6 : .6, boilKey: 'bt' });
  inkLine([[250, 1230], [350, 1250]], 4, DH.brown, 'ink', .2); inkLine([[250, 1260], [350, 1275]], 4, DH.brown, 'ink', .2);
  nguoi(520, 1420, 50, { who: 'mongol', t, flip: true, aR: offer > 0 ? 1.4 : .3, mouth: 'smile', boilKey: 'mg' });
  camEnd();
});

// ---------- 45: the stakes rise again in the Bạch Đằng; Mongol ships jam and burn ----------
scene('45', (t, lt, dur, S) => {
  vsCam(lt, dur, { x0: 540, y0: 1110, z0: 1.0, x1: 540, y1: 1090, z1: 1.1 });
  const plant = span(lt, cue(S, 'cắm', 0, 5.0), cue(S, 'sông', 0, 5.8) + .6), rise = cue(S, 'lên', 0, 8.1), fall = cue(S, 'rút', 0, 9.4);
  const lv = vsKf(lt, [[0, .2], [plant ? cue(S, 'cắm', 0, 5.0) : 5, .2], [rise - .6, 1], [fall - .3, 1], [fall + .5, 0]]);
  vsRiverSet(t, 0, { seed: 221 });
  vsStakes(180, 920, 1430, 14, { key: 'st', show: plant, h: 240 });
  vsWater(lerp(1330, 1170, lv), 2400, { t, key: 'river2', speed: 24, col: DH.water });
  const in_ = span(lt, cue(S, 'thuyền', 0, 6.8), cue(S, 'vào', 0, 7.3) + 1.2), stuck = span(lt, fall, dur), burn = span(lt, cue(S, 'mắc', 0, 8.4), dur);
  [[0, 1180, 1340], [1, 1560, 1400]].forEach(([i, x0, y]) => {
    const x = lerp(x0 + 400, x0 - 560, in_);
    vsWarship(x, y, 470, { t, dir: -1, col: '#4A3220', sail: '#B89A6A', shield: DH.brown, flag: DH.redDk, key: `mw${i}`, ph: i * 2, tilt: .16 * stuck });
    if (burn > 0) { vsFire(x - 40, y - 100, 46 * burn, t, { key: `f${i}`, glow: .5 }); vsSmoke(x - 40, y - 160, 70, t, { key: `sm${i}` }); }
  });
  camEnd();
});

// ---------- 46: the old Hưng Đạo on his bed, the king beside him, an old banyan outside the window ----------
scene('46', (t, lt, dur, S) => {
  vsCam(lt, dur, { x0: 540, y0: 1100, z0: 1.0, x1: 540, y1: 1070, z1: 1.1 });
  vsSky('dawn', { key: 'sky' });
  paint(rectPts(-200, -300, 1480, 2000), { wash: '#D9C49A', washOp: 255, ink: null });
  paint(rectPts(-200, 1450, 1480, 1000), { wash: '#8A5A3A', washOp: 255, ink: DH.ink, sw: 1.3 });
  // window with a banyan and its roots gripping the soil
  paint(rectPts(760, 760, 290, 380), { wash: DH.sky, washOp: 255, ink: DH.ink, sw: 3 });
  paint(rectPts(760, 1050, 290, 90), { wash: '#8FBB68', washOp: 255, ink: null });
  vsBanyan(905, 1140, 190, { key: 'bn' });
  inkLine([[760, 950], [1050, 950]], 3, DH.brownDk, 'ink', 0); inkLine([[905, 760], [905, 1140]], 3, DH.brownDk, 'ink', 0);
  // bed: frame, pillow, the old man's head with white hair and beard, red blanket
  paint(rectPts(60, 1330, 560, 130), { wash: DH.brownDk, washOp: 255, ink: DH.ink, sw: 1.4 });
  paint(rectPts(90, 1260, 130, 70), { wash: DH.white, washOp: 255, ink: DH.ink, sw: 1.1 });
  vsDollHeadAt(190, 1250, 60, { hair: 'white', beard: 'long', talk: lt > cue(S, 'dặn', 0, 4.8) ? t : 0 });
  paint([[250, 1290], [610, 1300], [620, 1400], [250, 1400]], { wash: DH.red, washOp: 255, fill: DH.redDk, fillOp: 60, ink: DH.ink, sw: 1.4, curv: .2 });
  nguoi(720, 1480, 46, { who: 'tranNhanTong', t, flip: true, mouth: 'flat', lookX: -.5, boilKey: 'tnt' });
  camEnd();
});
