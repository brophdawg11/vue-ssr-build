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
    const vurSsrBuildExp = /^vue-ssr-build/;
    if (nonRelativeExp.test(request) &&
        !lodashEsExp.test(request) &&
        !vurSsrBuildExp.test(request)) {
        return callback(null, `commonjs ${request}`);
    }
    return callback();
}

module.exports = {
    isDev,
    isLocal,
    isProd,
    logLevel,
    getBaseConfig(type, rootDir) {
        return {
            mode: environment,
            devtool: 'eval-source-map',
            output: {
                publicPath: '/dist/',
                filename: '[name].[chunkhash].js',
                chunkFilename: '[name].chunk.[chunkhash].js',
            },
            resolve: {
                alias: {
                    '@content': path.resolve(rootDir, 'content'),
                    '@components': path.resolve(rootDir, 'src/components'),
                    '@dist': path.resolve(rootDir, 'dist'),
                    '@js': path.resolve(rootDir, 'src/js'),
                    '@scss': path.resolve(rootDir, 'src/scss'),
                    '@server': path.resolve(rootDir, 'src/server'),
                    '@src': path.resolve(rootDir, 'src'),
                    '@static': path.resolve(rootDir, 'static'),
                    '@store': path.resolve(rootDir, 'src/store'),
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
