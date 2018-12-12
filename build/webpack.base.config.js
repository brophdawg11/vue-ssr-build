const path = require('path');

/* eslint-disable import/no-extraneous-dependencies */
const webpack = require('webpack');
const VueLoaderPlugin = require('vue-loader/lib/plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
/* eslint-enable import/no-extraneous-dependencies */

const isLocal = process.env.NODE_ENV === 'local';
const isProd = process.env.NODE_ENV === 'production';
const isDev = !isLocal && !isProd;
const logLevel = process.env.LOG_LEVEL || 'debug';
const environment = isProd ? 'production' : 'development';
const autoprefixerEnabled = process.env.VSB_CSS_AUTOPREFIXER_ENABLED === 'true';

/* eslint-disable no-console */
console.log(`process.env.NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`Webpack building for environment: ${environment}`);
console.log(`CSS Autoprefixer: ${autoprefixerEnabled ? 'ENABLED' : 'DISABLED'}`);
/* eslint-enable no-console */

function getCssLoaders(config, loadersAfterCssLoader = 0) {
    const postCSSLoader = [];

    // Only add postcss-loader if it's enabled
    if (autoprefixerEnabled) {
        postCSSLoader.push('postcss-loader');
    }

    // Account for loaders after CSS Loader and postcss-loader
    const importLoaders = loadersAfterCssLoader + (postCSSLoader.length ? 1 : 0);
    const cssLoader = {
        loader: 'css-loader',
        options: {
            minimize: isProd,
            // Number of loaders applied prior to css-loader
            // See https://vue-loader.vuejs.org/guide/pre-processors.html#postcss
            importLoaders,
        },
    };

    if (config.type === 'server') {
        if (config.extractCss) {
            cssLoader.loader = 'css-loader/locals';
            return [cssLoader, ...postCSSLoader];
        }

        return ['vue-style-loader', cssLoader, ...postCSSLoader];
    }

    if (config.extractCss) {
        return [MiniCssExtractPlugin.loader, cssLoader, ...postCSSLoader];
    }

    return ['vue-style-loader', cssLoader, ...postCSSLoader];
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
                        exclude: /node_modules/,
                    }] : []),

                    {
                        test: /\.css$/,
                        use: getCssLoaders(config),
                    },
                    {
                        test: /\.scss$/,
                        use: [
                            ...getCssLoaders(config, 1),
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
            ...(config.extractCss && config.isProd ? {
                optimization: {
                    minimizer: [
                        new UglifyJsPlugin({
                            cache: true,
                            parallel: true,
                            sourceMap: true,
                        }),
                        // Minimize extracted CSS files
                        new OptimizeCSSAssetsPlugin({}),
                    ],
                },
            } : {}),
            plugins: [
                new webpack.DefinePlugin({
                    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
                }),
                new VueLoaderPlugin(),
                new MiniCssExtractPlugin({
                    filename: isProd ? 'app.[contenthash].css' : 'app.css',
                    chunkFilename: isProd ? '[name].[contenthash].css' : '[name].css',
                }),
            ],
        };
    },
};
