// vs_dolladapt.js: switches the whole "Việt sử" video to the paper-doll look without touching the 91 scenes. It replaces the
// people (nguoi, vsMini and so the crowds and armies built on it) and the props drawn in the old Đông Hồ brush (drums, stakes,
// canoes, war junks, dragon boats) with paper-doll versions taking the SAME arguments. Load after every file it replaces.
// A nguoi() figure is ~9.05u tall; the doll's head is wider than the folk-print head, so the doll is drawn a little shorter (8.4u)
// to keep figures the scenes placed side by side from colliding: 1 doll unit = 8.4u / 155. The arm geometry is nguoi's own
// (shoulder ±1.65u at -4.15u, arm 2.2u, angle 0 = hanging, 1.57 = out, 3.14 = up), so every pose a scene asks for still lands.
const DA = { K: 8.4 / 155, SH: 28, SY: -71, LEN: 37.7, HEAD: [0, -106], HEADR: 49 };
const DA_DOLL_ITEMS = new Set(['spear', 'staff', 'sheaf', 'axe', 'torch', 'scroll', 'rifle', 'sword']);
// where a nguoi() hand is, in doll units of the figure's own (unflipped) frame
function daHand(side, a) {
  let hx = side * DA.SH + side * DA.LEN * Math.sin(a), hy = DA.SY + DA.LEN * Math.cos(a);
  const dx = hx - DA.HEAD[0], dy = hy - DA.HEAD[1], d = Math.hypot(dx, dy), out = DA.HEADR + 11;
  if (d < out) { const f = out / (d || 1); hx = DA.HEAD[0] + dx * f; hy = DA.HEAD[1] + dy * f; }   // a raised hand goes around the head, not over the face
  return [hx, hy];
}
// The screen point of a nguoi() figure's hand (side -1 = left, 1 = right), for anything that leaves the hand: seeds, sparks, a thrown claw.
function nguoiHand(x, y, u, o = {}, side = 1) {
  if (o.who) o = { ...CAST[o.who], ...o };
  const a = side < 0 ? (o.aL ?? .12) : (o.aR ?? .12), [hx, hy] = daHand(side, a), k = DA.K * u, sq = o.sq || 0;
  return [x + (o.dx || 0) * u + (o.flip ? -1 : 1) * (o.sx ?? 1) * (1 + sq * .5) * hx * k, y + (o.dy || 0) * u + (o.sy ?? 1) * (1 - sq) * hy * k];
}
// an arm: a round-ended sleeve from the shoulder to the hand, outlined like everything else (the doll has hands, so once a hand
// leaves the body it needs an arm, or it floats)
function daArm(D, p0, p1, col, w = 15) {
  const ang = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]), r = w / 2, pts = [];
  for (let i = 0; i <= 8; i++) { const g = ang + Math.PI / 2 - i / 8 * Math.PI; pts.push([p1[0] + Math.cos(g) * r, p1[1] + Math.sin(g) * r]); }
  for (let i = 0; i <= 8; i++) { const g = ang - Math.PI / 2 - i / 8 * Math.PI; pts.push([p0[0] + Math.cos(g) * r, p0[1] + Math.sin(g) * r]); }
  D.shape(pts, col);
}
// a held thing drawn at a doll hand: the doll versions are authored for the right hand at (38, -27)
function daItem(D, kind, hold, hx, hy, side, k, c) {
  push(); translate(hx * k, hy * k); if (side < 0) scale(-1, 1);
  const P = dollPen(-38 * k, 27 * k, k, D.ow);
  if (kind === 'sword') dollSword(P, c.sway, true); else dcItem(P, kind, c);
  pop();
}
// full-draw bow pointing +x at chest height, grip on the point vsNguoiBow() reports (92, -60 units), so arrows really leave the bow
function daBow(D, gx, gy, o = {}) {
  const nx = gx - 70, top = [gx - 16, gy - 74], bot = [gx - 16, gy + 74];
  D.line([top, [gx - 3, gy - 40], [gx, gy], [gx - 3, gy + 40], bot], DP.woodDk, 9); D.line([top, [gx - 3, gy - 40], [gx, gy], [gx - 3, gy + 40], bot], DP.woodLt, 4);
  D.line([top, [nx, gy], bot], '#8C8378', 2);
  if (o.nock ?? true) { D.line([[nx, gy], [gx + 6, gy]], DP.woodLt, 4); D.shape([[gx + 18, gy], [gx + 5, gy - 5], [gx + 5, gy + 5]], DP.bronze); for (const sy of [-1, 1]) D.shape([[nx, gy], [nx - 9, gy + sy * 7], [nx - 15, gy + sy * 7], [nx - 7, gy]], DP.red); }
  D.shape(dollEll(gx, gy, 9), DOLL.white); D.shape(dollEll(nx, gy, 9), DOLL.white);
}
function daCrossbow(D, gx, gy, o = {}) {
  D.shape(dollRR(gx - 78, gy + 2, 84, 12, 5), DP.wood);
  D.line([[gx - 6, gy - 30], [gx + 2, gy - 12], [gx + 4, gy + 8], [gx + 2, gy + 28], [gx - 6, gy + 44]], DP.woodDk, 8); D.line([[gx - 6, gy - 30], [gx + 2, gy - 12], [gx + 4, gy + 8], [gx + 2, gy + 28], [gx - 6, gy + 44]], DP.woodLt, 3.5);
  D.line([[gx - 6, gy - 30], [gx - 60, gy + 6], [gx - 6, gy + 44]], '#8C8378', 1.6);
  D.shape([[gx - 58, gy + 14], [gx - 44, gy + 14], [gx - 42, gy + 28], [gx - 50, gy + 34], [gx - 54, gy + 26]], DP.bronze);
  if (o.nock ?? true) { D.line([[gx - 60, gy], [gx + 8, gy]], DP.woodLt, 4); D.shape([[gx + 20, gy], [gx + 8, gy - 5], [gx + 8, gy + 5]], DP.bronze); }
  D.shape(dollEll(gx - 50, gy + 22, 9), DOLL.white); D.shape(dollEll(gx - 22, gy + 16, 9), DOLL.white);
}
function daNguoi(x, y, u, o = {}) {
  if (o.who) o = { ...CAST[o.who], ...o };
  const t = o.t ?? T, k = DA.K * u, sq = o.sq || 0, who = o.who || '';
  const ow = clamp(4.5 * k, 2.2, 8), c = { t, sway: .35 + .08 * Math.sin(TAU * t / 1.4 + (o.seed || 0)) };
  const C = { ...o, outfit: { kind: 'robe', col: DH.indigo, col2: DH.yellow, ...(o.outfit || {}) } };
  // A faceless doll acts with its whole body (the guide's "alive" rule): an idle bounce on the film's beat, each figure a
  // little off the others so a crowd never bobs in unison; shouting hops on the beat with a squash; a surprised 'o' rears
  // up and stretches; talking nods on the eighth notes; it leans a little toward where it looks.
  const seed = o.seed ?? hash(x * .013 + y * .007) * 6, ph = t + seed * .11, m = o.mouth;
  let act = 0, actSq = 0;
  if (!o.still) {
    if (m === 'shout' || m === 'open') { const p = pulse(ph, 5); act = 7 * p; actSq = -.07 * p + .05 * pulse(ph - .08, 9); }
    else if (m === 'o') { act = 3 + Math.sin(t * 9 + seed) * .6; actSq = -.06; }
    else if (m === 'talk' || o.talk != null) act = 2.2 * pulse2(ph, 7);
    else if (m === 'sad') actSq = .05;
  }
  const bob = o.still ? 0 : Math.abs(Math.sin(Math.PI * bpOf(ph))) * 1.6 + act + (o.walk != null ? Math.abs(Math.sin(o.walk * TAU)) * 3 : 0);
  const lift = o.walk == null ? [0, 0] : [0, .5].map(p => Math.max(0, Math.sin((o.walk + p) * TAU)) * 9);
  flushBrush();
  if (!o.noShadow) { const f = 1 - Math.min(.5, Math.abs(o.dy || 0) * .06); push(); noStroke(); fill(DOLL.shadow); ellipse(x + (o.dx || 0) * u, y + 2 * k, 150 * k * f, 22 * k * f); pop(); }
  push();
  translate(x + (o.dx || 0) * u, y + (o.dy || 0) * u - bob * k);
  if (o.rot || o.lookX) rotate((o.rot || 0) + (o.flip ? -1 : 1) * (o.lookX || 0) * .045);
  const sq2 = sq + actSq;
  scale((o.flip ? -1 : 1) * (o.sx ?? 1) * (1 + sq2 * .5), (o.sy ?? 1) * (1 - sq2));
  const D = dollPen(0, 0, k, ow), hairCol = C.hair === 'white' ? DC.grey : DC.hair, qt = who === 'quocToan';
  dcHair(D, C.hair, hairCol, true);
  dollBody(D, lift, C.barefoot);
  if (qt) dollAo(D); else dcOutfit(D, C.outfit, who);
  const sleeve = qt ? DOLL.tunic : ['fur', 'bare'].includes(C.outfit.kind) ? DOLL.white : C.outfit.col;
  const holdOf = h => (h && typeof h === 'object') ? h.k : h, kR = holdOf(o.holdR), kL = holdOf(o.holdL);
  const shooting = [kR, kL].includes('bowdrawn') ? 'bow' : [kR, kL].includes('crossbowaim') ? 'crossbow' : null;
  const handsAt = shooting === 'bow' ? [[22, -60], [92, -60]] : shooting === 'crossbow' ? [[42, -38], [70, -44]] : [daHand(-1, o.aL ?? .12), daHand(1, o.aR ?? .12)];
  daArm(D, [-24, -64], handsAt[0], sleeve); daArm(D, [24, -64], handsAt[1], sleeve);
  dollHead(D);
  if (qt) dollKhan(D, c); else { dcHair(D, C.hair, hairCol, false); dcBeard(D, C.beard, hairCol); if (C.hat) dcHat(D, C.hat, C.hatCol, { ...c, star: who === 'giap' }); }
  if (kR === 'bowdrawn' || kL === 'bowdrawn') daBow(D, 92, -60, typeof o.holdR === 'object' ? o.holdR : {});
  else if (kR === 'crossbowaim' || kL === 'crossbowaim') daCrossbow(D, 92, -60, typeof o.holdR === 'object' ? o.holdR : {});
  else for (const [side, a, hold] of [[-1, o.aL ?? .12, o.holdL], [1, o.aR ?? .12, o.holdR]]) {
    const kind = holdOf(hold), [hx, hy] = daHand(side, a);
    if (kind && DA_DOLL_ITEMS.has(kind)) daItem(D, kind, hold, hx, hy, side, k, c);
    else if (kind) item(kind, hx * k, hy * k, u, clamp(u / 15, .45, 2.4), typeof hold === 'string' ? { t } : { t, ...hold });
    if (!kind || !DA_DOLL_ITEMS.has(kind)) { flushBrush(); D.shape(dollEll(hx, hy, 9), DOLL.white); }
  }
  pop();
}
// a doll head on its own (a sleeper on a pillow, a diver's head above the water): (x, y) = head centre, r = head radius in px.
// o.talk > 0 wags the beard, the faceless doll's way of speaking.
function vsDollHeadAt(x, y, r, o = {}) {
  flushBrush();
  const k = r / DA.HEADR, col = o.hair === 'white' ? DC.grey : DC.hair, D = dollPen(x, y + 106 * k + (o.talk ? Math.sin(o.talk * 9) * 1.5 * k : 0), k, clamp(4.5 * k, 2, 7));
  dollHead(D); dcHair(D, o.hair || 'short', col, false);
  if (o.beard) { const B = dollPen(x, y + 106 * k + (o.talk ? Math.abs(Math.sin(o.talk * 9)) * 4 * k : 0), k, clamp(4.5 * k, 2, 7)); dcBeard(B, o.beard, col); }
}
// --- crowds: vsMini becomes a small doll. Its bow grip (for vsMiniBow) sits at (96, -78) doll units ahead of the body.
const DA_MINI = 5.4 / 155;
function daMini(x, y, u, o = {}) {
  const t = o.t ?? T, k = DA_MINI * u, dir = o.dir ?? 1, cheer = o.cheer ?? 0;
  const hop = (o.bob ?? 1) * Math.abs(Math.sin(t * 5 + (o.ph || 0))) * 7 * (o.moving ? 1 : 0);
  const hatMap = { nonla: 'nonla', helmet: 'helmet', mucoi: 'mucoi', feather: 'feather' }, col = o.col || DH.indigo;
  const C = { hair: 'short', hat: hatMap[o.hat], hatCol: o.hat === 'helmet' ? DH.greyDk : undefined, outfit: { kind: 'tunic', col, col2: o.trim || dcDark(col), pants: o.pants || DH.brownDk } };
  flushBrush();
  push(); noStroke(); fill(DOLL.shadow); ellipse(x, y + 2 * k, 130 * k, 20 * k); pop();
  push(); translate(x, y - hop * k); scale(dir, 1);
  const D = dollPen(0, 0, k, clamp(4.5 * k, 1.4, 5)), c = { t, sway: .3 };
  const hold = o.hold && o.hold !== 'none' ? o.hold : null, up = cheer, aR = hold ? .5 : .3 + up * 2.6, aL = .3 + up * 2.6;
  dollBody(D); dcOutfit(D, C.outfit, '');
  const hands = hold === 'bow' ? [[26, -78], [96, -78]] : hold === 'crossbow' ? [[46, -56], [74, -62]] : [daHand(-1, aL), daHand(1, aR)];
  daArm(D, [-24, -64], hands[0], col, 18); daArm(D, [24, -64], hands[1], col, 18);
  dollHead(D); dcHair(D, 'short', DC.hair, false); if (C.hat) dcHat(D, C.hat, C.hatCol, c);
  if (hold === 'bow') daBow(D, 96, -78, { nock: o.nock ?? true });
  else if (hold === 'crossbow') daCrossbow(D, 96, -78, { nock: o.nock ?? true });
  else {
    for (const [side, a] of [[-1, aL], [1, aR]]) {
      const [hx, hy] = daHand(side, a);
      if (side > 0 && hold === 'flag') {
        D.line([[hx, hy + 30], [hx, hy - 150]], DP.woodDk, 7); D.line([[hx, hy + 30], [hx, hy - 150]], DP.wood, 3);
        const w = 6 * Math.sin(t * 6 + (o.ph || 0)), cloth = [[hx, hy - 150], [hx + 80, hy - 142 + w], [hx + 80, hy - 96 + w], [hx, hy - 100]];
        D.shape(cloth, o.flag || DH.red);
        if (o.flagStar) D.shape(starPts(hx + 40, hy - 121 + w * .5, 14, .4, 5), DH.yellow, false);
      } else if (side > 0 && hold === 'bundle') D.shape(dollEll(hx + 4, hy + 14, 16, 12), DP.straw);
      else if (side > 0 && hold && DA_DOLL_ITEMS.has(hold)) daItem(D, hold, hold, hx, hy, 1, k, c);
      if (!(side > 0 && hold && DA_DOLL_ITEMS.has(hold))) D.shape(dollEll(hx, hy, 10), DOLL.white);
    }
  }
  pop();
}
// --- props, same signatures as the brush versions in vs_things.js
function daDrumTop(x, y, r, o = {}) { dpDrumTop(x, y, 2 * r, { rot: o.rot }); if (o.glow) glow(x, y, r * 1.6, '#FFD27A', o.glow * .7); }
function daDrumSide(x, y, s, o = {}) { dpDrumSide(x, y, s, { hi: o.hiBoats }); }
function daStakes(x0, x1, y, n, o = {}) {
  flushBrush();
  const show = o.show ?? 1, h = o.h ?? 190;
  for (let i = 0; i < n; i++) {
    const x = lerp(x0, x1, n === 1 ? .5 : i / (n - 1)), lean = (hash(i) - .5) * .12, yy = y + (i % 2) * 12, hh = h * (.85 + hash(i + 3) * .3) * show;
    if (hh < 4) continue;
    const D = dollPen(x, yy, 1, 5);
    D.shape([[-11, 0], [11, 0], [8 + lean * hh, -hh], [lean * hh, -hh - 28], [-8 + lean * hh, -hh]], DP.wood);
    D.line([[-7 + lean * hh * .9, -hh * .9], [7 + lean * hh * .9, -hh * .9]], DP.woodDk, 3);
  }
}
function daCanoe(x, y, s, o = {}) {
  push(); translate(x, 0); scale(o.dir ?? 1, 1); translate(-x, 0);
  dpCanoe(x, y, s, { t: (o.t ?? T) + (o.ph || 0), col: o.col, crew: o.crew }); pop();
}
// a war junk in a side's colours (hull, sail, shields, flag), facing dir, tilting as it founders; two small crew
function daWarship(x, y, s, o = {}) {
  const t = o.t ?? T, bob = Math.sin(t * 1.6 + (o.ph || 0)) * 4, k = s / 275;
  flushBrush();
  push(); translate(x, y + bob); if (o.tilt) rotate(o.tilt); scale(o.dir ?? 1, 1);
  const D = dollPen(0, 0, k, dpOW), hull = o.col || DH.brownDk, sail = o.sail || '#E6D6A8';
  D.line([[10, -60], [10, -250]], DP.woodDk, 6);
  D.shape([[16, -244], [120, -226 + 6 * Math.sin(t * 3)], [114, -86], [16, -76]], sail);
  for (let q = 1; q < 5; q++) D.line([[16, -244 + q * 34], [118, -226 + q * 30]], dcDark(sail, .7), 3);
  D.shape([[6, -250], [-34, -258 + 5 * Math.sin(t * 6)], [-50, -236], [6, -232]], o.flag || DH.red);
  // crew inside the boat's own frame, before the hull, so the gunwale hides their legs and they tilt with it
  for (const cx of [-40, 60]) daMini(cx * k, -36 * k, k * 15, { col: o.shield || DH.red, hat: 'helmet', hold: 'spear', t, ph: cx });
  D.shape([[-150, -84], [-96, -84], [-90, -50], [120, -50], [160, -86], [138, 0], [-124, 0], [-156, -50]], hull);
  for (let i = 0; i < 7; i++) D.shape(dollEll(-70 + i * 30, -30, 10), o.shield || DH.red);
  pop();
  flushBrush();
  const DW = dollPen(x, y, k, dpOW); vsDollWater(DW, t);
}
function daDragonBoat(x, y, s, o = {}) {
  const t = o.t ?? T, bob = Math.sin(t * 1.8) * 3, k = s / 260;
  flushBrush();
  push(); translate(x, y + bob); scale(o.dir ?? 1, 1);
  const D = dollPen(0, 0, k, dpOW);
  for (let i = 0; i < 6; i++) { const ox = -90 + i * 32, sw = 8 * Math.sin(t * 4 + i); D.line([[ox, -30], [ox - 16 + sw, 12]], DP.woodDk, 5); }
  D.shape([[-130, -52], [-104, -10], [96, -10], [140, -60], [104, -40], [-100, -40]], '#E7B232');
  D.shape([[-130, -52], [-152, -78], [-136, -60]], DH.red);
  D.shape([[132, -52], [150, -96], [176, -104], [184, -88], [164, -84], [150, -60]], DH.red);
  D.shape(dollEll(170, -96, 3), DP.ink, false);
  D.shape(dollRR(-30, -96, 64, 58, 6), DH.red);
  D.shape([[-46, -96], [2, -124], [50, -96]], '#E7B232');
  pop();
  flushBrush();
  vsDollWater(dollPen(x, y, k, dpOW), t);
}
if (!location.search.includes('brushcast')) {
  nguoi = daNguoi; vsMini = daMini;
  vsNguoiBow = (x, y, u, flip) => [x + (flip ? -1 : 1) * 92 * DA.K * u, y - 60 * DA.K * u];
  vsMiniBow = (x, y, u, dir) => [x + dir * 96 * DA_MINI * u, y - 78 * DA_MINI * u];
  vsDrumTop = daDrumTop; vsDrumSide = daDrumSide; vsStakes = daStakes; vsCanoe = daCanoe; vsWarship = daWarship; vsDragonBoat = daDragonBoat;
}

