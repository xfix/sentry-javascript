// A temporary hack to use sucrase versions of packages for testing in CI.

import * as child_process from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

function run(cmd: string, cwd: string = ''): void {
  const result = child_process.spawnSync(cmd, {
    shell: true,
    stdio: 'inherit',
    cwd: path.join(__dirname, '..', cwd || ''),
  });

  if (result.status !== 0) {
    process.exit(result.status || undefined);
  }
}

fs.readdirSync(path.join(process.cwd(), 'packages')).forEach(dir => {
  if (fs.existsSync(path.join(process.cwd(), 'packages', dir, 'build', 'npm'))) {
    run(`rm -rf packages/${dir}/build/npm/cjs`);
    run(`rm -rf packages/${dir}/build/npm/esm`);
  } else if (fs.existsSync(path.join(process.cwd(), 'packages', dir, 'build', 'cjs'))) {
    run(`rm -rf packages/${dir}/build/cjs`);
    run(`rm -rf packages/${dir}/build/esm`);
  }
});

const ignorePackages = process.version.startsWith('v8')
  ? [
      '@sentry/ember',
      '@sentry-internal/eslint-plugin-sdk',
      '@sentry/react',
      '@sentry/wasm',
      '@sentry/gatsby',
      '@sentry/serverless',
      '@sentry/nextjs',
      '@sentry/angular',
    ]
  : ['@sentry/serverless'];

run(`yarn build:rollup ${ignorePackages.map(dep => `--ignore="${dep}"`).join(' ')}`);
