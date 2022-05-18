import { makeBaseBundleConfig, makeBundleConfigVariants, plugins } from '../../rollup/index.js';

const { makeCommonJSPlugin } = plugins;

const builds = [];

const file = process.env.INTEGRATION_FILE;
const jsVersion = process.env.JS_VERSION;

const baseBundleConfig = makeBaseBundleConfig({
  bundleType: 'addon',
  input: `src/${file}`,
  jsVersion,
  licenseTitle: '@sentry/integrations',
  outputFileBase: `bundles/${file.replace('.ts', '')}${jsVersion === 'ES5' ? '.es5' : ''}`,
  // TODO We only need `commonjs` for localforage (used in the offline plugin). Once that's fixed, this can come out.
  packageSpecificConfig: { plugins: [makeCommonJSPlugin()] },
});

// this makes non-minified, minified, and minified-with-debug-logging versions of each bundle
builds.push(...makeBundleConfigVariants(baseBundleConfig));

export default builds;
