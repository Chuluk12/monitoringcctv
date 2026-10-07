const { PHASE_DEVELOPMENT_SERVER } = require('next/constants');

module.exports = (phase) => ({
  // Keep development routes intact when a production build runs concurrently.
  distDir: phase === PHASE_DEVELOPMENT_SERVER ? '.next-dev' : '.next',
  // Standalone output bundles only the files needed to run, cutting image size drastically.
  output: phase === PHASE_DEVELOPMENT_SERVER ? undefined : 'standalone',
});
