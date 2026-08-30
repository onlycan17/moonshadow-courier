# HARNESS_CHECKLIST

## 매 단계 체크리스트

> 용도: P0~P9 어느 단계든 종료 전에 그대로 복사해 쓰는 반복 템플릿.

### 공통 준비
- [ ] 이번 단계의 범위와 완료 조건이 `ROADMAP.md` 및 SPEC 해당 절과 일치한다.
- [ ] 새 수치·조건을 Scene 코드와 UI 문자열에 중복하지 않고 단일 기준 모듈에 둔다.
- [ ] 관련 에셋 계약·권리 기록이 필요하면 `ASSET_GUIDE.md` / `ASSET_CREDITS.md`를 함께 갱신한다.

### SPEC §17 매 단계 항목
- [ ] 새 데이터와 순수 규칙에 경계값·손상값 단위 테스트가 있다.
- [ ] `npm run typecheck`가 통과한다.
- [ ] `npm test`가 통과한다.
- [ ] `npm run build`가 통과한다.
- [ ] 화면·입력 변경이면 Gameplay Scene과 Canvas 포커스를 확인한 E2E가 있다.
- [ ] 맵·이펙트 변경이면 전환 뒤 sprite/timer/tween/collider/projectile 수가 기준으로 돌아온다.
- [ ] 사용자 변경사항을 덮어쓰지 않았는지 `git diff`와 `git status`를 확인한다.
- [ ] 큰 단계면 AGENTS.md, README.md, ROADMAP.md와 관련 QA·에셋 문서를 갱신한다.
- [ ] 완료 조건을 만족한 변경만 의미가 분명한 커밋으로 남긴다.

### 저장소 적용 메모
- [ ] P0에서는 `npm run typecheck`, `npm test`, `npm run build`를 우선 게이트로 사용한다.
- [ ] P1부터는 Chromium·Firefox·WebKit E2E를 단계 성격에 맞게 추가한다.
- [ ] P7부터는 1280×720 / 1600×900 / 1024×768 / 800×600 / 844×390 / 390×844 검증을 포함한다.
- [ ] P9에서는 `npm run release:check`가 BGM 제외 총량 8,000,000 bytes / JS 1,500,000 bytes / JS gzip 450,000 bytes 기준까지 확인한다.

## 최종 릴리스

- [ ] Chromium·Firefox·WebKit의 핵심 루프와 저장 복구가 각각 통과한다.
- [ ] 1280×720, 1600×900, 1024×768, 800×600에서 HUD·DOM 경계 위반이 없다.
- [ ] 844×390·390×844 터치 화면에서 조작부·4슬롯·세로 DOM 시트가 safe-area와 화면 경계를 지킨다.
- [ ] 브라우저 console error, pageerror, requestfailed가 0건이다.
- [ ] 첫 입력 전후 오디오, 일반↔보스, 음소거·볼륨 복구와 실제 스피커 출력이 정상이다.
- [ ] `dist/`에 `ASSET_CREDITS.md`, 제3자 고지, 폰트·엔진 라이선스가 있다.
- [ ] 참고 이미지, 생성 원본, 프롬프트, 소스맵과 사용하지 않는 에셋이 `dist/`에 없다.
- [ ] 핵심 시트 24종·스킬 아이콘 15종은 기준 PNG와 픽셀 동일한 WebP이며 `dist/`에 PNG가 없다.
- [ ] BGM 제외 총량 8MB, JS 1.5MB, JS gzip 450KB 상한을 통과한다.
- [ ] 실제 Windows/macOS 지원 브라우저와 30분 성능 검증 상태를 사실대로 기록한다.
