import Phaser from "phaser";
import { PLAYER_TEXTURE_KEY } from "../assets/character-assets";
import { getMapBackgroundAsset } from "../assets/map-background-assets";
import { calculateAttackDamage, isDeterministicCritical } from '../combat/combat-rules';
import { getMonster, getMonsterSpawns, type MonsterDefinition, type MonsterSpawn } from '../data/monster-catalog';
import { SKILL_LABELS_KO, type SkillId } from '../data/skill-catalog';
import {
  PORTAL_TEXTURE_KEY,
  createPortalVisualLayout,
} from "../assets/portal-visual";
import {
  HUD_HEIGHT,
  HUD_TOP,
  VIEW_WIDTH,
  resolveCameraScroll,
  resolveWorldBackgroundLayout,
} from "../entities/camera-rules";
import { Player, type PlayerIntent } from "../entities/player";
import {
  createGameplayInput,
  type GameplayInput,
  type GameplayIntent,
} from "../input/focus-safe-keys";
import { getMap, MAP_DEFS, MAP_LABELS_KO } from "../maps/map-registry";
import { canUsePortal, isPortalVisible, resolveSpawn } from "../maps/map-rules";
import {
  PLATFORM_THICKNESS,
  type MapDef,
  type MapId,
  type PlatformDef,
  type PortalDef,
} from "../maps/types";
import {
  getPosition,
  type ProfileRepository,
} from "../profile/profile-repository";
import type { SlotNumber, StoredCharacterV2 } from "../profile/types";
import { addExperience, getRequiredExperience } from '../progression/progression-rules';
import { getSkillDefinition, resolveSkillUse, type RuntimeSkillId } from '../skills/skill-rules';
import { createDefaultSkillShortcuts, setAdditionalSkill, swapActionSlots, type AdditionalSkillKey } from '../skills/skill-shortcut-rules';
import { getEquippedWeaponMultiplier, purchaseItem, purchaseShuriken, useConsumable, type ItemId, type ShurikenId } from '../inventory/economy-rules';
import { loadRuntimeProfileExtension, saveRuntimeProfileExtension, type RuntimeProfileExtension } from '../profile/extended-profile-store';
import { acceptJobExam, getJobExamTarget, recordJobExamKill, reportJobExam } from '../quests/quest-rules';
import { focusGameCanvas } from "../ui/dom-overlay";
import { openGameplayPanel, type GameplayPanelKind } from '../ui/gameplay-menus';
import { openEndingCredits } from '../ui/ending-credits';
import { ProceduralGameAudio } from '../audio/procedural-audio';
import { resolveMusicMode } from '../audio/music-rules';
import { getMonsterVisualAsset } from '../assets/monster-assets';
import { DUA_PET_ASSET } from '../assets/pet-assets';
import { getSkillIconAsset } from '../assets/skill-icon-assets';
import { chooseNearestPetDrop, stepPetFollower, type PetFollowerState } from '../pets/pet-rules';
import { getSkillEffectDefinition, getSkillPresentationPlan, resolveSkillProjectileMotion } from '../effects/skill-effect-rules';
import { createSkillCastVisual, createSkillImpactVisual, createSkillProjectileVisual, createSkillScreenAccentVisual } from '../effects/skill-effect-visual';
import {
  clearGameplayDataset,
  GAMEPLAY_DATASET_KEYS,
  createProfileRepository,
  createTextStyle,
} from "./shared";

const BACKGROUND_COLOR = 0x101522;
const MAP_SURFACE_COLOR = 0x2f6d54;
const PORTAL_FRAME_COLOR = 0x79b8ff;
const PORTAL_FILL_COLOR = 0x203c72;
const PORTAL_ENERGY_COLOR = 0x48d8ff;
const PORTAL_RING_HEIGHT = 16;
const PORTAL_SHARD_OFFSETS = [-16, 16] as const;
const FEEDBACK_DURATION_MS = 1500;
const POSITION_SAVE_INTERVAL_MS = 500;
const RUNTIME_STATS_REFRESH_INTERVAL_MS = 250;
const ONE_WAY_LANDING_TOLERANCE = 12;
const CRITICAL_COLOR = '#ffe66d';
const DAMAGE_COLOR = '#ffffff';
const DROP_LIFETIME_MS = 12_000;
const DROP_COLLECT_RANGE = 260;
const PLAYER_INVULNERABILITY_MS = 950;

interface GameplaySceneData {
  mapId?: MapId;
  spawnPortalId?: string;
}

interface PortalRuntime {
  definition: PortalDef;
  object: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
}

interface EnemyRuntime {
  spawn: MonsterSpawn;
  definition: MonsterDefinition;
  body: Phaser.GameObjects.Rectangle | Phaser.GameObjects.Image;
  label: Phaser.GameObjects.Text;
  hpBack: Phaser.GameObjects.Rectangle;
  hpFill: Phaser.GameObjects.Rectangle;
  hp: number;
  alive: boolean;
  direction: -1 | 1;
  respawnAtMs: number;
  nextAttackAtMs: number;
}

interface CombatProjectileRuntime {
  object: Phaser.GameObjects.Container;
  tween: Phaser.Tweens.Tween;
  skillId: RuntimeSkillId;
  baseDamage: number;
  skillLevel: number;
  usesWeapon: boolean;
  maxTargets: number;
  hitEnemyIds: Set<string>;
  sequence: number;
}

interface DropRuntime {
  id: string;
  object: Phaser.GameObjects.Arc;
  label: Phaser.GameObjects.Text;
  mesos: number;
  expiresAtMs: number;
  landedAtMs: number;
}

interface PetRuntime {
  object: Phaser.GameObjects.Image;
  label: Phaser.GameObjects.Text;
  state: PetFollowerState;
}

interface BossProjectileRuntime {
  object: Phaser.GameObjects.Arc;
  tween: Phaser.Tweens.Tween;
}

interface MapRuntime {
  objects: Phaser.GameObjects.GameObject[];
  colliders: Phaser.Physics.Arcade.Collider[];
  timers: Phaser.Time.TimerEvent[];
  tweens: Phaser.Tweens.Tween[];
  portalRuntimes: PortalRuntime[];
  enemies: EnemyRuntime[];
  projectiles: CombatProjectileRuntime[];
  drops: DropRuntime[];
  bossProjectiles: BossProjectileRuntime[];
  pet: PetRuntime | null;
}

export class GameplayScene extends Phaser.Scene {
  private repository: ProfileRepository | null = null;

  private activeSlot: SlotNumber | null = null;

  private character: StoredCharacterV2 | null = null;

  private currentMap: MapDef | null = null;

  private player: Player | null = null;

  private gameplayInput: GameplayInput | null = null;

  private latestIntent: GameplayIntent = createNeutralGameplayIntent();

  private mapRuntime: MapRuntime | null = null;

  private feedbackText: Phaser.GameObjects.Text | null = null;

  private mapTitleText: Phaser.GameObjects.Text | null = null;

  private inputLocked = false;

  private feedbackDeadlineMs = 0;

  private lastSavedPositionKey = "";

  private lastStatsRefreshMs = -RUNTIME_STATS_REFRESH_INTERVAL_MS;

  private statsSignature = "";

  private skillReadyAtMs = 0;

  private transformed = false;

  private lastTransformationDrainMs = 0;

  private playerInvulnerableUntilMs = 0;

  private attackSequence = 0;

  private lastSkillEffect: RuntimeSkillId | null = null;

  private hudStatusText: Phaser.GameObjects.Text | null = null;

  private bossStatusText: Phaser.GameObjects.Text | null = null;

  private questStatusText: Phaser.GameObjects.Text | null = null;

  private minimapPlayerMarker: Phaser.GameObjects.Arc | null = null;

  private actionSlotLabels: Phaser.GameObjects.Text[] = [];

  private actionSlotIcons: Phaser.GameObjects.Image[] = [];

  private profileExtension: RuntimeProfileExtension | null = null;

  private overlayClose: (() => void) | null = null;

  private lastDamagedAtMs = -10_000;

  private lastRecoveryAtMs = 0;

  private readonly audio = new ProceduralGameAudio();

  public constructor() {
    super("Gameplay");
  }

  public create(data: GameplaySceneData = {}): void {
    this.cameras.main.setBackgroundColor(BACKGROUND_COLOR);
    this.repository = createProfileRepository();
    this.activeSlot = this.repository.getActiveSlot();

    if (this.activeSlot === null) {
      this.scene.start("CharacterCreate");
      return;
    }

    this.character = this.repository.loadCharacterV2(this.activeSlot);
    if (this.character === null) {
      this.scene.start("CharacterCreate");
      return;
    }
    this.profileExtension = loadRuntimeProfileExtension(this.activeSlot, this.character.mesos);
    this.audio.startMusic('exploration');

    this.gameplayInput = createGameplayInput(
      this,
      () => this.profileExtension?.shortcuts ?? createDefaultSkillShortcuts(),
    );
    this.feedbackText = this.add
      .text(24, 24, "", createTextStyle(18, "#ffd3d3"))
      .setDepth(20)
      .setScrollFactor(0);
    this.mapTitleText = this.add
      .text(24, 54, "", createTextStyle(18, "#dbe7ff"))
      .setDepth(20)
      .setScrollFactor(0);

    this.buildMapRuntime(data);
    this.installTextRenderer();
    this.registerLifecycleHooks();
    focusGameCanvas(this);
  }

  public update(time: number, delta: number): void {
    if (
      this.player === null ||
      this.currentMap === null ||
      this.gameplayInput === null
    ) {
      return;
    }

    this.latestIntent = this.gameplayInput.getIntent();
    this.handleMenuInput();
    this.player.update(time, delta);
    this.handleSkillInput(time);
    this.updateTransformation(time);
    this.updateNaturalRecovery(time);
    this.updateEnemies(time, delta);
    this.updatePet(time, delta);
    this.handleDropCollection();
    this.handlePortalInteraction();
    this.updateCamera();
    this.updateFeedback(time);
    this.updatePlayerCoordinates();
    this.refreshMapRuntimeStats(time);
    this.updateCombatHud();
  }

