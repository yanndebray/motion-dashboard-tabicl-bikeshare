# Bikeshare: the hill runs dry (Plan B + TabICL)

This replicates the "Claude Dashboards + Claude Motion" demo (`PLAN.md`, video notes in `en0GuyhieQk*.md`) with real Capital Bikeshare data.

## Artifacts
| | Link |
|---|---|
| Dashboard: system overview (descriptive) | https://claude.ai/artifact/FpHHgj3uXnFsZmm76mtESC |
| Motion: The Hill Runs Dry | https://claude.ai/artifact/2RJAwzHdgL51mcwTTjNsDK |
| Dashboard: Hill Morning Forecast (TabICL) | https://claude.ai/artifact/DpqeYPo8vBxWumdT9rcmsW |
| Motion: The Hill, Forecast (TabICL) | https://claude.ai/artifact/9uK7nrTjYJ29mJi3hxNsmN |

## Pipeline
```
uvx --with duckdb python -I scripts/01_load.py                       # trips + UCI + GBFS stations (+ elevation) -> data/bikeshare.duckdb
uvx --with duckdb --with pandas --with numpy python -I scripts/02_metrics.py   # dashboard metrics -> data/dashboard.json
python3 -I scripts/03_export_dash.py                                 # -> data/dash/*.json
uvx --with duckdb --with pandas --with numpy python -I scripts/04_motion_data.py  # -> data/motion/city.json
uvx --with duckdb --with pandas --with numpy python -I scripts/05_features.py     # TabICL tasks -> tabicl/data/
cd tabicl
.venv/bin/python -I run_tabicl.py --backend local --tasks t1,t2,t3,t2_2000,t3_28d
.venv/bin/python -I run_tabicl.py --backend api   --tasks t1,t2,t3
.venv/bin/python -I t1_variants.py local; .venv/bin/python -I t1_variants.py api
.venv/bin/python -I evaluate.py && .venv/bin/python -I export_dash.py
```
The venv is `uv venv tabicl/.venv --python 3.12 && uv pip install "tabicl[forecast]" duckdb pandas scikit-learn requests`.

## Key numbers (2012)
- 2.03M trips across 194 stations. Trip totals match UCI to within 1.1%.
- 16th & Harvard St NW empties by 8:25 am on a typical weekday, assuming it starts full.
- Jul–Sep: an estimated 1,931 empty-dock moments, 68% of them on the hill. About 188 bikes a weekday need to go back uphill.

## TabICL vs baselines (held out Jul–Dec 2012)
- Bikes to carry uphill: TabICL MAE 21.7 (API) / 21.5 (local), predicting the change from the 5-weekday level. Gradient boosting 23.6, yesterday's value 29.2. The 80% band covers 91% of days. On the raw target, TabICL runs about 20 bikes low (MAE 34).
- Empty by 9 am: TabICL AUC 0.95 and AP 0.77 with 2,000 recent rows. Gradient boosting 0.94 / 0.74.
- Hourly hill departures: TabICL MAE 9.4 (108-day context). Same hour last week: 9.7.
- Local vs API: r = 0.996 (t1), 0.998 (t2) and 0.980 (t3) on identical inputs.
- API limits seen: `/v1/infer` gives HTTP 524 above about 2,500 context rows; `/v1/forecast` gives 503 with 56 days of hourly history (28 works).
