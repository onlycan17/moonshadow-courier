import { afterEach, describe, expect, it } from 'vitest';
import { GAME_SFX_IDS, ProceduralGameAudio } from '../../src/game/audio/procedural-audio';

const originalAudioContext = globalThis.AudioContext;
const originalWindow = globalThis.window;

afterEach(() => {
  restoreGlobal('AudioContext', originalAudioContext);
  restoreGlobal('window', originalWindow);
});

describe('절차형 효과음 계약', () => {
  it('문서에서 요구한 사건용 효과음 12종을 제공한다', () => {
    expect(new Set(GAME_SFX_IDS).size).toBe(12);
  });

  it('오디오 장치가 없어도 요청한 음악 모드를 안전하게 기억하고 종료한다', () => {
    const audio = new ProceduralGameAudio();

    audio.startMusic('exploration');
    expect(audio.getMusicMode()).toBe('exploration');

    audio.setMusicMode('boss');
    expect(audio.getMusicMode()).toBe('boss');

    expect(() => audio.play('menu')).not.toThrow();
    audio.close();
    expect(audio.getMusicMode()).toBeNull();
  });

  it('첫 사용자 입력 뒤 보스 음악과 효과음을 합성하고 안전하게 닫는다', async () => {
    const fakeWindow = new FakeWindow();
    installGlobal('window', fakeWindow as unknown as Window & typeof globalThis);
    installGlobal('AudioContext', FakeAudioContext as unknown as typeof AudioContext);
    const audio = new ProceduralGameAudio();

    audio.startMusic('boss');
    fakeWindow.emit('keydown');
    await Promise.resolve();
    await Promise.resolve();

    expect(audio.getMusicMode()).toBe('boss');
    expect(audio.isMusicActive()).toBe(true);
    expect(FakeAudioContext.latest?.oscillatorCount).toBeGreaterThanOrEqual(6);

    audio.play('attack');
    await Promise.resolve();
    expect(FakeAudioContext.latest?.oscillatorCount).toBeGreaterThanOrEqual(7);

    audio.close();
    expect(FakeAudioContext.latest?.closed).toBe(true);
    expect(audio.isMusicActive()).toBe(false);
  });
});

class FakeWindow {
  private readonly listeners = new Map<string, Set<EventListener>>();

  public addEventListener(type: string, listener: EventListener): void {
    const listeners = this.listeners.get(type) ?? new Set<EventListener>();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  public removeEventListener(type: string, listener: EventListener): void {
    this.listeners.get(type)?.delete(listener);
  }

  public emit(type: string): void {
    for (const listener of this.listeners.get(type) ?? []) listener(new Event(type));
  }

  public setTimeout(handler: TimerHandler, timeout?: number): number {
    return globalThis.setTimeout(handler, timeout) as unknown as number;
  }

  public clearTimeout(timer: number): void {
    globalThis.clearTimeout(timer);
  }
}

class FakeAudioContext {
  public static latest: FakeAudioContext | null = null;

  public readonly destination = {} as AudioDestinationNode;

  public readonly currentTime = 0;

  public state: AudioContextState = 'running';

  public oscillatorCount = 0;

  public closed = false;

  public constructor() {
    FakeAudioContext.latest = this;
  }

  public createGain(): GainNode {
    return new FakeGainNode() as unknown as GainNode;
  }

  public createOscillator(): OscillatorNode {
    this.oscillatorCount += 1;
    return new FakeOscillatorNode() as unknown as OscillatorNode;
  }

  public resume(): Promise<void> {
    this.state = 'running';
    return Promise.resolve();
  }

  public close(): Promise<void> {
    this.closed = true;
    this.state = 'closed';
    return Promise.resolve();
  }
}

class FakeAudioParam {
  public value = 0;

  public setValueAtTime(value: number): void { this.value = value; }
  public linearRampToValueAtTime(value: number): void { this.value = value; }
  public exponentialRampToValueAtTime(value: number): void { this.value = value; }
  public setTargetAtTime(value: number): void { this.value = value; }
  public cancelScheduledValues(): void {}
}

class FakeGainNode {
  public readonly gain = new FakeAudioParam();

  public connect<T>(destination: T): T { return destination; }
  public disconnect(): void {}
}

class FakeOscillatorNode {
  public type: OscillatorType = 'sine';

  public readonly frequency = new FakeAudioParam();

  public readonly detune = new FakeAudioParam();

  public connect<T>(destination: T): T { return destination; }
  public disconnect(): void {}
  public start(): void {}
  public stop(): void {}
  public addEventListener(): void {}
}

function installGlobal(key: 'AudioContext' | 'window', value: unknown): void {
  Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
}

function restoreGlobal(key: 'AudioContext' | 'window', value: unknown): void {
  if (value === undefined) Reflect.deleteProperty(globalThis, key);
  else installGlobal(key, value);
}
