// The isometric city every map scene draws: real 2012 stations on real terrain (Open-Meteo elevation),
// the Potomac and its bridges, the Mall and Rock Creek Park, one typical weekday of hill rides.
window.CITY = (function () {
  const RS = 1.5;                       // the static map is drawn at 1.5x so camera pushes stay sharp
  const hex = (c) => { c = c.trim().replace('#', ''); return [0, 2, 4].map((i) => parseInt(c.slice(i, i + 2), 16)); };
  const mix = (a, b, t) => { const A = hex(a), B = hex(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
  const rgba = (c, a) => { const A = hex(c); return 'rgba(' + A.join(',') + ',' + a + ')'; };
  let base = null;                      // cached map canvas, shared by every scene

  function palette(kit) {
    const css = getComputedStyle(kit.stage), v = (n, d) => css.getPropertyValue(n).trim() || d;
    const g = v('--ground', '#F1EADF'), m = v('--main', '#1F8076'), s = v('--second', '#1D2730'), a = v('--accent', '#E39A1C');
    const leaf = mix(mix(m, a, 0.45), g, 0.18);
    return { g, m, s, a, sand: mix(g, a, 0.10), top: mix(g, '#ffffff', 0.55), right: mix(g, s, 0.05), left: mix(g, s, 0.16),
      ttop: mix(mix(g, m, 0.06), '#ffffff', 0.35), tright: mix(g, m, 0.10), tleft: mix(mix(g, m, 0.12), s, 0.14),
      water: mix(mix(g, m, 0.16), '#9fb6c8', 0.45), bank: mix(g, s, 0.12), grass: mix(leaf, g, 0.55), leaf, leafDark: mix(leaf, s, 0.25), shadow: s };
  }

  function drawMap(kit, D) {
    const P = palette(kit), T = D.terrain, rnd = kit.rng(23);
    const cv = document.createElement('canvas'); cv.width = 1920 * RS; cv.height = 1080 * RS;
    const c = cv.getContext('2d'); c.scale(RS, RS);
    c.fillStyle = P.g; c.fillRect(-50, -50, 2020, 1180);
    // relief: warm where the ground rises (the hill), cooler in the river valley
    for (const [x, y, e] of T.relief) {
      const warm = Math.max(0, Math.min(1, (e - 35) / 60)), cool = Math.max(0, Math.min(1, (18 - e) / 18));
      if (warm > 0) { const r = c.createRadialGradient(x, y, 0, x, y, 120); r.addColorStop(0, rgba(P.a, 0.16 * warm)); r.addColorStop(1, rgba(P.a, 0)); c.fillStyle = r; c.fillRect(x - 120, y - 120, 240, 240); }
      if (cool > 0) { const r = c.createRadialGradient(x, y, 0, x, y, 110); r.addColorStop(0, rgba(P.m, 0.05 * cool)); r.addColorStop(1, rgba(P.m, 0)); c.fillStyle = r; c.fillRect(x - 110, y - 110, 220, 220); }
    }
    // water
    const poly = (pts) => { c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); };
    c.fillStyle = P.water; c.strokeStyle = P.bank; c.lineWidth = 3;
    poly(T.river); c.fill(); c.stroke(); poly(T.tidal); c.fill(); c.stroke();
    // parks under everything
    c.fillStyle = P.grass;
    for (const [x, y, k] of T.cells) if (k === 2) { c.beginPath(); c.ellipse(x, y, 16, 9.5, 0, 0, Math.PI * 2); c.fill(); }
    // bridges
    for (const [[x1, y1], [x2, y2]] of T.bridges) {
      c.lineCap = 'butt'; c.strokeStyle = P.bank; c.lineWidth = 16; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
      c.strokeStyle = P.top; c.lineWidth = 11; c.stroke();
    }
    // buildings and trees, as boxes and blobs; shadows go on their own layer so they never stack
    const sh = document.createElement('canvas'); sh.width = cv.width; sh.height = cv.height;
    const sc = sh.getContext('2d'); sc.scale(RS, RS); sc.fillStyle = P.shadow;
    const items = [];
    const B = T.block_px / 2;
    for (const [x, y, k] of T.cells) {
      if (k === 2) { for (let i = 0; i < 4; i++) items.push({ t: 'tree', x: x + (rnd() - 0.5) * 26, y: y + (rnd() - 0.5) * 14, r: 2.6 + rnd() * 2.2 }); continue; }
      if (k === 1) {
        const n = rnd() < 0.5 ? 1 : 2;
        for (let i = 0; i < n; i++) items.push({ t: 'box', x: x + (rnd() - 0.5) * 9, y: y + (rnd() - 0.5) * 5, w: 5 + rnd() * 3.5, h: 12 + rnd() * 30 + (rnd() < 0.12 ? 34 : 0), tower: true });
        continue;
      }
      const n = 2 + Math.floor(rnd() * 3);
      for (let i = 0; i < n; i++) items.push({ t: 'box', x: x + (rnd() - 0.5) * B * 1.6, y: y + (rnd() - 0.5) * B * 0.9, w: 2.6 + rnd() * 2.2, h: 3 + rnd() * 5 });
      if (rnd() < 0.45) items.push({ t: 'tree', x: x + (rnd() - 0.5) * B * 1.8, y: y + (rnd() - 0.5) * B, r: 2 + rnd() * 1.6 });
    }
    items.sort((p, q) => p.y - q.y);
    for (const it of items) {          // shadows fall down-left, away from a high sun at the upper right
      if (it.t === 'box') {
        const a = it.w * 0.866, b = it.w * 0.5, L = it.h * 0.9;
        sc.beginPath(); sc.moveTo(it.x - a, it.y - b); sc.lineTo(it.x, it.y); sc.lineTo(it.x - L * 0.9, it.y + L * 0.38); sc.lineTo(it.x - a - L * 0.9, it.y - b + L * 0.38); sc.closePath(); sc.fill();
        sc.beginPath(); sc.moveTo(it.x, it.y); sc.lineTo(it.x + a, it.y - b); sc.lineTo(it.x + a - L * 0.9, it.y - b + L * 0.38); sc.lineTo(it.x - L * 0.9, it.y + L * 0.38); sc.closePath(); sc.fill();
      } else { sc.beginPath(); sc.ellipse(it.x - it.r * 1.1, it.y + it.r * 0.5, it.r * 1.2, it.r * 0.6, 0, 0, Math.PI * 2); sc.fill(); }
    }
    c.globalAlpha = 0.13; c.drawImage(sh, 0, 0, 1920, 1080); c.globalAlpha = 1;
    for (const it of items) {
      if (it.t === 'tree') {
        c.fillStyle = P.leafDark; c.beginPath(); c.ellipse(it.x, it.y, it.r, it.r * 0.8, 0, 0, Math.PI * 2); c.fill();
        c.fillStyle = P.leaf; c.beginPath(); c.ellipse(it.x - it.r * 0.2, it.y - it.r * 0.35, it.r * 0.8, it.r * 0.62, 0, 0, Math.PI * 2); c.fill();
        continue;
      }
      const { x, y, w, h } = it, a = w * 0.866, b = w * 0.5;
      c.fillStyle = it.tower ? P.tleft : P.left;
      c.beginPath(); c.moveTo(x - a, y - b); c.lineTo(x, y); c.lineTo(x, y - h); c.lineTo(x - a, y - b - h); c.closePath(); c.fill();
      c.fillStyle = it.tower ? P.tright : P.right;
      c.beginPath(); c.moveTo(x, y); c.lineTo(x + a, y - b); c.lineTo(x + a, y - b - h); c.lineTo(x, y - h); c.closePath(); c.fill();
      c.fillStyle = it.tower ? P.ttop : P.top;
      c.beginPath(); c.moveTo(x - a, y - b - h); c.lineTo(x, y - h); c.lineTo(x + a, y - b - h); c.lineTo(x, y - 2 * b - h); c.closePath(); c.fill();
    }
    // depth of field: the far edge (top) and the near edge (bottom) go soft, like a tilt-shift lens
    const bl = document.createElement('canvas'); bl.width = cv.width; bl.height = cv.height;
    const bc = bl.getContext('2d'); bc.filter = 'blur(' + (3.2 * RS) + 'px)'; bc.drawImage(cv, 0, 0); bc.filter = 'none';
    bc.globalCompositeOperation = 'destination-in';
    const gr = bc.createLinearGradient(0, 0, 0, cv.height);
    gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.3, 'rgba(0,0,0,0)'); gr.addColorStop(0.8, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.85)');
    bc.fillStyle = gr; bc.fillRect(0, 0, cv.width, cv.height);
    c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(bl, 0, 0);
    const hz = c.createLinearGradient(0, 0, 0, cv.height * 0.3);
    hz.addColorStop(0, rgba(P.g, 0.55)); hz.addColorStop(1, rgba(P.g, 0));
    c.fillStyle = hz; c.fillRect(0, 0, cv.width, cv.height * 0.3);
    return cv;
  }

  function build(kit, opts) {
    opts = opts || {};
    const D = kit.json('city.json'), S = D.stations, P = palette(kit);
    if (!base) base = drawMap(kit, D);
    const root = kit.h('<div class="city"></div>');
    const map = kit.el('canvas', { class: 'city-fx', attrs: { width: base.width, height: base.height } });
    map.getContext('2d').drawImage(base, 0, 0);
    root.append(map);
    let g = '';
    S.forEach((s, i) => {
      const hot = i === D.focal;
      g += '<ellipse class="stn-halo" cx="' + s[2] + '" cy="' + s[3] + '" rx="17" ry="10"/>' +
        '<ellipse class="stn ' + (hot ? 'stn-hill' : 'stn-down') + '" cx="' + s[2] + '" cy="' + s[3] + '" rx="' + (hot ? 9 : 8) + '" ry="' + (hot ? 5.4 : 4.8) + '"/>';
    });
    if (opts.labels !== false) {
      const hp = S.filter((s) => s[1] === 'The Hill'), dp = S.filter((s) => s[1] === 'Downtown');
      const cx = hp.reduce((a, s) => a + s[2], 0) / hp.length, cy = Math.min(...hp.map((s) => s[3]));
      g += '<text class="zone-label" x="' + (cx - 60) + '" y="' + (cy - 44) + '">THE HILL</text>';
      g += '<text class="zone-label" x="' + (dp.reduce((a, s) => a + s[2], 0) / dp.length - 140) + '" y="' + (Math.max(...dp.map((s) => s[3])) + 64) + '">DOWNTOWN</text>';
    }
    root.append(kit.h('<svg class="city-svg" viewBox="0 0 1920 1080">' + g + '</svg>'));
    const night = kit.h('<div class="city-night"></div>');
    root.append(night);
    const cv = kit.el('canvas', { class: 'city-fx', attrs: { width: 1920, height: 1080 } });
    root.append(cv);
    kit.stage.append(root);
    const ctx = cv.getContext('2d');
    const pos = (o, d, p) => {
      const ax = S[o][2], ay = S[o][3], bx = S[d][2], by = S[d][3];
      const mx = (ax + bx) / 2, my = (ay + by) / 2 - Math.hypot(bx - ax, by - ay) * 0.22, q = 1 - p;
      return [q * q * ax + 2 * q * p * mx + p * p * bx, q * q * ay + 2 * q * p * my + p * p * by];
    };
    let cam = { z: 1, fx: 960, fy: 540 };
    return {
      D, S, root, night,
      focal: S[D.focal], down: D.down == null ? null : S[D.down],
      // m: clock minute of the day; rides drawn as teal heads with fading trails
      rides(m, alpha) {
        ctx.clearRect(0, 0, 1920, 1080);
        if (alpha <= 0) return;
        ctx.lineCap = 'round';
        for (const [o, d, st, du] of D.trips) {
          const dur = Math.max(du, 5), p = (m - st) / dur;
          if (p < 0 || p > 1) continue;
          for (let k = 4; k >= 1; k--) {
            const a = pos(o, d, Math.max(0, p - k * 0.035)), b = pos(o, d, Math.max(0, p - (k - 1) * 0.035));
            ctx.strokeStyle = P.m; ctx.globalAlpha = alpha * (0.6 - k * 0.12); ctx.lineWidth = 4.5;
            ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
          }
          const h = pos(o, d, p);
          ctx.globalAlpha = alpha; ctx.fillStyle = P.top; ctx.beginPath(); ctx.arc(h[0], h[1], 6, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = P.m; ctx.beginPath(); ctx.arc(h[0], h[1], 4, 0, Math.PI * 2); ctx.fill();
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
        cam = { z, fx, fy };
        root.style.transformOrigin = fx + 'px ' + fy + 'px';
        root.style.transform = 'scale(' + z.toFixed(4) + ')';
      },
      // where a station sits on screen under the current camera
      screen(s) { return [cam.fx + (s[2] - cam.fx) * cam.z, cam.fy + (s[3] - cam.fy) * cam.z]; },
    };
  }
  // a call-out whose leader line ends on the station; flip puts the box to the left of the point
  function placeTag(el, x, y, k, opt) {
    opt = opt || {};
    const lead = opt.lead == null ? 70 : opt.lead, flip = !!opt.flip;
    el.classList.toggle('is-flip', flip);
    el.style.setProperty('--lead', lead + 'px');
    el.style.left = x.toFixed(1) + 'px';
    el.style.top = y.toFixed(1) + 'px';
    el.style.transform = 'translate(' + (flip ? 'calc(-100% + 36px)' : '-36px') + ', calc(-100% - ' + lead + 'px)) scale(' + (k == null ? 1 : k) + ')';
  }
  const clock = (m) => { const h = Math.floor(m / 60), mm = Math.floor(m % 60); return (h > 12 ? h - 12 : h) + ':' + String(mm).padStart(2, '0') + ' am'; };
  return { build, clock, placeTag };
})();
