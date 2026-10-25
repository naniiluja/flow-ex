// vs_main.js: the scene registry, transitions and shot list for "Việt sử". Loaded after every vs_c*.js chapter file.
// A scene is scene('07', (t, lt, dur, S) => { ... }): t = video time, lt = time into the shot, dur = its length, S = { id, words }.
// Scenes are written against fractions of `dur` and cues on narrated words, so they stay in step with the Vbee audio.

const SCENES = {};
const scene = (id, fn) => { SCENES[id] = fn; };

// Start time (s, inside the scene) of the nth spoken occurrence of a word (lowercase, no punctuation); fb if it never occurs.
const cue = (S, word, n = 0, fb = 0) => { let c = 0; for (const [w, s] of S.words) if (w === word && c++ === n) return s; return fb; };
// 0..1 progress between two times, eased.
const span = (lt, a, b) => ease(seg(lt, a, b));

// A slow camera move over the shot. o: x0,y0,z0 -> x1,y1,z1 (world centre and zoom); defaults to a small push-in.
// The camera also shakes for half a second after every impact word the narrator says (cannon fire, a gate rammed, a ship
// breaking), so the hits land on the voice without each scene timing its own shake.
const VS_IMPACT = /^(nổ|pháo|vỡ|húc|chém|đâm|sập|gãy|bắn)$/;
let VS_CUR = null;
function vsShake(lt) {
  if (!VS_CUR) return [0, 0];
  let amt = 0;
  for (const [w, s] of VS_CUR.words) if (VS_IMPACT.test(w) && lt >= s && lt < s + .6) amt = Math.max(amt, 14 * Math.exp(-6 * (lt - s)));
  return amt > .3 ? shakeXY(T, amt) : [0, 0];
}
function vsCam(lt, dur, o = {}) {
  const k = ease(clamp(lt / dur)), [sx, sy] = vsShake(lt);
  camBegin(lerp(o.x0 ?? W / 2, o.x1 ?? o.x0 ?? W / 2, k) + sx, lerp(o.y0 ?? H / 2, o.y1 ?? o.y0 ?? H / 2, k) + sy, lerp(o.z0 ?? 1.02, o.z1 ?? 1.1, k), o.rot ?? 0);
}

// Brush-wipe colours per chapter (the wipe INTO the chapter's first scene), cutting at full cover under the clip boundary.
const CHAPTER_STARTS = { '08': ['#8E2220', '#C8372D'], '16': ['#1F3358', '#2D4B80'], '24': ['#356536', '#4F8A4B'], '32': ['#B8893A', '#E7B232'], '39': ['#5F5B58', '#8F8B86'],
  '47': ['#5E3B27', '#8A5A3A'], '56': ['#8E2220', '#E8833A'], '63': ['#1F3358', '#6AA2B8'], '69': ['#2B2233', '#5F5B58'], '76': ['#356536', '#4F8A4B'], '85': ['#8E2220', '#C8372D'] };

// Every seam gets a transition (the guide's rule 6). Chapter seams keep their brush wipe in the chapter's colours; the
// others take turns: an iris shut and reopened on ink, a fade through the paper, a light paper-coloured brush wipe. Each
// clip is rendered on its own, so the outgoing scene draws the first half and the incoming scene the second half.
// A scene that already opens or closes with its own iris keeps it (its source is checked for the pattern).
const SEAM_KINDS = ['iris', 'paper', 'wipe'];
function vsSeam(kind, p, cols) {   // p 0 -> .5 covers, .5 -> 1 uncovers
  if (kind === 'wipe') return brushWipe(p, cols || ['#E6D9BE', '#F3EBDC']);
  if (kind === 'paper') return flash(p < .5 ? ease(p * 2) : ease((1 - p) * 2), PAL.paper);
  const r = p < .5 ? lerp(1700, 0, easeIn(p * 2)) : lerp(0, 1700, easeOut((p - .5) * 2));
  iris(W / 2, H * .55, r, DH.ink);
}
function vsInstallShots() {
  const kindOf = i => CHAPTER_STARTS[VS_TIMES[i + 1]?.id] ? 'chapter' : SEAM_KINDS[i % 3];
  const list = VS_TIMES.map((S, i) => {
    const src = String(SCENES[S.id] || ''), ownOut = /dur - \.\d\) iris|iris\([^;]*dur - /.test(src), ownIn = /lt < \.\d\) iris/.test(src);
    const outK = i < VS_TIMES.length - 1 && !ownOut ? kindOf(i) : null, inK = i > 0 && !ownIn ? kindOf(i - 1) : null;
    const outCols = CHAPTER_STARTS[VS_TIMES[i + 1]?.id], inCols = CHAPTER_STARTS[S.id];
    return [S.start, (t, lt, dur) => {
      vsBegin(); CAM = null; VS_CUR = S;
      const fn = SCENES[S.id];
      if (fn) fn(t, lt, dur, S); else { vsSky('grey'); letter(S.id, W / 2, H / 2, 160, DH.red); }
      CAM = null; VS_CUR = null; flushBrush(); boilSeed(`wipe ${S.id}`);
      const L = outK === 'iris' ? .4 : .3;
      if (outK && lt > dur - L) vsSeam(outK === 'chapter' ? 'wipe' : outK, (lt - (dur - L)) / (2 * L), outCols);
      const L2 = inK === 'iris' ? .4 : .3;
      if (inK && lt < L2) vsSeam(inK === 'chapter' ? 'wipe' : inK, .5 + lt / (2 * L2), inCols);
    }];
  });
  shots(list);
}

