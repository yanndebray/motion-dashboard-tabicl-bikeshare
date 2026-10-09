// The isometric city every map scene draws: real 2012 stations, one typical weekday of hill rides.
window.CITY = (function () {
  const hull = (pts) => {
    pts = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lo = [], up = [];
    for (const p of pts) { while (lo.length > 1 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
    for (const p of pts.slice().reverse()) { while (up.length > 1 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
    return lo.slice(0, -1).concat(up.slice(0, -1));
  };
  const pstr = (a) => a.map((p) => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
  function build(kit, opts) {
    opts = opts || {};
    const D = kit.json('city.json'), S = D.stations, rnd = kit.rng(11);
    const root = kit.h('<div class="city"></div>');
    let g = '';
    for (let i = -40; i < 40; i++) {
      const c = i * 64;
      g += '<line class="street" x1="' + (c - 1200) + '" y1="-200" x2="' + (c + 1200 * 1.732) + '" y2="' + (1200 * 1 - 200) + '"/>';
      g += '<line class="street" x1="' + (c - 1200) + '" y1="1280" x2="' + (c + 1200 * 1.732) + '" y2="' + (1280 - 1200) + '"/>';
    }
    const hp = S.filter((s) => s[1] === 'The Hill').map((s) => [s[2], s[3]]);
    const cx = hp.reduce((a, p) => a + p[0], 0) / hp.length, cy = hp.reduce((a, p) => a + p[1], 0) / hp.length;
    const top = hull(hp).map(([x, y]) => { const dx = x - cx, dy = y - cy, l = Math.hypot(dx, dy) || 1; return [x + dx / l * 70, y + dy / l * 46]; });
    const side = top.map(([x, y]) => [x, y + 44]);
    g += '<polygon class="cliff" points="' + pstr(side) + '"/><polygon class="plateau" points="' + pstr(top) + '"/>';
    const boxes = [];
    S.forEach((s) => { if (s[1] !== 'Downtown') return; for (let j = 0; j < 2; j++) boxes.push([s[2] + (rnd() - 0.5) * 70, s[3] + (rnd() - 0.5) * 40, 12 + rnd() * 14, 26 + rnd() * 70]); });
    boxes.sort((a, b) => a[1] - b[1]).forEach(([x, y, w, h]) => {
      const a = w * 0.866, b = w * 0.5;
      g += '<polygon class="bld-l" points="' + pstr([[x - a, y - b], [x, y], [x, y - h], [x - a, y - b - h]]) + '"/>';
      g += '<polygon class="bld-r" points="' + pstr([[x, y], [x + a, y - b], [x + a, y - b - h], [x, y - h]]) + '"/>';
      g += '<polygon class="bld-t" points="' + pstr([[x - a, y - b - h], [x, y - h], [x + a, y - b - h], [x, y - 2 * b - h]]) + '"/>';
    });
    S.forEach((s, i) => {
      const z = s[1] === 'The Hill' ? 'hill' : s[1] === 'Downtown' ? 'down' : 'other', big = i === D.focal ? 1.8 : 1;
      g += '<ellipse class="stn stn-' + z + '" cx="' + s[2] + '" cy="' + s[3] + '" rx="' + 10 * big + '" ry="' + 6 * big + '"/>';
    });
    if (opts.labels !== false) {
      g += '<text class="zone-label" x="' + (cx + 40) + '" y="' + (cy - 110) + '">THE HILL</text>';
      const dp = S.filter((s) => s[1] === 'Downtown');
      g += '<text class="zone-label" x="' + (dp.reduce((a, s) => a + s[2], 0) / dp.length - 140) + '" y="' + (Math.max(...dp.map((s) => s[3])) + 70) + '">DOWNTOWN</text>';
    }
    root.append(kit.h('<svg class="city-svg" viewBox="0 0 1920 1080">' + g + '</svg>'));
    const night = kit.h('<div class="city-night"></div>');
    root.append(night);
    const cv = kit.el('canvas', { class: 'city-fx', attrs: { width: 1920, height: 1080 } });
    root.append(cv);
    kit.stage.append(root);
    const ctx = cv.getContext('2d');
    const css = getComputedStyle(kit.stage);
    const teal = css.getPropertyValue('--main').trim() || '#2A9187', ink = css.getPropertyValue('--second').trim() || '#EAF2F0';
    const pos = (o, d, p) => {
      const ax = S[o][2], ay = S[o][3], bx = S[d][2], by = S[d][3];
      const mx = (ax + bx) / 2, my = (ay + by) / 2 - Math.hypot(bx - ax, by - ay) * 0.22, q = 1 - p;
      return [q * q * ax + 2 * q * p * mx + p * p * bx, q * q * ay + 2 * q * p * my + p * p * by];
    };
    return {
      D, S, root, night,
      focal: S[D.focal], down: D.down == null ? null : S[D.down],
      // m: clock minute of the day; rides drawn as heads with fading trails
      rides(m, alpha) {
        ctx.clearRect(0, 0, 1920, 1080);
        if (alpha <= 0) return;
        ctx.lineCap = 'round';
        for (const [o, d, st, du] of D.trips) {
          const dur = Math.max(du, 5), p = (m - st) / dur;
          if (p < 0 || p > 1) continue;
          for (let k = 4; k >= 1; k--) {
            const a = pos(o, d, Math.max(0, p - k * 0.035)), b = pos(o, d, Math.max(0, p - (k - 1) * 0.035));
            ctx.strokeStyle = teal; ctx.globalAlpha = alpha * (0.55 - k * 0.11); ctx.lineWidth = 5;
            ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
          }
          const h = pos(o, d, p);
          ctx.globalAlpha = alpha; ctx.fillStyle = ink;
          ctx.beginPath(); ctx.arc(h[0], h[1], 4.5, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
      },
      stock(m, which) {
        const M = D.stock.minutes, V = D.stock[which || 'hill'];
        if (m <= M[0]) return V[0];
        for (let i = 1; i < M.length; i++) if (m <= M[i]) return V[i - 1] + (V[i] - V[i - 1]) * (m - M[i - 1]) / (M[i] - M[i - 1]);
        return V[V.length - 1];
      },
      camera(z, fx, fy) {
        root.style.transformOrigin = fx + 'px ' + fy + 'px';
        root.style.transform = 'scale(' + z.toFixed(4) + ')';
      },
    };
  }
  const clock = (m) => { const h = Math.floor(m / 60), mm = Math.floor(m % 60); return (h > 12 ? h - 12 : h) + ':' + String(mm).padStart(2, '0') + ' am'; };
  return { build, clock };
})();