  private updatePlayerCoordinates(): void {
    if (this.player === null) {
      return;
    }

    const x = String(Math.round(this.player.x));
    const y = String(Math.round(this.player.y));
    const dataset = document.body.dataset;
    if (dataset[GAMEPLAY_DATASET_KEYS.playerX] !== x) {
      dataset[GAMEPLAY_DATASET_KEYS.playerX] = x;
    }

    if (dataset[GAMEPLAY_DATASET_KEYS.playerY] !== y) {
      dataset[GAMEPLAY_DATASET_KEYS.playerY] = y;
    }

    dataset[GAMEPLAY_DATASET_KEYS.playerState] = this.player.getState();
  }

  private buildMapRuntime(data: GameplaySceneData): void {
    this.destroyCurrentMapRuntime();

    const mapId = resolveSceneMapId(data.mapId, this.character?.mapId);
    const map = getMap(mapId);
    const spawn = this.resolveInitialSpawn(map, data.spawnPortalId);

    this.currentMap = map;
    this.inputLocked = false;
    this.lastSavedPositionKey = "";
    this.physics.world.setBounds(0, 0, map.width, map.height);

    const runtime: MapRuntime = {
      objects: [],
      colliders: [],
      timers: [],
      tweens: [],
      portalRuntimes: [],
      enemies: [],
      projectiles: [],
      drops: [],
      bossProjectiles: [],
      pet: null,
    };

    const backgroundAsset = getMapBackgroundAsset(map.id);
    const backgroundLayout = resolveWorldBackgroundLayout(map.width, map.height);
    const backdrop = this.add
      .image(backgroundLayout.x, backgroundLayout.y, backgroundAsset.textureKey)
      .setDisplaySize(backgroundLayout.width, backgroundLayout.height)
      .setScrollFactor(1)
      .setDepth(-10);
    runtime.objects.push(backdrop);

    const groundHeight = Math.max(PLATFORM_THICKNESS, map.height - map.groundY);
    const ground = this.add.rectangle(
      map.width / 2,
      map.groundY + groundHeight / 2,
      map.width,
      groundHeight,
      MAP_SURFACE_COLOR,
      1,
    );
    ground.setAlpha(0);
    runtime.objects.push(ground);
    this.physics.add.existing(ground, true);

    this.player = new Player(this, spawn.x, spawn.y, map, () =>
      this.getPlayerIntent(),
      (x, y, direction) => this.spawnBasicAttack(runtime, x, y, direction),
    );
    this.player.setDepth(4);
    runtime.objects.push(this.player);
    runtime.colliders.push(this.physics.add.collider(this.player, ground));
    if (this.profileExtension?.economy.petRegistered) this.createPetRuntime(runtime);

    for (const platform of map.platforms) {
      const platformObject = this.add.rectangle(
        platform.x + platform.width / 2,
        platform.y + PLATFORM_THICKNESS / 2,
        platform.width,
        PLATFORM_THICKNESS,
        backgroundAsset.platformFill,
        0.9,
      ).setStrokeStyle(2, backgroundAsset.platformStroke, 0.9);
      runtime.objects.push(platformObject);
      this.physics.add.existing(platformObject, true);

      const collider = platform.oneWay
        ? this.physics.add.collider(
            this.player,
            platformObject,
            undefined,
            () =>
              this.shouldCollideWithOneWayPlatform(platformObject, platform),
            this,
          )
        : this.physics.add.collider(this.player, platformObject);

      runtime.colliders.push(collider);
    }

    for (const rope of map.ropes) {
      runtime.objects.push(
        this.add.rectangle(
          rope.x,
          (rope.topY + rope.bottomY) / 2,
          4,
          rope.bottomY - rope.topY,
          backgroundAsset.ropeColor,
          1,
        ),
      );
    }
    if (map.id === 'endurance-forest') this.createEnduranceObstacles(runtime);

    for (const portal of map.portals) {
      if (!isPortalVisible(portal, toPortalExpeditionStage(this.profileExtension?.quests.expeditionStage ?? "none"))) {
        continue;
      }

      const portalObject = this.add
        .rectangle(
          portal.x + portal.width / 2,
          portal.y - portal.height / 2,
          portal.width,
          portal.height,
          PORTAL_FILL_COLOR,
          0,
        )
        .setInteractive({ cursor: "pointer" });
      this.physics.add.existing(portalObject, true);
      const layout = createPortalVisualLayout(portal);
      const energy = this.add
        .rectangle(
          layout.centerX,
          layout.centerY,
          layout.energyWidth,
          layout.energyHeight,
          PORTAL_ENERGY_COLOR,
          0.42,
        )
        .setDepth(1);
      const outerRing = this.add
        .ellipse(
          layout.centerX,
          layout.ringY,
          layout.outerRingWidth,
          PORTAL_RING_HEIGHT,
        )
        .setStrokeStyle(3, PORTAL_FRAME_COLOR, 0.82)
        .setDepth(1);
      const innerRing = this.add
        .ellipse(
          layout.centerX,
          layout.ringY,
          layout.innerRingWidth,
          PORTAL_RING_HEIGHT * 0.65,
        )
        .setStrokeStyle(2, PORTAL_ENERGY_COLOR, 0.92)
        .setDepth(1);
      const arch = this.add
        .image(layout.centerX, layout.archBottomY, PORTAL_TEXTURE_KEY)
        .setOrigin(0.5, 1)
        .setDisplaySize(layout.archSize, layout.archSize)
        .setDepth(2);
      const label = this.add
        .text(
          layout.centerX,
          layout.labelY,
          MAP_LABELS_KO[portal.targetMapId],
          createTextStyle(16, "#f4fbff"),
        )
        .setOrigin(0.5, 1)
        .setDepth(3);

      runtime.objects.push(portalObject, energy, outerRing, innerRing, arch, label);
      runtime.tweens.push(
        this.tweens.add({
          targets: energy,
          alpha: { from: 0.24, to: 0.66 },
          duration: 900,
          ease: "Sine.easeInOut",
          yoyo: true,
          repeat: -1,
        }),
        this.tweens.add({
          targets: outerRing,
          alpha: { from: 0.38, to: 0.92 },
          scaleX: { from: 0.92, to: 1.08 },
          duration: 1100,
          ease: "Sine.easeInOut",
          yoyo: true,
          repeat: -1,
        }),
        this.tweens.add({
          targets: innerRing,
          alpha: { from: 0.9, to: 0.32 },
          scaleX: { from: 1.08, to: 0.94 },
          duration: 1100,
          ease: "Sine.easeInOut",
          yoyo: true,
          repeat: -1,
        }),
      );

      for (const [index, offsetX] of PORTAL_SHARD_OFFSETS.entries()) {
        const shard = this.add
          .rectangle(
            layout.centerX + offsetX,
            layout.ringY - 8,
            4,
            8,
            PORTAL_ENERGY_COLOR,
            0.86,
          )
          .setAngle(45)
          .setDepth(1);
        runtime.objects.push(shard);
        runtime.tweens.push(
          this.tweens.add({
            targets: shard,
            y: { from: layout.ringY - 8, to: layout.centerY - 22 },
            alpha: { from: 0.86, to: 0 },
            duration: 1200,
            delay: index * 540,
            ease: "Sine.easeOut",
            repeat: -1,
          }),
        );
      }

      runtime.portalRuntimes.push({
        definition: portal,
        object: portalObject,
        label,
      });
    }

    this.spawnEnemies(runtime, map.id);
    this.createCombatHud(runtime);

    const positionSaveTimer = this.time.addEvent({
      delay: POSITION_SAVE_INTERVAL_MS,
      loop: true,
      callback: () => this.persistCurrentPosition(),
    });
    runtime.timers.push(positionSaveTimer);

    this.mapRuntime = runtime;
    this.updateDataset(map.id);
    this.updateMapTitle(map);
    this.updateMapRuntimeStats();
    this.persistCurrentPosition();
  }

  /**
   * 현재 월드에 실제로 남은 객체 수를 `data-*`로 노출한다(SPEC §5.3).
   * 객체·바디·콜라이더·트윈은 Phaser 라이브 컬렉션을 읽으므로, 맵 수명 컬렉션에 등록하지 않고
   * 남긴 임시 객체도 전환 뒤 기준 복귀 검증에서 잡힌다(SPEC §6.3, §17).
   * 타이머는 타입으로 노출된 라이브 목록이 없어 현재 맵이 등록한 개수를 기록한다.
   */
  /**
   * 카운터를 주기적으로 갱신해 Scene 유지 중에 누적되는 임시 객체도 잡아낸다(SPEC §17).
   * 값이 바뀐 프레임에서만 DOM에 쓴다.
   */
  private refreshMapRuntimeStats(timeMs: number): void {
    if (timeMs - this.lastStatsRefreshMs < RUNTIME_STATS_REFRESH_INTERVAL_MS) {
      return;
    }

    this.lastStatsRefreshMs = timeMs;
    this.updateMapRuntimeStats();
  }

  private updateMapRuntimeStats(): void {
    if (this.mapRuntime === null) {
      return;
    }

    const world = this.physics.world;
    const stats = {
      objects: this.children.list.length,
      bodies: world.bodies.size + world.staticBodies.size,
      colliders: world.colliders.getActive().length,
      timers: this.mapRuntime.timers.length,
      tweens: this.tweens.getTweens().length
    };
    const signature = `${stats.objects}:${stats.bodies}:${stats.colliders}:${stats.timers}:${stats.tweens}`;
    if (signature === this.statsSignature) {
      return;
    }

    this.statsSignature = signature;

    const dataset = document.body.dataset;
    dataset[GAMEPLAY_DATASET_KEYS.mapObjects] = String(stats.objects);
    dataset[GAMEPLAY_DATASET_KEYS.mapBodies] = String(stats.bodies);
    dataset[GAMEPLAY_DATASET_KEYS.mapColliders] = String(stats.colliders);
    dataset[GAMEPLAY_DATASET_KEYS.mapTimers] = String(stats.timers);
    dataset[GAMEPLAY_DATASET_KEYS.mapTweens] = String(stats.tweens);
  }

