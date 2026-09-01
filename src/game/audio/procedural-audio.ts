import { loadAudioSettings } from '../settings/audio-settings';

export type GameSfxId = 'attack' | 'skill' | 'hit' | 'critical' | 'defeat' | 'pickup' | 'portal' | 'damage' | 'revive' | 'level-up' | 'menu' | 'boss';

const SFX: Readonly<Record<GameSfxId, { frequency: number; endFrequency: number; duration: number; wave: OscillatorType }>> = Object.freeze({
  attack: { frequency: 760, endFrequency: 420, duration: 0.08, wave: 'square' },
  skill: { frequency: 440, endFrequency: 980, duration: 0.16, wave: 'sine' },
  hit: { frequency: 180, endFrequency: 110, duration: 0.07, wave: 'sawtooth' },
  critical: { frequency: 980, endFrequency: 1480, duration: 0.13, wave: 'triangle' },
  defeat: { frequency: 360, endFrequency: 90, duration: 0.22, wave: 'sawtooth' },
  pickup: { frequency: 660, endFrequency: 1040, duration: 0.11, wave: 'sine' },
  portal: { frequency: 240, endFrequency: 720, duration: 0.24, wave: 'sine' },
  damage: { frequency: 150, endFrequency: 70, duration: 0.12, wave: 'square' },
  revive: { frequency: 320, endFrequency: 880, duration: 0.28, wave: 'triangle' },
  'level-up': { frequency: 520, endFrequency: 1320, duration: 0.32, wave: 'triangle' },
  menu: { frequency: 520, endFrequency: 620, duration: 0.05, wave: 'sine' },
  boss: { frequency: 95, endFrequency: 55, duration: 0.38, wave: 'sawtooth' },
});

export class ProceduralGameAudio {
  private context: AudioContext | null = null;

  public play(id: GameSfxId): void {
    const settings = loadAudioSettings();
    if (settings.muted || settings.sfxVolume <= 0 || typeof AudioContext === 'undefined') return;
    try {
      this.context ??= new AudioContext();
      const now = this.context.currentTime;
      const definition = SFX[id];
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      oscillator.type = definition.wave;
      oscillator.frequency.setValueAtTime(definition.frequency, now);
      oscillator.frequency.exponentialRampToValueAtTime(definition.endFrequency, now + definition.duration);
      gain.gain.setValueAtTime(Math.max(0.001, settings.sfxVolume * 0.08), now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + definition.duration);
      oscillator.connect(gain).connect(this.context.destination);
      oscillator.start(now);
      oscillator.stop(now + definition.duration);
    } catch {
      // 오디오 장치가 없거나 자동 재생이 잠겨도 게임 진행은 계속된다.
    }
  }

  public close(): void {
    const context = this.context;
    this.context = null;
    if (context !== null) void context.close();
  }
}

export const GAME_SFX_IDS = Object.freeze(Object.keys(SFX) as GameSfxId[]);
