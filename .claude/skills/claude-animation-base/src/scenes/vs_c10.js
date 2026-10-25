// vs_c10.js: chương 10, Nguyễn Ái Quốc và Độc lập (scenes 69-75).

const KHAKI = '#B8A670';

// ---------- 69: Nhà Rồng wharf; a thin young man with a bundle boards the liner under the name Văn Ba ----------
scene('69', (t, lt, dur, S) => {
  vsCam(lt, dur, { x0: 540, y0: 1130, z0: 1.0, x1: 560, y1: 1100, z1: 1.08 });
  vsSky('dawn', { key: 'sky' }); vsSun(300, 460, 100, { t, key: 'sun' });
  vsRidge(1000, 130, '#8CA58F', { kind: 'hill', seed: 461, key: 'r1' });
  vsLand(1080, '#7CAE5F', { key: 'g1' });
  vsNhaRong(300, 1250, 520, { key: 'nr' });
  vsWater(1290, 2400, { t, key: 'sg', speed: 22, col: '#B5714F' });
  paint(rectPts(-60, 1290, 1200, 26), { wash: DH.brownDk, washOp: 255, ink: DH.ink, sw: 1.3 });
  vsSteamship(880, 1360, 600, { t, key: 'ss', dir: -1 });
  const walk = span(lt, 2.5, cue(S, 'lên', 0, 6.6) + 1.2), up = span(lt, cue(S, 'lên', 0, 6.6), cue(S, 'lên', 0, 6.6) + 1.4);
  nguoi(lerp(60, 640, walk), 1310 - 70 * up, 40, { who: 'nguyenTatThanh', t, walk: walk > 0 && walk < 1 ? t * 1.6 : null, holdR: 'bundle', boilKey: 'ntt' });
  camEnd();
});

// ---------- 70: ship, kitchen, books: years abroad ----------
scene('70', (t, lt, dur, S) => {
  const c1 = cue(S, 'hơn', 0, 3.5) - .1, c2 = cue(S, 'đọc', 0, 7.7) - .15;
  if (lt < c1 + .3) {
    vsCam(lt, dur, { x0: 540, y0: 1110, z0: 1.0, x1: 600, y1: 1090, z1: 1.08 });
    vsSky('dusk', { key: 'sky' }); vsSun(540, 600, 120, { t, key: 'sun' });
    vsWater(1100, 2400, { t, key: 'sea', speed: 26, col: '#3E6A8C' });
    vsSteamship(lerp(100, 900, clamp(lt / c1)), 1320, 560, { t, key: 'ss', dir: 1 });
    camEnd();
  } else if (lt < c2 + .3) {
    vsCam(lt, dur, { x0: 540, y0: 1110, z0: 1.0, x1: 540, y1: 1090, z1: 1.1 });
    vsSky('cave', { key: 'sky' });
    paint(rectPts(-200, -300, 1480, 2000), { wash: '#6A5A4A', washOp: 255, ink: null });
    paint(rectPts(-200, 1450, 1480, 1000), { wash: '#4A3A2C', washOp: 255, ink: DH.ink, sw: 1.3 });
    vsFire(860, 1230, 30, t, { key: 'stove' });
    paint(rectPts(780, 1260, 200, 200), { wash: DH.greyDk, washOp: 255, ink: DH.ink, sw: 1.4 });
    paint(rectPts(150, 1300, 460, 170), { wash: DH.brownDk, washOp: 255, ink: DH.ink, sw: 1.4 });
    paint(ellPts(380, 1300, 130, 26, 16), { wash: '#9AB0C0', washOp: 255, ink: DH.ink, sw: 1.2 });
    for (let i = 0; i < 4; i++) paint(ellPts(300 + i * 40, 1280 - i * 8, 28, 8, 10), { wash: DH.white, washOp: 255, ink: DH.ink, sw: 1 });
    nguoi(480, 1400, 44, { who: 'nguyenTatThanh', t, aR: 1.1 + .35 * Math.sin(t * 5), holdR: 'cup', lookX: -.3, boilKey: 'ntt' });
    camEnd();
  } else {
    vsCam(lt, dur, { x0: 540, y0: 1100, z0: 1.0, x1: 540, y1: 1070, z1: 1.1 });
    paint(rectPts(-200, -300, 1480, 2000), { wash: '#3A2A22', washOp: 255, ink: null });
    paint(rectPts(-200, 1450, 1480, 1000), { wash: '#4A3A2C', washOp: 255, ink: DH.ink, sw: 1.3 });
    glow(740, 900, 520, '#FFC766', .55 + .06 * Math.sin(t * 6));
    paint(rectPts(710, 1130, 60, 40), { wash: DH.redDk, washOp: 255, ink: DH.ink, sw: 1 }); vsFire(740, 1130, 12, t, { key: 'lamp', glow: .9 });
    paint(rectPts(160, 1290, 620, 220), { wash: DH.brownDk, washOp: 255, ink: DH.ink, sw: 1.5 });
    paint([[300, 1260], [440, 1240], [440, 1300], [300, 1320]], { wash: DH.white, washOp: 255, ink: DH.ink, sw: 1.1 }); paint([[440, 1240], [580, 1260], [580, 1320], [440, 1300]], { wash: '#F0E4C6', washOp: 255, ink: DH.ink, sw: 1.1 });
    nguoi(440, 1400, 46, { who: 'nguyenTatThanh', t, lookX: .2, mouth: 'flat', boilKey: 'ntt' });
    camEnd();
  }
  if (lt > c1 - .35 && lt < c1 + .35) brushWipe((lt - (c1 - .35)) / .7, ['#2B2233', '#5F5B58']);
  if (lt > c2 - .35 && lt < c2 + .35) brushWipe((lt - (c2 - .35)) / .7, ['#2B2233', '#5F5B58']);
});

