/* eslint-disable no-console,global-require,import/no-extraneous-dependencies */
const assert = require('assert');
const webpack = require('webpack');

function applyExpressMiddleware(app, middlewareOpts) {
    const opts = Object.assign({
        assert: true,
        clientConfig: null,
        serverConfig: null,
        hmrPath: '/__webpack_hmr',
    }, middlewareOpts);

    assert(opts.assert, 'Refusing to enable HMR due to failed assertion');
    const compiler = webpack([ opts.clientConfig, opts.serverConfig ]);
    const clientCompiler = compiler.compilers.find(c => c.name === 'client');

    console.info('Registering HMR server and client middleware');

    app.use(require('webpack-dev-middleware')(compiler, {
        logLevel: 'warn',
        publicPath: opts.clientConfig.output.publicPath,
        serverSideRender: true,
    }));

    app.use(require('webpack-hot-middleware')(clientCompiler, {
        log: console.info,
        path: opts.hmrPath,
        heartbeat: 10 * 1000,
    }));

    app.use(require('webpack-hot-server-middleware')(compiler));
}

module.exports = {
    applyExpressMiddleware,
};
