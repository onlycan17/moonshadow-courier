import type Phaser from 'phaser';
import type { SkillId } from '../data/skill-catalog';
import abyssRainUrl from './skills/abyss-rain-icon-v1.webp?url';
import avengerUrl from './skills/avenger-icon-v1.webp?url';
import basicShurikenUrl from './skills/basic-shuriken-icon-v1.webp?url';
import criticalThrowUrl from './skills/critical-throw-icon-v1.webp?url';
import drainUrl from './skills/drain-icon-v1.webp?url';
import gumihoTransformationUrl from './skills/gumiho-transformation-icon-v1.webp?url';
import heavenlyThunderOrbUrl from './skills/heavenly-thunder-orb-icon-v1.webp?url';
import keenEyesightUrl from './skills/keen-eyesight-icon-v1.webp?url';
import luckySevenUrl from './skills/lucky-seven-icon-v1.webp?url';
import phantomDualStarUrl from './skills/phantom-dual-star-icon-v1.webp?url';
import rasenganUrl from './skills/rasengan-icon-v1.webp?url';
import sageModeUrl from './skills/sage-mode-icon-v1.webp?url';
import shadowBarrageUrl from './skills/shadow-barrage-icon-v1.webp?url';
import shadowBreathingUrl from './skills/shadow-breathing-icon-v1.webp?url';
import tripleStrikeSquadUrl from './skills/triple-strike-squad-icon-v1.webp?url';

export interface SkillIconAsset {
  textureKey: string;
  url: string;
}

export const SKILL_ICON_ASSETS: Readonly<Record<SkillId, SkillIconAsset>> = Object.freeze({
  'basic-shuriken': { textureKey: 'skill-basic-shuriken-icon-v1', url: basicShurikenUrl },
  'lucky-seven': { textureKey: 'skill-lucky-seven-icon-v1', url: luckySevenUrl },
  'shadow-barrage': { textureKey: 'skill-shadow-barrage-icon-v1', url: shadowBarrageUrl },
  drain: { textureKey: 'skill-drain-icon-v1', url: drainUrl },
  'phantom-dual-star': { textureKey: 'skill-phantom-dual-star-icon-v1', url: phantomDualStarUrl },
  avenger: { textureKey: 'skill-avenger-icon-v1', url: avengerUrl },
  'abyss-rain': { textureKey: 'skill-abyss-rain-icon-v1', url: abyssRainUrl },
  rasengan: { textureKey: 'skill-rasengan-icon-v1', url: rasenganUrl },
  'gumiho-transformation': { textureKey: 'skill-gumiho-transformation-icon-v1', url: gumihoTransformationUrl },
  'triple-strike-squad': { textureKey: 'skill-triple-strike-squad-icon-v1', url: tripleStrikeSquadUrl },
  'heavenly-thunder-orb': { textureKey: 'skill-heavenly-thunder-orb-icon-v1', url: heavenlyThunderOrbUrl },
  'keen-eyesight': { textureKey: 'skill-keen-eyesight-icon-v1', url: keenEyesightUrl },
  'critical-throw': { textureKey: 'skill-critical-throw-icon-v1', url: criticalThrowUrl },
  'shadow-breathing': { textureKey: 'skill-shadow-breathing-icon-v1', url: shadowBreathingUrl },
  'sage-mode': { textureKey: 'skill-sage-mode-icon-v1', url: sageModeUrl },
});

export function getSkillIconAsset(skillId: SkillId): SkillIconAsset {
  return SKILL_ICON_ASSETS[skillId];
}

export function preloadSkillIconAssets(scene: Phaser.Scene): void {
  for (const asset of Object.values(SKILL_ICON_ASSETS)) scene.load.image(asset.textureKey, asset.url);
}
