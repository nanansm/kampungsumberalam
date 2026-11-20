"""Grade "Sejuk Hijau IG" — tarik foto/video web KSA ke karakter feed IG @kampungsumberalam (Nov 2026).

Prinsip: ukur sumber -> hitung parameter -> terapkan fungsi per-piksel (jadi bisa dibakar ke .cube).
Urutan fungsi:
  1. Kurva luma (p05/p50/p95 sumber -> target, kekuatan k_tone), highlight roll-off supaya tidak jebol.
  2. White balance per zona di Lab (shadow/mid/high), dihitung dari piksel netral (chroma < 12).
     Kulit (hue 10–45°, sat 0.15–0.6) hanya kena 50 %.
  3. Daun: hue 60–170° diputar ke target (maks ±30°), saturasi daun dikali ke target.
  4. Saturasi global dikali ke target (sekitar luma, tidak menggeser terang).

Pakai:
  python3 grade.py target  <target.json> <img...>                      # ukur acuan IG
  python3 grade.py fit     <target.json> <param.json> <img...> [--k 0.8] [--malam]
  python3 grade.py apply   <param.json> <in> <out>
  python3 grade.py cube    <param.json> <out.cube> [--size 33]
"""
import sys, json, math
import numpy as np
from PIL import Image, ImageOps
from skimage import color

ZONA = {"shadow": (0, 35), "mid": (35, 72), "high": (72, 101)}


def muat(f, maks=1080):
    im = ImageOps.exif_transpose(Image.open(f)).convert("RGB")
    im.thumbnail((maks, maks), Image.LANCZOS)
    return np.asarray(im).astype(np.float32) / 255


def luma(a):
    return 0.2126 * a[..., 0] + 0.7152 * a[..., 1] + 0.0722 * a[..., 2]


def stat(a):
    ok = a.min(-1) < 0.96
    Y = luma(a)
    lab = color.rgb2lab(a)
    hsv = color.rgb2hsv(a)
    H, S, V = hsv[..., 0] * 360, hsv[..., 1], hsv[..., 2]
    chroma = np.hypot(lab[..., 1], lab[..., 2])
    m = {k: float(v) for k, v in zip(["p05", "p50", "p95"], np.percentile(Y, [5, 50, 95]))}
    m["sat"] = float(S[ok].mean())
    for z, (lo, hi) in ZONA.items():
        n = (lab[..., 0] >= lo) & (lab[..., 0] < hi) & (chroma < 12) & ok
        m[f"n_{z}"] = int(n.sum())
        m[f"a_{z}"] = float(lab[..., 1][n].mean()) if n.sum() > 300 else None
        m[f"b_{z}"] = float(lab[..., 2][n].mean()) if n.sum() > 300 else None
    d = (H >= 55) & (H <= 160) & (S > 0.18) & (V > 0.12) & ok
    m["daun_hue"] = float(H[d].mean()) if d.sum() > 300 else None
    m["daun_sat"] = float(S[d].mean()) if d.sum() > 300 else None
    return m


def rata(ms):
    out = {}
    for k in ms[0]:
        v = [m[k] for m in ms if m.get(k) is not None]
        out[k] = float(np.mean(v)) if v else None
    return out


# ---------- fungsi per-piksel ----------

def pchip(x, xs, ys):
    from scipy.interpolate import PchipInterpolator
    return PchipInterpolator(xs, ys)(x)


def f_tone(a, P):
    t = P.get("tone")
    if not t:
        return a
    Y = luma(a)
    xs = [0, t["s05"], t["s50"], t["s95"], 1.0]
    ys = [0, t["t05"], t["t50"], t["t95"], t.get("putih", 0.985)]
    Y2 = np.clip(pchip(np.clip(Y, 0, 1), xs, ys), 0, 1)
    r = np.where(Y > 1e-4, Y2 / np.maximum(Y, 1e-4), 1)[..., None]
    out = a * r
    # roll-off: kanal yang lewat 1 dilipat ke arah luma supaya tidak jebol berwarna
    mx = out.max(-1, keepdims=True)
    lebih = np.clip(mx - 1, 0, None)
    Yo = luma(out)[..., None]
    w = np.clip(lebih / np.maximum(mx - Yo, 1e-4), 0, 1)
    out = out + (Yo - out) * w
    return np.clip(out, 0, 1)


