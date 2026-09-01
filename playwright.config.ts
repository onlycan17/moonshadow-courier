import { devices, defineConfig } from '@playwright/test';

// 기본 4173은 다른 미리보기 서버와 충돌할 수 있어 전용 포트를 쓴다.
const PREVIEW_PORT = 4317;
const PREVIEW_URL = `http://127.0.0.1:${PREVIEW_PORT}`;

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: './artifacts/e2e-run',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL: PREVIEW_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off'
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } }
  ],
  // E2E는 프로덕션 preview를 대상으로 한다(SPEC §13). 빌드는 약 2초라 매 실행 전에 다시 조립한다.
  webServer: {
    command: `npm run build && npm run preview -- --host 127.0.0.1 --port ${PREVIEW_PORT} --strictPort`,
    url: `${PREVIEW_URL}/index.html`,
    // 항상 새로 빌드·서빙한다. 낡은 미리보기 서버를 재사용하면 소스와 다른 번들로 검증된다.
    reuseExistingServer: false,
    timeout: 120_000,
    stdout: 'ignore',
    stderr: 'pipe'
  }
});
