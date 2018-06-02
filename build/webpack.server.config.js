/* eslint-disable import/no-extraneous-dependencies */
const webpack = require('webpack');
const merge = require('webpack-merge');
/* eslint-enable import/no-extraneous-dependencies */

const VueSSRServerPlugin = require('vue-server-renderer/server-plugin');

const { getBaseConfig } = require('./webpack.base.config');

module.exports = merge(getBaseConfig('server'), {
    // Note: Do not start this name with server- as that will confuse the
    // webpack-hot-server-middleware plugin
    name: 'vue-ssr-bundle',
    entry: './src/server/entry-server.js',
    output: {
        filename: 'server-bundle.js',
        libraryTarget: 'commonjs2',
    },
    target: 'node',
    plugins: [
        new webpack.DefinePlugin({ 'process.env.VUE_ENV': '"server"' }),
        new VueSSRServerPlugin(),
    ],
});
