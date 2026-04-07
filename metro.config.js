const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Enable package exports for modern libraries like @livekit/components-react
config.resolver.unstable_enablePackageExports = true;

// Ensure mjs and cjs files are resolved correctly
config.resolver.sourceExts.push('mjs', 'cjs');

// Add specific aliases if needed (common for recharts)
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
};

module.exports = config;
