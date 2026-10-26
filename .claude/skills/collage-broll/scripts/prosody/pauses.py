# Guarantee a real pause at every sentence end. Vbee swallows the pause after a short sentence (<= 4 words) and
# often gives a full stop only a comma's 0.2 s; its colon pause is anywhere from 0 to 0.26 s (voice-tuning.md).
# For each script word ending in . ! ? (timed by the narration's timeline), take the LONGEST quiet run within
# +-0.5 s of whisper's boundary, measure it, and insert zeros up to the target (8 ms fades at the cut). Word times
# after the insert are shifted, so captions and lip-sync stay in sync.
# When the window holds no real pause (Vbee swallowed it) the insert point is VERIFIED by ear-proxy: each energy
# dip within 0.8 s of whisper's boundary is cut, both halves go through whisper.cpp, and the first cut whose head
# ends on the sentence's last word and whose tail starts on the next word wins. Without this the quietest frame
# fell mid-word ("bắt sống" lost "sống", "Ô Mã | Nhi"). Unverifiable boundaries are skipped and reported.
# Usage: python3 pauses.py <timeline.json> <in.wav> <out.wav> <out_timeline.json> [target_s=0.45]
# Needs WHISPER_DIR (folder holding whisper.cpp `main` + ggml-medium.bin) for the verified path.
import json, os, subprocess, sys, tempfile, unicodedata, wave
import numpy as np
tl_path, wav_in, wav_out, tl_out = sys.argv[1:5]
TARGET = float(sys.argv[5]) if len(sys.argv) > 5 else .45
T = json.load(open(tl_path)); W = T["words"]
w = wave.open(wav_in); sr = w.getframerate(); ch = w.getnchannels()
x = np.frombuffer(w.readframes(w.getnframes()), np.int16).reshape(-1, ch).astype(np.int32)
mono = np.abs(x).mean(1)
hop = sr // 100
env = np.array([mono[i:i + hop].mean() for i in range(0, len(mono) - hop, hop)])
quiet = env < np.percentile(env, 90) * .06          # ~ -24 dB under loud speech
WH = os.environ.get("WHISPER_DIR")
def fold(t):
    t = unicodedata.normalize("NFD", t.lower().replace("đ", "d"))
    return "".join(c for c in t if c.isalnum() and not unicodedata.combining(c))
def heard(a, b):
    with tempfile.NamedTemporaryFile(suffix=".wav") as f:
        seg = x[max(0, a):b, 0].astype(float)                     # whisper.cpp only reads 16 kHz
        seg = np.interp(np.arange(int(len(seg) * 16000 / sr)) * sr / 16000, np.arange(len(seg)), seg).astype(np.int16)
        with wave.open(f.name, "wb") as o: o.setnchannels(1); o.setsampwidth(2); o.setframerate(16000); o.writeframes(seg.tobytes())
        r = subprocess.run([f"{WH}/main", "-m", f"{WH}/ggml-medium.bin", "-l", "vi", "-nt", "-f", f.name], capture_output=True, text=True)
    return [fold(t) for t in r.stdout.split() if fold(t)]
def near(a, b):
    if a == b: return True
    if abs(len(a) - len(b)) > 1 or min(len(a), len(b)) < 2: return False
    d = [[i + j if i * j == 0 else 0 for j in range(len(b) + 1)] for i in range(len(a) + 1)]
    for i in range(1, len(a) + 1):
        for j in range(1, len(b) + 1): d[i][j] = min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] != b[j - 1]))
    return d[-1][-1] <= 1
def verified_cut(i):
    if not WH: return None
    c = int(W[i]["endMs"] / 10); lo, hi = max(1, c - 80), min(len(env) - 2, c + 80)
    dips = [f for f in range(lo, hi) if env[f] <= env[f - 1] and env[f] <= env[f + 1]]
    last, nxt = fold(W[i]["text"]), fold(W[i + 1]["text"])
    for f in sorted(dips, key=lambda f: env[f])[:10]:
        h, t = heard(f * hop - int(1.2 * sr), f * hop), heard(f * hop, f * hop + int(1.2 * sr))
        # whisper often mishears one letter of a short word ("tin" as "tính"): accept an edit distance of one on the
        # diacritic-folded forms; a cut inside a word still fails, since one half then ends or starts on a fragment
        if h and t and near(h[-1], last) and near(t[0], nxt): return f
    return None
