import type Phaser from 'phaser';
import duaUrl from './pets/dua-tripo-v1.webp?url';

export const DUA_PET_ASSET = Object.freeze({
  textureKey: 'pet-dua-tripo-v1',
  url: duaUrl,
  displayWidth: 58,
  displayHeight: 58,
});

export function preloadPetAssets(scene: Phaser.Scene): void {
  scene.load.image(DUA_PET_ASSET.textureKey, DUA_PET_ASSET.url);
}
