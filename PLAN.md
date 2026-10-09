# Plan: replicate the "Claude Dashboards + Claude Motion" demo with the UCI Bike Sharing dataset

Sources
- Video: https://www.youtube.com/watch?v=en0GuyhieQk (1:21), analyzed with `uvx --from merleau ponty … -m gemini-3.8-flash`
  - `en0GuyhieQk_pass1_overview.md`: narrative, datasets, metrics
  - `en0GuyhieQk.md`: shot-by-shot visual breakdown (layout, colors, on-screen text, voice-over)
- Dataset: https://archive.ics.uci.edu/dataset/275/bike+sharing+dataset (Capital Bikeshare, Washington DC, 2011–2012)

## 1. What the video is

It's a product announcement, not a coding tutorial. Nate from Anthropic's design team plays an ops lead at a bike share and walks through four steps:

1. **Problem:** "Every weekday, the docks on the hill are empty by 8:15."
2. **Dashboard:** Claude pulls a year of rides from a warehouse (Snowflake) and builds an interactive dashboard.
3. **Motion:** "@Claude turn this into an animation for our all-hands … the hill running dry by 8:15, and the 92 bikes we carry back up." The result is an isometric 3D city where the light goes from dawn to day, the clock runs 5:35 → 8:15 am, bikes stream downhill, and the Fernhill counter drops 21 → 0. It ends on a close-up of an empty dock.
4. **Steer + share:** timestamped comments on the video ("Hold on the empty dock a beat longer"), teammates comment, then export to Figma, Canva, Lottie and similar tools.

The narrative is **one question → dashboard that finds the answer → animation that tells it → iterate with comments**. That is the part to replicate.

### Dashboard spec as shown (synthetic data)
| Area | Content |
|---|---|
| Header | "Bike share / System overview", "24 stations, 512 docks · Oct 2025 – Sep 2026"; segmented filter **All / Members / Casual** |
| KPI row (6) | Total trips 445K · Busiest day 2,999 · Weekday rides 6–9 am 21% (+3% YoY) · Empty-dock moments 4,200 · Share on the hill 71% · Bikes to move uphill 92 |
| Row 2 | Rides per day: line with a 7-day rolling average and a hover tooltip · Rides by hour: weekday (teal) vs weekend (gray) areas |
| Row 3 | Morning departures by station (zone map: Hill = amber `#F5A623`, Downtown = teal `#237A7A`, Other = gray) · Net bikes by 8 am (diverging bars) · Bikes docked at Fernhill vs Canal St (step lines) · Empty-dock moments per day (stacked columns) |

*Caveat: Gemini's readings of small text are not always consistent. Pass 1 says "Jul 11", pass 2 says "Jul 1", and pass 1 named a nonexistent model. Treat the exact copy as approximate.*

## 2. Gap analysis: video data vs UCI data

| Needed by the video | UCI `hour.csv` / `day.csv` | Verdict |
|---|---|---|
| Trips over time, hourly | `cnt` per hour, 17,379 rows (165 hours missing) | ✅ |
| Members vs Casual | `registered` / `casual` | ✅ the filter maps directly |
| Weekday vs weekend | `workingday`, `weekday`, `holiday` | ✅ |
| Weather, season | `weathersit`, `temp`, `atemp`, `hum`, `windspeed`, `season` | ➕ bonus, not in the video |
| **Stations, coordinates, zones** | ❌ system-wide totals only | Needs augmentation |
| **Dock inventory / empty-dock events** | ❌ | Can only be estimated from net trip flows |

Real numbers already computed from UCI (`scratchpad/kpis.py`):
- 2011: 1,243,103 trips; 2012: 2,049,576 trips (+65%)
- Busiest day: 2012-09-15 with 8,714 trips. Quietest: 2012-10-29 with 22 trips (Hurricane Sandy)
- Weekday 7–9 am share: 21.6% in 2011 and 22.0% in 2012. This happens to match the video's "21%".
- Average weekday rides per hour: 8 am = 477, 5 pm = 525. Weekend peak is around midday (~366). The bimodal commuter curve appears clearly.
- Casual share: 13% on working days vs 32% on weekends
- Average rides per hour by weather: clear 205 → light rain or snow 112 → heavy 74

## 3. Two ways to replicate

**Track A: UCI only (faithful to the dataset, different story).** UCI has no stations, so there is no "hill". The equivalent single question becomes:
> "Ridership grew 65% in a year, yet a single storm can take a day to almost zero. When do we actually need bikes, who rides them, and how much does weather cost us?"

The headline shifts from "the hill runs dry by 8:15" to **"the 8 am commuter wave"**: registered riders create a sharp weekday 8 am / 5–6 pm double peak, casual riders show a weekend midday curve, and weather cuts demand.

**Track B: UCI plus Capital Bikeshare trip history (faithful to the video).** The same system publishes trip-level data for the same years, with start and end station, timestamps and member type:
- `https://s3.amazonaws.com/capitalbikeshare-data/2011-capitalbikeshare-tripdata.zip` (25 MB) and `…/2012-…zip` (43 MB). Both are verified reachable.
- Station coordinates: `https://gbfs.capitalbikeshare.com/gbfs/en/station_information.json`. This is today's station list, so match 2011–12 station names to it and fix leftovers by hand.
- With this you can rebuild **net bikes by 8 am per station**, the departure map, and a real "hill". DC's uphill neighborhoods (Columbia Heights, Adams Morgan, Mt Pleasant) drain toward downtown and Dupont each morning, which is a known rebalancing problem.
- Daily totals from the trip files should match UCI `cnt`. Run that check to tie both sources together.

