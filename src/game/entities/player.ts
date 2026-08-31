import Phaser from 'phaser';
import { GAME_GRAVITY_Y } from '../config';
import { applyGravity, canStartJump, JUMP_VELOCITY, stepHorizontalVelocity, type HorizontalInput } from './movement-rules';
import { nextState, type PlayerState } from './player-states';
import { findDropThroughPlatform, isOnRope, nearestRope } from '../maps/map-rules';
import type { MapDef, RopeDef } from '../maps/types';

const PLAYER_TEXTURE_KEY = 'runtime-player-rect';
const PLAYER_WIDTH = 36;
const PLAYER_HEIGHT = 52;
const PLAYER_COLOR = 0x9fe5c2;
const CLIMB_SPEED = 180;
const DROP_THROUGH_DURATION_MS = 250;
const DROP_THROUGH_CLEARANCE_PX = 4;

class PlayerSpriteFallback {
  public constructor(..._args: unknown[]) {}
}

const ArcadeSpriteBase = (Phaser.Physics?.Arcade?.Sprite ?? PlayerSpriteFallback) as unknown as typeof Phaser.Physics.Arcade.Sprite;

export interface PlayerIntent {
  horizontal: HorizontalInput;
  jumpPressed: boolean;
  downHeld: boolean;
  upHeld: boolean;
}

export interface PlayerBodyLike {
  x: number;
  y: number;
  width: number;
  height: number;
  velocity: {
    x: number;
    y: number;
  };
  blocked: {
    down: boolean;
  };
  touching: {
    down: boolean;
  };
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max));
}

export interface PlayerRuntimeState {
  movementState: PlayerState;
  climbingRopeId: string | null;
  ignoredOneWayPlatformId: string | null;
  ignoreOneWayUntilMs: number;
  ignoredPlatformBottomY: number | null;
}

export interface PlayerStepContext {
  body: PlayerBodyLike;
  map: MapDef;
  intent: PlayerIntent;
  dtSeconds: number;
  nowMs: number;
  runtime: PlayerRuntimeState;
}

export interface PlayerStepIntentContext {
  body: PlayerBodyLike;
  map: MapDef;
  getIntent: () => PlayerIntent;
  dtSeconds: number;
  nowMs: number;
  runtime: PlayerRuntimeState;
}

export interface PlayerStepResult {
  movementState: PlayerState;
  climbingRopeId: string | null;
  ignoredOneWayPlatformId: string | null;
  ignoreOneWayUntilMs: number;
  ignoredPlatformBottomY: number | null;
}

export class Player extends ArcadeSpriteBase {
  private readonly getIntentCallback: () => PlayerIntent;

  private currentMap: MapDef;

  private runtime: PlayerRuntimeState = createInitialRuntimeState();

  public constructor(scene: Phaser.Scene, x: number, y: number, map: MapDef, getIntent: () => PlayerIntent) {
    ensurePlayerTexture(scene);
    super(scene, x, y, PLAYER_TEXTURE_KEY);
    this.getIntentCallback = getIntent;
    this.currentMap = map;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.requireBody();
    body.setSize(PLAYER_WIDTH, PLAYER_HEIGHT);
    body.setOffset(0, 0);
    body.setCollideWorldBounds(true);
    body.setAllowGravity(false);
    body.setGravityY(GAME_GRAVITY_Y);
    body.setMaxVelocity(Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER);
    this.setOrigin(0.5, 1);
    this.setDisplaySize(PLAYER_WIDTH, PLAYER_HEIGHT);
  }

  public setMap(map: MapDef): void {
    this.currentMap = map;
    this.runtime = createInitialRuntimeState(this.runtime.movementState);
  }

  public getState(): PlayerState {
    return this.runtime.movementState;
  }

  public isIgnoringPlatform(platformId: string): boolean {
    return this.runtime.ignoredOneWayPlatformId === platformId;
  }

  public isClimbing(): boolean {
    return this.runtime.climbingRopeId !== null;
  }

  public override update(time: number, delta: number): void {
    const body = this.requireBody();
    const result = runPlayerStepWithIntent({
      body: toBodyLike(body),
      map: this.currentMap,
      getIntent: this.getIntentCallback,
      dtSeconds: delta / 1000,
      nowMs: time,
      runtime: this.runtime
    });

    body.setVelocity(body.velocity.x, body.velocity.y);
    this.runtime = result;
  }

  private requireBody(): Phaser.Physics.Arcade.Body {
    const body = this.body;
    if (!(body instanceof Phaser.Physics.Arcade.Body)) {
      throw new Error('플레이어 바디를 사용할 수 없습니다.');
    }
    return body;
  }
}

export function createInitialRuntimeState(movementState: PlayerState = 'idle'): PlayerRuntimeState {
  return {
    movementState,
    climbingRopeId: null,
    ignoredOneWayPlatformId: null,
    ignoreOneWayUntilMs: 0,
    ignoredPlatformBottomY: null
  };
}

/** SPEC §6.1 이동 규칙과 §14 수명 규칙을 따르는 1프레임 계산기다. */
export function runPlayerStepWithIntent(context: PlayerStepIntentContext): PlayerStepResult {
  return runPlayerStep({
    body: context.body,
    map: context.map,
    intent: context.getIntent(),
    dtSeconds: context.dtSeconds,
    nowMs: context.nowMs,
    runtime: context.runtime
  });
}

