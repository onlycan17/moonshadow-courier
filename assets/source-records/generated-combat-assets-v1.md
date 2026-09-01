# 생성형 전투 에셋 v1 제작 기록

## 공통 원칙

- 생성일: 2026-09-01 (Asia/Seoul)
- 외부 GitHub 프로젝트·에셋은 사용하지 않았다.
- 특정 작품, 캐릭터, 작가, 현존 아티스트의 화풍을 프롬프트에 지정하지 않았다.
- Tripo 결과는 각 작업 폴더의 `preview.png`를 사람 눈으로 확인한 뒤 채택했다.
- GLB, 생성 참고 이미지, 원본 PNG와 `task.json`은 `assets/source/`에 보존하고 런타임에는 파생 WebP만 포함한다.

## Tripo 몬스터·동료

초기 잔액 4,840크레딧에서 아래 11개 작업이 각각 40크레딧을 사용해 총 440크레딧을 소비했고, 완료 뒤 잔액은 4,400크레딧이었다. 정확한 원문 프롬프트와 응답은 각 경로의 `task.json`에 보존한다.

| 대상 | Tripo 작업 ID | 원본 폴더 | 런타임 파생본 |
| --- | --- | --- | --- |
| 그림자 파수꾼 | `ca9c8b5a-6cb0-412d-b7d0-4f900f9b99a9` | `assets/source/monsters/tripo-out/original-shadow-sentinel-creatur-ca9c8b5a/` | `src/game/assets/monsters/shadow-sentinel-tripo-v1.webp` |
| 수정굴 늑대 | `1c6b5c5c-b0f3-44d2-a57b-6f305a057d07` | `assets/source/monsters/tripo-out/original-crystal-cave-wolf-creat-1c6b5c5c/` | `src/game/assets/monsters/crystal-wolf-tripo-v1.webp` |
| 망각된 기술자 좀비 | `42dd8c28-6d38-422d-8075-75713d555858` | `assets/source/monsters/tripo-out/original-forgotten-clockwork-tec-42dd8c28/` | `src/game/assets/monsters/forgotten-zombie-tripo-v1.webp` |
| 심연의 골렘 | `e40ccfb2-ae7f-4e5d-9149-4fea933057a9` | `assets/source/monsters/tripo-out/original-abyss-golem-for-a-side-e40ccfb2/` | `src/game/assets/monsters/abyss-golem-tripo-v1.webp` |
| 산호 맹그로브 | `c6892b82-d8c3-4dd1-bbc7-c12c279abacb` | `assets/source/monsters/tripo-out/original-coral-mangrove-monster-c6892b82/` | `src/game/assets/monsters/coral-mangrove-tripo-v1.webp` |
| 잿불 광부 좀비 | `11606031-119f-4c79-b712-43086ac2ef13` | `assets/source/monsters/tripo-out/original-ember-miner-zombie-for-11606031/` | `src/game/assets/monsters/ember-zombie-tripo-v1.webp` |
| 월광 늑대 | `c137f13f-6e4b-420e-bb92-bdad1328c096` | `assets/source/monsters/tripo-out/original-moonlight-library-wolf-c137f13f/` | `src/game/assets/monsters/moonlight-wolf-tripo-v1.webp` |
| 이그니카르 | `580efd93-ebd9-40cf-b937-ffec994452ae` | `assets/source/monsters/tripo-out/original-volcanic-warlord-boss-i-580efd93/` | `src/game/assets/monsters/ignikar-tripo-v1.webp` |
| 루나시온 | `eef4b8bb-7df5-48ee-9cfe-b314740e1041` | `assets/source/monsters/tripo-out/original-lunar-archive-sage-boss-eef4b8bb/` | `src/game/assets/monsters/lunasion-tripo-v1.webp` |
| 무한의 수호자 | `2e36c8cc-9bf3-4f53-9dbd-da5e8c50795f` | `assets/source/monsters/tripo-out/original-infinite-arena-final-gu-2e36c8cc/` | `src/game/assets/monsters/one-punch-guardian-tripo-v1.webp` |
| 동료 두아 | `087282a0-b8df-4e35-af39-6765532f6691` | `assets/source/pets/tripo-out/original-companion-pet-dua-for-a-087282a0/` | `src/game/assets/pets/dua-tripo-v1.webp` |

Tripo가 함께 제공한 512×512 투명 WebP 렌더를 런타임 파생본으로 선별했다. 실제 3D 원본인 `model.glb`는 배포 번들에서 제외한다.

## 기술 아이콘 15종

- 도구: OpenAI ImageGen
- 원본: `assets/source/ui/skill-icons-atlas-v1.png`
- 원본 SHA-256: `b3b952a059b3f7215e48f7c27d3f2d40b5666af6535a26e2b26bbb25e9629258`
- 프롬프트 요약: 오리지널 그림자 전령 액션 RPG용 4×4 정방형 아이콘 아틀라스. 표창 계열 7종, 나선 에너지, 구미호 정령, 삼인 협공, 천뢰옥, 패시브 4종, 중립 문장 1종. 텍스트·로고·저작권 캐릭터·기존 게임 문양을 금지했다.
- 변환: 1,254×1,254 원본을 셀 경계로 15개 크롭 → FFmpeg Lanczos 128×128 → `cwebp -lossless -exact`.
- 런타임: `src/game/assets/skills/*-icon-v1.webp`

## 최종 크레딧 배경

- 도구: OpenAI ImageGen
- 원본: `assets/source/ending/credits-background-v1.png`
- 원본 SHA-256: `b9a6e4dea2e82eecfc7ab29778e57d53bace631016ddbf0471b529a37b4e96bc`
- 프롬프트 요약: 그림자 전령과 민트빛 동료가 숲·수정굴·시계탑·산호 유적·잿불 산·월광 도서관을 바라보는 텍스트 없는 오리지널 16:9 결말 풍경. 중앙 55%는 DOM 크레딧 가독성을 위해 저대비로 비웠다.
- 변환: 1,672×941 원본 → 중앙 기준 1,280×720 스케일·크롭 → WebP 품질 88.
- 런타임: `src/game/assets/ui/credits-background-v1.webp`
- 런타임 SHA-256: `3a8c9d371f2024938147d5da5ba4bec3293e3012b114082c6015c318529777ff`

## 권리·배포 메모

- OpenAI와 Tripo의 생성 결과에 관한 당시 이용 조건을 전제로 하되 비침해성·독점성은 보장되지 않으므로 공개 배포 직전에 약관과 유사성을 다시 확인한다.
- 원본·중간 파일은 제작 근거 보존용이며 `dist/`에는 Vite가 참조하는 런타임 WebP만 포함한다.
