"""Split data/dashboard.json into the row-shaped JSON datasets the dashboard artifact reads."""
import json, pathlib
ROOT = pathlib.Path(__file__).resolve().parents[1]
d = json.loads((ROOT / "data/dashboard.json").read_text())
out = ROOT / "data/dash"; out.mkdir(exist_ok=True)
fmt = lambda m: f"{m // 60}:{m % 60:02d} am" if m < 720 else f"{m // 60 - 12}:{m % 60:02d} pm"
w = lambda name, rows: (out / f"{name}.json").write_text(json.dumps(rows, separators=(",", ":")))
V, K = d["views"], d["kpi"]
w("kpis", [{"rider": r, "trips": v["total"], "trips_2011": v["total_prev"], "busiest_date": v["busiest"]["date"],
            "busiest_rides": v["busiest"]["n"], "am_share": round(v["am_share"], 4), "am_share_2011": round(v["am_share_prev"], 4)}
           for r, v in V.items()])
w("ops", [{"stations": d["meta"]["stations"], "docks": d["meta"]["docks"], "year": d["meta"]["year"],
           "empty_moments": K["empty_moments_q3"], "empty_share_hill": round(K["empty_share_hill"], 4),
           "bikes_uphill": K["bikes_uphill"], "hill_station": K["focal_hill"], "hill_station_docks": K["focal_hill_cap"],
           "hill_empty_at": fmt(K["focal_hill_empty_at"]), "downtown_station": K["focal_down"],
           "downtown_station_docks": K["focal_down_cap"], "hill_elev_m": d["motion"]["hill_elev_m"],
           "downtown_elev_m": d["motion"]["down_elev_m"]}])
w("daily", [{"rider": r, "day": day, "rides": n, "avg7": a} for r, v in V.items() for day, n, a in v["daily"]])
w("hourly", [{"rider": r, "hour": h, "weekday": v["hourly"]["weekday"][h], "weekend": v["hourly"]["weekend"][h]}
             for r, v in V.items() for h in range(24)])
w("stations", [{**{k: s[k] for k in ("id", "name", "zone", "capacity", "net_am")}, "lat": round(s["lat"], 5),
                "lon": round(s["lon"], 5), "elev_m": round(s["elev_m"]),
                **{f"dep_{r.lower()}": V[r]["departures_am"].get(s["id"], 0) for r in V}} for s in d["stations"]])
c = d["stock_curves"]
w("stock", [{"minute": m, "time": fmt(m), "hill": h, "downtown": dn} for m, h, dn in zip(c["minutes"], c["hill"], c["down"])])
w("empty_daily", [{"day": day, "hill_station": a, "elsewhere": b} for day, a, b in d["empty_daily"]])
for f in sorted(out.iterdir()): print(f.name, f.stat().st_size)
