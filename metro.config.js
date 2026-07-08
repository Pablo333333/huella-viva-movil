const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// 1. Configuración de Alias explícita para Metro apuntando a la RAÍZ
config.resolver.alias = {
  '@': __dirname,
};

// 2. Asegurar que Metro busque en las carpetas correctas
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
];

// 3. Forzar a Metro a resolver archivos .ts y .tsx primero
config.resolver.sourceExts = [...config.resolver.sourceExts, 'ts', 'tsx', 'js', 'jsx', 'json'];

// 4. Configuración del transformador
config.transformer = {
  ...config.transformer,
  minify: false, 
};

// 5. WatchFolders para asegurar que Metro escanee la raíz
config.watchFolders = [
  __dirname,
];

// 6. Configuración de resolución de módulos manual para forzar la ruta correcta
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Si es un alias @/, lo resolvemos desde la raíz
  if (moduleName.startsWith('@/')) {
    const relativePath = moduleName.slice(2);
    const absolutePath = path.resolve(__dirname, relativePath);
    return context.resolveRequest(context, absolutePath, platform);
  }
  
  // Si Metro intenta resolver algo que contiene "src/" (limpieza de rutas antiguas)
  if (moduleName.includes('src/')) {
    const parts = moduleName.split('src/');
    const relativePath = parts[parts.length - 1];
    const absolutePath = path.resolve(__dirname, relativePath);
    
    try {
      return context.resolveRequest(context, absolutePath, platform);
    } catch (e) {}
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
