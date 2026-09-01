import Phaser from 'phaser';
import type { RuntimeSkillId } from '../skills/skill-rules';
import { getSkillEffectDefinition, getSkillPresentationPlan } from './skill-effect-rules';

export function createSkillProjectileVisual(
  scene: Phaser.Scene,
  skillId: RuntimeSkillId,
  x: number,
  y: number,
  direction: -1 | 1
): Phaser.GameObjects.Container {
  const definition = requireEffectDefinition(skillId);
  const graphics = scene.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
  const size = definition.projectileSize;
  const presentation = getSkillPresentationPlan(skillId);

  drawTrail(graphics, size, definition.secondaryColor, direction);
  drawProjectileMotif(graphics, definition.motif, size, definition.primaryColor, definition.secondaryColor, definition.coreColor);

  const echoes: Phaser.GameObjects.Graphics[] = [];
  for (let index = (presentation?.echoCount ?? 0) - 1; index >= 0; index -= 1) {
    const echo = scene.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    drawProjectileMotif(echo, definition.motif, size, definition.primaryColor, definition.secondaryColor, definition.coreColor);
    echo
      .setAlpha(0.08 + index * 0.06)
      .setPosition(-direction * size * (1.4 + index * 0.9), index % 2 === 0 ? -size * 0.2 : size * 0.2)
      .setScale(0.52 + index * 0.12);
    echoes.push(echo);
  }

  return scene.add.container(x, y, [...echoes, graphics]).setDepth(9).setScale(skillId === 'tailed-beast-orb' ? 0.56 : 0.78);
}

export function createSkillCastVisual(
  scene: Phaser.Scene,
  skillId: RuntimeSkillId,
  x: number,
  y: number,
  direction: -1 | 1
): Phaser.GameObjects.Container {
  const definition = requireEffectDefinition(skillId);
  const graphics = scene.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
  const { motif, primaryColor, secondaryColor, coreColor } = definition;

  graphics.lineStyle(3, secondaryColor, 0.78);
  graphics.strokeCircle(0, -42, motif === 'fox-aura' ? 38 : 27);
  graphics.lineStyle(1, primaryColor, 0.58);
  graphics.strokeCircle(0, -42, motif === 'fox-aura' ? 52 : 37);

  if (motif === 'fox-aura') drawFoxAura(graphics, primaryColor, secondaryColor, coreColor);
  else if (motif === 'shadow-squad') drawShadowSquad(graphics, primaryColor, secondaryColor, direction);
  else if (motif === 'abyss-rain') drawRainGate(graphics, primaryColor, secondaryColor);
  else if (motif === 'thunder-orb') drawThunderSigil(graphics, primaryColor, secondaryColor, 42);
  else if (motif === 'spiral-orb') drawSpiral(graphics, 0, -42, 31, primaryColor, secondaryColor);
  else if (motif === 'tailed-beast-orb') drawTailedBeastHalo(graphics, primaryColor, secondaryColor);
  else drawCastSparks(graphics, primaryColor, secondaryColor);

  return scene.add.container(x, y, [graphics]).setDepth(8).setScale(0.62);
}

export function createSkillImpactVisual(
  scene: Phaser.Scene,
  skillId: RuntimeSkillId,
  x: number,
  y: number
): Phaser.GameObjects.Container {
  const definition = requireEffectDefinition(skillId);
  const graphics = scene.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
  const radius = Math.max(18, definition.projectileSize * definition.impactScale);

  graphics.fillStyle(definition.secondaryColor, 0.18);
  graphics.fillCircle(0, 0, radius * 0.72);
  graphics.lineStyle(4, definition.primaryColor, 0.88);
  graphics.strokeCircle(0, 0, radius * 0.72);
  graphics.lineStyle(2, definition.coreColor, 0.78);
  graphics.strokeCircle(0, 0, radius * 0.38);
  drawRadialBurst(graphics, radius, definition.primaryColor, definition.secondaryColor);

  if (definition.motif === 'life-vortex') drawSpiral(graphics, 0, 0, radius * 0.66, definition.primaryColor, definition.secondaryColor);
  if (definition.motif === 'thunder-orb') drawLightningBolts(graphics, radius, definition.primaryColor);
  if (definition.motif === 'abyss-rain') drawImpactSpears(graphics, radius, definition.primaryColor);

  return scene.add.container(x, y, [graphics]).setDepth(11).setScale(0.42);
}

