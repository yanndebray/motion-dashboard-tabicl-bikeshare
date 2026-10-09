const { seg, eo, eio, lerp, TextFx } = kit;
const L = 160, R = 1760, T = 420, B = 920;
kit.scene('checked', {
  init(kit) {
    const F = kit.json('forecast.json'), S = F.series;
    const hi = Math.max(...S.map((r) => Math.max(r[1], r[2]))) * 1.08;
    const x = (i) => L + i / (S.length - 1) * (R - L), y = (v) => B - v / hi * (B - T);
    let dots = '', d = '';
    S.forEach((r, i) => { dots += '<circle class="chk-dot" cx="' + x(i).toFixed(1) + '" cy="' + y(r[1]).toFixed(1) + '" r="5" style="fill:var(--accent)"/>'; d += (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(r[2]).toFixed(1); });
    let grid = '';
    for (let v = 0; v <= hi; v += 100) grid += '<line x1="' + L + '" x2="' + R + '" y1="' + y(v) + '" y2="' + y(v) + '" style="stroke:color-mix(in srgb, var(--second) 10%, transparent);stroke-width:2"/><text class="ax" x="' + (L - 14) + '" y="' + (y(v) + 8) + '" text-anchor="end">' + v + '</text>';
    const months = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    let mx = '';
    S.forEach((r, i) => { const m = +r[0].slice(5, 7); if (i === 0 || +S[i - 1][0].slice(5, 7) !== m) mx += '<text class="ax" x="' + x(i) + '" y="' + (B + 40) + '">' + months[m - 7] + '</text>'; });
    kit.stage.append(kit.h('<div class="ground"><svg class="city-svg" viewBox="0 0 1920 1080">' + grid + mx + '<g class="chk-dots">' + dots + '</g>' +
      '<path class="chk-line" d="' + d + '" pathLength="1" style="fill:none;stroke:var(--main);stroke-width:5;stroke-linejoin:round;stroke-linecap:round;stroke-dasharray:1 1"/></svg>' +
      '<div class="words" style="left:110px;top:100px;width:1500px"><h2 class="line" style="font-size:84px">Checked on 123 held-out mornings</h2>' +
      '<p class="sub chk-sub">Off by 22 bikes a day on average. Gradient boosting: 24. Amber is what happened, teal the forecast</p></div></div>'));
    this.line = kit.stage.querySelector('.line');
    this.sub = kit.stage.querySelector('.chk-sub').style;
    this.path = kit.stage.querySelector('.chk-line').style;
    this.dots = [...kit.stage.querySelectorAll('.chk-dot')].map((e) => e.style);
  },
  render(t, kit) {
    TextFx.fadeFromRight(this.line, t, -0.2);
    const p = eio(seg(t, 0.5, 3.2)), n = this.dots.length;
    this.dots.forEach((s, i) => { s.opacity = eo(seg(p * n - i, 0, 1)); });
    this.path.strokeDashoffset = (1 - p).toFixed(4);
    this.sub.opacity = eo(seg(t, 3.0, 3.5));
  },
});
