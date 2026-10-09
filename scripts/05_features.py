"""ML tables for the TabICL redo (train: 2011-01..2012-06, test: 2012-07..2012-12).

T1 regression   bikes_uphill: net bikes lost by the hill, 5-10 am, per weekday (the dashboard's '188').
T2 classification empty_by_9: per hill station x weekday, does a dock that starts full run out before 9:00?
T3 forecast     hourly rides (UCI cnt) and hourly hill departures, last 14 days of 2012.
Features only use what is known before the morning: calendar, the morning's weather (UCI hour.csv
6-9 am; a forecast stands in for it in production) and yesterday's value.
"""
import json, pathlib, duckdb, numpy as np, pandas as pd
ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / "tabicl/data"; OUT.mkdir(parents=True, exist_ok=True)
con = duckdb.connect(str(ROOT / "data/bikeshare.duckdb"), read_only=True)
d = json.loads((ROOT / "data/dashboard.json").read_text())
hill = [s for s in d["stations"] if s["zone"] == "The Hill"]
hill_ids = [s["id"] for s in hill]
ids_sql = ",".join(repr(i) for i in hill_ids)
cap = {s["id"]: s["capacity"] for s in hill}

wx = con.execute("""SELECT dteday AS date, any_value(holiday) holiday, any_value(workingday) workingday,
   avg(temp)*41 AS temp_c, avg(atemp)*50 AS feels_c, avg(hum)*100 AS humidity, avg(windspeed)*67 AS wind_kmh,
   max(weathersit) AS weather FROM uci_hour WHERE hr BETWEEN 6 AND 9 GROUP BY 1""").df()
wx["date"] = pd.to_datetime(wx.date)

ev = con.execute(f"""
  SELECT CAST(start_ts AS DATE) date, start_id sid, hour(start_ts)*60+minute(start_ts) m, -1 delta FROM trips
   WHERE start_id IN ({ids_sql}) AND hour(start_ts) BETWEEN 5 AND 9
  UNION ALL
  SELECT CAST(end_ts AS DATE), end_id, hour(end_ts)*60+minute(end_ts), 1 FROM trips
   WHERE end_id IN ({ids_sql}) AND hour(end_ts) BETWEEN 5 AND 9 AND CAST(end_ts AS DATE) = CAST(start_ts AS DATE)""").df()
ev["date"] = pd.to_datetime(ev.date)
ev = ev.sort_values(["date", "sid", "m", "delta"])
ev["stock"] = ev.sid.map(cap) + ev.groupby(["date", "sid"]).delta.cumsum()

days = wx[(wx.workingday == 1)].copy()
cal = lambda df: df.assign(dow=df.date.dt.dayofweek, month=df.date.dt.month, doy=df.date.dt.dayofyear,
                           year=df.date.dt.year, t_index=(df.date - pd.Timestamp("2011-01-01")).dt.days)
split = lambda df: df.assign(split=np.where(df.date < "2012-07-01", "train", "test"))

# T1
net = ev.groupby("date").delta.sum().rename("net")
t1 = cal(days).merge(net, left_on="date", right_index=True, how="left").fillna({"net": 0})
t1["bikes_uphill"] = -t1.net
t1 = t1.sort_values("date")
t1["prev_bikes_uphill"] = t1.bikes_uphill.shift(1)
t1 = split(t1.dropna(subset=["prev_bikes_uphill"]))
cols1 = ["date", "split", "dow", "month", "doy", "year", "t_index", "temp_c", "feels_c", "humidity", "wind_kmh", "weather", "prev_bikes_uphill", "bikes_uphill"]
t1[cols1].to_csv(OUT / "t1_bikes_uphill.csv", index=False)

# T2
first_empty = ev[(ev.stock < 0) & (ev.delta == -1)].groupby(["date", "sid"]).m.min()
grid = days[["date"]].merge(pd.DataFrame({"sid": hill_ids}), how="cross")
grid["empty_min"] = grid.set_index(["date", "sid"]).index.map(first_empty)
grid["empty_by_9"] = (grid.empty_min < 540).astype(int)
grid = cal(grid.merge(days, on="date")).sort_values(["sid", "date"])
grid["prev_empty"] = grid.groupby("sid").empty_by_9.shift(1)
meta = pd.DataFrame(hill)[["id", "name", "capacity", "elev_m"]].rename(columns={"id": "sid", "name": "station"})
grid = split(grid.merge(meta, on="sid").dropna(subset=["prev_empty"]))
grid["station"] = grid.station.str.split(" / ").str[0]
cols2 = ["date", "split", "station", "capacity", "elev_m", "dow", "month", "doy", "year", "t_index", "temp_c", "feels_c", "humidity", "wind_kmh", "weather", "prev_empty", "empty_by_9"]
grid[cols2].to_csv(OUT / "t2_empty_by_9.csv", index=False)

# T3
h = con.execute(f"""
  WITH sys AS (SELECT CAST(dteday AS TIMESTAMP) + hr * INTERVAL 1 HOUR ts, cnt FROM uci_hour),
       hil AS (SELECT date_trunc('hour', start_ts) ts, count(*) n FROM trips WHERE start_id IN ({ids_sql}) GROUP BY 1)
  SELECT 'system' AS item_id, ts AS "timestamp", cnt AS target FROM sys
  UNION ALL SELECT 'hill_departures', ts, n FROM hil ORDER BY 1, 2""").df()
full = pd.date_range("2011-01-01", "2012-12-31 23:00", freq="h")
h = pd.concat([g[["timestamp", "target"]].set_index("timestamp").reindex(full, fill_value=0).assign(item_id=k).rename_axis("timestamp").reset_index()
               for k, g in h.groupby("item_id")])
cut = pd.Timestamp("2012-12-18")
h[(h.timestamp >= "2012-09-01") & (h.timestamp < cut)].to_csv(OUT / "t3_context.csv", index=False, date_format="%Y-%m-%d %H:%M")
h[h.timestamp >= cut].to_csv(OUT / "t3_actual.csv", index=False, date_format="%Y-%m-%d %H:%M")
print("T1", t1.split.value_counts().to_dict(), "mean", round(t1.bikes_uphill.mean(), 1))
print("T2", grid.split.value_counts().to_dict(), "positive rate", round(grid.empty_by_9.mean(), 3))
print("T3 context rows", ((h.timestamp >= "2012-09-01") & (h.timestamp < cut)).sum(), "horizon", (h.timestamp >= cut).sum() // 2)
