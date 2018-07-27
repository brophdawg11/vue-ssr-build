module.exports = function getConfig() {
    return {
        isLocal: process.env.NODE_ENV === 'local',
        isDev: process.env.NODE_ENV === 'development',
        isProd: process.env.NODE_ENV === 'production',
        templatePath: './src/index.tpl.html',
        clientManifest: './dist/vue-ssr-client-manifest.json',
        serverBundle: './dist/vue-ssr-server-bundle.json',
    };
};
