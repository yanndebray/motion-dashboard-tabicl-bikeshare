kit.score(function (S, T) {
  S.tempo(96, { t0: T.carry });                      // beat 0 = bikes to carry; beat 16 = the plan card
  S.program('pad', 'pad', { rev: 0.6 }); S.program('mallet', 'marimba', { pan: -0.2 });
  S.program('bass', 'bass'); S.program('keys', 'ep', { rev: 0.3 }); S.program('bell', 'vibes', { rev: 0.5 });
  // before: a pad and one note under the title
  S.chord('pad', ['E3', 'B3', 'F#4'], { t: 0, dur: 4.3, vel: 30 });
  S.note('bell', 'B4', { t: 0.9, dur: 1.2, vel: 40 });
  // risk: a soft pulse, a bell for each station as it lights, a lower note on the 69%
  S.pattern('mallet', 'x...x...', { from: -9.6, repeat: 2, pitch: ['E5', 'B4'], vel: 40 });
  [0, 1, 2].forEach((i) => S.fx('pop', T.risk + 1.7 + i * 0.18, { vel: 34 - i * 4 }));
  S.note('bell', 'E5', { t: T.risk + 1.2, dur: 1.5, vel: 52 });
  S.chord('keys', ['C3', 'E3', 'G3', 'B3'], { t: T.risk, dur: 3, vel: 38 });
  S.chord('keys', ['A2', 'C3', 'E3', 'G3'], { t: T.risk + 3, dur: 3, vel: 40 });
  S.fx('ding', T.risk + 4.0, { vel: 44 });
  // carry: the groove enters as the band opens, the actual drops in
  S.pattern('mallet', 'x.x.X.xx', { from: 0, repeat: 2, pitch: ['E5', 'B4', 'G5', 'B4'], vel: 56 });
  S.pattern('bass', 'x...x.x.', { from: 0, repeat: 2, pitch: ['E2', 'E2', 'C2', 'D2'], vel: 72 });
  S.drums({ kick: 'x...x...', hat: 'oxoxoxox' }, { from: 0, repeat: 2 });
  S.fx('roll', T.carry + 1.0, { dur: 0.9, vel: 38 });
  S.fx('boing', T.carry + 3.15, { vel: 44 });
  // checked: drawing the line, a light run, groove holds
  S.pattern('mallet', 'x.xxX.x.', { from: 8, repeat: 2, pitch: ['G5', 'E5', 'D5', 'B4'], vel: 52 });
  S.pattern('bass', 'x.x.x.x.', { from: 8, repeat: 2, pitch: ['C2', 'D2', 'E2', 'G2'], vel: 70 });
  S.drums({ kick: 'x...x...', sidestick: '..x...x.', hat: 'xxxxxxxx' }, { from: 8, repeat: 2 });
  S.fx('whoosh', T.checked + 0.5, { dur: 2.6, vel: 26 });
  S.fx('revswell', T.plan, { dur: 1.0, vel: 42 });
  // plan: the hit, then let it ring
  S.chord('keys', ['E3', 'G#3', 'B3', 'D#4', 'F#4'], { beat: 16, beats: 7, vel: 66 });
  S.note('bass', 'E2', { beat: 16, beats: 7, vel: 84 });
  S.drum('kick', { beat: 16, vel: 96 }); S.drum('crash', { beat: 16, vel: 52 });
  S.run('mallet', ['E5', 'G#5', 'B5', 'E6'], { t: T.plan + 0.1, step: 0.12, vel: 52 });
  S.chord('pad', ['E3', 'B3', 'G#4'], { beat: 16, beats: 7, vel: 40 });
  [0, 1].forEach((i) => S.fx('pop', T.plan + 1.75 + i * 0.3, { vel: 34 }));
  S.master({ gain: -6, fadeOut: 1.4 });
});
