kit.score(function (S, T) {
  S.tempo(96, { t0: T.carry });                      // beat 0 = bikes to carry; the plan card lands on its own hit
  S.program('pad', 'pad', { rev: 0.6 }); S.program('mallet', 'marimba', { pan: -0.2 });
  S.program('bass', 'bass'); S.program('keys', 'ep', { rev: 0.3 }); S.program('bell', 'vibes', { rev: 0.5 });
  // before: a pad and one note under the title
  S.chord('pad', ['E3', 'B3', 'F#4'], { t: 0, dur: 4.3, vel: 30 });
  S.note('bell', 'B4', { t: 0.9, dur: 1.2, vel: 40 });
  // the explainer: a calm bed of keys, with foley on what appears
  S.chord('keys', ['C3', 'E3', 'G3', 'B3'], { t: T.table, dur: 5.5, vel: 34 });
  S.chord('pad', ['C3', 'G3', 'E4'], { t: T.table, dur: 11, vel: 28 });
  for (let i = 0; i < 8; i++) S.fx('tick', T.table + 0.9 + i * 0.22, { vel: 26 });
  S.fx('pop', T.table + 3.0, { vel: 42 }); S.note('bell', 'G5', { t: T.table + 3.1, dur: 1.2, vel: 40 });
  S.chord('keys', ['A2', 'C3', 'E3', 'G3'], { t: T.context, dur: 5, vel: 36 });
  S.fx('pop', T.context + 0.4, { vel: 34 }); S.fx('pop', T.context + 0.65, { vel: 34 });
  S.fx('boing', T.context + 1.15, { vel: 36 });
  S.fx('whoosh', T.context + 1.7, { dur: 0.8, vel: 24 }); S.fx('ding', T.context + 3.15, { vel: 40 });
  S.chord('keys', ['F2', 'A2', 'C3', 'E3'], { t: T.attend, dur: 3.5, vel: 36 });
  S.chord('keys', ['G2', 'B2', 'D3', 'F#3'], { t: T.attend + 3.5, dur: 3.5, vel: 38 });
  S.chord('pad', ['F3', 'C4', 'E4'], { t: T.attend, dur: 7, vel: 28 });
  for (let c = 0; c < 6; c++) S.note('mallet', ['C5', 'D5', 'E5', 'G5', 'A5', 'B5'][c], { t: T.attend + 0.7 + c * 0.2, dur: 0.3, vel: 40 });
  S.fx('roll', T.attend + 2.4, { dur: 0.9, vel: 30 });
  for (let i = 0; i < 8; i++) S.fx('tick', T.attend + 3.7 + i * 0.12, { vel: 22 });
  S.fx('sparkle', T.attend + 4.9, { vel: 34 });
  S.chord('keys', ['E3', 'G3', 'B3', 'D4'], { t: T.spread, dur: 5, vel: 40 });
  S.fx('roll', T.spread + 1.5, { dur: 0.9, vel: 34 }); S.fx('ding', T.spread + 3.1, { vel: 42 });
  // carry: the groove enters as the band opens, the actual drops in
  S.pattern('mallet', 'x.x.X.xx', { from: 0, repeat: 2, pitch: ['E5', 'B4', 'G5', 'B4'], vel: 56 });
  S.pattern('bass', 'x...x.x.', { from: 0, repeat: 2, pitch: ['E2', 'E2', 'C2', 'D2'], vel: 72 });
  S.drums({ kick: 'x...x...', hat: 'oxoxoxox' }, { from: 0, repeat: 2 });
  S.fx('roll', T.carry + 1.0, { dur: 0.9, vel: 38 });
  S.fx('boing', T.carry + 3.15, { vel: 44 });
  // risk: back on the map, the groove thins; a pop per station, a ding when the call is confirmed
  S.pattern('mallet', 'x...x...', { from: 8, repeat: 2, pitch: ['E5', 'B4'], vel: 44 });
  S.pattern('bass', 'x.......', { from: 8, repeat: 2, pitch: ['C2', 'A1'], vel: 64 });
  [0, 1, 2].forEach((i) => S.fx('pop', T.risk + 1.7 + i * 0.18, { vel: 34 - i * 4 }));
  S.note('bell', 'E5', { t: T.risk + 1.2, dur: 1.5, vel: 52 });
  S.fx('ding', T.risk + 4.0, { vel: 44 });
  // checked: drawing the line, groove B
  S.pattern('mallet', 'x.xxX.x.', { from: 17.6, repeat: 2, pitch: ['G5', 'E5', 'D5', 'B4'], vel: 52 });
  S.pattern('bass', 'x.x.x.x.', { from: 17.6, repeat: 2, pitch: ['C2', 'D2', 'E2', 'G2'], vel: 70 });
  S.drums({ kick: 'x...x...', sidestick: '..x...x.', hat: 'xxxxxxxx' }, { from: 17.6, repeat: 2 });
  S.fx('whoosh', T.checked + 0.5, { dur: 2.6, vel: 26 });
  S.fx('revswell', T.plan, { dur: 1.0, vel: 42 });
  // plan: the hit, then let it ring
  S.chord('keys', ['E3', 'G#3', 'B3', 'D#4', 'F#4'], { t: T.plan, dur: 4.6, vel: 66 });
  S.note('bass', 'E2', { t: T.plan, dur: 4.6, vel: 84 });
  S.drum('kick', { t: T.plan, vel: 96 }); S.drum('crash', { t: T.plan, vel: 52 });
  S.run('mallet', ['E5', 'G#5', 'B5', 'E6'], { t: T.plan + 0.1, step: 0.12, vel: 52 });
  S.chord('pad', ['E3', 'B3', 'G#4'], { t: T.plan, dur: 4.6, vel: 40 });
  [0, 1].forEach((i) => S.fx('pop', T.plan + 1.75 + i * 0.3, { vel: 34 }));
  S.master({ gain: -6, fadeOut: 1.4 });
});
