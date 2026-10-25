// vs_c11.js: chương 11, Điện Biên Phủ và Thống nhất (scenes 76-84).

// The Liberation flag: red over blue with a yellow star. (x, y) = pole foot.
function vsLiberationFlag(x, y, h, o = {}) {
  boilSeed(`lib ${o.key ?? 0}`);
  const t = o.t ?? T, w = o.w ?? h * .6, fh = o.fh ?? h * .4;
  inkLine([[x, y], [x, y - h]], 3.4, DH.brownDk, 'ink', 0);
  const wav = i => Math.sin(t * 5 + i * .7) * 5 * (i / 8);
  const top = [], mid = [], bot = [];
  for (let i = 0; i <= 8; i++) { top.push([x + 2 + i / 8 * w, y - h + wav(i)]); mid.push([x + 2 + i / 8 * w, y - h + fh / 2 + wav(i)]); bot.push([x + 2 + i / 8 * w, y - h + fh + wav(i)]); }
  paint([...top, ...mid.slice().reverse()], { wash: DH.red, washOp: 255, ink: DH.ink, sw: 1 });
  paint([...mid, ...bot.slice().reverse()], { wash: '#2F6FB0', washOp: 255, ink: DH.ink, sw: 1 });
  paint(starPts(x + 2 + w / 2, y - h + fh / 2 + wav(4), fh * .2, .4, 5), { wash: DH.yellow, washOp: 255, ink: DH.ink, sw: .6 });
}
// A French base: bunkers with sandbags, barbed wire, a tricolour. (x, y) = middle of the front line.
function vsFrenchBase(x, y, s, t, o = {}) {
  boilSeed(`base ${o.key ?? 0}`);
  for (let i = 0; i < 6; i++) {
    const bx = x + (i - 2.5) * s * .34, by = y - (i % 2) * s * .1, w = s * .26;
    paint([[bx - w / 2, by], [bx - w * .4, by - s * .14], [bx + w * .4, by - s * .14], [bx + w / 2, by]], { wash: i % 2 ? '#8A8A7A' : '#9A9A8A', washOp: 255, ink: DH.ink, sw: 1.3 });
    paint(rectPts(bx - w * .3, by - s * .08, w * .6, s * .03), { wash: DH.ink, washOp: 255, ink: null });
    for (let k = 0; k < 4; k++) paint(ellPts(bx - w * .45 + k * w * .3, by + s * .015, w * .16, s * .02, 8), { wash: '#CDB98A', washOp: 255, ink: DH.ink, sw: .6 });
  }
  const pts = []; for (let i = 0; i <= 28; i++) pts.push([x - s * .9 + i * s * 1.8 / 28, y + s * .08 + (i % 2) * s * .04]);
  inkLine(pts, 1.8, DH.greyDk, 'inkfine', 0);
  if (o.flag !== false) {
    inkLine([[x, y - s * .14], [x, y - s * .6]], 3, DH.brownDk, 'ink', 0);
    [[DH.indigo, 0], [DH.white, 1], [DH.red, 2]].forEach(([c, i]) => paint(rectPts(x + 2 + i * s * .06, y - s * .6, s * .06, s * .1), { wash: c, washOp: 255, ink: DH.ink, sw: .5 }));
  }
}

// ---------- 76: Điện Biên Phủ valley seen from the hill; the French base is an iron ant-nest ----------
scene('76', (t, lt, dur, S) => {
  vsCam(lt, dur, { x0: 540, y0: 1090, z0: 1.0, x1: 540, y1: 1130, z1: 1.14 });
  vsSky('day', { key: 'sky' }); vsSun(880, 340, 90, { t, key: 'sun' }); vsCloud(250, 380, 120, { key: 'c1' });
  vsRidge(900, 380, '#5E7A6A', { kind: 'range', seed: 481, key: 'r1' });
  vsRidge(980, 260, '#4F6A58', { kind: 'range', seed: 485, key: 'r2' });
  vsLand(1060, '#8FA070', { key: 'g1' });
  paint([[-300, 1130], [200, 1100], [900, 1100], [1400, 1130], [1400, 2300], [-300, 2300]], { wash: '#B9B07A', washOp: 255, fill: DH.brownDk, fillOp: 30, curv: .2, ink: DH.ink, sw: 1.3 });
  const base = span(lt, cue(S, 'xây', 0, 6.7), cue(S, 'lớn', 0, 8.1));
  if (base > 0) vsFrenchBase(540, 1220, 760 * base, t, { key: 'dbp' });
  for (let i = 0; i < 4; i++) vsPalm(60 + i * 330, 1110 + (i % 2) * 20, 240, { key: `pm${i}` });
  camEnd();
});

