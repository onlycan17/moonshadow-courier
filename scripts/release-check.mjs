import { access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { resolve } from 'node:path';

async function ensureFile(path, message) {
  try {
    await access(path, constants.F_OK);
  } catch {
    throw new Error(message);
  }
}

async function main() {
  const distPath = resolve(process.cwd(), 'dist');
  const indexPath = resolve(distPath, 'index.html');

  await ensureFile(distPath, 'release-check failed: dist/ directory is missing. Run npm run build first.');
  await ensureFile(indexPath, 'release-check failed: dist/index.html is missing. Build output is incomplete.');

  console.log('release-check passed: dist/ and dist/index.html are present.');
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : 'release-check failed: unknown error';
  console.error(message);
  process.exit(1);
});
