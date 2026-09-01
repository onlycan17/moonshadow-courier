import Phaser from 'phaser';
import { BootScene } from './scenes/Boot';
import { CharacterCreateScene } from './scenes/CharacterCreate';
import { CharacterSelectScene } from './scenes/CharacterSelect';
import { GameplayScene } from './scenes/Gameplay';
import { IntroScene } from './scenes/Intro';
import { LoginScene } from './scenes/Login';
import { getGameStageId } from './ui/dom-overlay';

export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;
export const GAME_GRAVITY_Y = 1250;
export const GAME_PIXEL_ART = true;
export const GAME_SCENE_KEYS = ['Boot', 'Intro', 'Login', 'CharacterCreate', 'CharacterSelect', 'Gameplay'] as const;

export const GAME_CONFIG: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: getGameStageId(),
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#11131a',
  pixelArt: GAME_PIXEL_ART,
  roundPixels: true,
  physics: {
    default: 'arcade',
    arcade: {
      fixedStep: true,
      gravity: { x: 0, y: GAME_GRAVITY_Y }
    }
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_WIDTH,
    height: GAME_HEIGHT
  },
  scene: [BootScene, IntroScene, LoginScene, CharacterCreateScene, CharacterSelectScene, GameplayScene]
};
