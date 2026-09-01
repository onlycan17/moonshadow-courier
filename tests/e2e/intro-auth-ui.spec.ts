import { expect, test } from '@playwright/test';
import { attachErrorGuards, openIntroPage } from './support';

const VIEWPORTS = [
  { name: 'phone', width: 360, height: 800 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'laptop', width: 1024, height: 768 },
  { name: 'desktop', width: 1440, height: 900 }
] as const;

test('인트로와 로그인은 주요 화면 너비에서 잘리지 않고 모션 축소를 존중한다', async ({ browserName, page }) => {
  test.skip(browserName !== 'chromium', '반응형 매트릭스는 Chromium에서 한 번만 점검한다.');
  const problems = attachErrorGuards(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });

  for (const viewport of VIEWPORTS) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await openIntroPage(page);

    const intro = page.locator('.intro-screen');
    await expect(intro).toBeVisible();
    await expect(page.getByRole('button', { name: '게임 시작' })).toBeInViewport();
    expect(await intro.evaluate((element) => getComputedStyle(element.querySelector('.intro-title')!).animationName)).toBe('none');

    if (viewport.name === 'phone' || viewport.name === 'desktop') {
      await page.screenshot({ path: `artifacts/e2e/intro-${viewport.name}.png`, fullPage: true });
    }

    await page.getByRole('button', { name: '게임 시작' }).click();
    const dialog = page.getByRole('dialog', { name: '기록에 접속하기' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel('전령 ID')).toBeInViewport();
    await expect(dialog.getByRole('button', { name: '월영전령 시작' })).toBeInViewport();
    if (viewport.name === 'phone' || viewport.name === 'desktop') {
      await page.screenshot({ path: `artifacts/e2e/login-${viewport.name}.png`, fullPage: true });
    }
  }

  expect(problems).toEqual([]);
});
