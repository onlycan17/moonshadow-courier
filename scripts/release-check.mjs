import { access, readdir, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { extname, join, resolve } from 'node:path';

// SPEC §17 최종 릴리스 예산. P2부터 조기 게이트로 같은 수치를 강제해 late-stage 재작업을 막는다.
const MAX_TOTAL_BYTES_EXCLUDING_AUDIO = 8_000_000;
const MAX_JS_BYTES = 1_500_000;
const MAX_JS_GZIP_BYTES = 450_000;

// BGM은 SPEC §17 총량 감사에서 제외한다.
const AUDIO_EXTENSIONS = new Set(['.mp3', '.ogg', '.wav', '.m4a', '.aac', '.flac']);

// 런타임 에셋은 WebP/SVG만 허용하고, 참고·원본 형식과 소스맵은 배포물에서 제외한다(SPEC §17).
const FORBIDDEN_EXTENSIONS = new Map([
  ['.map', 'sourcemap'],
  ['.png', '기준 PNG'],
  ['.jpg', '참고 이미지'],
  ['.jpeg', '참고 이미지'],
  ['.gif', '미사용 래스터 에셋'],
  ['.bmp', '미사용 래스터 에셋']
]);

// P9 릴리스 게이트에서만 요구하는 고지 파일(SPEC §17).
const REQUIRED_RELEASE_FILES = ['ASSET_CREDITS.md'];
const NOTICE_FILE_PATTERN = /^(license|licence|third[-_.]?party[-_.]?notices)/i;

async function ensureFile(path, message) {
  try {
    await access(path, constants.F_OK);
  } catch {
    throw new Error(message);
  }
}

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFiles(entryPath)));
      continue;
    }

    if (entry.isFile()) {
      files.push(entryPath);
    }
  }

  return files;
}

function formatBytes(value) {
  return value.toLocaleString('en-US');
}

async function measure(files, distPath) {
  let totalBytesExcludingAudio = 0;
  let jsBytes = 0;
  let jsGzipBytes = 0;
  const violations = [];

  for (const filePath of files) {
    const extension = extname(filePath).toLowerCase();
    const relativePath = filePath.slice(distPath.length + 1);

    if (FORBIDDEN_EXTENSIONS.has(extension)) {
      violations.push(`${relativePath}: 금지된 형식 ${extension} (${FORBIDDEN_EXTENSIONS.get(extension)})`);
    }

    const content = await readFile(filePath);

    if (!AUDIO_EXTENSIONS.has(extension)) {
      totalBytesExcludingAudio += content.byteLength;
    }

    if (extension === '.js') {
      jsBytes += content.byteLength;
      jsGzipBytes += gzipSync(content).byteLength;
    }
  }

  return { totalBytesExcludingAudio, jsBytes, jsGzipBytes, violations };
}

function collectBudgetViolations(measurement) {
  const violations = [];

  if (measurement.totalBytesExcludingAudio > MAX_TOTAL_BYTES_EXCLUDING_AUDIO) {
    violations.push(
      `BGM 제외 총량 ${formatBytes(measurement.totalBytesExcludingAudio)} bytes가 상한 ${formatBytes(MAX_TOTAL_BYTES_EXCLUDING_AUDIO)} bytes를 초과했다`
    );
  }

  if (measurement.jsBytes > MAX_JS_BYTES) {
    violations.push(
      `JS 총량 ${formatBytes(measurement.jsBytes)} bytes가 상한 ${formatBytes(MAX_JS_BYTES)} bytes를 초과했다`
    );
  }

  if (measurement.jsGzipBytes > MAX_JS_GZIP_BYTES) {
    violations.push(
      `JS gzip 총량 ${formatBytes(measurement.jsGzipBytes)} bytes가 상한 ${formatBytes(MAX_JS_GZIP_BYTES)} bytes를 초과했다`
    );
  }

  return violations;
}

function collectReleaseViolations(fileNames) {
  const violations = [];

  for (const requiredFile of REQUIRED_RELEASE_FILES) {
    if (!fileNames.includes(requiredFile)) {
      violations.push(`${requiredFile}이(가) dist/에 없다`);
    }
  }

  if (!fileNames.some((fileName) => NOTICE_FILE_PATTERN.test(fileName))) {
    violations.push('제3자 고지·엔진 라이선스 파일(LICENSE 등)이 dist/에 없다');
  }

  return violations;
}

async function main() {
  const releaseMode = process.argv.includes('--release');
  const distPath = resolve(process.cwd(), 'dist');
  const indexPath = resolve(distPath, 'index.html');

  await ensureFile(distPath, 'release-check failed: dist/ directory is missing. Run npm run build first.');
  await ensureFile(indexPath, 'release-check failed: dist/index.html is missing. Build output is incomplete.');

  const files = await listFiles(distPath);
  const measurement = await measure(files, distPath);
  const violations = [...measurement.violations, ...collectBudgetViolations(measurement)];

  if (releaseMode) {
    violations.push(...collectReleaseViolations(files.map((filePath) => filePath.slice(distPath.length + 1))));
  }

  console.log(
    `release-check measured: total(excl. audio)=${formatBytes(measurement.totalBytesExcludingAudio)} bytes, ` +
      `js=${formatBytes(measurement.jsBytes)} bytes, js gzip=${formatBytes(measurement.jsGzipBytes)} bytes, files=${files.length}`
  );

  if (violations.length > 0) {
    console.error(`release-check failed (${violations.length}):`);
    for (const violation of violations) {
      console.error(`  - ${violation}`);
    }
    process.exit(1);
  }

  const scope = releaseMode ? 'budget, hygiene and release notices' : 'budget and hygiene';
  console.log(`release-check passed: dist/ audited for ${scope}.`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : 'release-check failed: unknown error';
  console.error(message);
  process.exit(1);
});
