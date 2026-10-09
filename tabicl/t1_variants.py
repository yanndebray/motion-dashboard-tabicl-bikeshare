"""T1 ablation: add the recent level (mean of the last 5 weekdays) and model the residual from it."""
import json, sys, pathlib, time, numpy as np, pandas as pd
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.metrics import mean_absolute_error
sys.path.insert(0, str(pathlib.Path(__file__).parent)); import run_tabicl as R
df = pd.read_csv(R.DATA / "t1_bikes_uphill.csv")
df["level5"] = df.bikes_uphill.shift(1).rolling(5, min_periods=1).mean()
df = df.dropna(subset=["level5"])
df["resid"] = df.bikes_uphill - df.level5
df.to_csv(R.DATA / "t1v2_bikes_uphill.csv", index=False)
tr, te = df[df.split == "train"], df[df.split == "test"]
feats = [c for c in df.columns if c not in ("date", "split", "bikes_uphill", "resid")]
backend = sys.argv[1]
out, res = {}, te[["date", "bikes_uphill", "level5"]].copy()
for tgt in ("bikes_uphill", "resid"):
    add = te.level5.values if tgt == "resid" else 0
    g = HistGradientBoostingRegressor(random_state=0).fit(tr[feats], tr[tgt]).predict(te[feats]) + add
    t0 = time.perf_counter()
    if backend == "local":
        from tabicl import TabICLRegressor
        m = TabICLRegressor(random_state=0).fit(tr[feats], tr[tgt])
        q = m.predict(te[feats], output_type="quantiles", alphas=R.QS) + (add[:, None] if tgt == "resid" else 0)
        mean = m.predict(te[feats], output_type="mean") + add
    else:
        q = np.array(R.api_infer(tr[feats], tr[tgt], te[feats], tgt, "regression", "quantiles")["prediction"]) + (add[:, None] if tgt == "resid" else 0)
        mean = np.array(R.api_infer(tr[feats], tr[tgt], te[feats], tgt, "regression", "mean")["prediction"]) + add
    secs = time.perf_counter() - t0
    y = te.bikes_uphill.values
    out[tgt] = {"tabicl_mae": round(mean_absolute_error(y, mean), 1), "hgb_mae": round(mean_absolute_error(y, g), 1),
                "tabicl_cov80": round(float(np.mean((y >= q[:, 0]) & (y <= q[:, 8]))), 3), "secs": round(secs, 1),
                "tabicl_bias": round(float(np.mean(mean - y)), 1)}
    if tgt == "resid":
        res["mean"], res["hgb"] = mean, g
        for i, a in enumerate(R.QS): res[f"q{int(a * 100)}"] = q[:, i]
(R.HERE / "results" / backend).mkdir(parents=True, exist_ok=True)
res.rename(columns={"bikes_uphill": "actual"}).to_csv(R.HERE / "results" / backend / "t1v2.csv", index=False)
print(backend, json.dumps(out))
