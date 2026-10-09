"""Build dashboard + motion data (Plan B: station-level story) -> data/dashboard.json

Assumptions (all surfaced in the dashboard):
- Dock counts are today's GBFS capacities (2012 capacities are not published).
- No dock-inventory data exists. 'Empty-dock moments' are departures beyond what a *full* dock
  could supply: at each station, stock(t) = capacity + cumulative net flow since 5:00, and every
  departure while stock <= 0 counts as one moment (a bike that had to come from a van or a lucky arrival).
- The Hill = Columbia Heights / Mt Pleasant / Adams Morgan / Park View: NW DC stations above 50 m,
  north of the Florida Ave escarpment. Downtown = K St / Farragut / Metro Center / Penn Quarter core.
"""
import json, pathlib, duckdb, numpy as np, pandas as pd
ROOT = pathlib.Path(__file__).resolve().parents[1]
con = duckdb.connect(str(ROOT / "data/bikeshare.duckdb"), read_only=True)
YEAR, AM0, AM1 = 2012, 5 * 60, 10 * 60          # morning window 5:00-10:00
holidays = set(con.execute("SELECT dteday FROM uci_day WHERE holiday=1").df().dteday.dt.date)

st = con.execute("SELECT * FROM stations").df()
hill = (st.elev_m >= 50) & st.lat.between(38.917, 38.945) & st.lon.between(-77.05, -77.015)
down = st.lat.between(38.893, 38.908) & st.lon.between(-77.05, -77.010)
st["zone"] = np.select([hill, down], ["The Hill", "Downtown"], "Other")
zone = dict(zip(st.id, st.zone))

t = con.execute("""SELECT start_ts, end_ts, start_id, end_id, member_type FROM trips
                   WHERE year(start_ts) IN (2011, 2012)""").df()
t["date"] = t.start_ts.dt.date
t["weekday"] = (t.start_ts.dt.dayofweek < 5) & ~t.date.isin(holidays)
t["rider"] = t.member_type.map({"Member": "Members", "Casual": "Casual"}).fillna("Members")
t["smin"] = t.start_ts.dt.hour * 60 + t.start_ts.dt.minute
t["emin"] = t.end_ts.dt.hour * 60 + t.end_ts.dt.minute
y = t[t.start_ts.dt.year == YEAR]
prev = t[t.start_ts.dt.year == YEAR - 1]
wd = y[y.weekday]
n_wd = wd.date.nunique()

def by_rider(df):
    yield "All", df
    for r in ("Members", "Casual"):
        yield r, df[df.rider == r]

out = {"meta": {"year": YEAR, "stations": int(len(st)), "docks": int(st.capacity.sum()),
                "weekdays": int(n_wd), "trips_total": int(len(y)),
                "source": "Capital Bikeshare trip history 2011-2012 + UCI Bike Sharing dataset (hour.csv/day.csv)"},
       "views": {}}

for name, d in by_rider(y):
    p = prev if name == "All" else prev[prev.rider == name]
    daily = d.groupby("date").size()
    daily.index = pd.to_datetime(daily.index)
    daily = daily.reindex(pd.date_range(f"{YEAR}-01-01", f"{YEAR}-12-31"), fill_value=0)
    roll = daily.rolling(7, min_periods=1).mean()
    dwd, pwd = d[d.weekday], p[p.weekday]
    share = lambda x: float((x.start_ts.dt.hour.between(6, 8)).mean())
    by_hour = d.assign(h=d.start_ts.dt.hour).groupby(["weekday", "h"]).size().unstack(0).fillna(0)
    ndays = {True: n_wd, False: d.date.nunique() and (366 - n_wd)}
    out["views"][name] = {
        "total": int(len(d)), "total_prev": int(len(p)),
        "busiest": {"date": str(daily.idxmax().date()), "n": int(daily.max())},
        "am_share": share(dwd), "am_share_prev": share(pwd),
        "daily": [[str(i.date()), int(v), round(float(r), 1)] for i, v, r in zip(daily.index, daily.values, roll.values)],
        "hourly": {"weekday": [round(float(by_hour.get(True, pd.Series()).get(h, 0)) / n_wd, 1) for h in range(24)],
                   "weekend": [round(float(by_hour.get(False, pd.Series()).get(h, 0)) / (366 - n_wd), 1) for h in range(24)]},
        "departures_am": {k: round(v / n_wd, 2) for k, v in
                          dwd[dwd.smin.between(6 * 60, 9 * 60 - 1)].groupby("start_id").size().items()},
    }

# ---- station flows, typical weekday 5:00-10:00 (all riders) ----
dep = wd[wd.smin.between(AM0, AM1 - 1)]
arr = wd[wd.emin.between(AM0, AM1 - 1) & (wd.end_ts.dt.date == wd.date)]
net = (arr.groupby("end_id").size().sub(dep.groupby("start_id").size(), fill_value=0) / n_wd)
st["net_am"] = st.id.map(net).fillna(0).round(1)
st["dep_am"] = st.id.map(dep.groupby("start_id").size() / n_wd).fillna(0).round(1)

