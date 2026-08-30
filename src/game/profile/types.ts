/**
 * P1 저장·생성 도메인 간 공유 계약 (SPEC §5.2, §10).
 * 이 파일은 타입 전용 동결 계약이다. 구현 로직은 각 도메인 모듈이 소유하고,
 * 필드 추가는 마이그레이션(프로필 버전 상승)과 함께만 허용한다.
 */

export type JobId = "novice" | "hokage";

export interface CharacterStats {
  str: number;
  dex: number;
  int: number;
  luk: number;
}

/** v1 저장 캐릭터. 이후 필드는 v2+ 마이그레이션으로만 확장한다(SPEC §10). */
export interface StoredCharacterV1 {
  version: 1;
  nickname: string;
  job: JobId;
  level: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  exp: number;
  stats: CharacterStats;
  ap: number;
  sp: number;
  autoDistribute: boolean;
  skills: Record<string, number>;
  mesos: number;
  mapId: string;
}

export type SlotNumber = 1 | 2 | 3;

/** 테스트 가능한 저장을 위한 최소 Key/Value 경계(SPEC §10 저장 파서 규칙). */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}
