import Phaser from 'phaser';

const BACKGROUND_COLOR = 0x11131a;
const PANEL_STROKE_COLOR = 0x3f4760;
const PANEL_FILL_ALPHA = 0.9;
const PANEL_MARGIN = 96;

export function paintScene(scene: Phaser.Scene, title: string, subtitle: string): void {
  scene.cameras.main.setBackgroundColor(BACKGROUND_COLOR);
  const width = scene.scale.width;
  const height = scene.scale.height;

  scene.add
    .rectangle(width / 2, height / 2, width - PANEL_MARGIN, height - PANEL_MARGIN, 0x1b2030, PANEL_FILL_ALPHA)
    .setStrokeStyle(2, PANEL_STROKE_COLOR);

  scene.add.text(width / 2, 120, title, createTextStyle(40, '#f7f8fb')).setOrigin(0.5);
  scene.add.text(width / 2, 176, subtitle, createTextStyle(18, '#aab4d6')).setOrigin(0.5);
}

export function createTextStyle(fontSize: number, color: string): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    color,
    fontFamily: 'sans-serif',
    fontSize: `${fontSize}px`
  };
}
