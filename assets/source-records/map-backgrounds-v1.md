# 11개 맵 배경 v1 생성 기록

## 생성 정보

- 생성일: 2026-08-31
- 도구: OpenAI 내장 ImageGen(기본 built-in 모드), FFmpeg, `cwebp`
- 공통 형태·조명 참고: Tripo 환경 작업 `44a32f65-07fc-4353-ac6f-5aad45b05ffe`의 `preview.png`
- 이번 작업의 Tripo 추가 사용 크레딧: 0 (기존 프로젝트 원본 재사용)
- 생성 원본: `artifacts/imagegen-source/map-backgrounds/*-source.png`
- 기준 PNG: `artifacts/imagegen-source/map-backgrounds/reference/*-reference.png`
- 런타임: `src/game/assets/maps/backgrounds/*-v1.webp`

## 공통 프롬프트 계약

각 맵은 아래 지시를 공통으로 사용하고 `Primary request`, `Scene/backdrop`, 강조색만 맵별로 바꿨다.

```text
Use case: stylized-concept
Asset type: 1280x720 runtime background for a 2D side-scrolling action RPG
Input image: Tripo nocturnal canal-city diorama preview, used only as this original project's material, lighting, and world-design reference
Style/medium: polished 16-bit-inspired pixel art, crisp clusters, detailed but readable silhouettes, charcoal/navy world palette with a restrained map-specific accent palette
Composition/framing: orthographic side view, wide 16:9, strong depth layers; keep game collision platforms, ropes and portals as separate overlays
Constraints: no characters, no creatures, no text, no letters, no signs, no logos, no UI, no portal, no bright rectangular platform blocks, no watermark, no recognizable franchise imagery
```

## 맵별 프롬프트 차이

| 맵 | Primary request / 장면 | 강조 팔레트 |
| --- | --- | --- |
| 도적 아지트 | 운하 도시 아래 비밀 아지트, 젖은 석벽·목재 지지대·상자·수로·청록 유리등 | teal, restrained amber |
| 초록버섯굴 | 거대한 석회 동굴, 발광 버섯·습한 암석 아치·지하수·나무뿌리 | emerald, cyan |
| 그림자 시험장 | 버려진 저수조 내부의 훈련장, 표적·밧줄·반사 수면·청록 화로 | teal, single amber beam |
| 수정 개미굴 | 자수정 지오드와 개미굴형 침식 아치, 수정맥·광물 선반·안개 | amethyst, pale cyan |
| 시계태엽 탑 | 시계 문자판 없는 거대 기계실, 기어·피스톤·균형추·보일러 창 | aged brass, teal, orange |
| 가라앉은 산호 신전 | 침수된 석조 성소, 부서진 아치·산호 기둥·돔·기포·수중광 | cyan, sea-green, coral |
| 잿불 광산 | 현무암 광산, 목재 지지대·광차·사슬·마그마 균열·연기 | ember orange, red |
| 달빛 마도서고 | 거대 서고, 철제 발코니·나선 계단·유리 구체·달빛 창 | moon blue, violet, teal |
| 무한의 결투장 | 우주 바깥의 검은 석조 원형 경기장, 부서진 아치·부유석·달 후광 | silver, cyan, violet |
| 인내의 숲 | 밤의 수직 상승 숲, 고목·안개 협곡·자연 선반·덩굴·반딧불 | pine green, moss, teal |

커닝시티의 생성 프롬프트와 해시는 `assets/source-records/tripo-character-and-city-v1.md`에 별도로 기록돼 있다.

## 런타임 변환

1. ImageGen 원본을 FFmpeg Lanczos로 640×360까지 축소했다.
2. nearest-neighbor로 1280×720에 확대해 픽셀 블록을 고정했다.
3. `cwebp -lossless -exact -z 9`로 픽셀 동일 lossless WebP를 만들었다.
4. 원본 PNG와 기준 PNG는 `artifacts/`에만 두고 `dist/`에는 WebP만 포함한다.
5. 배경은 장식 전용이며 충돌은 기존 맵 데이터가 단일 기준이다. 발판·줄은 맵별 저채도 팔레트 오버레이로 구분한다.

## SHA-256과 런타임 크기

| 맵 ID | ImageGen 원본 SHA-256 | 런타임 WebP SHA-256 | bytes |
| --- | --- | --- | ---: |
| bandit-hideout | `329b7b57cd8799aa5d90e10a74142e878d546cebe8f4aacb419d471a54a7a983` | `0e5e8418b574a88e9a8bea4a3de11cda5e0ece8974ea505661f9b6f736969506` | 282396 |
| green-mushroom-cave | `8a9955e17c20895c108caf1d61c8c5e2111916d2a15067cd2f0b37cce521ad69` | `0cd8d518f118c872c22c4003cf00c3b893fa4cf224693792376895f18ce88ed9` | 332944 |
| shadow-testing-ground | `4a8bf390eac6358fa4c8ac0fb76475d27d043e1bfc757787271abf95e2bcc87f` | `f66680d53676d41085259b57013ac892f19e769244146e0f04f7bc8523e522f9` | 306312 |
| crystal-ant-cave | `f81eae41b1d7fd19f6e194df6a81cd5a92e8d6fa20f79ac6c62de34c370a868e` | `e306a85643764dc93e238c2678aed1045d43862b7e1c48c09ca5cd79b4c0edfd` | 348858 |
| clockwork-tower | `42f3d7d33a9916183a8d8d48016024ed8012b441b5a88ba7272a216e377ab1fc` | `f40906180d09ce12fbe353b5c2ad8c929e602e80e2e600c196a29dfece0f5fed` | 339968 |
| sunken-coral-temple | `dfa8c9fac878208611b373702d2853edbec8c3a7dbb32cb4fa855b7181d3f2c4` | `848932bed97ae2deb26b42fa3b817d3f25d90cb9fc4a9dd5b6b96643c9540558` | 394122 |
| ember-mine | `af23674d7b41dd3d1410d18f62d14e452635db70aa68a6ee6a5e101ded458a6d` | `f209f2dfeefe761b8b1bdc5f77596721a8b7b49c5f37ef4607867c0f9dff1851` | 327782 |
| moonlight-library | `95f274a218aa1121346dc8950581921bed7ca8d9fdef3e5602509cd5a2405896` | `eb12c102db5027c7bc7c3a7f1f8d2e51df76fdd129a6fdcaa9d373bc7df95292` | 356042 |
| infinite-arena | `c783683af7125c8e70e6b7c01b126f1a035dee46d9cf52cc7f65d3ffa8e9c70e` | `5d53825b933e7928e8d040bcbf7c712537bbfafc31c8011760da5438cc112a01` | 362222 |
| endurance-forest | `5ca89365407035e48985d5656c177ffd58e29ba7275fd800db04f987940cf0b0` | `dc45d5659fa3aa25c2f4e592c5c65c990cd9ad113f164f254d731c7cdaa8a536` | 378740 |

## 권리·유사성 검토

- Tripo 참고 원본과 OpenAI 출력의 권리 검토 기준은 `assets/source-records/tripo-character-and-city-v1.md`와 같다.
- 특정 작품·캐릭터·작가·현존 아티스트를 프롬프트에 넣지 않았다.
- 10개 결과를 사람이 확인해 글자, 로고, 알아볼 수 있는 프랜차이즈 요소가 없음을 확인했다.
- 공개 배포 전에는 당시 서비스 약관과 제3자 유사성을 다시 검토한다.
