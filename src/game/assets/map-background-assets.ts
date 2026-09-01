import banditHideoutUrl from './maps/backgrounds/bandit-hideout-v1.webp?url';
import clockworkTowerUrl from './maps/backgrounds/clockwork-tower-v1.webp?url';
import crystalAntCaveUrl from './maps/backgrounds/crystal-ant-cave-v1.webp?url';
import emberMineUrl from './maps/backgrounds/ember-mine-v1.webp?url';
import enduranceForestUrl from './maps/backgrounds/endurance-forest-v1.webp?url';
import greenMushroomCaveUrl from './maps/backgrounds/green-mushroom-cave-v1.webp?url';
import infiniteArenaUrl from './maps/backgrounds/infinite-arena-v1.webp?url';
import moonlightLibraryUrl from './maps/backgrounds/moonlight-library-v1.webp?url';
import shadowTestingGroundUrl from './maps/backgrounds/shadow-testing-ground-v1.webp?url';
import sunkenCoralTempleUrl from './maps/backgrounds/sunken-coral-temple-v1.webp?url';
import cuningCityUrl from './maps/cuning-city-background-v1.webp?url';
import type { MapId } from '../maps/types';

export interface MapBackgroundAsset {
  textureKey: `map-background-${MapId}-v1`;
  url: string;
  platformFill: number;
  platformStroke: number;
  ropeColor: number;
}

const MAP_COLLISION_PALETTES = Object.freeze({
  'cuning-city': { platformFill: 0x253843, platformStroke: 0x6e9ba1, ropeColor: 0xb7a56f },
  'bandit-hideout': { platformFill: 0x252d2e, platformStroke: 0x647a72, ropeColor: 0x9b8057 },
  'green-mushroom-cave': { platformFill: 0x18352f, platformStroke: 0x4f9d80, ropeColor: 0x8ea66b },
  'shadow-testing-ground': { platformFill: 0x202c35, platformStroke: 0x5b7e8d, ropeColor: 0xa88f63 },
  'crystal-ant-cave': { platformFill: 0x2b2843, platformStroke: 0x7868a6, ropeColor: 0x9d87bb },
  'clockwork-tower': { platformFill: 0x332b22, platformStroke: 0x8d6c3d, ropeColor: 0xb18d54 },
  'sunken-coral-temple': { platformFill: 0x24404a, platformStroke: 0x5b8791, ropeColor: 0x829f8a },
  'ember-mine': { platformFill: 0x382725, platformStroke: 0x915044, ropeColor: 0x9d7956 },
  'moonlight-library': { platformFill: 0x252840, platformStroke: 0x666a9b, ropeColor: 0x9a805f },
  'infinite-arena': { platformFill: 0x242a43, platformStroke: 0x597da2, ropeColor: 0x8394b3 },
  'endurance-forest': { platformFill: 0x203528, platformStroke: 0x5b7f5e, ropeColor: 0x8c8458 }
} satisfies Record<MapId, Pick<MapBackgroundAsset, 'platformFill' | 'platformStroke' | 'ropeColor'>>);

export const MAP_BACKGROUND_ASSETS = Object.freeze({
  'cuning-city': createBackgroundAsset('cuning-city', cuningCityUrl),
  'bandit-hideout': createBackgroundAsset('bandit-hideout', banditHideoutUrl),
  'green-mushroom-cave': createBackgroundAsset('green-mushroom-cave', greenMushroomCaveUrl),
  'shadow-testing-ground': createBackgroundAsset('shadow-testing-ground', shadowTestingGroundUrl),
  'crystal-ant-cave': createBackgroundAsset('crystal-ant-cave', crystalAntCaveUrl),
  'clockwork-tower': createBackgroundAsset('clockwork-tower', clockworkTowerUrl),
  'sunken-coral-temple': createBackgroundAsset('sunken-coral-temple', sunkenCoralTempleUrl),
  'ember-mine': createBackgroundAsset('ember-mine', emberMineUrl),
  'moonlight-library': createBackgroundAsset('moonlight-library', moonlightLibraryUrl),
  'infinite-arena': createBackgroundAsset('infinite-arena', infiniteArenaUrl),
  'endurance-forest': createBackgroundAsset('endurance-forest', enduranceForestUrl)
} satisfies Record<MapId, MapBackgroundAsset>);

export function getMapBackgroundAsset(mapId: MapId): MapBackgroundAsset {
  return MAP_BACKGROUND_ASSETS[mapId];
}

function createBackgroundAsset<TMapId extends MapId>(
  mapId: TMapId,
  url: string
): MapBackgroundAsset {
  return Object.freeze({
    textureKey: `map-background-${mapId}-v1`,
    url,
    ...MAP_COLLISION_PALETTES[mapId]
  });
}
