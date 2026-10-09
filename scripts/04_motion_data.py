"""Isometric city data for the Motion film: stations, a typical-weekday set of hill rides, stock curves."""
import json, math, pathlib, random, duckdb, numpy as np, pandas as pd
ROOT = pathlib.Path(__file__).resolve().parents[1]
d = json.loads((ROOT / "data/dashboard.json").read_text())
st = pd.DataFrame(d["stations"])
LAT0, LAT1, LON0, LON1 = 38.886, 38.940, -77.060, -77.010
st = st[st.lat.between(LAT0, LAT1) & st.lon.between(LON0, LON1)].reset_index(drop=True)
k = math.cos(math.radians(38.91))
u = (st.lon - LON0) * k * 111.0   # km east
v = (st.lat - LAT0) * 111.0       # km north
# isometric: east -> down-right, north -> up-right (so the hill sits top, downtown bottom)
c30, s30 = math.cos(math.pi / 6), 0.5
X, Y = (u + v) * c30, (u - v) * s30
S = 182                              # px per km, fits a 1240 x 900 box right of the titles
st["x"] = (X - X.min()) * S
st["y"] = (Y - Y.min()) * S - st.elev_m * 2.0     # lift by elevation so the hill is a hill
st["x"] = (st.x - (st.x.min() + st.x.max()) / 2 + 1250).round(1)
st["y"] = (st.y - (st.y.min() + st.y.max()) / 2 + 560).round(1)
print("x range", st.x.min(), st.x.max(), "y range", st.y.min(), st.y.max())
idx = {sid: i for i, sid in enumerate(st.id)}

con = duckdb.connect(str(ROOT / "data/bikeshare.duckdb"), read_only=True)
holi = [str(x) for x in con.execute("SELECT dteday FROM uci_day WHERE holiday=1").df().dteday.dt.date]
hill_ids = list(st.id[st.zone == "The Hill"])
od = con.execute(f"""
  SELECT start_id, end_id, (hour(start_ts)*60+minute(start_ts)) // 5 * 5 AS m, count(*) AS n,
         median(date_diff('second', start_ts, end_ts)) AS dur_s
  FROM trips WHERE year(start_ts)=2012 AND dayofweek(start_ts) BETWEEN 1 AND 5
    AND CAST(CAST(start_ts AS DATE) AS VARCHAR) NOT IN ({",".join(repr(h) for h in holi)})
    AND hour(start_ts) BETWEEN 5 AND 9 AND start_id IN ({",".join(repr(h) for h in hill_ids)})
  GROUP BY 1,2,3""").df()
n_wd = d["meta"]["weekdays"]
od = od[od.end_id.isin(idx)]
od["avg"] = od.n / n_wd
# one 'typical weekday': draw each (pair, 5-min bin) with probability = avg rides (expected count kept)
rnd = random.Random(7)
trips = []
for r in od.itertuples():
    nf = r.avg
    cnt = int(nf) + (1 if rnd.random() < nf - int(nf) else 0)
    for _ in range(cnt):
        trips.append([idx[r.start_id], idx[r.end_id], round(r.m + rnd.random() * 5, 2), round(min(r.dur_s, 1800) / 60, 1)])
trips.sort(key=lambda t: t[2])
print("hill trips in typical weekday (in frame):", len(trips), "expected", round(od.avg.sum(), 1))
focal = st.index[st.name == d["kpi"]["focal_hill"]][0]
down = st.index[st.name == d["kpi"]["focal_down"]][0] if (st.name == d["kpi"]["focal_down"]).any() else None
c = d["stock_curves"]
out = {"stations": st[["name", "zone", "x", "y", "capacity"]].assign(name=st.name.str.split(" / ").str[0]).values.tolist(),
       "trips": trips, "focal": int(focal), "down": None if down is None else int(down),
       "stock": {"minutes": c["minutes"], "hill": c["hill"], "down": c["down"]},
       "kpi": {k2: d["kpi"][k2] for k2 in ("empty_moments_q3", "empty_share_hill", "bikes_uphill", "focal_hill", "focal_hill_empty_at", "focal_down")}}
(ROOT / "data/motion").mkdir(exist_ok=True)
(ROOT / "data/motion/city.json").write_text(json.dumps(out, separators=(",", ":")))
print("focal", st.loc[focal, ["name", "x", "y"]].tolist(), "down", None if down is None else st.loc[down, ["name", "x", "y"]].tolist())
print("zones", st.zone.value_counts().to_dict(), "KB", len(json.dumps(out)) // 1024)
