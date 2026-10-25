// vs_pixel.js: pixel-art chibi sprites drawn from code. A sprite is a small colour grid (48 x 64 cells) filled with ellipses and
// rects, then an automatic 1-cell outline is added around every shape, then the grid is painted with square cells at scale `px`.
//   vsPixelHero(x, y, px, { hair, skin, iris, cloth, collar, band, orange, t })   (x, y) = middle of the feet, px = cell size in screen px.
function vsPixelGrid(w, h) {
  const g = Array.from({ length: h }, () => Array(w).fill(null));
  const set = (x, y, c) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < w && y < h) g[y][x] = c; };
  return {
    w, h, g, set,
    rect: (x0, y0, ww, hh, c) => { for (let j = 0; j < hh; j++) for (let i = 0; i < ww; i++) set(x0 + i, y0 + j, c); },
    ellipse: (cx, cy, rx, ry, c) => { for (let j = Math.floor(cy - ry); j <= Math.ceil(cy + ry); j++) for (let i = Math.floor(cx - rx); i <= Math.ceil(cx + rx); i++) if (((i - cx) / rx) ** 2 + ((j - cy) / ry) ** 2 <= 1) set(i, j, c); },
    tri: (x0, y0, x1, y1, x2, y2, c) => { const mnx = Math.floor(Math.min(x0, x1, x2)), mxx = Math.ceil(Math.max(x0, x1, x2)), mny = Math.floor(Math.min(y0, y1, y2)), mxy = Math.ceil(Math.max(y0, y1, y2)); const s = (ax, ay, bx, by, cx, cy) => (ax - cx) * (by - cy) - (bx - cx) * (ay - cy); for (let j = mny; j <= mxy; j++) for (let i = mnx; i <= mxx; i++) { const d1 = s(i, j, x0, y0, x1, y1), d2 = s(i, j, x1, y1, x2, y2), d3 = s(i, j, x2, y2, x0, y0); if (!((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0))) set(i, j, c); } },
    outline: (c, yMin = 0) => { const add = []; for (let j = yMin; j < h; j++) for (let i = 0; i < w; i++) if (!g[j][i]) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = g[j + dy]?.[i + dx]; if (a) { add.push([i, j]); break; } } add.forEach(([i, j]) => { g[j][i] = c; }); },
    paint: (x, y, px) => { noStroke(); for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (g[j][i]) { fill(g[j][i]); rect(Math.round(x + i * px), Math.round(y + j * px), px + .5, px + .5); } }
  };
}
function vsPixelHero(x, y, px, o = {}) {
  flushBrush();
  const W = 48, H = 64, G = vsPixelGrid(W, H), L = '#23212E';
  const hair = o.hair || '#2D3333', hairHi = o.hairHi || '#58625F', skin = o.skin || '#FFE9D6', skinSh = o.skinSh || '#F2C8AE';
  const iris = o.iris || '#F59A2E', irisLt = o.irisLt || '#FFD27A', cloth = o.cloth || '#2F5DA8', clothSh = o.clothSh || '#244A88', collar = o.collar || '#F4EAD0', band = o.band || '#D2262E';
  const t = o.t ?? 0, bob = Math.round(Math.sin(t * 3) * .5 + .5) * (o.walk ? 1 : 0), blink = Math.abs(Math.sin(t * 1.1)) > .985;
  const cx = 24;
  // legs and shoes
  G.rect(cx - 6, 55 - bob, 4, 6, '#4A3326'); G.rect(cx + 2, 55 - bob, 4, 6, '#4A3326');
  G.rect(cx - 7, 60, 6, 3, '#6B4A32'); G.rect(cx + 1, 60, 6, 3, '#6B4A32');
  // body: tunic with a darker lower half, cream collar V, red sash
  G.rect(cx - 8, 42 - bob, 16, 14, cloth); G.rect(cx - 9, 47 - bob, 18, 9, cloth); G.rect(cx - 9, 52 - bob, 18, 4, clothSh);
  G.tri(cx - 4, 42 - bob, cx + 4, 42 - bob, cx, 49 - bob, collar); G.tri(cx - 5, 42 - bob, cx - 2, 42 - bob, cx + 3, 51 - bob, collar);
  G.rect(cx - 9, 51 - bob, 18, 1, band);
  // arms: left down, right out holding an orange
  G.rect(cx - 12, 43 - bob, 3, 9, cloth); G.rect(cx - 12, 52 - bob, 3, 3, skin);
  G.rect(cx + 9, 43 - bob, 3, 5, cloth); G.rect(cx + 11, 46 - bob, 4, 3, cloth); G.rect(cx + 14, 45 - bob, 3, 4, skin);
  if (o.orange !== false) { G.ellipse(cx + 17, 42 - bob, 3.4, 3.4, '#F28A1E'); G.set(cx + 16, 41 - bob, '#FFD08A'); G.set(cx + 17, 38 - bob, '#3C8A3C'); G.set(cx + 18, 38 - bob, '#3C8A3C'); }
  // head: a wide round face, ears
  G.ellipse(cx, 27 - bob, 16, 14.5, skin); G.rect(cx - 16, 27 - bob, 3, 3, skin); G.rect(cx + 14, 27 - bob, 3, 3, skin);
  // hair cap, crown spikes, side locks and a short parted fringe
  G.ellipse(cx, 16 - bob, 16.5, 10, hair); G.rect(cx - 17, 16 - bob, 34, 6, hair);
  for (const [bx, ty] of [[-13, 2], [-6, -1], [1, -2], [8, 0], [13, 1]]) G.tri(cx + bx - 2.6, 9 - bob, cx + bx + 2.6, 9 - bob, cx + bx + (bx < 0 ? -2 : 2), 2 + ty - bob, hair);
  for (const sx of [-17, 15]) G.rect(cx + sx, 19 - bob, 3, 11, hair);
  for (let k = -3; k <= 3; k++) { const bx = cx + k * 4.6 - 1; G.tri(bx - 2.4, 21 - bob, bx + 2.4, 21 - bob, bx + (k < 0 ? -1 : 1) * 0.5, 25 - bob - (Math.abs(k) % 2), hair); }
  for (const [a, b] of [[-9, 8], [-2, 7], [6, 8]]) { G.set(cx + a, b - bob, hairHi); G.set(cx + a + 1, b + 1 - bob, hairHi); G.set(cx + a + 1, b + 2 - bob, hairHi); }
  // headband with knot and tails
  G.rect(cx - 16, 15 - bob, 32, 3, band); G.rect(cx + 15, 14 - bob, 4, 3, band); G.tri(cx + 16, 15 - bob, cx + 22, 17 - bob, cx + 17, 21 - bob, band); G.tri(cx + 16, 14 - bob, cx + 21, 11 - bob, cx + 18, 16 - bob, band);
  // eyes: dark lid row, orange body, light lower half, white glints
  for (const sx of [-9, 4]) {
    if (blink) { G.rect(cx + sx, 29 - bob, 5, 1, L); continue; }
    G.rect(cx + sx, 25 - bob, 5, 8, iris); G.rect(cx + sx, 25 - bob, 5, 1, L); G.rect(cx + sx, 30 - bob, 5, 3, irisLt); G.set(cx + sx + 1, 26 - bob, '#FFFFFF'); G.set(cx + sx + 1, 27 - bob, '#FFFFFF');
  }
  G.rect(cx - 10, 23 - bob, 6, 1, L); G.rect(cx + 4, 23 - bob, 6, 1, L);               // brows
  G.rect(cx - 12, 35 - bob, 4, 2, '#FF9AA8'); G.rect(cx + 8, 35 - bob, 4, 2, '#FF9AA8'); // blush
  G.rect(cx - 2, 37 - bob, 4, 1, L); G.set(cx - 3, 36 - bob, L); G.set(cx + 2, 36 - bob, L);   // smile
  G.outline(L);
  G.paint(x - W * px / 2, y - H * px, px);
}

