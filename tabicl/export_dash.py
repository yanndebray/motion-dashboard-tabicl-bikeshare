"""Datasets for the TabICL forecast dashboard and film (held-out Jul-Dec 2012)."""
import json, pathlib, numpy as np, pandas as pd
HERE = pathlib.Path(__file__).resolve().parent; R = HERE / "results"; O = HERE / "dash"; O.mkdir(exist_ok=True)
S = json.loads((R / "summary.json").read_text())
w = lambda n, rows: (O / f"{n}.json").write_text(json.dumps(rows, separators=(",", ":"), default=float))
r2 = lambda x: None if pd.isna(x) else round(float(x), 2)

# model scoreboard
rows = []
names = {"t1": "Bikes to carry uphill", "t2": "Station empty by 9 am"}
for t in ("t1", "t2"):
    for model, m in S[t].items():
        if model.startswith("_"): continue
        rows.append({"task": names[t], "model": model, **{k: m.get(k) for k in ("mae", "coverage_80", "auc", "avg_precision", "brier")}})
for item, ms in S["t3"].items():
    for model, m in ms.items():
        rows.append({"task": "Hourly rides, " + ("whole system" if item == "system" else "hill departures"), "model": model, "mae": m.get("mae"), "coverage_80": m.get("coverage_80")})
w("scoreboard", rows)

# T1 series (level-adjusted variant, both backends)
a, b = pd.read_csv(R / "local" / "t1v2.csv"), pd.read_csv(R / "api" / "t1v2.csv")
w("t1_series", [{"day": d, "actual": int(y), "hgb": r2(h), "local_mean": r2(lm), "local_q10": r2(l1), "local_q90": r2(l9),
                 "api_mean": r2(am), "api_q10": r2(a1), "api_q90": r2(a9)}
                for d, y, h, lm, l1, l9, am, a1, a9 in zip(a.date, a.actual, a.hgb, a["mean"], a.q10, a.q90, b["mean"], b.q10, b.q90)])

# T2 calibration + per-station
t2 = pd.read_csv(R / "local" / "t2_2000.csv").rename(columns={"proba": "local"}).assign(api=pd.read_csv(R / "api" / "t2.csv").proba)
cal = []
for be in ("local", "api"):
    bins = pd.cut(t2[be], [0, .05, .1, .2, .3, .5, .7, 1.0], include_lowest=True)
    for iv, g in t2.groupby(bins, observed=True):
        cal.append({"backend": be, "bin": str(iv), "predicted": r2(g[be].mean()), "observed": r2(g.actual.mean()), "n": int(len(g))})
w("t2_calibration", cal)
w("t2_stations", [{"station": s, "actual_rate": r2(g.actual.mean()), "local": r2(g.local.mean()), "api": r2(g.api.mean()), "days": int(len(g))}
                  for s, g in t2.groupby("station")])

# T3 hourly forecasts
t3 = pd.read_csv(R / "t3_compare.csv")
w("t3_series", [{"item": "Whole system" if i == "system" else "Hill departures", "hour": ts, "actual": int(y), "naive": r2(sn),
                 "local_mean": r2(lm), "local_q10": r2(l1), "local_q90": r2(l9), "api_mean": r2(am), "api_q10": r2(a1), "api_q90": r2(a9)}
                for i, ts, y, sn, lm, l1, l9, am, a1, a9 in zip(t3.item_id, t3.timestamp, t3.actual, t3.seasonal_naive, t3.local108_mean, t3.local108_q10,
                                                                 t3.local108_q90, t3.api28_mean, t3.api28_q10, t3.api28_q90)])

# backends
T, A = S["timings"], S["local_vs_api"]
w("backends", [
    {"task": "Bikes to carry uphill", "local_secs": T["local"]["t1"], "api_secs": T["api"]["t1"], "local_context": "372 weekdays", "api_context": "372 weekdays", "corr": A["t1 level-adjusted, mean"]["corr"]},
    {"task": "Station empty by 9 am", "local_secs": T["local"]["t2_2000"], "api_secs": T["api"]["t2"], "local_context": "2,000 rows", "api_context": "2,000 rows, 6 chunks", "corr": A["t2 2,000-row context, proba"]["corr"]},
    {"task": "Hourly rides, 14 days", "local_secs": T["local"]["t3_28d"], "api_secs": T["api"]["t3"], "local_context": "28 days", "api_context": "28 days", "corr": A["t3 28-day context, mean"]["corr"]}])

# KPI row
k = lambda t, m, f: S[t][m][f]
w("ml_kpis", [{"t1_mae_tabicl": k("t1", "TabICL (api), level-adjusted", "mae"), "t1_mae_hgb": k("t1", "Gradient boosting, level-adjusted", "mae"),
               "t1_mae_yesterday": k("t1", "Yesterday's value", "mae"), "t1_cov80": k("t1", "TabICL (api), level-adjusted", "coverage_80"),
               "t2_auc_tabicl": k("t2", "TabICL (API, 2,000-row context)", "auc"), "t2_auc_hgb": k("t2", "Gradient boosting", "auc"),
               "t2_ap_tabicl": k("t2", "TabICL (API, 2,000-row context)", "avg_precision"), "t2_ap_hgb": k("t2", "Gradient boosting", "avg_precision"),
               "t3_mae_tabicl": S["t3"]["hill_departures"]["TabICL (local, 108-day context)"]["mae"], "t3_mae_naive": S["t3"]["hill_departures"]["Same hour last week"]["mae"],
               "agreement_min": min(v["corr"] for v in A.values()), "test_days": len(a), "test_rows_t2": len(t2)}])

# film: pick a held-out weekday with the highest predicted risk where the forecast held up
day = t2.groupby("date").agg(pred=("api", "sum"), act=("actual", "sum"))
t1d = a.set_index("date")
day = day.join(t1d[["actual", "mean", "q10", "q90"]])
day["ok"] = (day.actual >= day.q10) & (day.actual <= day.q90)
pick = day[day.ok].sort_values("pred", ascending=False).index[0]
st = t2[t2.date == pick][["station", "api", "actual"]].sort_values("api", ascending=False)
film = {"date": pick, "stations": st.values.tolist(), "bikes": {k2: r2(day.loc[pick, k2]) for k2 in ("actual", "mean", "q10", "q90")},
        "t1_mae": k("t1", "TabICL (api), level-adjusted", "mae"), "t1_mae_hgb": k("t1", "Gradient boosting, level-adjusted", "mae"),
        "auc": k("t2", "TabICL (API, 2,000-row context)", "auc"), "agreement_min": min(v["corr"] for v in A.values()),
        "series": [[d, int(y), r2(m)] for d, y, m in zip(b.date, b.actual, b["mean"])]}
(HERE / "film_pick.json").write_text(json.dumps(film))
print("pick", pick, film["bikes"], st.head(6).values.tolist())
for f in sorted(O.iterdir()): print(f.name, f.stat().st_size)
