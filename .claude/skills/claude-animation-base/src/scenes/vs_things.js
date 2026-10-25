// vs_things.js: drums, stakes, boats, machines, flags and other props for "Việt sử". (x, y) is usually the base on the ground
// (or the waterline for boats). `dir` = -1 mirrors a thing to face left. Flat Đông Hồ colour under brush ink.

// Draw `fn` mirrored around x when dir < 0.
function vsFlip(x, dir, fn) { if (dir >= 0) { fn(); return; } push(); translate(x, 0); scale(-1, 1); translate(-x, 0); fn(); pop(); }

const BRONZE = '#B88A3E', PATINA = '#7E9A62';

// ---------- the bronze drum ----------
function vsBirdGlyph(x, y, s, rot = 0) {   // the long-legged bird flying round the drum
  push(); translate(x, y); rotate(rot);
  paint([[-s, 0], [-s * .3, -s * .28], [s * .5, -s * .1], [s, -s * .32], [s * .55, s * .02], [s * .1, s * .14]], { wash: DH.ink, washOp: 255, curv: .4, ink: null });
  inkLine([[-s * .2, s * .05], [-s * .9, s * .5]], 1.4, DH.ink, 'inkfine', 0);
  pop();
}
// Face of the Đông Sơn drum (Ngọc Lũ type): a 14-ray sun-star with feather triangles between the rays, then 16 concentric
// bands: dot rows, tangent-circle rows, zigzag, sawtooth, and three wide bands (feathered dancers and two houses; two
// herds of 10 deer with flocks of 6 and 8 birds; 36 birds, standing and flying). Everything moves counter-clockwise.
// rot spins the pattern, hiFigs / hiBirds pulse a red ring round the dancers / the 36 birds. Drawn with plain p5 shapes
// after flushBrush (hundreds of tiny marks), over a brush-painted bronze disc.
function vsDrumTop(x, y, r, o = {}) {
  boilSeed(`drumtop ${o.key ?? 0}`);
  const rot = o.rot || 0, col = o.col || BRONZE, ink = color(DH.ink), dk = mixCol(col, DH.ink, .55);
  glow(x, y, r * 1.8, '#FFD27A', (o.glow ?? .5));
  paint(ellPts(x, y, r, r, 40, 1), { wash: col, washOp: 255, fill: PATINA, fillOp: 70, bleed: .3, tex: .7, ink: DH.ink, sw: 2.4 });
  paint(ellPts(x, y, r * .965, r * .965, 40), { ink: DH.ink, sw: 1.2, fill: null });
  if (r < 90) {   // a small drum: the rings would be mush, draw just the star and a few rings
    for (const k of [.8, .55, .3]) paint(ellPts(x, y, r * k, r * k, 28), { ink: DH.ink, sw: .9, fill: null });
    paint(starPts(x, y, r * .3, .5, 14, rot), { wash: DH.gold, washOp: 255, ink: DH.ink, sw: 1.1 });
    return;
  }
  flushBrush();
  push(); translate(x, y); rotate(rot);
  const L = (a, rr) => [Math.cos(a) * rr, Math.sin(a) * rr];
  const ring = (rr, w = 1.1, c = ink) => { noFill(); stroke(c); strokeWeight(w); circle(0, 0, rr * 2); };
  const dots = (rr, n, d) => { noStroke(); fill(ink); for (let i = 0; i < n; i++) { const [px, py] = L(i / n * TAU, rr); circle(px, py, d); } };
  const tangents = (r0, r1, n) => {   // little circles with a dot in the middle, joined by tangent lines
    const rm = (r0 + r1) / 2, rad = (r1 - r0) * .42; noFill(); stroke(ink); strokeWeight(Math.max(.8, r * .0028));
    for (let i = 0; i < n; i++) {
      const a = i / n * TAU, [px, py] = L(a, rm), [qx, qy] = L(a + TAU / n, rm);
      circle(px, py, rad * 2); circle(px, py, rad * .5);
      const dx = qx - px, dy = qy - py, d = Math.hypot(dx, dy) || 1, nx = -dy / d * rad, ny = dx / d * rad;
      line(px + nx, py + ny, qx + nx, qy + ny); line(px - nx, py - ny, qx - nx, qy - ny);
    }
  };
  const zigzag = (r0, r1, n) => { noFill(); stroke(ink); strokeWeight(Math.max(.8, r * .003)); beginShape(); for (let i = 0; i <= n * 2; i++) { const [px, py] = L(i / (n * 2) * TAU, i % 2 ? r1 : r0); vertex(px, py); } endShape(); };
  const saw = (r0, r1, n) => { noStroke(); fill(ink); for (let i = 0; i < n; i++) { const a = i / n * TAU, h = TAU / n * .5; const [p0x, p0y] = L(a - h, r0), [p1x, p1y] = L(a + h, r0), [p2x, p2y] = L(a, r1); triangle(p0x, p0y, p1x, p1y, p2x, p2y); } };
  // local frame at angle a: +y points to the centre, -y outward, +x clockwise (so counter-clockwise travel is -x)
  const at = (a, rr, fn) => { const [px, py] = L(a, rr); push(); translate(px, py); rotate(a + Math.PI / 2); fn(); pop(); };
  const dancer = (g) => {   // feet at y = 0, head outward
    stroke(ink); strokeWeight(Math.max(.8, g * .12)); noFill();
    line(-g * .15, 0, -g * .15, -g * .45); line(g * .15, 0, g * .15, -g * .45);
    noStroke(); fill(ink);
    triangle(-g * .42, -g * .42, g * .42, -g * .42, 0, -g * .95); rect(-g * .17, -g * 1.38, g * .34, g * .5); circle(0, -g * 1.58, g * .38);
    stroke(ink); strokeWeight(Math.max(.8, g * .1));
    for (const f of [-.55, -.27, 0, .27, .55]) line(f * g * .25, -g * 1.7, f * g * .75, -g * 2.35);
    line(-g * .15, -g * 1.2, -g * .6, -g * 1.75); line(g * .15, -g * 1.2, g * .6, -g * 1.75);
  };
  const deer = (g) => {   // faces -x (counter-clockwise)
    noStroke(); fill(ink); ellipse(0, -g * .55, g * 1.5, g * .62); circle(-g * .85, -g * 1.0, g * .36);
    stroke(ink); strokeWeight(Math.max(.8, g * .1)); noFill();
    line(-g * .72, -g * .85, -g * .6, -g * .6); for (const lx of [-.5, -.25, .35, .6]) line(lx * g, -g * .35, lx * g * 1.1, g * .05);
    line(-g * .85, -g * 1.15, -g * .7, -g * 1.7); line(-g * .78, -g * 1.45, -g * .55, -g * 1.5); line(-g * .72, -g * 1.62, -g * .96, -g * 1.7);
  };
  // chim Lạc: a big water bird, long straight beak held forward and up, crest and tail streaming back, wings spread, long legs
  // trailing parallel to the body. Drawn facing +x then mirrored so it travels counter-clockwise. The short-beaked standing
  // bird is its stocky companion.
  const poly = (P, g) => { beginShape(); for (const [px, py] of P) vertex(px * g, py * g); endShape(CLOSE); };
  const birdFly = (g) => {
    push(); scale(-1, 1); translate(0, g * .15);
    noStroke(); fill(ink);
    poly([[-1.1, 0], [-.55, -.2], [.3, -.27], [.75, -.2], [.65, -.04], [.1, .08], [-.6, .1]], g);                       // body
    poly([[.6, -.2], [.9, -.34], [1.02, -.62], [1.2, -.6], [1.1, -.28], [.85, -.1]], g);                               // neck
    circle(1.13 * g, -.62 * g, .3 * g);                                                                                // head
    poly([[1.25, -.7], [2.3, -.9], [1.28, -.55]], g);                                                                   // long beak
    poly([[.3, -.25], [.45, -.8], [.05, -1.4], [-.7, -1.7], [-.35, -1.0], [-.25, -.25]], g);                           // raised wing
    poly([[.15, -.05], [-.1, .45], [-.7, .9], [-1.05, .95], [-.55, .4], [-.3, -.02]], g);                              // lower wing
    stroke(ink); strokeWeight(Math.max(.8, g * .1)); noFill();
    line(1.05 * g, -.74 * g, .62 * g, -1.08 * g); line(1.13 * g, -.76 * g, .88 * g, -1.18 * g);                        // crest
    line(-1.1 * g, 0, -1.8 * g, -.22 * g); line(-1.1 * g, 0, -1.85 * g, .04 * g); line(-1.1 * g, .02 * g, -1.75 * g, .3 * g); // tail
    line(-.1 * g, .05 * g, -2.0 * g, .3 * g); line(.12 * g, .06 * g, -1.85 * g, .5 * g);                               // legs
    pop();
  };
  const birdStand = (g) => {
    push(); scale(-1, 1); translate(0, g * .9);
    noStroke(); fill(ink);
    poly([[-.95, -.95], [-.4, -1.15], [.4, -1.1], [.7, -.9], [.3, -.65], [-.45, -.65]], g);                            // body
    poly([[.3, -1.05], [.5, -1.8], [.68, -1.78], [.62, -1.0]], g); circle(.62 * g, -1.9 * g, .34 * g);                 // neck, head
    poly([[.78, -1.96], [1.25, -1.84], [.78, -1.82]], g);                                                              // short beak
    stroke(ink); strokeWeight(Math.max(.8, g * .1)); noFill();
    line(.58 * g, -2.05 * g, .38 * g, -2.4 * g); line(.66 * g, -2.06 * g, .56 * g, -2.45 * g);                          // crest
    line(-.95 * g, -.95 * g, -1.5 * g, -.8 * g); line(-.95 * g, -1.0 * g, -1.5 * g, -1.05 * g);                          // tail
    line(-.05 * g, -.65 * g, -.1 * g, 0); line(.25 * g, -.65 * g, .3 * g, 0);                                          // legs
    pop();
  };
  const house = (g) => {   // a stilted hall with a curved roof; a figure and a drum inside
    stroke(ink); strokeWeight(Math.max(.8, g * .12)); noFill();
    line(-g * .9, 0, -g * .9, -g * .9); line(g * .9, 0, g * .9, -g * .9); line(-g * .3, 0, -g * .3, -g * .9); line(g * .3, 0, g * .3, -g * .9);
    line(-g * 1.05, -g * .9, g * 1.05, -g * .9);
    noStroke(); fill(ink); beginShape(); for (let i = 0; i <= 12; i++) { const k = i / 12 * Math.PI; vertex(-Math.cos(k) * g * 1.15, -g * .9 - Math.sin(k) * g * .85); } for (let i = 12; i >= 0; i--) { const k = i / 12 * Math.PI; vertex(-Math.cos(k) * g * .95, -g * .9 - Math.sin(k) * g * .6); } endShape(CLOSE);
    circle(0, -g * .5, g * .26); rect(-g * .1, -g * .4, g * .2, g * .35);
  };
  // --- the star: 14 rays, feather triangles between them
  const rays = o.rays ?? 14;
  noStroke(); fill(ink);
  for (let i = 0; i < rays; i++) { const a = (i + .5) / rays * TAU - Math.PI / 2, h = TAU / rays * .5; const [p0x, p0y] = L(a - h * .8, r * .17), [p1x, p1y] = L(a + h * .8, r * .17), [p2x, p2y] = L(a, r * .245); triangle(p0x, p0y, p1x, p1y, p2x, p2y); }
  push(); noStroke(); fill(color(col)); pop();
  const [ex, ey] = [0, 0]; stroke(ink); strokeWeight(Math.max(1, r * .004)); fill(color(DH.gold));
  beginShape(); for (let i = 0; i < rays * 2; i++) { const a = i * Math.PI / rays - Math.PI / 2, q = i % 2 ? r * .095 : r * .205; vertex(Math.cos(a) * q, Math.sin(a) * q); } endShape(CLOSE);
  fill(color(DH.yellow)); circle(ex, ey, r * .1);
  // --- bands, centre outwards
  const w1 = Math.max(.9, r * .0035);
  dots(r * .28, 40, r * .014); ring(r * .262, w1); ring(r * .295, w1);
  tangents(r * .30, r * .345, 44);
  zigzag(r * .352, r * .385, 40);
  tangents(r * .39, r * .43, 48);
  ring(r * .435, w1); dots(r * .45, 64, r * .012); ring(r * .463, w1);
  // band 6: dancers and two houses
  const band6 = [.465, .605], g6 = r * .06;
  ring(r * band6[1], w1);
  for (let k = 0; k < 2; k++) {
    const a0 = k * Math.PI;
    for (let i = 0; i < 6; i++) at(a0 + (i + .5) * (Math.PI * .62) / 6, r * .545, () => dancer(g6));
    at(a0 + Math.PI * .62 + Math.PI * .19, r * .545, () => house(g6 * 1.4));
  }
  tangents(r * .61, r * .648, 66);
  ring(r * .652, w1);
  // band 8: two herds of ten deer, flocks of 6 and 8 birds
  const g8 = r * .04, deerCt = [r * .672, r * .7];
  for (let k = 0; k < 2; k++) {
    const a0 = k * Math.PI * 1.06;
    for (let i = 0; i < 10; i++) at(a0 + (i + .5) * Math.PI * .62 / 10, r * .735, () => deer(g8 * 1.2));
    const nb = k ? 8 : 6;
    for (let i = 0; i < nb; i++) at(a0 + Math.PI * .66 + (i + .5) * Math.PI * .34 / nb, r * .735, () => birdFly(r * .029));
  }
  ring(r * .775, w1); tangents(r * .778, r * .8, 84);
  ring(r * .805, w1);
  // band 10: 36 birds, standing and flying in turn
  for (let i = 0; i < 36; i++) at(i / 36 * TAU, r * .865, () => i % 2 ? birdFly(r * .031) : birdStand(r * .034));
  ring(r * .925, w1);
  dots(r * .935, 100, r * .009); saw(r * .945, r * .968, 72);
  tangents(r * .968, r * .985, 90);
  pop();
  // highlight rings (the story told ring by ring)
  const hiF = o.hiFigs ?? 0, hiBi = o.hiBirds ?? 0;
  if (hiF > .02) paint(ellPts(x, y, r * .535, r * .535, 40), { ink: DH.red, sw: 2 + 5 * hiF, fill: null });
  if (hiBi > .02) paint(ellPts(x, y, r * .875, r * .875, 40), { ink: DH.red, sw: 2 + 5 * hiBi, fill: null });
}
// Side of the drum: overhanging face, a bulging tympanum with a band of long boats, a straight waist, a flared plain foot,
// two of the four rope-patterned handles. s = face diameter (height is .8 s); y = foot of the drum. hiBoats pulses the boat band.
function vsDrumSide(x, y, s, o = {}) {
  boilSeed(`drumside ${o.key ?? 0}`);
  const col = o.col || BRONZE, top = y - s * .8, X = k => x + k * s, Y = k => top + k * s;
  const half = [[.5, 0], [.5, .025], [.47, .04], [.495, .13], [.485, .22], [.43, .31], [.365, .37], [.36, .5], [.375, .56], [.41, .66], [.5, .8]];
  const prof = [...half.map(([a, b]) => [X(a), Y(b)]), ...half.slice().reverse().map(([a, b]) => [X(-a), Y(b)])];
  paint(prof, { wash: col, washOp: 255, fill: PATINA, fillOp: 70, bleed: .3, tex: .7, ink: DH.ink, sw: 1.8, curv: .12 });
  paint(ellPts(x, Y(.005), s * .5, s * .04, 30), { wash: mixCol(col, DH.white, .18), washOp: 255, ink: DH.ink, sw: 1.4 });
  const band = (y0, y1, w) => { for (const yy of [y0, y1]) inkLine([[X(-w), Y(yy)], [X(w), Y(yy)]], 1.1, DH.ink, 'inkfine', .2); };
  band(.045, .075, .47); band(.075, .105, .485); band(.245, .275, .44); band(.275, .305, .41);
  if (s > 140) {
    for (let i = -8; i <= 8; i++) { const xx = i * .055; inkLine([[X(xx), Y(.048)], [X(xx), Y(.072)]], .8, DH.ink, 'inkfine', 0); inkLine([[X(xx), Y(.278)], [X(xx), Y(.302)]], .8, DH.ink, 'inkfine', 0); }
    const hi = o.hiBoats ?? 0;
    if (hi > .02) inkLine([[X(-.47), Y(.11)], [X(.47), Y(.11)]], 2 + 5 * hi, DH.red, 'ink', 0);
    for (let i = 0; i < 6; i++) { const bx = X(-.385 + i * .154), by = Y(.19);
      paint([[bx - s * .06, by - s * .015], [bx - s * .045, by + s * .02], [bx + s * .045, by + s * .02], [bx + s * .065, by - s * .02], [bx + s * .03, by - s * .008]], { wash: DH.ink, washOp: 255, curv: .3, ink: null });
      inkLine([[bx - s * .02, by - s * .012], [bx - s * .02, by - s * .05]], 1, DH.ink, 'inkfine', 0); inkLine([[bx + s * .02, by - s * .012], [bx + s * .02, by - s * .05]], 1, DH.ink, 'inkfine', 0); }
    for (let i = -6; i <= 6; i++) inkLine([[X(i * .055), Y(.38)], [X(i * .055), Y(.42)]], .8, DH.ink, 'inkfine', 0);
    band(.37, .385, .365); band(.42, .435, .36); band(.47, .485, .36);
  }
  for (const side of [-1, 1]) {   // handles in rope pattern
    const hx = X(side * .39);
    paint([[hx, Y(.3)], [hx + side * s * .1, Y(.32)], [hx + side * s * .1, Y(.5)], [hx, Y(.5)], [hx, Y(.46)], [hx + side * s * .05, Y(.44)], [hx + side * s * .05, Y(.36)], [hx, Y(.35)]], { wash: col, washOp: 255, ink: DH.ink, sw: 1.3, curv: .2 });
  }
}

