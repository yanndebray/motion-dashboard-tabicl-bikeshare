const { seg, eo, eio, eob, lerp, TextFx } = kit;
kit.scene('risk', {
  init(kit) {
    kit.stage.append(kit.h('<div class="ground"></div>'));
    this.city = window.CITY.build(kit);
    const F = kit.json('forecast.json'), S = this.city.S;
    this.items = F.stations.map(([name, p, act], i) => {
      const s = S.find((x) => x[0] === name);
      const ring = kit.h('<div style="position:absolute;border-radius:50%;background:var(--accent);border:3px solid var(--accent);z-index:5"></div>');
      kit.stage.append(ring);
      let tag = null;
      if (i < 3) {
        tag = kit.h('<div class="tag">' + kit.esc(name) + '<small>' + Math.round(p * 100) + '% chance empty by 9 am</small></div>');
        kit.stage.append(tag);
      }
      return { s, p, act, ring: ring.style, tag, t0: 1.2 + i * 0.18 };
    }).filter((o) => o.s);
    const hp = this.items.map((o) => o.s);
    this.fx = hp.reduce((a, s) => a + s[2], 0) / hp.length;
    this.fy = hp.reduce((a, s) => a + s[3], 0) / hp.length;
    kit.stage.append(kit.h('<div class="words" style="left:110px;top:120px;width:600px"><h2 class="line">Where it runs dry</h2>' +
      '<p class="sub risk-sub">Forecast chance that each hill station is empty by 9 am</p>' +
      '<p class="sub risk-check" style="color:var(--accent)">By 9 am, 16th &amp; Harvard was empty, as forecast</p></div>'));
    this.line = kit.stage.querySelector('.line');
    this.sub = kit.stage.querySelector('.risk-sub').style;
    this.check = kit.stage.querySelector('.risk-check').style;
  },
  render(t, kit) {
    const c = this.city, z = lerp(1.03, 1.5, eio(seg(t, 0, 1.4)));
    const FX = lerp(1250, this.fx, eio(seg(t, 0, 1.4))), FY = lerp(560, this.fy, eio(seg(t, 0, 1.4)));
    c.camera(z, FX, FY);
    c.night.style.opacity = lerp(0.62, 0.35, seg(t, 0, kit.dur));
    c.rides(0, 0);
    TextFx.fadeFromRight(this.line, t, 0.1);
    this.sub.opacity = eo(seg(t, 0.8, 1.3));
    this.check.opacity = eo(seg(t, 4.0, 4.5));
    this.check.transform = 'translateX(' + lerp(26, 0, eo(seg(t, 4.0, 4.5))) + 'px)';
    for (const o of this.items) {
      const sx = FX + (o.s[2] - FX) * z, sy = FY + (o.s[3] - FY) * z;
      const k = eob(seg(t, o.t0, o.t0 + 0.6), 1.6), w = (30 + o.p * 190) * k, h = w * 0.6;
      o.ring.left = (sx - w / 2) + 'px'; o.ring.top = (sy - h / 2) + 'px';
      o.ring.width = w + 'px'; o.ring.height = h + 'px';
      o.ring.opacity = k > 0 ? 1 : 0;
      o.ring.background = 'color-mix(in srgb, var(--accent) ' + Math.round(10 + o.p * 60) + '%, transparent)';
      if (o.tag) {
        const p = eo(seg(t, o.t0 + 0.5, o.t0 + 0.9)), i = this.items.indexOf(o);
        window.CITY.placeTag(o.tag, sx, sy, lerp(0.92, 1, p), [{ lead: 90 }, { flip: true, lead: 250 }, { flip: true, lead: 60 }][i]);
        o.tag.style.opacity = p;
        o.tag.classList.toggle('is-hot', i === 0 && t > 4.0);
      }
    }
  },
});
