import Phaser from "phaser";
import {
  VIEW_HEIGHT,
  VIEW_WIDTH,
  clampCameraCenter,
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
import { focusGameCanvas } from "../ui/dom-overlay";
import {
  clearGameplayDataset,
  createProfileRepository,
  createTextStyle,
} from "./shared";

const BACKGROUND_COLOR = 0x101522;
const BACKDROP_COLOR = 0x132138;
const MAP_SURFACE_COLOR = 0x2f6d54;
const PLATFORM_COLOR = 0x75c6a2;
const ROPE_COLOR = 0xd4c082;
const PORTAL_FRAME_COLOR = 0x79b8ff;
const PORTAL_FILL_COLOR = 0x203c72;
const PORTAL_LABEL_OFFSET_Y = 18;
const FEEDBACK_DURATION_MS = 1500;
const POSITION_SAVE_INTERVAL_MS = 500;
const ONE_WAY_LANDING_TOLERANCE = 12;

interface GameplaySceneData {
  mapId?: MapId;
  spawnPortalId?: string;
}

interface PortalRuntime {
  definition: PortalDef;
  object: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
}

interface MapRuntime {
  objects: Phaser.GameObjects.GameObject[];
  colliders: Phaser.Physics.Arcade.Collider[];
  timers: Phaser.Time.TimerEvent[];
  portalRuntimes: PortalRuntime[];
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

    this.gameplayInput = createGameplayInput(this);
    this.feedbackText = this.add
      .text(24, 24, "", createTextStyle(18, "#ffd3d3"))
      .setDepth(20)
      .setScrollFactor(0);
    this.mapTitleText = this.add
      .text(24, 54, "", createTextStyle(18, "#dbe7ff"))
      .setDepth(20)
      .setScrollFactor(0);

    this.buildMapRuntime(data);
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
    this.player.update(time, delta);
    this.handlePortalInteraction();
    this.updateCamera();
    this.updateFeedback(time);
    this.updatePlayerCoordinates();
  }

  private updatePlayerCoordinates(): void {
    if (this.player === null) {
      return;
    }

    const x = String(Math.round(this.player.x));
    const y = String(Math.round(this.player.y));
    if (document.body.dataset.playerX !== x) {
      document.body.dataset.playerX = x;
    }

    if (document.body.dataset.playerY !== y) {
      document.body.dataset.playerY = y;
    }
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
      portalRuntimes: [],
    };

    runtime.objects.push(
      this.add.rectangle(
        map.width / 2,
        map.height / 2,
        map.width,
        map.height,
        BACKDROP_COLOR,
        1,
      ),
    );

    const groundHeight = Math.max(PLATFORM_THICKNESS, map.height - map.groundY);
    const ground = this.add.rectangle(
      map.width / 2,
      map.groundY + groundHeight / 2,
      map.width,
      groundHeight,
      MAP_SURFACE_COLOR,
      1,
    );
    runtime.objects.push(ground);
    this.physics.add.existing(ground, true);

    this.player = new Player(this, spawn.x, spawn.y, map, () =>
      this.getPlayerIntent(),
    );
    runtime.objects.push(this.player);
    runtime.colliders.push(this.physics.add.collider(this.player, ground));

    for (const platform of map.platforms) {
      const platformObject = this.add.rectangle(
        platform.x + platform.width / 2,
        platform.y + PLATFORM_THICKNESS / 2,
        platform.width,
        PLATFORM_THICKNESS,
        PLATFORM_COLOR,
        1,
      );
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
          ROPE_COLOR,
          1,
        ),
      );
    }

    for (const portal of map.portals) {
      if (!isPortalVisible(portal, "none")) {
        continue;
      }

      const portalObject = this.add
        .rectangle(
          portal.x + portal.width / 2,
          portal.y - portal.height / 2,
          portal.width,
          portal.height,
          PORTAL_FILL_COLOR,
          0.9,
        )
        .setStrokeStyle(3, PORTAL_FRAME_COLOR)
        .setInteractive({ cursor: "pointer" });
      this.physics.add.existing(portalObject, true);
      const label = this.add
        .text(
          portal.x + portal.width / 2,
          portal.y - portal.height - PORTAL_LABEL_OFFSET_Y,
          MAP_LABELS_KO[portal.targetMapId],
          createTextStyle(16, "#f4fbff"),
        )
        .setOrigin(0.5, 1);

      runtime.objects.push(portalObject, label);
      runtime.portalRuntimes.push({
        definition: portal,
        object: portalObject,
        label,
      });
    }

    runtime.timers.push(
      this.time.addEvent({
        delay: POSITION_SAVE_INTERVAL_MS,
        loop: true,
        callback: () => this.persistCurrentPosition(),
      }),
    );

    this.mapRuntime = runtime;
    this.updateDataset(map.id);
    this.updateMapTitle(map);
    this.persistCurrentPosition();
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
      expeditionStage: "none",
      activeExam: false,
    });
    if (!access.ok) {
      this.showFeedback(getBlockedPortalMessage(access.reason));
      return;
    }

    this.inputLocked = true;
    this.persistCurrentPosition();

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
      downHeld: this.latestIntent.downHeld,
      upHeld: this.latestIntent.upHeld,
    };
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

    const center = clampCameraCenter(
      this.player.x,
      this.player.y,
      this.currentMap.width,
      this.currentMap.height,
    );
    this.cameras.main.setScroll(
      center.x - VIEW_WIDTH / 2,
      Math.max(0, center.y - VIEW_HEIGHT / 2),
    );
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

    document.body.dataset.activeNickname = this.character.nickname;
    document.body.dataset.activeLevel = String(this.character.level);
    document.body.dataset.currentMap = mapId;
  }

  private registerLifecycleHooks(): void {
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
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
      clearGameplayDataset();
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

    for (const object of this.mapRuntime.objects) {
      object.destroy();
    }

    this.mapRuntime = null;
    this.player = null;
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
    downHeld: false,
    upHeld: false,
  };
}

function createNeutralGameplayIntent(): GameplayIntent {
  return {
    ...createNeutralPlayerIntent(),
    interactPressed: false,
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
