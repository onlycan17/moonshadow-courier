import type { MapDef, MapId, PlatformDef, PortalDef, RopeDef } from './types';

export const MAP_LABELS_KO = Object.freeze({
  'cuning-city': '커닝시티',
  'bandit-hideout': '도적 아지트',
  'green-mushroom-cave': '초록버섯굴',
  'shadow-testing-ground': '그림자 시험장',
  'crystal-ant-cave': '수정 개미굴',
  'clockwork-tower': '시계태엽 탑',
  'sunken-coral-temple': '가라앉은 산호 신전',
  'ember-mine': '잿불 광산',
  'moonlight-library': '달빛 마도서고',
  'infinite-arena': '무한의 결투장',
  'endurance-forest': '인내의 숲'
} as const satisfies Record<MapId, string>);

export const MAP_PORTAL_WIDTH = 56;
export const MAP_PORTAL_HEIGHT = 96;
export const STANDARD_GROUND_Y = 660;
export const ENDURANCE_FOREST_GROUND_Y = 1380;

function platform(id: string, x: number, y: number, width: number, oneWay = true): PlatformDef {
  return Object.freeze({ id, x, y, width, oneWay });
}

function rope(id: string, x: number, topY: number, bottomY: number): RopeDef {
  return Object.freeze({ id, x, topY, bottomY });
}

function portal(
  id: string,
  x: number,
  y: number,
  targetMapId: MapId,
  targetPortalId: string,
  label: string,
  options: Pick<PortalDef, 'minLevel' | 'maxLevel' | 'hiddenUntilExpeditionStage' | 'requiresActiveExam'> = {}
): PortalDef {
  return Object.freeze({
    id,
    x,
    y,
    width: MAP_PORTAL_WIDTH,
    height: MAP_PORTAL_HEIGHT,
    targetMapId,
    targetPortalId,
    label,
    ...options
  });
}

function mapDef(definition: MapDef): MapDef {
  return Object.freeze({
    ...definition,
    platforms: [...definition.platforms],
    ropes: [...definition.ropes],
    portals: [...definition.portals],
    defaultSpawn: Object.freeze({ ...definition.defaultSpawn }),
    recommendedLevel: definition.recommendedLevel === null ? null : ([...definition.recommendedLevel] as [number, number])
  });
}

