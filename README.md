# 프로젝트 개요

독자 픽셀 아트 세계에서 표창을 주 무기로 쓰는 캐릭터를 육성하는 로컬 싱글 플레이 웹 액션 RPG 데모입니다(SPEC §2).

## 요구 사항

- Node.js `^20.19.0` 또는 `>=22.12.0` (SPEC §3)
- 로컬 브라우저 실행 환경

## 빠른 시작

```bash
npm ci
npm run dev
```

## 검증 명령

```bash
npm run typecheck
npm test
npm run build
npm run release:check
```

- P0 기본 게이트: `npm run typecheck`, `npm test`, `npm run build`
- Playwright 3엔진 E2E는 P1부터 도입
- 뷰포트 4종 + 터치 2종 검증은 P7부터 강화
- `release:check` 총량 감사는 P9에서 BGM 제외 총량 8MB / JS 1.5MB / JS gzip 450KB까지 확장

## 현재 상태

| 항목 | 상태 |
| --- | --- |
| 단계 | P2 완료(이동·11개 맵·포탈 전환·맵별 위치 저장) |
| 문서 기준 | `docs/SPEC.md` 단일 기준 |
| 에셋 | 임시 도형 대체, 계약 문서만 확정 |
| 자동화 | typecheck / test / build 통과, E2E는 Aside 브라우저 운영(Playwright 보류) |

## 문서 안내

| 문서 | 역할 |
| --- | --- |
| `docs/SPEC.md` | 제품 요구사항과 수치 계약의 단일 기준 |
| `ROADMAP.md` | P0~P9 구현 단계와 완료 조건 요약 |
| `ASSET_GUIDE.md` | 스프라이트·맵·오디오 계약과 권리 요구 감사표 |
| `HARNESS_PLAN.md` | 반복 가능한 검증 환경과 게이트 도입 계획 |
| `HARNESS_CHECKLIST.md` | 매 단계·최종 릴리스 체크리스트 템플릿 |
| `AGENTS.md` | 이후 코딩 에이전트가 따라야 할 저장소 규칙 |
| `ASSET_CREDITS.md` | 실제 제작 에셋의 출처·변환·라이선스 기록부 |
