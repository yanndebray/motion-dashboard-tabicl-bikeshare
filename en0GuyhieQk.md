# Video Analysis: en0GuyhieQk

**Source:** [https://www.youtube.com/watch?v=en0GuyhieQk](https://www.youtube.com/watch?v=en0GuyhieQk)
**Analyzed with:** ponty (merleau v0.5.3) | gemini-3.8-flash
**Cost:** $0.0025 | 7,643 prompt tokens | 2,216 response tokens

---

### Shot-by-Shot Breakdown

#### 0:00 – 0:03
* **Visual:** Isometric 3D stylized city model with miniature white buildings, trees, and river. Teal circular badges represent bike stations with animated teal commuter flow lines moving between them.
* **Overlays:**
  * Top left: Black timestamp badge: `6:10 am` (updates to `6:35 am`), subtext `Typical weekday`.
  * Callout cards: `Fernhill | 21 bikes` (counts down), `Canal Street | 6 bikes`.
* **UI Shell:** Embedded inside a faux custom media player `Claude-Dashboards-Motion-Announcement.mov`. A cursor scrubs the playback bar backward.
* **Voice-over (VO):** *"This is a short animation about empty bike docks. It started as a dashboard."*

---

#### 0:03 – 0:06
* **Visual:** Player scrubs past the BI dashboard to Nate speaking via webcam inside the player frame. Rewind glyphs (`<<`) flash in the top-right corner.
* **VO:** [Audio rewind sound effect]

---

#### 0:06 – 0:09
* **Visual:** Video continues inside player. Left sidebar cards slide in:
  * Top card (Lavender): `NAME` / **Nate**
  * Middle card (Mint): `TEAM` / **Design**
  * Bottom card (Peach): `# DEMOS RECORDED` / **17**
* **VO:** *"Today I want to show you two new artifact types:"*

---

#### 0:09 – 0:13
* **Visual:** Title card replaces video feed inside the player. Lavender background with bicycle progression diagram along a timeline (`01`, `02`, `03`, `04`).
* **Text:**
  * Title: **Introducing Claude Dashboards and Claude Motion**
  * Badge: `Now in beta`
  * Floating widget icons on the right (chart card, stat cards).
* **VO:** *"Claude Dashboards and Claude Motion."*

---

#### 0:13 – 0:23
* **Visual:** Nate speaks to camera (now wearing a red t-shirt). A collaborative comment popover appears on the right edge of the video player:
  * User `Michael`: *"@Claude did Nate change outfits here?"*
  * AI `Claude`: *"Yes, at 0:14 he switches to an orange shirt."*
  * User `Nate`: *"I'm method acting!"*
* **VO:** *"Pretend that I run the operations team at a bike share. Every weekday, the docks on the hill are empty by 8:15. We need to get to the bottom of it."*

---

#### 0:23 – 0:26
* **Visual:** Minimalist canvas showing app connector icons: AWS, BigQuery, Snowflake, Databricks, Salesforce, Snowflake. Claude asterisk icon pulses and draws a connector line to Snowflake.
* **VO:** *"We let Claude pull a year of ride data from our data warehouse..."*

---

#### 0:26 – 0:30
* **Visual:** Split-screen Claude desktop interface.
  * **Left (Chat Pane):**
    * User prompt: *"Create a dashboard from a year of our ride data. The docks on the hill are empty by 8:15 every weekday and we need to get to the bottom of it."*
    * Claude reply: *"I'll pull the last twelve months of trips and dock counts from the warehouse, then lay them out as a dashboard."*
    * Artifact link card: `Bike Share System O...`
  * **Right (Artifact Preview):** Full analytics dashboard renders.
* **VO:** *"...and lay it out as a nice dashboard."*

---

#### 0:30 – 0:38
* **Visual:** Full-screen zoom of the **Bike Share Dashboard**.
* **Dashboard Specifications:**
  * **Header:** Title `Bike share` / `System overview`. Subtitle: `24 stations, 512 docks | Oct 2025 – Sep 2026`.
  * **Controls:** Filter tabs top-right: `[All]`, `[Members]`, `[Casual]`.
  * **KPI Grid (Row 1):**
    1. *Total trips, 12 months:* `445K` | `All riders, every station`
    2. *Busiest day:* `2,999` | `Sat, Jul 1`
    3. *Weekday rides 6-9 am:* `21%` | `+3% vs prior year` (Teal badge)
    4. *Empty-dock moments:* `4,200` | `July to September 2026`
    5. *Share on the hill:* `71%` | `Fernhill empty by 8:15 am on a typical weekday` (Yellow accent)
    6. *Bikes to move uphill:* `92` | `Each weekday, after the morning rush runs downhill` (Teal accent)
  * **Charts (Row 2):**
    * *Rides per day:* Line chart with 7-day rolling average. Hover tooltip: `Mon, May 4, 2026 | Rides: 1,938 | 7-day average: 1,842`. Color: Teal (`#237A7A`).
    * *Rides by hour:* Overlapping area charts (`Weekdays` teal vs. `Weekends` gray).
  * **Charts (Row 3):**
    * *Morning departures by station:* 2D scatter map with zones (`The Hill` in yellow `#F5A623`, `Downtown` in teal `#237A7A`, `Other` in gray).
    * *Net bikes by 8 am:* Diverging horizontal bar chart (Yellow bars for losing bikes uphill, Teal for gaining bikes downtown).
    * *Bikes docked, Fernhill and Canal Street:* Dual-line step chart over morning hours.
    * *Empty-dock moments per day:* Stacked column chart (Yellow = Fernhill, Gray = Everywhere else).
* **VO:** *"As we look at the dashboard, a story takes shape. And we'll need to tell this story to the whole team at our next all-hands meeting to get them on board."*

---

#### 0:38 – 0:46
* **Visual:** Cursor highlights the "Morning departures by station" map. Floating prompt pill:
  * `@Claude turn this into an animation for our all-hands. The whole company is watching so keep it simple: the hill running dry by 8:15, and the 92 bikes we carry back up.`
  * Transition screens: Text explaining synthesis steps: *"Projecting dashboard coordinates into a 3D city grid"* -> *"Tracing every morning ride from the hilltop to downtown"*.
* **VO:** *"So we ask Claude to turn this dashboard into an animation using Claude Motion. Claude turns it into an animated narrative."*

---

#### 0:46 – 0:55
* **Visual:** 3D Motion artifact playback pane.
  * Isometric city grid shifts lighting from pre-dawn dark blue (`5:35 am`) to morning daylight (`7:05 am`).
  * Station rings pulse; animated paths stream downhill towards Canal Street.
  * Floating dynamic tags track bike counts depleting at `Fernhill` (21 -> 14).
* **VO:** *"Claude usually does a pretty good job right away..."*

---

#### 0:55 – 1:01
* **Visual:** Camera cuts to a close-up ground view of empty bike racks with a teal bike dock sign. User drops an interactive timeline pin on the video player:
  * Input popover: `@Claude Hold on the empty dock a beat longer so it lands.`
  * Left pane displays: `Updating artifact 5s >`.
* **VO:** *"...but I can continue to tweak it and steer it with comments if I want to, right there on the video."*

---

#### 1:01 – 1:07
* **Visual:** Top bar `Share` clicked. `All comments` side drawer opens with review thread:
  * `Sam`: *"Can we name the van route here? Ops will ask."*
  * `Dev`: *"Love the 4,200. Put it on the all-hands title slide too."*
  * `Nate`: *"Hold on the empty dock a beat longer so it lands."*
  * A yellow review circle highlights the downtown area alongside a callout card: `July to September | 4,200 times a rider found an empty dock | 71% on the hill`.
* **VO:** *"I can send it to colleagues and they can comment, too. We can build the story together."*

---

#### 1:07 – 1:12
* **Visual:** Cursor clicks a coral-red `Export` button. Circular icon array spreads out showing integration tools:
  * Canva, Figma, Spline, Adobe, Rive, Lottie, and others.
* **VO:** *"And if the team wants to take it further, we can export it straight into their design tools."*

---

#### 1:12 – 1:16
* **Visual:** Minimal text screen. Text editable in a highlighted box:
  * `Claude makes it.` -> Cursor appends: `You steer it.`
* **VO:** *"So that's Claude Dashboards and Claude Motion. And you can try them out today."*

---

#### 1:16 – 1:21
* **Visual:** Centered coral-red Claude starburst logo animating and resting alongside the wordmark: **Claude**.
* **VO:** [Outro music fades out]
