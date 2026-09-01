export interface AudioSettings { muted: boolean; bgmVolume: number; sfxVolume: number }
// 제품명 변경 전 설정과 호환하기 위해 레거시 저장 namespace를 유지한다.
const SETTINGS_KEY = 'kerning-shadows.local-settings.v1';

export function loadAudioSettings(): AudioSettings {
  const fallback = { muted: false, bgmVolume: 0.55, sfxVolume: 0.75 };
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw === null) return fallback;
    const value: unknown = JSON.parse(raw);
    if (typeof value !== 'object' || value === null) return fallback;
    const record = value as Record<string, unknown>;
    return { muted: record.muted === true, bgmVolume: clampVolume(record.bgmVolume, fallback.bgmVolume), sfxVolume: clampVolume(record.sfxVolume, fallback.sfxVolume) };
  } catch { return fallback; }
}

export function saveAudioSettings(settings: AudioSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify({ muted: settings.muted, bgmVolume: clampVolume(settings.bgmVolume, 0.55), sfxVolume: clampVolume(settings.sfxVolume, 0.75) }));
}

function clampVolume(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : fallback;
}
