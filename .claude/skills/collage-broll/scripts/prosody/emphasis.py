"""Pitch emphasis + word lengthening for a narrated story, using Praat (PSOLA) through Parselmouth.

  python emphasis.py <in.wav> <words.json> <para_starts.json> <out.wav> <map.json> [cues.json]

Rules (from the prosody research: focus in a tone language WIDENS the pitch range around the word and
keeps the contour's shape; the following words are compressed; the focused word is lengthened):
- every sentence drifts from +4% down to -7% (declination + final lowering); a paragraph's first
  sentence starts a further +6% higher (pitch reset)
- a spoken reply in quotes, or a word ending in "!": range x1.40, +5%
- a short punch sentence (<= 6 words): its last word sinks, range x1.25, -7%
- the word after an intensifier (rất, chính, chỉ, vẫn, đúng): range x1.25, +3%
- after a focused word the next 3 words are compressed to 82% of their range
- focused words are lengthened 15%; the old->new time map is written so captions stay in sync
The automatic rules find only the textbook cases (12 words in a 500-word story), so the emotional lines stay flat.
cues.json is the director's hand on top of them, one entry per line that carries a feeling:
  {"p": "Thế thì đánh kiểu quái gì?", "k": 0, "range": 1.5, "shift": 0.03, "tempo": 1.08, "end": 0.1,
   "focus": ["đánh"]}
  p      the words of the line (matched on the script, the k-th occurrence, 0-based)
  range  pitch range of the whole line around its mean (1.5 = wider, livelier; 0.85 = flatter, tender)
  shift  pitch offset of the line, log units (0.05 ~ +5%)
  tempo  speaking rate (1.1 = faster, 0.88 = slower); the time map keeps captions in sync
  end    extra pitch on the last word (+ rises a question, - lands a punch line)
  focus  words of the line to focus (range x fk, +fs, lengthened by stretch; defaults 1.40 / 0.05 / 1.15)
  fk, fs, stretch  softer focus for a line; a first trial at the defaults was judged "quá tay, nghe giả" (2026-10-25)
"""
import json, re, sys
import numpy as np
import parselmouth
from parselmouth.praat import call

wav_in, words_path, paras_path, wav_out, map_path = sys.argv[1:6]
cues = json.load(open(sys.argv[6])) if len(sys.argv) > 6 else []
words = json.load(open(words_path))
para_starts = set(json.load(open(paras_path)))
bare = lambda s: re.sub(r'[“”"\s]', "", s)
sec = lambda i, k: words[i][k] / 1000.0

snd = parselmouth.Sound(wav_in)
dur = snd.get_total_duration()
manip = call(snd, "To Manipulation", 0.01, 75, 500)
pt = call(manip, "Extract pitch tier")
n = call(pt, "Get number of points")
tt = np.array([call(pt, "Get time from index", i + 1) for i in range(n)])
lf = np.log(np.array([call(pt, "Get value at index", i + 1) for i in range(n)]))

def window(a, b, edge=0.04):
    lo, hi = np.searchsorted(tt, a - edge), np.searchsorted(tt, b + edge)
    t = tt[lo:hi]
    w = np.ones_like(t)
    w = np.where(t < a, (t - (a - edge)) / edge, w)
    w = np.where(t > b, 1 - (t - b) / edge, w)
    return lo, hi, np.clip(w, 0, 1)

sents, cur = [], []
for i, w in enumerate(words):
    cur.append(i)
    if bare(w["text"])[-1:] in ".!?":
        sents.append(cur); cur = []
if cur: sents.append(cur)

focus = []
for ids in sents:
    a, b = sec(ids[0], "startMs"), sec(ids[-1], "endMs")
    lo, hi = np.searchsorted(tt, a), np.searchsorted(tt, b, side="right")
    if hi > lo: lf[lo:hi] += np.interp(tt[lo:hi], [a, b], [0.04, -0.07])
    for p in para_starts:                                   # a paragraph (or quote block) restarts high
        if ids[0] <= p <= ids[-1]:
            pa = sec(p, "startMs"); plo = np.searchsorted(tt, pa)
            if hi > plo: lf[plo:hi] += np.interp(tt[plo:hi], [pa, b], [0.06, 0.0])
    last = ids[-1]
    q_open = next((j for j in reversed(ids) if re.match(r'^[“"]', words[j]["text"].strip())), None)
    q_close = re.search(r'[”"]$', words[last]["text"].strip()) is not None
    reply = q_open is not None and q_close and (last - q_open + 1) <= 5
    if bare(words[last]["text"]).endswith("!") or reply: focus.append((last, 1.40, 0.05))
    elif len(ids) <= 6: focus.append((last, 1.25, -0.07))
    for j in ids[:-1]:
        if bare(words[j]["text"]).lower() in {"rất", "chính", "chỉ", "vẫn", "đúng"} and j + 1 < len(words):
            focus.append((j + 1, 1.25, 0.03))