export function createSkillScreenAccentVisual(
  scene: Phaser.Scene,
  skillId: RuntimeSkillId,
  viewWidth: number,
  playfieldHeight: number
): Phaser.GameObjects.Container | null {
  const definition = getSkillEffectDefinition(skillId);
  const presentation = getSkillPresentationPlan(skillId);
  if (definition === null || presentation === null) return null;

  const graphics = scene.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
  const radius = Math.min(viewWidth, playfieldHeight) * 0.42;
  graphics.fillStyle(definition.secondaryColor, presentation.screenAccentAlpha * 0.42);
  graphics.fillRect(-viewWidth / 2, -playfieldHeight / 2, viewWidth, playfieldHeight);

  switch (definition.motif) {
    case 'avenger-star':
      drawScreenSlashes(graphics, viewWidth, playfieldHeight, definition.primaryColor, definition.secondaryColor);
      drawRadialBurst(graphics, radius, definition.primaryColor, definition.secondaryColor);
      break;
    case 'abyss-rain':
      drawScreenRain(graphics, viewWidth, playfieldHeight, definition.primaryColor, definition.secondaryColor);
      break;
    case 'spiral-orb':
      drawSpiral(graphics, 0, 0, radius, definition.primaryColor, definition.secondaryColor);
      drawSpiral(graphics, -viewWidth * 0.18, playfieldHeight * 0.08, radius * 0.58, definition.secondaryColor, definition.coreColor);
      break;
    case 'fox-aura':
      drawScreenTails(graphics, radius, definition.primaryColor, definition.secondaryColor);
      break;
    case 'tailed-beast-orb':
      drawTailedBeastHalo(graphics, definition.primaryColor, definition.secondaryColor);
      graphics.lineStyle(12, definition.primaryColor, 0.26);
      graphics.strokeCircle(0, 0, radius);
      drawRadialBurst(graphics, radius * 1.18, definition.primaryColor, definition.secondaryColor);
      break;
    case 'shadow-squad':
      drawScreenSquad(graphics, viewWidth, playfieldHeight, definition.primaryColor, definition.secondaryColor);
      break;
    case 'thunder-orb':
      graphics.lineStyle(10, definition.primaryColor, 0.34);
      graphics.strokeCircle(0, 0, radius * 0.78);
      drawLightningBolts(graphics, radius * 1.15, definition.primaryColor);
      drawRadialBurst(graphics, radius, definition.coreColor, definition.secondaryColor);
      break;
    default:
      return null;
  }

  return scene.add
    .container(viewWidth / 2, playfieldHeight / 2, [graphics])
    .setName('skill-screen-accent')
    .setScrollFactor(0)
    .setDepth(7)
    .setScale(0.76);
}

function drawProjectileMotif(
  graphics: Phaser.GameObjects.Graphics,
  motif: ReturnType<typeof requireEffectDefinition>['motif'],
  size: number,
  primary: number,
  secondary: number,
  core: number
): void {
  switch (motif) {
    case 'silver-shuriken':
    case 'twin-star':
      drawFourPointStar(graphics, size, primary, secondary, core);
      break;
    case 'shadow-volley':
      drawShadowDart(graphics, size, primary, secondary, core);
      break;
    case 'life-vortex':
      drawVortexOrb(graphics, size, primary, secondary, core);
      break;
    case 'phantom-cross':
      drawPhantomCross(graphics, size, primary, secondary, core);
      break;
    case 'avenger-star':
      drawAvengerStar(graphics, size, primary, secondary, core);
      break;
    case 'abyss-rain':
      drawAbyssSpear(graphics, size, primary, secondary, core);
      break;
    case 'spiral-orb':
      drawSpiralOrb(graphics, size, primary, secondary, core);
      break;
    case 'tailed-beast-orb':
      drawTailedBeastOrb(graphics, size, primary, secondary, core);
      break;
    case 'shadow-squad':
      drawSquadCrescent(graphics, size, primary, secondary, core);
      break;
    case 'thunder-orb':
      drawThunderOrb(graphics, size, primary, secondary, core);
      break;
    case 'fox-aura':
      break;
  }
}

