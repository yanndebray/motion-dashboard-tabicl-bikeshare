"""Run the three bikeshare tasks with TabICL, locally (sklearn API) or through api.tabicl.org.

    python run_tabicl.py --backend local   # TabICLRegressor / TabICLClassifier / TabICLForecaster
    python run_tabicl.py --backend api     # POST /v1/infer and /v1/forecast, same CSVs
"""
import argparse, io, json, pathlib, time
import numpy as np, pandas as pd

HERE = pathlib.Path(__file__).resolve().parent
DATA, API = HERE / "data", "https://api.tabicl.org"
QS = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]
DROP = ["date", "split"]


def load(name, target):
    df = pd.read_csv(DATA / name)
    tr, te = df[df.split == "train"], df[df.split == "test"]
    return tr.drop(columns=DROP + [target]), tr[target], te.drop(columns=DROP + [target]), te


def api_infer(Xtr, ytr, Xte, target, task, output_type):
    import requests
    train = Xtr.assign(**{target: ytr.values}).to_csv(index=False)
    data = json.dumps({"task": task, "schema": {"target": target}, "output_type": output_type})
    r = requests.post(f"{API}/v1/infer", data={"data": data}, timeout=600,
                      files={"train_file": ("train.csv", train), "test_file": ("test.csv", Xte.to_csv(index=False))})
    r.raise_for_status()
    return r.json()


def api_fit_predict(Xtr, ytr, Xte, target, task, output_type, chunk=300, tries=3):
    """Large jobs: fit once (/v1/fit), then predict in chunks (/v1/predict) to stay under the gateway timeout."""
    import requests
    data = json.dumps({"task": task, "schema": {"target": target}})
    r = requests.post(f"{API}/v1/fit", data={"data": data}, timeout=600,
                      files={"dataset_file": ("train.csv", Xtr.assign(**{target: ytr.values}).to_csv(index=False))})
    r.raise_for_status()
    mid, preds, classes = r.json()["model_id"], [], None
    for i in range(0, len(Xte), chunk):
        part = Xte.iloc[i:i + chunk].to_csv(index=False)
        for k in range(tries):
            r = requests.post(f"{API}/v1/predict", timeout=600, files={"file": ("test.csv", part)},
                              data={"data": json.dumps({"model_id": mid, "task": task, "output_type": output_type})})
            if r.ok: break
            print("  retry", i, r.status_code, r.text[:200], flush=True); time.sleep(5 * (k + 1))
        r.raise_for_status()
        preds += r.json()["prediction"]
        classes = r.json().get("classes") or classes
    return {"prediction": preds, "classes": classes, "model_id": mid}


def t1(backend):
    Xtr, ytr, Xte, te = load("t1_bikes_uphill.csv", "bikes_uphill")
    t0 = time.perf_counter()
    if backend == "local":
        from tabicl import TabICLRegressor
        m = TabICLRegressor(random_state=0).fit(Xtr, ytr)
        q = m.predict(Xte, output_type="quantiles", alphas=QS)
        mean = m.predict(Xte, output_type="mean")
    else:
        q = np.array(api_infer(Xtr, ytr, Xte, "bikes_uphill", "regression", "quantiles")["prediction"])
        mean = np.array(api_infer(Xtr, ytr, Xte, "bikes_uphill", "regression", "mean")["prediction"])
    secs = time.perf_counter() - t0
    out = te[["date", "bikes_uphill"]].rename(columns={"bikes_uphill": "actual"}).assign(mean=mean)
    for i, a in enumerate(QS):
        out[f"q{int(a * 100)}"] = q[:, i]
    return out, secs


API_MAX_CONTEXT = 2000   # the hosted API times out (HTTP 524, ~100 s) beyond ~2,500 context rows


def api_infer_chunked(Xtr, ytr, Xte, target, task, output_type, chunk=250, workers=2):
    from concurrent.futures import ThreadPoolExecutor
    parts = [Xte.iloc[i:i + chunk] for i in range(0, len(Xte), chunk)]
    def one(part):
        for k in range(3):
            try: return api_infer(Xtr, ytr, part, target, task, output_type)
            except Exception as e: print("  retry", k, e, flush=True); time.sleep(10 * (k + 1))
        raise RuntimeError("API chunk failed 3 times")
    with ThreadPoolExecutor(workers) as ex: res = list(ex.map(one, parts))
    return {"prediction": sum((r["prediction"] for r in res), []), "classes": res[0]["classes"]}


