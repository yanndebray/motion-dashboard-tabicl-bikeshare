kit.score(function (S, T) {
  const BPM = 96;
  S.tempo(BPM, { t0: T.rush });                       // beat 0 = the rush; beat 32 = back up the hill
  S.program('pad', 'pad', { rev: 0.6 }); S.program('mallet', 'marimba', { pan: -0.2 });
  S.program('bass', 'bass'); S.program('keys', 'ep', { rev: 0.3 });
  // dawn: near-silent pad, one mallet note as the tag lands
  S.chord('pad', ['D3', 'A3', 'E4'], { t: 0, dur: 4.2, vel: 30 });
  S.note('mallet', 'A5', { t: 1.6, dur: 0.6, vel: 46 });
  S.fx('pop', 1.7, { vel: 40 });
  // rush: the groove enters, three bars, then stop-time before the dock runs dry
  S.pattern('mallet', 'x.x.X.xx', { from: 0, repeat: 3, pitch: ['D5', 'A4', 'F#5', 'A4'], vel: 58 });
  S.pattern('bass', 'x...x.x.', { from: 0, repeat: 3, pitch: ['D2', 'D2', 'B1', 'A1'], vel: 74 });
  S.drums({ kick: 'x...x...', hat: 'oxoxoxox' }, { from: 4, repeat: 2 });
  S.chord('keys', ['D3', 'F#3', 'A3', 'E4'], { beat: 0, beats: 4, vel: 42 });
  S.chord('keys', ['B2', 'D3', 'F#3', 'A3'], { beat: 4, beats: 4, vel: 42 });
  S.chord('keys', ['G2', 'B2', 'D3', 'F#3'], { beat: 8, beats: 3, vel: 46 });
  S.fx('thud', T.dry + 2.2, { vel: 80 });
  S.note('bass', 'D1', { t: T.dry + 2.2, dur: 2.4, vel: 70 });
  S.chord('pad', ['D3', 'G3', 'A3'], { t: T.dry + 2.2, dur: 6.6, vel: 34 });
  // the empty dock: held, only the pad
  // summer: soft keys, the count rolls up and lands, the bar fills
  S.chord('keys', ['B2', 'D3', 'F#3', 'A3'], { t: T.summer, dur: 2.4, vel: 40 });
  S.fx('roll', T.summer + 0.5, { dur: 1.4, vel: 46 });
  S.chord('keys', ['G2', 'B2', 'D3', 'E3'], { t: T.summer + 2.4, dur: 2.6, vel: 40 });
  S.fx('whoosh', T.summer + 2.4, { dur: 1.0, vel: 30 });
  S.fx('pop', T.summer + 3.0, { vel: 38 });
  // back up the hill: groove B, then the hit as the end card lands
  S.pattern('mallet', 'x.xxX.x.', { from: 32, repeat: 1, pitch: ['D5', 'E5', 'F#5', 'A5'], vel: 60 });
  S.pattern('bass', 'x.x.x.x.', { from: 32, repeat: 1, pitch: ['G1', 'A1', 'B1', 'C#2'], vel: 74 });
  S.drums({ kick: 'x...x...', sidestick: '..x...x.', hat: 'xxxxxxxx' }, { from: 32, repeat: 1 });
  S.fx('whoosh', T.uphill + 0.3, { dur: 1.6, vel: 34 });
  S.fx('revswell', T.uphill + 2.6, { dur: 1.0, vel: 44 });
  S.chord('keys', ['D3', 'F#3', 'A3', 'C#4', 'E4'], { beat: 36, beats: 6, vel: 66 });
  S.note('bass', 'D2', { beat: 36, beats: 6, vel: 84 });
  S.drum('kick', { beat: 36, vel: 96 }); S.drum('crash', { beat: 36, vel: 54 });
  S.run('mallet', ['D5', 'F#5', 'A5', 'D6'], { t: T.uphill + 2.7, step: 0.12, vel: 54 });
  S.chord('pad', ['D3', 'A3', 'F#4'], { beat: 36, beats: 6, vel: 40 });
  S.master({ gain: -6, fadeOut: 1.4 });
});
