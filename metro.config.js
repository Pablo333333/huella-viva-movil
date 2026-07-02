const { getDefaultConfig } = require('expo/metro-config');
const { FileStore } = require('metro-cache');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Change the cache directory to a temporary folder outside the project
// to avoid Windows path issues (like colons in names) and OneDrive interference.
config.cacheStores = [
  new FileStore({
    root: 'C:\\Temp\\expo-cache',
  }),
];

module.exports = config;
