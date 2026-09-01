import type Phaser from 'phaser';
import shadowCourierSheetUrl from './characters/shadow-courier-sheet-v1.webp?url';
import portalArchUrl from './maps/portal-arch-tripo.webp?url';
import { PLAYER_FRAME_SIZE, PLAYER_TEXTURE_KEY } from './character-assets';
import { MAP_BACKGROUND_ASSETS } from './map-background-assets';
import { PORTAL_TEXTURE_KEY } from './portal-visual';
import { preloadMonsterAssets } from './monster-assets';
import { preloadPetAssets } from './pet-assets';
import { preloadSkillIconAssets } from './skill-icon-assets';

export function preloadMapAssets(scene: Phaser.Scene): void {
  preloadMonsterAssets(scene);
  preloadPetAssets(scene);
  preloadSkillIconAssets(scene);
  scene.load.image(PORTAL_TEXTURE_KEY, portalArchUrl);
  for (const background of Object.values(MAP_BACKGROUND_ASSETS)) {
    scene.load.image(background.textureKey, background.url);
  }
  scene.load.spritesheet(PLAYER_TEXTURE_KEY, shadowCourierSheetUrl, {
    frameWidth: PLAYER_FRAME_SIZE,
    frameHeight: PLAYER_FRAME_SIZE
  });
}
