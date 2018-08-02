const path = require('path');

/* eslint-disable import/no-extraneous-dependencies */
const webpack = require('webpack');
const VueLoaderPlugin = require('vue-loader/lib/plugin');
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

module.exports = {
    isDev,
    isLocal,
    isProd,
    logLevel,
    getBaseConfig(config) {
        return {
            mode: environment,
            devtool: 'eval-source-map',
            output: {
                publicPath: '/dist/',
                filename: isProd ? '[name].[chunkhash].js' : '[name].js',
                chunkFilename: isProd ? '_[name].[chunkhash].js' : '_[name].js',
            },
            resolve: {
                alias: {
                    '@components': path.resolve(config.rootDir, 'src/components'),
                    '@dist': path.resolve(config.rootDir, 'dist'),
                    '@js': path.resolve(config.rootDir, 'src/js'),
                    '@scss': path.resolve(config.rootDir, 'src/scss'),
                    '@server': path.resolve(config.rootDir, 'src/server'),
                    '@src': path.resolve(config.rootDir, 'src'),
                    '@static': path.resolve(config.rootDir, 'static'),
                    '@store': path.resolve(config.rootDir, 'src/store'),
                },
                extensions: ['*', '.js', '.vue', '.json'],
            },
            module: {
                rules: [
                    {
                        test: /\.vue$/,
                        loader: 'vue-loader',
                    },

                    // Only include the themed style loader if a theme is
                    // specified
                    ...(config.theme ? [{
                        test: /\.vue$/,
                        loader: 'vue-themed-style-loader',
                        options: {
                            theme: config.theme,
                        },
                    }] : []),

                    // Only include the i18n-loader if specified
                    ...(config.i18nBlocks ? [{
                        resourceQuery: /blockType=i18n/,
                        loader: '@kazupon/vue-i18n-loader',
                    }] : []),

                    {
                        test: /\.js$/,
                        loader: 'babel-loader',
                        exclude: /node_modules/,
                    },
                    {
                        test: /\.css$/,
                        use: [
                            'vue-style-loader',
                            {
                                loader: 'css-loader',
                                options: {
                                    minimize: isProd,
                                },
                            },
                        ],
                    },
                    {
                        test: /\.scss$/,
                        use: [
                            'vue-style-loader',
                            {
                                loader: 'css-loader',
                                options: {
                                    minimize: isProd,
                                },
                            },
                            {
                                loader: 'sass-loader',
                                ...(config.sassLoaderData ? {
                                    options: {
                                        data: config.sassLoaderData,
                                    },
                                } : {}),
                            },

                        ],
                    },
                    {
                        test: /\.(png|jpe?g|gif|ttf|woff2?|eot|svg)$/,
                        use: {
                            loader: 'url-loader',
                            options: {
                                limit: 8192,
                            },
                        },
                    },
                ],
            },
            plugins: [
                new webpack.DefinePlugin({
                    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
                }),
                new VueLoaderPlugin(),
            ],
        };
    },
};
