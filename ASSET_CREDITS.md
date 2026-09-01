# ASSET_CREDITS

## 기록 원칙

1. 이 문서는 실제 제작된 파일이 생길 때마다 행을 추가하는 기록부다. 실제 파일과 생성 근거가 없는 임의 항목은 넣지 않는다(SPEC §4).
2. 런타임과 `dist/`에는 최적화한 파생본만 포함하고, 생성 원본·프롬프트·작업 파일은 별도 보존한다(SPEC §4, §11.2).
3. Suno 사용 시 생성 당시 요금제, 생성일, 곡 ID/URL, 사용 프롬프트, 다운로드 원본 SHA-256, 편집 내역, 런타임 출력 SHA-256을 함께 기록한다(SPEC §12.3).
4. Suno 결과는 유료 플랜 생성분만 상업 검토 대상으로 본다. 무료 플랜 결과나 권리가 불명확한 업로드 오디오는 배포본에 넣지 않는다(SPEC §12.3).
5. Phaser 3는 MIT 라이선스 엔진이다. Vite와 함께 런타임 번들에 포함되는 제3자 구성요소는 최종 배포 시 라이선스 텍스트를 동봉할 예정이다(SPEC §17, 기술 기준은 SPEC §3).

## 에셋 크레딧 표

| 파일 | 제작자 | 원본 | 변환 과정 | 라이선스/권리 근거 | 배포 조건 |
| --- | --- | --- | --- | --- | --- |
| `src/game/assets/maps/portal-arch-tripo.webp` | OpenAI Codex + Tripo(Holymolly) | Tripo text-to-3D 작업 `5928924b-2dd0-4225-a052-1bfab3faf71b`; 상세 프롬프트·해시는 `assets/source-records/tripo-portal-arch.md` | 512×512 투명 WebP → 64×64 Lanczos → 128×128 nearest-neighbor 기준 PNG → lossless exact WebP | Tripo 서비스 약관 §3.2(2025-07-11 갱신본, 2026-08-31 확인)의 합법적 상업·비상업 사용 허용. 비침해성·독점성은 보장되지 않아 독자 프롬프트와 사람 검수를 병행 | 런타임 WebP만 `dist/` 포함. GLB·기준 PNG·중간 이미지는 제외. 공개 배포 전 당시 약관·유사성 재검토 |
| `src/game/assets/maps/cuning-city-background-v1.webp` | OpenAI Codex + Tripo(Holymolly) + OpenAI ImageGen | Tripo 환경 작업 `44a32f65-07fc-4353-ac6f-5aad45b05ffe`를 형태·팔레트 참고로 사용한 ImageGen 원본; 상세 기록은 `assets/source-records/tripo-character-and-city-v1.md` | ImageGen 원본 → 1280×720 Lanczos 기준 PNG → lossless WebP | Tripo 약관 §3.2와 OpenAI 이용약관 Content 조항(2026-08-31 확인). 비침해성·독점성은 보장되지 않아 독자 프롬프트와 사람 검수를 병행 | 런타임 WebP만 `dist/` 포함. GLB·생성 원본·기준 PNG는 제외. 공개 배포 전 약관·유사성 재검토 |
| `src/game/assets/characters/shadow-courier-sheet-v1.webp` | OpenAI Codex + Tripo(Holymolly) + OpenAI ImageGen | Tripo 캐릭터 작업 `2ecc87c2-2542-44f5-8b4c-4ef421ca1659`를 형태·의상 참고로 사용한 ImageGen 4×4 시트; 상세 기록은 `assets/source-records/tripo-character-and-city-v1.md` | ImageGen 시트 → 배경 제거 → 512×512 nearest-neighbor 기준 PNG → lossless WebP | Tripo 약관 §3.2와 OpenAI 이용약관 Content 조항(2026-08-31 확인). 특정 작품·캐릭터·작가를 지시하지 않았고 사람 검수 완료 | 런타임 WebP만 `dist/` 포함. GLB·생성 원본·기준 PNG는 제외. 공개 배포 전 약관·유사성 재검토 |
| `src/game/assets/monsters/green-mushroom-tripo-v1.webp` | OpenAI Codex + Tripo | Tripo text-to-3D 작업 `6826ea44-d19a-411f-b2e5-0d48e548a39c`; 프롬프트·비용·검수는 `assets/source-records/tripo-green-mushroom-v1.md` | 저폴리 GLB 생성과 함께 제공된 512×512 투명 WebP 렌더를 런타임 파생본으로 선별 | Tripo 서비스 약관 §3.2(2026-08-31 확인), 독자 프롬프트·사람 검수 | 런타임 WebP만 `dist/` 포함. GLB·생성 참고 이미지는 제외 |
| `src/game/assets/maps/backgrounds/bandit-hideout-v1.webp`<br>`green-mushroom-cave-v1.webp`<br>`shadow-testing-ground-v1.webp`<br>`crystal-ant-cave-v1.webp`<br>`clockwork-tower-v1.webp`<br>`sunken-coral-temple-v1.webp`<br>`ember-mine-v1.webp`<br>`moonlight-library-v1.webp`<br>`infinite-arena-v1.webp`<br>`endurance-forest-v1.webp` | OpenAI Codex + Tripo(Holymolly) + OpenAI ImageGen | Tripo 환경 작업 `44a32f65-07fc-4353-ac6f-5aad45b05ffe`를 공통 세계관 참고로 사용한 맵별 ImageGen 원본; 상세 프롬프트·해시는 `assets/source-records/map-backgrounds-v1.md` | ImageGen 원본 → 640×360 Lanczos → 1280×720 nearest-neighbor 기준 PNG → lossless exact WebP | Tripo 약관 §3.2와 OpenAI 이용약관 Content 조항(2026-08-31 확인). 독자 프롬프트, 특정 작품·작가 미지정, 10개 결과 사람 검수 완료 | 런타임 WebP만 `dist/` 포함. 생성 원본·기준 PNG는 제외. 공개 배포 전 약관·유사성 재검토 |
| `src/game/assets/monsters/*-tripo-v1.webp`<br>`src/game/assets/pets/dua-tripo-v1.webp` | OpenAI Codex + Tripo | 몬스터 10종과 동료 두아의 Tripo text-to-3D 작업 11건; 작업 ID·프롬프트·비용·원본 폴더는 `assets/source-records/generated-combat-assets-v1.md` | GLB 생성과 함께 제공된 512×512 투명 WebP 렌더를 사람 검수 후 런타임 파생본으로 선별 | Tripo 서비스 약관 §3.2(2026-09-01 확인), 독자 프롬프트, 특정 작품·캐릭터·작가 미지정 | 런타임 WebP만 `dist/` 포함. GLB·생성 참고 이미지·작업 JSON은 제외. 공개 배포 전 약관·유사성 재검토 |
| `src/game/assets/skills/*-icon-v1.webp` | OpenAI Codex + OpenAI ImageGen | 텍스트 없는 오리지널 4×4 기술 아이콘 아틀라스; 원본·프롬프트·해시는 `assets/source-records/generated-combat-assets-v1.md` | 원본 셀 15개 크롭 → 128×128 Lanczos → lossless exact WebP | OpenAI 이용약관 Content 조항(2026-09-01 확인), 특정 작품·캐릭터·작가 미지정, 사람 검수 완료 | 런타임 WebP 15개만 `dist/` 포함. 생성 원본은 제외 |
| `src/game/assets/ui/credits-background-v1.webp` | OpenAI Codex + OpenAI ImageGen | 텍스트 없는 오리지널 결말 풍경; 원본·프롬프트·해시는 `assets/source-records/generated-combat-assets-v1.md` | 1,672×941 원본 → 1,280×720 중앙 스케일·크롭 → WebP 품질 88 | OpenAI 이용약관 Content 조항(2026-09-01 확인), 특정 작품·캐릭터·작가 미지정, 사람 검수 완료 | 런타임 WebP만 `dist/` 포함. 생성 원본은 제외 |
| `src/game/audio/music-rules.ts`<br>`src/game/audio/procedural-audio.ts` | OpenAI Codex | 독자적으로 작성한 32스텝 일반·보스 음계 패턴과 Web Audio 합성 코드. 외부 음원·샘플·멜로디를 입력으로 사용하지 않음 | MIDI 음높이 수치 → 런타임 오실레이터 리드·베이스·패드·킥 합성. 별도 오디오 파일 없음 | 프로젝트 자체 제작 코드이며 제3자 음원이나 샘플 라이선스 의존 없음 | 소스 코드와 런타임 JS만 배포. 파일 기반 BGM으로 교체 시 해당 음원의 별도 권리 기록 필요 |

## 작성 규칙

- 파일 경로는 실제 런타임 파일명을 기준으로 적는다.
- `원본`에는 직접 제작 원본, 생성형 결과, 제3자 제공본 여부를 적는다.
- `변환 과정`에는 PNG→WebP, WAV→MP3, 루프 편집, 크롭, 팔레트 정리처럼 실제 수행한 변환만 적는다.
- `라이선스/권리 근거`에는 계약서, 라이선스 문구, 생성 기록, 구매 증빙, 약관 확인일 중 실제 근거만 적는다.
- `배포 조건`에는 상업/비상업 가능 여부, 저작자 표기 요구, `dist/` 포함 가능 여부를 적는다.