// ---------- 77: General Giáp studies the map, decides to pull the guns back and fight the sure way ----------
scene('77', (t, lt, dur, S) => {
  vsCam(lt, dur, { x0: 540, y0: 1110, z0: 1.0, x1: 540, y1: 1090, z1: 1.1 });
  vsBackdrop({ sky: 'dawn', sunX: 880, sunY: 380, rh: 960, seed: 491, land: '#6F8A5A', land2: '#7F9A60', fore: false });
  paint([[40, 1480], [160, 880], [540, 780], [920, 880], [1040, 1480]], { wash: '#C9B58A', washOp: 255, fill: DH.brownDk, fillOp: 40, ink: DH.ink, sw: 1.8, curv: .08 });
  paint(rectPts(220, 1260, 640, 200), { wash: DH.brownDk, washOp: 255, ink: DH.ink, sw: 1.5 });
  paint(rectPts(300, 1220, 480, 46), { wash: '#F0E4C6', washOp: 255, ink: DH.ink, sw: 1.2 });
  for (let i = 0; i < 3; i++) inkLine([[340 + i * 80, 1240], [420 + i * 80 + Math.sin(t + i) * 4, 1228]], 3, DH.red, 'ink', 0);
  const order = span(lt, cue(S, 'dừng', 0, 6.0) - .3, cue(S, 'kéo', 0, 6.6));
  nguoi(540, 1390, 46, { who: 'giap', t, aR: lerp(.3, 1.57, order), mouth: order > 0 ? 'shout' : 'flat', brow: 'sad', lookX: order > 0 ? .6 : 0, boilKey: 'giap' });
  const pull = span(lt, cue(S, 'kéo', 0, 6.6), cue(S, 'chắc', 1, 8.3));
  vsCannon(lerp(780, 1160, pull), 1470, 210, { key: 'cn', dir: 1 });
  for (let i = 0; i < 3; i++) vsMini(lerp(900, 1280, pull) + i * 40, 1480, 18, { key: `pl${i}`, t, ph: i, moving: pull > 0 && pull < 1, col: '#6A8A4A', hat: 'mucoi', dir: 1 });
  camEnd();
});

// ---------- 78: bicycle porters carry rice through the forest; soldiers dig trenches toward the French strongpoints under the moon ----------
scene('78', (t, lt, dur, S) => {
  vsCam(lt, dur, { x0: 540, y0: 1110, z0: 1.0, x1: 620, y1: 1090, z1: 1.08 });
  vsSky('night', { key: 'sky', t }); vsMoon(780, 400, 100, { t, key: 'mn' });
  vsRidge(990, 220, '#25304A', { kind: 'range', seed: 501, key: 'r1' });
  vsLand(1080, '#2D4A3A', { key: 'g1' });
  for (let i = 0; i < 5; i++) vsTree(30 + i * 270, 1160, 360, { key: `tr${i}`, col: '#20402C' });
  const trench = span(lt, cue(S, 'đào', 0, 4.5), cue(S, 'điểm', 0, 6.8));
  paint([[-100, 1320], [200, 1320], [260, 1380], [420, 1380], [480, 1440], [700, 1440], [760, 1490], [1200, 1490], [1200, 1620], [-100, 1620]], { wash: '#1D1A18', washOp: 255 * trench, ink: DH.ink, sw: 1.5 * trench });
  vsFrenchBase(940, 1260, 520, t, { key: 'bs', flag: false });
  const porters = 1 - span(lt, cue(S, 'bộ', 0, 4.0) - .5, cue(S, 'bộ', 0, 4.0) + .5);
  if (porters > 0) for (let i = 0; i < 3; i++) {
    const x = ((t * 130 + i * 420) % 1700) - 300, y = 1390 + (i % 2) * 40;
    vsBike(x, y, 250, { key: `bk${i}`, rot: t * 6 });
    nguoi(x - 190, y, 32, { who: 'farmer', t, walk: t * 1.5, dir: 1, boilKey: `pt${i}` });
  }
  if (trench > 0) for (let i = 0; i < 4; i++) vsMini(220 + i * 220, 1460 + (i % 2) * 70 - 20, 18, { key: `dg${i}`, t, ph: i, moving: true, col: '#6A8A4A', hat: 'mucoi' });
  camEnd();
});