inserts = []                                         # (sample index, samples to add)
for i in range(len(W) - 1):
    if not W[i]["text"].strip().rstrip("”\"'").endswith((".", "!", "?")): continue
    a = int(max(0, W[i]["endMs"] / 10 - 50)); b = int(min(len(env) - 1, W[i + 1]["startMs"] / 10 + 50))
    if b <= a: continue
    # the LONGEST quiet run in the window, not the single quietest frame: whisper times words early OR late, so the window
    # reaches into the next word, and the quietest frame there was the 40 ms closure of the "t" in "Thái tử" (the
    # inserted pause landed between "Thái" and "tử", heard as a stall: whisper put "nước." 0.24 s late, the real gap sat
    # before the old 150 ms window; "sống." was 0.25 s early). The window reaches 500 ms both ways; ties go to the
    # run nearest the sentence end.
    runs, f = [], a
    while f <= b:
        if quiet[f]:
            l = f
            while l > 0 and quiet[l - 1]: l -= 1
            r = f
            while r < len(quiet) - 1 and quiet[r + 1]: r += 1
            runs.append((l, r)); f = r + 1
        else: f += 1
    l, r = max(runs, key=lambda q: (q[1] - q[0], -abs(q[0] * 10 - W[i]["endMs"]))) if runs else (0, -1)
    m, have = (l + r) // 2, (r - l + 1) / 100
    if have < .15:                                   # no real pause found: only cut where whisper confirms the boundary
        f = verified_cut(i)
        if f is None:
            print(f"  SKIP '{W[i]['text'].strip()}' -> '{W[i + 1]['text'].strip()}': no verified boundary"); continue
        m, have = f, 0
    if have < TARGET:
        inserts.append((m * hop, int((TARGET - have) * sr), W[i]["text"].strip(), have))
out, last = [], 0
ramp = np.linspace(1, 0, int(.008 * sr))[:, None]     # 8 ms fades: a verified cut can still sit inside a voiced sound
# two sentence ends can resolve to the same quiet run (a 1-2 word sentence): keep one insert per cut point
kept, prev = [], 0
for q in sorted({at: (at, n, w, h) for at, n, w, h in sorted(inserts, key=lambda q: q[1])}.values()):
    if q[0] - prev >= 2 * len(ramp): kept.append(q); prev = q[0]   # closer than the two fades: the first insert covers it
inserts = kept
for at, n, word, have in inserts:
    seg = x[last:at].astype(float)
    if last: seg[:len(ramp)] *= ramp[::-1]
    seg[-len(ramp):] *= ramp
    out += [seg.astype(np.int32), np.zeros((n, ch), np.int32)]; last = at
    print(f"  +{n / sr:.2f}s after '{word}' (had {have:.2f}s)")
tail = x[last:].astype(float)
if last: tail[:len(ramp)] *= ramp[::-1]
out.append(tail.astype(np.int32))
y = np.concatenate(out).astype(np.int16)
with wave.open(wav_out, "wb") as o:
    o.setnchannels(ch); o.setsampwidth(2); o.setframerate(sr); o.writeframes(y.tobytes())
for wd in W:                                          # shift word times past each insert
    s = sum(n for at, n, *_ in inserts if at / sr * 1000 <= wd["startMs"]) / sr * 1000
    wd["startMs"] = round(wd["startMs"] + s); wd["endMs"] = round(wd["endMs"] + s)
T["durationMs"] = round(len(y) / sr * 1000); json.dump(T, open(tl_out, "w"), ensure_ascii=False, indent=1)
print(f"{len(inserts)} pauses fixed, {len(x) / sr:.1f}s -> {len(y) / sr:.1f}s")
