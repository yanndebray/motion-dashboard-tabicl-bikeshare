"""Baselines + metrics: TabICL (local and API) vs simple and gradient-boosted models."""
import json, pathlib
import numpy as np, pandas as pd
from sklearn.ensemble import HistGradientBoostingClassifier, HistGradientBoostingRegressor
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import brier_score_loss, log_loss, mean_absolute_error, roc_auc_score, average_precision_score
from sklearn.compose import make_column_transformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.pipeline import make_pipeline

HERE = pathlib.Path(__file__).resolve().parent
D, R = HERE / "data", HERE / "results"
summary = {"t1": {}, "t2": {}, "t3": {}, "timings": {}}

def pinball(y, q, a): d = y - q; return float(np.mean(np.maximum(a * d, (a - 1) * d)))

# ---------- T1 bikes uphill (regression) ----------
df = pd.read_csv(D / "t1_bikes_uphill.csv"); tr, te = df[df.split == "train"], df[df.split == "test"]
feats = [c for c in df.columns if c not in ("date", "split", "bikes_uphill")]
y = te.bikes_uphill.values
base = {"Day-of-week average": te.dow.map(tr.groupby("dow").bikes_uphill.mean()).values,
        "Yesterday's value": te.prev_bikes_uphill.values}
hgb = {a: HistGradientBoostingRegressor(loss="quantile", quantile=a, random_state=0).fit(tr[feats], tr.bikes_uphill).predict(te[feats]) for a in (0.1, 0.5, 0.9)}
base["Gradient boosting"] = HistGradientBoostingRegressor(random_state=0).fit(tr[feats], tr.bikes_uphill).predict(te[feats])
for k, p in base.items(): summary["t1"][k] = {"mae": round(mean_absolute_error(y, p), 1)}
summary["t1"]["Gradient boosting"].update(coverage_80=round(float(np.mean((y >= hgb[0.1]) & (y <= hgb[0.9]))), 3),
                                          pinball_90=round(pinball(y, hgb[0.9], 0.9), 2))
t1_rows = te[["date", "bikes_uphill", "temp_c", "weather", "dow"]].rename(columns={"bikes_uphill": "actual"}).assign(hgb=base["Gradient boosting"], dow_avg=base["Day-of-week average"])
for b in ("local", "api"):
    f = R / b / "t1.csv"
    if not f.exists(): continue
    r = pd.read_csv(f)
    summary["t1"][f"TabICL ({b})"] = {"mae": round(mean_absolute_error(r.actual, r["mean"]), 1),
        "coverage_80": round(float(np.mean((r.actual >= r.q10) & (r.actual <= r.q90))), 3), "pinball_90": round(pinball(r.actual.values, r.q90.values, 0.9), 2)}
    t1_rows = t1_rows.merge(r[["date", "mean", "q10", "q50", "q90"]].add_prefix(f"{b}_").rename(columns={f"{b}_date": "date"}), on="date")

v2 = pd.read_csv(D / "t1v2_bikes_uphill.csv"); v2tr, v2te = v2[v2.split == "train"], v2[v2.split == "test"]
yv = v2te.bikes_uphill.values
summary["t1"]["Gradient boosting, level-adjusted"] = {"mae": round(mean_absolute_error(yv, pd.read_csv(R / "local" / "t1v2.csv").hgb), 1)}
for b in ("local", "api"):
    f = R / b / "t1v2.csv"
    if f.exists():
        r = pd.read_csv(f)
        summary["t1"][f"TabICL ({b}), level-adjusted"] = {"mae": round(mean_absolute_error(r.actual, r["mean"]), 1),
            "coverage_80": round(float(np.mean((r.actual >= r.q10) & (r.actual <= r.q90))), 3), "pinball_90": round(pinball(r.actual.values, r.q90.values, 0.9), 2),
            "bias": round(float(np.mean(r["mean"] - r.actual)), 1)}

# ---------- T2 empty by 9 (classification) ----------
df = pd.read_csv(D / "t2_empty_by_9.csv"); tr, te = df[df.split == "train"], df[df.split == "test"]
num = [c for c in df.columns if c not in ("date", "split", "station", "empty_by_9")]
ct = make_column_transformer((OneHotEncoder(handle_unknown="ignore"), ["station"]), (StandardScaler(), num))
y = te.empty_by_9.values
probs = {"Station base rate": te.station.map(tr.groupby("station").empty_by_9.mean()).values,
         "Logistic regression": make_pipeline(ct, LogisticRegression(max_iter=2000)).fit(tr, tr.empty_by_9).predict_proba(te)[:, 1],
         "Gradient boosting": HistGradientBoostingClassifier(random_state=0, categorical_features="from_dtype").fit(
             tr[["station"] + num].astype({"station": "category"}), tr.empty_by_9).predict_proba(te[["station"] + num].astype({"station": "category"}))[:, 1]}
