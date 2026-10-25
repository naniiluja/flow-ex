// vs_test.js: model sheets for checking the cast (not part of the video).
LOOPS.lineup = t => {
  vsBegin(); boilSeed('bg');
  const rows = [
    [['caveman', {}], ['cavewoman', {}], ['farmer', { holdR: 'staff' }], ['farmerW', { holdR: 'sheaf' }], ['smith', { holdR: 'axe' }]],
    [['chieftain', {}], ['hung', { holdR: 'staff' }], ['auco', {}], ['lacLong', {}], ['anDuong', { holdR: 'sword', aR: 2.2 }]],
    [['soldier', {}], ['king', {}], ['mandarin', { holdR: 'scroll' }], ['soldier', { holdR: 'flag', aR: 2.6 }], ['farmer', { holdR: 'torch', aR: 2.6, mouth: 'shout', talk: t }]]
  ];
  rows.forEach((row, r) => row.forEach(([who, o], i) => nguoi(130 + i * 205, 520 + r * 520, 24, { who, t, talk: t, ...o })));
};
LOOPS.lineup.len = 4;

LOOPS.world = t => {
  vsBegin(); boilSeed('bg');
  vsSky('dawn'); vsSun(780, 420, 110, { t });
  vsCloud(250, 300, 120, { key: 'c1' }); vsCloud(900, 680, 90, { key: 'c2', ph: 2 });
  vsRidge(1000, 330, '#7E9C86', { kind: 'karst', seed: 2, key: 'r1' });
  vsRidge(1070, 150, '#5F8A64', { kind: 'hill', seed: 5, key: 'r2' });
  vsWater(1070, 1260, { t });
  vsLand(1260, DH.green, { key: 'l1' }); vsTufts(1280, 1700, 40);
  vsRice(60, 520, 1450, 3, { t, ripe: .4 });
  vsBamboo(180, 1260, 420, { t }); vsPalm(960, 1250, 380, { t }); vsBanyan(640, 1270, 260);
  vsBanana(430, 1250, 170); vsLotus(560, 1180, 50); vsTree(820, 1250, 220, { flowers: DH.pink });
  vsFire(300, 1700, 80, t); vsSmoke(300, 1640, 50, t); vsRock(700, 1600, 70);
  vsRain(t, { n: 30 });
};
LOOPS.world.len = 4;

LOOPS.build = t => {
  vsBegin(); boilSeed('bg'); vsSky('day'); vsLand(1650, DH.sand, { key: 'l' });
  vsHut(150, 330, 230, { key: 1 }); vsStilt(450, 330, 240, { key: 2 }); vsHouse(750, 330, 230, { key: 3 }); vsGate(980, 330, 190, { key: 4 });
  vsHall(300, 780, 520, { key: 5, tiers: 1 }); vsHall(800, 780, 520, { key: 6, tiers: 2, gold: true });
  vsPavilion(140, 1130, 230); vsNgoMon(520, 1130, 360); vsTowerTurtle(900, 1130, 230);
  vsPalace(300, 1480, 520); vsNhaRong(800, 1480, 360);
  vsWall(0, 400, 1900, 150, { gate: true, key: 1 }); vsRampart(450, 1080, 1900, 130, { key: 2 });
};
LOOPS.build.len = 4;
LOOPS.build2 = t => {
  vsBegin(); boilSeed('bg'); vsSky('day'); vsLand(1500, DH.sand, { key: 'l' });
  vsSkyline(0, W, 800, { t, key: 1 }); vsShopRow(0, W, 1300, { key: 2 }); vsBridgeTrack(0, W, 1380, { key: 3 }); vsTrain(60, 1380, 300, { key: 4 });
};
LOOPS.build2.len = 4;
LOOPS.things = t => {
  vsBegin(); boilSeed('bg'); vsSky('day'); vsWater(500, 1920, { t }); vsLand(1850, DH.sand, { key: 'l' });
  vsDrumTop(270, 270, 230, { rot: t * .3 }); vsDrumSide(800, 480, 330, {}); vsStakes(60, 560, 760, 6); vsMapVN(640, 560, 190);
  vsCanoe(250, 860, 320, { t }); vsWarship(760, 1000, 440, { t }); vsDragonBoat(250, 1130, 300, { t }); vsSteamship(780, 1330, 420, { t });
  vsTank(250, 1560, 380, { rock: true, t }); vsCannon(640, 1560, 240, { fire: .8, recoil: 1 }); vsBike(900, 1560, 230, { rot: t * 4 });
  vsTruck(250, 1760, 300, {}); vsFurnace(640, 1800, 190, t, { pour: .8 }); vsPot(860, 1800, 120); vsSack(960, 1800, 100);
  vsBanner(80, 1800, 260, { t, star: true }); vsEggSac(960, 1440, 200, t, { open: .6 });
  vsDragon(540, 380, 200, { t, rise: 60 });
};
LOOPS.things.len = 4;
LOOPS.animals = t => {
  vsBegin(); boilSeed('bg'); vsSky('day'); vsLand(900, DH.green, { key: 'l' });
  vsElephant(300, 700, 220, { t, walk: t * .7 }); nguoi(300 - 22, 700 - 1.78 * 220, 30, { who: 'soldier', t, holdR: 'spear' });
  vsHorse(800, 700, 240, { t, gallop: t * 1.4 }); nguoi(800 - 12, 700 - 1.62 * 240, 30, { who: 'hung', t });
  vsBuffalo(300, 1100, 240, { t, walk: t * .6 }); vsTurtle(780, 1100, 140, { t });
  vsBirds(500, 150, 7, 14, t);
  vsCrowd(40, 1040, 1300, 1480, 14, 12, t, { cheer: true, hold: 'none' });
  vsArmy(80, 1000, 1600, 3, 8, 11, t, { moving: true });
};
LOOPS.animals.len = 4;

