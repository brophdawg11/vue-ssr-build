/* eslint-disable no-console */

const path = require('path');

const webpack = require('webpack');
const VueLoaderPlugin = require('vue-loader/lib/plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

const isLocal = process.env.NODE_ENV === 'local';
const isProd = process.env.NODE_ENV === 'production';
const isDev = !isLocal && !isProd;
const logLevel = process.env.LOG_LEVEL || 'debug';
const environment = isProd ? 'production' : 'development';

console.log(`process.env.NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`Webpack building for environment: ${environment}`);

function getCssLoaders(config) {
    console.log(`Enable PostCSS: ${config.enablePostCss}`);

    const addlLoaders = [
        ...(config.enablePostCss ? [{
            loader: 'postcss-loader',
            options: config.postCssOpts,
        }] : []),
    ];

    const cssLoaders = [
        {
            loader: 'css-loader',
            options: {
                minimize: isProd,
                // Number of loaders applied prior to css-loader
                // See https://vue-loader.vuejs.org/guide/pre-processors.html#postcss
                importLoaders: addlLoaders.length,
            },
        },
        ...addlLoaders,
    ];

    if (config.type === 'server') {
        if (config.extractCss) {
            cssLoaders[0].loader = 'css-loader/locals';
            return [...cssLoaders];
        }

        return ['vue-style-loader', ...cssLoaders];
    }

    if (config.extractCss) {
        return [MiniCssExtractPlugin.loader, ...cssLoaders];
    }

    return ['vue-style-loader', ...cssLoaders];
}

module.exports = {
    isDev,
    isLocal,
    isProd,
    logLevel,
    getBaseConfig(config) {
        return {
            mode: environment,
            devtool: isProd ? 'source-map' : 'eval-source-map',
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

                    // Only include babelLoader if specified - useful to turn
                    // this off for the server build
                    ...(config.babelLoader ? [{
                        test: /\.js$/,
                        loader: 'babel-loader',
                        // Allow a15-js-service and vue-ssr-build to be run through
                        // babel since we don't pre-transpile them
                        exclude: /node_modules\/(?!(a15-js-service|vue-ssr-build)\/).*/,
                    }] : []),

                    {
                        test: /\.css$/,
                        use: getCssLoaders(config),
                    },
                    {
                        test: /\.scss$/,
                        use: [
                            ...getCssLoaders(config),
                            {
                                loader: 'sass-loader',
                                options: Object.assign({
                                    sourceComments: false,
                                }, (config.sassLoaderData ? {
                                    data: config.sassLoaderData,
                                } : {})),
                            },
                        ],
                    },
                    {
                        test: /\.(png|jpe?g|gif|ttf|woff2?|eot)$/,
                        use: {
                            loader: 'url-loader',
                            options: {
                                limit: 8192,
                            },
                        },
                    },
                    {
                        test: /\.svg$/,
                        oneOf: [{
                            resourceQuery: /inline/,
                            use: 'svg-inline-loader',
                        }, {
                            test: /\.svg$/,
                            use: {
                                // See: https://iamakulov.com/notes/optimize-images-webpack/
                                loader: 'svg-url-loader',
                                options: {
                                    limit: 8192,
                                    noquotes: true,
                                },
                            },
                        }],
                    },
                ],
            },
            plugins: [
                new webpack.DefinePlugin({
                    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
                }),
                new VueLoaderPlugin(),
                ...(config.extractCss ? [
                    new MiniCssExtractPlugin({
                        filename: isProd ? 'app.[contenthash].css' : 'app.css',
                        chunkFilename: isProd ? '[name].[contenthash].css' : '[name].css',
                        insertInto: config.insertInto,
                    }),
                ] : []),
            ],
        };
    },
};