// ---------- stakes (cọc) ----------
// n stakes between x0 and x1 on the riverbed y. show 0..1 = how far they stand out of the water (0 hidden, 1 full).
function vsStakes(x0, x1, y, n, o = {}) {
  boilSeed(`stakes ${o.key ?? 0}`);
  const show = o.show ?? 1, h = o.h ?? 190;
  for (let i = 0; i < n; i++) {
    const x = lerp(x0, x1, n === 1 ? .5 : i / (n - 1)), lean = (hash(i) - .5) * .12, yy = y + (i % 2) * 12, hh = h * (.85 + hash(i + 3) * .3) * show;
    if (hh < 4) continue;
    paint([[x - 11, yy], [x - 8 + lean * hh, yy - hh], [x + lean * hh, yy - hh - 28], [x + 8 + lean * hh, yy - hh], [x + 11, yy]], { wash: DH.brown, washOp: 255, ink: DH.ink, sw: 1.2, curv: .1 });
    paint([[x + lean * hh - 8, yy - hh], [x + lean * hh, yy - hh - 30], [x + lean * hh + 8, yy - hh]], { wash: DH.greyDk, washOp: 255, ink: DH.ink, sw: 1 });
  }
}

// ---------- boats ----------
function vsWaves(x, y, w, t, col = '#FFFFFF') {   // foam under a hull
  for (let i = 0; i < 4; i++) { const wx = x - w / 2 + (i + .5) * w / 4 + Math.sin(t * 2 + i) * 4; inkLine([[wx - 22, y + 4], [wx - 8, y - 5], [wx + 8, y + 4], [wx + 22, y - 3]], 1.4, col, 'inkfine', .4); }
}
function vsCanoe(x, y, s, o = {}) {   // thuyền độc mộc: long, low, upturned ends
  boilSeed(`canoe ${o.key ?? 0}`); const t = o.t ?? T, bob = Math.sin(t * 2 + (o.ph || 0)) * 3;
  vsFlip(x, o.dir ?? 1, () => {
    paint([[x - s * .55, y - s * .12 + bob], [x - s * .3, y + bob + 4], [x + s * .3, y + bob + 4], [x + s * .55, y - s * .14 + bob], [x + s * .3, y - s * .04 + bob], [x - s * .3, y - s * .04 + bob]], { wash: o.col || DH.brown, washOp: 255, curv: .35, ink: DH.ink, sw: 1.2 });
  });
  vsWaves(x, y + 8, s, t);
}
// Big war junk: hull, deck shields, mast + sail, flags. o.col = hull colour, o.sail = sail colour.
function vsWarship(x, y, s, o = {}) {
  boilSeed(`warship ${o.key ?? 0}`); const t = o.t ?? T, bob = Math.sin(t * 1.6 + (o.ph || 0)) * 4 + (o.tilt || 0) * 0;
  push(); translate(x, y + bob); if (o.tilt) rotate(o.tilt); translate(-x, -y - bob);
  vsFlip(x, o.dir ?? 1, () => {
    paint([[x - s * .55, y - s * .22], [x - s * .45, y + s * .02], [x + s * .4, y + s * .02], [x + s * .6, y - s * .26], [x + s * .35, y - s * .2], [x - s * .3, y - s * .17]].map(([a, b]) => [a, b + bob]), { wash: o.col || DH.brownDk, washOp: 255, curv: .3, ink: DH.ink, sw: 1.6 });
    for (let i = 0; i < 7; i++) paint(ellPts(x - s * .35 + i * s * .11, y - s * .15 + bob, s * .045, s * .045, 8), { wash: o.shield || DH.red, ink: DH.ink, sw: .7 });
    inkLine([[x, y - s * .2 + bob], [x, y - s * .92 + bob]], 3.4, DH.brownDk, 'ink', 0);
    paint([[x + 4, y - s * .86 + bob], [x + s * .38, y - s * .7 + bob + Math.sin(t * 3) * 4], [x + s * .36, y - s * .32 + bob], [x + 4, y - s * .26 + bob]], { wash: o.sail || '#E6D6A8', washOp: 255, curv: .25, ink: DH.ink, sw: 1.1 });
    for (let k = 1; k < 4; k++) inkLine([[x + 4, y - s * (.86 - k * .15) + bob], [x + s * .36, y - s * (.7 - k * .12) + bob]], .8, DH.brownDk, 'inkfine', .2);
    paint([[x - 2, y - s * .92 + bob], [x - s * .12, y - s * .95 + bob + Math.sin(t * 6) * 3], [x - s * .2, y - s * .86 + bob], [x - 2, y - s * .86 + bob]], { wash: o.flag || DH.red, washOp: 255, ink: DH.ink, sw: .7 });
  });
  pop();
  vsWaves(x, y + s * .04, s * 1.1, t);
}
function vsDragonBoat(x, y, s, o = {}) {
  boilSeed(`dragonboat ${o.key ?? 0}`); const t = o.t ?? T, bob = Math.sin(t * 1.8) * 3;
  vsFlip(x, o.dir ?? 1, () => {
    paint([[x - s * .5, y - s * .16 + bob], [x - s * .4, y + bob + 3], [x + s * .35, y + bob + 3], [x + s * .56, y - s * .22 + bob], [x + s * .3, y - s * .1 + bob], [x - s * .3, y - s * .1 + bob]], { wash: DH.gold, washOp: 255, curv: .3, ink: DH.ink, sw: 1.5 });
    paint([[x + s * .5, y - s * .2 + bob], [x + s * .6, y - s * .38 + bob], [x + s * .7, y - s * .36 + bob], [x + s * .66, y - s * .26 + bob], [x + s * .6, y - s * .2 + bob]], { wash: DH.red, washOp: 255, curv: .4, ink: DH.ink, sw: 1 });
    paint(rectPts(x - s * .12, y - s * .36 + bob, s * .3, s * .26), { wash: DH.red, washOp: 255, ink: DH.ink, sw: 1 });
    vsRoof(x + s * .03, y - s * .34 + bob, s * .42, s * .17, DH.yellow, { rows: 1 });
  });
  vsWaves(x, y + 6, s, t);
}
function vsSteamship(x, y, s, o = {}) {   // French gunboat / ocean liner: dark hull, cabin, funnel, smoke
  boilSeed(`steamship ${o.key ?? 0}`); const t = o.t ?? T, bob = Math.sin(t * 1.3 + (o.ph || 0)) * 3;
  vsFlip(x, o.dir ?? 1, () => {
    paint([[x - s * .55, y - s * .2 + bob], [x - s * .48, y + bob + 4], [x + s * .5, y + bob + 4], [x + s * .62, y - s * .24 + bob]], { wash: o.hull || DH.ink, washOp: 255, ink: DH.ink, sw: 1.5, curv: .1 });
    paint(rectPts(x - s * .5, y - s * .2 + bob, s * 1.1, s * .05), { wash: DH.red, washOp: 255, ink: null });
    paint(rectPts(x - s * .3, y - s * .42 + bob, s * .6, s * .22), { wash: '#F3EAD3', washOp: 255, ink: DH.ink, sw: 1.2 });
    for (let i = 0; i < 6; i++) paint(ellPts(x - s * .24 + i * s * .1, y - s * .31 + bob, s * .022, s * .022, 8), { wash: DH.skyDk, ink: DH.ink, sw: .5 });
    paint(rectPts(x - s * .05, y - s * .72 + bob, s * .13, s * .3), { wash: DH.red, washOp: 255, ink: DH.ink, sw: 1.1 });
    paint(rectPts(x - s * .05, y - s * .72 + bob, s * .13, s * .05), { wash: DH.ink, washOp: 255, ink: null });
  });
  vsSmoke(x + (o.dir ?? 1) * -s * .0, y - s * .76 + bob, s * .09, t, { key: `ss${o.key ?? 0}`, drift: -(o.dir ?? 1) * .4, col: '#B5ADA0' });
  vsWaves(x, y + 10, s * 1.1, t);
}

