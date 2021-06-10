const webpack = require('webpack');
const { merge } = require('webpack-merge');
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');

const VueSSRClientPlugin = require('vue-server-renderer/client-plugin');

const { getBaseConfig, isProd } = require('./webpack.base.config');

module.exports = function getClientConfig(configOpts) {
    const config = {
        type: 'client',
        rootDir: null,
        extractCss: false,
        cssInsert: null,
        enablePostCss: false,
        postCssOpts: null,
        i18nBlocks: false,
        theme: null,
        sassLoaderData: null,
        babelLoader: true,
        terserOptions: null,
        terserPluginOptions: null,
        svgInlineLoaderOptions: null,
        ...configOpts,
    };

    const clientConfig = merge(getBaseConfig(config), {
        name: 'client',
        devtool: isProd ? 'source-map' : 'eval-source-map',
        entry: {
            app: './src/js/entry-client.js',
        },
        plugins: [
            new webpack.DefinePlugin({ 'process.env.VUE_ENV': '"client"' }),
            new VueSSRClientPlugin(),
        ],
        ...(config.extractCss && isProd ? {
            optimization: {
                minimizer: [
                    new TerserPlugin({
                        terserOptions: {
                            safari10: true,
                            ...config.terserOptions,
                        },
                        ...config.terserPluginOptions,
                    }),
                    // Minimize extracted CSS files
                    new OptimizeCSSAssetsPlugin({}),
                ],
            },
        } : {}),
    });

    return clientConfig;
};
