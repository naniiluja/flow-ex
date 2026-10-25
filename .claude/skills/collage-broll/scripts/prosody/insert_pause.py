# Insert silence at hand-verified cut points (for boundaries pauses.py had to skip because whisper mishears the words
# on both sides, e.g. "tin. Bước" heard as "tính bước", "Linh. Linh" heard as "lên. nên"). Choose each cut by cutting
# candidates and running whisper on both halves; this tool only applies them: 8 ms fades at the cut, zeros inserted,
# every word starting after a cut shifted by the inserted time.
# Usage: python insert_pause.py <in.wav> <timeline.json> <out.wav> <out_timeline.json> <t_s:dur_s> [<t_s:dur_s> ...]
import json, sys, wave
import numpy as np
wi, ti, wo, to = sys.argv[1:5]
cuts = sorted((float(a), float(b)) for a, b in (c.split(':') for c in sys.argv[5:]))
w = wave.open(wi); sr = w.getframerate(); ch = w.getnchannels()
x = np.frombuffer(w.readframes(w.getnframes()), np.int16).reshape(-1, ch).astype(float)
ramp = np.linspace(1, 0, int(.008 * sr))[:, None]
out, last = [], 0
for t, d in cuts:
    at = int(t * sr); seg = x[last:at].copy()
    if last: seg[:len(ramp)] *= ramp[::-1]
    seg[-len(ramp):] *= ramp
    out += [seg, np.zeros((int(d * sr), ch))]; last = at
tail = x[last:].copy(); tail[:len(ramp)] *= ramp[::-1]; out.append(tail)
y = np.concatenate(out).astype(np.int16)
with wave.open(wo, 'wb') as o: o.setnchannels(ch); o.setsampwidth(2); o.setframerate(sr); o.writeframes(y.tobytes())
T = json.load(open(ti))
for wd in T['words']:
    s = sum(d for t, d in cuts if t * 1000 <= wd['startMs']) * 1000
    wd['startMs'] = round(wd['startMs'] + s); wd['endMs'] = round(wd['endMs'] + s)
T['durationMs'] = round(len(y) / sr * 1000); json.dump(T, open(to, 'w'), ensure_ascii=False, indent=1)
print(len(cuts), 'pauses inserted,', round(len(x) / sr, 2), '->', round(len(y) / sr, 2), 's')
