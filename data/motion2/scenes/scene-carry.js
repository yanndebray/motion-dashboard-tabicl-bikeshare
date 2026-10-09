const { seg, eo, ei, eio, eob, lerp, TextFx } = kit;
const X0 = 220, X1 = 1700, V0 = 100, V1 = 300, AY = 700;
const px = (v) => X0 + (v - V0) / (V1 - V0) * (X1 - X0);
kit.scene('carry', {
  init(kit) {
    const B = kit.json('forecast.json').bikes;
    this.B = B;
    let ticks = '';
    for (let v = V0; v <= V1; v += 50) ticks += '<line x1="' + px(v) + '" y1="' + (AY + 40) + '" x2="' + px(v) + '" y2="' + (AY + 56) + '" style="stroke:color-mix(in srgb, var(--second) 40%, transparent);stroke-width:3"/>' +
      '<text class="ax" x="' + px(v) + '" y="' + (AY + 92) + '" text-anchor="middle">' + v + '</text>';
    kit.stage.append(kit.h('<div class="ground"><svg class="city-svg" viewBox="0 0 1920 1080">' +
      '<line x1="' + X0 + '" y1="' + (AY + 40) + '" x2="' + X1 + '" y2="' + (AY + 40) + '" style="stroke:color-mix(in srgb, var(--second) 40%, transparent);stroke-width:3"/>' + ticks +
      '<text class="ax" x="' + X1 + '" y="' + (AY + 130) + '" text-anchor="end">bikes to carry uphill, 5 to 10 am</text></svg>' +
      '<div class="band carry-band" style="top:' + (AY - 22) + 'px"></div>' +
      '<div class="pin carry-mid" style="top:' + (AY - 60) + 'px;height:120px"></div>' +
      '<div class="pin is-hot carry-act" style="top:' + (AY - 90) + 'px;height:150px"></div>' +
      '<div class="words carry-num" style="top:' + (AY - 330) + 'px;width:600px"><div class="big cool carry-n">206</div><p class="sub">forecast, 80% band 165 to 240</p></div>' +
      '<div class="tag is-hot carry-tag" style="top:' + (AY - 170) + 'px">Actual: 224<small>inside the band</small></div>' +
      '<div class="words" style="left:110px;top:100px;width:1300px"><h2 class="line">Bikes to carry back up</h2>' +
      '<p class="sub carry-sub">The forecast for Wednesday morning, made at 5 am</p></div></div>'));
    this.line = kit.stage.querySelector('.line');
    for (const k of ['band', 'mid', 'act', 'num', 'tag', 'sub']) this[k] = kit.stage.querySelector('.carry-' + k).style;
    this.nEl = kit.stage.querySelector('.carry-n');
  },
  render(t, kit) {
    const B = this.B;
    TextFx.fadeFromRight(this.line, t, -0.2);
    this.sub.opacity = eo(seg(t, 0.4, 0.9));
    const g = eio(seg(t, 0.8, 1.7)), mid = px(B.mean);
    this.band.left = lerp(mid, px(B.q10), g) + 'px';
    this.band.width = (lerp(mid, px(B.q90), g) - lerp(mid, px(B.q10), g)) + 'px';
    this.band.opacity = g > 0 ? 1 : 0;
    this.mid.left = (mid - 3) + 'px';
    this.mid.opacity = eo(seg(t, 0.8, 1.1));
    this.num.left = (mid - 150) + 'px';
    this.num.opacity = eo(seg(t, 1.0, 1.4));
    this.nEl.textContent = Math.round(lerp(B.mean / 2, B.mean, eo(seg(t, 1.0, 1.9))));
    const a = eob(seg(t, 2.8, 3.3), 1.7), ax = px(B.actual);
    this.act.left = (ax - 3) + 'px';
    this.act.opacity = seg(t, 2.8, 2.9);
    this.act.transform = 'translateY(' + lerp(-120, 0, a) + 'px)';
    this.act.transformOrigin = '50% 100%';
    this.tag.left = (ax + 16) + 'px';
    this.tag.opacity = eo(seg(t, 3.3, 3.7));
  },
});