  private handlePortalInteraction(): void {
    if (
      this.player === null ||
      this.character === null ||
      this.activeSlot === null ||
      this.repository === null
    ) {
      return;
    }

    if (this.inputLocked || !this.latestIntent.interactPressed) {
      return;
    }

    const portal = this.findOverlappingPortal();
    if (portal === null) {
      return;
    }

    const access = canUsePortal(portal.definition, {
      level: this.character.level,
      expeditionStage: toPortalExpeditionStage(this.profileExtension?.quests.expeditionStage ?? "none"),
      activeExam: this.profileExtension?.quests.jobExam.status === 'active' || this.profileExtension?.quests.jobExam.status === 'ready',
    });
    if (!access.ok) {
      this.showFeedback(getBlockedPortalMessage(access.reason));
      return;
    }

    this.inputLocked = true;
    this.audio.play('portal');
    this.persistCurrentPosition();

    if (this.currentMap?.id === 'endurance-forest' && portal.definition.targetMapId === 'cuning-city' && this.profileExtension !== null && !this.profileExtension.economy.enduranceRewardClaimed) {
      this.profileExtension = {
        ...this.profileExtension,
        economy: {
          ...this.profileExtension.economy,
          enduranceRewardClaimed: true,
          mesosOverride: this.character.mesos + 1_000_000,
          ownedShuriken: [...new Set([...this.profileExtension.economy.ownedShuriken, 'giant-icicle' as const])],
        },
      };
      this.character = { ...this.character, mesos: this.character.mesos + 1_000_000 };
      this.saveAllState();
    }

    const updatedCharacter: StoredCharacterV2 = {
      ...this.character,
      mapId: portal.definition.targetMapId,
    };
    const updateResult = this.repository.updateCharacter(
      this.activeSlot,
      updatedCharacter,
    );
    if (!updateResult.ok) {
      this.inputLocked = false;
      this.showFeedback("맵 이동 저장에 실패했습니다.");
      return;
    }

    this.character = updatedCharacter;
    this.updateDataset(portal.definition.targetMapId);
    this.destroyCurrentMapRuntime();
    this.scene.restart({
      mapId: portal.definition.targetMapId,
      spawnPortalId: portal.definition.targetPortalId,
    } satisfies GameplaySceneData);
  }

  private resolveInitialSpawn(
    map: MapDef,
    spawnPortalId?: string,
  ): { x: number; y: number } {
    const savedSpawn = resolveSpawn(
      map,
      this.character === null ? null : getPosition(this.character, map.id),
    );
    if (spawnPortalId === undefined) {
      return savedSpawn;
    }

    const portal = map.portals.find((entry) => entry.id === spawnPortalId);
    if (portal === undefined) {
      return savedSpawn;
    }

    return { x: portal.x + portal.width / 2, y: portal.y };
  }

  private getPlayerIntent(): PlayerIntent {
    if (this.inputLocked) {
      return createNeutralPlayerIntent();
    }

    return {
      horizontal: this.latestIntent.horizontal,
      jumpPressed: this.latestIntent.jumpPressed,
      attackPressed: this.latestIntent.attackPressed,
      downHeld: this.latestIntent.downHeld,
      upHeld: this.latestIntent.upHeld,
    };
  }

  private spawnBasicAttack(runtime: MapRuntime, x: number, y: number, direction: -1 | 1): void {
    const definition = getSkillDefinition('basic-shuriken');
    if (definition === null || this.character === null) return;
    this.audio.play('attack');
    this.spawnSkillProjectiles(runtime, 'basic-shuriken', this.transformed ? 62 : definition.baseDamage, Math.max(1, this.character.skills['basic-shuriken'] ?? 0), definition.usesWeapon, definition.projectileCount, definition.maxTargets, x, y, direction);
  }

  private spawnEnemies(runtime: MapRuntime, mapId: MapId): void {
    const activeExam = this.profileExtension?.quests.jobExam;
    const spawns: readonly MonsterSpawn[] = mapId === 'shadow-testing-ground' && activeExam?.status === 'active' && activeExam.job === 'novice'
      ? [420, 570, 720, 870, 1020].map((x, index) => ({ id: `exam-mushroom-${index + 1}`, monsterId: 'green-mushroom' as const, x, y: 660, patrolRadius: 55 }))
      : getMonsterSpawns(mapId);
    for (const spawn of spawns) {
      const definition = getMonster(spawn.monsterId);
      const visualAsset = getMonsterVisualAsset(definition.id);
      const body = this.add.image(spawn.x, spawn.y - definition.height / 2, visualAsset.textureKey)
        .setDisplaySize(definition.width * visualAsset.displayScale, definition.height * visualAsset.displayScale)
        .setDepth(3);
      const label = this.add.text(spawn.x, body.y - definition.height / 2 - 18, `Lv.${definition.level} ${definition.label}`, createTextStyle(definition.boss ? 17 : 14, definition.boss ? '#ffe29a' : '#eef5ff')).setOrigin(0.5, 1).setDepth(5);
      const hpBack = this.add.rectangle(spawn.x - 31, body.y - definition.height / 2 - 10, 62, 7, 0x241d2c, 0.95).setOrigin(0, 0.5).setDepth(5);
      const hpFill = this.add.rectangle(spawn.x - 30, hpBack.y, 60, 5, definition.boss ? 0xff7b5c : 0x67df8a, 1).setOrigin(0, 0.5).setDepth(6);
      runtime.objects.push(body, label, hpBack, hpFill);
      runtime.enemies.push({ spawn, definition, body, label, hpBack, hpFill, hp: definition.hp, alive: true, direction: 1, respawnAtMs: 0, nextAttackAtMs: this.time.now + 1800 });
    }
  }

  private updateEnemies(time: number, delta: number): void {
    if (this.mapRuntime === null || this.player === null) return;
    for (const enemy of this.mapRuntime.enemies) {
      if (!enemy.alive) {
        if (time >= enemy.respawnAtMs) {
          enemy.hp = enemy.definition.hp;
          enemy.alive = true;
          enemy.body.setPosition(enemy.spawn.x, enemy.spawn.y - enemy.definition.height / 2).setVisible(true);
          enemy.label.setVisible(true);
          enemy.hpBack.setVisible(true);
          enemy.hpFill.setVisible(true).setDisplaySize(60, 5);
          enemy.nextAttackAtMs = time + 1800;
        }
        continue;
      }
      const left = enemy.spawn.x - enemy.spawn.patrolRadius;
      const right = enemy.spawn.x + enemy.spawn.patrolRadius;
      const nextX = enemy.body.x + enemy.direction * enemy.definition.speed * delta / 1000;
      if (nextX <= left || nextX >= right) enemy.direction = enemy.direction === 1 ? -1 : 1;
      enemy.body.x = Phaser.Math.Clamp(nextX, left, right);
      if (enemy.body instanceof Phaser.GameObjects.Image) enemy.body.setFlipX(enemy.direction < 0);
      enemy.label.x = enemy.body.x;
      enemy.hpBack.x = enemy.body.x - 31;
      enemy.hpFill.x = enemy.body.x - 30;
      const closeX = Math.abs(this.player.x - enemy.body.x) <= enemy.definition.width / 2 + 22;
      const closeY = Math.abs((this.player.y - 38) - enemy.body.y) <= enemy.definition.height / 2 + 32;
      if (closeX && closeY && time >= this.playerInvulnerableUntilMs) this.applyPlayerDamage(enemy.definition.contactDamage, time);
      if (enemy.definition.boss && time >= enemy.nextAttackAtMs) {
        this.spawnBossAttack(this.mapRuntime, enemy, time);
        enemy.nextAttackAtMs = time + (enemy.definition.id === 'one-punch-guardian' ? 2200 : 1800);
      }
    }
    this.updateDrops(time);
  }

  private handleSkillInput(time: number): void {
    const requested = this.latestIntent.skillPressed;
    if (requested === null || this.mapRuntime === null || this.player === null || this.character === null || time < this.skillReadyAtMs) return;
    if (requested === 'gumiho-transformation' && this.transformed) {
      this.transformed = false;
      this.skillReadyAtMs = time + 500;
      this.lastSkillEffect = 'gumiho-transformation';
      this.spawnSkillCastEffect(this.mapRuntime, 'gumiho-transformation', this.player.x, this.player.y, this.player.flipX ? -1 : 1);
      this.showFeedback('구미호 변신을 해제했습니다.');
      return;
    }
    const level = requested === 'basic-shuriken' ? Math.max(1, this.character.skills[requested] ?? 0) : this.character.skills[requested] ?? 0;
    const result = resolveSkillUse(requested, level, this.character.mp, this.transformed);
    if (!result.ok) {
      this.showFeedback(result.reason === 'mp' ? 'MP가 부족합니다.' : '아직 배우지 않은 기술입니다.');
      return;
    }
    this.character = { ...this.character, mp: result.mpAfter };
    this.saveCharacter();
    this.skillReadyAtMs = time + result.cooldownMs;
    this.player.beginSkill(time, Math.min(620, result.cooldownMs));
    if (result.togglesTransformation) {
      this.transformed = true;
      this.lastTransformationDrainMs = time;
      this.lastSkillEffect = 'gumiho-transformation';
      this.spawnSkillCastEffect(this.mapRuntime, 'gumiho-transformation', this.player.x, this.player.y, this.player.flipX ? -1 : 1);
      this.showFeedback('구미호 변신: 기본 공격 강화 · Shift 미수옥');
      return;
    }
    const direction: -1 | 1 = this.player.flipX ? -1 : 1;
    this.spawnSkillProjectiles(this.mapRuntime, result.resolvedSkillId, result.baseDamage, level, result.usesWeapon, result.projectileCount, result.maxTargets, this.player.x, this.player.y, direction);
    this.showFeedback(`${result.resolvedSkillId === 'tailed-beast-orb' ? '미수옥' : SKILL_LABELS_KO[requested]} 발동`);
    this.audio.play('skill');
  }

