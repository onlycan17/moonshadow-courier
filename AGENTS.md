# AGENTS

## 문서 우선순위

문서 충돌 시 우선순위는 다음과 같다.

1. `docs/SPEC.md`의 최종 제품 계약
2. 순수 규칙·테스트
3. `AGENTS.md`
4. 과거 `ROADMAP.md`·QA 기록

근거: SPEC 서문, SPEC §1.

## 기본 명령

- `npm ci`
- `npm run dev`
- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run test:e2e`
- `npm run release:check`

근거: SPEC §3.

## 작업 규율

1. 조사 → 계획 → 구현 순서로 진행한다.
2. 단계 작업은 `ROADMAP.md`의 해당 P단계 완료 조건과 SPEC §17 매 단계 체크를 함께 충족해야 끝난다.
3. 기능은 가능한 한 `입력 → 상태 변화 → 렌더링 → 저장 → 복구` 수직 슬라이스로 구현한다(SPEC §14).
4. 임시 객체, tween, timer, collider, projectile, physics pause는 맵/Scene 수명에 묶고 전환·종료 때 함께 정리한다(SPEC §6.3, §14 작업 방식 7).
5. 큰 단계가 끝나면 `README.md`, `ROADMAP.md`, 관련 QA·에셋 문서를 같이 갱신한다(SPEC §17).
6. 커밋은 Conventional Commits 형식으로 의미 단위만 남긴다.

## 단일 기준 모듈 규칙

수치·조건을 UI 문자열과 Scene 코드에 중복하지 않는다(SPEC §13).

| 항목 | 단일 기준 |
| --- | --- |
| 맵과 월드 | 맵 정의 |
| 공격, 스킬, 전직 | 전투·스킬 규칙 |
| 몬스터 | 몬스터 카탈로그 |
| 성장, 장비, 드롭, 퀘스트 | 각 도메인의 순수 함수 |
| 펫 | 등록 상태, 추적 목표, 바닥 드롭 자동 회수 규칙 |
| 인벤토리 | 소모품 사용, 부활의 부적 구매·자동 소비 규칙 |
| 저장 | 프로필 파서와 마이그레이션 |
| 엔딩 | 원펀맨 크레딧 문구, 길이, 표시 조건 |
| HUD 위치와 안전 여백 | HUD bounds 규칙 |
| 오디오 키, 게인, 루프 구간 | 오디오 에셋 정의 |
| 포탈·전직·레벨업·시네마틱 시간 | 효과 규칙 |

## 디렉토리 구조 요약

```text
src/game/
  scenes/
  assets/
  input/
  data/
  maps/
  entities/
  combat/
  progression/
  skills/
  inventory/
  equipment/
  pets/
  loot/
  quests/
  profile/
  settings/
  effects/
  audio/
  ending/
  ui/
assets/
  sprites/
  maps/
  ui/
  audio/
tests/e2e/
scripts/
```

근거: SPEC §13.

## DOM / Canvas 책임 분리

- 캐릭터, 월드, 투사체, 드롭, 포탈, HUD 그래픽은 Phaser Canvas가 담당한다.
- 입력창, 버튼, 링크, 설정 range, 긴 목록, 팝업, 터치 조작부는 접근 가능한 DOM이 담당한다.
- DOM 팝업이 열리면 월드 입력을 멈추고 Canvas를 비활성화하며, 닫으면 Canvas 포커스를 복구한다.
- 게임 상태는 `aria-label`, live region, `data-*` 속성과도 동기화한다.

근거: SPEC §5.3.

## 임시 객체 수명주기 규칙

- 포탈 트윈, 보스 투사체, 드롭, 임시 이펙트, 타이머는 현재 맵 수명에 묶는다.
- 명중, 만료, 보스 처치, 맵 정리, Scene 종료에서 제거 경로가 하나로 수렴해야 한다.
- 4차 액티브 시네마틱 중 정지한 타이머·동료·트윈·physics pause도 중단·맵 이동 시 완전히 복구해야 한다.

근거: SPEC §6.3, §8.4, §8.5.

## 에셋 권리 규칙

- 타 게임의 코드, 맵 지형, UI 이미지, 음원, 로고, 캐릭터, 몬스터, 아이콘, 고유 문양을 복제하지 않는다.
- 배포 에셋은 직접 제작, 생성형 도구 제작, 또는 배포 권리 확인분만 사용한다.
- 생성 원본과 프롬프트·제작 기록은 보존하되 런타임과 `dist/`에는 최적화한 파생본만 포함한다.
- 모든 파일의 제작자, 원본, 변환, 라이선스, 배포 조건을 `ASSET_CREDITS.md`에 기록한다.
- 생성형 도구에는 특정 작품·캐릭터·작가·현존 아티스트 모방 지시를 넣지 않는다.

근거: SPEC §4, §11.2, §12.3.

## 코드 품질 규칙

- TypeScript strict를 유지한다.
- `any`, `ts-ignore`를 추가하지 않는다.
- TODO 잔재를 남기지 않는다.
- 함수는 작게 유지하고, 데이터·순수 규칙과 Scene 런타임의 책임을 섞지 않는다.
- 손상값, 경계값, 저장 마이그레이션은 단위 테스트로 재현 가능해야 한다.

## 단계 완료 기준 메모

- P0: `npm run typecheck` / `npm test` / `npm run build`
- P1부터: Chromium·Firefox·WebKit E2E 포함(`npm run test:e2e`)
- P2부터: `npm run release:check`가 JS 1,500,000 bytes / JS gzip 450,000 bytes / BGM 제외 총량 8,000,000 bytes 예산을 조기 강제
- P7부터: 1280×720 / 1600×900 / 1024×768 / 800×600 / 844×390 / 390×844 검증 강화
- P9: `npm run release:check`에 BGM 제외 총량 8,000,000 bytes / JS 1,500,000 bytes / JS gzip 450,000 bytes 감사 포함
