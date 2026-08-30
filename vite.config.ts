import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const phaserStubPath = fileURLToPath(new URL('./tests/stubs/phaser.ts', import.meta.url));

export default defineConfig({
  base: './',
  test: {
    environment: 'node',
    globals: true,
    alias: {
      phaser: phaserStubPath
    }
  }
});