function drawTrail(graphics: Phaser.GameObjects.Graphics, size: number, color: number, direction: -1 | 1): void {
  const tail = -direction;
  graphics.lineStyle(Math.max(2, size * 0.24), color, 0.22);
  graphics.beginPath();
  graphics.moveTo(tail * size * 0.35, -size * 0.32);
  graphics.lineTo(tail * size * 2.8, -size * 0.56);
  graphics.moveTo(tail * size * 0.35, size * 0.32);
  graphics.lineTo(tail * size * 2.2, size * 0.58);
  graphics.strokePath();
}

function drawFourPointStar(graphics: Phaser.GameObjects.Graphics, size: number, primary: number, secondary: number, core: number): void {
  graphics.fillStyle(secondary, 0.34);
  graphics.fillCircle(0, 0, size * 1.25);
  graphics.fillStyle(primary, 1);
  graphics.fillTriangle(0, 0, 0, -size, size * 0.36, -size * 0.26);
  graphics.fillTriangle(0, 0, size, 0, size * 0.26, size * 0.36);
  graphics.fillTriangle(0, 0, 0, size, -size * 0.36, size * 0.26);
  graphics.fillTriangle(0, 0, -size, 0, -size * 0.26, -size * 0.36);
  graphics.fillStyle(core, 1);
  graphics.fillCircle(0, 0, Math.max(2, size * 0.22));
}

function drawShadowDart(graphics: Phaser.GameObjects.Graphics, size: number, primary: number, secondary: number, core: number): void {
  graphics.fillStyle(secondary, 0.5);
  graphics.fillTriangle(-size * 1.2, -size * 0.48, size, 0, -size * 1.2, size * 0.48);
  graphics.fillStyle(primary, 0.95);
  graphics.fillTriangle(-size * 0.65, -size * 0.26, size * 1.25, 0, -size * 0.65, size * 0.26);
  graphics.fillStyle(core, 0.9);
  graphics.fillCircle(size * 0.2, 0, size * 0.18);
}

function drawVortexOrb(graphics: Phaser.GameObjects.Graphics, size: number, primary: number, secondary: number, core: number): void {
  graphics.fillStyle(secondary, 0.28);
  graphics.fillCircle(0, 0, size * 1.28);
  graphics.fillStyle(core, 1);
  graphics.fillCircle(0, 0, size * 0.7);
  drawSpiral(graphics, 0, 0, size, primary, secondary);
}

function drawPhantomCross(graphics: Phaser.GameObjects.Graphics, size: number, primary: number, secondary: number, core: number): void {
  graphics.lineStyle(size * 0.48, secondary, 0.52);
  graphics.beginPath();
  graphics.moveTo(-size, -size);
  graphics.lineTo(size, size);
  graphics.moveTo(-size, size);
  graphics.lineTo(size, -size);
  graphics.strokePath();
  graphics.lineStyle(size * 0.2, primary, 1);
  graphics.strokeCircle(0, 0, size * 0.78);
  graphics.fillStyle(core, 1);
  graphics.fillCircle(0, 0, size * 0.22);
}

function drawAvengerStar(graphics: Phaser.GameObjects.Graphics, size: number, primary: number, secondary: number, core: number): void {
  graphics.lineStyle(4, secondary, 0.56);
  graphics.strokeCircle(0, 0, size * 1.12);
  drawFourPointStar(graphics, size, primary, secondary, core);
  drawLightningBolts(graphics, size * 1.28, secondary);
}

