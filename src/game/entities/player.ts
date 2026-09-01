import Phaser from 'phaser';
import {
  PLAYER_ANIMATION_FRAMES,
  PLAYER_TEXTURE_KEY,
  PLAYER_VISUAL_LAYOUT,
  resolvePlayerFrameAlignment,
  type PlayerFacingDirection
} from '../assets/character-assets';
import { GAME_GRAVITY_Y } from '../config';
import { applyGravity, canStartJump, JUMP_VELOCITY, stepHorizontalVelocity, type HorizontalInput } from './movement-rules';
import { nextState, type PlayerState } from './player-states';
import { findDropThroughPlatform, isOnRope, nearestRope } from '../maps/map-rules';
import type { MapDef, RopeDef } from '../maps/types';

const PLAYER_ATTACK_DURATION_MS = 360;
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
  attackPressed: boolean;
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
  attackUntilMs: number;
  skillUntilMs: number;
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
  attackUntilMs: number;
  skillUntilMs: number;
}

export class Player extends ArcadeSpriteBase {
  private readonly getIntentCallback: () => PlayerIntent;

  private currentMap: MapDef;

  private runtime: PlayerRuntimeState = createInitialRuntimeState();

  private facingDirection: PlayerFacingDirection = 1;

  private readonly onBasicAttack: ((x: number, y: number, direction: -1 | 1) => void) | null;

  public constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    map: MapDef,
    getIntent: () => PlayerIntent,
    onBasicAttack: ((x: number, y: number, direction: -1 | 1) => void) | null = null
  ) {
    ensurePlayerAnimations(scene);
    super(scene, x, y, PLAYER_TEXTURE_KEY);
    this.getIntentCallback = getIntent;
    this.currentMap = map;
    this.onBasicAttack = onBasicAttack;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.requireBody();
    body.setSize(PLAYER_VISUAL_LAYOUT.bodyWidth, PLAYER_VISUAL_LAYOUT.bodyHeight);
    body.setOffset(PLAYER_VISUAL_LAYOUT.bodyOffsetX, PLAYER_VISUAL_LAYOUT.bodyOffsetY);
    body.setCollideWorldBounds(true);
    body.setAllowGravity(false);
    body.setGravityY(GAME_GRAVITY_Y);
    body.setMaxVelocity(Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER);
    this.setOrigin(PLAYER_VISUAL_LAYOUT.originX, PLAYER_VISUAL_LAYOUT.originY);
    this.setDisplaySize(
      PLAYER_VISUAL_LAYOUT.displayWidth,
      PLAYER_VISUAL_LAYOUT.displayHeight
    );
    this.playAnimation('idle');
    this.applyFrameAlignment();
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

  public beginSkill(nowMs: number, durationMs: number): void {
    this.runtime = {
      ...this.runtime,
      attackUntilMs: 0,
      skillUntilMs: nowMs + Math.max(1, durationMs)
    };
  }

  public override update(time: number, delta: number): void {
    const body = this.requireBody();
    const intent = this.getIntentCallback();
    const previousState = this.runtime.movementState;
    const result = runPlayerStep({
      body: toBodyLike(body),
      map: this.currentMap,
      intent,
      dtSeconds: delta / 1000,
      nowMs: time,
      runtime: this.runtime
    });

    body.setVelocity(body.velocity.x, body.velocity.y);
    this.runtime = result;
    if (intent.horizontal !== 0) {
      this.facingDirection = intent.horizontal;
    }
    this.setFlipX(this.facingDirection < 0);
    this.applyVisualState(result.movementState);
    this.applyFrameAlignment();

    if (previousState !== 'attack' && result.movementState === 'attack') {
      this.onBasicAttack?.(this.x, this.y, this.facingDirection);
    }
  }

  private applyVisualState(state: PlayerState): void {
    if (state === 'idle' || state === 'walk' || state === 'attack' || state === 'skill') {
      this.playAnimation(state === 'skill' ? 'attack' : state);
      return;
    }

    if (state === 'jump') {
      this.playAnimation('jump');
      return;
    }

    this.anims.stop();
    this.setFrame(
      state === 'fall' ? PLAYER_ANIMATION_FRAMES.fall[0]! : PLAYER_ANIMATION_FRAMES.idle[0]!
    );
  }

  private playAnimation(name: 'idle' | 'walk' | 'jump' | 'attack'): void {
    this.anims.play(`player-${name}`, true);
  }

  private applyFrameAlignment(): void {
    const frameIndex = Number(this.frame.name);
    const frameOrigin = Number.isInteger(frameIndex)
      ? resolvePlayerFrameAlignment(frameIndex, this.facingDirection)
      : undefined;
    if (frameOrigin === undefined) {
      return;
    }

    this.setOrigin(frameOrigin.x, PLAYER_VISUAL_LAYOUT.originY);
    this.requireBody().setOffset(
      frameOrigin.bodyOffsetX,
      PLAYER_VISUAL_LAYOUT.bodyOffsetY
    );
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
    ignoredPlatformBottomY: null,
    attackUntilMs: 0,
    skillUntilMs: 0
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
  const jumpStarted = intent.jumpPressed && canStartJump(onGround, intent.downHeld);
  const attackUntilMs = resolveAttackUntilMs(runtime.attackUntilMs, intent.attackPressed, jumpStarted, nowMs);
  const skillUntilMs = runtime.skillUntilMs > nowMs ? runtime.skillUntilMs : 0;

  if (runtime.climbingRopeId !== null) {
    if (intent.horizontal !== 0 || intent.jumpPressed) {
      body.velocity.x = 0;
      body.velocity.y = 0;
      return updateState(runtime, onGround, body.velocity.y, intent.horizontal, false, false, 0, false, 0);
    }

    const activeRope = map.ropes.find((rope) => rope.id === runtime.climbingRopeId);
    if (activeRope !== undefined && isOnRope(footX, footY, activeRope)) {
      body.velocity.x = 0;
      body.x = activeRope.x - body.width / 2;
      body.velocity.y = resolveClimbVelocity(intent, footY, activeRope);
      body.y = clampClimbBodyY(body, dtSeconds, activeRope);
      return updateState(runtime, false, body.velocity.y, 0, true, false, 0, false, 0);
    }
  }

  const rope = resolveRopeForIntent(footX, footY, map, intent);
  if (rope !== null) {
    body.velocity.x = 0;
    body.x = rope.x - body.width / 2;
    body.velocity.y = resolveClimbVelocity(intent, footY, rope);
    body.y = clampClimbBodyY(body, dtSeconds, rope);
    return updateState({ ...runtime, climbingRopeId: rope.id }, false, body.velocity.y, 0, true, false, 0, false, 0);
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
      }, false, body.velocity.y, intent.horizontal, false, false, 0, false, 0);
    }
  }

  if (jumpStarted) {
    body.velocity.y = JUMP_VELOCITY;
  } else {
    body.velocity.y = applyGravity(body.velocity.y, dtSeconds);
  }

  return updateState(
    runtime,
    jumpStarted ? false : body.blocked.down || body.touching.down,
    body.velocity.y,
    intent.horizontal,
    false,
    attackUntilMs > nowMs,
    attackUntilMs,
    skillUntilMs > nowMs,
    skillUntilMs
  );
}

