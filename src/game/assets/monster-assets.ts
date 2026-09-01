import type Phaser from 'phaser';
import type { MonsterId } from '../data/monster-catalog';
import abyssGolemUrl from './monsters/abyss-golem-tripo-v1.webp?url';
import coralMangroveUrl from './monsters/coral-mangrove-tripo-v1.webp?url';
import crystalWolfUrl from './monsters/crystal-wolf-tripo-v1.webp?url';
import emberZombieUrl from './monsters/ember-zombie-tripo-v1.webp?url';
import forgottenZombieUrl from './monsters/forgotten-zombie-tripo-v1.webp?url';
import greenMushroomUrl from './monsters/green-mushroom-tripo-v1.webp?url';
import ignikarUrl from './monsters/ignikar-tripo-v1.webp?url';
import lunasionUrl from './monsters/lunasion-tripo-v1.webp?url';
import moonlightWolfUrl from './monsters/moonlight-wolf-tripo-v1.webp?url';
import onePunchGuardianUrl from './monsters/one-punch-guardian-tripo-v1.webp?url';
import shadowSentinelUrl from './monsters/shadow-sentinel-tripo-v1.webp?url';

export interface MonsterVisualAsset {
  textureKey: string;
  url: string;
  displayScale: number;
}

const MONSTER_VISUALS: Readonly<Record<MonsterId, MonsterVisualAsset>> = Object.freeze({
  'green-mushroom': { textureKey: 'monster-green-mushroom-tripo-v1', url: greenMushroomUrl, displayScale: 1.28 },
  'shadow-sentinel': { textureKey: 'monster-shadow-sentinel-tripo-v1', url: shadowSentinelUrl, displayScale: 1.32 },
  'crystal-wolf': { textureKey: 'monster-crystal-wolf-tripo-v1', url: crystalWolfUrl, displayScale: 1.42 },
  'forgotten-zombie': { textureKey: 'monster-forgotten-zombie-tripo-v1', url: forgottenZombieUrl, displayScale: 1.38 },
  'abyss-golem': { textureKey: 'monster-abyss-golem-tripo-v1', url: abyssGolemUrl, displayScale: 1.46 },
  'coral-mangrove': { textureKey: 'monster-coral-mangrove-tripo-v1', url: coralMangroveUrl, displayScale: 1.45 },
  'ember-zombie': { textureKey: 'monster-ember-zombie-tripo-v1', url: emberZombieUrl, displayScale: 1.42 },
  'moonlight-wolf': { textureKey: 'monster-moonlight-wolf-tripo-v1', url: moonlightWolfUrl, displayScale: 1.48 },
  ignikar: { textureKey: 'monster-ignikar-tripo-v1', url: ignikarUrl, displayScale: 1.45 },
  lunasion: { textureKey: 'monster-lunasion-tripo-v1', url: lunasionUrl, displayScale: 1.45 },
  'one-punch-guardian': { textureKey: 'monster-one-punch-guardian-tripo-v1', url: onePunchGuardianUrl, displayScale: 1.5 },
});

export function getMonsterVisualAsset(monsterId: MonsterId): MonsterVisualAsset {
  return MONSTER_VISUALS[monsterId];
}

export function preloadMonsterAssets(scene: Phaser.Scene): void {
  for (const asset of Object.values(MONSTER_VISUALS)) scene.load.image(asset.textureKey, asset.url);
}