// ---------- 79: the guns open up; after 56 days the French command surrenders and the red flag rises ----------
scene('79', (t, lt, dur, S) => {
  const cut = cue(S, 'ngày', 1, 3.5) - .1;
  if (lt < cut + .3) {
    vsCam(lt, dur, { x0: 540, y0: 1110, z0: 1.0, x1: 600, y1: 1090, z1: 1.08 });
    vsSky('fire', { key: 'sky' });
    vsRidge(990, 200, '#4A3A3A', { kind: 'range', seed: 511, key: 'r1' });
    vsLand(1080, '#4A5A3A', { key: 'g1' });
    vsFrenchBase(800, 1230, 640, t, { key: 'bs', flag: false });
    const fire = lt > cue(S, 'pháo', 0, 2.4);
    for (let i = 0; i < 3; i++) vsCannon(120 + i * 180, 1420 + i * 30, 220, { key: `cn${i}`, fire: fire ? Math.max(0, Math.sin(t * 5 + i * 2)) : 0, recoil: fire ? Math.max(0, Math.sin(t * 5 + i * 2)) : 0 });
    if (fire) for (let i = 0; i < 5; i++) { const k = frac(t * 1.4 + i * .21); glow(560 + i * 120, 1180 - k * 40, 150 * (1 - k * .5), '#FFC766', .9 * (1 - k)); vsSmoke(560 + i * 120, 1150, 70 + 40 * k, t, { key: `bx${i}` }); }
    camEnd();
  } else {
    vsCam(lt, dur, { x0: 540, y0: 1110, z0: 1.0, x1: 540, y1: 1090, z1: 1.1 });
    vsBackdrop({ sky: 'dawn', sunX: 540, sunY: 460, sunR: 100, rh: 960, seed: 513, land: '#8FA070', land2: '#A3AC78', fore: false });
    paint([[200, 1500], [300, 1260], [780, 1260], [880, 1500]], { wash: '#8A8A7A', washOp: 255, ink: DH.ink, sw: 1.6 });
    const surr = span(lt, cue(S, 'bắt', 0, 6) - .5, cue(S, 'sống', 0, 6.4) + .3), red = span(lt, cue(S, 'bộ', 1, 7.1), cue(S, 'huy', 0, 7.7) + 1.0);
    nguoi(420, 1340, 44, { who: 'deCastries', t, aL: lerp(.3, 3.14, surr), aR: lerp(.3, 3.14, surr), mouth: 'o', boilKey: 'dc' });
    if (surr > 0) vsBanner(700, 1260, 340 * surr, { w: 200, fh: 130, col: DH.white, key: 'wf', t });
    vsBanner(540, 1260, 500 * red, { w: 280, fh: 190, kind: 'vn', key: 'lf', t });
    vsArmy(120, 960, 1470, 1, 6, 18, t, { col: '#6A8A4A', hat: 'mucoi', hold: 'rifle' });
    camEnd();
  }
  if (lt > cut - .35 && lt < cut + .35) brushWipe((lt - (cut - .35)) / .7, ['#356536', '#4F8A4B']);
});

// ---------- 80: the Geneva table; a line cuts the map at the Bến Hải river ----------
scene('80', (t, lt, dur, S) => {
  vsCam(lt, dur, { x0: 540, y0: 1100, z0: 1.0, x1: 540, y1: 1070, z1: 1.1 });
  paint(rectPts(-200, -300, 1480, 2000), { wash: '#D9C49A', washOp: 255, ink: null });
  paint(rectPts(-200, 1450, 1480, 1000), { wash: '#8A5A3A', washOp: 255, ink: DH.ink, sw: 1.3 });
  paint(rectPts(170, 560, 740, 800), { wash: '#F0E4C6', washOp: 255, ink: DH.ink, sw: 2 });
  vsMapVN(215, 600, 720, { key: 'map' });
  const line = span(lt, cue(S, 'sông', 0, 6.9) - .3, cue(S, 'bảy', 1, 8.5));
  const [lx0, ly] = vsMapPt(215, 600, 720, 105.2, 17.0), [lx1] = vsMapPt(215, 600, 720, 108.0, 17.0);
  if (line > 0) inkLine([[lx0, ly], [lerp(lx0, lx1, line), ly + Math.sin(line * 8) * 3]], 7, DH.red, 'ink', 0);
  paint(rectPts(60, 1320, 960, 170), { wash: DH.brownDk, washOp: 255, ink: DH.ink, sw: 1.5 });
  nguoi(240, 1380, 40, { who: 'french', t, mouth: 'flat', boilKey: 'fr', aR: .8 });
  nguoi(840, 1380, 40, { who: 'cadre', t, flip: true, mouth: 'flat', boilKey: 'cd', aR: .8 });
  camEnd();
});

