const { seg, eo, eio, lerp, TextFx } = kit;
kit.scene('before', {
  init(kit) {
    kit.stage.append(kit.h('<div class="ground"></div>'));
    this.city = window.CITY.build(kit);
    kit.stage.append(kit.h('<div class="words" style="left:110px;top:120px;width:660px"><h1 class="line">Before the rush, a forecast</h1>' +
      '<p class="sub before-sub">TabICL reads 18 months of weekday mornings and calls this one before anyone rides</p></div>'));
    kit.stage.append(kit.h('<div class="clock before-clock" style="left:110px;top:720px"><span>5:00 am</span><small>Wednesday, August 29, 2012</small></div>'));
    this.line = kit.stage.querySelector('.line');
    this.sub = kit.stage.querySelector('.before-sub').style;
    this.clock = kit.stage.querySelector('.before-clock').style;
  },
  render(t, kit) {
    const c = this.city;
    c.camera(lerp(1, 1.03, eio(seg(t, 0, kit.dur))), 1250, 560);
    c.night.style.opacity = 0.62;
    c.rides(0, 0);
    TextFx.fadeFromRight(this.line, t, -0.6);
    this.sub.opacity = eo(seg(t, 0.5, 1.1));
    this.clock.opacity = eo(seg(t, 0.9, 1.4));
    this.clock.transform = 'translateY(' + lerp(18, 0, eo(seg(t, 0.9, 1.4))) + 'px)';
  },
});
