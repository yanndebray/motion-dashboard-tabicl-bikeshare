const { seg, eo, eio, eob, lerp, TextFx } = kit;
const X0 = 260, X1 = 1660, V0 = 120, V1 = 290, AY = 860, HMAX = 360;
const px = (v) => X0 + (v - V0) / (V1 - V0) * (X1 - X0);
kit.scene('spread', {
  init(kit) {
    const E = kit.json('explain.json'), Q = E.quantiles;
    const dens = Q.slice(1).map((q, i) => 0.1 / (q - Q[i])), dmax = Math.max(...dens);
    let bars = '', ticks = '';
    dens.forEach((d, i) => { bars += '<rect class="spr-bar" x="' + px(Q[i]).toFixed(1) + '" width="' + (px(Q[i + 1]) - px(Q[i]) - 3).toFixed(1) + '" y="' + (AY - d / dmax * HMAX).toFixed(1) + '" height="' + (d / dmax * HMAX).toFixed(1) + '" rx="4" style="fill:color-mix(in srgb, var(--main) ' + Math.round(45 + 45 * d / dmax) + '%, var(--ground))"/>'; });
    for (let v = 140; v <= 280; v += 20) ticks += '<text class="ax" x="' + px(v) + '" y="' + (AY + 44) + '" text-anchor="middle">' + v + '</text>';
    const lv = px(E.level5), lo = px(Q[0]), hi = px(Q[8]);
    kit.stage.append(kit.h('<div class="ground">' +
      '<div class="words" style="left:110px;top:80px;width:1650px"><h2 class="line">Out comes a spread, not one number</h2>' +
      '<p class="sub spr-sub">It predicts how far today lands from the 5-day average, nine quantiles at once, then adds the average back</p></div>' +
      '<svg class="city-svg" viewBox="0 0 1920 1080">' +
      '<line x1="' + X0 + '" x2="' + X1 + '" y1="' + AY + '" y2="' + AY + '" style="stroke:color-mix(in srgb, var(--second) 40%, transparent);stroke-width:3"/>' + ticks +
      '<g class="spr-bars">' + bars + '</g>' +
      '<line class="spr-lv" x1="' + lv + '" x2="' + lv + '" y1="' + (AY - HMAX - 70) + '" y2="' + AY + '" style="stroke:var(--second);stroke-width:3;stroke-dasharray:10 8"/>' +
      '<path class="spr-br" d="M' + lo + ' ' + (AY + 80) + ' v 18 H ' + hi + ' v -18" style="fill:none;stroke:var(--main);stroke-width:4"/>' +
      '<text class="ax" x="' + X1 + '" y="' + (AY + 160) + '" text-anchor="end">bikes to carry uphill, Aug 29, 2012</text></svg>' +
      '<div class="chip spr-lvl" style="left:' + (lv + 14) + 'px;top:' + (AY - HMAX - 76) + 'px;background:var(--second)">5-day average: ' + Math.round(E.level5) + '</div>' +
      '<div class="chip spr-band" style="left:' + ((lo + hi) / 2 - 170) + 'px;top:' + (AY + 112) + 'px">80% of mornings: ' + Math.round(Q[0]) + ' to ' + Math.round(Q[8]) + '</div></div>'));
    this.line = kit.stage.querySelector('.line');
    this.bars = [...kit.stage.querySelectorAll('.spr-bar')].map((e) => e.style);
    for (const k of ['sub', 'lv', 'br', 'lvl', 'band']) this[k] = kit.stage.querySelector('.spr-' + k).style;
  },
  render(t, kit) {
    TextFx.fadeFromRight(this.line, t, -0.3);
    this.sub.opacity = eo(seg(t, 0.5, 1.0));
    this.lv.opacity = eo(seg(t, 0.9, 1.3)); this.lvl.opacity = eo(seg(t, 1.0, 1.4));
    const mid = (this.bars.length - 1) / 2;
    this.bars.forEach((s, i) => { const t0 = 1.5 + Math.abs(i - mid) * 0.12, p = eob(seg(t, t0, t0 + 0.5), 1.5); s.transformOrigin = '0 ' + AY + 'px'; s.transform = 'scaleY(' + Math.max(0, p) + ')'; });
    this.br.opacity = eo(seg(t, 2.9, 3.3)); this.band.opacity = eo(seg(t, 3.1, 3.5));
    this.band.transform = 'translateY(' + lerp(14, 0, eo(seg(t, 3.1, 3.5))) + 'px)';
  },
});
