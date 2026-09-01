import { expect, test } from '@playwright/test';
import {
  CORRUPT_SLOT_KEY,
  STORED_PROFILE_KEY,
  attachErrorGuards,
  createCharacter,
  enterGameplay,
  login,
  openIntroPage,
  openLoginPage,
  pressInteract,
  readMapRuntimeStats,
  readPlayerX,
  readActiveLevel,
  startFreshCharacter,
  waitForMap,
  waitForPositionSave,
  walkUntilX
} from './support';

const NICKNAME = 'e2ekern';
/** 커닝시티 첫 스폰(x=140)에서 아지트 포탈(중심 x=308)까지 걷는 목표 지점. */
const HIDEOUT_PORTAL_X = 300;
/** 두 포탈 사이 안전 지대(아지트 포탈 끝 336 ~ 동굴 포탈 시작 520). */
const OPEN_GROUND_X = 430;

test.describe('P0~P2 핵심 루프', () => {
  test('인트로→로그인→생성→선택→Gameplay 진입과 Canvas 포커스', async ({ page }) => {
    const problems = attachErrorGuards(page);

    await openIntroPage(page);
    await expect(page).toHaveTitle('월영전령: 심연의 기록');
    await expect.poll(() => page.evaluate(() => document.body.dataset.gameTitle)).toBe('월영전령: 심연의 기록');
    await expect(page.getByRole('heading', { name: /월영전령/ })).toBeVisible();
    const loreButton = page.locator('button[aria-controls="intro-lore"]');
    await loreButton.click();
    await expect(page.getByRole('heading', { name: '심연의 기록', exact: true })).toBeVisible();
    await expect(loreButton).toHaveAttribute('aria-expanded', 'true');
    await page.screenshot({ path: 'artifacts/e2e/game-intro.png' });
    await page.getByRole('button', { name: '게임 시작' }).click();
    const loginPanel = page.getByRole('dialog', { name: '기록에 접속하기' });
    await expect(loginPanel).toBeVisible();
    await loginPanel.getByLabel('암호문').fill('visible-password-check');
    await loginPanel.getByRole('button', { name: '표시' }).click();
    await expect(loginPanel.getByLabel('암호문')).toHaveAttribute('type', 'text');
    await loginPanel.getByRole('button', { name: '숨기기' }).click();
    await expect(loginPanel.getByLabel('암호문')).toHaveAttribute('type', 'password');
    await page.screenshot({ path: 'artifacts/e2e/game-title-login.png' });
    await login(page);
    await createCharacter(page, NICKNAME);
    await enterGameplay(page, 1);

    await expect
      .poll(() => page.evaluate(() => document.body.dataset.activeNickname))
      .toBe(NICKNAME);
    // HUD 데이터와 저장 슬롯이 같은 값을 가리켜야 한다(SPEC §5.3, §10).
    const storedLevel = await page.evaluate(
      (profileKey) => Number(JSON.parse(window.localStorage.getItem(profileKey) ?? '{}').level),
      STORED_PROFILE_KEY
    );
    expect(Number(await readActiveLevel(page))).toBe(storedLevel);
    expect(storedLevel).toBeGreaterThan(0);
    expect(await page.evaluate(() => document.body.dataset.portalAsset)).toBe(
      'map-portal-arch-tripo'
    );
    expect(await page.evaluate(() => document.body.dataset.backgroundAsset)).toBe(
      'map-background-cuning-city-v1'
    );
    expect(await page.evaluate(() => document.body.dataset.playerAsset)).toBe(
      'player-shadow-courier-v1'
    );

    await page.keyboard.down('Control');
    await page.waitForTimeout(80);
    await expect
      .poll(() => page.evaluate(() => document.body.dataset.playerState))
      .toBe('attack');
    await page.keyboard.up('Control');
    await expect.poll(async () => (await readRenderedGameState(page)).audio.musicMode).toBe('exploration');
    await expect.poll(async () => (await readRenderedGameState(page)).audio.musicActive).toBe(true);
    expect(problems).toEqual([]);
  });

  test('포탈 왕복 전환 뒤 임시 객체 수가 기준으로 복귀', async ({ page }) => {
    const problems = attachErrorGuards(page);

    await startFreshCharacter(page, NICKNAME);
    const baseline = await readMapRuntimeStats(page);

    await walkUntilX(page, HIDEOUT_PORTAL_X, 'right');
    await pressInteract(page);
    await waitForMap(page, 'bandit-hideout');
    expect(await page.evaluate(() => document.body.dataset.backgroundAsset)).toBe(
      'map-background-bandit-hideout-v1'
    );

    await pressInteract(page);
    await waitForMap(page, 'cuning-city');
    expect(await page.evaluate(() => document.body.dataset.backgroundAsset)).toBe(
      'map-background-cuning-city-v1'
    );

    // Scene 유지 중에 누적되는 임시 객체까지 보기 위해 잠시 대기한 뒤 비교한다.
    await page.waitForTimeout(700);

    const restored = await readMapRuntimeStats(page);
    expect(restored).toEqual(baseline);
    expect(problems).toEqual([]);
  });

  test('새로고침 뒤에도 맵과 위치가 복구된다', async ({ page }) => {
    const problems = attachErrorGuards(page);

    await startFreshCharacter(page, NICKNAME);
    await walkUntilX(page, OPEN_GROUND_X, 'right');
    await waitForPositionSave(page);

    const savedX = await readPlayerX(page);
    await page.reload();

    await openLoginPage(page);
    await login(page);
    await enterGameplay(page, 1);

    expect(await readPlayerX(page)).toBeGreaterThanOrEqual(savedX - 3);
    expect(await readPlayerX(page)).toBeLessThanOrEqual(savedX + 3);
    expect(problems).toEqual([]);
  });

  test('배경과 카메라가 월드 이동을 따르고 하단 HUD 위에서 끝난다', async ({ page }) => {
    const problems = attachErrorGuards(page);

    await startFreshCharacter(page, NICKNAME);
    const initialState = await readRenderedGameState(page);
    expect(initialState.background).toEqual({ width: 1920, height: 720, followsCamera: true });
    expect(initialState.camera).toEqual({ scrollX: 0, scrollY: 124, playfieldBottom: 596 });

    await walkUntilX(page, 1000, 'right');
    const movedState = await readRenderedGameState(page);
    expect(movedState.camera.scrollX).toBeGreaterThan(0);
    expect(movedState.camera.scrollY).toBe(124);
    expect(movedState.camera.playfieldBottom).toBe(596);
    await page.screenshot({ path: 'artifacts/e2e/world-following-background.png' });

    expect(problems).toEqual([]);
  });

  test('캐릭터·포탈·적이 배경의 보행면에 함께 정렬된다', async ({ page }) => {
    const problems = attachErrorGuards(page);

    await startFreshCharacter(page, NICKNAME);
    const cityState = await readRenderedGameState(page);
    expect(cityState.map.groundY).toBe(600);
    expect(cityState.player.y).toBe(cityState.map.groundY);
    expect(cityState.portals.every((portal) => portal.groundY === cityState.map.groundY)).toBe(true);
    await page.screenshot({ path: 'artifacts/e2e/entity-ground-alignment-city.png' });

    await walkUntilX(page, 548, 'right');
    await pressInteract(page);
    await waitForMap(page, 'green-mushroom-cave');
    const caveState = await readRenderedGameState(page);
    expect(caveState.player.y).toBe(caveState.map.groundY);
    expect(caveState.portals.every((portal) => portal.groundY === caveState.map.groundY)).toBe(true);
    expect(caveState.enemies).not.toHaveLength(0);
    expect(caveState.enemies.every((enemy) => enemy.groundY === caveState.map.groundY)).toBe(true);
    await page.screenshot({ path: 'artifacts/e2e/entity-ground-alignment-enemies.png' });

    expect(problems).toEqual([]);
  });

  test('살아 있는 보스가 있는 지역은 보스 배경음악 모드를 요청한다', async ({ page }) => {
    const problems = attachErrorGuards(page);
    await openLoginPage(page);
    await login(page);
    await createCharacter(page, NICKNAME);
    await expect(page.getByRole('dialog', { name: '캐릭터 선택' })).toBeVisible();
    await page.evaluate((profileKey) => {
      const profile = JSON.parse(window.localStorage.getItem(profileKey) ?? '{}') as Record<string, unknown>;
      profile.mapId = 'ember-mine';
      profile.positions = { ...(profile.positions as Record<string, unknown>), 'ember-mine': { x: 720, y: 600 } };
      window.localStorage.setItem(profileKey, JSON.stringify(profile));
    }, STORED_PROFILE_KEY);
    await page.reload();
    await openLoginPage(page, false);
    await login(page);
    await enterGameplay(page, 1, 'ember-mine');
    await expect.poll(async () => (await readRenderedGameState(page)).audio.musicMode).toBe('boss');
    await page.screenshot({ path: 'artifacts/e2e/boss-bgm-mode.png' });

    expect(problems).toEqual([]);
  });

  test('손상된 슬롯은 격리되고 다른 슬롯을 사용할 수 있다', async ({ page }) => {
    const problems = attachErrorGuards(page);

    await startFreshCharacter(page, NICKNAME);
    await page.evaluate(
      (slotKey) => window.localStorage.setItem(slotKey, '{"version":2,"nickname":'),
      CORRUPT_SLOT_KEY
    );

    await page.reload();
    await openLoginPage(page, false);
    await login(page);

    const selectPanel = page.getByRole('dialog', { name: '캐릭터 선택' });
    await expect(selectPanel).toBeVisible();

    const corruptCard = selectPanel.locator('[data-slot-index="3"]');
    await expect(corruptCard).toBeDisabled();
    await expect(corruptCard).toContainText('손상된 슬롯');

    // 손상 격리는 다른 슬롯 사용을 막아서는 안 된다(SPEC §10).
    await enterGameplay(page, 1);

    await expect
      .poll(() => page.evaluate(() => document.body.dataset.activeNickname))
      .toBe(NICKNAME);
    expect(problems).toEqual([]);
  });
});