// ---------- 71: around a table, hands stack up; the groups become one Party ----------
scene('71', (t, lt, dur, S) => {
  vsCam(lt, dur, { x0: 540, y0: 1100, z0: 1.0, x1: 540, y1: 1070, z1: 1.1 });
  paint(rectPts(-200, -300, 1480, 2000), { wash: '#4A3326', washOp: 255, ink: null });
  paint(rectPts(-200, 1450, 1480, 1000), { wash: '#6A4A32', washOp: 255, ink: DH.ink, sw: 1.3 });
  glow(540, 900, 560, '#FFC766', .5 + .06 * Math.sin(t * 6));
  const join = span(lt, cue(S, 'gom', 0, 3.9), cue(S, 'thành', 0, 6.1));
  ['cadre', 'nguyenTatThanh', 'cadre', 'cadre'].forEach((w, i) => nguoi(170 + i * 250, 1360, 44, { who: w, t, aL: i < 2 ? .8 : .3, aR: i >= 2 ? 1.0 + join * .4 : .3, lookX: i < 2 ? .4 : -.4, boilKey: `c${i}`, hat: i === 1 ? 'none' : undefined, outfit: i === 1 ? { kind: 'suit', col: DH.brownDk, col2: DH.white } : undefined }));
  paint(rectPts(100, 1330, 880, 160), { wash: DH.brownDk, washOp: 255, ink: DH.ink, sw: 1.5 });
  const hands = clamp(join * 5);
  for (let i = 0; i < 4; i++) if (hands > i) paint(ellPts(540 + (i % 2 ? 14 : -14), 1310 - i * 14, 36, 22, 10), { wash: [SKIN.tan, SKIN.fair, SKIN.dark, SKIN.tan][i], washOp: 255, ink: DH.ink, sw: 1.1 });
  camEnd();
});

// ---------- 72: autumn 1945: Hà Nội street, red flags fill the street, crowds rush out ----------
scene('72', (t, lt, dur, S) => {
  vsCam(lt, dur, { x0: 540, y0: 1130, z0: 1.0, x1: 540, y1: 1090, z1: 1.1 });
  vsSky('gold', { key: 'sky' }); vsCloud(250, 330, 120, { key: 'c1' });
  vsShopRow(-40, 1140, 1300, { key: 'hn' });
  const flags = span(lt, cue(S, 'nổi', 0, 5.8), cue(S, 'cờ', 0, 8.6));
  for (let i = 0; i < 9; i++) if (flags * 9 > i) vsBanner(60 + i * 125, 1030 + (i % 3) * 22, 150 * clamp(flags * 9 - i), { w: 90, fh: 62, kind: 'vn', key: `fg${i}`, t, ph: i });
  paint(rectPts(-100, 1300, 1300, 1300), { wash: '#B8A890', washOp: 255, ink: DH.ink, sw: 1.3 });
  const go = span(lt, cue(S, 'dân', 0, 5.1), dur);
  vsCrowd(-40, 1120, 1380, 1520, Math.round(8 + 22 * go), 19, t, { hold: 'flag', flag: DH.red, flagStar: true, cheer: true, moving: true, seed: 15 });
  camEnd();
});

