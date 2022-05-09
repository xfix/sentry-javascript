import * as childProcess from 'child_process';

/**
 * Run the given shell command, piping the shell process's `stdin`, `stdout`, and `stderr` to that of the current
 * process. Returns contents of `stdout` if `options.returnStdOut` is set to `true`.
 */
function run(cmd: string, options?: childProcess.ExecSyncOptions & { returnStdOut: boolean }): string | undefined {
  const stdOutBuffer = childProcess.execSync(cmd, { stdio: 'inherit', ...options });
  return options?.returnStdOut ? String(stdOutBuffer) : undefined;
}

function runScopedBuildDev(packages: string[]): void {
  const scopeStr = packages.map(pkg => `--scope ${pkg}`).join(' ');
  run(`lerna run --parallel build:dev ${scopeStr}`);
}

const packagesByDependencyTier = [
  ['@sentry/types'],
  ['@sentry/utils'],
  ['@sentry/hub', '@sentry/integrations'],
  ['@sentry/core', '@sentry/tracing'],
  ['@sentry/browser', '@sentry/node'],
  ['@sentry/angular', '@sentry/react'],
  ['@sentry/ember', '@sentry/serverless', '@sentry/vue', '@sentry/wasm'],
  ['@sentry/gatsby', '@sentry/nextjs'],
];

packagesByDependencyTier.forEach(tier => runScopedBuildDev(tier));
