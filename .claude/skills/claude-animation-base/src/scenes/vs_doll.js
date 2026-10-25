// vs_doll.js: a modular paper-doll chibi in the style of the "body + shield + helmet + sword = knight" sheet: a plain white body
// (big round head, small capsule torso, stub legs, black shoes) and equipment pieces on top, each with its own thick dark outline
// and one flat shade. Units: the bare body is 155 units tall, origin between the feet, y up is negative. Vertices boil slightly.
//   vsDoll(x, y, s, { t, parts: ['shield', 'helmet', 'sword'], hop })   (x, y) = between the feet, s = bare body height in px.
// Parts are drawn in the order given; back: true goes behind the body, mid: true between the torso and the head (clothes).
const DOLL = { ink: '#1E1E1E', white: '#FFFFFF', shade: '#D6D6D6', metal: '#B7BCC0', metalLt: '#E2E5E7', metalDk: '#8C9298',
  gold: '#E8B23A', grip: '#7A4B22', red: '#E0393A', shadow: '#B9B3AA',
  hair: '#2A2A2E', band: '#D23B2E', bandDk: '#A82A22', tunic: '#3A63A8', tunicDk: '#2E5190', cream: '#F1E7CF', pants: '#6B4A2F', wood: '#8A5A2B', flag: '#C8322A' };
const dollArc = (cx, cy, rx, ry, a0, a1, n = 24) => { const p = []; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; p.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); } return p; };
const dollEll = (cx, cy, rx, ry = rx) => dollArc(cx, cy, rx, ry, 0, TAU, 28).slice(0, -1);
const dollRR = (x, y, w, h, r) => [...dollArc(x + w - r, y + r, r, r, -Math.PI / 2, 0, 5), ...dollArc(x + w - r, y + h - r, r, r, 0, Math.PI / 2, 5),
  ...dollArc(x + r, y + h - r, r, r, Math.PI / 2, Math.PI, 5), ...dollArc(x + r, y + r, r, r, Math.PI, 1.5 * Math.PI, 5)];