LOOPS.dragon = t => { vsBegin(); boilSeed('bg'); vsSky('dusk'); vsDragon(540, 800, 300, { t, rise: .6 }); vsHall(540, 1500, 700, { tiers: 2, gold: true, key: 1 }); };
LOOPS.dragon.len = 4;
LOOPS.rides = t => {
  vsBegin(); boilSeed('bg'); vsSky('day'); vsLand(1000, DH.green, { key: 'l' });
  vsElephant(430, 900, 230, { t, walk: t * .7 }); nguoi(430 - 23, 900 - 1.6 * 230, 32, { who: 'soldier', t, noShadow: true });
  vsHorse(480, 1500, 230, { t, gallop: t * 1.4, dir: 1 }); nguoi(480 - 12, 1500 - 1.36 * 230, 32, { who: 'king', t, noShadow: true });
};
LOOPS.rides.len = 4;

LOOPS.landtest = t => { vsBegin(); boilSeed('bg'); vsSky('dawn', { key: 'sky' }); vsLand(1290, '#9CC36F', { key: 'g2', amp: 6 }); vsFore(1500, '#9CC36F', { key: 'fore', seed: 3 }); };
LOOPS.landtest.len = 100;

LOOPS.drum = (t) => { vsBegin(); CAM = null; vsSky('cave', { key: 'sky' }); vsDrumTop(540, 620, 480, { figs: true, glow: .4, key: 'dr' }); vsDrumSide(540, 1800, 620, { key: 'ds', hiBoats: 0 }); flushBrush(); };
LOOPS.drum.len = 2;
LOOPS.drumzoom = (t) => { vsBegin(); CAM = null; vsSky('cave', { key: 'sky' }); vsDrumTop(540, 1750, 1650, { figs: true, glow: 0, key: 'dz' }); flushBrush(); };
LOOPS.drumzoom.len = 2;

// Costume model sheets (period checks): five figures per row, three rows each.
const VS_COSTUME_ROWS = {
  a: [['chieftain', 'hung', 'auco', 'lacLong', 'anDuong'], ['hanOfficial', 'hanGeneral', 'trungTrac', 'trungNhi', 'baTrieu'], ['lyBi', 'ngoQuyen', 'dinhBoLinh', 'leHoan', 'king']],
  b: [['mandarin', 'lyThuongKiet', 'songSoldier', 'tranNhanTong', 'hungDao'], ['quocToan', 'binhTrong', 'elder', 'mongol', 'leLoi'], ['nguyenTrai', 'minhSoldier', 'chuaTrinh', 'chuaNguyen', 'nguyenHue']],
  c: [['thanhGeneral', 'giaLong', 'hamNghi', 'french', 'frenchSoldier'], ['phanBoiChau', 'phanChauTrinh', 'nguyenTatThanh', 'hoChiMinh', 'giap'], ['deCastries', 'bodoi', 'cadre', 'boy', 'leLai']]
};
for (const k of Object.keys(VS_COSTUME_ROWS)) {
  LOOPS['costume' + k] = t => {
    vsBegin(); boilSeed('bg');
    VS_COSTUME_ROWS[k].forEach((row, r) => row.forEach((who, i) => nguoi(130 + i * 205, 520 + r * 520, 24, { who, t, still: true })));
  };
  LOOPS['costume' + k].len = 4;
}

