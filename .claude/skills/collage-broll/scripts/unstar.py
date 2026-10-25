# Remove Flow's Gemini star (a semi-transparent white logo alpha-blended at a fixed spot) by INVERTING the blend:
# seen = a * 255 + (1 - a) * under  ->  under = (seen - a * 255) / (1 - a). The alpha map is measured once on a plate
# whose corner is a flat colour, so lines and objects under the star survive (a copied patch broke wheels and edges).
# Usage: python unstar.py measure <flat_plate.jpg> <alpha.npy> | python unstar.py apply <alpha.npy> <in> <out>
import sys
import numpy as np
from PIL import Image
from scipy import ndimage
S = 96                                   # analysed box, bottom-right, around the star
def box(im):
    a = np.asarray(im.convert("RGB")).astype(float); h, w = a.shape[:2]
    return a, (h - 160 + 63 - S // 2, w - 160 + 63 - S // 2)
if sys.argv[1] == "measure":
    a, (y0, x0) = box(Image.open(sys.argv[2])); c = a[y0:y0 + S, x0:x0 + S].mean(2)
    yy, xx = np.mgrid[0:S, 0:S] - S // 2; r = np.hypot(yy, xx)
    bg = np.median(c[(r > 30) & (r < 40)])              # flat ring just outside the 48 px star
    alpha = np.clip((c - bg) / (255 - bg), 0, .95)
    alpha[(alpha < .02) | (r > 30)] = 0                 # only the star itself, not the plate's own lines
    np.save(sys.argv[3], alpha)
    ys, xs = np.nonzero(alpha > .05); print("bg", round(bg), "alpha max", round(alpha.max(), 3), "star box", xs.min(), ys.min(), xs.max(), ys.max())
else:
    alpha = np.load(sys.argv[2]); a, (y0, x0) = box(Image.open(sys.argv[3]))
    best = None   # the star can sit a pixel off: pick the shift that leaves the smoothest result. Gain stays 1.0: two
    # automatic gain searches (residue score, decorrelation score) both left the star visible on most plates.
    reg = a[y0:y0 + S, x0:x0 + S]
    for dy in range(-2, 3):
        for dx in range(-2, 3):
            al = np.roll(np.roll(alpha, dy, 0), dx, 1)[..., None]
            fix = np.clip((reg - al * 255) / (1 - al), 0, 255)
            rough = np.abs(ndimage.laplace(fix.mean(2)))[al[..., 0] > .05].mean()
            if best is None or rough < best[0]: best = (rough, fix)
    fix = best[1]
    # dividing by (1 - a) amplifies JPEG noise and leaves a faint rim on bright plates: a 3x3 median, only where the
    # star was (mask grown 2 px), smooths both without touching the rest of the plate
    m = ndimage.binary_dilation(alpha > .02, iterations=2)[..., None]
    med = np.stack([ndimage.median_filter(fix[..., k], 3) for k in range(3)], 2)
    # a wider median on the star's soft edge was tried for the faint rim on bright plates: it broke tile lines and
    # wood edges into dots, so it was dropped; the rim that remains is a few levels of brightness, at the frame edge
    a[y0:y0 + S, x0:x0 + S] = np.where(m, med, fix)
    Image.fromarray(a.astype(np.uint8)).save(sys.argv[4], quality=95)
