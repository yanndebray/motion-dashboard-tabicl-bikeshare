const { seg, eo, eio, lerp, TextFx } = kit;
kit.scene('table', {
  init(kit) {
    const E = kit.json('explain.json'), esc = kit.esc;
    const cells = (r) => [r.date, r.day, r.temp + ' °C', r.sky, String(r.yday), String(r.avg5)];
    const row = (cls, vals, last) => '<div class="tbl-row ' + cls + '">' + vals.map((v) => '<span>' + esc(v) + '</span>').join('') + '<span>' + esc(last) + '</span></div>';
    let html = row('tbl-head', ['Morning', 'Day', 'Temp', 'Sky', 'Yesterday', '5-day avg'], 'Bikes uphill');
    html += '<div class="tbl-row tbl-more"><span style="grid-column:1/-1">' + (E.n_context - 6) + ' more weekday mornings since January 2011</span></div>';
    E.recent.forEach((r) => { html += row('tbl-past', cells(r), String(r.y)); });
    html += row('tbl-q', cells(E.query), '?');
    kit.stage.append(kit.h('<div class="ground">' +
      '<div class="words" style="left:110px;top:80px;width:1600px"><h2 class="line">Every past morning is a row</h2>' +
      '<p class="sub table-sub">' + E.n_context + ' weekday mornings, January 2011 to June 2012, each with 12 columns known by 5 am. The last column is the answer</p></div>' +
      '<div class="tbl table-t" style="left:110px;top:360px">' + html + '</div></div>'));
    this.line = kit.stage.querySelector('.line');
    this.sub = kit.stage.querySelector('.table-sub').style;
    this.rows = [...kit.stage.querySelectorAll('.tbl-row')].map((e) => e.style);
    this.q = kit.stage.querySelector('.tbl-q');
    this.qmark = this.q.lastElementChild.style;
  },
  render(t, kit) {
    TextFx.fadeFromRight(this.line, t, -0.3);
    this.sub.opacity = eo(seg(t, 0.6, 1.1));
    const n = this.rows.length;
    this.rows.forEach((s, i) => {
      const t0 = i === n - 1 ? 3.0 : 0.9 + i * 0.22, p = eo(seg(t, t0, t0 + 0.5));
      s.opacity = p;
      s.transform = 'translateY(' + lerp(i === n - 1 ? 60 : 24, 0, p) + 'px)';
    });
    this.qmark.opacity = t < 3.6 ? 1 : 0.55 + 0.45 * Math.cos(Math.PI * 2 * (t - 3.6) / 1.6);
    this.q.style.transform += ' scale(' + lerp(1, 1.015, eio(seg(t, 3.4, kit.dur))) + ')';
  },
});