  private spawnBossAttack(runtime: MapRuntime, enemy: EnemyRuntime, time: number): void {
    if (this.player === null) return;
    const distance = Math.abs(this.player.x - enemy.body.x);
    const range = enemy.definition.id === 'ignikar' ? 680 : enemy.definition.id === 'lunasion' ? 820 : 1200;
    if (distance > range) return;
    const phaseTwo = enemy.definition.id === 'one-punch-guardian' && enemy.hp <= enemy.definition.hp * 0.5;
    this.audio.play('boss');
    const offsets = phaseTwo ? [-90, 0, 90] : [0];
    for (const offset of offsets) {
      const hazard = this.add.circle(enemy.body.x, enemy.body.y, enemy.definition.id === 'one-punch-guardian' ? 22 : 14, enemy.definition.id === 'ignikar' ? 0xff6d3a : enemy.definition.id === 'lunasion' ? 0xa77bff : 0xffd34d, 0.9).setDepth(8);
      runtime.objects.push(hazard);
      let resolved = false;
      let tween: Phaser.Tweens.Tween;
      let bossProjectile: BossProjectileRuntime;
      tween = this.tweens.add({
        targets: hazard,
        x: this.player.x,
        y: this.player.y - 38 + offset,
        scale: enemy.definition.id === 'one-punch-guardian' ? 2.4 : 1.3,
        duration: 780,
        ease: 'Linear',
        onUpdate: () => {
          if (resolved || this.player === null || !hazard.active) return;
          if (Phaser.Math.Distance.Between(hazard.x, hazard.y, this.player.x, this.player.y - 38) <= 36 && time >= 0) {
            resolved = true;
            const damage = enemy.definition.id === 'ignikar' ? 650 : enemy.definition.id === 'lunasion' ? 1600 : Number.MAX_SAFE_INTEGER;
            this.applyPlayerDamage(damage, this.time.now);
          }
        },
        onComplete: () => {
          runtime.objects = runtime.objects.filter((object) => object !== hazard);
          runtime.tweens = runtime.tweens.filter((entry) => entry !== tween);
          runtime.bossProjectiles = runtime.bossProjectiles.filter((entry) => entry !== bossProjectile);
          hazard.destroy();
        },
      });
      bossProjectile = { object: hazard, tween };
      runtime.bossProjectiles.push(bossProjectile);
      runtime.tweens.push(tween);
    }
  }

  private updateTransformation(time: number): void {
    if (!this.transformed || this.character === null || time - this.lastTransformationDrainMs < 1000) return;
    const intervals = Math.floor((time - this.lastTransformationDrainMs) / 1000);
    const drain = Math.max(1, Math.ceil(this.character.maxMp * 0.01)) * intervals;
    this.lastTransformationDrainMs += intervals * 1000;
    if (this.character.mp <= drain) {
      this.character = { ...this.character, mp: 0 };
      this.transformed = false;
      this.showFeedback('MP가 소진되어 변신이 해제되었습니다.');
    } else this.character = { ...this.character, mp: this.character.mp - drain };
    this.saveCharacter();
  }

  private spawnSkillProjectiles(runtime: MapRuntime, skillId: RuntimeSkillId, baseDamage: number, skillLevel: number, usesWeapon: boolean, projectileCount: number, maxTargets: number, x: number, y: number, direction: -1 | 1): void {
    const effectDefinition = getSkillEffectDefinition(skillId);
    if (effectDefinition === null) return;
    const range = 270 * (1 + (this.character?.skills['keen-eyesight'] ?? 0) * 0.02);
    this.lastSkillEffect = skillId;
    this.spawnSkillCastEffect(runtime, skillId, x, y, direction);
    for (let index = 0; index < projectileCount; index += 1) {
      const motion = resolveSkillProjectileMotion(skillId, index, projectileCount, x, y, direction, range);
      const projectile = createSkillProjectileVisual(this, skillId, motion.startX, motion.startY, direction);
      runtime.objects.push(projectile);
      let entry: CombatProjectileRuntime;
      const tween = this.tweens.add({
        targets: projectile,
        x: motion.endX,
        y: motion.endY,
        angle: direction * effectDefinition.spinDegrees,
        scaleX: skillId === 'tailed-beast-orb' ? 1.18 : 1,
        scaleY: skillId === 'tailed-beast-orb' ? 1.18 : 1,
        duration: effectDefinition.travelDurationMs,
        ease: skillId === 'abyss-rain' ? 'Quad.easeIn' : 'Sine.easeOut',
        onUpdate: () => this.checkProjectileHits(runtime, entry),
        onComplete: () => this.removeCombatProjectile(runtime, entry)
      });
      entry = { object: projectile, tween, skillId, baseDamage, skillLevel, usesWeapon, maxTargets, hitEnemyIds: new Set(), sequence: ++this.attackSequence };
      runtime.projectiles.push(entry);
      runtime.tweens.push(tween);
    }
  }

  private checkProjectileHits(runtime: MapRuntime, projectile: CombatProjectileRuntime): void {
    if (!projectile.object.active) return;
    for (const enemy of runtime.enemies) {
      if (!enemy.alive || projectile.hitEnemyIds.has(enemy.spawn.id)) continue;
      const hitX = Math.abs(projectile.object.x - enemy.body.x) <= enemy.definition.width / 2 + 14;
      const hitY = Math.abs(projectile.object.y - enemy.body.y) <= enemy.definition.height / 2 + (enemy.definition.id === 'one-punch-guardian' ? 132 : 24);
      if (!hitX || !hitY) continue;
      projectile.hitEnemyIds.add(enemy.spawn.id);
      this.damageEnemy(runtime, enemy, projectile);
      if (projectile.hitEnemyIds.size >= projectile.maxTargets) {
        this.removeCombatProjectile(runtime, projectile);
        return;
      }
    }
  }

  private damageEnemy(runtime: MapRuntime, enemy: EnemyRuntime, projectile: CombatProjectileRuntime): void {
    if (this.character === null || !enemy.alive) return;
    const critical = isDeterministicCritical(projectile.sequence, this.character.skills['critical-throw'] ?? 0);
    const damage = calculateAttackDamage({ baseDamage: projectile.baseDamage, job: this.character.job, level: this.character.level, luk: this.character.stats.luk, dex: this.character.stats.dex, skillLevel: projectile.skillLevel, weaponMultiplier: this.profileExtension === null ? 1 : getEquippedWeaponMultiplier(this.profileExtension.economy), defense: enemy.definition.defense, critical, usesWeapon: projectile.usesWeapon });
    enemy.hp = Math.max(0, enemy.hp - damage);
    this.audio.play(critical ? 'critical' : 'hit');
    enemy.hpFill.setDisplaySize(Math.max(1, 60 * enemy.hp / enemy.definition.hp), 5);
    this.spawnSkillImpactEffect(runtime, projectile.skillId, enemy.body.x, enemy.body.y);
    this.createDamageNumber(runtime, enemy.body.x, enemy.body.y - enemy.definition.height / 2, damage, critical);
    if (projectile.skillId === 'drain') {
      this.character = { ...this.character, hp: Math.min(this.character.maxHp, this.character.hp + Math.max(1, Math.floor(damage * 0.45))) };
      this.saveCharacter();
    }
    document.body.dataset[GAMEPLAY_DATASET_KEYS.lastCombatEvent] = `hit:${enemy.spawn.id}:${damage}`;
    if (enemy.hp === 0) this.defeatEnemy(runtime, enemy);
  }

  private defeatEnemy(runtime: MapRuntime, enemy: EnemyRuntime): void {
    if (this.character === null) return;
    enemy.alive = false;
    enemy.respawnAtMs = this.time.now + enemy.definition.respawnMs;
    enemy.body.setVisible(false);
    enemy.label.setVisible(false);
    enemy.hpBack.setVisible(false);
    enemy.hpFill.setVisible(false);
    if (enemy.definition.boss) {
      for (const projectile of [...runtime.bossProjectiles]) {
        runtime.objects = runtime.objects.filter((object) => object !== projectile.object);
        runtime.tweens = runtime.tweens.filter((tween) => tween !== projectile.tween);
        projectile.tween.remove();
        projectile.object.destroy();
      }
      runtime.bossProjectiles = [];
    }
    this.spawnDrop(runtime, enemy.body.x, enemy.spawn.y - 12, enemy.definition.mesos, enemy.definition.label);
    const previousLevel = this.character.level;
    const progress = addExperience(this.character, enemy.definition.exp);
    this.character = { ...this.character, ...progress };
    if (this.profileExtension !== null) {
      const quests = recordJobExamKill(this.profileExtension.quests, enemy.definition.id);
      const defeatedBosses = enemy.definition.boss ? [...new Set([...this.profileExtension.defeatedBosses, enemy.definition.id])] : this.profileExtension.defeatedBosses;
      let expeditionStage = quests.expeditionStage;
      if (enemy.definition.id === 'ignikar' && expeditionStage === 'midboss') expeditionStage = 'upperboss';
      if (enemy.definition.id === 'lunasion' && expeditionStage === 'upperboss') expeditionStage = 'finalboss';
      if (enemy.definition.id === 'one-punch-guardian' && expeditionStage === 'finalboss') expeditionStage = 'report';
      this.profileExtension = { ...this.profileExtension, quests: { ...quests, expeditionStage }, defeatedBosses };
    }
    this.saveAllState();
    this.audio.play(progress.level > previousLevel ? 'level-up' : 'defeat');
    if (this.currentMap !== null) this.updateMapTitle(this.currentMap);
    this.showFeedback(`${enemy.definition.label} 처치 · EXP +${enemy.definition.exp}`);
    document.body.dataset[GAMEPLAY_DATASET_KEYS.lastCombatEvent] = `defeat:${enemy.spawn.id}`;
    if (enemy.definition.id === 'one-punch-guardian') {
      const timer = this.time.delayedCall(520, () => {
        if (this.overlayClose !== null) return;
        this.inputLocked = true;
        this.overlayClose = openEndingCredits(this, () => { this.overlayClose = null; this.inputLocked = false; });
      });
      runtime.timers.push(timer);
    }
  }

