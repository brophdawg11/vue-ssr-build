/* eslint-disable import/no-extraneous-dependencies */
const webpack = require('webpack');
const merge = require('webpack-merge');
/* eslint-enable import/no-extraneous-dependencies */

const VueSSRServerPlugin = require('vue-server-renderer/server-plugin');

const { getBaseConfig } = require('./webpack.base.config');

function serverExternals(context, request, callback) {
    // Tell webpack to ignore all node_modules dependencies except
    // lodash-es so we get proper tree shaking
    const nonRelativeExp = /^\w.*$/i;
    const lodashEsExp = /^lodash-es/;
    const vurSsrBuildExp = /^vue-ssr-build/;
    if (nonRelativeExp.test(request) &&
        !lodashEsExp.test(request) &&
        !vurSsrBuildExp.test(request)) {
        return callback(null, `commonjs ${request}`);
    }
    return callback();
}

module.exports = function getServerConfig(configOpts) {
    const config = Object.assign({
        type: 'server',
        rootDir: null,
        i18nBlocks: false,
    }, configOpts);

    const serverConfig = merge(getBaseConfig(config), {
        // Note: Do not start this name with server- as that will confuse the
        // webpack-hot-server-middleware plugin
        name: 'vue-ssr-bundle',
        entry: './src/server/entry-server.js',
        output: {
            filename: 'server-bundle.js',
            libraryTarget: 'commonjs2',
        },
        target: 'node',
        externals: serverExternals,
        plugins: [
            new webpack.DefinePlugin({ 'process.env.VUE_ENV': '"server"' }),
            new VueSSRServerPlugin(),
        ],
    });

    return serverConfig;
};