function drawAbyssSpear(graphics: Phaser.GameObjects.Graphics, size: number, primary: number, secondary: number, core: number): void {
  graphics.fillStyle(secondary, 0.45);
  graphics.fillTriangle(-size * 0.44, -size * 1.5, size * 0.44, -size * 1.5, 0, size * 1.2);
  graphics.fillStyle(primary, 0.96);
  graphics.fillTriangle(-size * 0.18, -size * 1.35, size * 0.18, -size * 1.35, 0, size * 0.8);
  graphics.fillStyle(core, 1);
  graphics.fillCircle(0, -size * 0.78, size * 0.14);
}

function drawSpiralOrb(graphics: Phaser.GameObjects.Graphics, size: number, primary: number, secondary: number, core: number): void {
  graphics.fillStyle(secondary, 0.36);
  graphics.fillCircle(0, 0, size * 1.14);
  graphics.fillStyle(core, 0.86);
  graphics.fillCircle(0, 0, size * 0.38);
  drawSpiral(graphics, 0, 0, size, primary, secondary);
  graphics.lineStyle(2, core, 0.88);
  graphics.strokeCircle(0, 0, size * 0.72);
}

function drawTailedBeastOrb(graphics: Phaser.GameObjects.Graphics, size: number, primary: number, secondary: number, core: number): void {
  graphics.fillStyle(primary, 0.2);
  graphics.fillCircle(0, 0, size * 1.35);
  graphics.lineStyle(5, primary, 0.72);
  graphics.strokeCircle(0, 0, size * 1.05);
  graphics.fillStyle(secondary, 1);
  graphics.fillCircle(0, 0, size * 0.9);
  graphics.fillStyle(core, 1);
  graphics.fillCircle(0, 0, size * 0.58);
  drawRadialBurst(graphics, size * 1.42, primary, secondary);
}

function drawSquadCrescent(graphics: Phaser.GameObjects.Graphics, size: number, primary: number, secondary: number, core: number): void {
  graphics.lineStyle(8, secondary, 0.4);
  graphics.beginPath();
  graphics.arc(0, 0, size, -1.2, 1.2, false);
  graphics.strokePath();
  graphics.lineStyle(4, primary, 1);
  graphics.beginPath();
  graphics.arc(0, 0, size * 0.78, -1.24, 1.24, false);
  graphics.strokePath();
  graphics.fillStyle(core, 0.92);
  graphics.fillTriangle(-size * 0.2, -size * 0.32, size * 1.12, 0, -size * 0.2, size * 0.32);
}

function drawThunderOrb(graphics: Phaser.GameObjects.Graphics, size: number, primary: number, secondary: number, core: number): void {
  graphics.fillStyle(secondary, 0.28);
  graphics.fillCircle(0, 0, size * 1.32);
  graphics.fillStyle(primary, 0.84);
  graphics.fillCircle(0, 0, size * 0.92);
  graphics.fillStyle(core, 1);
  graphics.fillCircle(0, 0, size * 0.38);
  drawLightningBolts(graphics, size * 1.52, primary);
}

function drawFoxAura(graphics: Phaser.GameObjects.Graphics, primary: number, secondary: number, core: number): void {
  for (let index = 0; index < 7; index += 1) {
    const angle = -2.8 + index * 0.48;
    const tailX = Math.cos(angle) * 60;
    const tailY = -42 + Math.sin(angle) * 52;
    graphics.lineStyle(7, index % 2 === 0 ? primary : secondary, 0.46);
    graphics.beginPath();
    graphics.moveTo(0, -30);
    graphics.lineTo(tailX * 0.58, tailY * 0.72);
    graphics.lineTo(tailX, tailY);
    graphics.strokePath();
  }
  graphics.fillStyle(core, 0.86);
  graphics.fillTriangle(-13, -54, 0, -72, 13, -54);
  graphics.fillTriangle(-13, -54, -20, -68, -4, -59);
  graphics.fillTriangle(13, -54, 20, -68, 4, -59);
}