# per station-day event stream -> stock simulation from full
ev = pd.concat([dep.assign(sid=dep.start_id, m=dep.smin, delta=-1)[["date", "sid", "m", "delta"]],
                arr.assign(sid=arr.end_id, m=arr.emin, delta=1)[["date", "sid", "m", "delta"]]])
ev = ev.sort_values(["date", "sid", "m", "delta"])  # arrivals after departures in same minute: conservative
cap = dict(zip(st.id, st.capacity))
ev["stock"] = ev.sid.map(cap) + ev.groupby(["date", "sid"]).delta.cumsum()
ev["empty_moment"] = (ev.delta == -1) & (ev.stock < 0)
q3 = ev[pd.to_datetime(ev.date).dt.month.isin([7, 8, 9])]
em = q3[q3.empty_moment]
hill_ids = set(st.id[st.zone == "The Hill"])
# focal stations: the hill station that drains hardest, and the downtown station that fills fastest
focal_hill = st[st.zone == "The Hill"].sort_values("net_am").iloc[0]
focal_down = st[st.zone == "Downtown"].sort_values("net_am").iloc[-1]
em_daily = em.assign(focal=em.sid == focal_hill.id).groupby(["date", "focal"]).size().unstack(fill_value=0)
em_daily = em_daily.reindex(sorted(q3.date.unique()), fill_value=0)

# typical-weekday stock curves (5-min resolution), focal stations
grid = np.arange(AM0, AM1 + 1, 5)
def curve(sid, start):
    e = ev[ev.sid == sid]
    c = np.array([e[e.m <= g].delta.sum() for g in grid]) / n_wd
    return np.clip(start + c, 0, cap[sid])
hill_curve = curve(focal_hill.id, cap[focal_hill.id])         # starts full
down_curve = curve(focal_down.id, 0)                          # starts empty
empty_at = next((int(g) for g, v in zip(grid, hill_curve) if v <= 0.5), None)

# bikes to carry back up: median weekday net loss of hill stations 5-10 am
hd = ev[ev.sid.isin(hill_ids)].groupby(["date"]).delta.sum()
bikes_up = int(round(-hd.median()))

out["kpi"] = {
    "empty_moments_q3": int(len(em)), "empty_share_hill": float(em.sid.isin(hill_ids).mean()),
    "empty_days_q3": int(q3.date.nunique()),
    "bikes_uphill": bikes_up, "focal_hill": focal_hill["name"], "focal_down": focal_down["name"],
    "focal_hill_cap": int(cap[focal_hill.id]), "focal_down_cap": int(cap[focal_down.id]),
    "focal_hill_empty_at": empty_at, "focal_hill_dep_am": float(focal_hill.dep_am),
}
out["stations"] = st[["id", "name", "lat", "lon", "elev_m", "capacity", "zone", "net_am", "dep_am"]].to_dict("records")
out["stock_curves"] = {"minutes": grid.tolist(), "hill": hill_curve.round(2).tolist(), "down": down_curve.round(2).tolist()}
out["empty_daily"] = [[str(d), int(r.get(True, 0)), int(r.get(False, 0))] for d, r in em_daily.iterrows()]

# ---- motion data: hill -> anywhere flows by 15-min bin on a typical weekday ----
hd_trips = dep[dep.start_id.isin(hill_ids)]
od = hd_trips.groupby(["start_id", "end_id", hd_trips.smin // 15 * 15]).size().div(n_wd).reset_index(name="n")
od = od[od.n >= 0.05]
out["motion"] = {
    "bins": list(range(AM0, AM1, 15)),
    "od": od.round(3).values.tolist(),
    "hill_dep_by_bin": (hd_trips.groupby(hd_trips.smin // 15 * 15).size() / n_wd).round(2).reindex(range(AM0, AM1, 15), fill_value=0).tolist(),
    "hill_down_share": float(hd_trips.end_id.map(zone).isin(["Downtown"]).mean()),
    "hill_elev_m": float(st[st.zone == "The Hill"].elev_m.median()),
    "down_elev_m": float(st[st.zone == "Downtown"].elev_m.median()),
}
(ROOT / "data/dashboard.json").write_text(json.dumps(out, default=str))
k = out["kpi"]; v = out["views"]["All"]
print(json.dumps({**k, "total": v["total"], "prev": v["total_prev"], "busiest": v["busiest"],
                  "am_share": round(v["am_share"], 3), "am_prev": round(v["am_share_prev"], 3),
                  "zones": st.zone.value_counts().to_dict(), "docks": out["meta"]["docks"],
                  "hill_down_share": out["motion"]["hill_down_share"], "elev": [out["motion"]["hill_elev_m"], out["motion"]["down_elev_m"]]}, indent=1, default=str))
print("size KB", len(json.dumps(out, default=str)) // 1024)
