// vs_dollcast.js: the whole history cast as paper dolls. Reads each CAST entry (vs_people.js: hair, beard, hat, outfit kind and
// colours, holdR, barefoot) and dresses the vs_doll.js body with matching pieces, so the costume research stays in one table.
//   vsDollCast(who, x, y, s, { t, hop })   same frame as vsDoll: (x, y) = between the feet, s = bare body height in px.
const DC = { hair: '#2A2A2E', grey: '#E4E4E8', straw: '#E6CF8E', strawDk: '#B99A55', wood: '#8A5A2B', bronze: '#B87333', star: '#D6302A' };
const DC_ITEMS = { farmerW: 'sheaf', smith: 'axe', chieftain: 'axe', caveman: 'staff', elder: 'staff', thayDo: 'scroll', mandarin: 'scroll', nguyenTrai: 'scroll',
  anDuong: 'sword', baTrieu: 'sword', trungTrac: 'sword', trungNhi: 'sword', ngoQuyen: 'spear', lyThuongKiet: 'sword', hungDao: 'sword', leLoi: 'sword', nguyenHue: 'sword' };
const DC_NAMES = { caveman: 'Người tiền sử', cavewoman: 'Phụ nữ tiền sử', farmer: 'Nông dân', farmerW: 'Nông dân nữ', smith: 'Thợ đúc đồng',
  chieftain: 'Tù trưởng', hung: 'Vua Hùng', auco: 'Âu Cơ', lacLong: 'Lạc Long Quân', anDuong: 'An Dương Vương', soldier: 'Lính', king: 'Vua',
  mandarin: 'Quan', trungTrac: 'Trưng Trắc', trungNhi: 'Trưng Nhị', baTrieu: 'Bà Triệu', hanOfficial: 'Quan Hán', hanGeneral: 'Tướng Hán',
  lyBi: 'Lý Bí', ngoQuyen: 'Ngô Quyền', dinhBoLinh: 'Đinh Bộ Lĩnh', leHoan: 'Lê Hoàn', lyCongUan: 'Lý Công Uẩn', lyThuongKiet: 'Lý Thường Kiệt',
  songSoldier: 'Lính Tống', thayDo: 'Thầy đồ', tranNhanTong: 'Trần Nhân Tông', elder: 'Bô lão', hungDao: 'Trần Hưng Đạo', quocToan: 'Trần Quốc Toản',
  binhTrong: 'Trần Bình Trọng', mongol: 'Lính Nguyên', leLoi: 'Lê Lợi', leThan: 'Lê Thận', leLai: 'Lê Lai', nguyenTrai: 'Nguyễn Trãi',
  minhSoldier: 'Lính Minh', chuaTrinh: 'Chúa Trịnh', chuaNguyen: 'Chúa Nguyễn', nguyenNhac: 'Nguyễn Nhạc', nguyenHue: 'Nguyễn Huệ',
  nguyenLu: 'Nguyễn Lữ', thanhGeneral: 'Tướng Thanh', nguyenAnh: 'Nguyễn Ánh', giaLong: 'Gia Long', hamNghi: 'Hàm Nghi', french: 'Quan Pháp',
  frenchSoldier: 'Lính Pháp', phanBoiChau: 'Phan Bội Châu', phanChauTrinh: 'Phan Châu Trinh', nguyenTatThanh: 'Nguyễn Tất Thành',
  hoChiMinh: 'Hồ Chí Minh', cadre: 'Cán bộ', giap: 'Võ Nguyên Giáp', deCastries: 'De Castries', bodoi: 'Bộ đội', boy: 'Cậu bé' };
const dcDark = (hex, f = .72) => { const c = color(hex); return color(red(c) * f, green(c) * f, blue(c) * f); };
const dcBand = (D, y0, y1, col) => D.shape([...dollArc(0, y0, 51, 7, Math.PI, 0, 14), ...dollArc(0, y1, 52, 8, 0, Math.PI, 14)], col);
const dcDome = (D, col, y = -116, r = 51) => D.shape([...dollArc(0, -106, r, r, Math.PI + .25, 2 * Math.PI - .25, 22), [r * .97, y], [-r * .97, y]], col);