// ---------- 81: the Trường Sơn trail: rain, camouflaged trucks, carriers ----------
scene('81', (t, lt, dur, S) => {
  vsCam(lt, dur, { x0: 540 - 60 * clamp(lt / dur), y0: 1110, z0: 1.0, x1: 540 - 60 * clamp(lt / dur), y1: 1090, z1: 1.1 });
  vsSky('grey', { key: 'sky' });
  vsRidge(900, 380, '#4F6A58', { kind: 'range', seed: 521, key: 'r1' });
  vsRidge(1010, 240, '#3F5A48', { kind: 'range', seed: 525, key: 'r2' });
  vsLand(1100, '#355A44', { key: 'g1' });
  paint([[-300, 1380], [300, 1330], [900, 1360], [1400, 1330], [1400, 2300], [-300, 2300]], { wash: '#6A4A32', washOp: 255, curv: .2, ink: DH.ink, sw: 1.4 });
  for (let i = 0; i < 7; i++) vsBamboo(40 + i * 170, 1230 + (i % 2) * 20, 420, { key: `bb${i}`, t });
  const x = ((t * 120) % 1800) - 400;
  vsTruck(x, 1470, 420, { key: 'tk' });
  for (let k = 0; k < 6; k++) paint(ellPts(x - 60 + k * 36, 1330 - (k % 2) * 30, 30, 18, 8), { wash: DH.greenDk, washOp: 255, ink: DH.ink, sw: .8 });
  for (let i = 0; i < 4; i++) { const px = ((t * 80 + i * 360) % 1700) - 300; vsMini(px, 1560 + (i % 2) * 20, 20, { key: `cr${i}`, t, ph: i, moving: true, col: '#6A8A4A', hat: 'mucoi', hold: 'bundle' }); }
  vsRain(t, { key: 'rn', n: 90 });
  camEnd();
});

// ---------- 82: Uncle Hồ's altar; then tanks roll down a Sài Gòn boulevard ----------
scene('82', (t, lt, dur, S) => {
  const cut = cue(S, 'sáng', 0, 6.9) - .1;
  if (lt < cut + .3) {
    vsCam(lt, dur, { x0: 540, y0: 1100, z0: 1.0, x1: 540, y1: 1070, z1: 1.1 });
    paint(rectPts(-200, -300, 1480, 2000), { wash: '#4A3326', washOp: 255, ink: null });
    paint(rectPts(-200, 1450, 1480, 1000), { wash: '#3A281C', washOp: 255, ink: DH.ink, sw: 1.3 });
    glow(540, 900, 560, '#FFC766', .45 + .06 * Math.sin(t * 5));
    paint(rectPts(240, 800, 600, 640), { wash: DH.redDk, washOp: 255, ink: DH.ink, sw: 2 });
    paint(rectPts(300, 860, 480, 500), { wash: '#F0E4C6', washOp: 255, ink: DH.ink, sw: 1.5 });
    nguoi(540, 1330, 40, { who: 'hoChiMinh', t, mouth: 'smile', boilKey: 'hcm', noShadow: true });
    paint(rectPts(240, 1380, 600, 80), { wash: DH.brownDk, washOp: 255, ink: DH.ink, sw: 1.4 });
    vsFire(300, 1380, 14, t, { key: 'c1', glow: .6 }); vsFire(780, 1380, 14, t, { key: 'c2', glow: .6 });
    camEnd();
  } else {
    vsCam(lt, dur, { x0: 540, y0: 1110, z0: 1.0, x1: 600, y1: 1090, z1: 1.08 });
    vsSky('dawn', { key: 'sky' }); vsSun(300, 480, 100, { t, key: 'sun' });
    vsShopRow(-40, 1140, 1330, { key: 'sg' });
    paint(rectPts(-100, 1330, 1300, 1300), { wash: '#A8A090', washOp: 255, ink: DH.ink, sw: 1.3 });
    for (let i = 0; i < 2; i++) vsTank(lerp(-300 - i * 420, 900 - i * 420, clamp((lt - cut) / (dur - cut))), 1480 + i * 20, 420, { key: `tk${i}`, rock: true, t });
    camEnd();
  }
  if (lt > cut - .35 && lt < cut + .35) brushWipe((lt - (cut - .35)) / .7, ['#2B2233', '#8A8A7A']);
});

