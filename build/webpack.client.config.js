/* eslint-disable import/no-extraneous-dependencies */
const webpack = require('webpack');
const merge = require('webpack-merge');
/* eslint-enable import/no-extraneous-dependencies */

const VueSSRClientPlugin = require('vue-server-renderer/client-plugin');

const { isLocal, getBaseConfig } = require('./webpack.base.config');

module.exports = function getClientConfig(rootDir) {
    const clientConfig = merge(getBaseConfig('client', rootDir), {
        name: 'client',
        entry: [
            './src/js/entry-client.js',
        ],
        plugins: [
            new webpack.DefinePlugin({ 'process.env.VUE_ENV': '"client"' }),
            new VueSSRClientPlugin(),
        ],
    });

    if (isLocal) {
        // Wire up HMR on the client
        // Can't use chunkhash while using HMR plugins
        // clientConfig.output.filename = '[name].[hash].js';
        // clientConfig.output.chunkFilename = '[name].chunk.[hash].js';
    }

    return clientConfig;
};
