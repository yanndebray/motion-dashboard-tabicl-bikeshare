const { seg, eo, eob, eio, lerp, TextFx } = kit;
kit.scene('context', {
  init(kit) {
    const E = kit.json('explain.json');
    const arrow = (cls, d) => '<path class="' + cls + '" d="' + d + '" pathLength="1" style="fill:none;stroke:var(--second);stroke-width:5;stroke-linecap:round;stroke-dasharray:1 1"/>';
    kit.stage.append(kit.h('<div class="ground">' +
      '<div class="words" style="left:110px;top:80px;width:1600px"><h2 class="line">The table is the prompt</h2>' +
      '<p class="sub ctx-sub">No training run on our data. TabICL learned how tables behave once, before it ever saw this one</p></div>' +
      '<svg class="city-svg" viewBox="0 0 1920 1080">' +
      arrow('ctx-a1', 'M700 540 C 800 540, 820 610, 920 620') + arrow('ctx-a2', 'M700 800 C 800 800, 820 690, 920 680') +
      arrow('ctx-a3', 'M1480 650 L 1600 650') + '</svg>' +
      '<div class="node ctx-c" style="left:150px;top:440px;width:550px;height:200px"><b>' + E.n_context + ' past mornings</b><small>12 columns each, with the answer filled in</small></div>' +
      '<div class="node ctx-q" style="left:150px;top:720px;width:550px;height:160px;border-color:var(--main)"><b>' + kit.esc(E.query.date) + '</b><small>same 12 columns, answer unknown</small></div>' +
      '<div class="node is-model ctx-m" style="left:920px;top:520px;width:560px;height:260px"><b>TabICL</b><small>a transformer pretrained on millions of synthetic tables</small></div>' +
      '<div class="node ctx-o" style="left:1600px;top:560px;width:240px;height:180px;border-color:var(--main)"><b>?</b><small>one forward pass</small></div>' +
      '<p class="sub ctx-time" style="position:absolute;left:920px;top:810px;width:900px;font-size:28px">About 4 seconds on this laptop, 17 through api.tabicl.org</p></div>'));
    this.line = kit.stage.querySelector('.line');
    for (const k of ['sub', 'c', 'q', 'm', 'o', 'time']) this[k] = kit.stage.querySelector('.ctx-' + k).style;
    this.a = ['a1', 'a2', 'a3'].map((k) => kit.stage.querySelector('.ctx-' + k).style);
  },
  render(t, kit) {
    TextFx.fadeFromRight(this.line, t, -0.3);
    this.sub.opacity = eo(seg(t, 0.5, 1.0));
    [[this.c, 0.4], [this.q, 0.65]].forEach(([s, t0]) => { const p = eo(seg(t, t0, t0 + 0.5)); s.opacity = p; s.transform = 'translateX(' + lerp(-40, 0, p) + 'px)'; });
    const m = eob(seg(t, 1.1, 1.6), 1.6);
    this.m.opacity = seg(t, 1.1, 1.2); this.m.transform = 'scale(' + lerp(0.85, 1, m) * lerp(1, 1.02, seg(t, 1.6, kit.dur)) + ')';
    this.a[0].strokeDashoffset = 1 - eio(seg(t, 1.7, 2.3));
    this.a[1].strokeDashoffset = 1 - eio(seg(t, 1.9, 2.5));
    this.a[2].strokeDashoffset = 1 - eio(seg(t, 2.8, 3.2));
    const o = eob(seg(t, 3.1, 3.5), 1.7); this.o.opacity = seg(t, 3.1, 3.2); this.o.transform = 'scale(' + lerp(0.8, 1, o) + ')';
    this.time.opacity = eo(seg(t, 3.5, 4.0));
  },
});
