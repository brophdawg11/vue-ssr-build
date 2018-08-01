/* eslint-disable import/no-extraneous-dependencies */
const webpack = require('webpack');
const merge = require('webpack-merge');
const VisualizerPlugin = require('webpack-visualizer-plugin');
/* eslint-enable import/no-extraneous-dependencies */

const VueSSRClientPlugin = require('vue-server-renderer/client-plugin');

const { getBaseConfig } = require('./webpack.base.config');

module.exports = function getClientConfig(configOpts) {
    const config = Object.assign({
        type: 'client',
        rootDir: null,
        i18nBlocks: false,
    }, configOpts);

    const clientConfig = merge(getBaseConfig('client', config), {
        name: 'client',
        entry: {
            app: './src/js/entry-client.js',
        },
        plugins: [
            new webpack.DefinePlugin({ 'process.env.VUE_ENV': '"client"' }),
            new VueSSRClientPlugin(),
            new VisualizerPlugin(),
        ],
    });

    return clientConfig;
};