// ---------- machines ----------
function vsWheel(x, y, r, rot, col = DH.ink) {
  paint(ellPts(x, y, r, r, 20), { wash: col, washOp: 255, ink: DH.ink, sw: 1 });
  paint(ellPts(x, y, r * .45, r * .45, 14), { wash: DH.greyDk, washOp: 255, ink: null });
  for (let i = 0; i < 5; i++) inkLine([[x, y], [x + Math.cos(rot + i / 5 * TAU) * r * .85, y + Math.sin(rot + i / 5 * TAU) * r * .85]], .9, DH.grey, 'inkfine', 0);
}
function vsTank(x, y, s, o = {}) {   // side view, facing right (dir -1 mirrors); y = ground
  boilSeed(`tank ${o.key ?? 0}`); const t = o.t ?? T, rock = o.rock ? Math.sin(t * 14) * 1.2 : 0;
  vsFlip(x, o.dir ?? 1, () => {
    paint([[x - s * .5, y - s * .2 + rock], [x - s * .42, y - s * .36 + rock], [x + s * .3, y - s * .36 + rock], [x + s * .5, y - s * .24 + rock], [x + s * .5, y - s * .06], [x - s * .5, y - s * .06]], { wash: DH.green, washOp: 255, fill: DH.ink, fillOp: 30, ink: DH.ink, sw: 1.6, curv: .1 });
    paint(rrPts(x - s * .54, y - s * .2, s * 1.08, s * .2, s * .09), { wash: DH.greenDk, washOp: 255, ink: DH.ink, sw: 1.4 });
    for (let i = 0; i < 6; i++) vsWheel(x - s * .4 + i * s * .16, y - s * .09, s * .062, (o.roll ?? t * 4) * (i % 2 ? 1 : 1), DH.greyDk);
    paint([[x - s * .22, y - s * .36 + rock], [x - s * .16, y - s * .56 + rock], [x + s * .14, y - s * .58 + rock], [x + s * .2, y - s * .36 + rock]], { wash: DH.green, washOp: 255, curv: .25, ink: DH.ink, sw: 1.5 });
    paint(rectPts(x + s * .16, y - s * .5 + rock, s * .66, s * .05), { wash: DH.greenDk, washOp: 255, ink: DH.ink, sw: 1.2 });
    paint(starPts(x - s * .02, y - s * .46 + rock, s * .05, .4, 5), { wash: DH.yellow, ink: DH.ink, sw: .5 });
  });
}
function vsCannon(x, y, s, o = {}) {   // field gun, muzzle to the right; o.fire 0..1 muzzle flash
  boilSeed(`cannon ${o.key ?? 0}`);
  vsFlip(x, o.dir ?? 1, () => {
    const recoil = (o.recoil ?? 0) * s * .06;
    paint([[x - s * .3 - recoil, y - s * .3], [x + s * .5 - recoil, y - s * .4], [x + s * .5 - recoil, y - s * .32], [x - s * .3 - recoil, y - s * .22]], { wash: DH.greyDk, washOp: 255, ink: DH.ink, sw: 1.4 });
    vsWheel(x - s * .02, y - s * .15, s * .16, 0, DH.brown);
    inkLine([[x - s * .3, y - s * .22], [x - s * .6, y - s * .02]], 5, DH.brownDk, 'ink', 0);
    if ((o.fire ?? 0) > .02) { glow(x + s * .56, y - s * .36, s * .6 * o.fire, '#FFB347', .9); paint(starPts(x + s * .6, y - s * .36, s * .22 * o.fire, .4, 7), { wash: DH.yellow, washOp: 255, ink: DH.ink, sw: .8 }); }
  });
}
function vsBike(x, y, s, o = {}) {   // xe đạp thồ: bicycle with a tall load; (x, y) between the wheels at the ground
  boilSeed(`bike ${o.key ?? 0}`);
  const rot = o.rot ?? 0, r = s * .22;
  vsFlip(x, o.dir ?? 1, () => {
    vsWheel(x - s * .34, y - r, r, rot, DH.ink); vsWheel(x + s * .34, y - r, r, rot, DH.ink);
    inkLine([[x - s * .34, y - r], [x - s * .06, y - s * .5], [x + s * .22, y - s * .48], [x + s * .34, y - r]], 3.2, DH.red, 'ink', 0);
    inkLine([[x - s * .06, y - s * .5], [x + s * .08, y - r]], 3, DH.red, 'ink', 0);
    inkLine([[x + s * .22, y - s * .48], [x + s * .3, y - s * .66], [x + s * .42, y - s * .68]], 3, DH.ink, 'ink', 0);
    inkLine([[x - s * .1, y - s * .52], [x - s * .12, y - s * .6]], 3, DH.ink, 'ink', 0);
    if ((o.load ?? 1) > 0) {
      paint(rectPts(x - s * .42, y - s * .72, s * .72, s * .22), { wash: '#CDB98A', washOp: 255, fill: DH.ink, fillOp: 30, ink: DH.ink, sw: 1.2 });
      paint(rectPts(x - s * .36, y - s * 1.02, s * .6, s * .3), { wash: '#B9A476', washOp: 255, ink: DH.ink, sw: 1.2 });
      paint(rectPts(x - s * .26, y - s * 1.22, s * .4, s * .2), { wash: '#CDB98A', washOp: 255, ink: DH.ink, sw: 1.2 });
      inkLine([[x - s * .42, y - s * .6], [x + s * .3, y - s * .6]], 1.4, DH.brownDk, 'inkfine', 0);
    }
  });
}
function vsTruck(x, y, s, o = {}) {
  boilSeed(`truck ${o.key ?? 0}`);
  vsFlip(x, o.dir ?? 1, () => {
    paint(rectPts(x - s * .5, y - s * .5, s * .62, s * .34), { wash: DH.greenDk, washOp: 255, ink: DH.ink, sw: 1.4 });
    paint([[x + s * .14, y - s * .5], [x + s * .3, y - s * .5], [x + s * .5, y - s * .3], [x + s * .5, y - s * .16], [x + s * .14, y - s * .16]], { wash: DH.green, washOp: 255, ink: DH.ink, sw: 1.4 });
    paint([[x + s * .2, y - s * .46], [x + s * .3, y - s * .46], [x + s * .4, y - s * .3], [x + s * .2, y - s * .3]], { wash: DH.sky, washOp: 255, ink: DH.ink, sw: .8 });
    for (let i = 0; i < 6; i++) paint([[x - s * .45 + i * s * .1, y - s * .5], [x - s * .4 + i * s * .1, y - s * .64], [x - s * .35 + i * s * .1, y - s * .5]], { wash: DH.green, washOp: 255, ink: DH.ink, sw: .6 });
    vsWheel(x - s * .3, y - s * .1, s * .1, o.rot ?? 0, DH.ink); vsWheel(x + s * .3, y - s * .1, s * .1, o.rot ?? 0, DH.ink);
  });
}
function vsFurnace(x, y, s, t, o = {}) {   // bronze-casting furnace: clay dome, glowing mouth, molten stream into a mould
  boilSeed(`furnace ${o.key ?? 0}`);
  paint([[x - s * .5, y], [x - s * .46, y - s * .4], [x - s * .2, y - s * .72], [x + s * .2, y - s * .72], [x + s * .46, y - s * .4], [x + s * .5, y]], { wash: '#B9714A', washOp: 255, fill: DH.ink, fillOp: 40, curv: .3, ink: DH.ink, sw: 1.6 });
  glow(x, y - s * .2, s * 1.2, '#FF9A3C', .8);
  paint([[x - s * .17, y], [x - s * .17, y - s * .24], [x, y - s * .34], [x + s * .17, y - s * .24], [x + s * .17, y]], { wash: DH.orange, washOp: 255, curv: .3, ink: DH.ink, sw: 1 });
  paint([[x - s * .08, y], [x - s * .08, y - s * .18], [x, y - s * .24], [x + s * .08, y - s * .18], [x + s * .08, y]], { wash: DH.gold, washOp: 255, curv: .3, ink: null });
  vsSmoke(x, y - s * .74, s * .12, t, { key: 'fsmoke', col: '#8F867A' });
  const pour = o.pour ?? 0;
  if (pour > 0) {
    paint(rectPts(x + s * .56, y - s * .06, s * .5, s * .06), { wash: DH.brownDk, washOp: 255, ink: DH.ink, sw: 1 });
    inkLine([[x + s * .5, y - s * .3], [x + s * .6, y - s * .25], [x + s * .7, y - s * (.25 - .2 * pour)]], 5 + 3 * pour, DH.orange, 'ink', .5);
    paint(ellPts(x + s * .8, y - s * .12, s * .22 * Math.min(1, pour * 1.5), s * .08, 14), { wash: DH.gold, washOp: 255, ink: DH.ink, sw: .8 });
  }
}
function vsPot(x, y, s, o = {}) {
  boilSeed(`pot ${o.key ?? Math.round(x / 40)}`);
  paint([[x - s * .5, y - s * .55], [x - s * .62, y - s * .25], [x - s * .4, y], [x + s * .4, y], [x + s * .62, y - s * .25], [x + s * .5, y - s * .55]], { wash: o.col || '#B9714A', washOp: 255, curv: .35, ink: DH.ink, sw: 1.3 });
  paint(ellPts(x, y - s * .55, s * .5, s * .1, 18), { wash: DH.brownDk, washOp: 255, ink: DH.ink, sw: 1 });
}
function vsSack(x, y, s, o = {}) {
  boilSeed(`sack ${o.key ?? Math.round(x / 40)}`);
  paint([[x - s * .4, y], [x - s * .46, y - s * .4], [x - s * .22, y - s * .7], [x - s * .12, y - s * .86], [x + s * .12, y - s * .86], [x + s * .22, y - s * .7], [x + s * .46, y - s * .4], [x + s * .4, y]], { wash: o.col || '#E3CFA0', washOp: 255, curv: .35, ink: DH.ink, sw: 1.2 });
  inkLine([[x - s * .16, y - s * .72], [x + s * .16, y - s * .72]], 1.4, DH.brownDk, 'inkfine', .3);
}
// A standing flag on the ground. o.kind picks a real design (no text on any):
//   'vn' red + gold star (cờ đỏ sao vàng) | 'red' plain red (Tây Sơn) | 'yellow' plain yellow (Nguyễn) | 'queLy' yellow with the red
//   quẻ Ly (☲) bars, Nguyễn 1920s-45 | 'tricolor' French blue-white-red | 'pennant' swallow-tailed dynasty pennant in o.col
//   | 'qing' yellow with a blue dragon | 'mttq' red over blue with a star (National Liberation Front).
// No kind: a plain o.col cloth (+ o.star), used for generic armies and tribes.
function vsBanner(x, y, h, o = {}) {
  boilSeed(`banner ${o.key ?? Math.round(x / 40)}`);
  const t = o.t ?? T, w = o.w ?? h * .55, fh = o.fh ?? h * .34, kind = o.kind, n = 8;
  inkLine([[x, y], [x, y - h]], 3.4, DH.brownDk, 'ink', 0);
  const wav = i => Math.sin(t * 5 + i * .7 + (o.ph || 0)) * 5 * (i / n);
  const cloth = (a0, a1, b0, b1) => {   // a = fraction along the width, b = fraction down the height
    const A = Math.round(a0 * n), B = Math.round(a1 * n), top = [], bot = [];
    for (let i = A; i <= B; i++) { top.push([x + 2 + i / n * w, y - h + fh * b0 + wav(i)]); bot.push([x + 2 + i / n * w, y - h + fh * b1 + wav(i)]); }
    return [...top, ...bot.reverse()];
  };
  const fill = (a0, a1, b0, b1, col, ink = DH.ink) => paint(cloth(a0, a1, b0, b1), { wash: col, washOp: 255, ink, sw: 1 });
  const star = (cx, cy, r) => paint(starPts(x + 2 + w * cx + 0, y - h + fh * cy + wav(Math.round(cx * n)), r, .4, 5), { wash: DH.yellow, washOp: 255, ink: DH.ink, sw: .6 });
  if (kind === 'vn') { fill(0, 1, 0, 1, DH.red); star(.5, .5, fh * .3); }
  else if (kind === 'red') fill(0, 1, 0, 1, DH.red);
  else if (kind === 'yellow') fill(0, 1, 0, 1, DH.yellow);
  else if (kind === 'queLy') {
    fill(0, 1, 0, 1, DH.yellow);
    fill(.12, .88, .17, .31, DH.red, null); fill(.12, .88, .69, .83, DH.red, null);
    fill(.12, .44, .43, .57, DH.red, null); fill(.56, .88, .43, .57, DH.red, null);
  } else if (kind === 'tricolor') { fill(0, .38, 0, 1, '#2F4F9E'); fill(.38, .62, 0, 1, DH.white); fill(.62, 1, 0, 1, DH.red); }
  else if (kind === 'mttq') { fill(0, 1, 0, .5, DH.red); fill(0, 1, .5, 1, '#2F6FB0'); star(.5, .5, fh * .22); }
  else if (kind === 'qing') {
    fill(0, 1, 0, 1, DH.yellow);
    const dr = []; for (let i = 0; i <= 8; i++) dr.push([x + 2 + w * (.15 + .7 * i / 8), y - h + fh * (.5 + Math.sin(i * 1.3) * .2) + wav(Math.round((.15 + .7 * i / 8) * n))]);
    inkLine(dr, Math.max(2, fh * .07), '#2F6FB0', 'ink', 0);
  } else if (kind === 'pennant') {
    const top = [], bot = []; for (let i = 0; i <= n; i++) { top.push([x + 2 + i / n * w, y - h + fh * .06 * i / n + wav(i)]); bot.push([x + 2 + i / n * w, y - h + fh - fh * .06 * i / n + wav(i)]); }
    bot.reverse(); paint([...top, [x + 2 + w * .78, y - h + fh * .5 + wav(6)], ...bot], { wash: o.col || DH.red, washOp: 255, ink: DH.ink, sw: 1.1 });
  } else {
    fill(0, 1, 0, 1, o.col || DH.red);
    if (o.star) star(.5, .5, fh * .3);
  }
}
function vsEggSac(x, y, s, t, o = {}) {   // the bọc of a hundred eggs; open 0..1 = babies tumbling out
  boilSeed(`eggsac ${o.key ?? 0}`);
  paint(ellPts(x, y - s * .5, s * .5, s * .56, 24, 2), { wash: '#FFF7E0', washOp: 255, fill: DH.pink, fillOp: 40, ink: DH.ink, sw: 1.6 });
  const n = o.n ?? 30, open = o.open ?? 0;
  for (let i = 0; i < n; i++) {
    const k = clamp(open * 1.4 - hash(i) * .4), a = hash(i * 3) * TAU, rr = Math.sqrt(hash(i * 5)) * s * .38;
    const px = x + Math.cos(a) * rr * (1 + k * 2.2), py = y - s * .5 + Math.sin(a) * rr * (1 + k * 1.6) + k * s * .3, r = s * (.05 + .04 * k);
    paint(ellPts(px, py, r, r, 10), { wash: SKIN.fair, washOp: 255, ink: DH.ink, sw: .6 });
    if (k > .3) { paint(ellPts(px - r * .35, py - r * .1, r * .1, r * .14, 6), { wash: DH.ink, ink: null }); paint(ellPts(px + r * .35, py - r * .1, r * .1, r * .14, 6), { wash: DH.ink, ink: null }); }
  }
}