function ensurePlayerAnimations(scene: Phaser.Scene): void {
  createAnimation(scene, 'idle', PLAYER_ANIMATION_FRAMES.idle, 4, -1);
  createAnimation(scene, 'walk', PLAYER_ANIMATION_FRAMES.walk, 8, -1);
  createAnimation(scene, 'jump', PLAYER_ANIMATION_FRAMES.jump, 8, 0);
  createAnimation(scene, 'attack', PLAYER_ANIMATION_FRAMES.attack, 12, 0);
}

function createAnimation(
  scene: Phaser.Scene,
  name: 'idle' | 'walk' | 'jump' | 'attack',
  frames: readonly number[],
  frameRate: number,
  repeat: number
): void {
  const key = `player-${name}`;
  if (scene.anims.exists(key)) {
    return;
  }

  scene.anims.create({
    key,
    frames: scene.anims.generateFrameNumbers(PLAYER_TEXTURE_KEY, { frames: [...frames] }),
    frameRate,
    repeat
  });
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

function resolveAttackUntilMs(
  currentDeadlineMs: number,
  attackPressed: boolean,
  jumpStarted: boolean,
  nowMs: number
): number {
  if (jumpStarted) {
    return 0;
  }

  if (attackPressed && currentDeadlineMs <= nowMs) {
    return nowMs + PLAYER_ATTACK_DURATION_MS;
  }

  return currentDeadlineMs > nowMs ? currentDeadlineMs : 0;
}

function updateState(
  runtime: PlayerRuntimeState,
  onGround: boolean,
  vy: number,
  horizontalInput: HorizontalInput,
  climbing: boolean,
  attacking: boolean,
  attackUntilMs: number,
  skilling: boolean,
  skillUntilMs: number
): PlayerStepResult {
  return {
    ...runtime,
    climbingRopeId: climbing ? runtime.climbingRopeId : null,
    attackUntilMs,
    skillUntilMs,
    movementState: nextState(runtime.movementState, {
      onGround,
      vy,
      horizontalInput,
      climbing,
      attacking,
      skilling
    })
  };
}
