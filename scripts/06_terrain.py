"""Terrain for the Motion city: real elevation grid (Open-Meteo), Potomac + bridges, parks, city blocks.
Everything is projected with the same isometric transform as the stations in data/motion/city.json."""
import json, math, pathlib, time, urllib.error, urllib.request
import numpy as np, pandas as pd
ROOT = pathlib.Path(__file__).resolve().parents[1]
city = json.loads((ROOT / "data/motion/city.json").read_text())
d = json.loads((ROOT / "data/dashboard.json").read_text())
st = pd.DataFrame(d["stations"])
LAT0, LON0, K = 38.886, -77.060, math.cos(math.radians(38.91))
C30, S, LIFT = math.cos(math.pi / 6), 182, 2.0
uv = lambda lat, lon: ((lon - LON0) * K * 111.0, (lat - LAT0) * 111.0)
# recover the screen offsets used for the stations: x = S*C30*(u+v) + ox ; y = S*.5*(u-v) - LIFT*elev + oy
names = [s[0] for s in city["stations"]]
st["short"] = st.name.str.split(" / ").str[0]
m = st.drop_duplicates("short").set_index("short").loc[list(dict.fromkeys(names))]
u, v = uv(m.lat.values, m.lon.values)
first = {}
[first.setdefault(s[0], s) for s in city["stations"]]
xs = np.array([first[n][2] for n in m.index]); ys = np.array([first[n][3] for n in m.index])
ox = float(np.median(xs - S * C30 * (u + v))); oy = float(np.median(ys - S * 0.5 * (u - v) + LIFT * m.elev_m.values))
print("fit residual px", float(np.abs(xs - (S * C30 * (u + v) + ox)).max()), float(np.abs(ys - (S * .5 * (u - v) - LIFT * m.elev_m.values + oy)).max()))
proj = lambda lat, lon, e=0.0: (S * C30 * sum(uv(lat, lon)) + ox, S * .5 * (uv(lat, lon)[0] - uv(lat, lon)[1]) - LIFT * e + oy)

# lat/lon window that covers the screen (with margin for the camera)
def inv(x, y, e=30):
    a, b = (x - ox) / (S * C30), (y + LIFT * e - oy) / (S * .5)   # a=u+v, b=u-v
    uu, vv = (a + b) / 2, (a - b) / 2
    return LAT0 + vv / 111.0, LON0 + uu / (K * 111.0)
corners = [inv(x, y) for x in (-250, 2170) for y in (-250, 1330)]
lat_lo, lat_hi = min(c[0] for c in corners), max(c[0] for c in corners)
lon_lo, lon_hi = min(c[1] for c in corners), max(c[1] for c in corners)
print("window", round(lat_lo, 4), round(lat_hi, 4), round(lon_lo, 4), round(lon_hi, 4))

# elevation grid, cached
N = 36
glat, glon = np.linspace(lat_lo, lat_hi, N), np.linspace(lon_lo, lon_hi, N)
cache = ROOT / "data/gbfs/terrain_grid.json"
key = f"{lat_lo:.4f},{lat_hi:.4f},{lon_lo:.4f},{lon_hi:.4f},{N}"
E = json.loads(cache.read_text()).get(key) if cache.exists() else None
if E is None:
    pts = [(a, b) for a in glat for b in glon]; E = []
    for i in range(0, len(pts), 100):
        c = pts[i:i + 100]
        url = ("https://api.open-meteo.com/v1/elevation?latitude=" + ",".join(f"{p[0]:.5f}" for p in c) + "&longitude=" + ",".join(f"{p[1]:.5f}" for p in c))
        for k in range(6):
            try: E += json.load(urllib.request.urlopen(url))["elevation"]; break
            except urllib.error.HTTPError as e:
                if e.code != 429 or k == 5: raise
                time.sleep(15 * (k + 1))
        time.sleep(2)
    cache.write_text(json.dumps({key: E}))
E = np.array(E, float).reshape(N, N)
def elev(lat, lon):
    i = np.clip((lat - lat_lo) / (lat_hi - lat_lo) * (N - 1), 0, N - 1.001); j = np.clip((lon - lon_lo) / (lon_hi - lon_lo) * (N - 1), 0, N - 1.001)
    i0, j0 = int(i), int(j); fi, fj = i - i0, j - j0
    return float(E[i0, j0] * (1 - fi) * (1 - fj) + E[i0 + 1, j0] * fi * (1 - fj) + E[i0, j0 + 1] * (1 - fi) * fj + E[i0 + 1, j0 + 1] * fi * fj)

# water: Potomac centreline (lat, lon, half-width km) and the Tidal Basin
POT = [(38.9300, -77.1150, .16), (38.9150, -77.0950, .17), (38.9060, -77.0800, .20), (38.9030, -77.0700, .22), (38.8990, -77.0640, .26),
       (38.8930, -77.0590, .30), (38.8870, -77.0545, .34), (38.8800, -77.0480, .38), (38.8700, -77.0420, .45), (38.8550, -77.0390, .55), (38.8350, -77.0390, .60)]
