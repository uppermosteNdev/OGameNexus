import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const target = process.argv[2] || 'chrome';
if (target !== 'chrome' && target !== 'firefox') {
  console.error('Invalid target browser. Choose "chrome" or "firefox".');
  process.exit(1);
}

console.log(`\n========================================`);
console.log(`Building OGame Nexus extension for ${target.toUpperCase()}...`);
console.log(`========================================\n`);

try {
  // 1. Run tsc and vite build
  console.log('Running TypeScript compilation and Vite build...');
  execSync('npx tsc && npx vite build', {
    cwd: rootDir,
    env: { ...process.env, TARGET: target },
    stdio: 'inherit',
  });

  // 2. Prepare archiving
  const outDir = path.join(rootDir, `dist-${target}`);
  const zipPath = path.join(rootDir, `extension-${target}.zip`);

  if (!fs.existsSync(outDir)) {
    throw new Error(`Output directory not found: ${outDir}`);
  }

  // Remove existing zip if any
  if (fs.existsSync(zipPath)) {
    fs.rmSync(zipPath, { force: true });
  }

  console.log(`\nPackaging ${outDir} into ${zipPath}...`);

  // 3. Compress based on platform
  if (process.platform === 'win32') {
    // Windows: Use native tar.exe to produce a standard ZIP archive.
    // Instead of using ".", read the files in the directory and pass them individually
    // to prevent tar from creating a "." root entry/prefix.
    const files = fs.readdirSync(outDir).map(file => `"${file}"`).join(' ');
    const cmd = `tar.exe -a -c -f "${zipPath}" -C "${outDir}" ${files}`;
    execSync(cmd, { stdio: 'inherit' });
  } else {
    // Unix zip
    const cmd = `zip -r "${zipPath}" ./*`;
    execSync(cmd, { cwd: outDir, stdio: 'inherit' });
  }

  console.log(`\nSuccessfully built and packaged for ${target.toUpperCase()}!`);
  console.log(`Archive: ${zipPath}`);
} catch (error) {
  console.error(`\nBuild failed for ${target.toUpperCase()}:`, error.message);
  process.exit(1);
}
