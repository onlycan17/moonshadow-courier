# Tripo 포탈 프레임 생성 기록

## 생성 정보

- 생성일: 2026-08-31
- 도구: `tripo-cli` 0.3.1 / Tripo P1-20260311
- 프리셋: `toy`, `face_limit=3000`, `auto_size=true`
- 작업 ID: `5928924b-2dd0-4225-a052-1bfab3faf71b`
- 사용 크레딧: 40
- 결과: GLB 1,067,724 bytes, glTF 삼각형 primitive 2,789개, 업로드 정점 4,624개
- 로컬 원본: `artifacts/tripo-source/tripo-out/a-standalone-low-poly-fantasy-po-5928924b/` (`artifacts/`는 배포 제외)

## 프롬프트

```text
A standalone low-poly fantasy portal arch for an original nocturnal side-scrolling action RPG, front-facing and symmetrical, weathered dark silver stone and blue crystal, empty open center framed by a thin vertical cyan energy membrane, two concentric circular floor rings, a few small upward-floating crystal shards, clean readable silhouette, compact game prop, no text, no letters, no logos, no characters, no recognizable franchise symbols
```

Negative prompt:

```text
text,letters,logo,character,franchise symbol,asymmetrical camera angle,busy background
```

## 런타임 변환

1. Tripo의 투명 배경 512×512 `rendered_image.webp`를 생성 원본으로 보존했다.
2. FFmpeg Lanczos로 64×64 축소한 뒤 nearest-neighbor로 128×128 확대해 픽셀 블록을 고정했다.
3. 기준 PNG를 `cwebp -lossless -exact`로 변환해 `src/game/assets/maps/portal-arch-tripo.webp`를 만들었다.
4. 기준 PNG와 WebP 디코딩 결과의 128×128 RGBA 프레임 MD5가 `bcb658da73345c43574c204168a232a2`로 동일함을 확인했다.
5. 원본 GLB·기준 PNG·생성 중간 이미지는 `dist/`에 포함하지 않는다.

## SHA-256

| 대상 | SHA-256 |
| --- | --- |
| `model.glb` | `1a59f04ecd365bee0227a77c246f9a678f9001de8abb76ff292956b3c9e55f4f` |
| `rendered_image.webp` | `7e93a29b1c9d9c02963068ab7a1ffd93a33695faed4dbd5a668bfd7849379c4f` |
| `task.json` | `8be35eb5c9d7e339c491b4c090c71f79c068709b43312ea7053101591de85ff9` |
| 런타임 `portal-arch-tripo.webp` | `32abfc0a1ff9c0cf8f7fd2d3351afa4e03ce04cf438e2f5515bdf1b3eb3485cf` |

## 권리 검토

- [Tripo 서비스 약관](https://www.tripo3d.ai/terms) §3.2(2025-07-11 갱신본, 2026-08-31 확인)는 결과물의 합법적인 상업·비상업 목적 사용을 허용한다.
- 같은 조항은 결과물의 비침해성·정확성·독점성을 보증하지 않으며, 입력과 결과 검수 책임은 사용자에게 둔다.
- 프롬프트에 특정 작품·캐릭터·작가·상표를 넣지 않았고, 미리보기에서 글자·로고·알아볼 수 있는 프랜차이즈 문양이 없음을 사람이 확인했다.
- 공개 배포 시에는 당시 약관과 제3자 유사성 위험을 다시 검토한다.