// ---------- 83: tank 390 smashes the Independence Palace gate; the Liberation flag goes up ----------
scene('83', (t, lt, dur, S) => {
  vsCam(lt, dur, { x0: 540, y0: 1110, z0: 1.0, x1: 540, y1: 1080, z1: 1.1 });
  vsBackdrop({ sky: 'day', sunX: 880, sunY: 320, rh: 980, seed: 531, land: '#86B565', land2: '#B7C77C', fore: false });
  vsPalace(540, 1250, 800, { key: 'ddl' });
  const hit = span(lt, cue(S, 'húc', 0, 1.2), cue(S, 'đổ', 0, 1.5) + .6);
  vsFall(540, 1420, hit, 1, () => { for (let i = 0; i < 9; i++) inkLine([[300 + i * 60, 1220], [300 + i * 60, 1420]], 5, DH.greyDk, 'ink', 0); inkLine([[300, 1260], [780, 1260]], 6, DH.greyDk, 'ink', 0); });
  vsTank(lerp(-200, 760, ease(clamp(lt / 2.2))), 1520, 440, { key: 'tk', rock: lt < 2.3, t });
  const up = span(lt, cue(S, 'cờ', 0, 5.8), cue(S, 'tung', 0, 6.6) + 1.2);
  vsLiberationFlag(540, 850, 220 * up, { w: 160, key: 'lf', t });
  for (let i = 0; i < 4; i++) { const k = clamp((lt - cue(S, 'mười', 0, 3.9)) / 1.6 - i * .1); if (k > 0) vsMini(lerp(100 + i * 60, 520 + i * 18, k), 1550, 20, { key: `bd${i}`, t, ph: i, moving: k < 1, col: '#6A8A4A', hat: 'mucoi', cheer: k >= 1 ? 1 : 0 }); }
  camEnd();
});

// ---------- 84: people of both halves embrace; the map is whole again ----------
scene('84', (t, lt, dur, S) => {
  vsCam(lt, dur, { x0: 540, y0: 1110, z0: 1.0, x1: 540, y1: 1090, z1: 1.08 });
  vsBackdrop({ sky: 'dawn', sunX: 540, sunY: 460, sunR: 110, rh: 960, seed: 541, land: '#86B565', land2: '#B7C77C', fore: false });
  const meet = span(lt, cue(S, 'người', 0, 1.8), cue(S, 'yên', 0, 3.6));
  const joined = span(lt, cue(S, 'cả', 0, 6.0), cue(S, 'tên', 0, 7.3));
  paint(rectPts(150, 540, 780, 820), { wash: '#F0E4C6', washOp: 255, ink: DH.ink, sw: 2 });
  vsMapVN(200, 590, 740, { key: 'map' });
  const [lx0, ly] = vsMapPt(200, 590, 740, 105.2, 17.0), [lx1] = vsMapPt(200, 590, 740, 108.0, 17.0);
  if (joined < 1) inkLine([[lx0, ly], [lx1, ly + 4]], 7 * (1 - joined), DH.red, 'ink', 0);
  glow(460, 960, 500 * joined, '#FFE7A0', .5 * joined);
  for (let i = 0; i < 8; i++) {
    const side = i % 2 ? 1 : -1, k = clamp(meet * 1.2 - (i >> 1) * .08);
    vsMini(lerp(side < 0 ? -60 : 1140, 540 + side * (30 + (i >> 1) * 36), k), 1450 + (i % 3) * 22, 21, { key: `hg${i}`, t, ph: i, moving: k > 0 && k < 1, col: [DH.red, DH.indigo, DH.green, DH.yellow][i % 4], hat: i % 2 ? 'nonla' : 'none', cheer: k >= 1 ? 1 : 0, dir: -side });
  }
  camEnd();
});