// The usual open-air set: sky, sun, clouds, two ranges, the horizon land, a nearer land and the foreground band.
// o: sky, sunX/sunY/sunR/sunCol, clouds, rh (ridge base y), rk (ridge kind), r1/r2, land, land2, gy1/gy2/fy, seed, pan, rocks, t.
function vsBackdrop(o = {}) {
  const t = o.t ?? T;
  vsSky(o.sky || 'day', { key: 'sky', t });
  if (o.sun !== false) vsSun(o.sunX ?? 880, o.sunY ?? 330, o.sunR ?? 90, { t, key: 'sun', col: o.sunCol });
  if (o.clouds !== false) { vsCloud(o.cx1 ?? 220, o.cy1 ?? 300, 120, { key: 'c1' }); vsCloud(o.cx2 ?? 760, o.cy2 ?? 560, 95, { key: 'c2', ph: 2, op: 235 }); }
  if (o.ridge !== false) {
    vsRidge(o.rh ?? 940, 260, o.r1 || '#8CA58F', { kind: o.rk || 'karst', seed: o.seed || 3, key: 'r1', pan: o.pan || 0 });
    vsRidge((o.rh ?? 940) + 70, 120, o.r2 || '#6F9A6A', { kind: 'hill', seed: (o.seed || 3) + 4, key: 'r2', pan: o.pan || 0 });
  }
  vsLand(o.gy1 ?? 1000, o.land || '#7CAE5F', { key: 'g1' });
  if (o.land2 !== false) vsLand(o.gy2 ?? 1190, o.land2 || '#9CC36F', { key: 'g2', amp: 5 });
  if (o.fore !== false) vsFore(o.fy ?? 1460, o.land2 || o.land || '#9CC36F', { key: 'fore', seed: o.seed || 3, rocks: o.rocks });
}
// Draw fn() tipped over around the feet (x, y): k 0 upright .. 1 flat on the ground, dir ±1 = which way.
function vsFall(x, y, k, dir, fn) { push(); translate(x, y); rotate(k * 1.45 * dir); translate(-x, -y); fn(); pop(); }

// The outro, rendered as its own clip after the last scene (--loop=outro): the museum shot of scene 91 carries on, the camera
// pulls back (scene 91's walls are painted wide enough for it), the narrator closes the story, and an iris shuts on the drum's
// star, the same star the video opened on. Times are in the outro's own seconds; the voice starts at VS_OUTRO.voice.
const VS_OUTRO = { len: 6.6, voice: .5, voiceEnd: 4.65, shut: [5.15, 6.05] };
function vsOutro(t) {
  const S = VS_TIMES[VS_TIMES.length - 1], dur = S.end - S.start, z = lerp(1, .8, ease(seg(t, .3, VS_OUTRO.voiceEnd)));
  push(); translate(W / 2, H / 2); scale(z); translate(-W / 2, -H / 2);
  vsBegin(); CAM = null; VS_CUR = null;
  SCENES[S.id](S.end + t, dur + t, dur, S);
  CAM = null; flushBrush();
  pop();
  const sy = H / 2 + (787 - H / 2) * z;
  glow(W / 2, sy, 260 * z, '#FFE7A0', .35 + .35 * pulse(t, 3));
  const [a, b] = VS_OUTRO.shut, k = seg(t, a, b);
  if (t > a) iris(W / 2, sy, k < .55 ? lerp(1400, 120, ease(k / .55)) : lerp(120, 0, easeIn((k - .55) / .45)), DH.ink);
}
