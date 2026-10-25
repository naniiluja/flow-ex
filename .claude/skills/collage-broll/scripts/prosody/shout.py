# Retime one short shouted quote (e.g. “Đánh!”) from the AUDIO, not from whisper's word times.
# narrate-expressive gives a quote after a colon its own Vbee block, which leaves ~1.6 s of silence before it, and
# Vbee runs the next sentence straight on after a one-word quote. whisper also timed the shout ~0.8 s early, so
# pauses.py looked for the pause in the wrong place. Here: the longest quiet run near the word is the gap before
# it (trimmed to BEFORE). Vbee slurs a one-word shout into the next word with NO energy dip ("Đánh" was 0.28 s, the
# deepest dip 0.6 s after onset sat inside "Lính"), so the split time is given by hand, found by cutting candidates
# and running whisper on both halves until the head hears only the shout and the tail starts on the next word.
# Usage: python3 shout.py <timeline.json> <in.wav> <out.wav> <out_timeline.json> <word> <split_s> [before=.7] [after=.6]
import json, sys, wave
import numpy as np
tl_path, wav_in, wav_out, tl_out, word = sys.argv[1:6]
SPLIT = float(sys.argv[6])
BEFORE = float(sys.argv[7]) if len(sys.argv) > 7 else .7
AFTER = float(sys.argv[8]) if len(sys.argv) > 8 else .6
T = json.load(open(tl_path)); W = T["words"]
w = wave.open(wav_in); sr = w.getframerate(); ch = w.getnchannels()
x = np.frombuffer(w.readframes(w.getnframes()), np.int16).reshape(-1, ch).astype(np.int32)
mono = np.abs(x).mean(1); hop = sr // 100
env = np.array([mono[i:i + hop].mean() for i in range(0, len(mono) - hop, hop)])
quiet = env < np.percentile(env, 90) * .06
key = lambda t: t.strip().strip("“”\"'.,:!?")
idx = [i for i, x_ in enumerate(W) if key(x_["text"]) == word]
if len(idx) != 1: raise SystemExit(f"expected one '{word}', found {len(idx)}")
i = idx[0]
a, b = int(W[i - 1]["startMs"] / 10), int(W[i]["startMs"] / 10 + 150)   # search window, 10 ms frames
runs, s = [], None
for f in range(a, b + 1):
    if quiet[f] and s is None: s = f
    if not quiet[f] and s is not None: runs.append((s, f)); s = None
g0, onset = max(runs, key=lambda r: r[1] - r[0])
dip = int(round(SPLIT * 100))
fade = np.linspace(1, 0, int(.015 * sr))[:, None]   # 15 ms each side of the split: no click
cut = max(0, (onset - g0) - int(BEFORE * 100))
print(f"gap before '{word}' {(onset - g0) / 100:.2f}s -> {BEFORE:.2f}s, shout {onset / 100:.2f}-{dip / 100:.2f}s, +{AFTER:.2f}s after")
head, tail = x[(g0 + cut // 2 + cut) * hop:dip * hop].astype(float), x[dip * hop:].astype(float)
head[-len(fade):] *= fade; tail[:len(fade)] *= fade[::-1]
y = np.concatenate([x[:(g0 + cut // 2) * hop], head, np.zeros((int(AFTER * sr), ch)), tail]).astype(np.int16)
with wave.open(wav_out, "wb") as o:
    o.setnchannels(ch); o.setsampwidth(2); o.setframerate(sr); o.writeframes(y.tobytes())
on_ms, end_ms, sh = (onset - cut) * 10, (dip - cut) * 10, (AFTER * 1000 - cut * 10)
W[i]["startMs"], W[i]["endMs"] = on_ms, end_ms
for wd in W[i + 1:]:   # whisper put the next word inside the shout; anchor it after the inserted silence
    wd["startMs"] = max(round(wd["startMs"] + sh), end_ms + round(AFTER * 1000)); wd["endMs"] = max(round(wd["endMs"] + sh), wd["startMs"] + 1)
T["durationMs"] = round(len(y) / sr * 1000); json.dump(T, open(tl_out, "w"), ensure_ascii=False, indent=1)
