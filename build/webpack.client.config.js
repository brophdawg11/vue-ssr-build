const webpack = require('webpack');
const merge = require('webpack-merge');
const VisualizerPlugin = require('webpack-visualizer-plugin');
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');

const VueSSRClientPlugin = require('vue-server-renderer/client-plugin');

const { getBaseConfig, isProd } = require('./webpack.base.config');

module.exports = function getClientConfig(configOpts) {
    const config = Object.assign({
        type: 'client',
        rootDir: null,
        extractCss: false,
        insertInto: null,
        enablePostCss: false,
        postCssOpts: null,
        i18nBlocks: false,
        theme: null,
        sassLoaderData: null,
        babelLoader: true,
        terserOptions: null,
        svgInlineLoaderOptions: null,
    }, configOpts);

    const clientConfig = merge(getBaseConfig(config), {
        name: 'client',
        entry: {
            app: './src/js/entry-client.js',
        },
        plugins: [
            new webpack.DefinePlugin({ 'process.env.VUE_ENV': '"client"' }),
            new VueSSRClientPlugin(),
            new VisualizerPlugin(),
        ],
        ...(config.extractCss && isProd ? {
            optimization: {
                minimizer: [
                    new TerserPlugin({
                        cache: true,
                        parallel: false,
                        sourceMap: true,
                        terserOptions: {
                            safari10: true,
                            ...config.terserOptions,
                        },
                    }),
                    // Minimize extracted CSS files
                    new OptimizeCSSAssetsPlugin({}),
                ],
            },
        } : {}),
    });

    return clientConfig;
};