**Recommendation:** use Track B for the station story and keep UCI as the canonical hourly table plus weather. If you want to stay strictly within the UCI dataset, use Track A and drop the map, net-flow and dock charts.

## 4. Step-by-step plan

### Phase 0: Setup (≈15 min)
- Put each download in its own folder under `data/` (UCI zip; for Track B, the trip zips and the GBFS JSON).
- Load into DuckDB (or pandas) to stand in for the video's "warehouse". Tables: `hourly` (UCI), `trips` and `stations` (Track B).

### Phase 1: Frame the question (5 min)
Write the one-sentence prompt, mirroring the video:
- A: *"Create a dashboard from two years of our ride data. Mornings feel broken on weekdays and we lose whole days to weather. Help us get to the bottom of it."*
- B: *"Create a dashboard from a year of our ride data. The docks in Columbia Heights are empty by 8:15 every weekday and we need to get to the bottom of it."*

### Phase 2: Data prep and metrics
| Video KPI | Track A (UCI) | Track B (+trips) |
|---|---|---|
| Total trips 12 mo | `sum(cnt)` for 2012 → 2.05M | same, cross-checked against trips |
| Busiest day | 8,714 on Sat Sep 15, 2012 | same |
| Weekday rides 6–9 am share + YoY | 22.0% (2012) vs 21.6% (2011) | same |
| Empty-dock moments | → **"Rides lost to bad weather"**: expected minus actual on weathersit ≥ 3 days, using an hour × workingday × month baseline | estimate a dock-empty proxy: hours where a station's cumulative net outflow since 5 am exceeds an assumed capacity (state the assumption) |
| Share on the hill | → **"Registered share of 8 am rides"** | % of morning net outflow from "hill" stations |
| Bikes to move uphill | → **"Peak-hour bikes needed"**, e.g. p95 of weekday 8 am `cnt` | sum of negative net flow by 8 am for hill stations, as a typical-weekday median |

Derived tables: `daily` with a 7-day rolling mean; `by_hour × daytype × rider_type`; Track B adds `station_net_by_8am` and `station_cumulative_inventory(5:00–10:00)` for the Fernhill-vs-Canal-St style chart.

### Phase 3: Build the dashboard (artifact)
Copy the video's layout:
- Header with title, subtitle "Capital Bikeshare · Washington DC · 2011–2012", and an **All / Members (registered) / Casual** toggle that drives every chart.
- KPI row with 6 cards, each with a one-line caption. Amber accent for the problem metric, teal for the action metric.
- Row 2: Rides per day (line + 7-day average, tooltip) · Rides by hour (weekday teal vs weekend gray).
- Row 3:
  - A: Hour × weekday heatmap · Ridership by weather (bar) · Temperature vs rides (scatter + trend) · Hurricane Sandy week, annotated
  - B: Station departure map (Hill/Downtown/Other) · Net bikes by 8 am (diverging bars) · Cumulative inventory, hill vs downtown station (step lines) · Estimated empty moments per day (stacked)
- Palette: teal `#237A7A`, amber `#F5A623`, neutral gray, with light and dark modes.
- Data embedded as JSON aggregates (a few hundred KB at most). No raw trip rows go in the page.

### Phase 4: Turn it into a motion narrative
Prompt: *"Turn this into an animation for our all-hands. Keep it simple: [the hill running dry by 8:15 / the 8 am wave], and the N bikes we carry back."*
Storyboard, about 30–45 s, matching the video's beats:
1. Dark pre-dawn city, clock reads 5:30 am, "Typical weekday".
2. Light rises; flow lines stream from residential or hill stations to downtown. Counters tick (B: real station names; A: the hourly `cnt` curve drawn as a rising wave).
3. 8:15 am: the hill counter hits 0. Close-up of an empty dock, **held a beat longer** (the video's own steering comment).
4. Callout card with the headline KPI ("July–Sept · N empty moments · X% on the hill" / "22% of weekday rides happen 7–9 am").
5. Vans or rebalancing arrows carry N bikes back up. End card.
Implementation: an HTML/Canvas or Three.js isometric grid, with timing driven by the real per-15-min aggregates. Export frames for MP4 or Lottie if needed.

### Phase 5: Steer and review
- Run the video's comment loop: post 2–3 timestamped notes ("hold on the empty dock", "name the van route", "put the KPI on the title slide") and apply them.
- Check every on-screen number against the Phase 2 tables. In the video, the animation numbers come straight from the dashboard.

### Phase 6: Deliverables
- `data/` and a prep script (DuckDB SQL or pandas)
- Dashboard artifact (HTML)
- Motion artifact (HTML animation, plus an optional MP4)
- A short write-up: the question, the answer, and the action ("move N bikes uphill by 7:30")

## 5. Risks and notes
- **No dock data anywhere.** Even Track B can only *estimate* empty docks from net flows. Label those metrics as estimates.
- 2011–12 station names differ from today's GBFS list, so expect some manual coordinate matching.
- The UCI `temp`, `hum` and `windspeed` columns are normalized (temp ÷ 41 °C, hum ÷ 100, wind ÷ 67). Un-normalize them before showing values.
- The 165 missing hours are mostly overnight or during outages. Fill with 0 for the per-day chart; don't impute.
- The video's numbers are synthetic, so don't try to match them. Only the 6–9 am share coincidentally matches.
