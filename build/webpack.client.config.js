/* eslint-disable import/no-extraneous-dependencies */
const webpack = require('webpack');
const merge = require('webpack-merge');
const VisualizerPlugin = require('webpack-visualizer-plugin');
/* eslint-enable import/no-extraneous-dependencies */

const VueSSRClientPlugin = require('vue-server-renderer/client-plugin');

const { getBaseConfig } = require('./webpack.base.config');

module.exports = function getClientConfig(rootDir) {
    const clientConfig = merge(getBaseConfig('client', rootDir), {
        name: 'client',
        entry: [
            './src/js/entry-client.js',
        ],
        plugins: [
            new webpack.DefinePlugin({ 'process.env.VUE_ENV': '"client"' }),
            new VueSSRClientPlugin(),
            new VisualizerPlugin(),
        ],
    });

    return clientConfig;
};
