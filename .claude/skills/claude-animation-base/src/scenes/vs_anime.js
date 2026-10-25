// vs_anime.js: a clean cel-shaded chibi bust that copies the look of the reference key art: pale flat skin, round orange eyes with a
// dark ring, tapered black brows and hair tips, pink blush with hatch marks, a thick scarf over a dark jacket. Raw p5 after
// flushBrush(), so every line stays crisp and every shape has the same medium dark outline.
//   vsAnimeBust(x, y, s, { skin, hair, iris, scarf, jacket, undershirt, band, t })   (x, y) = centre of the head, s = head width in px.
function vsAnimeBust(x, y, s, o = {}) {
  flushBrush();
  const u = s / 2, ln = o.line || '#262626', skin = o.skin || '#FFF3E4', hair = o.hair || '#2D3333', hairHi = o.hairHi || '#5A6665';
  const iris = o.iris || '#F59A2E', irisDk = o.irisDk || '#E56A14', irisLt = o.irisLt || '#FFC15A';
  const scarf = o.scarf || '#F2A91E', scarfDk = o.scarfDk || '#D98710', jacket = o.jacket || '#2C3A33', under = o.undershirt || '#E8C95A', band = o.band;
  const t = o.t ?? 0, blink = Math.abs(Math.sin(t * 1.1)) > .985 ? .1 : 1, sway = Math.sin(t * 1.6) * .02;
  const lw = Math.max(2.4, s * .0095);
  push(); translate(x, y);
  const P = pts => pts.map(([a, b]) => [a * u, b * u]);
  const outline = w => { if (w) { stroke(ln); strokeWeight(w); strokeJoin(ROUND); } else noStroke(); };
  const blob = (pts, f, w = lw) => { const q = P(pts); fill(f); outline(w); beginShape(); q.forEach(p => splineVertex(...p)); endShape(CLOSE); };
  const poly = (pts, f, w = lw) => { const q = P(pts); fill(f); outline(w); beginShape(); q.forEach(p => vertex(...p)); endShape(CLOSE); };
  // a brush stroke that swells in the middle and tapers to points: spline through pts, width w at the belly
  const taper = (pts, w, c = ln, bias = .5) => {
    const q = P(pts), N = 24, ctr = [];
    for (let i = 0; i <= N; i++) {   // Catmull-Rom sample
      const f = i / N * (q.length - 1), k = Math.min(q.length - 2, Math.floor(f)), r = f - k;
      const p0 = q[Math.max(0, k - 1)], p1 = q[k], p2 = q[k + 1], p3 = q[Math.min(q.length - 1, k + 2)];
      const cr = (a, b, c2, d) => .5 * ((2 * b) + (-a + c2) * r + (2 * a - 5 * b + 4 * c2 - d) * r * r + (-a + 3 * b - 3 * c2 + d) * r * r * r);
      ctr.push([cr(p0[0], p1[0], p2[0], p3[0]), cr(p0[1], p1[1], p2[1], p3[1])]);
    }
    const L = [], R = [];
    ctr.forEach((p, i) => {
      const a = ctr[Math.max(0, i - 1)], b = ctr[Math.min(N, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1;
      const k = i / N, prof = Math.pow(Math.sin(Math.PI * Math.pow(k, Math.log(.5) / Math.log(bias))), .7), hw = w * prof / 2;
      L.push([p[0] - dy / d * hw, p[1] + dx / d * hw]); R.push([p[0] + dy / d * hw, p[1] - dx / d * hw]);
    });
    noStroke(); fill(c); beginShape(); L.forEach(p => vertex(...p)); R.reverse().forEach(p => vertex(...p)); endShape(CLOSE);
  };
  // a lock of hair: base edge from (x0, top) to (x1, top), curving to a sharp tip; bend shifts the curve sideways
  const lock = (x0, x1, tx, ty, top, bend = 0, f = hair, w = lw * 1.25) => {
    const q = P([[x0, top], [x1, top], [tx, ty], [(x0 + tx) / 2 + bend, (top + ty) / 2], [(x1 + tx) / 2 + bend, (top + ty) / 2]]);
    fill(f); outline(w); beginShape(); vertex(...q[0]); bezierVertex(...q[3]); bezierVertex(...q[3]); bezierVertex(...q[2]); bezierVertex(...q[4]); bezierVertex(...q[4]); bezierVertex(...q[1]); endShape(CLOSE);
  };

  // ---- back hair: a puffy mass with spiky edges ----
  blob([[-1.12, -.05], [-1.3, -.7], [-1.0, -1.25], [0, -1.45], [1.0, -1.25], [1.3, -.7], [1.12, -.05], [1.0, .55], [0, .4], [-1.0, .55]], hair);
  // ---- jacket, undershirt, scarf ----
  poly([[-2.4, 3.3], [-2.25, 2.0], [-1.6, 1.5], [-.7, 1.25], [.7, 1.25], [1.6, 1.5], [2.25, 2.0], [2.4, 3.3]], jacket);
  poly([[-.5, 1.6], [.5, 1.6], [0, 2.7]], under); taper([[-.5, 1.6], [0, 2.7], [.5, 1.6]], lw * 1.3);
  // ears
  blob([[.95, -.05], [1.1, 0], [1.14, .22], [1.0, .32], [.94, .2]], skin); blob([[-.95, -.05], [-1.1, 0], [-1.14, .22], [-1.0, .32], [-.94, .2]], skin);
  // ---- face ----
  blob([[-1.0, -.1], [-.97, .33], [-.62, .76], [0, .93], [.62, .76], [.97, .33], [1.0, -.1], [.9, -.6], [0, -.82], [-.9, -.6]], skin);
  // ---- eyes: round orange discs inside a dark ring, small white glints ----
  for (const sd of [-1, 1]) {
    push(); translate(sd * .5 * u, .12 * u);
    fill(irisDk); outline(lw * 1.5); ellipse(0, 0, .56 * u, .6 * u * blink);
    if (blink > .5) {
      noStroke(); fill(iris); ellipse(0, .06 * u, .46 * u, .44 * u); fill(irisLt); ellipse(0, .15 * u, .34 * u, .2 * u);
      fill('#FFFFFF'); ellipse(-.1 * u, -.08 * u, .12 * u, .13 * u); ellipse(.1 * u, .17 * u, .05 * u, .05 * u);
    }
    pop();
    taper([[sd * .86, .06], [sd * .66, -.14], [sd * .42, -.2], [sd * .2, -.1]], lw * 3.2, ln, .6);       // heavy upper lid
    taper([[sd * .2, -.24], [sd * .52, -.4], [sd * .82, -.42]], lw * 2.2, hair, .55);                     // brow, inner end low: a sly look
  }
  // ---- blush with hatch, nose dot, smile ----
  noStroke(); fill(255, 140, 150, 150); ellipse(-.62 * u, .5 * u, .27 * u, .17 * u); ellipse(.62 * u, .5 * u, .27 * u, .17 * u);
  stroke(236, 100, 120); strokeWeight(lw * .75); strokeCap(ROUND);
  for (const sd of [-1, 1]) for (let k = -1; k <= 1; k++) line((sd * .62 + k * .065 - .02) * u, .45 * u, (sd * .62 + k * .065 + .03) * u, .56 * u);
  taper([[-.2, .62], [-.04, .72], [.14, .68], [.26, .58]], lw * 2.1, ln, .5);
  taper([[.24, .55], [.3, .6]], lw * 1.4, ln, .5);
  // ---- front hair: parted fringe, side locks, spiky crown, glossy strands ----
  blob([[-1.06, -.2], [-1.14, -.85], [-.8, -1.3], [0, -1.45], [.8, -1.3], [1.14, -.85], [1.06, -.2], [.75, -.55], [0, -.62], [-.75, -.55]], hair);
  [[-.92, -.5, -1.3, -1.7, .1], [-.62, -.2, -.88, -1.9, .1], [-.3, .1, -.38, -1.78, .05], [0, .36, .14 + sway * 2, -1.95, -.04], [.34, .7, .62, -1.78, -.08], [.66, 1.0, 1.1, -1.58, -.1]].forEach(([a, b, tx, ty, bd]) => lock(a, b, tx, ty, -1.2, bd));
  lock(-1.02, -.7, -.72, .02, -.6, .06); lock(-.74, -.34, -.38, -.2, -.6, .05); lock(-.3, .0, .02, -.26, -.62, 0); lock(.04, .4, .36, -.28, -.62, -.04); lock(.4, .78, .74, -.1, -.6, -.06);
  lock(-1.06, -.84, -1.12, .5, -.45, .05); lock(1.06, .84, 1.12, .52, -.45, -.05);
  poly([[-.98, -.7], [.98, -.7], [.98, -.56], [-.98, -.56]], hair, 0);                 // hide the seams where the fringe locks meet the cap
  poly([[-.88, -1.27], [.88, -1.27], [.88, -1.13], [-.88, -1.13]], hair, 0);         // ...and where the crown spikes meet it
  poly([[-1.07, -.5], [-.86, -.5], [-.86, -.4], [-1.07, -.4]], hair, 0); poly([[1.07, -.5], [.86, -.5], [.86, -.4], [1.07, -.4]], hair, 0);
  for (const [a, b, c, d] of [[-.6, -1.2, -.45, -.8], [-.1, -1.3, .0, -.85], [.4, -1.15, .5, -.8], [-.9, -.7, -.85, -.35]]) taper([[a, b], [(a + c) / 2 - .03, (b + d) / 2], [c, d]], lw * 1.8, hairHi, .45);
  // ---- scarf: a thick roll with two hanging ends and fold lines ----
  blob([[-1.1, 1.2], [-1.0, 1.45], [-.4, 1.62], [.3, 1.6], [.9, 1.5], [1.1, 1.2], [.9, 1.02], [0, 1.1], [-.9, 1.02]], scarf);
  blob([[.4, 1.5], [1.0, 1.42], [1.3, 2.1], [1.27, 3.0], [.72, 3.15], [.62, 2.2]], scarf); blob([[-.75, 1.45], [-.15, 1.6], [-.17, 2.2], [-.33, 2.65], [-.93, 2.56], [-.92, 2.0]], scarf);
  for (const [a, b, c, d] of [[.6, 1.7, .8, 2.9], [-.55, 1.8, -.6, 2.45], [-.8, 1.25, -.2, 1.45]]) taper([[a, b], [(a + c) / 2 + .02, (b + d) / 2], [c, d]], lw * 1.8, scarfDk, .5);
  if (band) {   // optional headband tied over the hair
    taper([[-1.05, -.7], [0, -.6], [1.05, -.7]], s * .05, band, .5);
  }
  pop();
}
