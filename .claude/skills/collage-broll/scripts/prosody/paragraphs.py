"""Recovers which scenes open a paragraph, from the silence at each scene boundary of an
already-narrated story (a paragraph break is a longer pause than a sentence break).

  python paragraphs.py <audio.wav> <timeline.json> [threshold_s]  ->  JSON list of scene indices
"""
import json, sys
import numpy as np
from scipy.io import wavfile

wav, timeline_path = sys.argv[1], sys.argv[2]
threshold = float(sys.argv[3]) if len(sys.argv) > 3 else 0.62
fs, x = wavfile.read(wav)
x = x.astype(np.float64) / 32768.0
hop = int(fs * 0.005)
n = len(x) // hop
db = np.array([20 * np.log10(np.sqrt(np.mean(x[i * hop:(i + 1) * hop] ** 2)) + 1e-9) for i in range(n)])
quiet = db < -40
timeline = json.load(open(timeline_path))
lengths = []
for i, scene in enumerate(timeline["scenes"]):
    if i == 0:
        lengths.append(None); continue
    c = int(scene["startMs"] / 1000 / (hop / fs))
    lo, hi = max(0, c - 100), min(n, c + 100)          # look 0.5 s either side
    best = 0
    j = lo
    while j < hi:
        if quiet[j]:
            k = j
            while k < n and quiet[k]: k += 1
            if k > lo and j < hi: best = max(best, (k - j) * hop / fs)
            j = k
        else:
            j += 1
    lengths.append(best)
starts = [0] + [i for i, v in enumerate(lengths) if v is not None and v >= threshold]
print(json.dumps({"starts": starts, "lengths": [None if v is None else round(v, 2) for v in lengths]}))
