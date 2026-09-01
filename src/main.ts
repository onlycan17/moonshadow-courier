import Phaser from 'phaser';
import { GAME_CONFIG } from './game/config';
import { GAME_FULL_TITLE_KO } from './game/data/game-brand';
import { ensureGameShell } from './game/ui/dom-overlay';
import './styles.css';

function bootstrap(): Phaser.Game {
  document.title = GAME_FULL_TITLE_KO;
  document.body.dataset.gameTitle = GAME_FULL_TITLE_KO;
  ensureGameShell();
  return new Phaser.Game(GAME_CONFIG);
}

bootstrap();