export function runPlayerStep(context: PlayerStepContext): PlayerStepResult {
  const { body, map, intent, dtSeconds, nowMs } = context;
  const onGround = body.blocked.down || body.touching.down;
  const footX = body.x + body.width / 2;
  const footY = body.y + body.height;
  const runtime = clearExpiredDropThrough(context.runtime, footY, nowMs);

  if (runtime.climbingRopeId !== null) {
    if (intent.horizontal !== 0 || intent.jumpPressed) {
      body.velocity.x = 0;
      body.velocity.y = 0;
      return updateState(runtime, onGround, body.velocity.y, intent.horizontal, false);
    }

    const activeRope = map.ropes.find((rope) => rope.id === runtime.climbingRopeId);
    if (activeRope !== undefined && isOnRope(footX, footY, activeRope)) {
      body.velocity.x = 0;
      body.x = activeRope.x - body.width / 2;
      body.velocity.y = resolveClimbVelocity(intent, footY, activeRope);
      body.y = clampClimbBodyY(body, dtSeconds, activeRope);
      return updateState(runtime, false, body.velocity.y, 0, true);
    }
  }

  const rope = resolveRopeForIntent(footX, footY, map, intent);
  if (rope !== null) {
    body.velocity.x = 0;
    body.x = rope.x - body.width / 2;
    body.velocity.y = resolveClimbVelocity(intent, footY, rope);
    body.y = clampClimbBodyY(body, dtSeconds, rope);
    return updateState({ ...runtime, climbingRopeId: rope.id }, false, body.velocity.y, 0, true);
  }

  body.velocity.x = stepHorizontalVelocity(body.velocity.x, intent.horizontal, onGround, dtSeconds);

  if (intent.downHeld && intent.jumpPressed && onGround) {
    const dropPlatform = findDropThroughPlatform(footX, footY, map);
    if (dropPlatform !== null) {
      body.velocity.y = Math.max(body.velocity.y, 1);
      return updateState({
        ...runtime,
        ignoredOneWayPlatformId: dropPlatform.id,
        ignoreOneWayUntilMs: nowMs + DROP_THROUGH_DURATION_MS,
        ignoredPlatformBottomY: dropPlatform.y + DROP_THROUGH_CLEARANCE_PX
      }, false, body.velocity.y, intent.horizontal, false);
    }
  }

  if (intent.jumpPressed && canStartJump(onGround, intent.downHeld)) {
    body.velocity.y = JUMP_VELOCITY;
  } else {
    body.velocity.y = applyGravity(body.velocity.y, dtSeconds);
  }

  return updateState(runtime, body.blocked.down || body.touching.down, body.velocity.y, intent.horizontal, false);
}

function ensurePlayerTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists(PLAYER_TEXTURE_KEY)) {
    return;
  }

  const graphics = scene.add.graphics();
  graphics.fillStyle(PLAYER_COLOR, 1);
  graphics.fillRect(0, 0, PLAYER_WIDTH, PLAYER_HEIGHT);
  graphics.generateTexture(PLAYER_TEXTURE_KEY, PLAYER_WIDTH, PLAYER_HEIGHT);
  graphics.destroy();
}

function toBodyLike(body: Phaser.Physics.Arcade.Body): PlayerBodyLike {
  return body as unknown as PlayerBodyLike;
}

function resolveRopeForIntent(x: number, y: number, map: MapDef, intent: PlayerIntent): RopeDef | null {
  if (!intent.upHeld) {
    return null;
  }

  return nearestRope(x, y, map);
}

function resolveClimbVelocity(intent: PlayerIntent, footY: number, rope: RopeDef): number {
  if (intent.upHeld && footY > rope.topY) {
    return -CLIMB_SPEED;
  }

  if (intent.downHeld && footY < rope.bottomY) {
    return CLIMB_SPEED;
  }

  return 0;
}

function clampClimbBodyY(body: PlayerBodyLike, dtSeconds: number, rope: RopeDef): number {
  const nextTopY = body.y + body.velocity.y * dtSeconds;
  const minTopY = rope.topY - body.height;
  const maxTopY = rope.bottomY - body.height;
  return clampNumber(nextTopY, minTopY, maxTopY);
}

function clearExpiredDropThrough(runtime: PlayerRuntimeState, footY: number, nowMs: number): PlayerRuntimeState {
  if (runtime.ignoredOneWayPlatformId === null) {
    return runtime;
  }

  const ignoreExpiredByTime = nowMs >= runtime.ignoreOneWayUntilMs;
  const ignoreExpiredByHeight = runtime.ignoredPlatformBottomY !== null && footY > runtime.ignoredPlatformBottomY;
  if (!ignoreExpiredByTime && !ignoreExpiredByHeight) {
    return runtime;
  }

  return {
    ...runtime,
    ignoredOneWayPlatformId: null,
    ignoreOneWayUntilMs: 0,
    ignoredPlatformBottomY: null
  };
}

function updateState(
  runtime: PlayerRuntimeState,
  onGround: boolean,
  vy: number,
  horizontalInput: HorizontalInput,
  climbing: boolean
): PlayerStepResult {
  return {
    ...runtime,
    climbingRopeId: climbing ? runtime.climbingRopeId : null,
    movementState: nextState(runtime.movementState, {
      onGround,
      vy,
      horizontalInput,
      climbing
    })
  };
}
