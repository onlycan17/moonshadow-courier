export type GameMusicMode = 'exploration' | 'boss';

export interface GameMusicTheme {
  label: string;
  tempoBpm: number;
  stepsPerBeat: number;
  leadWave: OscillatorType;
  bassWave: OscillatorType;
  leadNotes: readonly (number | null)[];
  bassNotes: readonly (number | null)[];
  chordRoots: readonly number[];
}

export interface GameMusicFrame {
  index: number;
  durationSeconds: number;
  leadFrequency: number | null;
  bassFrequency: number | null;
  chordRootFrequency: number | null;
  kick: boolean;
}

export const GAME_MUSIC_MODES = Object.freeze(['exploration', 'boss'] as const satisfies readonly GameMusicMode[]);

export const GAME_MUSIC_THEMES: Readonly<Record<GameMusicMode, GameMusicTheme>> = Object.freeze({
  exploration: theme(
    '달빛 골목의 여행자',
    112,
    2,
    'triangle',
    'sine',
    [76, null, 79, null, 83, 81, 79, null, 74, null, 76, null, 79, 76, 74, null, 72, null, 76, null, 79, 81, 79, null, 71, null, 74, 76, 72, null, 71, null],
    [45, null, 45, null, 48, null, 48, null, 43, null, 43, null, 50, null, 50, null, 41, null, 41, null, 45, null, 45, null, 43, null, 43, null, 40, null, 40, null],
    [57, 55, 53, 52],
  ),
  boss: theme(
    '심연의 맥동',
    152,
    2,
    'sawtooth',
    'square',
    [76, 75, 76, 79, 82, 79, 76, 75, 72, 75, 76, 79, 84, 82, 79, 76, 75, 72, 75, 79, 82, 84, 82, 79, 77, 76, 72, 75, 70, 72, 75, 76],
    [40, null, 40, 40, 43, null, 43, 43, 38, null, 38, 38, 45, null, 43, 40, 36, null, 36, 36, 40, null, 40, 40, 41, null, 38, 38, 35, null, 35, 35],
    [52, 50, 48, 47],
  ),
});

export function getMusicFrame(mode: GameMusicMode, stepIndex: number): GameMusicFrame {
  const themeDefinition = GAME_MUSIC_THEMES[mode];
  const frameCount = themeDefinition.leadNotes.length;
  const index = ((Math.trunc(stepIndex) % frameCount) + frameCount) % frameCount;
  const chordIndex = Math.floor(index / 8) % themeDefinition.chordRoots.length;

  return {
    index,
    durationSeconds: 60 / themeDefinition.tempoBpm / themeDefinition.stepsPerBeat,
    leadFrequency: midiNoteToFrequency(themeDefinition.leadNotes[index]!),
    bassFrequency: midiNoteToFrequency(themeDefinition.bassNotes[index]!),
    chordRootFrequency: index % 8 === 0 ? midiNoteToFrequency(themeDefinition.chordRoots[chordIndex]!) : null,
    kick: mode === 'boss' ? index % 2 === 0 : index % 4 === 0,
  };
}

export function resolveMusicMode(hasAliveBoss: boolean): GameMusicMode {
  return hasAliveBoss ? 'boss' : 'exploration';
}

function midiNoteToFrequency(note: number | null): number | null {
  if (note === null) return null;
  return 440 * 2 ** ((note - 69) / 12);
}

function theme(
  label: string,
  tempoBpm: number,
  stepsPerBeat: number,
  leadWave: OscillatorType,
  bassWave: OscillatorType,
  leadNotes: readonly (number | null)[],
  bassNotes: readonly (number | null)[],
  chordRoots: readonly number[],
): GameMusicTheme {
  return Object.freeze({
    label,
    tempoBpm,
    stepsPerBeat,
    leadWave,
    bassWave,
    leadNotes: Object.freeze(leadNotes),
    bassNotes: Object.freeze(bassNotes),
    chordRoots: Object.freeze(chordRoots),
  });
}