function dcHair(D, h, col, back) {
  if (!h || h === 'none') return;
  if (back) { if (h === 'long') D.shape(dollRR(-50, -136, 100, 104, 42), col); return; }
  // the hairline is a gentle wave, not separate locks (loose dark blobs under it read as sunglasses on a blank face)
  const edge = []; for (let x = 44; x >= -44; x -= 4) edge.push([x, -117 + 4 * Math.abs(Math.sin(x / 11 * Math.PI / 2))]);
  D.shape([...dollArc(0, -106, 50, 50, Math.PI + .24, 2 * Math.PI - .24, 22), ...edge], col);
  if (h === 'long') { D.shape(dollRR(-55, -120, 14, 58, 7), col); D.shape(dollRR(41, -120, 14, 58, 7), col); }
}
function dcBeard(D, b, col) {
  if (!b) return;
  if (b === 'long') D.shape([[-22, -76], [22, -76], [14, -44], [0, -30], [-14, -44]], col);
  else if (b === 'goat') D.shape([[-7, -68], [7, -68], [0, -46]], col);
  else if (b === 'thin') D.shape(dollEll(0, -63, 4, 6), col);
  if (b !== 'long') D.shape([[-17, -80], [-2, -85], [0, -82], [2, -85], [17, -80], [12, -76], [0, -79], [-12, -76]], col);
}
function dcHat(D, kind, col, c) {
  const dk = col && dcDark(col);
  switch (kind) {
    case 'nonla':
      D.shape([[-76, -110], [0, -172], [76, -110], [0, -101]], col || DC.straw);
      D.line(dollArc(0, -130, 40, 5, 0, Math.PI, 10), DC.strawDk, 3); D.line(dollArc(0, -148, 20, 3, 0, Math.PI, 8), DC.strawDk, 3); break;
    case 'wrap':
      dcDome(D, col, -114); D.line(dollArc(0, -122, 47, 8, .2, Math.PI - .2, 12), dk, 4); D.line(dollArc(0, -136, 40, 7, .25, Math.PI - .25, 10), dk, 4); break;
    case 'khan': {
      const w = 3 * Math.sin(c.t * 7);
      D.shape([[44, -122], [66, -114 + w], [62, -104 + w], [44, -112]], dk);
      dcBand(D, -128, -113, col); D.shape(dollEll(47, -119, 7, 8), dk); break;
    }
    case 'khandong':
      dcDome(D, col || '#1A1A1A', -112); D.line(dollArc(0, -121, 48, 9, .15, Math.PI - .15, 12), '#5A5A60', 4); D.line(dollArc(0, -134, 42, 8, .2, Math.PI - .2, 12), '#5A5A60', 4); break;
    case 'feather':
      [-2, -1, 0, 1, 2].forEach((i, n) => { const x = i * 15; D.shape([[x - 6, -122], [x + i * 9 - 7, -166], [x + i * 13, -192 + Math.abs(i) * 10], [x + i * 9 + 7, -166], [x + 6, -122]], ['#1E8A7A', '#C8963E', '#B5342A'][n % 3]); });
      dcBand(D, -126, -112, '#C8963E'); break;
    case 'flower':
      dcBand(D, -126, -114, '#1E8A7A');
      for (const x of [-26, 0, 26]) { D.shape(dollEll(x, -126, 9), x ? '#D6533A' : '#E8B923'); D.shape(dollEll(x, -126, 3.5), '#FFF3C4', false); } break;
    case 'helmet':
      dcDome(D, col || '#6B7078', -112, 53); D.shape(dollRR(-57, -118, 114, 11, 5), dk || '#4E535A'); D.shape(dollEll(0, -161, 6, 8), DOLL.gold);
      D.line(dollArc(0, -112, 40, 34, 3.6, 4.4, 8), 'rgba(255,255,255,.45)', 5); break;
    case 'crown':   // mũ xung thiên: a gold cap with two upright wings behind it
      for (const sx of [-1, 1]) D.shape([[sx * 34, -128], [sx * 44, -182], [sx * 58, -178], [sx * 50, -126]], col || '#E8B923');
      dcDome(D, col || '#E8B923', -112, 52); dcBand(D, -124, -112, DOLL.red); D.shape(dollEll(0, -140, 7), DOLL.red); break;
    case 'phoc':
      D.shape(dollRR(-94, -132, 188, 9, 4), col || '#1A1A1A'); dcDome(D, col || '#1A1A1A', -112); break;
    case 'tienhien':
      D.shape([[-30, -146], [28, -170], [38, -152], [-22, -134]], col || '#1C1C1C'); dcDome(D, col || '#1C1C1C', -112); D.line([[-44, -140], [44, -140]], DOLL.gold, 3); break;
    case 'tuphuong':
      D.shape(dollRR(-46, -160, 92, 50, 12), col); D.shape(dollRR(-51, -124, 102, 13, 6), dk); break;
    case 'canhchuon':
      for (const sx of [-1, 1]) D.shape(dollEll(sx * 64, -132, 22, 9), col || '#1A1A1A');
      dcDome(D, col || '#1A1A1A', -112); D.shape(dollEll(0, -152, 22, 10), col || '#1A1A1A'); break;
    case 'thanh':
      D.shape(dollEll(0, -118, 64, 12), col || '#1F3A5F'); D.shape([[-46, -120], [0, -160], [46, -120]], '#C8202A'); D.shape(dollEll(0, -162, 6, 7), DOLL.gold); break;
    case 'casque':
      D.shape(dollEll(0, -116, 68, 12), col || '#F2EFE6'); D.shape([...dollArc(0, -118, 46, 42, Math.PI, 2 * Math.PI, 20)], col || '#F2EFE6'); D.shape(dollEll(0, -161, 6, 4), dcDark(col || '#F2EFE6')); break;
    case 'cap':
      D.shape(dollRR(-40, -152, 80, 38, 8), col); D.shape(dollRR(-43, -124, 86, 11, 4), dk); D.shape(dollArc(0, -114, 40, 9, 0, Math.PI, 12), '#1E1E1E');
      if (c.star) D.shape(dollEll(0, -136, 6), DC.star); break;
    case 'mucoi':
      D.shape(dollEll(0, -114, 62, 11), col || '#6A8A4A'); D.shape([...dollArc(0, -114, 46, 46, Math.PI, 2 * Math.PI, 20)], col || '#6A8A4A'); D.shape(dollEll(0, -132, 7), DC.star); break;
  }
}
function dcOutfit(D, o, who) {
  const k = o.kind, col = o.col, col2 = o.col2 || dcDark(col);
  const pants = cl => { for (const lx of [-18, 10]) D.shape(dollRR(lx - 1, -26, 11, 22, 4), cl); };
  const cross = () => { D.shape([[-9, -74], [2, -74], [26, -46], [16, -46]], col2); D.shape([[2, -74], [12, -74], [2, -62]], col2); };
  if (k === 'robe') {
    D.shape([[-29, -74], [29, -74], [34, -44], [42, -4], [-42, -4], [-34, -44]], col);
    D.shape([[-40, -13], [40, -13], [42, -4], [-42, -4]], col2);
    if (o.collar === 'cross') cross();
    D.shape(dollRR(-34, -43, 68, 6, 3), col2);
    if (o.patch) D.shape(dollRR(-24, -64, 18, 16, 3), o.patch);
  } else if (k === 'tunic') {
    pants(o.pants || DC.wood);
    D.shape([[-29, -74], [29, -74], [31, -46], [36, -26], [40, -16], [-40, -16], [-36, -26], [-31, -46]], col);
    D.shape([[-38, -22], [38, -22], [40, -16], [-40, -16]], col2); cross(); D.shape(dollRR(-32, -43, 64, 6, 3), col2);
  } else if (k === 'skirt') {
    D.shape([[-28, -50], [28, -50], [40, -5], [-40, -5]], col); D.shape([[-38, -13], [38, -13], [40, -5], [-40, -5]], col2);
    D.shape(dollRR(-30, -74, 60, 30, 10), o.top || col2);
  } else if (k === 'fur') {
    D.shape([[-31, -70], [16, -74], [31, -60], [32, -30], [24, -23], [16, -30], [8, -22], [0, -30], [-8, -22], [-16, -30], [-24, -22], [-32, -30]], col);
    for (const [sx, sy] of [[-14, -54], [6, -42], [-20, -36], [18, -52]]) D.shape(dollEll(sx, sy, 5, 4), dcDark(col, .6), false);
    if (o.fringe) o.fringe.forEach((fc, i) => D.shape(dollEll(-22 + i * 14, -32, 4), fc));
    if (o.tattoo) D.line(dollArc(23, -62, 6, 6, .2, Math.PI - .2, 6), o.tattoo, 3);
  } else if (k === 'bare') {
    D.shape([[-31, -40], [31, -40], [31, -28], [8, -28], [4, -12], [-4, -12], [-8, -28], [-31, -28]], col);
  } else if (k === 'armor') {
    pants(o.pants || '#3A3A3E');
    D.shape([[-35, -38], [35, -38], [39, -14], [-39, -14]], col2);
    D.shape(dollRR(-32, -74, 64, 42, 10), col);
    if (o.scale) for (let y = -66; y <= -42; y += 8) for (let x = -24; x <= 24; x += 10) D.line(dollArc(x + (y % 16 ? 5 : 0), y, 5, 4, 0, Math.PI, 6), dcDark(col), 2.5);
    else for (const y of [-60, -48]) D.line([[-27, y], [27, y]], dcDark(col), 3.5);
    for (const sx of [-1, 1]) D.shape(dollEll(sx * 32, -68, 12, 9), col2);
    D.shape(dollRR(-34, -40, 68, 6, 3), col2);
  } else if (k === 'suit') {
    pants(who === 'french' ? col : '#2E2E34');
    D.shape([[-30, -74], [30, -74], [32, -22], [-32, -22]], col);
    D.shape([[-9, -74], [9, -74], [0, -52]], col2); D.line([[-11, -74], [0, -44]], dcDark(col), 3); D.line([[11, -74], [0, -44]], dcDark(col), 3);
    for (const y of [-40, -30]) D.shape(dollEll(0, y, 2.5), dcDark(col), false);
  } else if (k === 'uniform') {
    pants(col);
    D.shape(dollRR(-31, -74, 62, 52, 8), col); D.shape(dollRR(-33, -44, 66, 7, 3), '#5A3A1E');
    for (const sx of [-1, 1]) D.shape(dollRR(sx < 0 ? -25 : 11, -66, 14, 10, 3), col2);
    for (const y of [-58, -34]) D.shape(dollEll(0, y, 2.5), col2, false);
  }
  if (o.necklace) D.line(dollArc(0, -72, 22, 10, .3, Math.PI - .3, 10), o.necklace, 5);
}
function dcItem(D, item, c) {
  const hand = () => D.shape(dollEll(38, -27, 9), DOLL.white);
  if (item === 'spear') { D.shape([[38, -244], [46, -214], [30, -214]], DOLL.metal); D.shape(dollRR(34, -216, 8, 212, 4), DC.wood); }
  else if (item === 'staff') D.shape(dollRR(34, -150, 8, 148, 4), DC.wood);
  else if (item === 'sheaf') { D.shape([[30, -32], [46, -32], [58, -96], [18, -96]], '#E0B84A'); D.shape(dollRR(28, -44, 20, 6, 3), DC.wood); }
  else if (item === 'axe') { D.shape(dollRR(34, -100, 8, 90, 4), DC.wood); D.shape([[42, -98], [64, -110], [70, -84], [64, -62], [42, -76]], DC.bronze); }
  else if (item === 'torch') { const f = 4 * Math.sin(c.t * 11); D.shape(dollRR(34, -110, 8, 100, 4), DC.wood); D.shape([[28, -112], [38, -150 + f], [48, -112]], '#F28A1E'); D.shape([[33, -114], [38, -134 + f], [43, -114]], '#FFD24A', false); }
  else if (item === 'scroll') D.shape(dollRR(20, -36, 36, 12, 6), '#F1E7CF');
  else if (item === 'rifle') { D.rot(.3, 38, -27); D.shape(dollRR(35, -150, 6, 120, 3), '#3A3A3E'); D.shape(dollRR(31, -46, 14, 44, 6), DC.wood); D.rot(0); }
  else if (item === 'sword') { dollSword(D, c.sway, true); return; }
  else if (typeof DP_ITEMS !== 'undefined' && DP_ITEMS[item]) { DP_ITEMS[item](D, c); return; }
  else return;
  hand();
}
function vsDollCast(who, x, y, s, o = {}) {
  const t = o.t ?? 0;
  if (who === 'quocToan') return vsDoll(x, y, s, { t, hop: o.hop, parts: ['ao', 'khan', 'flag', 'kiem'] });
  flushBrush();
  const C = o.spec || CAST[who], k = s / 155, hop = o.hop ? 14 * Math.abs(Math.sin(Math.PI * t / .6)) : 0, c = { t, sway: .35 + .12 * Math.sin(TAU * t / 1.2), star: who === 'giap' };
  const hairCol = C.hair === 'white' ? DC.grey : DC.hair, item = o.item !== undefined ? o.item : C.holdR || DC_ITEMS[who];
  if (o.shadow !== false) { push(); noStroke(); fill(DOLL.shadow); ellipse(x, y + 2 * k, 150 * k * (1 - hop / 45), 22 * k * (1 - hop / 45)); pop(); }
  const D = dollPen(x, y - hop * k, k);
  dcHair(D, C.hair, hairCol, true);
  dollBody(D, [0, 0], C.barefoot);
  if (C.outfit) dcOutfit(D, C.outfit, who);
  dollHead(D);
  dcHair(D, C.hair, hairCol, false);
  dcBeard(D, C.beard, hairCol);
  if (C.hat) dcHat(D, C.hat, C.hatCol, c);
  if (item) dcItem(D, item, c);
}
// a model sheet page: up to 15 of the cast, 5 x 3, each with its name under it
function vsDollCastSheet(ids, title, t = 0) {
  letter(title, 540, 90, 46, '#1E1E1E', { ink: false, font: '700 46px "Helvetica Neue", Arial, sans-serif' });
  ids.forEach((who, i) => {
    const cx = 108 + (i % 5) * 216, fy = 560 + Math.floor(i / 5) * 600;
    vsDollCast(who, cx, fy, 190, { t });
    const name = DC_NAMES[who] || who, fs = name.length > 13 ? 21 : 26;
    letter(name, cx, fy + 52, fs, '#1E1E1E', { ink: false, font: `600 ${fs}px "Helvetica Neue", Arial, sans-serif` });
  });
}
