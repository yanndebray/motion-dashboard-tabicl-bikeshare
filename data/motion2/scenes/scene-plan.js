const { seg, eo, eob, lerp, TextFx } = kit;
kit.scene('plan', {
  init(kit) {
    const F = kit.json('forecast.json');
    this.q90 = Math.round(F.bikes.q90);
    this.r = F.agreement_min;
    kit.stage.append(kit.h('<div class="ground">' +
      '<div class="words" style="left:160px;top:200px;width:1600px"><div class="big hot plan-big">240</div>' +
      '<p class="line plan-line">bikes staged on the hill before Wednesday&#39;s rush</p>' +
      '<p class="sub plan-sub">The top of the 80% band. 91% of held-out mornings landed inside it</p>' +
      '<div class="plan-chips" style="display:flex;gap:18px;flex-wrap:wrap;margin-top:18px">' +
      '<span class="tag plan-chip" style="position:static">TabICL on this laptop</span>' +
      '<span class="tag plan-chip" style="position:static">TabICL on api.tabicl.org</span>' +
      '<span class="sub plan-r" style="align-self:center">same answers, r = 0.98 or better</span></div>' +
      '<p class="sub plan-src" style="font-size:24px;margin-top:30px">Capital Bikeshare trip history 2011 to 2012. Trained to June 2012, scored on July to December</p></div></div>'));
    this.line = kit.stage.querySelector('.plan-line');
    this.bigEl = kit.stage.querySelector('.plan-big');
    for (const k of ['big', 'sub', 'r', 'src']) this[k] = kit.stage.querySelector('.plan-' + k).style;
    this.chips = [...kit.stage.querySelectorAll('.plan-chip')].map((e) => e.style);
  },
  render(t, kit) {
    this.bigEl.textContent = String(this.q90);
    const a = eob(seg(t, 0.0, 0.5), 1.6);
    this.big.transformOrigin = '0 80%';
    this.big.transform = 'scale(' + lerp(0.6, 1, a) * lerp(1, 1.015, seg(t, 0.5, kit.dur)) + ')';
    this.big.opacity = seg(t, 0, 0.1) > 0 ? 1 : 0;
    TextFx.fadeFromRight(this.line, t, 0.3);
    this.sub.opacity = eo(seg(t, 1.0, 1.5));
    this.chips.forEach((s, i) => { const p = eo(seg(t, 1.6 + i * 0.3, 2.0 + i * 0.3)); s.opacity = p; s.transform = 'translateY(' + lerp(16, 0, p) + 'px)'; });
    this.r.opacity = eo(seg(t, 2.3, 2.7));
    this.src.opacity = eo(seg(t, 2.6, 3.0));
  },
});