def t2(backend, context=None):
    Xtr, ytr, Xte, te = load("t2_empty_by_9.csv", "empty_by_9")
    if backend == "api": context = context or API_MAX_CONTEXT
    if context:   # the most recent days, every station (the file is sorted by station, then date)
        keep = Xtr.sort_values("t_index", kind="stable").index[-context:]
        Xtr, ytr = Xtr.loc[keep], ytr.loc[keep]
    t0 = time.perf_counter()
    if backend == "local":
        from tabicl import TabICLClassifier
        m = TabICLClassifier(random_state=0).fit(Xtr, ytr)
        p = m.predict_proba(Xte)[:, list(m.classes_).index(1)]
    else:
        r = api_infer_chunked(Xtr, ytr, Xte, "empty_by_9", "classification", "probas")
        classes = r["classes"] or [0, 1]
        p = np.array(r["prediction"])[:, list(classes).index(1)]
    secs = time.perf_counter() - t0
    return te[["date", "station", "empty_by_9"]].rename(columns={"empty_by_9": "actual"}).assign(proba=p), secs


API_MAX_CONTEXT_DAYS = 28   # /v1/forecast answers 503 with 56 days of hourly context for two series


def t3(backend, days=None):
    ctx = pd.read_csv(DATA / "t3_context.csv", parse_dates=["timestamp"])
    if backend == "api": days = days or API_MAX_CONTEXT_DAYS
    if days: ctx = ctx[ctx.timestamp > ctx.timestamp.max() - pd.Timedelta(days=days)]
    act = pd.read_csv(DATA / "t3_actual.csv", parse_dates=["timestamp"])
    H = act.timestamp.nunique()
    t0 = time.perf_counter()
    if backend == "local":
        from tabicl.forecast import TabICLForecaster
        fc = TabICLForecaster().predict_df(ctx, prediction_length=H, quantiles=QS).reset_index()
    else:
        import requests
        r = requests.post(f"{API}/v1/forecast", data={"data": json.dumps({"prediction_length": H})}, timeout=600,
                          files={"context_file": ("context.csv", ctx.to_csv(index=False, date_format="%Y-%m-%d %H:%M"))})
        r.raise_for_status()
        j = r.json()
        fc = pd.DataFrame([list(i) + list(v) for i, v in zip(j["index"], j["records"])], columns=j["index_names"] + j["columns"])
    secs = time.perf_counter() - t0
    fc["timestamp"] = pd.to_datetime(fc.timestamp)
    fc.columns = [c if c in ("item_id", "timestamp", "target") else f"q{int(round(float(c) * 100))}" for c in fc.columns]
    out = act.merge(fc.rename(columns={"target": "mean"}), on=["item_id", "timestamp"], how="left").rename(columns={"target": "actual"})
    return out, secs


if __name__ == "__main__":
    ap = argparse.ArgumentParser(); ap.add_argument("--backend", choices=["local", "api"], required=True)
    ap.add_argument("--tasks", default="t1,t2,t3")
    a = ap.parse_args(); b, only = a.backend, a.tasks.split(",")
    res = HERE / "results" / b; res.mkdir(parents=True, exist_ok=True)
    tf = res / "timings.json"
    timings = json.loads(tf.read_text()) if tf.exists() else {}
    tasks = [("t1", t1), ("t2", t2), ("t3", t3), ("t2_2000", lambda b: t2(b, 2000)), ("t3_28d", lambda b: t3(b, 28))]
    for name, fn in tasks:
        if name not in only: continue
        df, secs = fn(b)
        df.to_csv(res / f"{name}.csv", index=False)
        timings[name] = round(secs, 2)
        print(b, name, f"{secs:.1f}s", len(df), "rows", flush=True)
        tf.write_text(json.dumps(timings))
