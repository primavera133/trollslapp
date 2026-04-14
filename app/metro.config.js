// https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Allow Metro to bundle .wasm files (required for expo-sqlite on web)
config.resolver.assetExts.push('wasm');

// Add security headers required for SharedArrayBuffer (used by expo-sqlite web WASM)
// These enable cross-origin isolation in the Metro dev server.
const originalMiddleware = config.server?.enhanceMiddleware;
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware, server) => {
    const base = originalMiddleware ? originalMiddleware(middleware, server) : middleware;
    return (req, res, next) => {
      res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
      res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
      base(req, res, next);
    };
  },
};

module.exports = config;
