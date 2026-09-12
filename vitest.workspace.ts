/**
 * Package-level test configs. `packages/client` needs its own (jsdom plus a
 * setup file); shared and server run in the default node environment with no
 * config of their own, and are listed here so `npm test` at the root still
 * runs everything in one pass.
 */
export default ['packages/shared', 'packages/server', 'packages/client'];