// One character drawn in the anime chibi-bust style that copies the reference art.
LOOPS.portrait = t => {
  vsBegin(); boilSeed('bg'); flushBrush();
  push(); noStroke(); fill('#FFFFFF'); rect(0, 0, 1080, 1920); pop();
  try { vsAnimeBust(540, 760, 620, { t }); } catch (e) { console.error(String(e.stack).split('\n').slice(0, 3).join(' | ')); }
};
LOOPS.portrait.len = 4;

// The same boy as a pixel-art sprite (cell 14 px), on a flat background.
LOOPS.pixel = t => {
  vsBegin(); boilSeed('bg'); flushBrush();
  push(); noStroke(); fill('#F7F2E6'); rect(0, 0, 1080, 1920); fill('#8FBF72'); rect(0, 1400, 1080, 520); pop();
  try { vsPixelHero(540, 1400, 14, { t }); } catch (e) { console.error(String(e.stack).split('\n').slice(0, 3).join(' | ')); }
};
LOOPS.pixel.len = 4;

LOOPS.rem = t => {
  window.NOGRAIN = true;   // flat colours, so the render can be diffed cell by cell against the reference
  vsBegin(); boilSeed('bg'); flushBrush();
  push(); noStroke(); fill('#FFFFFF'); rect(0, 0, 1080, 1920); pop();
  try { vsPixelRem(540, 1100, 16, { t: 1.0 }); } catch (e) { console.error(String(e.stack).split('\n').slice(0, 3).join(' | ')); }
};
LOOPS.rem.len = 4;

// Subaru jumping and waving, in the engine's brush on the paper.
LOOPS.subaru = t => {
  vsBegin(); boilSeed('bg');
  try { vsSubaru(540, 1800, 12, { t }); } catch (e) { console.error(String(e.stack).split('\n').slice(0, 3).join(' | ')); }
};
LOOPS.subaru.len = 4.8;

// Paper-doll knight: the bare body and its three parts on top (like the reference sheet), the assembled knight hopping below.
LOOPS.doll = t => {
  vsBegin(); boilSeed('bg');
  try {
    const row = 520, s = 150;
    vsDollPart('body', 120, row, s); vsDollPart('shield', 375, row, s); vsDollPart('helmet', 620, row, s); vsDollPart('sword', 905, row, s);
    flushBrush(); push(); stroke(DOLL.ink); strokeCap(ROUND); strokeWeight(9);
    for (const px of [250, 495, 770]) { line(px - 16, row - 60, px + 16, row - 60); line(px, row - 76, px, row - 44); }
    line(510, 760, 570, 760); line(510, 785, 570, 785); pop();
    vsDoll(540, 1640, 620, { t, parts: ['shield', 'helmet', 'sword'] });
  } catch (e) { console.error(String(e.stack).split('\n').slice(0, 3).join(' | ')); }
};
LOOPS.doll.len = 2.4;

// Tran Quoc Toan as a paper doll: body + headband + giao linh tunic + war flag + sword.
LOOPS.dollqt = t => {
  vsBegin(); boilSeed('bg');
  try {
    const row = 520, s = 130;
    vsDollPart('body', 95, row, s); vsDollPart('khan', 300, row, s, t); vsDollPart('ao', 500, row, s); vsDollPart('flag', 720, row, s, t); vsDollPart('kiem', 960, row, s);
    flushBrush(); push(); stroke(DOLL.ink); strokeCap(ROUND); strokeWeight(8);
    for (const px of [195, 400, 600, 845]) { line(px - 14, row - 55, px + 14, row - 55); line(px, row - 69, px, row - 41); }
    line(510, 660, 570, 660); line(510, 685, 570, 685); pop();
    vsDoll(600, 1660, 560, { t, parts: ['ao', 'khan', 'flag', 'kiem'] });
  } catch (e) { console.error(String(e.stack).split('\n').slice(0, 3).join(' | ')); }
};
LOOPS.dollqt.len = 2.4;

// The whole cast as paper dolls, 15 per page: --loop=dollcast1 .. dollcast4
[1, 2, 3, 4].forEach(n => {
  LOOPS['dollcast' + n] = t => {
    vsBegin(); boilSeed('bg');
    try { const ids = Object.keys(CAST).slice((n - 1) * 15, n * 15); vsDollCastSheet(ids, `Dàn nhân vật ${n}/4`, t); }
    catch (e) { console.error(String(e.stack).split('\n').slice(0, 3).join(' | ')); }
  };
  LOOPS['dollcast' + n].len = 2.4;
});