interface RenderedGameState {
  map: { id: string; width: number; height: number; groundY: number };
  background: { width: number; height: number; followsCamera: boolean };
  camera: { scrollX: number; scrollY: number; playfieldBottom: number };
  player: { x: number; y: number; state: string };
  effects: { lastSkill: string | null; activeProjectiles: number; activeScreenAccents: number };
  audio: { musicMode: 'exploration' | 'boss' | null; musicActive: boolean };
  enemies: Array<{ id: string; x: number; y: number; groundY: number; alive: boolean }>;
  portals: Array<{ id: string; x: number; groundY: number }>;
}

async function readRenderedGameState(page: import('@playwright/test').Page): Promise<RenderedGameState> {
  return page.evaluate(() => {
    const render = (window as Window & { render_game_to_text?: () => string }).render_game_to_text;
    if (render === undefined) throw new Error('render_game_to_text is not installed');
    return JSON.parse(render()) as RenderedGameState;
  });
}

test.describe('P3~P7 전투와 메뉴 루프', () => {
  test('고급 스킬은 아이콘 문양에 맞는 서로 다른 전투 연출을 표시한다', async ({ page }) => {
    const problems = attachErrorGuards(page);
    await openLoginPage(page);
    await login(page);

    const createPanel = page.getByRole('dialog', { name: /캐릭터 생성/ });
    await createPanel.getByLabel('닉네임').fill('skillfxqa');
    await createPanel.getByRole('button', { name: '주사위 굴리기' }).click();
    await createPanel.getByLabel('Lv.120 호카게 부스트').check();
    await createPanel.getByRole('button', { name: '생성', exact: true }).click();
    await enterGameplay(page, 1);

    await castAndCaptureSkill(page, 'c', 'avenger', 'artifacts/e2e/skill-fx-avenger.png', 820);
    await castAndCaptureSkill(page, 'e', 'abyss-rain', 'artifacts/e2e/skill-fx-abyss-rain.png', 1040);
    await castAndCaptureSkill(page, 'v', 'rasengan', 'artifacts/e2e/skill-fx-rasengan.png', 820);
    await castAndCaptureSkill(page, 'b', 'gumiho-transformation', 'artifacts/e2e/skill-fx-gumiho.png', 560, false);
    await castAndCaptureSkill(page, 'Shift', 'tailed-beast-orb', 'artifacts/e2e/skill-fx-tailed-beast-orb.png', 960);
    await castAndCaptureSkill(page, 'n', 'triple-strike-squad', 'artifacts/e2e/skill-fx-triple-squad.png', 1660);
    await castAndCaptureSkill(page, 'r', 'heavenly-thunder-orb', 'artifacts/e2e/skill-fx-thunder-orb.png', 1320);

    expect(problems).toEqual([]);
  });

  test('적 생성→스킬 명중→처치→회수와 접근 가능한 메뉴', async ({ page }) => {
    const problems = attachErrorGuards(page);
    await openLoginPage(page);
    await login(page);

    const createPanel = page.getByRole('dialog', { name: /캐릭터 생성/ });
    await createPanel.getByLabel('닉네임').fill('combatqa');
    await createPanel.getByRole('button', { name: '주사위 굴리기' }).click();
    await createPanel.getByLabel('Lv.120 호카게 부스트').check();
    await createPanel.getByRole('button', { name: '생성', exact: true }).click();
    await enterGameplay(page, 1);

    await walkUntilX(page, 548, 'right');
    await pressInteract(page);
    await waitForMap(page, 'green-mushroom-cave');
    await expect.poll(() => page.evaluate(() => Number(document.body.dataset.enemyAlive))).toBe(4);

    await walkUntilX(page, 405, 'right');
    await page.keyboard.down('Control');
    await page.waitForTimeout(90);
    await page.keyboard.up('Control');
    await expect.poll(() => page.evaluate(() => document.body.dataset.lastCombatEvent ?? ''), { timeout: 4000 }).toContain('defeat:');
    await expect.poll(() => page.evaluate(() => Number(document.body.dataset.drops))).toBeGreaterThan(0);

    const mesosBefore = Number(await page.evaluate(() => document.body.dataset.playerMesos));
    await page.keyboard.down('z');
    await page.waitForTimeout(80);
    await page.keyboard.up('z');
    await expect.poll(() => page.evaluate(() => Number(document.body.dataset.playerMesos))).toBeGreaterThan(mesosBefore);

    const mpBefore = Number(await page.evaluate(() => document.body.dataset.playerMp));
    await page.keyboard.down('Shift');
    await page.waitForTimeout(80);
    await page.keyboard.up('Shift');
    await expect.poll(() => page.evaluate(() => Number(document.body.dataset.playerMp))).toBeLessThan(mpBefore);
    await page.waitForTimeout(600);
    await page.keyboard.down('b');
    await page.waitForTimeout(80);
    await page.keyboard.up('b');
    await expect.poll(() => page.evaluate(() => document.body.dataset.transformed)).toBe('true');
    await page.screenshot({ path: 'artifacts/e2e/p3-combat-gameplay.png' });

    await page.keyboard.down('i');
    await page.waitForTimeout(80);
    await page.keyboard.up('i');
    await expect(page.getByRole('dialog', { name: '인벤토리 · 상점' })).toBeVisible();
    await expect(page.getByRole('button', { name: /경험의 서 · 1메소 구매/ })).toBeVisible();
    await page.screenshot({ path: 'artifacts/e2e/p4-inventory-menu.png' });
    await page.getByRole('button', { name: '닫기' }).click();
    await expect(page.locator('canvas')).toBeFocused();
    expect(problems).toEqual([]);
  });

  test('액션 슬롯 교환과 S 추가 스킬이 슬롯별로 저장·복구된다', async ({ page }) => {
    const problems = attachErrorGuards(page);
    await openLoginPage(page);
    await login(page);

    const createPanel = page.getByRole('dialog', { name: /캐릭터 생성/ });
    await createPanel.getByLabel('닉네임').fill('shortcutqa');
    await createPanel.getByRole('button', { name: '주사위 굴리기' }).click();
    await createPanel.getByLabel('Lv.120 호카게 부스트').check();
    await createPanel.getByRole('button', { name: '생성', exact: true }).click();
    await enterGameplay(page, 1);

    await page.keyboard.down('k');
    await page.waitForTimeout(80);
    await page.keyboard.up('k');
    await page.getByRole('button', { name: '단축키 편집' }).click();
    const shortcutPanel = page.getByRole('dialog', { name: '스킬 단축키' });
    await expect(shortcutPanel).toBeVisible();
    await shortcutPanel.locator('[data-shortcut-slot="1"]').getByRole('button', { name: '→' }).click();
    await page.getByLabel('S 추가 스킬').selectOption('drain');
    await page.screenshot({ path: 'artifacts/e2e/p4-shortcut-editor.png' });

    const storedShortcuts = await page.evaluate(() => JSON.parse(localStorage.getItem('kerning-shadows.local-profile-extension.v1.slot-1') ?? '{}').shortcuts);
    expect(storedShortcuts.actionSlots.slice(0, 2)).toEqual(['lucky-seven', 'basic-shuriken']);
    expect(storedShortcuts.additionalSkills.S).toBe('drain');

    await page.getByRole('button', { name: '닫기' }).click();
    const mpBefore = Number(await page.evaluate(() => document.body.dataset.playerMp));
    await page.keyboard.down('s');
    await page.waitForTimeout(80);
    await page.keyboard.up('s');
    await expect.poll(() => page.evaluate(() => Number(document.body.dataset.playerMp))).toBeLessThan(mpBefore);
    await expect(page.getByRole('dialog', { name: '능력치 · 표창 장비' })).toBeHidden();

    await page.reload();
    await openLoginPage(page);
    await login(page);
    await enterGameplay(page, 1);
    const restoredMp = Number(await page.evaluate(() => document.body.dataset.playerMp));
    await page.keyboard.down('s');
    await page.waitForTimeout(80);
    await page.keyboard.up('s');
    await expect.poll(() => page.evaluate(() => Number(document.body.dataset.playerMp))).toBeLessThan(restoredMp);
    expect(problems).toEqual([]);
  });

  test('등록된 두아가 월드에 나타나 플레이어를 따라간다', async ({ page }) => {
    const problems = attachErrorGuards(page);
    await startFreshCharacter(page, 'petqa');
    await page.evaluate(() => {
      localStorage.setItem('kerning-shadows.local-profile-extension.v1.slot-1', JSON.stringify({
        economy: { petRegistered: true },
        quests: {},
        defeatedBosses: [],
      }));
    });
    await page.reload();
    await openLoginPage(page);
    await login(page);
    await enterGameplay(page, 1);

    const before = await page.evaluate(() => {
      const renderer = (window as Window & { render_game_to_text?: () => string }).render_game_to_text;
      return JSON.parse(renderer?.() ?? '{}').pet as { x: number; y: number } | null;
    });
    expect(before).not.toBeNull();

    await walkUntilX(page, 430, 'right');
    await page.waitForTimeout(350);
    const after = await page.evaluate(() => {
      const renderer = (window as Window & { render_game_to_text?: () => string }).render_game_to_text;
      return JSON.parse(renderer?.() ?? '{}').pet as { x: number; y: number } | null;
    });
    expect(after?.x).toBeGreaterThan(before?.x ?? 0);
    expect(problems).toEqual([]);
  });
});