function drawShadowSquad(graphics: Phaser.GameObjects.Graphics, primary: number, secondary: number, direction: -1 | 1): void {
  for (const [index, offsetX] of [-52, 0, 52].entries()) {
    const color = index === 1 ? primary : secondary;
    graphics.fillStyle(color, index === 1 ? 0.72 : 0.42);
    graphics.fillCircle(offsetX, -62, 8);
    graphics.fillTriangle(offsetX - 11, -50, offsetX + 11, -50, offsetX + direction * 22, -8);
    graphics.lineStyle(5, color, 0.72);
    graphics.beginPath();
    graphics.moveTo(offsetX, -38);
    graphics.lineTo(offsetX + direction * 42, -60 + index * 10);
    graphics.strokePath();
  }
}

function drawRainGate(graphics: Phaser.GameObjects.Graphics, primary: number, secondary: number): void {
  graphics.lineStyle(5, secondary, 0.72);
  graphics.strokeEllipse(0, -104, 118, 30);
  graphics.lineStyle(2, primary, 0.88);
  graphics.strokeEllipse(0, -104, 82, 18);
  for (let index = -3; index <= 3; index += 1) {
    graphics.lineStyle(index % 2 === 0 ? 3 : 2, index % 2 === 0 ? primary : secondary, 0.62);
    graphics.beginPath();
    graphics.moveTo(index * 16, -92);
    graphics.lineTo(index * 20, -48 + Math.abs(index) * 7);
    graphics.strokePath();
  }
}

function drawThunderSigil(graphics: Phaser.GameObjects.Graphics, primary: number, secondary: number, radius: number): void {
  graphics.lineStyle(3, primary, 0.82);
  graphics.strokeCircle(0, -42, radius);
  graphics.lineStyle(2, secondary, 0.72);
  graphics.strokeCircle(0, -42, radius * 0.62);
  drawLightningBolts(graphics, radius * 1.4, primary, -42);
}

function drawTailedBeastHalo(graphics: Phaser.GameObjects.Graphics, primary: number, secondary: number): void {
  graphics.lineStyle(5, secondary, 0.58);
  graphics.strokeCircle(0, -42, 46);
  drawRadialBurst(graphics, 62, primary, secondary, -42);
}

function drawCastSparks(graphics: Phaser.GameObjects.Graphics, primary: number, secondary: number): void {
  drawRadialBurst(graphics, 48, primary, secondary, -42);
}

function drawSpiral(graphics: Phaser.GameObjects.Graphics, x: number, y: number, radius: number, primary: number, secondary: number): void {
  for (let ring = 0; ring < 3; ring += 1) {
    graphics.lineStyle(Math.max(2, radius * 0.12), ring % 2 === 0 ? primary : secondary, 0.76 - ring * 0.12);
    graphics.beginPath();
    graphics.arc(x, y, radius * (0.42 + ring * 0.24), -2.45 + ring * 0.7, 1.15 + ring * 0.7, false);
    graphics.strokePath();
  }
}

function drawRadialBurst(graphics: Phaser.GameObjects.Graphics, radius: number, primary: number, secondary: number, y = 0): void {
  for (let index = 0; index < 8; index += 1) {
    const angle = index * Math.PI / 4;
    const inner = radius * 0.58;
    const outer = radius * (index % 2 === 0 ? 1 : 0.82);
    graphics.lineStyle(index % 2 === 0 ? 3 : 2, index % 2 === 0 ? primary : secondary, 0.74);
    graphics.beginPath();
    graphics.moveTo(Math.cos(angle) * inner, y + Math.sin(angle) * inner);
    graphics.lineTo(Math.cos(angle) * outer, y + Math.sin(angle) * outer);
    graphics.strokePath();
  }
}

function drawLightningBolts(graphics: Phaser.GameObjects.Graphics, radius: number, color: number, y = 0): void {
  graphics.lineStyle(3, color, 0.92);
  for (let index = 0; index < 4; index += 1) {
    const angle = index * Math.PI / 2;
    const x1 = Math.cos(angle) * radius * 0.58;
    const y1 = y + Math.sin(angle) * radius * 0.58;
    const x2 = Math.cos(angle + 0.22) * radius * 0.84;
    const y2 = y + Math.sin(angle + 0.22) * radius * 0.84;
    const x3 = Math.cos(angle) * radius * 1.14;
    const y3 = y + Math.sin(angle) * radius * 1.14;
    graphics.beginPath();
    graphics.moveTo(x1, y1);
    graphics.lineTo(x2, y2);
    graphics.lineTo(x3, y3);
    graphics.strokePath();
  }
}