const mapDefs = {
  'cuning-city': mapDef({
    id: 'cuning-city',
    width: 1920,
    height: 720,
    groundY: STANDARD_GROUND_Y,
    platforms: [],
    ropes: [],
    portals: [
      portal('to-bandit-hideout', 280, STANDARD_GROUND_Y, 'bandit-hideout', 'to-cuning-city', '아지트 포탈'),
      portal('to-green-mushroom-cave', 520, STANDARD_GROUND_Y, 'green-mushroom-cave', 'to-cuning-city', '동굴 포탈'),
      portal('to-moonlight-library', 760, STANDARD_GROUND_Y, 'moonlight-library', 'to-cuning-city', '서고 포탈', {
        hiddenUntilExpeditionStage: 'upperboss'
      })
    ],
    defaultSpawn: { x: 140, y: STANDARD_GROUND_Y },
    recommendedLevel: null
  }),
  'bandit-hideout': mapDef({
    id: 'bandit-hideout',
    width: 1280,
    height: 720,
    groundY: STANDARD_GROUND_Y,
    platforms: [],
    ropes: [],
    portals: [
      portal('to-cuning-city', 180, STANDARD_GROUND_Y, 'cuning-city', 'to-bandit-hideout', '도시 귀환 포탈'),
      portal('to-shadow-testing-ground', 1000, STANDARD_GROUND_Y, 'shadow-testing-ground', 'to-bandit-hideout', '시험장 포탈', {
        requiresActiveExam: true
      })
    ],
    defaultSpawn: { x: 260, y: STANDARD_GROUND_Y },
    recommendedLevel: null
  }),
  'green-mushroom-cave': mapDef({
    id: 'green-mushroom-cave',
    width: 1920,
    height: 720,
    groundY: STANDARD_GROUND_Y,
    platforms: [
      platform('lower-west', 180, 560, 320),
      platform('lower-east', 1220, 560, 340),
      platform('middle-center', 710, 450, 420),
      platform('upper-center', 860, 340, 260)
    ],
    ropes: [],
    portals: [
      portal('to-cuning-city', 180, STANDARD_GROUND_Y, 'cuning-city', 'to-green-mushroom-cave', '도시 포탈'),
      portal('to-crystal-ant-cave', 1520, STANDARD_GROUND_Y, 'crystal-ant-cave', 'to-green-mushroom-cave', '개미굴 포탈'),
      portal('to-endurance-forest', 920, STANDARD_GROUND_Y, 'endurance-forest', 'to-green-mushroom-cave', '인내의 숲 입구')
    ],
    defaultSpawn: { x: 300, y: STANDARD_GROUND_Y },
    recommendedLevel: [10, 29]
  }),
  'shadow-testing-ground': mapDef({
    id: 'shadow-testing-ground',
    width: 1280,
    height: 720,
    groundY: STANDARD_GROUND_Y,
    platforms: [platform('trial-perch', 500, 540, 300)],
    ropes: [rope('trial-rope', 650, 300, 540)],
    portals: [portal('to-bandit-hideout', 160, STANDARD_GROUND_Y, 'bandit-hideout', 'to-shadow-testing-ground', '아지트 귀환 포탈')],
    defaultSpawn: { x: 260, y: STANDARD_GROUND_Y },
    recommendedLevel: null
  }),
  'crystal-ant-cave': mapDef({
    id: 'crystal-ant-cave',
    width: 1920,
    height: 720,
    groundY: STANDARD_GROUND_Y,
    platforms: [
      platform('lower-west', 180, 560, 340),
      platform('lower-east', 1260, 560, 320),
      platform('middle-center', 780, 450, 360),
      platform('upper-right', 1180, 340, 260)
    ],
    ropes: [rope('main-rope', 960, 320, 560)],
    portals: [
      portal('to-green-mushroom-cave', 200, STANDARD_GROUND_Y, 'green-mushroom-cave', 'to-crystal-ant-cave', '버섯굴 포탈'),
      portal('to-clockwork-tower', 1560, STANDARD_GROUND_Y, 'clockwork-tower', 'to-crystal-ant-cave', '탑 포탈')
    ],
    defaultSpawn: { x: 300, y: STANDARD_GROUND_Y },
    recommendedLevel: [30, 49]
  }),
  'clockwork-tower': mapDef({
    id: 'clockwork-tower',
    width: 1920,
    height: 720,
    groundY: STANDARD_GROUND_Y,
    platforms: [
      platform('lower-west', 240, 560, 300),
      platform('lower-east', 1300, 560, 300),
      platform('middle-center', 820, 450, 320),
      platform('upper-left', 520, 340, 260)
    ],
    ropes: [rope('tower-rope', 980, 320, 560)],
    portals: [
      portal('to-crystal-ant-cave', 200, STANDARD_GROUND_Y, 'crystal-ant-cave', 'to-clockwork-tower', '개미굴 포탈'),
      portal('to-sunken-coral-temple', 1580, STANDARD_GROUND_Y, 'sunken-coral-temple', 'to-clockwork-tower', '산호 신전 포탈')
    ],
    defaultSpawn: { x: 320, y: STANDARD_GROUND_Y },
    recommendedLevel: [50, 69]
  }),
  'sunken-coral-temple': mapDef({
    id: 'sunken-coral-temple',
    width: 1920,
    height: 720,
    groundY: STANDARD_GROUND_Y,
    platforms: [
      platform('lower-west', 200, 560, 320),
      platform('lower-east', 1320, 560, 300),
      platform('middle-center', 780, 450, 360),
      platform('upper-right', 1220, 340, 260)
    ],
    ropes: [rope('coral-rope', 960, 320, 560)],
    portals: [
      portal('to-clockwork-tower', 200, STANDARD_GROUND_Y, 'clockwork-tower', 'to-sunken-coral-temple', '시계탑 포탈'),
      portal('to-ember-mine', 1580, STANDARD_GROUND_Y, 'ember-mine', 'to-sunken-coral-temple', '광산 포탈')
    ],
    defaultSpawn: { x: 320, y: STANDARD_GROUND_Y },
    recommendedLevel: [70, 99]
  }),
  'ember-mine': mapDef({
    id: 'ember-mine',
    width: 1920,
    height: 720,
    groundY: STANDARD_GROUND_Y,
    platforms: [
      platform('lower-west', 220, 560, 340),
      platform('middle-center', 860, 450, 320),
      platform('upper-right', 1300, 340, 280)
    ],
    ropes: [rope('mine-rope', 1020, 320, 560)],
    portals: [
      portal('to-sunken-coral-temple', 220, STANDARD_GROUND_Y, 'sunken-coral-temple', 'to-ember-mine', '산호 신전 포탈'),
      portal('to-moonlight-library', 1560, STANDARD_GROUND_Y, 'moonlight-library', 'to-ember-mine', '서고 회랑 포탈')
    ],
    defaultSpawn: { x: 340, y: STANDARD_GROUND_Y },
    recommendedLevel: [100, 139]
  }),
  'moonlight-library': mapDef({
    id: 'moonlight-library',
    width: 1920,
    height: 720,
    groundY: STANDARD_GROUND_Y,
    platforms: [
      platform('lower-west', 240, 560, 300),
      platform('middle-center', 840, 450, 340),
      platform('upper-right', 1300, 340, 280)
    ],
    ropes: [rope('library-rope', 1010, 320, 560)],
    portals: [
      portal('to-ember-mine', 220, STANDARD_GROUND_Y, 'ember-mine', 'to-moonlight-library', '광산 포탈'),
      portal('to-cuning-city', 820, STANDARD_GROUND_Y, 'cuning-city', 'to-moonlight-library', '도시 포탈'),
      portal('to-infinite-arena', 1560, STANDARD_GROUND_Y, 'infinite-arena', 'to-cuning-city', '결투장 포탈', {
        minLevel: 200
      })
    ],
    defaultSpawn: { x: 320, y: STANDARD_GROUND_Y },
    recommendedLevel: [140, 199]
  }),
  'infinite-arena': mapDef({
    id: 'infinite-arena',
    width: 1920,
    height: 720,
    groundY: STANDARD_GROUND_Y,
    platforms: [
      platform('lower-left', 180, 540, 220),
      platform('lower-center', 600, 540, 240),
      platform('lower-right', 1040, 540, 240),
      platform('upper-left', 360, 430, 220),
      platform('upper-right', 1260, 430, 220)
    ],
    ropes: [],
    portals: [portal('to-cuning-city', 940, STANDARD_GROUND_Y, 'cuning-city', 'to-moonlight-library', '귀환 포탈')],
    defaultSpawn: { x: 200, y: STANDARD_GROUND_Y },
    recommendedLevel: [200, 200]
  }),
  'endurance-forest': mapDef({
    id: 'endurance-forest',
    width: 1920,
    height: 1440,
    groundY: ENDURANCE_FOREST_GROUND_Y,
    platforms: [
      platform('entry-ledge', 220, 1260, 260),
      platform('lower-middle', 620, 1140, 220),
      platform('middle-right', 1120, 1020, 220),
      platform('upper-left', 760, 900, 220),
      platform('summit-approach', 1280, 780, 240),
      platform('summit', 1540, 660, 220)
    ],
    ropes: [
      rope('entry-rope', 520, 1120, 1260),
      rope('summit-rope', 1500, 760, 1020)
    ],
    portals: [
      portal('to-green-mushroom-cave', 180, ENDURANCE_FOREST_GROUND_Y, 'green-mushroom-cave', 'to-endurance-forest', '입구 포탈'),
      portal('to-cuning-city', 1620, 660, 'cuning-city', 'to-green-mushroom-cave', '정상 포탈')
    ],
    defaultSpawn: { x: 280, y: ENDURANCE_FOREST_GROUND_Y },
    recommendedLevel: null
  })
} as const satisfies Record<MapId, MapDef>;

export const MAP_DEFS = Object.freeze(mapDefs);

export function getMap(mapId: MapId): MapDef {
  return MAP_DEFS[mapId];
}