  private createDamageNumber(runtime: MapRuntime, x: number, y: number, damage: number, critical: boolean): void {
    const text = this.add.text(x, y, `${critical ? 'CRITICAL ' : ''}${damage.toLocaleString()}`, createTextStyle(critical ? 20 : 16, critical ? CRITICAL_COLOR : DAMAGE_COLOR)).setOrigin(0.5).setDepth(12);
    runtime.objects.push(text);
    let tween: Phaser.Tweens.Tween;
    tween = this.tweens.add({ targets: text, y: y - 46, alpha: 0, duration: 720, onComplete: () => { runtime.objects = runtime.objects.filter((object) => object !== text); runtime.tweens = runtime.tweens.filter((item) => item !== tween); text.destroy(); } });
    runtime.tweens.push(tween);
  }

  private spawnSkillCastEffect(runtime: MapRuntime, skillId: RuntimeSkillId, x: number, y: number, direction: -1 | 1): void {
    const definition = getSkillEffectDefinition(skillId);
    if (definition === null) return;
    const effect = createSkillCastVisual(this, skillId, x, y, direction);
    this.animateTransientSkillEffect(runtime, effect, definition.castDurationMs, definition.impactScale, direction * 110);
    const presentation = getSkillPresentationPlan(skillId);
    const screenAccent = createSkillScreenAccentVisual(this, skillId, VIEW_WIDTH, HUD_TOP);
    if (presentation !== null && screenAccent !== null) {
      this.animateTransientSkillEffect(runtime, screenAccent, presentation.screenDurationMs, presentation.screenScale, 0);
    }
  }

  private spawnSkillImpactEffect(runtime: MapRuntime, skillId: RuntimeSkillId, x: number, y: number): void {
    const definition = getSkillEffectDefinition(skillId);
    if (definition === null) return;
    const waveCount = getSkillPresentationPlan(skillId)?.impactWaveCount ?? 1;
    for (let wave = 0; wave < waveCount; wave += 1) {
      const effect = createSkillImpactVisual(this, skillId, x, y).setScale(0.42 - wave * 0.04);
      this.animateTransientSkillEffect(
        runtime,
        effect,
        Math.max(240, definition.castDurationMs * 0.72) + wave * 55,
        definition.impactScale * (1 + wave * 0.16),
        definition.spinDegrees * (0.22 + wave * 0.08),
        wave * 70
      );
    }
  }