// a pen in doll units: shape() fills with the thick outline, line() is a round-capped stroke; rot() turns what follows about a point
function dollPen(x0, y0, k, ow = 4.5 * k) {
  let r = 0, ox = 0, oy = 0;
  const map = ([x, y]) => { const c = Math.cos(r), s = Math.sin(r), X = x - ox, Y = y - oy; return [x0 + (ox + X * c - Y * s) * k + jit(.5), y0 + (oy + X * s + Y * c) * k + jit(.5)]; };
  return {
    k, ow,
    rot(a = 0, px = 0, py = 0) { r = a; ox = px; oy = py; },
    shape(pts, col, ink = true) { fill(col); if (ink) { stroke(DOLL.ink); strokeWeight(ow); strokeJoin(ROUND); } else noStroke(); beginShape(); for (const p of pts) vertex(...map(p)); endShape(CLOSE); },
    line(pts, col, w) { noFill(); stroke(col); strokeWeight(w * k); strokeCap(ROUND); strokeJoin(ROUND); beginShape(); for (const p of pts) vertex(...map(p)); endShape(); }
  };
}
// lift = [left, right] foot lift in units (walking); barefoot paints the feet white instead of the black shoes
function dollBody(D, lift = [0, 0], barefoot = false) {
  [-18, 10].forEach((lx, i) => D.shape(dollRR(lx, -28 - lift[i], 9, 26, 4), DOLL.white));
  D.shape(dollRR(-25, -6 - lift[0], 17, 7, 3.5), barefoot ? DOLL.white : DOLL.ink); D.shape(dollRR(3, -6 - lift[1], 17, 7, 3.5), barefoot ? DOLL.white : DOLL.ink);
  D.shape(dollRR(-30, -72, 60, 50, 15), DOLL.white);
  D.shape(dollRR(-26, -64, 8, 36, 4), DOLL.shade, false);
}
function dollHead(D) {
  D.shape(dollEll(0, -106, 49), DOLL.white);
  D.line(dollArc(0, -106, 39, 39, 2.75, 3.45, 8), DOLL.shade, 6);
}
function dollShield(D) {
  D.shape(dollEll(-67, -58, 6, 7), DOLL.metal);
  D.shape([...dollArc(-36, -58, 30, 40, Math.PI / 2, 1.5 * Math.PI, 16), ...dollArc(-36, -58, 12, 40, -Math.PI / 2, -1.5 * Math.PI, 12)], DOLL.metal);
  D.line(dollArc(-36, -58, 23, 31, 2.3, 3.9, 10), DOLL.metalLt, 5);
}
function dollHelmet(D) {
  D.shape([[12, -144], [27, -170], [35, -141]], DOLL.metal);
  D.shape([...dollArc(0, -104, 56, 48, Math.PI, 2 * Math.PI, 28), ...dollArc(0, -104, 56, 10, 0, Math.PI, 14)], DOLL.metal);
  D.line(dollArc(0, -104, 49, 7, .25, Math.PI - .25, 12), DOLL.metalDk, 5);
  D.line(dollArc(0, -110, 40, 33, 3.55, 4.45, 8), DOLL.metalLt, 6);
  for (const x of [-38, -28, -18, -8]) D.line([[x, -114], [x + 1, -101]], DOLL.ink, 3.2);
  D.shape(dollEll(50, -101, 10), DOLL.metalLt); D.shape(dollEll(50, -101, 5.5), DOLL.red);
}
// held at the right hand (38, -26); a = lean from vertical, radians
function dollSword(D, a = .35, viet = false) {
  D.rot(a, 38, -26);
  D.shape([[32, -40], [44, -40], [44, -140], [38, -156], [32, -140]], DOLL.metal);
  D.shape([[32, -40], [38, -40], [38, -150], [32, -140]], DOLL.metalLt, false);
  if (viet) D.shape(dollEll(38, -41, 11, 5), DOLL.gold); else D.shape(dollRR(23, -44, 30, 8, 4), DOLL.gold);
  D.shape(dollRR(34, -36, 8, 22, 3), viet ? DOLL.band : DOLL.grip);
  D.shape(dollEll(38, -12, 6), DOLL.gold);
  D.rot(0);
  D.shape(dollEll(38, -27, 9), DOLL.white);
}
// Tran Quoc Toan: short black hair under a red headband whose two tails stream behind
function dollKhan(D, c) {
  const w = 4 * Math.sin(c.t * 7), w2 = 4 * Math.sin(c.t * 7 + 1.3);
  D.shape([[44, -119], [70, -128 + w], [86, -121 + w], [72, -115 + w * .6], [46, -111]], DOLL.band);
  D.shape([[44, -114], [64, -108 + w2], [80, -99 + w2], [66, -98 + w2 * .6], [44, -106]], DOLL.bandDk);
  // three soft fringe locks peeking under the band, then the cap of hair above it
  for (const [lx, ly] of [[-30, -108], [-13, -106], [5, -108]]) D.shape(dollEll(lx, ly, 8, 6), DOLL.hair);
  D.shape([...dollArc(0, -106, 50, 50, Math.PI + .28, 2 * Math.PI - .28, 22), [40, -116], [-40, -116]], DOLL.hair);
  D.line(dollArc(0, -108, 40, 40, 3.85, 4.4, 8), '#4A4A52', 5);
  D.shape([...dollArc(0, -122, 51, 7, Math.PI, 0, 14), ...dollArc(0, -112, 52, 8, 0, Math.PI, 14)], DOLL.band);
  D.shape(dollEll(47, -115, 7, 8), DOLL.bandDk);
}
// giao linh tunic: right lapel crossed over to the left side, red sash, cream hem; brown trousers under it
function dollAo(D) {
  for (const lx of [-18, 10]) D.shape(dollRR(lx - 1, -20, 11, 15, 4), DOLL.pants);
  D.shape([[-29, -74], [29, -74], [31, -46], [36, -26], [42, -14], [40, -11], [-40, -11], [-42, -14], [-36, -26], [-31, -46]], DOLL.tunic);
  D.shape([[-31, -44], [-25, -44], [-26, -18], [-36, -18]], DOLL.tunicDk, false);
  D.shape([[-37, -20], [37, -20], [42, -14], [40, -11], [-40, -11], [-42, -14]], DOLL.cream);
  D.shape([[-9, -74], [2, -74], [26, -46], [16, -46]], DOLL.cream);
  D.shape([[2, -74], [12, -74], [2, -62]], DOLL.cream);
  D.shape([[-32, -42], [32, -42], [32, -35], [-32, -35]], DOLL.band);
  D.shape([[6, -36], [12, -36], [14, -20], [8, -21]], DOLL.bandDk);
}
// embroidered war flag: wooden pole with a bronze tip held in the left hand, red cloth with a gold border rippling outward
function dollFlag(D, c) {
  const top = [], bot = [];
  for (let i = 0; i <= 10; i++) { const u = i / 10, wv = 6 * Math.sin(c.t * 6 - u * 5) * u; top.push([-46 - u * 82, -214 + u * 6 + wv]); bot.push([-46 - u * 78, -160 - u * 4 + wv]); }
  D.shape([...top, ...bot.reverse()], DOLL.flag);
  const inset = (p, q, k) => p.map(([x, y], i) => [x + (q[i][0] - x) * k, y + (q[i][1] - y) * k]);
  const bot2 = bot.slice().reverse();
  D.line(inset(top, bot2, .14).slice(1, -1), DOLL.gold, 3.5); D.line(inset(bot2, top, .14).slice(1, -1), DOLL.gold, 3.5);
  const m = 5, cx = (top[m][0] + bot2[m][0]) / 2, cy = (top[m][1] + bot2[m][1]) / 2;
  D.shape([[cx, cy - 14], [cx + 12, cy], [cx, cy + 14], [cx - 12, cy]], DOLL.gold);
  D.shape([[-46, -232], [-41, -214], [-51, -214]], DOLL.gold);
  D.shape(dollRR(-50, -216, 8, 212, 4), DOLL.wood);
  D.shape(dollEll(-44, -42, 9), DOLL.white);
}
const DOLL_PARTS = {
  shield: { back: true, draw: dollShield }, helmet: { draw: dollHelmet }, sword: { draw: (D, c) => dollSword(D, c.sway) },
  khan: { draw: dollKhan }, ao: { mid: true, draw: dollAo }, flag: { draw: dollFlag }, kiem: { draw: (D, c) => dollSword(D, c.sway, true) }
};
function vsDoll(x, y, s, o = {}) {
  flushBrush();
  const t = o.t ?? 0, k = s / 155, parts = o.parts || [];
  const hop = o.hop === false ? 0 : 14 * Math.abs(Math.sin(Math.PI * t / .6)), sway = .35 + .12 * Math.sin(TAU * t / 1.2);
  push(); noStroke(); fill(DOLL.shadow); ellipse(x, y + 2 * k, 150 * k * (1 - hop / 45), 22 * k * (1 - hop / 45)); pop();
  const D = dollPen(x, y - hop * k, k), c = { t, sway };
  for (const p of parts) if (DOLL_PARTS[p].back) DOLL_PARTS[p].draw(D, c);
  dollBody(D);
  for (const p of parts) if (DOLL_PARTS[p].mid) DOLL_PARTS[p].draw(D, c);
  dollHead(D);
  for (const p of parts) if (!DOLL_PARTS[p].back && !DOLL_PARTS[p].mid) DOLL_PARTS[p].draw(D, c);
}
// the parts on their own, for a model sheet: each piece shifted so it sits centred on (x, y)
function vsDollPart(name, x, y, s, t = 0) {
  flushBrush();
  const k = s / 155, ctr = { body: [0, -78], shield: [-50, -58], helmet: [5, -125], sword: [48, -88], kiem: [48, -88], khan: [18, -112], ao: [0, -44], flag: [-84, -118] }[name];
  const D = dollPen(x - ctr[0] * k, y - ctr[1] * k, k);
  if (name === 'body') { dollBody(D); dollHead(D); } else DOLL_PARTS[name].draw(D, { t, sway: .35 });
}