// ---------- depth: nearer things cover farther ones ----------
// Scenes call people and boats in whatever order they were written, so a big figure called after a crowd standing in front
// of it painted over that crowd. Actors are now queued and painted farthest first (smallest ground y), and the queue is
// flushed before anything else draws (scenery, water, fire, arrows) or the transform changes (a falling soldier, the camera),
// so only runs of actors are reordered and everything a scene layered on purpose keeps its order.
const DEPTH = { q: [], busy: 0, depth: 0, at: 0 };
function depthFlush() {
  if (!DEPTH.q.length || DEPTH.busy) return;
  const q = DEPTH.q; DEPTH.q = [];
  q.sort((a, b) => a.y - b.y || a.n - b.n);
  DEPTH.busy++; try { for (const a of q) a.fn(); } finally { DEPTH.busy--; }
}
function depthActor(fn, yOf) {
  return function (...args) {
    if (DEPTH.busy) return fn.apply(this, args);
    if (DEPTH.q.length && DEPTH.at !== DEPTH.depth) depthFlush();
    DEPTH.at = DEPTH.depth;
    DEPTH.q.push({ y: yOf(...args), n: DEPTH.q.length, fn: () => fn.apply(this, args) });
  };
}
// p5 2.x binds its global functions from p5.prototype when the sketch starts and makes them read-only on window, so the
// p5 hooks go on the prototype (this file loads before that binding); engine helpers are plain globals and are wrapped directly.
function depthInstall() {
  const before = f => function (...a) { if (!DEPTH.busy) depthFlush(); return f.apply(this, a); };
  const proto = p5.prototype, P = proto.push, Q = proto.pop;
  proto.push = function (...a) { if (!DEPTH.busy) depthFlush(); DEPTH.depth++; return P.apply(this, a); };
  proto.pop = function (...a) { if (!DEPTH.busy) depthFlush(); DEPTH.depth--; return Q.apply(this, a); };
  for (const n of ['translate', 'rotate', 'scale', 'resetMatrix', 'applyMatrix', 'rect', 'ellipse', 'circle', 'line', 'triangle', 'quad', 'arc', 'beginShape', 'image', 'text']) if (typeof proto[n] === 'function') proto[n] = before(proto[n]);
  paint = before(paint); inkLine = before(inkLine); glow = before(glow); flushBrush = before(flushBrush);
  for (const n of ['polygon', 'spline', 'line', 'rect', 'circle', 'beginShape']) if (typeof brush[n] === 'function') brush[n] = before(brush[n]);
}
if (!location.search.includes('brushcast')) {
  nguoi = depthActor(nguoi, (x, y) => y); vsMini = depthActor(vsMini, (x, y) => y);
  vsCanoe = depthActor(vsCanoe, (x, y) => y); vsWarship = depthActor(vsWarship, (x, y) => y); vsDragonBoat = depthActor(vsDragonBoat, (x, y) => y);
  depthInstall();
}
