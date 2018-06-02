const path = require('path');

/* eslint-disable import/no-extraneous-dependencies */
const webpack = require('webpack');
const VueLoaderPlugin = require('vue-loader/lib/plugin');
const VisualizerPlugin = require('webpack-visualizer-plugin');
/* eslint-enable import/no-extraneous-dependencies */

const isLocal = process.env.NODE_ENV === 'local';
const isProd = process.env.NODE_ENV === 'production';
const isDev = !isLocal && !isProd;
const logLevel = process.env.LOG_LEVEL || 'debug';
const environment = isProd ? 'production' : 'development';

/* eslint-disable no-console */
console.log(`process.env.NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`Webpack building for environment: ${environment}`);
/* eslint-enable no-console */

function serverExternals(context, request, callback) {
    // Tell webpack to ignore all node_modules dependencies except
    // lodash-es so we get proper tree shaking
    const nonRelativeExp = /^\w.*$/i;
    const lodashEsExp = /^lodash-es/;
    if (nonRelativeExp.test(request) && !lodashEsExp.test(request)) {
        return callback(null, `commonjs ${request}`);
    }
    return callback();
}

module.exports = {
    isDev,
    isLocal,
    isProd,
    logLevel,
    getBaseConfig(type) {
        return {
            mode: environment,
            output: {
                publicPath: '/dist/',
                filename: '[name].[chunkhash].js',
                chunkFilename: '[name].chunk.[chunkhash].js',
            },
            resolve: {
                alias: {
                    '@content': path.resolve(__dirname, '../content'),
                    '@components': path.resolve(__dirname, '../src/components'),
                    '@dist': path.resolve(__dirname, '../dist'),
                    '@js': path.resolve(__dirname, '../src/js'),
                    '@scss': path.resolve(__dirname, '../src/scss'),
                    '@server': path.resolve(__dirname, '../src/server'),
                    '@src': path.resolve(__dirname, '../src'),
                    '@static': path.resolve(__dirname, '../static'),
                    '@store': path.resolve(__dirname, '../src/store'),
                },
                extensions: [ '*', '.js', '.vue', '.json' ],
            },
            externals: type === 'client' ? '' : serverExternals,
            module: {
                rules: [{
                    test: /\.vue$/,
                    loader: 'vue-loader',
                }, {
                    test: /\.js$/,
                    loader: 'babel-loader',
                    exclude: /node_modules/,
                }, {
                    test: /\.css$/,
                    use: [
                        'vue-style-loader',
                        { loader: 'css-loader', options: { minimize: isProd } },
                    ],
                }, {
                    test: /\.scss$/,
                    use: [
                        'vue-style-loader',
                        { loader: 'css-loader', options: { minimize: isProd } },
                        'sass-loader',
                    ],
                }, {
                    test: /\.(png|jpe?g|gif|ttf|woff2?|eot|svg)$/,
                    use: {
                        loader: 'url-loader',
                        options: {
                            limit: 8192,
                        },
                    },
                }],
            },
            plugins: [
                new webpack.DefinePlugin({
                    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
                }),
                new VueLoaderPlugin(),
                new VisualizerPlugin(),
            ],
        };
    },
};
