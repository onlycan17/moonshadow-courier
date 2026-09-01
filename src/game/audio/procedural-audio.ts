import { loadAudioSettings } from '../settings/audio-settings';
import { GAME_MUSIC_THEMES, getMusicFrame, type GameMusicMode } from './music-rules';

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

  private musicBus: GainNode | null = null;

  private musicMode: GameMusicMode | null = null;

  private musicStep = 0;

  private musicTimer: number | null = null;

  private musicGeneration = 0;

  private unlockListenersBound = false;

  private readonly musicVoices = new Set<OscillatorNode>();

  private readonly unlockHandler = (): void => {
    this.unlock();
  };

  public startMusic(mode: GameMusicMode): void {
    this.setMusicMode(mode);
    this.bindUnlockListeners();
  }

  public setMusicMode(mode: GameMusicMode): void {
    if (this.musicMode === mode) return;
    this.musicMode = mode;
    this.musicStep = 0;
    this.restartMusicLoop();
  }

  public getMusicMode(): GameMusicMode | null {
    return this.musicMode;
  }

  public isMusicActive(): boolean {
    return this.context?.state === 'running' && this.musicTimer !== null;
  }

  public syncSettings(): void {
    const context = this.context;
    const musicBus = this.musicBus;
    if (context === null || musicBus === null) return;
    const settings = loadAudioSettings();
    const targetGain = settings.muted ? 0 : settings.bgmVolume * 0.34;
    musicBus.gain.cancelScheduledValues(context.currentTime);
    musicBus.gain.setTargetAtTime(targetGain, context.currentTime, 0.04);
  }

  public play(id: GameSfxId): void {
    const settings = loadAudioSettings();
    if (settings.muted || settings.sfxVolume <= 0 || typeof AudioContext === 'undefined') return;
    try {
      const context = this.ensureContext();
      if (context === null) return;
      this.resumeContext(context);
      const now = context.currentTime;
      const definition = SFX[id];
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = definition.wave;
      oscillator.frequency.setValueAtTime(definition.frequency, now);
      oscillator.frequency.exponentialRampToValueAtTime(definition.endFrequency, now + definition.duration);
      gain.gain.setValueAtTime(Math.max(0.001, settings.sfxVolume * 0.08), now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + definition.duration);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(now);
      oscillator.stop(now + definition.duration);
    } catch {
      // 오디오 장치가 없거나 자동 재생이 잠겨도 게임 진행은 계속된다.
    }
  }

  public close(): void {
    const context = this.context;
    this.musicMode = null;
    this.musicGeneration += 1;
    this.clearMusicTimer();
    this.stopMusicVoices();
    this.unbindUnlockListeners();
    this.musicBus?.disconnect();
    this.musicBus = null;
    this.context = null;
    if (context !== null) void context.close();
  }

  private bindUnlockListeners(): void {
    if (this.unlockListenersBound || typeof window === 'undefined') return;
    this.unlockListenersBound = true;
    window.addEventListener('pointerdown', this.unlockHandler, { once: true });
    window.addEventListener('keydown', this.unlockHandler, { once: true });
  }

  private unbindUnlockListeners(): void {
    if (!this.unlockListenersBound || typeof window === 'undefined') return;
    window.removeEventListener('pointerdown', this.unlockHandler);
    window.removeEventListener('keydown', this.unlockHandler);
    this.unlockListenersBound = false;
  }

  private unlock(): void {
    const context = this.ensureContext();
    if (context === null) return;
    this.resumeContext(context);
  }

  private ensureContext(): AudioContext | null {
    if (this.context !== null) return this.context;
    if (typeof AudioContext === 'undefined') return null;
    try {
      const context = new AudioContext();
      const musicBus = context.createGain();
      musicBus.gain.setValueAtTime(0, context.currentTime);
      musicBus.connect(context.destination);
      this.context = context;
      this.musicBus = musicBus;
      return context;
    } catch {
      return null;
    }
  }

  private resumeContext(context: AudioContext): void {
    const resume = context.state === 'suspended' ? context.resume() : Promise.resolve();
    void resume
      .then(() => {
        if (this.context !== context || context.state !== 'running') return;
        this.unbindUnlockListeners();
        this.syncSettings();
        this.beginMusicLoop();
      })
      .catch(() => {
        this.bindUnlockListeners();
      });
  }

  private restartMusicLoop(): void {
    const context = this.context;
    if (context === null || context.state !== 'running') return;
    const generation = ++this.musicGeneration;
    this.clearMusicTimer();
    const musicBus = this.musicBus;
    if (musicBus !== null) {
      musicBus.gain.cancelScheduledValues(context.currentTime);
      musicBus.gain.setValueAtTime(musicBus.gain.value, context.currentTime);
      musicBus.gain.linearRampToValueAtTime(0, context.currentTime + 0.1);
    }
    if (typeof window === 'undefined') return;
    this.musicTimer = window.setTimeout(() => {
      this.musicTimer = null;
      if (generation !== this.musicGeneration) return;
      this.stopMusicVoices();
      this.syncSettings();
      this.beginMusicLoop();
    }, 110);
  }

  private beginMusicLoop(): void {
    if (this.musicMode === null || this.musicTimer !== null || this.context?.state !== 'running') return;
    const generation = ++this.musicGeneration;
    this.scheduleMusicFrame(generation);
  }

  private scheduleMusicFrame(generation: number): void {
    const context = this.context;
    const mode = this.musicMode;
    if (context === null || mode === null || context.state !== 'running' || generation !== this.musicGeneration) return;
    const theme = GAME_MUSIC_THEMES[mode];
    const frame = getMusicFrame(mode, this.musicStep);
    const startAt = context.currentTime + 0.012;

    if (frame.leadFrequency !== null) {
      this.scheduleTone(frame.leadFrequency, theme.leadWave, startAt, frame.durationSeconds * 0.88, mode === 'boss' ? 0.12 : 0.1);
    }
    if (frame.bassFrequency !== null) {
      this.scheduleTone(frame.bassFrequency, theme.bassWave, startAt, frame.durationSeconds * 0.94, mode === 'boss' ? 0.08 : 0.07);
    }
    if (frame.chordRootFrequency !== null) {
      this.scheduleChord(frame.chordRootFrequency, startAt, frame.durationSeconds * 7.6, mode);
    }
    if (frame.kick) this.scheduleKick(startAt, mode);

    this.musicStep += 1;
    this.syncSettings();
    if (typeof window === 'undefined') return;
    this.musicTimer = window.setTimeout(() => {
      this.musicTimer = null;
      this.scheduleMusicFrame(generation);
    }, frame.durationSeconds * 1_000);
  }

  private scheduleTone(
    frequency: number,
    wave: OscillatorType,
    startAt: number,
    duration: number,
    volume: number,
    detune = 0,
  ): void {
    const context = this.context;
    const musicBus = this.musicBus;
    if (context === null || musicBus === null) return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const attackEnd = startAt + Math.min(0.035, duration * 0.2);
    oscillator.type = wave;
    oscillator.frequency.setValueAtTime(frequency, startAt);
    oscillator.detune.setValueAtTime(detune, startAt);
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.linearRampToValueAtTime(volume, attackEnd);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
    oscillator.connect(gain).connect(musicBus);
    this.musicVoices.add(oscillator);
    oscillator.addEventListener('ended', () => {
      this.musicVoices.delete(oscillator);
      oscillator.disconnect();
      gain.disconnect();
    }, { once: true });
    oscillator.start(startAt);
    oscillator.stop(startAt + duration + 0.01);
  }

  private scheduleChord(rootFrequency: number, startAt: number, duration: number, mode: GameMusicMode): void {
    const intervals = mode === 'boss' ? [0, 3, 7] : [0, 4, 7];
    for (const [index, semitones] of intervals.entries()) {
      const frequency = rootFrequency * 2 ** (semitones / 12);
      this.scheduleTone(frequency, 'sine', startAt + index * 0.012, duration, mode === 'boss' ? 0.022 : 0.028, index * 3 - 3);
    }
  }

  private scheduleKick(startAt: number, mode: GameMusicMode): void {
    const context = this.context;
    const musicBus = this.musicBus;
    if (context === null || musicBus === null) return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(mode === 'boss' ? 130 : 96, startAt);
    oscillator.frequency.exponentialRampToValueAtTime(48, startAt + 0.09);
    gain.gain.setValueAtTime(mode === 'boss' ? 0.16 : 0.09, startAt);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.1);
    oscillator.connect(gain).connect(musicBus);
    this.musicVoices.add(oscillator);
    oscillator.addEventListener('ended', () => {
      this.musicVoices.delete(oscillator);
      oscillator.disconnect();
      gain.disconnect();
    }, { once: true });
    oscillator.start(startAt);
    oscillator.stop(startAt + 0.11);
  }

  private clearMusicTimer(): void {
    if (this.musicTimer === null || typeof window === 'undefined') return;
    window.clearTimeout(this.musicTimer);
    this.musicTimer = null;
  }

  private stopMusicVoices(): void {
    for (const oscillator of this.musicVoices) {
      try {
        oscillator.stop();
      } catch {
        // 이미 종료된 음원은 onended 정리 경로에 맡긴다.
      }
    }
    this.musicVoices.clear();
  }
}

export const GAME_SFX_IDS = Object.freeze(Object.keys(SFX) as GameSfxId[]);