def bobot_zona(L):
    # bobot halus per zona dari L* (0..100)
    sh = np.clip((45 - L) / 20, 0, 1)
    hi = np.clip((L - 62) / 20, 0, 1)
    mid = np.clip(1 - sh - hi, 0, 1)
    return {"shadow": sh, "mid": mid, "high": hi}


def f_wb(a, P):
    wb = P.get("wb")
    if not wb:
        return a
    lab = color.rgb2lab(a)
    hsv = color.rgb2hsv(a)
    H, S = hsv[..., 0] * 360, hsv[..., 1]
    kulit = ((H > 8) & (H < 48) & (S > 0.15) & (S < 0.65)).astype(np.float32)
    lindung = 1 - 0.5 * kulit
    W = bobot_zona(lab[..., 0])
    da = sum(W[z] * wb[z][0] for z in W) * lindung
    db = sum(W[z] * wb[z][1] for z in W) * lindung
    lab[..., 1] += da
    lab[..., 2] += db
    return np.clip(color.lab2rgb(lab), 0, 1)


def f_daun(a, P):
    d = P.get("daun")
    if not d:
        return a
    hsv = color.rgb2hsv(a)
    H, S = hsv[..., 0] * 360, hsv[..., 1]
    # keanggotaan: naik 55->70, penuh 70->150, turun 150->165 (air kolam toska ~170+ tidak ikut) ; dan sat > 0.12
    mh = np.clip((H - 55) / 15, 0, 1) * np.clip((165 - H) / 15, 0, 1)
    ms = np.clip((S - 0.08) / 0.12, 0, 1)
    w = mh * ms
    H2 = H + d["geser"] * w
    S2 = S * (1 + (d["sat"] - 1) * w)
    hsv[..., 0] = (H2 % 360) / 360
    hsv[..., 1] = np.clip(S2, 0, 1)
    return np.clip(color.hsv2rgb(hsv), 0, 1)


def f_sat(a, P):
    s = P.get("sat", 1.0)
    Y = luma(a)[..., None]
    if s > 1:
        # merah genteng (hue 345–20°) hanya ikut 40 % kenaikan, supaya atap rumah warga tidak menyala
        H = color.rgb2hsv(a)[..., 0] * 360
        merah = np.clip(1 - np.minimum(np.abs(((H + 180) % 360) - 180 - 2) / 18, 1), 0, 1)
        s = (1 + (s - 1) * (1 - 0.6 * merah))[..., None]
    return np.clip(Y + (a - Y) * s, 0, 1)


def terapkan(a, P, sampai=4):
    fs = [f_tone, f_wb, f_daun, f_sat][:sampai]
    for f in fs:
        a = f(a, P)
    k = P.get("campur", 1.0)
    return a


def terapkan_campur(a0, P):
    a = terapkan(a0, P)
    k = P.get("campur", 1.0)
    return a0 + (a - a0) * k if k < 1 else a


# ---------- fit ----------

