/* eslint-disable no-console */
const assert = require('assert');
const webpack = require('webpack');
const devMiddleware = require('webpack-dev-middleware');
const hotMiddleware = require('webpack-hot-middleware');
const hotServerMiddleware = require('webpack-hot-server-middleware');

function applyExpressMiddleware(_app, middlewareOpts) {
    const opts = Object.assign({
        assert: true,
        clientConfig: null,
        heartbeat: 10 * 1000,
        hmrPath: '/__webpack_hmr',
        logger: console.info,
        middlewareConfig: null,
    }, middlewareOpts);

    assert(opts.assert, 'HMR should only be imported in dev environments');

    const compiler = webpack([ opts.clientConfig, opts.middlewareConfig ]);
    const clientCompiler = compiler.compilers.find(c => c.name === 'client');

    opts.logger('Registering HMR server and client middleware');

    _app.use(devMiddleware(compiler, {
        logLevel: 'warn',
        publicPath: opts.clientConfig.output.publicPath,
        serverSideRender: true,
    }));

    _app.use(hotMiddleware(clientCompiler, {
        log: opts.logger,
        path: opts.hmrPath,
        heartbeat: opts.heartbeat,
    }));

    _app.use(hotServerMiddleware(compiler));
}

module.exports = {
    applyExpressMiddleware,
};
