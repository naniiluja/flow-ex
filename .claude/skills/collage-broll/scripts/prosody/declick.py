"""Cleans the splices Vbee leaves where it joins paragraph pieces: exact silence in long gaps (the faint
hiss before a restart is removed) plus a 15 ms fade on both sides.

  python declick.py <in.wav> <out.wav>  ->  JSON {cleaned, gaps:[[start_s, end_s], ...]} (gaps >= 0.6 s)
"""
import json, sys
import numpy as np
from scipy.io import wavfile

src, dst = sys.argv[1], sys.argv[2]
MIN_GAP = 0.15      # s: only gaps this long are splices worth cleaning
FADE = 0.015        # s
THR = -40.0         # dB: below this counts as gap (includes the faint hiss Vbee leaves at joins)
fs, x = wavfile.read(src)
x = x.astype(np.float64) / 32768.0
hop = int(fs * 0.005)
n = len(x) // hop
db = np.array([20 * np.log10(np.sqrt(np.mean(x[i * hop:(i + 1) * hop] ** 2)) + 1e-9) for i in range(n)])
quiet = db < THR
i, cleaned, hiss, gaps = 0, 0, [], []
while i < n:
    if quiet[i]:
        j = i
        while j < n and quiet[j]: j += 1
        if (j - i) * hop / fs >= MIN_GAP:
            a, b = i * hop, min(j * hop, len(x))
            if np.max(np.abs(x[a:b])) > 1e-5: hiss.append((round(a / fs, 2), round(20 * np.log10(np.max(np.abs(x[a:b])) + 1e-9), 1)))
            x[a:b] = 0.0                                   # exact digital silence in long gaps
            f = int(FADE * fs)
            if a - f >= 0: x[a - f:a] *= np.linspace(1, 0, f)  # fade out the voice before the gap
            if b + f <= len(x): x[b:b + f] *= np.linspace(0, 1, f)  # fade in the voice after the gap
            cleaned += 1
            if (j - i) * hop / fs >= 0.6: gaps.append([round(a / fs, 3), round(b / fs, 3)])
        i = j
    else:
        i += 1
wavfile.write(dst, fs, (np.clip(x, -0.99, 0.99) * 32767).astype(np.int16))
print(json.dumps({"cleaned": cleaned, "gaps": gaps}))