# director's cues: whole-line range / offset / tempo, a pitch end and extra focus words
fold = lambda s: re.sub(r"[^\w]", "", s.lower())
spans = []                                                  # (start s, end s, duration factor)
STRETCH = {}                                                # word -> lengthening of a cue's focus word
for c in cues:
    key = [fold(x) for x in c["p"].split()]; hits = [i for i in range(len(words) - len(key) + 1)
        if all(fold(words[i + j]["text"]) == key[j] for j in range(len(key)))]
    if len(hits) <= c.get("k", 0): sys.exit(f"cue not found in the script: {c['p']!r} #{c.get('k', 0)}")
    i0 = hits[c.get("k", 0)]; i1 = i0 + len(key) - 1; a, b = sec(i0, "startMs"), sec(i1, "endMs")
    ia, ib = np.searchsorted(tt, a), np.searchsorted(tt, b, side="right")
    if ib - ia >= 2:
        mu = lf[ia:ib].mean(); lo, hi, w = window(a, b, .08)
        lf[lo:hi] += w * ((c.get("range", 1.0) - 1) * (lf[lo:hi] - mu) + c.get("shift", 0.0))
        if c.get("end"):
            la, lb = sec(i1, "startMs"), sec(i1, "endMs"); lo, hi, w = window(la, lb); lf[lo:hi] += w * c["end"]
    if c.get("tempo", 1.0) != 1.0: spans.append((a, b, 1.0 / c["tempo"]))
    for fw in c.get("focus", []):
        fk = [fold(x) for x in fw.split()]
        for i in range(i0, i1 - len(fk) + 2):
            if all(fold(words[i + j]["text"]) == fk[j] for j in range(len(fk))):
                for j in range(len(fk)): focus.append((i + j, c.get("fk", 1.40), c.get("fs", 0.05))); STRETCH[i + j] = c.get("stretch", 1.15)
                break
        else: sys.exit(f"focus word {fw!r} not in cue {c['p']!r}")

for (wi, k, ds) in focus:
    a, b = sec(wi, "startMs"), sec(wi, "endMs")
    ia, ib = np.searchsorted(tt, a), np.searchsorted(tt, b, side="right")
    if ib - ia < 2: continue
    mu = lf[ia:ib].mean()
    lo, hi, w = window(a, b)
    lf[lo:hi] += w * ((k - 1) * (lf[lo:hi] - mu) + ds)
    for nx in range(wi + 1, min(wi + 4, len(words))):
        na, nb = sec(nx, "startMs"), sec(nx, "endMs")
        if na - sec(wi, "endMs") > 0.9: break
        ja, jb = np.searchsorted(tt, na), np.searchsorted(tt, nb, side="right")
        if jb - ja < 2: continue
        lo2, hi2, w2 = window(na, nb)
        lf[lo2:hi2] += w2 * (0.82 - 1) * (lf[lo2:hi2] - lf[ja:jb].mean())

newpt = call("Create PitchTier", "p", 0, dur)
for t_, v_ in zip(tt, np.exp(lf)): call(newpt, "Add point", float(t_), float(v_))
call([newpt, manip], "Replace pitch tier")

# duration: a piecewise factor on a 5 ms grid (cue lines x focused words, 30 ms ramps), one tier from it, so the
# time map below is exactly what Praat stretched
grid = np.arange(0, dur, 0.005)
factor = np.ones_like(grid)
def ramp(a, b, f, r=0.03):
    return 1 + (f - 1) * np.clip(np.minimum((grid - (a - r)) / r, ((b + r) - grid) / r), 0, 1)
for (a, b, f) in spans: factor *= ramp(a, b, f)
for wi in {f[0] for f in focus}: factor *= ramp(sec(wi, "startMs"), sec(wi, "endMs"), STRETCH.get(wi, 1.15))
dt = call("Create DurationTier", "d", 0, dur)
keep = np.r_[True, np.abs(np.diff(factor)) > 1e-6] | np.r_[np.abs(np.diff(factor)) > 1e-6, True]
for t_, v_ in zip(grid[keep], factor[keep]): call(dt, "Add point", float(t_), float(v_))
call([dt, manip], "Replace duration tier")
out = call(manip, "Get resynthesis (overlap-add)")
out.scale_peak(0.97)
out.save(wav_out, "WAV")

new_t = np.concatenate([[0.0], np.cumsum(factor) * 0.005])
json.dump({"old": [0.0] + list(grid + 0.005), "new": list(new_t)}, open(map_path, "w"))
print(json.dumps({"focus_words": len(focus), "cues": len(cues), "old_s": round(dur, 2), "new_s": round(out.get_total_duration(), 2)}))