def fit(T, frames, k=0.8, malam=False):
    P = {"k": k, "malam": malam}
    S0 = rata([stat(a) for a in frames])
    if not malam:
        P["tone"] = {"s05": S0["p05"], "s50": S0["p50"], "s95": S0["p95"],
                     "t05": S0["p05"] + float(np.clip(k * (T["p05"] - S0["p05"]), -0.05, 0.05)),
                     "t50": S0["p50"] + float(np.clip(k * (T["p50"] - S0["p50"]), -0.08, 0.08)),
                     "t95": S0["p95"] + float(np.clip(k * (T["p95"] - S0["p95"]), -0.06, 0.06)), "putih": 0.985}
        # batas geser: adegan terang/gelap karena isinya (langit, kolam) tidak dipaksa ke rata-rata IG
        # jaga monoton
        t = P["tone"]
        t["t05"] = max(0.01, t["t05"]); t["t50"] = max(t["t05"] + 0.05, t["t50"]); t["t95"] = min(max(t["t50"] + 0.1, t["t95"]), 0.97)
    fr = [f_tone(a, P) for a in frames]
    S1 = rata([stat(a) for a in fr])
    kw = k * (0.5 if malam else 1.0)
    wb = {}
    for z in ZONA:
        if S1[f"a_{z}"] is None or T[f"a_{z}"] is None:
            wb[z] = [0.0, 0.0]
            continue
        da = np.clip(T[f"a_{z}"] - S1[f"a_{z}"], -6, 6) * kw
        db = np.clip(T[f"b_{z}"] - S1[f"b_{z}"], -8, 8) * kw
        wb[z] = [float(da), float(db)]
    P["wb"] = wb
    fr = [f_wb(a, P) for a in fr]
    S2 = rata([stat(a) for a in fr])
    if S2["daun_hue"] is not None:
        P["daun"] = {"geser": float(np.clip((T["daun_hue"] - S2["daun_hue"]) * k, -8, 30)),
                     "sat": float(np.clip(1 + k * (T["daun_sat"] / S2["daun_sat"] - 1), 0.8, 1.45))}
        fr = [f_daun(a, P) for a in fr]
    S3 = rata([stat(a) for a in fr])
    sf = 1 + k * (T["sat"] / max(S3["sat"], 1e-3) - 1)
    P["sat"] = float(np.clip(sf, 0.8, 1.5) if not malam else np.clip(sf, 0.9, 1.15))
    P["ukur_sumber"] = S0
    return P


def tulis_cube(P, out, n=33):
    g = np.linspace(0, 1, n, dtype=np.float32)
    b, gg, r = np.meshgrid(g, g, g, indexing="ij")  # r tercepat
    rgb = np.stack([r, gg, b], -1).reshape(1, -1, 3)
    o = terapkan_campur(rgb, P).reshape(-1, 3)
    with open(out, "w") as fh:
        fh.write(f'TITLE "KSA Sejuk Hijau IG"\nLUT_3D_SIZE {n}\nDOMAIN_MIN 0 0 0\nDOMAIN_MAX 1 1 1\n')
        for v in o:
            fh.write(f"{v[0]:.6f} {v[1]:.6f} {v[2]:.6f}\n")


if __name__ == "__main__":
    cmd = sys.argv[1]
    opt = sys.argv[2:]
    args, skip = [], False
    for i, x in enumerate(opt):
        if skip:
            skip = False
            continue
        if x in ("--k", "--campur", "--size"):
            skip = True
            continue
        if x.startswith("--"):
            continue
        args.append(x)
    k = float(opt[opt.index("--k") + 1]) if "--k" in opt else 0.8
    if cmd == "target":
        T = rata([stat(muat(f)) for f in args[1:]])
        json.dump(T, open(args[0], "w"), indent=1)
        print(json.dumps(T, indent=1))
    elif cmd == "fit":
        T = json.load(open(args[0]))
        P = fit(T, [muat(f, 900) for f in args[2:]], k=k, malam="--malam" in opt)
        if "--campur" in opt:
            P["campur"] = float(opt[opt.index("--campur") + 1])
        json.dump(P, open(args[1], "w"), indent=1)
        print(json.dumps({x: P[x] for x in P if x != "ukur_sumber"}, indent=1))
    elif cmd == "apply":
        P = json.load(open(args[0]))
        im = ImageOps.exif_transpose(Image.open(args[1])).convert("RGB")
        a = np.asarray(im).astype(np.float32) / 255
        o = terapkan_campur(a, P)
        Image.fromarray((o * 255 + 0.5).astype(np.uint8)).save(args[2], quality=92)
    elif cmd == "cube":
        P = json.load(open(args[0]))
        n = int(opt[opt.index("--size") + 1]) if "--size" in opt else 33
        tulis_cube(P, args[1], n)