// ---------- the dragon (rồng) ----------
// A serpent along a flowing path, head on the right end. s = body length scale; o.t animates; o.col body colour.
function vsDragon(x, y, s, o = {}) {
  boilSeed(`dragon ${o.key ?? 0}`);
  const t = o.t ?? T, col = o.col || DH.gold, n = 9, P = [];
  for (let i = 0; i <= n; i++) { const k = i / n; P.push([x + (k - .5) * s * (o.span ?? 2.2), y + Math.sin(k * 5.2 - t * 2.4) * s * .22 * (.4 + k) - k * (o.rise ?? 0) * s]); }
  paint(ribbon(P, s * .07, s * .24), { wash: col, washOp: 255, fill: DH.red, fillOp: 60, bleed: .3, ink: DH.ink, sw: 1.8, curv: .5 });
  const C = through(P, 5);
  for (let i = 3; i < C.length - 6; i += 4) { const [px, py] = C[i]; inkLine([[px - 7, py - 5], [px, py + 2], [px + 7, py - 5]], 1.1, DH.redDk, 'inkfine', .4); }
  for (let i = 2; i < C.length - 6; i += 6) { const [px, py] = C[i], [qx, qy] = C[i + 1]; paint([[px, py - s * .05], [px + (qx - px) * 2 + 2, py - s * .17], [qx + 3, qy - s * .04]], { wash: DH.red, washOp: 255, ink: DH.ink, sw: .6 }); }
  const [hx, hy] = P[n], [px2, py2] = P[n - 1], a = Math.atan2(hy - py2, hx - px2);
  push(); translate(hx, hy); rotate(a);
  const hs = s * .24;
  paint([[-hs * .4, -hs * .55], [hs * .5, -hs * .7], [hs * 1.4, -hs * .25], [hs * 1.7, -hs * .1], [hs * 1.5, hs * .3], [hs * .6, hs * .55], [-hs * .4, hs * .6]], { wash: col, washOp: 255, ink: DH.ink, sw: 1.6, curv: .35 });
  paint(ellPts(hs * .7, -hs * .15, hs * .17, hs * .2, 10), { wash: DH.white, ink: DH.ink, sw: .8 }); paint(ellPts(hs * .74, -hs * .15, hs * .08, hs * .1, 8), { wash: DH.ink, ink: null });
  inkLine([[hs * 1.5, hs * .05], [hs * 2.2, hs * .35 + Math.sin(t * 5) * hs * .1], [hs * 2.9, hs * .1]], 1.6, DH.ink, 'ink', .5);
  inkLine([[hs * 1.4, hs * .2], [hs * 2.1, hs * .75 + Math.sin(t * 5 + 1) * hs * .1], [hs * 2.6, hs * .65]], 1.4, DH.ink, 'ink', .5);
  for (const sgn of [1, 2]) paint([[hs * (.1 + sgn * .15), -hs * .6], [hs * (.0 + sgn * .2), -hs * 1.5], [hs * (.35 + sgn * .15), -hs * .7]], { wash: DH.red, washOp: 255, curv: .3, ink: DH.ink, sw: .8 });
  paint(ribbon([[-hs * .3, -hs * .5], [-hs * 1.0, -hs * .95], [-hs * 1.6, -hs * .5]], hs * .5, hs * .1), { wash: DH.red, washOp: 255, curv: .4, ink: DH.ink, sw: .8 });
  pop();
}