  private animateTransientSkillEffect(runtime: MapRuntime, effect: Phaser.GameObjects.Container, durationMs: number, targetScale: number, angle: number, delayMs = 0): void {
    runtime.objects.push(effect);
    let tween: Phaser.Tweens.Tween;
    tween = this.tweens.add({
      targets: effect,
      scaleX: targetScale,
      scaleY: targetScale,
      angle,
      alpha: 0,
      delay: delayMs,
      duration: durationMs,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        runtime.objects = runtime.objects.filter((object) => object !== effect);
        runtime.tweens = runtime.tweens.filter((entry) => entry !== tween);
        effect.destroy();
      }
    });
    runtime.tweens.push(tween);
  }

  private spawnDrop(runtime: MapRuntime, x: number, y: number, mesos: number, source: string): void {
    const object = this.add.circle(x, y, 10, 0xffd166, 1).setStrokeStyle(2, 0xfff1a8).setDepth(5);
    const label = this.add.text(x, y - 16, `${source} 전리품 · Z`, createTextStyle(13, '#fff0aa')).setOrigin(0.5, 1).setDepth(5);
    runtime.objects.push(object, label);
    runtime.drops.push({
      id: `drop-${this.attackSequence}-${Math.round(this.time.now)}`,
      object,
      label,
      mesos,
      expiresAtMs: this.time.now + DROP_LIFETIME_MS,
      landedAtMs: this.time.now + 420,
    });
  }

  private updateDrops(time: number): void {
    if (this.mapRuntime === null) return;
    for (const drop of [...this.mapRuntime.drops]) {
      if (time >= drop.expiresAtMs) this.removeDrop(this.mapRuntime, drop);
      else {
        const visible = drop.expiresAtMs - time > 2200 || Math.floor(time / 160) % 2 === 0;
        drop.object.setVisible(visible);
        drop.label.setVisible(visible);
      }
    }
  }

  private createPetRuntime(runtime: MapRuntime): void {
    if (runtime.pet !== null || this.player === null) return;
    const x = this.player.x - (this.player.flipX ? -1 : 1) * 64;
    const y = this.player.y;
    const object = this.add.image(x, y - 26, DUA_PET_ASSET.textureKey)
      .setDisplaySize(DUA_PET_ASSET.displayWidth, DUA_PET_ASSET.displayHeight)
      .setDepth(6);
    object.setFlipX(this.player.flipX);
    const label = this.add.text(x, y - 54, '두아', createTextStyle(13, '#e7fff8'))
      .setOrigin(0.5, 1)
      .setDepth(6);
    runtime.objects.push(object, label);
    runtime.pet = { object, label, state: { x, y, velocityX: 0, facing: this.player.flipX ? -1 : 1 } };
  }

  private updatePet(time: number, delta: number): void {
    if (this.mapRuntime === null || this.player === null) return;
    const runtime = this.mapRuntime;
    const pet = runtime.pet;
    if (pet === null) return;
    const playerBody = this.player.body;
    const playerVelocityX = playerBody instanceof Phaser.Physics.Arcade.Body ? playerBody.velocity.x : 0;
    const playerState = {
      x: this.player.x,
      y: this.player.y,
      velocityX: playerVelocityX,
      facing: (this.player.flipX ? -1 : 1) as -1 | 1,
    };
    const target = chooseNearestPetDrop(
      pet.state,
      playerState,
      runtime.drops.map((drop) => ({
        id: drop.id,
        x: drop.object.x,
        y: drop.object.y,
        landed: time >= drop.landedAtMs,
      })),
    );
    const result = stepPetFollower({ pet: pet.state, player: playerState, target, deltaMs: delta });
    pet.state = result.state;
    pet.object.setPosition(result.state.x, result.state.y - (result.jumping ? 36 : 26));
    pet.label.setPosition(result.state.x, result.state.y - (result.jumping ? 64 : 54));
    pet.object.setFlipX(result.state.facing < 0);
    if (result.collectDropId !== null) {
      const drop = runtime.drops.find((entry) => entry.id === result.collectDropId);
      if (drop !== undefined) this.collectDrop(runtime, drop, '두아 자동 회수');
    }
  }

  private handleDropCollection(): void {
    if (!this.latestIntent.collectPressed || this.mapRuntime === null || this.player === null || this.character === null) return;
    const nearest = this.mapRuntime.drops.map((drop) => ({ drop, distance: Phaser.Math.Distance.Between(this.player!.x, this.player!.y, drop.object.x, drop.object.y) })).filter((entry) => entry.distance <= DROP_COLLECT_RANGE).sort((a, b) => a.distance - b.distance)[0]?.drop;
    if (nearest === undefined) {
      this.showFeedback('가까운 전리품이 없습니다.');
      return;
    }
    this.collectDrop(this.mapRuntime, nearest, '전리품 회수');
  }

  private collectDrop(runtime: MapRuntime, drop: DropRuntime, source: string): void {
    if (this.character === null) return;
    this.character = { ...this.character, mesos: this.character.mesos + drop.mesos };
    if (this.profileExtension !== null) this.profileExtension = { ...this.profileExtension, economy: { ...this.profileExtension.economy, mesosOverride: this.character.mesos } };
    this.saveAllState();
    this.showFeedback(`${source} · 메소 +${drop.mesos}`);
    this.audio.play('pickup');
    this.removeDrop(runtime, drop);
  }

  private removeDrop(runtime: MapRuntime, drop: DropRuntime): void {
    runtime.drops = runtime.drops.filter((entry) => entry !== drop);
    runtime.objects = runtime.objects.filter((object) => object !== drop.object && object !== drop.label);
    drop.object.destroy();
    drop.label.destroy();
  }

  private removeCombatProjectile(runtime: MapRuntime, projectile: CombatProjectileRuntime): void {
    if (!runtime.projectiles.includes(projectile)) return;
    runtime.projectiles = runtime.projectiles.filter((entry) => entry !== projectile);
    runtime.tweens = runtime.tweens.filter((entry) => entry !== projectile.tween);
    runtime.objects = runtime.objects.filter((entry) => entry !== projectile.object);
    projectile.tween.remove();
    projectile.object.destroy();
  }

  private applyPlayerDamage(amount: number, time: number): void {
    if (this.character === null || this.mapRuntime === null) return;
    this.playerInvulnerableUntilMs = time + PLAYER_INVULNERABILITY_MS;
    const hp = Math.max(0, this.character.hp - Math.max(1, amount));
    this.character = { ...this.character, hp };
    this.lastDamagedAtMs = time;
    this.audio.play('damage');
    this.saveCharacter();
    if (hp > 0) {
      this.showFeedback(`피격 -${amount}`);
      return;
    }
    const charmCount = this.profileExtension?.economy.inventory['revival-charm'] ?? 0;
    if (charmCount > 0 && this.profileExtension !== null) {
      const inventory = { ...this.profileExtension.economy.inventory };
      delete inventory['revival-charm'];
      this.profileExtension = { ...this.profileExtension, economy: { ...this.profileExtension.economy, inventory } };
      this.character = { ...this.character, hp: this.character.maxHp, mp: this.character.maxMp };
      this.playerInvulnerableUntilMs = time + 1600;
      this.saveAllState();
      this.showFeedback('부활의 부적이 자동으로 발동했습니다.');
      this.audio.play('revive');
      return;
    }
    this.inputLocked = true;
    this.showFeedback('전투 불능 · 커닝시티로 귀환합니다.');
    const timer = this.time.delayedCall(700, () => {
      if (this.character === null) return;
      this.character = { ...this.character, hp: this.character.maxHp, mp: this.character.maxMp, mapId: 'cuning-city' };
      this.saveCharacter();
      this.scene.restart({ mapId: 'cuning-city' } satisfies GameplaySceneData);
    });
    this.mapRuntime.timers.push(timer);
  }

  private saveCharacter(): void {
    if (this.repository !== null && this.activeSlot !== null && this.character !== null) this.repository.updateCharacter(this.activeSlot, this.character);
  }

  private saveAllState(): void {
    this.saveCharacter();
    if (this.activeSlot !== null && this.profileExtension !== null) saveRuntimeProfileExtension(this.activeSlot, this.profileExtension);
  }

  private installTextRenderer(): void {
    const gameplayWindow = window as Window & {
      render_game_to_text?: () => string;
      advanceTime?: (milliseconds: number) => Promise<void>;
    };
    gameplayWindow.render_game_to_text = () => JSON.stringify({
      coordinateSystem: 'origin top-left, x right, y down',
      map: this.currentMap === null ? null : { id: this.currentMap.id, width: this.currentMap.width, height: this.currentMap.height },
      background: this.currentMap === null ? null : { width: this.currentMap.width, height: this.currentMap.height, followsCamera: true },
      camera: { scrollX: Math.round(this.cameras.main.scrollX), scrollY: Math.round(this.cameras.main.scrollY), playfieldBottom: HUD_TOP },
      player: this.player === null || this.character === null ? null : { x: Math.round(this.player.x), y: Math.round(this.player.y), state: this.player.getState(), hp: this.character.hp, mp: this.character.mp, level: this.character.level, job: this.character.job, transformed: this.transformed },
      effects: {
        lastSkill: this.lastSkillEffect,
        activeProjectiles: this.mapRuntime?.projectiles.length ?? 0,
        activeScreenAccents: this.mapRuntime?.objects.filter((object) => object.name === 'skill-screen-accent').length ?? 0,
      },
      audio: {
        musicMode: this.audio.getMusicMode(),
        musicActive: this.audio.isMusicActive(),
      },
      enemies: this.mapRuntime?.enemies.map((enemy) => ({ id: enemy.spawn.id, type: enemy.definition.id, x: Math.round(enemy.body.x), y: Math.round(enemy.body.y), groundY: enemy.spawn.y, hp: enemy.hp, alive: enemy.alive })) ?? [],
      portals: this.mapRuntime?.portalRuntimes.map((portal) => ({ id: portal.definition.id, x: Math.round(portal.definition.x + portal.definition.width / 2), groundY: portal.definition.y })) ?? [],
      drops: this.mapRuntime?.drops.map((drop) => ({ id: drop.id, x: Math.round(drop.object.x), y: Math.round(drop.object.y), mesos: drop.mesos })) ?? [],
      pet: this.mapRuntime?.pet === null || this.mapRuntime?.pet === undefined ? null : {
        x: Math.round(this.mapRuntime.pet.state.x),
        y: Math.round(this.mapRuntime.pet.state.y),
        velocityX: Math.round(this.mapRuntime.pet.state.velocityX),
      },
      quests: this.profileExtension?.quests ?? null,
      shortcuts: this.profileExtension?.shortcuts ?? null,
      controls: 'Arrow keys move/climb, Alt jump, Ctrl attack, editable 1~0/- and Shift/QWER/ASDF/XCV skills, B/N fixed skills, Z collect, Esc/I/S/K menus',
    });
    gameplayWindow.advanceTime = (milliseconds: number) => new Promise((resolve) => {
      const duration = Math.max(0, Math.min(10_000, milliseconds));
      const startedAt = performance.now();
      const waitForFrame = (now: number) => {
        if (now - startedAt >= duration) resolve();
        else requestAnimationFrame(waitForFrame);
      };
      requestAnimationFrame(waitForFrame);
    });
  }

  private updateNaturalRecovery(time: number): void {
    if (this.character === null || time - this.lastDamagedAtMs < 2600) return;
    const shadowLevel = this.character.skills['shadow-breathing'] ?? 0;
    const sageLevel = this.character.skills['sage-mode'] ?? 0;
    const interval = Math.max(120, 1600 * (1 - shadowLevel * 0.02) * (1 - sageLevel * 0.04));
    if (time - this.lastRecoveryAtMs < interval) return;
    this.lastRecoveryAtMs = time;
    const hp = Math.min(this.character.maxHp, this.character.hp + 6);
    const mp = this.transformed ? this.character.mp : Math.min(this.character.maxMp, this.character.mp + 4);
    if (hp !== this.character.hp || mp !== this.character.mp) {
      this.character = { ...this.character, hp, mp };
      this.saveCharacter();
    }
  }

  private handleMenuInput(): void {
    if (this.overlayClose !== null || this.character === null || this.profileExtension === null) return;
    if (this.latestIntent.menuPressed) this.openPanel('menu');
    else if (this.latestIntent.inventoryPressed) this.openPanel('inventory');
    else if (this.latestIntent.statsPressed) this.openPanel('stats');
    else if (this.latestIntent.skillMenuPressed) this.openPanel('skills');
  }

  private openPanel(kind: GameplayPanelKind): void {
    if (this.character === null || this.profileExtension === null) return;
    this.inputLocked = true;
    this.audio.play('menu');
    this.profileExtension = { ...this.profileExtension, economy: { ...this.profileExtension.economy, mesosOverride: this.character.mesos } };
    const refresh = (nextKind: GameplayPanelKind = kind) => {
      const close = this.overlayClose;
      this.overlayClose = null;
      close?.();
      this.openPanel(nextKind);
    };
    this.overlayClose = openGameplayPanel(this, kind, this.character, this.profileExtension.economy, this.profileExtension.quests, this.profileExtension.shortcuts, {
      switchPanel: refresh,
      useItem: (itemId) => { this.useInventoryItem(itemId); refresh(); },
      buyItem: (itemId) => { this.buyInventoryItem(itemId); refresh(); },
      buyShuriken: (id) => { this.buyWeapon(id); refresh(); },
      equipShuriken: (id) => { this.equipWeapon(id); refresh(); },
      allocateStat: (stat) => { this.allocateStat(stat); refresh(); },
      setAutoDistribute: (enabled) => { if (this.character !== null) { this.character = { ...this.character, autoDistribute: enabled }; this.saveCharacter(); } refresh(); },
      levelSkill: (skillId) => { this.allocateSkill(skillId); refresh(); },
      swapActionSlots: (fromIndex, toIndex) => {
        if (this.profileExtension !== null) {
          this.profileExtension = { ...this.profileExtension, shortcuts: swapActionSlots(this.profileExtension.shortcuts, fromIndex, toIndex) };
          this.saveAllState();
        }
        refresh('shortcuts');
      },
      setAdditionalSkill: (key: AdditionalSkillKey, skillId) => {
        if (this.profileExtension !== null) {
          this.profileExtension = { ...this.profileExtension, shortcuts: setAdditionalSkill(this.profileExtension.shortcuts, key, skillId) };
          this.saveAllState();
        }
        refresh('shortcuts');
      },
      handleJobExam: () => { this.handleJobExamAction(); refresh(); },
      handleExpedition: () => { this.handleExpeditionAction(); refresh(); },
      registerPet: () => { this.registerPet(); refresh(); },
      onClose: () => { this.overlayClose = null; this.inputLocked = false; },
    });
  }

  private useInventoryItem(itemId: 'recovery-potion' | 'experience-book'): void {
    if (this.character === null || this.profileExtension === null) return;
    const result = useConsumable(this.profileExtension.economy, itemId, this.character);
    if (!result.ok) {
      this.showFeedback(result.reason === 'missing' ? '아이템이 없습니다.' : '지금은 효과가 없습니다.');
      return;
    }
    this.profileExtension = { ...this.profileExtension, economy: result.state };
    this.character = { ...this.character, ...result.progression };
    this.saveAllState();
  }

  private buyInventoryItem(itemId: ItemId): void {
    if (this.character === null || this.profileExtension === null) return;
    const result = purchaseItem({ ...this.profileExtension.economy, mesosOverride: this.character.mesos }, itemId, 1);
    if (!result.ok) {
      this.showFeedback(result.reason === 'mesos' ? '메소가 부족합니다.' : '구매 제한에 걸렸습니다.');
      return;
    }
    this.character = { ...this.character, mesos: result.state.mesosOverride };
    this.profileExtension = { ...this.profileExtension, economy: result.state };
    this.saveAllState();
  }

  private buyWeapon(id: ShurikenId): void {
    if (this.character === null || this.profileExtension === null) return;
    const result = purchaseShuriken({ ...this.profileExtension.economy, mesosOverride: this.character.mesos }, id);
    if (!result.ok) {
      this.showFeedback(result.reason === 'mesos' ? '메소가 부족합니다.' : '구매할 수 없는 표창입니다.');
      return;
    }
    this.character = { ...this.character, mesos: result.state.mesosOverride };
    this.profileExtension = { ...this.profileExtension, economy: result.state };
    this.saveAllState();
  }

  private equipWeapon(id: ShurikenId): void {
    if (this.profileExtension === null || !this.profileExtension.economy.ownedShuriken.includes(id)) return;
    this.profileExtension = { ...this.profileExtension, economy: { ...this.profileExtension.economy, equippedShuriken: id } };
    this.saveAllState();
  }

  private allocateStat(stat: 'str' | 'dex' | 'int' | 'luk'): void {
    if (this.character === null || this.character.ap <= 0) return;
    this.character = { ...this.character, ap: this.character.ap - 1, stats: { ...this.character.stats, [stat]: this.character.stats[stat] + 1 } };
    this.saveCharacter();
  }

  private allocateSkill(skillId: SkillId): void {
    if (this.character === null || this.character.sp <= 0 || (this.character.skills[skillId] ?? 0) >= 20) return;
    const requiredRank = skillRequiredRank(skillId);
    if (jobRank(this.character.job) < requiredRank) {
      this.showFeedback('현재 직업에서는 배울 수 없습니다.');
      return;
    }
    this.character = { ...this.character, sp: this.character.sp - 1, skills: { ...this.character.skills, [skillId]: (this.character.skills[skillId] ?? 0) + 1 } };
    this.saveCharacter();
  }

  private handleJobExamAction(): void {
    if (this.character === null || this.profileExtension === null) return;
    if (this.profileExtension.quests.jobExam.status === 'ready') {
      const result = reportJobExam(this.profileExtension.quests, this.character.job, this.character.level);
      if (!result.ok) return;
      this.profileExtension = { ...this.profileExtension, quests: result.state };
      this.character = { ...this.character, job: result.nextJob, skills: unlockJobSkills(this.character.skills, result.nextJob) };
      this.saveAllState();
      this.showFeedback(`${result.nextJob} 전직 완료`);
      return;
    }
    const result = acceptJobExam(this.profileExtension.quests, this.character.job, this.character.level);
    if (!result.ok) {
      this.showFeedback(result.reason === 'active' ? '이미 시험을 진행 중입니다.' : '아직 전직 조건을 충족하지 못했습니다.');
      return;
    }
    this.profileExtension = { ...this.profileExtension, quests: result.state };
    this.saveAllState();
    this.showFeedback('전직 시험을 수락했습니다. 도적 아지트의 시험장으로 가세요.');
  }

  private handleExpeditionAction(): void {
    if (this.character === null || this.profileExtension === null) return;
    const stage = this.profileExtension.quests.expeditionStage;
    if (stage === 'none' && this.character.level >= 100) {
      this.profileExtension = { ...this.profileExtension, quests: { ...this.profileExtension.quests, expeditionStage: 'midboss' } };
      this.saveAllState();
      return;
    }
    if (stage === 'report') {
      this.character = { ...this.character, mesos: this.character.mesos + 7500 };
      const inventory = this.profileExtension.economy.inventory;
      this.profileExtension = { ...this.profileExtension, economy: { ...this.profileExtension.economy, mesosOverride: this.character.mesos, inventory: { ...inventory, 'experience-book': (inventory['experience-book'] ?? 0) + 2 } }, quests: { ...this.profileExtension.quests, expeditionStage: 'complete' } };
      this.saveAllState();
      return;
    }
    this.showFeedback('현재 원정 목표를 먼저 완료하세요.');
  }

  private registerPet(): void {
    if (this.profileExtension === null || this.profileExtension.economy.petRegistered) return;
    const count = this.profileExtension.economy.inventory.mungpuccino ?? 0;
    if (count <= 0) {
      this.showFeedback('멍푸치노가 필요합니다.');
      return;
    }
    const inventory = { ...this.profileExtension.economy.inventory };
    if (count === 1) delete inventory.mungpuccino;
    else inventory.mungpuccino = count - 1;
    this.profileExtension = { ...this.profileExtension, economy: { ...this.profileExtension.economy, inventory, petRegistered: true } };
    this.saveAllState();
    if (this.mapRuntime !== null) this.createPetRuntime(this.mapRuntime);
    this.showFeedback('두아가 동료로 등록되었습니다. 가까운 전리품을 따라갑니다.');
  }

  private createCombatHud(runtime: MapRuntime): void {
    const panel = this.add.rectangle(VIEW_WIDTH / 2, HUD_TOP + HUD_HEIGHT / 2, VIEW_WIDTH, HUD_HEIGHT, 0x09111f, 0.92).setScrollFactor(0).setDepth(18);
    this.hudStatusText = this.add.text(22, HUD_TOP + 12, '', createTextStyle(17, '#eff7ff')).setScrollFactor(0).setDepth(20);
    const controls = this.add.text(22, HUD_TOP + 48, 'Ctrl 기본 공격 · Alt 점프 · 1~0/- 및 추가키 기술 · B/N 고정 · Z 전리품', createTextStyle(14, '#a9c7e8')).setScrollFactor(0).setDepth(20);
    this.bossStatusText = this.add.text(VIEW_WIDTH / 2, 92, '', createTextStyle(19, '#ffe29a')).setOrigin(0.5).setScrollFactor(0).setDepth(20);
    const minimapPanel = this.add.rectangle(1160, 70, 220, 96, 0x182334, 0.82).setStrokeStyle(2, 0x7d91aa, 0.75).setScrollFactor(0).setDepth(17);
    const minimapTitle = this.add.text(1060, 32, `미니맵 · ${this.currentMap === null ? '' : MAP_LABELS_KO[this.currentMap.id]}`, createTextStyle(14, '#dcecff')).setScrollFactor(0).setDepth(20);
    const minimapGround = this.add.rectangle(1160, 83, 174, 4, 0x72c59f, 0.9).setScrollFactor(0).setDepth(20);
    this.minimapPlayerMarker = this.add.circle(1110, 78, 5, 0x5bd6ff, 1).setScrollFactor(0).setDepth(21);
    const questPanel = this.add.rectangle(152, 160, 272, 86, 0x182334, 0.82).setStrokeStyle(2, 0x7d91aa, 0.75).setScrollFactor(0).setDepth(17);
    this.questStatusText = this.add.text(28, 128, '', createTextStyle(14, '#e8f0ff')).setScrollFactor(0).setDepth(20).setWordWrapWidth(244);
    const guidePanel = this.add.rectangle(1138, 182, 264, 84, 0x182334, 0.78).setStrokeStyle(2, 0x7d91aa, 0.68).setScrollFactor(0).setDepth(17);
    const guide = this.add.text(1018, 150, '조작\n←→ 이동 · Alt 점프 · ↑ 포탈\nEsc 메뉴 · I/S/K 패널', createTextStyle(13, '#c7d8ee')).setScrollFactor(0).setDepth(20);
    runtime.objects.push(panel, this.hudStatusText, controls, this.bossStatusText, minimapPanel, minimapTitle, minimapGround, this.minimapPlayerMarker, questPanel, this.questStatusText, guidePanel, guide);
    if (this.currentMap !== null) {
      for (const portal of this.currentMap.portals) {
        const marker = this.add.circle(1073 + portal.x / this.currentMap.width * 174, 83, 4, 0xd596ff, 1).setScrollFactor(0).setDepth(21);
        runtime.objects.push(marker);
      }
    }
    const slotKeys = ['1','2','3','4','5','6','7','8','9','0','-'];
    this.actionSlotLabels = [];
    this.actionSlotIcons = [];
    slotKeys.forEach((key, index) => {
      const x = 664 + index * 53;
      const slot = this.add.rectangle(x, HUD_TOP + 90, 46, 38, 0x26354c, 0.94).setStrokeStyle(1, 0x8aa5ca, 0.8).setScrollFactor(0).setDepth(20);
      const skillId = this.profileExtension?.shortcuts.actionSlots[index];
      const iconAsset = getSkillIconAsset(skillId ?? 'basic-shuriken');
      const icon = this.add.image(x, HUD_TOP + 90, iconAsset.textureKey).setDisplaySize(34, 34).setScrollFactor(0).setDepth(21);
      const label = this.add.text(x - 20, HUD_TOP + 70, key, createTextStyle(10, '#ffffff')).setOrigin(0, 0).setScrollFactor(0).setDepth(22);
      this.actionSlotLabels.push(label);
      this.actionSlotIcons.push(icon);
      runtime.objects.push(slot, icon, label);
    });
  }

  private updateCombatHud(): void {
    if (this.character === null || this.mapRuntime === null || this.hudStatusText === null || this.bossStatusText === null) return;
    this.hudStatusText.setText(`HP ${this.character.hp.toLocaleString()} / ${this.character.maxHp.toLocaleString()}   MP ${this.character.mp.toLocaleString()} / ${this.character.maxMp.toLocaleString()}   EXP ${this.character.exp.toLocaleString()} / ${getRequiredExperience(this.character.level).toLocaleString()}   메소 ${this.character.mesos.toLocaleString()}${this.transformed ? '   [구미호 변신]' : ''}`);
    const boss = this.mapRuntime.enemies.find((enemy) => enemy.definition.boss && enemy.alive);
    this.audio.setMusicMode(resolveMusicMode(boss !== undefined));
    this.audio.syncSettings();
    this.bossStatusText.setText(boss === undefined ? '' : `${boss.definition.label}  ${boss.hp.toLocaleString()} / ${boss.definition.hp.toLocaleString()}`);
    if (this.minimapPlayerMarker !== null && this.player !== null && this.currentMap !== null) this.minimapPlayerMarker.x = 1073 + this.player.x / this.currentMap.width * 174;
    if (this.questStatusText !== null && this.profileExtension !== null) {
      const exam = this.profileExtension.quests.jobExam;
      const target = getJobExamTarget(this.character.job);
      const examLine = exam.status === 'none' ? '전직: 메뉴에서 조건 확인' : exam.status === 'ready' ? '전직: 아지트에 완료 보고' : `전직: ${target === null ? '' : getMonster(target.target).label} ${exam.kills}/${target?.count ?? 0}`;
      const expedition = this.character.level < 100 ? '' : `\n원정: ${this.profileExtension.quests.expeditionStage}`;
      this.questStatusText.setText(`다음 목표\n${examLine}${expedition}`);
    }
    const dataset = document.body.dataset;
    dataset[GAMEPLAY_DATASET_KEYS.playerHp] = String(this.character.hp);
    dataset[GAMEPLAY_DATASET_KEYS.playerMp] = String(this.character.mp);
    dataset[GAMEPLAY_DATASET_KEYS.playerExp] = String(this.character.exp);
    dataset[GAMEPLAY_DATASET_KEYS.playerMesos] = String(this.character.mesos);
    dataset[GAMEPLAY_DATASET_KEYS.enemyCount] = String(this.mapRuntime.enemies.length);
    dataset[GAMEPLAY_DATASET_KEYS.enemyAlive] = String(this.mapRuntime.enemies.filter((enemy) => enemy.alive).length);
    dataset[GAMEPLAY_DATASET_KEYS.drops] = String(this.mapRuntime.drops.length);
    dataset[GAMEPLAY_DATASET_KEYS.transformed] = String(this.transformed);
    this.actionSlotLabels.forEach((label, index) => {
      const skillId = this.profileExtension?.shortcuts.actionSlots[index];
      if (skillId !== undefined) {
        label.setText(index === 9 ? '0' : index === 10 ? '-' : String(index + 1));
        this.actionSlotIcons[index]?.setTexture(getSkillIconAsset(skillId).textureKey);
      }
    });
  }

  private createEnduranceObstacles(runtime: MapRuntime): void {
    for (let index = 0; index < 10; index += 1) {
      const baseX = 300 + (index % 5) * 300;
      const baseY = 1190 - Math.floor(index / 5) * 350 - (index % 2) * 60;
      const obstacle = this.add.rectangle(baseX, baseY, 54, 18, 0xff7b6e, 0.88).setStrokeStyle(2, 0xffd0c8, 0.9).setDepth(4);
      this.physics.add.existing(obstacle);
      const body = obstacle.body;
      if (body instanceof Phaser.Physics.Arcade.Body) {
        body.setAllowGravity(false);
        body.setImmovable(true);
      }
      runtime.objects.push(obstacle);
      if (this.player !== null) runtime.colliders.push(this.physics.add.collider(this.player, obstacle));
      const tween = this.tweens.add({ targets: obstacle, x: baseX + (index % 2 === 0 ? 120 : -120), duration: 1500 + index * 90, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      runtime.tweens.push(tween);
    }
  }

  private shouldCollideWithOneWayPlatform(
    object: Phaser.GameObjects.Rectangle,
    platform: PlatformDef,
  ): boolean {
    if (
      this.player === null ||
      this.player.isIgnoringPlatform(platform.id) ||
      this.player.isClimbing()
    ) {
      return false;
    }

    const playerBody = this.requirePlayerBody();
    const platformBody = object.body;
    if (!(platformBody instanceof Phaser.Physics.Arcade.StaticBody)) {
      return false;
    }

    if (playerBody.velocity.y < 0) {
      return false;
    }

    const previousBottom = playerBody.prev.y + playerBody.height;
    return previousBottom <= platformBody.top + ONE_WAY_LANDING_TOLERANCE;
  }

  private findOverlappingPortal(): PortalRuntime | null {
    if (this.player === null || this.mapRuntime === null) {
      return null;
    }

    const player = this.player;
    const overlapping = this.mapRuntime.portalRuntimes.filter((portal) =>
      this.physics.overlap(player, portal.object),
    );
    if (overlapping.length === 0) {
      return null;
    }

    return overlapping.reduce((closest, portal) => {
      const closestDistance = Phaser.Math.Distance.Between(
        player.x,
        player.y,
        closest.object.x,
        closest.object.y,
      );
      const portalDistance = Phaser.Math.Distance.Between(
        player.x,
        player.y,
        portal.object.x,
        portal.object.y,
      );
      return portalDistance < closestDistance ? portal : closest;
    });
  }

  private updateCamera(): void {
    if (this.player === null || this.currentMap === null) {
      return;
    }

    const scroll = resolveCameraScroll(
      this.player.x,
      this.player.y,
      this.currentMap.width,
      this.currentMap.height,
    );
    this.cameras.main.setScroll(scroll.x, scroll.y);
  }

  private persistCurrentPosition(): void {
    if (
      this.repository === null ||
      this.activeSlot === null ||
      this.player === null ||
      this.currentMap === null
    ) {
      return;
    }

    const x = Math.round(this.player.x);
    const y = Math.round(this.player.y);
    const positionKey = `${this.currentMap.id}:${x}:${y}`;
    if (positionKey === this.lastSavedPositionKey) {
      return;
    }

    const result = this.repository.savePosition(
      this.activeSlot,
      this.currentMap.id,
      x,
      y,
    );
    if (!result.ok || this.character === null) {
      return;
    }

    this.lastSavedPositionKey = positionKey;
    this.character = {
      ...this.character,
      positions: {
        ...this.character.positions,
        [this.currentMap.id]: { x, y },
      },
    };
  }

  private showFeedback(message: string): void {
    if (this.feedbackText === null) {
      return;
    }

    this.feedbackText.setText(message);
    this.feedbackDeadlineMs = this.time.now + FEEDBACK_DURATION_MS;
  }

  private updateFeedback(nowMs: number): void {
    if (this.feedbackText === null || this.feedbackText.text.length === 0) {
      return;
    }

    if (nowMs < this.feedbackDeadlineMs) {
      return;
    }

    this.feedbackText.setText("");
  }

  private updateMapTitle(map: MapDef): void {
    if (this.mapTitleText === null || this.character === null) {
      return;
    }

    this.mapTitleText.setText(
      `현재 맵: ${MAP_LABELS_KO[map.id]} · Lv.${this.character.level} ${this.character.nickname}`,
    );
  }

  private updateDataset(mapId: MapId): void {
    if (this.character === null) {
      return;
    }

    const dataset = document.body.dataset;
    dataset[GAMEPLAY_DATASET_KEYS.activeNickname] = this.character.nickname;
    dataset[GAMEPLAY_DATASET_KEYS.activeLevel] = String(this.character.level);
    dataset[GAMEPLAY_DATASET_KEYS.currentMap] = mapId;
    dataset[GAMEPLAY_DATASET_KEYS.portalAsset] = PORTAL_TEXTURE_KEY;
    dataset[GAMEPLAY_DATASET_KEYS.backgroundAsset] = getMapBackgroundAsset(mapId).textureKey;
    dataset[GAMEPLAY_DATASET_KEYS.playerAsset] = PLAYER_TEXTURE_KEY;
  }

  private registerLifecycleHooks(): void {
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      const closeOverlay = this.overlayClose;
      this.overlayClose = null;
      closeOverlay?.();
      this.persistCurrentPosition();
      this.destroyCurrentMapRuntime();
      this.feedbackText?.destroy();
      this.mapTitleText?.destroy();
      this.repository = null;
      this.activeSlot = null;
      this.character = null;
      this.currentMap = null;
      this.gameplayInput = null;
      this.latestIntent = createNeutralGameplayIntent();
      this.feedbackText = null;
      this.mapTitleText = null;
      this.profileExtension = null;
      this.audio.close();
      this.hudStatusText = null;
      this.bossStatusText = null;
      this.questStatusText = null;
      this.minimapPlayerMarker = null;
      this.actionSlotLabels = [];
      this.actionSlotIcons = [];
      this.lastSkillEffect = null;
      clearGameplayDataset();
      const gameplayWindow = window as Window & {
        render_game_to_text?: () => string;
        advanceTime?: (milliseconds: number) => Promise<void>;
      };
      delete gameplayWindow.render_game_to_text;
      delete gameplayWindow.advanceTime;
    });
  }

  private destroyCurrentMapRuntime(): void {
    if (this.mapRuntime === null) {
      return;
    }

    for (const collider of this.mapRuntime.colliders) {
      collider.destroy();
    }

    for (const timer of this.mapRuntime.timers) {
      timer.remove(false);
    }

    for (const tween of this.mapRuntime.tweens) {
      tween.remove();
    }

    for (const object of this.mapRuntime.objects) {
      object.destroy();
    }

    this.mapRuntime = null;
    this.player = null;
    // 데이터셋은 Scene 종료 때 지워지므로 캐시를 함께 비워 재진입 시 다시 쓰게 한다.
    this.statsSignature = "";
  }

  private requirePlayerBody(): Phaser.Physics.Arcade.Body {
    if (
      this.player === null ||
      !(this.player.body instanceof Phaser.Physics.Arcade.Body)
    ) {
      throw new Error("플레이어 바디를 사용할 수 없습니다.");
    }
    return this.player.body;
  }
}