t2_rows = te[["date", "station", "empty_by_9"]].rename(columns={"empty_by_9": "actual"}).assign(hgb=probs["Gradient boosting"])
for b, fn, label in (("local", "t2.csv", "TabICL (local, 4,464-row context)"), ("local", "t2_2000.csv", "TabICL (local, 2,000-row context)"),
                     ("api", "t2.csv", "TabICL (API, 2,000-row context)")):
    f = R / b / fn
    if f.exists():
        r = pd.read_csv(f); probs[label] = r.proba.values; t2_rows[f"{b}_{fn[:-4]}_proba"] = r.proba.values
for k, p in probs.items():
    p = np.clip(p, 1e-4, 1 - 1e-4)
    summary["t2"][k] = {"auc": round(roc_auc_score(y, p), 3), "avg_precision": round(average_precision_score(y, p), 3),
                        "brier": round(brier_score_loss(y, p), 4), "log_loss": round(log_loss(y, p), 4)}
summary["t2"]["_test_positive_rate"] = round(float(y.mean()), 3)

# ---------- T3 forecast ----------
ctx = pd.read_csv(D / "t3_context.csv", parse_dates=["timestamp"]); act = pd.read_csv(D / "t3_actual.csv", parse_dates=["timestamp"])
allh = pd.concat([ctx, act]).set_index(["item_id", "timestamp"]).target
sn = act.assign(pred=[allh.get((i, t - pd.Timedelta(days=7)), np.nan) for i, t in zip(act.item_id, act.timestamp)])
t3_rows = act.rename(columns={"target": "actual"}).assign(seasonal_naive=sn.pred.values)
for item in act.item_id.unique():
    m = sn.item_id == item
    summary["t3"].setdefault(item, {})["Same hour last week"] = {"mae": round(mean_absolute_error(sn.target[m], sn.pred[m]), 1)}
for b, fn, label, key in (("local", "t3.csv", "TabICL (local, 108-day context)", "local108"), ("local", "t3_28d.csv", "TabICL (local, 28-day context)", "local28"),
                          ("api", "t3.csv", "TabICL (API, 28-day context)", "api28")):
    f = R / b / fn
    if not f.exists(): continue
    r = pd.read_csv(f, parse_dates=["timestamp"])
    for item in r.item_id.unique():
        m = r.item_id == item
        summary["t3"][item][label] = {"mae": round(mean_absolute_error(r.actual[m], r["mean"][m]), 1),
            "coverage_80": round(float(np.mean((r.actual[m] >= r.q10[m]) & (r.actual[m] <= r.q90[m]))), 3)}
    t3_rows = t3_rows.merge(r[["item_id", "timestamp", "mean", "q10", "q90"]].rename(columns={"mean": f"{key}_mean", "q10": f"{key}_q10", "q90": f"{key}_q90"}), on=["item_id", "timestamp"])
for b in ("local", "api"):
    f = R / b / "timings.json"
    if f.exists(): summary["timings"][b] = json.loads(f.read_text())
# local vs API agreement on identical inputs
agree = {}
a, b_ = pd.read_csv(R / "local" / "t1v2.csv"), pd.read_csv(R / "api" / "t1v2.csv")
agree["t1 level-adjusted, mean"] = {"corr": round(float(np.corrcoef(a["mean"], b_["mean"])[0, 1]), 4), "mean_abs_diff_bikes": round(float(np.mean(abs(a["mean"] - b_["mean"]))), 2)}
a, b_ = pd.read_csv(R / "local" / "t2_2000.csv"), pd.read_csv(R / "api" / "t2.csv")
agree["t2 2,000-row context, proba"] = {"corr": round(float(np.corrcoef(a.proba, b_.proba)[0, 1]), 4), "mean_abs_diff": round(float(np.mean(abs(a.proba - b_.proba))), 4)}
a, b_ = pd.read_csv(R / "local" / "t3_28d.csv"), pd.read_csv(R / "api" / "t3.csv")
agree["t3 28-day context, mean"] = {"corr": round(float(np.corrcoef(a["mean"], b_["mean"])[0, 1]), 4), "mean_abs_diff_rides": round(float(np.mean(abs(a["mean"] - b_["mean"]))), 2)}
summary["local_vs_api"] = agree
(R / "summary.json").write_text(json.dumps(summary, indent=1))
t1_rows.to_csv(R / "t1_compare.csv", index=False); t2_rows.to_csv(R / "t2_compare.csv", index=False); t3_rows.to_csv(R / "t3_compare.csv", index=False)
print(json.dumps(summary, indent=1))
