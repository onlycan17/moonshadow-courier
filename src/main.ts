import Phaser from 'phaser';
import { GAME_CONFIG } from './game/config';
import { ensureGameShell } from './game/ui/dom-overlay';
import './styles.css';

function bootstrap(): Phaser.Game {
  ensureGameShell();
  return new Phaser.Game(GAME_CONFIG);
}

bootstrap();