// ---------- the map of Việt Nam ----------
// Real geography, [lon, lat]. vsMapVN(x, y, s): s = height in px of the mainland (lat 23.4 to 8.4); (x, y) = top-left of the
// mainland box (lon 102.1, lat 23.4). Islands lie east/south-west of that box (Hoàng Sa, Trường Sa up to lon ~114.5).
const VN_COAST_N = [[106.7, 21.95], [107.25, 21.95], [107.9, 21.55], [108.05, 21.5], [107.6, 21.4], [107.4, 21.1], [107.05, 20.95], [106.8, 20.75], [106.6, 20.6], [106.5, 20.25], [106.15, 19.95], [105.9, 19.8], [105.75, 19.35], [105.65, 19.0], [105.85, 18.65], [106.1, 18.4], [106.4, 18.0], [106.55, 17.7], [106.85, 17.3], [107.2, 16.95], [107.55, 16.6], [107.9, 16.35], [108.2, 16.1], [108.5, 15.7], [108.8, 15.4], [108.95, 15.0], [109.1, 14.5], [109.2, 13.9], [109.3, 13.4], [109.3, 12.9], [109.4, 12.5], [109.25, 12.1], [109.2, 11.7], [109.0, 11.4], [108.6, 11.2], [108.2, 10.95], [107.8, 10.7], [107.3, 10.4], [106.8, 10.4], [106.75, 10.2], [106.6, 9.9], [106.3, 9.6], [105.9, 9.35], [105.55, 9.1], [105.3, 8.75], [104.95, 8.6], [104.8, 8.65], [104.85, 9.0], [104.85, 9.5], [105.05, 9.9], [104.8, 10.15], [104.45, 10.4]];
// land border, from Hà Tiên north along Cambodia and Laos, then east along China back to Lạng Sơn
const VN_BORDER = [[104.7, 10.55], [105.0, 10.9], [105.5, 10.9], [105.85, 11.4], [106.1, 11.65], [106.45, 11.7], [106.6, 12.0], [107.0, 12.1], [107.3, 12.3], [107.55, 12.75], [107.55, 13.4], [107.4, 13.8], [107.5, 14.1], [107.55, 14.5], [107.3, 14.9], [107.1, 15.3], [107.4, 15.6], [107.1, 16.1], [106.9, 16.35], [106.6, 16.6], [106.5, 16.95], [106.0, 17.0], [105.8, 17.4], [105.6, 17.75], [105.15, 18.1], [105.15, 18.5], [104.7, 18.9], [104.05, 19.2], [103.9, 19.45], [104.3, 19.7], [104.45, 20.0], [104.1, 20.4], [103.7, 20.65], [103.9, 20.85], [104.0, 21.15], [103.4, 21.2], [102.95, 21.4], [102.5, 21.6], [102.3, 21.9], [102.15, 22.4], [102.5, 22.75], [103.0, 22.45], [103.5, 22.6], [103.95, 22.5], [104.3, 22.8], [104.45, 23.15], [104.9, 23.2], [105.3, 23.37], [105.85, 23.2], [106.1, 22.95], [106.65, 22.95], [106.75, 22.5], [106.55, 22.15]];
const VN_MAINLAND = [...VN_BORDER, ...VN_COAST_N];
// islands: [lon, lat, rx deg, ry deg]
const VN_HOANG_SA = [[111.6, 16.5, .1, .05], [111.75, 16.6, .06, .04], [111.5, 16.45, .05, .04], [112.3, 16.95, .09, .05], [112.15, 16.9, .05, .04], [112.45, 16.95, .05, .04], [112.3, 17.05, .04, .04], [112.7, 16.65, .08, .05], [112.0, 16.2, .05, .04], [111.8, 16.3, .04, .04]];
const VN_TRUONG_SA = [[114.33, 11.43, .08, .05], [113.9, 10.9, .05, .04], [114.3, 10.2, .06, .05], [114.33, 9.88, .1, .06], [113.1, 9.6, .05, .04], [112.7, 9.9, .05, .04], [113.6, 9.2, .06, .04], [114.28, 8.86, .05, .04], [113.9, 8.8, .05, .04], [113.5, 8.5, .05, .04], [113.2, 8.1, .06, .04], [112.9, 7.88, .08, .05], [112.5, 8.7, .05, .04], [112.2, 8.9, .05, .04], [111.92, 8.65, .1, .05], [112.0, 10.0, .04, .04]];
const VN_NEAR_ISLANDS = [[106.6, 8.7, .22, .1], [106.55, 8.65, .06, .05], [104.0, 10.25, .22, .12], [103.5, 9.3, .06, .05], [107.0, 20.8, .12, .08], [107.7, 20.13, .05, .04], [107.35, 17.16, .04, .03], [109.15, 15.38, .06, .04], [108.95, 10.5, .08, .05]];
// pixel position of a lon/lat on a map drawn by vsMapVN(x, y, s)
const vsMapPt = (x, y, s, lon, lat) => [x + (lon - 102.1) * s / 15, y + (23.4 - lat) * s / 15];
function vsMapVN(x, y, s, o = {}) {
  if (s < 12) return;   // a map shrunk to a speck degenerates into zero-area polygons, which p5.brush cannot fill
  boilSeed(`mapvn ${o.key ?? 0}`);
  const k = s / 15, P = (lon, lat) => vsMapPt(x, y, s, lon, lat), col = o.col || DH.green;
  if (o.neighbors) {   // the lands around it: China, Laos, Cambodia
    const chain = [...VN_BORDER, [106.7, 21.95], [107.25, 21.95], [107.9, 21.55], [108.05, 21.5]].map(([a, b]) => P(a, b));
    paint([...chain, P(108.7, 22.5), P(107.6, 23.8), P(105.5, 24.8), [P(103, 25.3)[0], P(0, 25.3)[1]], [-700, P(0, 25.6)[1]], [-700, P(0, 10.55)[1]]], { wash: o.land || '#E3CFA0', washOp: 255, fill: DH.earth, fillOp: 40, bleed: .4, ink: null });
  }
  paint(VN_MAINLAND.map(([a, b]) => P(a, b)), { wash: col, washOp: 255, fill: DH.greenDk, fillOp: 70, bleed: .3, tex: .7, ink: DH.ink, sw: 2, curv: .1 });
  if (o.islands === false) return;
  const isl = ([a, b, rx, ry]) => { const [px, py] = P(a, b); paint(ellPts(px, py, Math.max(5.5, rx * k * 1.4), Math.max(4.2, ry * k * 1.4), 8), { wash: col, washOp: 255, ink: DH.ink, sw: .9 }); };
  [...VN_HOANG_SA, ...VN_TRUONG_SA, ...VN_NEAR_ISLANDS].forEach(isl);
}

