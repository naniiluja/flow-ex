// gach_shots.js: "Gạch và con mèo trú mưa". Seven shots cut to the Vbee narration (projects/da461c3a-*/narration-expressive/
// timeline.json). Scene starts: 0 / 6.38 / 14.78 / 25.03 / 31.34 / 38.37 / 48.92. See STORYBOARD.md for the reads.
(() => {
  const U = 34;                          // Gạch's size unit in the room and the alley
  const BED = { x: 520, y: 1338 };       // where Gạch sits on the mattress
  const CLK = { x: 905, y: 1268, r: 56 };
  const RUN_Y = 1585;                    // the floor line Gạch runs along
  const COOL = [mixCol(PAL.clayDk, PAL.ink, .1), PAL.clay];
  const TEAL = [mixCol(PAL.teal, PAL.ink, .25), PAL.teal];

  const wipeOut = (lt, dur, cols) => { boilSeed('wipe'); if (lt > dur - .3) brushWipe((lt - (dur - .3)) / .6, cols); };
  const wipeIn = (lt, cols) => { boilSeed('wipe'); if (lt < .3) brushWipe(.5 + lt / .6, cols); };

  // ---------- shot 1: the sleeper, the clock, the cat at the window (0 - 6.38) ----------
  function sleeper(t, lt, dur) {
    const cy = kf(lt, [[0, 1300], [2.9, 1300], [4.4, 760]]), z = kf(lt, [[0, 1.5], [2.9, 1.5], [4.4, 1.0], [dur, 1.0]]);
    camBegin(620, cy, z);
    G.room(t, { catK: seg(lt, 4.9, 5.7), catLook: -.5 });
    const e = ease(seg(lt, 1.3, 2.8)), M = 450 + 35 * e + 600 * Math.sin(Math.PI * e);   // hands whirl from 7:30 to 8:05
    G.clock(CLK.x, CLK.y, CLK.r, { M, t });
    clawd(BED.x, BED.y, U, { ...feel('sleepy', t), rot: .03 });
    const eye = toScreen(BED.x, BED.y - 4 * U);
    camEnd();
    if (lt < .5) iris(...eye, lerp(0, 1700, easeIn(lt / .5)));
    wipeOut(lt, dur, COOL);
  }

  // ---------- shot 2: two alarms, two slaps, two more minutes of sleep (6.38 - 14.78) ----------
  // arm swing at a clock: raise from a0, hit at a1, back by a2. Gạch leans toward the clock while reaching.
  function slap(lt, a0, a1, a2) {
    const up = ease(seg(lt, a0, a1 - .12)), hit = easeIn(seg(lt, a1 - .12, a1)), back = ease(seg(lt, a1 + .3, a2));
    let aR = lerp(.15, 1.35, up); aR = lerp(aR, -.15, hit); aR = lerp(aR, .15, back);
    return { aR, lean: 2.3 * ease(seg(lt, a0, a1)) * (1 - back) };
  }
  function alarms(t, lt, dur) {
    camBegin(660 + 14 * Math.sin(lt * .4), 1310, lerp(1.5, 1.64, ease(seg(lt, 0, dur))));
    const ringing = (lt > 3.95 && lt < 4.85) || (lt > 7.05 && lt < 7.62), hitAt = lt < 6.5 ? 4.85 : 7.62, since = lt - hitAt;
    G.room(t, {});
    G.clock(CLK.x, CLK.y, CLK.r, { M: 450 + 35, t, shake: ringing ? 1 : 0, ring: ringing ? 1 : 0, dy: since > 0 && since < .5 ? 9 * Math.exp(-since * 14) * Math.cos(since * 30) : 0 });
    const mood = emotions(lt, [[0, 'sleepy'], [3.95, 'angry'], [5.4, 'sleepy'], [7.05, 'angry'], [8.05, 'sleepy']]);
    const s = lt < 6.5 ? slap(lt, 4.4, 4.85, 5.5) : slap(lt, 7.2, 7.62, 8.1), swinging = (lt > 4.4 && lt < 5.5) || (lt > 7.2 && lt < 8.1);
    const legs = 3.2 * ease(seg(lt, 1.75, 2.7));
    clawd(BED.x, BED.y, U, { ...mood, aR: swinging ? s.aR : mood.aR, dx: (mood.dx || 0) + (swinging ? s.lean : 0), rot: (mood.rot || 0) + (swinging ? .035 * s.lean : 0), walk: legs, dy: (mood.dy || 0) - (legs > 0 && legs < 3.2 ? .35 * Math.abs(Math.sin(legs * 6)) : 0) });
    camEnd();
    wipeIn(lt, COOL);
  }

  // ---------- shot 3: eyes open, 8:15, grab the bag, run for the door, the rain, the umbrella left behind (14.78 - 25.03) ----------
  function bolt(t, lt, dur) {
    const tJump = 3.0, tLand = 3.65, tScoop = 3.95, tBag = 4.15, tRun0 = 4.38, tStop = 5.2, BAG = [770, RUN_Y + 6];
    const dir = 1;   // always to the right: out of the door, and on to the alley
    const stop = easeOut(seg(lt, tRun0, tStop)), runX = lerp(700, 1290, ease(seg(lt, tRun0, tStop)));
    let x = BED.x, y = BED.y, pose = {};
    if (lt >= tJump && lt < tLand) { [x, y] = arcPt([BED.x, BED.y], [700, RUN_Y], 170, (lt - tJump) / (tLand - tJump)); pose = { sq: -.12 * Math.sin((lt - tJump) / (tLand - tJump) * Math.PI) }; }
    else if (lt >= tLand) {
      y = RUN_Y; x = lt < tRun0 ? 700 : runX;
      const a = lt - tLand, land = .22 * Math.exp(-8 * a) * Math.cos(20 * a);
      if (lt < tRun0) pose = { ...turn(lt, tLand + .05, tLand + .25, 0, .25), sq: land + (lt > tScoop ? .22 * Math.sin(Math.PI * seg(lt, tScoop, tBag)) : 0), aL: lt > tScoop ? lerp(.2, -1.1, ease(seg(lt, tScoop, tBag - .05))) : .2 };
      else if (lt < tStop) pose = { view: 'side', walk: Math.abs(x - 700) / (4 * U), smear: .5, smearDir: 1, dy: -Math.abs(Math.sin(Math.abs(x - 700) / (4 * U) * Math.PI)) * .6, rot: -.08 };
      else pose = { view: 'side', sq: .2 * Math.exp(-9 * (lt - tStop)) * Math.cos(22 * (lt - tStop)), rot: -.08 * Math.exp(-6 * (lt - tStop)) };
    }
    const mood = emotions(lt, [[-1, 'sleepy'], [.52, 'surprised'], [2.85, 'scared'], [6.1, 'nervous']]);
    const cam = kf(lt, [[0, [660, 1310, 1.64]], [.9, [730, 1320, 1.55]], [2.7, [730, 1320, 1.55]], [3.5, [700, 1440, 1.25]], [4.2, [800, 1470, 1.25]], [5.2, [1180, 1470, 1.25]], [5.9, [1330, 1440, 1.3]], [7.7, [1330, 1440, 1.3]], [8.5, [1190, 1430, 1.7]], [dur, [1190, 1430, 1.7]]]);
    camBegin(...cam);
    G.room(t, { showUmbrella: true, rainK: 1, bag: false });
    G.clock(CLK.x, CLK.y, CLK.r, { M: 485 + 10 * ease(seg(lt, 1.0, 1.9)), t });   // 8:05 ticks over to 8:15
    // the bag: on the floor, then a hop onto Gạch's back
    const hop = seg(lt, tBag, tBag + .25), onBack = [x - 3.0 * U * dir, y - 2.0 * U];
    if (lt < tBag) G.bag(BAG[0], BAG[1], U * 1.15);
    else if (lt < tBag + .25) { const p = arcPt(BAG, onBack, 90, hop); G.bag(p[0], p[1], U * 1.15, { rot: -.3 * hop }); }
    else G.bag(onBack[0], onBack[1], U * 1.15, { rot: -.12 });
    const face = { ...mood, ...pose, sq: (mood.sq || 0) + (pose.sq || 0), dy: (mood.dy || 0) * (lt < tRun0 ? 1 : .3) + (pose.dy || 0) };
    if (lt > .9 && lt < 2.7) { face.lookX = .9; face.lookY = .1; }
    if (lt >= tRun0) face.aL = face.aR = -.2 + .9 * Math.sin(Math.abs(x - 700) / (4 * U) * Math.PI * 2);
    clawd(x, y, U, face);
    if (lt > 6.1 && lt < 9.8) emote('sweat', x + 2.6 * U, y - 7.4 * U, U * .5, seg(lt, 6.2, 6.5), lt - 6.2);
    if (lt > 8.2 && lt < 9.9) emote('spark', 1120, 1285, 22, seg(lt, 8.2, 8.5), lt - 8.2);
    camEnd();
    wipeOut(lt, dur, TEAL);
  }


  // ---------- the alley (S4-S7): Gạch's ground line is G.GY, the cat is a little smaller ----------
  const GY = G.GY, UC = 28, DRY_CAT = { x: 1010 };
  const blink = (t, ph = 0) => Math.sin(t * 2.3 + ph) > .965 ? 1 : 0;
  // water thrown off Gạch's body when he shakes: k 0..1
  function shakeOff(x, y, k) {
    if (k <= 0 || k >= 1) return;
    for (let i = 0; i < 12; i++) {
      boilSeed('sh' + i);
      const side = i % 2 ? 1 : -1, a = -.5 + hash(i) * 1.1, sp = 100 + 150 * hash(i + 5), kk = easeOut(k);
      paint(ellPts(x + side * (150 + sp * kk * Math.cos(a)), y - 150 - sp * kk * Math.sin(a) + 260 * kk * kk, 9, 13, 8), { wash: PAL.sky, ink: PAL.ink, sw: .8 });
    }
  }
  // a Clawd holding an open umbrella over its head by the raised right hand; tilt leans the canopy toward +x
  function heldUmbrella(x, y, tilt = 0, lift = 0) {
    const hx = x + 5.6 * U, hy = y - 6.9 * U - lift, s = 4.6 * U;
    G.umbrella(hx + tilt * 80, hy - 1.1 * s, s, { rot: tilt * .5, pole: 1.1, key: 'held' });
  }

  // ---------- shot 4: a dash under the awning, a shake, and a cat in the corner (25.03 - 31.34) ----------
  function dash(t, lt, dur) {
    const run = seg(lt, .15, 2.3), x = lerp(-140, 640, easeOut(run)), a = Math.max(0, lt - 2.3), steps = (x + 140) / (4 * U);
    const running = lt < 2.3;
    const mood = emotions(lt, [[0, 'nervous'], [2.7, 'neutral'], [4.15, 'surprised', { lookX: .9 }]]);
    const pose = running
      ? { view: 'side', walk: steps, smear: .6 * (1 - seg(lt, 1.5, 2.3)), smearDir: 1, dy: -Math.abs(Math.sin(steps * Math.PI)) * .7, rot: -.1 * (1 - seg(lt, 1.8, 2.3)) }
      : { view: lt < 3.8 ? 'side' : 'q', sq: .24 * Math.exp(-7 * a) * Math.cos(18 * a) + (lt > 3.1 && lt < 3.55 ? .06 * Math.sin((lt - 3.1) * 70) : 0), rot: lt > 3.1 && lt < 3.55 ? .1 * Math.sin((lt - 3.1) * 55) : 0 };
    camBegin(...kf(lt, [[0, [260, 1380, 1.35]], [2.3, [560, 1380, 1.3]], [3.8, [560, 1380, 1.3]], [4.8, [800, 1370, 1.15]], [dur, [800, 1370, 1.15]]]));
    G.alley(t, {});
    G.cat(DRY_CAT.x, GY, UC, { pose: 'sit', t, flip: true, look: lt > 4.2 ? .8 : .2, blink: blink(t, 1) });
    clawd(x, GY, U, { ...mood, ...pose, tint: 'blue', tintK: .28, sq: (mood.sq || 0) + (pose.sq || 0), dy: (mood.dy || 0) * .3 + (pose.dy || 0), rot: (mood.rot || 0) + (pose.rot || 0), aL: running ? -.2 + .9 * Math.sin(steps * TAU) : mood.aL, aR: running ? -.2 - .9 * Math.sin(steps * TAU) : mood.aR });
    shakeOff(x, GY, seg(lt, 3.1, 3.7));
    camEnd();
    wipeIn(lt, TEAL);
  }

  // ---------- shot 5: the cat makes room, Gạch steps in, two of them listen to the tin roof (31.34 - 38.37) ----------
  function room2(t, lt, dur) {
    const catX = lerp(DRY_CAT.x, 1130, ease(seg(lt, 1.15, 2.2))), stepK = ease(seg(lt, 2.2, 3.2)), x = lerp(640, 800, stepK), stepping = lt > 2.2 && lt < 3.2;
    const mood = emotions(lt, [[0, 'surprised', { lookX: .9 }], [1.4, 'nervous', { lookX: .5 }], [4.4, 'nervous', { lookX: .9 }], [5.3, 'nervous', { lookX: .2 }]]);
    camBegin(...kf(lt, [[0, [800, 1370, 1.15]], [1.0, [820, 1370, 1.2]], [4.9, [820, 1370, 1.2]], [5.6, [820, 800, 1.3]], [dur, [820, 800, 1.3]]]));
    G.alley(t, { drum: seg(lt, 5.2, 5.6) });
    const hopC = lt > 1.15 && lt < 2.2 ? Math.abs(Math.sin((lt - 1.15) * 9)) * .35 : 0;
    G.cat(catX, GY, UC, { pose: 'sit', t, flip: true, look: lt < 1.0 ? .8 : lt < 2.4 ? .3 : (lt > 4.5 && lt < 5.2 ? .9 : -.3), blink: blink(t, 1) || (lt > 4.4 && lt < 5.3 ? Math.sin(lt * 3) > .8 ? 1 : 0 : 0), dy: -hopC, sq: lt > 2.1 && lt < 2.4 ? .08 : 0 });
    clawd(x, GY, U, { ...mood, view: stepping ? 'q' : lt < 2.2 ? 'q' : 'front', walk: stepping ? stepK * 2.2 : 0, dy: (mood.dy || 0) * .5 - (stepping ? Math.abs(Math.sin(stepK * 2.2 * Math.PI)) * .5 : 0), tint: 'blue', tintK: .2 });
    camEnd();
  }

  // ---------- shot 6: Gạch stops fretting, the rain stops, the cat leads, a puddle jump (38.37 - 48.92) ----------
  function relief(t, lt, dur) {
    const sun = ease(seg(lt, 5.0, 6.4)), rainK = 1 - seg(lt, 4.9, 5.8), gy = lerp(GY, 1560, ease(seg(lt, 7.6, 8.8)));
    const walkK = ease(seg(lt, 7.6, 8.9)), jumpK = jump(lt, 9.0, 9.75, 3.2);
    let x = lerp(800, 1190, walkK);
    if (lt >= 9.0) x = lerp(1190, 1590, seg(lt, 9.0, 9.75));
    const mood = emotions(lt, [[0, 'nervous', { lookX: .8 }], [.9, 'nervous', { lookX: .1 }], [2.0, 'relieved'], [3.2, 'thinking'], [4.4, 'neutral'], [5.2, 'hopeful', { lookY: -.5 }], [6.6, 'playful'], [9.75, 'excited']]);
    const tap = lt > .9 && lt < 1.9 ? Math.max(0, Math.sin((lt - .9) * 18)) * .45 : 0;
    const shrug = lt > 3.2 && lt < 4.4 ? ease(seg(lt, 3.2, 3.55)) * (1 - ease(seg(lt, 4.0, 4.4))) : 0;
    const moving = lt >= 7.6 && lt < 9.0;
    camBegin(...kf(lt, [[0, [820, 1370, 1.15]], [6.2, [820, 1370, 1.15]], [8.0, [1050, 1400, 1.15]], [9.2, [1330, 1420, 1.1]], [dur, [1330, 1420, 1.1]]]));
    G.alley(t, { sun, rainK });
    const catWalk = seg(lt, 6.5, 9.4), cx = lt < 6.4 ? 1130 : lerp(1130, 1700, ease(catWalk)), cgy = lerp(GY, 1560, ease(seg(lt, 7.0, 8.4)));
    if (lt < 6.4) G.cat(1130, GY, UC, { pose: 'sit', t, flip: true, look: lt < .6 ? -.4 : .3, blink: blink(t, 1), tail: lt > 5.9 ? 1.2 : 0 });
    else G.cat(cx, cgy, UC, { pose: 'walk', t, flip: false, step: (cx - 1130) / (4 * UC), dy: lt < 6.7 ? -.4 * Math.sin((lt - 6.4) / .3 * Math.PI) : 0 });
    const pose = lt >= 9.0 ? { view: 'side', ...jumpK, dy: jumpK.dy, rot: lt < 9.75 ? -.12 : 0 }
      : moving ? { view: 'side', walk: Math.abs(x - 800) / (4 * U), dy: -Math.abs(Math.sin(Math.abs(x - 800) / (4 * U) * Math.PI)) * .5 }
      : { view: 'front' };
    clawd(x, gy, U, { ...mood, ...pose, sq: (mood.sq || 0) + (pose.sq || 0), dy: (mood.dy || 0) * .5 + (pose.dy || 0) - tap, aL: shrug ? .2 + 1.1 * shrug : mood.aL, aR: shrug ? .2 + 1.1 * shrug : mood.aR, tint: 'blue', tintK: .2 * (1 - sun) });
    if (lt > 9.7 && lt < 10.4) { G.splash(1590, gy + 20, seg(lt, 9.75, 10.4), PAL.sky, 1.6); G.splash(1590, gy + 20, seg(lt, 9.85, 10.4), PAL.sky, 1.1); }
    camEnd();
    wipeOut(lt, dur, [PAL.ochre, PAL.cream]);
  }

  // ---------- shot 7: the next morning, the umbrella tilted over the cat (48.92 - 57.94) ----------
  function umbrellaShot(t, lt, dur) {
    const walkK = ease(seg(lt, 3.3, 5.3)), x = lerp(-160, 190, walkK), walking = lt > 3.3 && lt < 5.3, tilt = ease(seg(lt, 6.0, 7.2));
    const mood = emotions(lt, [[0, 'neutral'], [5.3, 'hopeful', { lookX: .8 }], [6.2, 'love']]);
    camBegin(...kf(lt, [[0, [560, 1380, 1.2]], [3.0, [560, 1380, 1.2]], [5.4, [380, 1370, 1.3]], [dur, [380, 1370, 1.35]]]));
    G.alley(t, { rainK: 1 });
    const under = tilt > .5;
    G.cat(500, GY, UC, { pose: 'sit', t, flip: true, look: lt < 3.2 ? Math.sin(lt * 1.3) * .8 : .5, blink: under ? (lt > 6.8 ? 1 : 0) : blink(t, 2), wet: under ? 0 : .6, tail: under ? .6 : 0 });
    clawd(x, GY, U, { ...mood, view: walking ? 'q' : 'front', walk: walking ? walkK * 3.4 : 0, aL: .15, aR: 1.3 + .2 * tilt, dy: (mood.dy || 0) - (walking ? Math.abs(Math.sin(walkK * 3.4 * Math.PI)) * .5 : 0), tint: 'blue', tintK: .08 });
    if (lt > 3.2) heldUmbrella(x, GY, tilt, 0);
    const mid = toScreen(345, GY - 3 * U);
    camEnd();
    wipeIn(lt, [PAL.ochre, PAL.cream]);
    if (lt > 8.2) iris(...mid, lt < 8.6 ? lerp(1500, 230, ease(seg(lt, 8.2, 8.6))) : lerp(230, 0, easeIn(seg(lt, 8.65, 8.95))));
  }

  shots([[0, sleeper], [6.38, alarms], [14.78, bolt], [25.03, dash], [31.34, room2], [38.37, relief], [48.92, umbrellaShot]]);
})();
