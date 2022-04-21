import { makeBaseNPMConfig, makeNPMConfigVariants } from '../../rollup/index.js';

export default makeNPMConfigVariants(
  makeBaseNPMConfig({
    // We need to include `instrumentServer.ts` separately because it's only conditionally required, and so rollup
    // doesn't automatically include it when calculating the module dependency tree.
    entrypoints: ['src/index.server.ts', 'src/index.client.ts', 'src/utils/instrumentServer.ts'],
    externals: ['next/router'],
    watchPackages: ['integrations', 'node', 'react', 'tracing'],
  }),
);
