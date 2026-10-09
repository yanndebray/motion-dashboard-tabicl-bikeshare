import duckdb; con = duckdb.connect("data/bikeshare.duckdb", read_only=True)
q = lambda s: print(con.execute(s).df().to_string())
con.execute("""CREATE TEMP TABLE wd AS SELECT * FROM trips WHERE year(start_ts)=2012 AND dayofweek(start_ts) BETWEEN 1 AND 5
  AND CAST(start_ts AS DATE) NOT IN (SELECT dteday FROM uci_day WHERE holiday=1)""")
ndays = con.execute("SELECT count(DISTINCT CAST(start_ts AS DATE)) FROM wd").fetchone()[0]; print("weekdays", ndays)
q(f"""WITH dep AS (SELECT start_id id, count(*) n FROM wd WHERE hour(start_ts)*60+minute(start_ts) BETWEEN 300 AND 600 GROUP BY 1),
 arr AS (SELECT end_id id, count(*) n FROM wd WHERE hour(end_ts)*60+minute(end_ts) BETWEEN 300 AND 600 GROUP BY 1)
SELECT s.id, s.name, round(s.elev_m) elev, s.capacity cap, round(s.lat,4) lat, round(s.lon,4) lon,
 round(coalesce(dep.n,0)/{ndays},1) dep, round((coalesce(arr.n,0)-coalesce(dep.n,0))/{ndays},1) net
FROM stations s LEFT JOIN dep USING(id) LEFT JOIN arr USING(id) ORDER BY net LIMIT 25""")
q("SELECT round(elev_m/10)*10 e, count(*) n FROM stations GROUP BY 1 ORDER BY 1")