def seg_dist(p, a, b):
    ax, ay = a; bx, by = b; px, py = p; dx, dy = bx - ax, by - ay
    t = max(0, min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy))); return math.hypot(px - ax - t * dx, py - ay - t * dy), t
def river_hw(lat, lon):
    p = uv(lat, lon); best = (1e9, 0)
    for (a, b) in zip(POT, POT[1:]):
        dd, t = seg_dist(p, uv(a[0], a[1]), uv(b[0], b[1]))
        if dd < best[0]: best = (dd, a[2] + t * (b[2] - a[2]))
    return best
is_water = lambda lat, lon: river_hw(lat, lon)[0] < river_hw(lat, lon)[1] or math.hypot(*np.subtract(uv(lat, lon), uv(38.8840, -77.0365))) < .28
# banks as a polygon (offset the centreline in km space)
def bank(side):
    out = []
    for k, (lat, lon, hw) in enumerate(POT):
        a = uv(*POT[max(k - 1, 0)][:2]); b = uv(*POT[min(k + 1, len(POT) - 1)][:2])
        tx, ty = b[0] - a[0], b[1] - a[1]; n = math.hypot(tx, ty); nx, ny = -ty / n, tx / n
        uu, vv = uv(lat, lon); uu += side * nx * hw; vv += side * ny * hw
        la, lo = LAT0 + vv / 111.0, LON0 + uu / (K * 111.0)
        out.append([round(c, 1) for c in proj(la, lo, 0)])
    return out
river = bank(1) + bank(-1)[::-1]
tidal = [[round(c, 1) for c in proj(38.8840 + .0025 * math.sin(a), -77.0365 + .0032 * math.cos(a), 0)] for a in np.linspace(0, 2 * math.pi, 24)]
BR = [((38.8968, -77.0690), (38.8935, -77.0560)), ((38.8853, -77.0585), (38.8880, -77.0500)), ((38.8770, -77.0470), (38.8800, -77.0380))]
bridges = [[[round(c, 1) for c in proj(*a, 2)], [round(c, 1) for c in proj(*b, 2)]] for a, b in BR]

# parks: National Mall + Rock Creek valley + Meridian Hill
ROCK = [(38.9600, -77.0500), (38.9400, -77.0520), (38.9250, -77.0500), (38.9150, -77.0530), (38.9060, -77.0560), (38.8990, -77.0580)]
def is_park(lat, lon):
    if 38.8865 < lat < 38.8915 and -77.050 < lon < -77.009: return True
    p = uv(lat, lon)
    if any(seg_dist(p, uv(*a), uv(*b))[0] < .22 for a, b in zip(ROCK, ROCK[1:])): return True
    return math.hypot(*np.subtract(p, uv(38.9215, -77.0360))) < .12

down = st[st.zone == "Downtown"]; du = np.array([uv(a, b) for a, b in zip(down.lat, down.lon)])
cells = []
STEP = 0.12   # km between block centres
uu0, vv0 = uv(lat_lo, lon_lo); uu1, vv1 = uv(lat_hi, lon_hi)
for uu in np.arange(uu0, uu1, STEP):
    for vv in np.arange(vv0, vv1, STEP):
        lat, lon = LAT0 + vv / 111.0, LON0 + uu / (K * 111.0)
        e = elev(lat, lon)
        x, y = proj(lat, lon, e)
        if not (-260 < x < 2180 and -260 < y < 1340): continue
        if is_water(lat, lon): continue
        kind = 2 if is_park(lat, lon) else (1 if np.min(np.hypot(du[:, 0] - uu, du[:, 1] - vv)) < .35 else 0)
        cells.append([round(x), round(y), kind, round(e)])
hillshade = []   # coarse grid of (x, y, elev) for the terrain tint
for a in np.linspace(lat_lo, lat_hi, 30):
    for b in np.linspace(lon_lo, lon_hi, 30):
        e = elev(a, b); x, y = proj(a, b, e)
        if -300 < x < 2220 and -300 < y < 1380 and not is_water(a, b): hillshade.append([round(x), round(y), round(e)])
city["terrain"] = {"cells": cells, "river": river, "tidal": tidal, "bridges": bridges, "relief": hillshade, "block_px": round(STEP * S, 1)}
(ROOT / "data/motion/city.json").write_text(json.dumps(city, separators=(",", ":")))
print("cells", len(cells), "kinds", pd.Series([c[2] for c in cells]).value_counts().to_dict(), "relief", len(hillshade),
      "elev range", round(E.min()), round(E.max()), "KB", len(json.dumps(city)) // 1024)
