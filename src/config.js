module.exports = function getConfig() {
    return {
        isLocal: process.env.NODE_ENV === 'local',
        isDev: process.env.NODE_ENV === 'development',
        isProd: process.env.NODE_ENV === 'production',
    };
};