function resolveSceneMapId(
  sceneMapId: MapId | undefined,
  storedMapId: string | undefined,
): MapId {
  if (sceneMapId !== undefined) {
    return sceneMapId;
  }

  if (storedMapId !== undefined && Object.hasOwn(MAP_DEFS, storedMapId)) {
    return storedMapId as MapId;
  }

  return "cuning-city";
}

function createNeutralPlayerIntent(): PlayerIntent {
  return {
    horizontal: 0,
    jumpPressed: false,
    attackPressed: false,
    downHeld: false,
    upHeld: false,
  };
}

function createNeutralGameplayIntent(): GameplayIntent {
  return {
    ...createNeutralPlayerIntent(),
    interactPressed: false,
    skillPressed: null,
    collectPressed: false,
    menuPressed: false,
    inventoryPressed: false,
    statsPressed: false,
    skillMenuPressed: false,
  };
}

function getBlockedPortalMessage(
  reason:
    "level-too-low" | "level-too-high" | "portal-hidden" | "exam-required",
): string {
  switch (reason) {
    case "level-too-low":
      return "레벨이 부족해 아직 들어갈 수 없습니다.";
    case "level-too-high":
      return "현재 레벨로는 이 포탈을 사용할 수 없습니다.";
    case "portal-hidden":
      return "아직 모습을 드러내지 않은 포탈입니다.";
    case "exam-required":
      return "활성 전직 시험이 있을 때만 사용할 수 있습니다.";
  }
}