// An empty throne: gilded chair with a tall carved back, on a low dais. (x, y) = floor under the chair.
function vsThrone(x, y, s, o = {}) {
  boilSeed(`throne ${o.key ?? 0}`);
  const col = o.col || DH.gold;
  paint(rectPts(x - s * .62, y - s * .1, s * 1.24, s * .1), { wash: DH.redDk, washOp: 255, ink: DH.ink, sw: 1.2 });
  paint([[x - s * .42, y - s * .1], [x - s * .46, y - s * .62], [x - s * .34, y - s * 1.2], [x - s * .12, y - s * 1.5], [x, y - s * 1.62], [x + s * .12, y - s * 1.5], [x + s * .34, y - s * 1.2], [x + s * .46, y - s * .62], [x + s * .42, y - s * .1]], { wash: col, washOp: 255, curv: .3, ink: DH.ink, sw: 1.6 });
  paint(rectPts(x - s * .34, y - s * .7, s * .68, s * .6), { wash: DH.red, washOp: 255, ink: DH.ink, sw: 1.2 });
  paint(ellPts(x, y - s * 1.1, s * .17, s * .2, 12), { wash: DH.red, washOp: 255, ink: DH.ink, sw: 1 });
  for (const side of [-1, 1]) paint(rectPts(x + side * s * .5 - s * .05, y - s * .85, s * .1, s * .45), { wash: col, washOp: 255, ink: DH.ink, sw: 1 });
}
// Sound ripples: n rings growing out of (x, y), phase k 0..1 repeating.
function vsRipples(x, y, r, k, o = {}) {
  boilSeed(`ripples ${o.key ?? 0}`);
  for (let i = 0; i < (o.n ?? 3); i++) {
    const kk = frac(k + i / (o.n ?? 3)), rr = r * (.2 + kk), a = 1 - kk;
    if (a <= .02) continue;
    const pts = []; for (let j = 0; j <= 20; j++) { const ang = -.9 + j / 20 * 1.8; pts.push([x + Math.cos(ang) * rr, y + Math.sin(ang) * rr]); }
    inkLine(pts, 1.2 + 2 * a, o.col || DH.red, 'ink', .5);
  }
}
// A tiny spiral shell (ốc) for baskets and shell heaps.
function vsShell(x, y, s) {
  paint(ellPts(x, y - s * .5, s * .7, s * .5, 10), { wash: '#E8D9B8', washOp: 255, ink: DH.ink, sw: .6 });
  inkLine([[x - s * .3, y - s * .5], [x, y - s * .75], [x + s * .3, y - s * .5], [x + s * .1, y - s * .3]], .6, DH.brownDk, 'inkfine', .5);
}