// Ba Đình square: tribune with Uncle Hồ, the crowd below. up 0..1 raises the crowd's arms.
function vsBaDinh(t, S, lt, o = {}) {
  vsBackdrop({ sky: 'day', sunX: 880, sunY: 300, rh: 980, seed: 471, land: '#86B565', land2: '#B7C77C', fore: false });
  vsWall(-40, 1120, 1130, 90, { key: 'bd' });
  for (let i = 0; i < 7; i++) vsBanner(60 + i * 160, 1040, 220, { w: 100, fh: 70, kind: 'vn', key: `fg${i}`, t, ph: i });
  paint(rectPts(300, 1290, 480, 200), { wash: '#D8C9A0', washOp: 255, ink: DH.ink, sw: 1.6 });
  paint(rectPts(280, 1270, 520, 30), { wash: DH.red, washOp: 255, ink: DH.ink, sw: 1.2 });
  nguoi(540, 1270, 40, { who: 'hoChiMinh', t, aR: o.arm ?? 1.2, mouth: o.mouth ?? 'talk', talk: 1, boilKey: 'hcm' });
  inkLine([[470, 1180], [470, 1250]], 3, DH.ink, 'ink', 0); paint(ellPts(470, 1170, 14, 14, 8), { wash: DH.greyDk, ink: DH.ink, sw: 1 });
  vsCrowd(-60, 1140, 1500, 1620, 42, 17, t, { cheer: o.up > 0, hold: o.up > 0 ? undefined : undefined, seed: 21 });
}

// ---------- 73: Ba Đình, 2 September: the Declaration of Independence ----------
scene('73', (t, lt, dur, S) => {
  vsCam(lt, dur, { x0: 540, y0: 1130, z0: 1.0, x1: 540, y1: 1090, z1: 1.12 });
  vsBaDinh(t, S, lt, { arm: lt > cue(S, 'cụ', 0, 6.8) ? 1.6 + .2 * Math.sin(t * 2) : .3 });
  camEnd();
});

// ---------- 74: "Have you heard me clearly?" The whole square answers with raised arms ----------
scene('74', (t, lt, dur, S) => {
  vsCam(lt, dur, { x0: 540, y0: 1130, z0: 1.0, x1: 540, y1: 1090, z1: 1.14 });
  vsBaDinh(t, S, lt, { arm: 1.2, up: span(lt, cue(S, 'không', 0, 2.5), dur) > 0 ? 1 : 0, mouth: 'smile' });
  camEnd();
});

// ---------- 75: a French ship returns, oil lamps are lit in the night streets, the country rises ----------
scene('75', (t, lt, dur, S) => {
  vsCam(lt, dur, { x0: 540, y0: 1130, z0: 1.0, x1: 540, y1: 1090, z1: 1.1 });
  vsSky('night', { key: 'sky', t }); vsMoon(840, 400, 80, { t, key: 'mn' });
  vsWater(1100, 1300, { t, key: 'sea', speed: 18, col: '#27406A' });
  vsSteamship(lerp(-100, 700, ease(span(lt, cue(S, 'pháp', 0, 1.7) - 1.2, cue(S, 'lại', 0, 2.3) + .8))), 1250, 360, { t, key: 'ss', dir: 1, hull: DH.ink });
  vsShopRow(-40, 1140, 1400, { key: 'hn' });
  const lamps = span(lt, cue(S, 'tháng', 0, 2.8), cue(S, 'sáu', 0, 3.7));
  for (let i = 0; i < 8; i++) if (lamps * 8 > i) { glow(80 + i * 140, 1300, 160, '#FFC766', .7); vsFire(80 + i * 140, 1330, 12, t, { key: `ol${i}`, glow: .8 }); }
  paint(rectPts(-100, 1400, 1300, 1000), { wash: '#4A4038', washOp: 255, ink: DH.ink, sw: 1.3 });
  const rise = span(lt, cue(S, 'cả', 0, 5), dur);
  vsCrowd(-40, 1120, 1480, 1600, Math.round(30 * rise), 17, t, { hold: 'torch', cheer: true, seed: 17 });
  camEnd();
});
