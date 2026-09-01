import { expect, type Page } from '@playwright/test';

export const CORRUPT_SLOT_KEY = 'kerning-shadows.local-profile.v1.slot-3';
export const STORED_PROFILE_KEY = 'kerning-shadows.local-profile.v1';

export const RUNNING_IN_CI = (globalThis as typeof globalThis & {
  process?: { env?: Record<string, string | undefined> };
}).process?.env?.CI === 'true';

const READY_TIMEOUT_MS = RUNNING_IN_CI ? 60_000 : 20_000;
const WALK_TIMEOUT_MS = RUNNING_IN_CI ? 45_000 : 15_000;
const POSITION_SAVE_WAIT_MS = 900;
const RUNTIME_STATS_SETTLE_MS = 600;

/** 맵 수명 카운터 스냅샷. 전환 뒤 이 값이 기준으로 돌아오는지 확인한다(SPEC §6.3, §17). */
export interface MapRuntimeStats {
  objects: number;
  bodies: number;
  colliders: number;
  timers: number;
  tweens: number;
}

/** console error / pageerror / requestfailed를 모은다. SPEC §17은 0건을 요구한다. */
export function attachErrorGuards(page: Page): string[] {
  const problems: string[] = [];

  page.on('console', (message) => {
    if (message.type() === 'error') {
      problems.push(`console error: ${message.text()}`);
    }
  });

  page.on('pageerror', (error) => {
    problems.push(`pageerror: ${error.message}`);
  });

  page.on('requestfailed', (request) => {
    const failure = request.failure();
    const errorText = failure?.errorText ?? 'unknown';
    // reload/goto가 이전 문서의 진행 중 요청을 취소하는 것은 실제 로드 실패가 아니다.
    if (errorText === 'NS_BINDING_ABORTED' || errorText === 'net::ERR_ABORTED' || errorText.toLowerCase().includes('cancelled')) return;
    problems.push(`requestfailed: ${request.url()} (${errorText})`);
  });

  return problems;
}

export async function openIntroPage(page: Page, navigate = true): Promise<void> {
  if (navigate) {
    await page.goto('/index.html');
  }
  await expect(page.locator('.intro-screen')).toBeVisible();
  await expect(page.getByRole('button', { name: '게임 시작' })).toBeFocused();
}

export async function openLoginPage(page: Page, navigate = true): Promise<void> {
  await openIntroPage(page, navigate);
  await page.getByRole('button', { name: '게임 시작' }).click();
  await expect(getLoginPanel(page)).toBeVisible();
}

export async function login(page: Page): Promise<void> {
  const panel = getLoginPanel(page);
  await panel.getByLabel('전령 ID').fill('e2e-user');
  await panel.getByLabel('암호문').fill('e2e-password');
  await panel.getByRole('button', { name: '월영전령 시작' }).click();
}

export async function createCharacter(page: Page, nickname: string): Promise<void> {
  const panel = page.getByRole('dialog', { name: /캐릭터 생성/ });
  await expect(panel).toBeVisible({ timeout: READY_TIMEOUT_MS });

  await panel.getByLabel('닉네임').fill(nickname);
  await panel.getByRole('button', { name: '주사위 굴리기' }).click();

  const submit = panel.getByRole('button', { name: '생성', exact: true });
  await expect(submit).toBeEnabled({ timeout: READY_TIMEOUT_MS });
  await submit.click();
}

export async function enterGameplay(page: Page, slot: number, expectedMap = 'cuning-city'): Promise<void> {
  const panel = page.getByRole('dialog', { name: '캐릭터 선택' });
  await expect(panel).toBeVisible({ timeout: READY_TIMEOUT_MS });

  await panel.locator(`[data-slot-index="${slot}"]`).click();
  await panel.getByRole('button', { name: '진입' }).click();

  await waitForMap(page, expectedMap);
  await expect(page.locator('canvas')).toBeFocused({ timeout: READY_TIMEOUT_MS });
}

/** 로그인 → 생성 → 선택 → Gameplay 진입까지의 공통 경로. */
export async function startFreshCharacter(page: Page, nickname: string): Promise<void> {
  await openLoginPage(page);
  await login(page);
  await createCharacter(page, nickname);
  await enterGameplay(page, 1);
}

export async function waitForMap(page: Page, mapId: string): Promise<void> {
  await page.waitForFunction(
    (expected) => document.body.dataset.currentMap === expected,
    mapId,
    { timeout: READY_TIMEOUT_MS }
  );
  // 카운터는 250ms 주기로 갱신되므로, 라이브 값이 반영된 뒤 읽도록 그보다 길게 안정화한다.
  await page.waitForTimeout(RUNTIME_STATS_SETTLE_MS);
}

export async function readMapRuntimeStats(page: Page): Promise<MapRuntimeStats> {
  await page.waitForFunction(() => document.body.dataset.mapObjects !== undefined, undefined, {
    timeout: READY_TIMEOUT_MS
  });

  return page.evaluate(() => ({
    objects: Number(document.body.dataset.mapObjects),
    bodies: Number(document.body.dataset.mapBodies),
    colliders: Number(document.body.dataset.mapColliders),
    timers: Number(document.body.dataset.mapTimers),
    tweens: Number(document.body.dataset.mapTweens)
  }));
}

export async function readPlayerX(page: Page): Promise<number> {
  return page.evaluate(() => Number(document.body.dataset.playerX ?? '0'));
}

export function readActiveLevel(page: Page): Promise<string | undefined> {
  return page.evaluate(() => document.body.dataset.activeLevel);
}

/** 포탈 중심 좌표까지 걸어간 뒤 방향키를 놓는다. 화면 타이밍 대신 data-player-x로 판단한다. */
export async function walkUntilX(page: Page, targetX: number, direction: 'left' | 'right'): Promise<void> {
  const key = direction === 'right' ? 'ArrowRight' : 'ArrowLeft';
  await page.keyboard.down(key);

  try {
    await page.waitForFunction(
      ({ target, move }) => {
        const raw = document.body.dataset.playerX;
        if (raw === undefined) {
          return false;
        }

        const x = Number(raw);
        return move === 'right' ? x >= target : x <= target;
      },
      { target: targetX, move: direction },
      { timeout: WALK_TIMEOUT_MS }
    );
  } finally {
    await page.keyboard.up(key);
  }
}

/** `↑` 상호작용. 엔진이 JustDown으로 읽을 수 있도록 down/up 사이에 간격을 둔다(SPEC §6.2). */
export async function pressInteract(page: Page): Promise<void> {
  await page.keyboard.down('ArrowUp');
  await page.waitForTimeout(80);
  await page.keyboard.up('ArrowUp');
}

export async function waitForPositionSave(page: Page): Promise<void> {
  await page.waitForTimeout(POSITION_SAVE_WAIT_MS);
}

function getLoginPanel(page: Page) {
  return page.getByRole('dialog', { name: '기록에 접속하기' });
}
