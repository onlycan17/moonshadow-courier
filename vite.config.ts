import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const phaserStubPath = fileURLToPath(new URL('./tests/stubs/phaser.ts', import.meta.url));

// Vite는 `phaser`를 package의 `module` 필드(비압축 ESM 7.8MB)로 해석해 다시 압축하므로
// 결과물만 1,524,524 bytes가 되어 SPEC §17 JS 예산(1,500,000 bytes)을 콘텐츠 이전에 초과한다.
// Phaser 공식 Arcade 배포본은 이미 압축돼 있어 절대 경로로 별칭하면 재압축이 건너뛰어진다.
// 상대 경로는 개발 서버의 import 해석에서 실패하므로 fileURLToPath로 절대화한다.
const phaserRuntimePath = fileURLToPath(
  new URL('./node_modules/phaser/dist/phaser-arcade-physics.min.js', import.meta.url)
);

export default defineConfig({
  base: './',
  resolve: {
    alias: {
      phaser: phaserRuntimePath
    }
  },
  test: {
    environment: 'node',
    globals: true,
    // E2E는 Playwright가 담당한다. Vitest가 tests/e2e를 수집하지 않도록 제외한다(SPEC §13).
    exclude: ['**/node_modules/**', 'tests/e2e/**'],
    alias: {
      phaser: phaserStubPath
    }
  }
});
