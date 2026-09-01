import Phaser from 'phaser';
import { preloadMapAssets } from '../assets/map-assets';

export class BootScene extends Phaser.Scene {
  public constructor() {
    super('Boot');
  }

  public preload(): void {
    preloadMapAssets(this);
  }

  public create(): void {
    this.scene.start('Intro');
  }
}