// A little gold king's hat as an icon (for counting reigns). (x, y) = its centre.
function vsCrownIcon(x, y, s) {
  boilSeed(`crownicon ${Math.round(x)} ${Math.round(y)}`);
  paint([[x - s, y + s * .5], [x - s * .8, y - s * .2], [x - s * .35, y - s * .9], [x, y - s * 1.1], [x + s * .35, y - s * .9], [x + s * .8, y - s * .2], [x + s, y + s * .5]], { wash: DH.gold, washOp: 255, curv: .3, ink: DH.ink, sw: 1 });
  paint(rectPts(x - s, y + s * .2, s * 2, s * .4), { wash: DH.red, washOp: 255, ink: DH.ink, sw: .7 });
  paint(ellPts(x, y - s * .25, s * .2, s * .22, 8), { wash: DH.red, ink: DH.ink, sw: .5 });
}

// Sedan chair (kiệu): a seat under a small roof on two poles, carried by four minis. Seat top at (x, y - s*.55).
function vsSedan(x, y, s, t, o = {}) {
  boilSeed(`sedan ${o.key ?? 0}`);
  const bob = (o.moving ? Math.sin(t * 6) : 0) * 4;
  for (const dx of [-.62, -.22, .22, .62]) vsMini(x + dx * s, y, s * .09, { key: `sd${dx}`, t, moving: o.moving, col: o.bearer || DH.brownDk, hat: 'nonla', hold: 'none' });
  inkLine([[x - s * .8, y - s * .5 + bob], [x + s * .8, y - s * .5 + bob]], 3, DH.brownDk, 'ink', 0);
  paint(rectPts(x - s * .34, y - s * .56 + bob, s * .68, s * .12), { wash: DH.red, washOp: 255, ink: DH.ink, sw: 1 });
  for (const dx of [-.32, .32]) inkLine([[x + dx * s, y - s * .56 + bob], [x + dx * s, y - s * 1.3 + bob]], 2.4, DH.redDk, 'ink', 0);
  vsRoof(x, y - s * 1.26 + bob, s * .86, s * .22, o.roof || DH.gold, { rows: 1 });
}
// Whale / sea monster (cá kình): big blue back, tail fluke, spouting water. Faces right.
function vsWhale(x, y, s, t, o = {}) {
  boilSeed(`whale ${o.key ?? 0}`);
  const sw = Math.sin(t * 2) * s * .03;
  paint([[x - s, y], [x - s * .8, y - s * .35 + sw], [x - s * .2, y - s * .55], [x + s * .5, y - s * .45], [x + s * .9, y - s * .1], [x + s * .8, y + s * .1], [x - s * .3, y + s * .12]], { wash: o.col || '#3E5A82', washOp: 255, curv: .4, fill: DH.ink, fillOp: 35, ink: DH.ink, sw: 1.8 });
  paint([[x - s * .95, y - s * .1], [x - s * 1.3, y - s * .55 + sw], [x - s * 1.1, y - s * .15], [x - s * 1.35, y + s * .1 + sw], [x - s * .9, y + s * .05]], { wash: o.col || '#3E5A82', washOp: 255, curv: .3, ink: DH.ink, sw: 1.4 });
  paint(ellPts(x + s * .55, y - s * .22, s * .04, s * .05, 6), { wash: DH.white, ink: DH.ink, sw: .6 });
  for (let i = -1; i <= 1; i++) inkLine([[x + s * .1, y - s * .5], [x + s * .1 + i * s * .2, y - s * .9 - Math.abs(i) * -s * .1], [x + s * .1 + i * s * .35, y - s * .65]], 2, '#DDEBF2', 'ink', .5);
}
// A chain lying along a line, snapped at `gap` (0 closed .. 1 wide open) in the middle.
function vsChain(x0, x1, y, gap, o = {}) {
  boilSeed(`chain ${o.key ?? 0}`);
  const n = 14, mid = (x0 + x1) / 2;
  for (let i = 0; i < n; i++) {
    let x = lerp(x0, x1, i / (n - 1)); const side = x < mid ? -1 : 1; x += side * gap * 60; const yy = y + (gap > 0 ? Math.abs(x - mid) * .0 : 0) + (gap * (side > 0 ? 8 : 4)) * (Math.abs(x - mid) / (x1 - x0));
    paint(i % 2 ? ellPts(x, yy, 11, 20, 12) : ellPts(x, yy, 26, 13, 12), { ink: DH.ink, sw: 3, wash: i % 2 ? '#B8B2A6' : '#8C867C', washOp: 255 });
  }
}
// Falling petals (blossom) across the whole frame.
function vsPetals(t, n, col = DH.pink, o = {}) {
  boilSeed(`petals ${o.key ?? 0}`);
  for (let i = 0; i < n; i++) {
    const sp = 60 + hash(i * 2) * 70, x = (hash(i * 3.1) * (W + 200) - 100 + Math.sin(t + i) * 40 + t * 25) % (W + 200), y = ((hash(i * 5.7) * H + t * sp) % (H + 100)) - 50;
    paint(ellPts(x, y, 8, 5, 8, 0, t + i), { wash: col, washOp: 255, ink: null });
  }
}
