"""Load Capital Bikeshare 2011-2012 trips into DuckDB, attach station coords + elevation."""
import json, urllib.request, duckdb, pathlib
ROOT = pathlib.Path(__file__).resolve().parents[1]
con = duckdb.connect(str(ROOT / "data/bikeshare.duckdb"))
con.execute(f"""
CREATE OR REPLACE TABLE trips AS
SELECT CAST("Start date" AS TIMESTAMP) AS start_ts, CAST("End date" AS TIMESTAMP) AS end_ts,
       CAST("Start station number" AS VARCHAR) AS start_id, "Start station" AS start_name,
       CAST("End station number" AS VARCHAR) AS end_id, "End station" AS end_name,
       "Member type" AS member_type, "Duration" AS duration_s
FROM read_csv('{ROOT}/data/trips/*.csv', header=true, all_varchar=true)
""")
con.execute(f"CREATE OR REPLACE TABLE uci_hour AS SELECT * FROM read_csv_auto('{ROOT}/data/uci/hour.csv')")
con.execute(f"CREATE OR REPLACE TABLE uci_day AS SELECT * FROM read_csv_auto('{ROOT}/data/uci/day.csv')")

gbfs = json.load(open(ROOT / "data/gbfs/station_information.json"))["data"]["stations"]
used = {r[0]: r[1] for r in con.execute("""SELECT start_id, any_value(start_name) FROM trips GROUP BY 1""").fetchall()}
rows = [(s["short_name"], s["name"], s["lat"], s["lon"], s.get("capacity")) for s in gbfs if s.get("short_name") in used]
# stations retired/renumbered since 2012: coordinates set by hand, capacity assumed
MANUAL = {"31200": (38.9101, -77.0444, 23), "31613": (38.8863, -76.9963, 19), "31246": (38.9050, -77.0566, 15),
          "31248": (38.8881, -77.0280, 15), "31614": (38.8999, -76.9915, 15), "31008": (38.8628, -77.0532, 11),
          "31051": (38.8918, -77.0711, 11),
          # station numbers reused at a different location since 2012
          "31103": (38.9264, -77.0365, 19), "31001": (38.8577, -77.0532, 11)}
rows = [r for r in rows if r[0] not in MANUAL]
rows += [(k, used[k] + " (manual)", la, lo, cap) for k, (la, lo, cap) in MANUAL.items() if k in used]
# elevation lookup (Open-Meteo, 100 coords per request), cached
cache = ROOT / "data/gbfs/elevation_cache_v2.json"  # keyed by "lat,lon"
elev = json.load(open(cache)) if cache.exists() else {}
key = lambda r: f"{r[2]:.5f},{r[3]:.5f}"
todo = [r for r in rows if key(r) not in elev]
for i in range(0, len(todo), 100):
    chunk = todo[i:i+100]
    url = ("https://api.open-meteo.com/v1/elevation?latitude=" + ",".join(f"{r[2]:.5f}" for r in chunk)
           + "&longitude=" + ",".join(f"{r[3]:.5f}" for r in chunk))
    res = json.load(urllib.request.urlopen(url))["elevation"]
    elev.update({key(r): e for r, e in zip(chunk, res)})
json.dump(elev, open(cache, "w"))
con.execute("CREATE OR REPLACE TABLE stations(id VARCHAR, gbfs_name VARCHAR, lat DOUBLE, lon DOUBLE, capacity INT, elev_m DOUBLE, name VARCHAR)")
con.executemany("INSERT INTO stations VALUES (?,?,?,?,?,?,?)", [(*r, elev[key(r)], used[r[0]]) for r in rows])
print("trips:", con.execute("SELECT count(*), min(start_ts), max(start_ts) FROM trips").fetchone())
print("stations used:", len(used), "matched to GBFS:", len(rows))
unmatched = con.execute("""SELECT start_id, any_value(start_name), count(*) n FROM trips WHERE start_id NOT IN (SELECT id FROM stations)
                           GROUP BY 1 ORDER BY n DESC""").fetchall()
print("unmatched:", len(unmatched), "trips:", sum(u[2] for u in unmatched), unmatched[:8])
# cross-check with UCI daily totals
print(con.execute("""WITH t AS (SELECT CAST(start_ts AS DATE) d, count(*) n FROM trips GROUP BY 1)
 SELECT count(*) AS n_days, sum(abs(n - cnt)) abs_diff, sum(cnt) uci_total, sum(n) trips_total, max(abs(n-cnt)) max_diff
 FROM t JOIN uci_day u ON t.d = u.dteday""").fetchone())
