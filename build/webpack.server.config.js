const webpack = require('webpack');
const { merge } = require('webpack-merge');

const VueSSRServerPlugin = require('vue-server-renderer/server-plugin');

const { getBaseConfig } = require('./webpack.base.config');

function serverExternals({ request }, callback) {
    // Tell webpack to ignore all node_modules dependencies except
    // lodash-es so we get proper tree shaking
    const nonRelativeExp = /^\w.*$/i;
    const lodashEsExp = /^lodash-es/;
    const vueSsrBuildExp = /^vue-ssr-build/;
    const a15JsSvcExp = /^a15-js-service/;
    if (nonRelativeExp.test(request) &&
        !lodashEsExp.test(request) &&
        !vueSsrBuildExp.test(request) &&
        !a15JsSvcExp.test(request)) {
        return callback(null, `commonjs ${request}`);
    }
    return callback();
}

module.exports = function getServerConfig(configOpts) {
    const config = {
        type: 'server',
        rootDir: null,
        extractCss: false,
        enablePostCss: false,
        postCssOpts: null,
        i18nBlocks: false,
        theme: null,
        sassLoaderData: null,
        babelLoader: true,
        svgInlineLoaderOptions: null,
        ...configOpts,
    };

    const serverConfig = merge(getBaseConfig(config), {
        // Note: Do not start this name with server- as that will confuse the
        // webpack-hot-server-middleware plugin
        name: 'vue-ssr-bundle',
        entry: './src/server/entry-server.js',
        output: {
            filename: 'server-bundle.js',
            library: {
                type: 'commonjs2',
            },
        },
        target: 'node',
        externals: serverExternals,
        plugins: [
            new webpack.DefinePlugin({ 'process.env.VUE_ENV': '"server"' }),
            new VueSSRServerPlugin(),
        ],
    });

    return serverConfig;
};
