# Machine half of the script review: "Hướng dẫn viết văn tiếng Việt chuẩn" §14 + script-writing.md / script-review.md.
# Usage: python3 check_script.py story.md
import re, sys, unicodedata
t = open(sys.argv[1]).read().split("\n", 1)[1]
paras = [p for p in t.split("\n") if p.strip()]
sents = [s for p in paras for s in re.split(r"(?<=[.!?])\s+", p) if s.strip()]
syl = lambda s: len(re.findall(r"[^\W\d_]+", s))
L = [syl(s) for s in sents]
out = []
out.append(f"NFC: {t == unicodedata.normalize('NFC', t)} | em-dash: {t.count('—')} | digits: {re.findall(r'\\d+', t)}")
out.append(f"words {len(t.split())} | sentences {len(sents)} | 10-25 syl: {sum(10 <= l <= 25 for l in L) / len(L):.0%} | <10: {sum(l < 10 for l in L) / len(L):.0%}")
for s, l in zip(sents, L):
    if l > 30: out.append(f"  >30 syl ({l}): {s}")
run = 0
for s, l in zip(sents, L):
    run = run + 1 if l < 10 else 0
    if run == 4: out.append(f"  4+ short sentences in a row, ending: {s}")
old = re.findall(r"\b\w*(?:òa|óa|ỏa|õa|ọa|òe|óe|ỏe|õe|ọe|ùy|úy|ủy|ũy|ụy)\b", t, re.I)
out.append(f"old-style tone marks: {old}")
out.append(f"i/y: tỉ/kĩ/lí {re.findall(r'\\b(?:tỉ|kĩ|lí)\\b', t)} vs tỷ/kỹ/lý {re.findall(r'\\b(?:tỷ|kỹ|lý)\\b', t)}")
for pat in [r"\bđược\b", r"\bbởi\b", r"(?:^|[.!?]\s)(?:Việc|Sự)\s", r"\bTrong quá trình\b", r"\bmột cách\b", r"\bđã\b", r"\bđang\b", r"\bsẽ\b",
            r"Ngoài ra|Bên cạnh đó|Hơn nữa", r"\bnhưng tuy nhiên\b|\bbởi vì do\b", r"\bcủa\b[^.,]*\bcủa\b", r"\bnó\b"]:
    hits = [s for s in sents if re.search(pat, s)]
    if hits: out.append(f"{pat}: {len(hits)}\n    " + "\n    ".join(hits))
two_thi = [s for s in sents if len(re.findall(r"\bthì\b", s)) > 1]
out.append(f"sentences with 2+ 'thì': {two_thi}")
eng = re.findall(r"\b[A-Za-z]{2,}\b", t)
out.append(f"ascii-only words (English?): {sorted(set(w for w in eng if not re.search(r'[^a-z]', w.lower())) - set())}")
print("\n".join(out))