function jobRank(job: StoredCharacterV2['job']): number {
  return ({ novice: 0, rogue: 1, assassin: 2, hermit: 3, hokage: 4 } as const)[job];
}

function skillRequiredRank(skillId: SkillId): number {
  if (skillId === 'basic-shuriken') return 0;
  if (skillId === 'lucky-seven' || skillId === 'shadow-barrage' || skillId === 'keen-eyesight') return 1;
  if (skillId === 'drain' || skillId === 'phantom-dual-star' || skillId === 'critical-throw') return 2;
  if (skillId === 'avenger' || skillId === 'abyss-rain' || skillId === 'shadow-breathing') return 3;
  return 4;
}

function unlockJobSkills(skills: Record<string, number>, job: StoredCharacterV2['job']): Record<string, number> {
  const next = { ...skills };
  for (const skillId of Object.keys(SKILL_LABELS_KO) as SkillId[]) {
    if (skillRequiredRank(skillId) <= jobRank(job) && (next[skillId] ?? 0) === 0) next[skillId] = 1;
  }
  return next;
}

function toPortalExpeditionStage(stage: RuntimeProfileExtension['quests']['expeditionStage']): 'none' | 'midboss' | 'upperboss' {
  if (stage === 'midboss') return 'midboss';
  if (stage === 'upperboss' || stage === 'finalboss' || stage === 'report' || stage === 'complete') return 'upperboss';
  return 'none';
}
