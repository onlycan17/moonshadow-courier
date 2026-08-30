import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  public constructor() {
    super('Boot');
  }

  public create(): void {
    this.scene.start('Login');
  }
}
