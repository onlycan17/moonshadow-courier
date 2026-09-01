# Tripo 캐릭터·커닝시티 생성 기록

## 생성 정보

- 생성일: 2026-08-31
- 도구: `tripo-cli` 0.3.1 / Tripo P1-20260311, OpenAI 내장 ImageGen
- Tripo 사용 크레딧: 총 80 (캐릭터 40 + 환경 40)
- 생성 원본 보관: `artifacts/tripo-source/`, `artifacts/imagegen-source/` (`artifacts/`는 배포 제외)
- 런타임 파생본: `src/game/assets/characters/shadow-courier-sheet-v1.webp`, `src/game/assets/maps/cuning-city-background-v1.webp`

## Tripo 캐릭터 원본

- 작업 ID: `2ecc87c2-2542-44f5-8b4c-4ef421ca1659`
- 설정: PBR, texture, auto-size, UV export, `face_limit=5000`
- 결과: `model.glb`, `rendered_image.webp`, `generated_image.jpeg`, `preview.png`

```text
Full-body original agile shadow courier character for a nocturnal fantasy city action RPG, neutral A-pose with arms slightly away from body, lean readable silhouette, short asymmetric dark hair, charcoal layered travel coat with deep teal lining, lightweight boots, pale cyan glass charms at belt, compact six-point throwing discs in a plain side holster, friendly determined face, no mask, no cape, no text, no logo, no headband, no clan symbol, no recognizable franchise costume, standalone game character
```

Negative prompt:

```text
text,letters,logo,forehead protector,anime franchise costume,clan symbol,weapon in hands,cloak covering body,busy background
```

## Tripo 환경 원본

- 작업 ID: `44a32f65-07fc-4353-ac6f-5aad45b05ffe`
- 설정: PBR, texture, auto-size, UV export, `face_limit=8000`
- 결과: `model.glb`, `rendered_image.webp`, `generated_image.jpeg`, `preview.png`

```text
Wide horizontal miniature diorama of an original nocturnal canal city street for a side-scrolling fantasy action RPG, layered crooked slate-roof houses, elevated iron walkways, canal railings, distant clockless towers, small market awnings, teal window glow and sparse warm amber lanterns, damp dark stone, open ground lane across the front for gameplay, rich silhouette with clear depth layers, no characters, no text, no signs, no logos, no recognizable franchise architecture, standalone environment set
```

Negative prompt:

```text
text,letters,logo,characters,brand sign,franchise landmark,clock face,isolated single building,busy foreground blocking lane
```

## ImageGen 파생 제작

Tripo 미리보기 두 장을 각각 형태·팔레트 참고 이미지로 사용했다. 특정 작품·작가·현존 아티스트의 화풍은 지시하지 않았다.

- 배경 지시: 1280×720, 16-bit풍 픽셀 아트, 정면 횡스크롤 구도, 달빛 운하 도시, 전경의 평평한 플레이 차선, 텍스트·간판·캐릭터·로고 없음.
- 캐릭터 시트 지시: 4×4 고정 그리드, 정면/측면이 읽히는 투명 배경 픽셀 아트. 1행 idle, 2행 walk, 3행 jump/fall/land, 4행 투척 공격 준비/릴리스/후속/복귀.
- 배경 제거 보정: 최초 시트의 체크무늬 배경만 제거하고 캐릭터 픽셀과 4×4 배치를 유지하도록 재처리했다.

## 런타임 변환

1. 배경 생성본을 Lanczos로 1280×720 기준 PNG로 맞췄다.
2. 투명 캐릭터 시트를 nearest-neighbor로 512×512 기준 PNG로 맞춰 128×128 셀 16개를 고정했다.
3. 기준 PNG를 lossless WebP로 변환해 Vite URL import로만 번들링했다.
4. Tripo GLB, 생성 미리보기, ImageGen 원본과 기준 PNG는 `dist/`에서 제외한다.
5. 캐릭터 판정 상자는 시각 중심과 발 원점에 맞춘 별도 수치 계약으로 유지하며 단위 테스트로 검증한다.
6. 생성 시트의 열별 불투명 몸체 중심이 `76.5 / 63.5 / 49.5 / 36.5px`로 달라 정지 애니메이션이 흔들리는 현상을 확인했다. 런타임은 프레임별 x 원점과 물리 바디 오프셋을 함께 보정해 월드 중심을 고정하며, 원본 픽셀은 변경하지 않는다.

## SHA-256

| 대상 | SHA-256 |
| --- | --- |
| 캐릭터 Tripo `model.glb` | `1914afeebe7ae529435489c20f83aaa828d60e0f053ab5e4bee614c170f45242` |
| 캐릭터 Tripo `rendered_image.webp` | `6d10babf93a7e39e4dfc74d5e3246a04f50174bd9f461714e2c12674dd5fdcff` |
| 캐릭터 Tripo `task.json` | `13743012ab8027a548e2a88600373811c6b35495d9ac4a6ceb7ace9d6a8888da` |
| 환경 Tripo `model.glb` | `1635503bdd4400522a8c855a581550dd75da83d5b66a59598ecd9128531b94b4` |
| 환경 Tripo `rendered_image.webp` | `16c708e909b5829ac28497241e872f94d0d0f57aa6bffdd506b24a1b59edd334` |
| 환경 Tripo `task.json` | `7ce26629eaa67dd632e5f9a0ba36ef7782308d39fa92faf4bf024cfc7f218bb5` |
| 배경 ImageGen 원본 | `9fdf087b05f5b84ab79a29c335b51349ba7b1b0920b0726ae44b617d1b8bf7a1` |
| 캐릭터 ImageGen 투명 원본 | `4e9d50da1f5c3d34f2c422f33fe16c1689a28aca8d877e0df41398e1c95447d6` |
| 배경 기준 PNG | `1c0156a92a37bff545ca31eb36f2c92d8d93c134da0194cb86f59da82d63a69e` |
| 캐릭터 기준 PNG | `1bef796ecad6ed5b48aeef79dd4a47b3013f3eb148494ad5f307bef4ce603c06` |
| 런타임 배경 WebP | `335297ed612445051f344e29a3488bf6639714c1977691dd32643da581605f93` |
| 런타임 캐릭터 WebP | `f6295bf9d716936dfb2097d257c6d6db755bcde2b97417fd8b357675cffffee1` |

## 권리·유사성 검토

- Tripo 결과는 `assets/source-records/tripo-portal-arch.md`에 기록한 동일한 Tripo 서비스 약관 §3.2 검토 기준을 적용한다.
- [OpenAI 이용약관](https://openai.com/policies/terms-of-use/)의 Content 조항은 법률이 허용하는 범위에서 입력 권리를 유지하고 출력물을 소유한다고 명시하지만, 출력물 사용과 제3자 권리 검토 책임은 사용자에게 있다(2026-08-31 확인).
- 두 Tripo 미리보기와 최종 배경·시트를 사람이 확인해 글자, 로고, 고유 문양, 알아볼 수 있는 프랜차이즈 캐릭터가 없음을 확인했다.
- 생성형 출력은 독점성·비침해성이 자동 보장되지 않으므로 공개 배포 전에 당시 약관과 제3자 유사성을 다시 검토한다.