// Props for the paper-doll world: --loop=dollprops1 / dollprops2
LOOPS.dollprops1 = t => {
  vsBegin(); boilSeed('bg');
  try {
    dpCaption('Đạo cụ 1/2', 540, 90, 46);
    dpDrumSide(280, 650, 420, { t }); dpCaption('Trống đồng Ngọc Lũ (nhìn nghiêng)', 280, 715, 24);
    dpDrumTop(800, 420, 420, { t }); dpCaption('Mặt trống: sao 14 tia, 18 chim lạc', 800, 670, 24);
    dpBoatDongSon(540, 1150, 720, { t }); dpCaption('Thuyền Đông Sơn (theo hình trên trống)', 540, 1215, 26);
    dpCanoe(290, 1580, 400, { t, crew: 'farmer' }); dpCaption('Thuyền độc mộc', 290, 1640);
    dpStakes(800, 1580, 380, { t }); dpCaption('Cọc Bạch Đằng', 800, 1640);
  } catch (e) { console.error(String(e.stack).split('\n').slice(0, 3).join(' | ')); }
};
LOOPS.dollprops1.len = 1.6;
LOOPS.dollprops2 = t => {
  vsBegin(); boilSeed('bg');
  try {
    dpCaption('Đạo cụ 2/2', 540, 90, 46);
    dpTranBoat(540, 470, 800, { t }); dpCaption('Chiến thuyền Trần (suy đoán)', 540, 530);
    dpYuanJunk(540, 1180, 600, { t }); dpCaption('Lâu thuyền Nguyên (suy đoán)', 540, 1240);
    dpBowSet(150, 1640, 250); dpCaption('Cung, tên, ống tên', 150, 1700, 22);
    dpCrossbowSet(420, 1640, 250); dpCaption('Nỏ, lẫy đồng Cổ Loa', 410, 1700, 22);
    vsDollCast('soldier', 720, 1660, 160, { t, item: 'bowdraw' }); dpCaption('Giương cung', 700, 1720, 22);
    vsDollCast('anDuong', 960, 1660, 160, { t, item: 'crossbow' }); dpCaption('Bắn nỏ', 950, 1720, 22);
  } catch (e) { console.error(String(e.stack).split('\n').slice(0, 3).join(' | ')); }
};
LOOPS.dollprops2.len = 1.6;

LOOPS.outro = t => { vsOutro(t); };
LOOPS.outro.len = VS_OUTRO.len;

// Animals and buildings in the paper-doll look: --loop=dollworld1 (animals) / dollworld2 (buildings)
LOOPS.dollworld1 = t => {
  vsBegin(); boilSeed('bg');
  try {
    dpCaption('Con vật 1/2', 540, 80, 44);
    vsDragon(330, 440, 220, { t }); vsDragon(780, 440, 220, { t, col: DH.skyDk }); dpCaption('Rồng vàng (Thăng Long) và rồng nước (Thuỷ Tinh)', 540, 700, 24);
    vsElephant(330, 1130, 150, { t, walk: t * .5 }); nguoi(330 - 15, 1130 - 240, 30, { who: 'trungTrac', t, noShadow: true }); dpCaption('Voi chiến (người cưỡi đúng chỗ)', 330, 1180);
    vsHorse(820, 1130, 150, { t, gallop: t * 1.2 }); nguoi(820 - 7.5, 1130 - 204, 30, { who: 'leLoi', t, noShadow: true }); dpCaption('Ngựa', 820, 1180);
    vsBuffalo(300, 1620, 170, { t, walk: t * .4 }); dpCaption('Trâu ta, sừng lưỡi liềm', 300, 1670);
    vsTurtle(800, 1580, 120, { t }); dpCaption('Rùa vàng Kim Quy', 800, 1670);
  } catch (e) { console.error(String(e.stack).split('\n').slice(0, 3).join(' | ')); }
};
LOOPS.dollworld1.len = 2.4;
LOOPS.dollworld2 = t => {
  vsBegin(); boilSeed('bg');
  try {
    dpCaption('Nhà cửa 2/2', 540, 80, 44);
    vsStilt(290, 560, 380); dpCaption('Nhà sàn Đông Sơn', 290, 610);
    vsHut(800, 560, 380); dpCaption('Nhà tranh vách đất', 800, 610);
    vsHall(540, 1080, 560, { tiers: 2 }); dpCaption('Đình, mái đao cong', 540, 1130);
    vsGate(290, 1560, 380); dpCaption('Cổng tam quan', 290, 1610);
    vsWall(600, 1040, 1560, 170, { gate: true }); dpCaption('Thành, cổng vòm', 820, 1610);
  } catch (e) { console.error(String(e.stack).split('\n').slice(0, 3).join(' | ')); }
};
LOOPS.dollworld2.len = 2.4;