async function castAndCaptureSkill(
  page: import('@playwright/test').Page,
  key: string,
  expectedSkill: string,
  screenshotPath: string,
  settleMs: number,
  expectsProjectile = true
): Promise<void> {
  await page.keyboard.down(key);
  await page.waitForTimeout(80);
  await page.keyboard.up(key);
  await expect.poll(async () => (await readRenderedGameState(page)).effects.lastSkill).toBe(expectedSkill);
  await expect.poll(async () => (await readRenderedGameState(page)).effects.activeScreenAccents).toBeGreaterThan(0);
  if (expectsProjectile) {
    await expect.poll(async () => (await readRenderedGameState(page)).effects.activeProjectiles).toBeGreaterThan(0);
  }
  await page.screenshot({ path: screenshotPath });
  await page.waitForTimeout(settleMs);
}

test.describe('P7 모바일 터치 조작', () => {
  test('390×844에서 공격과 MENU가 safe-area 조작부로 동작한다', async ({ page }) => {
    const problems = attachErrorGuards(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await startFreshCharacter(page, 'touchqa');

    const touchControls = page.getByRole('navigation', { name: '터치 게임 조작' });
    await expect(touchControls).toBeVisible();
    const attack = touchControls.getByRole('button', { name: '공격' });
    await attack.dispatchEvent('pointerdown', { pointerId: 1 });
    await page.waitForTimeout(90);
    await attack.dispatchEvent('pointerup', { pointerId: 1 });
    await expect.poll(() => page.evaluate(() => document.body.dataset.playerState)).toBe('attack');

    await page.waitForTimeout(420);
    const menu = touchControls.getByRole('button', { name: 'MENU' });
    await menu.dispatchEvent('pointerdown', { pointerId: 2 });
    await page.waitForTimeout(90);
    await menu.dispatchEvent('pointerup', { pointerId: 2 });
    await expect(page.getByRole('dialog', { name: '전체 메뉴' })).toBeVisible();
    await page.screenshot({ path: 'artifacts/e2e/p7-mobile-menu.png' });
    expect(problems).toEqual([]);
  });
});