function drawImpactSpears(graphics: Phaser.GameObjects.Graphics, radius: number, color: number): void {
  graphics.lineStyle(3, color, 0.82);
  for (let index = -2; index <= 2; index += 1) {
    graphics.beginPath();
    graphics.moveTo(index * radius * 0.24, -radius);
    graphics.lineTo(index * radius * 0.32, radius * 0.72);
    graphics.strokePath();
  }
}

function drawScreenSlashes(graphics: Phaser.GameObjects.Graphics, width: number, height: number, primary: number, secondary: number): void {
  for (let index = -2; index <= 2; index += 1) {
    graphics.lineStyle(index === 0 ? 18 : 9, index % 2 === 0 ? primary : secondary, index === 0 ? 0.34 : 0.2);
    graphics.beginPath();
    graphics.moveTo(-width * 0.46, height * (index * 0.08 - 0.18));
    graphics.lineTo(width * 0.46, height * (index * 0.08 + 0.18));
    graphics.strokePath();
  }
}

function drawScreenRain(graphics: Phaser.GameObjects.Graphics, width: number, height: number, primary: number, secondary: number): void {
  graphics.lineStyle(7, secondary, 0.3);
  graphics.strokeEllipse(0, -height * 0.35, width * 0.72, height * 0.18);
  graphics.lineStyle(3, primary, 0.42);
  graphics.strokeEllipse(0, -height * 0.35, width * 0.48, height * 0.1);
  for (let index = -8; index <= 8; index += 1) {
    const x = index * width / 18;
    graphics.lineStyle(index % 3 === 0 ? 6 : 3, index % 2 === 0 ? primary : secondary, 0.18 + Math.abs(index % 3) * 0.06);
    graphics.beginPath();
    graphics.moveTo(x, -height * 0.42 + Math.abs(index % 4) * 18);
    graphics.lineTo(x + width * 0.06, height * 0.46);
    graphics.strokePath();
  }
}

function drawScreenTails(graphics: Phaser.GameObjects.Graphics, radius: number, primary: number, secondary: number): void {
  for (let index = 0; index < 7; index += 1) {
    const tailRadius = radius * (0.56 + index * 0.08);
    const start = -2.85 + index * 0.38;
    graphics.lineStyle(10 - index * 0.7, index % 2 === 0 ? primary : secondary, 0.18 + index * 0.025);
    graphics.beginPath();
    graphics.arc(0, radius * 0.16, tailRadius, start, start + 1.75, false);
    graphics.strokePath();
  }
}

function drawScreenSquad(graphics: Phaser.GameObjects.Graphics, width: number, height: number, primary: number, secondary: number): void {
  for (const [index, x] of [-width * 0.28, 0, width * 0.28].entries()) {
    const color = index === 1 ? primary : secondary;
    graphics.fillStyle(color, index === 1 ? 0.22 : 0.13);
    graphics.fillCircle(x, -height * 0.2, 26);
    graphics.fillTriangle(x - 34, -height * 0.12, x + 34, -height * 0.12, x + (index - 1) * 50, height * 0.3);
    graphics.lineStyle(index === 1 ? 15 : 10, color, 0.24);
    graphics.beginPath();
    graphics.moveTo(x - width * 0.18, height * 0.22);
    graphics.lineTo(x + width * 0.2, -height * 0.18 + index * 32);
    graphics.strokePath();
  }
}

function requireEffectDefinition(skillId: RuntimeSkillId) {
  const definition = getSkillEffectDefinition(skillId);
  if (definition === null) throw new Error(`스킬 이펙트 정의가 없습니다: ${skillId}`);
  return definition;
}
