// metro.config.js — required for pnpm monorepo symlink resolution
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// The monorepo root (two levels up from apps/mobile)
const monorepoRoot = path.resolve(__dirname, '../..');

const config = getDefaultConfig(__dirname);

// Watch the entire monorepo so Metro can resolve workspace packages
config.watchFolders = [monorepoRoot];

// Support pnpm's symlinked node_modules
config.resolver.unstable_enableSymlinks = true;

// Tell Metro where to look for node_modules (app-local first, then monorepo root)
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

module.exports = config;