// Rem maid chibi, painted from a character-per-pixel bitmap (one letter = one cell, colour looked up in REM_PALETTE), the same
// technique as the removed ccf terminal mascot (naniiluja/ccf, sprite.ts). REM_BODY holds the standing sprite with its default
// eye; a blink stamps a small bitmap over it, so it is one stamp, not a redraw.
const REM_PALETTE = { a: '#7787AF', b: '#F9F9FC', c: '#483B4E', d: '#E78ED9', e: '#A4D1FA', f: '#B89698', g: '#7C6477', h: '#E9D5E1', i: '#C968B9', j: '#95ADD3', k: '#BCFAFD', l: '#85B1E6', m: '#D296CC', n: '#6D698C', o: '#6F88C7', p: '#BEC6FA', q: '#E0BFBA', r: '#AECEEC', s: '#FBE7E0', t: '#B29FB9' };
const REM_BODY = [
  '............aaa......................',
  '...........abbbj.....aaa.............',
  '...........abbbracccabbba............',
  '.....aaa.oajbbbbbgbbbbbbj............',
  '....abbbjobbjjjngggnjbbbrg...........',
  '....lbbbbnjreellllllljjbbgg.aoa......',
  '....ojbrrreeeeellllleeeejnggbbba.....',
  '....abreeeeeeeeeeeeeeeeeelbbbbbo.....',
  '...abjeeeeeeeeeeeeeeeeeeeejbbbba.....',
  '.ajngeereeeeeeeeeeeeeeeeeeelbja......',
  'abbnjekkkeeeeeeeeeeeeeeeeeeebll......',
  'obbjekkkkkeeeeeeeeeeeepeerrellpii....',
  'abaeekkkkkekkeeeeeeeeeiipmdelpiddi...',
  '.aoeeekkkkrkkeeeekeeeeiimddreidjbii..',
  '..leeeeeeeeeeeeeeeeeeedddiipeddiiddi.',
  '.aeeeeeeeeeeeeeeeeerbrmmpiieedpiibdi.',
  '.oeeeeeeeeeeeeeeeeersbppeppepidddiii.',
  '.leeeeeeeeeeeeeeeeeessreeeeeeeimjdi..',
  '.leeeeeeeeeeeeeeeeebjjbreeeelepiddi..',
  'aeeeeeeeeeeeeeeeeersssssreeeleeiiiii.',
  'oeeeeeeeeeeeeeeeeersssssreeelleii.ii.',
  'oeeeeeeeeeeeeeeeeebbaobsreeellpii.md.',
  'leeleeeeeeeeeeeeeesaooaseeeellrii..dm',
  'leeleeeeeeeeeeeeeesboooseeerjlejdm.dd',
  'aeeeleeeeeeleeeeersbllrseerbfleldd.dm',
  '.jeelleeeeellererrsbjlbserbsfleodd.m.',
  '.aeelllrrrrjbsssssssssssrqbfjel.dd...',
  '..leeoofsshssssssssssssssfoaleo.dm...',
  '..aeeoofsssssssssssssssstaolea..m....',
  '...oeooafsssssqffssssssfoolro........',
  '....aoooogtsssssssssqfgaa.oa.........',
  '.....oa.aaagggfffffggtt..............',
  '..........thhthhhhhtthbt.............',
  '..........tbbbgggggbbbbt.............',
  '......ff..tbbbggbggbbbf..............',
  '....fffsf.cthbbbbbbbhtsf.............',
  '....fssqsfcctthtthttgqsgc............',
  '.....fsssfcctbbbbbbhcgggc............',
  '......fffgcccthhhhtgcccccc...........',
  '.......ggggccccccccccbcccgc..........',
  '.......cggcbcccttccccbbccggqf........',
  '........ccbcgggggggggcbcgggssf.......',
  '..........tcgggbbggggcbcggsqf........',
  '.........cbtggbbbbggtbc..fff.........',
  '.........cbtbbbbbbbbtbgc.............',
  '........cgbbtbbbbbbtbbggc............',
  '.......tgggbbhhhhhhbbggggt...........',
  '.......tbgggbbbbbbbbggggbt...........',
  '........tbbgggggggggggbbt............',
  '.........ttbbbbbbbbbbbtt.............',
  '...........thhhttthhht...............',
  '............thht..thht...............',
  '............tbbt..tbbt...............',
  '............tbbt..tbbt...............',
  '.............thg...thg...............',
  '.............ggg...ggg...............',
];
const REM_SHUT_EYE = { x: 19, y: 21, rows: ['ssss', 'ssss', 'ssss', 'ssss', 'nnnn'] };
// (x, y) = middle of the feet, px = cell size in screen px.
function vsPixelRem(x, y, px, o = {}) {
  flushBrush();
  const rows = REM_BODY.map(r => [...r]), H = rows.length, W = rows[0].length;
  if (Math.abs(Math.sin((o.t ?? 0) * 1.1)) > .985) REM_SHUT_EYE.rows.forEach((line, dy) => rows[REM_SHUT_EYE.y + dy].splice(REM_SHUT_EYE.x, line.length, ...line));
  const G = vsPixelGrid(W, H);
  rows.forEach((r, j) => r.forEach((ch, i) => { if (ch !== '.') G.g[j][i] = REM_PALETTE[ch]; }));
  G.paint(x - W * px / 2, y - H * px, px);
}
