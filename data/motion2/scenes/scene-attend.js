const { seg, eo, ei, eio, lerp, TextFx } = kit;
const GX = 190, GY = 400, CW = 64, CH = 34, GAP = 9, RS = 50, NC = 6;
kit.scene('attend', {
  init(kit) {
    const E = kit.json('explain.json'), esc = kit.esc;
    const near = new Set(E.near.map((r) => r.date));
    const rows = E.near.concat(E.recent.filter((r) => !near.has(r.date))).slice(0, 8).sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
    rows.push(Object.assign({ query: true }, E.query));
    this.rows = rows;
    let cells = '', arcs = '', labels = '';
    const qy = GY + (rows.length - 1) * RS + CH / 2, xr = GX + NC * (CW + GAP) - GAP;
    rows.forEach((r, i) => {
      const y = GY + i * RS;
      for (let c = 0; c < NC; c++) cells += '<rect class="att-cell att-r' + i + '" x="' + (GX + c * (CW + GAP)) + '" y="' + y + '" width="' + CW + '" height="' + CH + '" rx="6" style="fill:color-mix(in srgb, var(--main) ' + (22 + c * 13) + '%, var(--ground))"/>';
      if (!r.query) {
        const yy = y + CH / 2, bow = 60 + (qy - yy) * 0.45, hot = near.has(r.date);
        arcs += '<path class="att-arc" data-hot="' + (hot ? 1 : 0) + '" d="M' + (xr + 14) + ' ' + qy + ' C ' + (xr + bow) + ' ' + qy + ', ' + (xr + bow) + ' ' + yy + ', ' + (xr + 14) + ' ' + yy + '" pathLength="1" style="fill:none;stroke-linecap:round;stroke-dasharray:1 1;stroke:' + (hot ? 'var(--accent)' : 'color-mix(in srgb, var(--second) 30%, transparent)') + ';stroke-width:' + (hot ? 7 : 3) + '"/>';
      }
      const txt = r.query ? r.date + '  ·  ?' : r.date + '  ·  ' + r.y + ' bikes';
      labels += '<div class="att-lab" data-hot="' + (near.has(r.date) ? 1 : 0) + '" style="position:absolute;left:1000px;top:' + (y - 4) + 'px;font-size:30px;font-variant-numeric:tabular-nums;' + (r.query ? 'color:var(--main);font-weight:700' : '') + '">' + esc(txt) + '</div>';
    });
    kit.stage.append(kit.h('<div class="ground">' +
      '<div class="words" style="left:110px;top:80px;width:1650px"><h2 class="line">It weighs mornings like this one</h2></div>' +
      '<div class="att-steps" style="position:absolute;left:110px;top:250px;display:flex;gap:16px">' +
      '<span class="chip att-s" style="position:static">1  Read each column</span><span class="chip att-s" style="position:static">2  Sum up each row</span><span class="chip att-s" style="position:static">3  Compare with past mornings that have answers</span></div>' +
      '<svg class="city-svg" viewBox="0 0 1920 1080">' + arcs + cells + '</svg>' + labels +
      '<p class="sub att-note" style="position:absolute;left:1000px;top:870px;width:820px;font-size:24px">Amber: the five past mornings most like August 29 by weather, weekday and recent level. TabICL weighs all 371, closer ones more</p></div>'));
    this.line = kit.stage.querySelector('.line');
    this.steps = [...kit.stage.querySelectorAll('.att-s')].map((e) => e.style);
    this.cells = [...kit.stage.querySelectorAll('.att-cell')];
    this.arcs = [...kit.stage.querySelectorAll('.att-arc')].map((e) => ({ s: e.style, hot: e.dataset.hot === '1' }));
    this.labs = [...kit.stage.querySelectorAll('.att-lab')].map((e) => ({ s: e.style, hot: e.dataset.hot === '1' }));
    this.note = kit.stage.querySelector('.att-note').style;
  },
  render(t, kit) {
    TextFx.fadeFromRight(this.line, t, -0.3);
    this.steps.forEach((s, i) => { const t0 = [0.5, 2.3, 3.6][i], on = eo(seg(t, t0, t0 + 0.4)), done = i < 2 ? seg(t, [2.3, 3.6][i], [2.3, 3.6][i] + 0.4) : 0; s.opacity = on * lerp(1, 0.45, done); });
    // 1: columns light up one by one; 2: each row closes into one bar; 3: arcs to past rows
    const merge = eio(seg(t, 2.4, 3.3));
    this.cells.forEach((el, k) => {
      const c = k % NC, light = eo(seg(t, 0.7 + c * 0.2, 1.0 + c * 0.2));
      el.style.opacity = lerp(0.25, 1, light);
      const x0 = GX + c * (CW + GAP), w = CW + GAP * merge * (c < NC - 1 ? 1 : 0);
      el.setAttribute('x', x0.toFixed(1)); el.setAttribute('width', w.toFixed(1)); el.setAttribute('rx', lerp(6, 0, merge).toFixed(1));
    });
    this.arcs.forEach((a, i) => { const t0 = 3.7 + i * 0.12; a.s.strokeDashoffset = 1 - eio(seg(t, t0, t0 + 0.6)); a.s.opacity = a.hot ? 1 : lerp(1, 0.5, seg(t, 4.8, 5.3)); });
    this.labs.forEach((l, i) => { const p = eo(seg(t, 1.0 + i * 0.08, 1.4 + i * 0.08)); l.s.opacity = p * (l.hot || i === this.labs.length - 1 ? 1 : lerp(1, 0.4, seg(t, 4.8, 5.3))); });
    this.note.opacity = eo(seg(t, 5.0, 5.5));
  },
});
