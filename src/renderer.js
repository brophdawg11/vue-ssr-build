const fs = require('fs');
const path = require('path');
const LRU = require('lru-cache');
const { createBundleRenderer } = require('vue-server-renderer');

const errorHandler = (err, res, cb) => {
    if (err.url) {
        res.redirect(err.url);
    } else if (err.code === 404) {
        res.status(err.code).send('404 | Page Not Found');
    } else {
        // Render Error Page or Redirect
        res.status(500).send('500 | Internal Server Error');
        /* eslint-disable no-console */
        console.error(err);
        console.error(err.stack);
    }
    cb();
};

// Base config - extended via client argument to initVueRenderer
const config = {
    errorHandler,
    i18nDirective: false,
    isLocal: process.env.NODE_ENV === 'local',
    isDev: process.env.NODE_ENV === 'development',
    isProd: process.env.NODE_ENV === 'production',
    hmr: false,
    stream: true,
    rendererOpts: null,
    templatePath: null,
    clientConfig: null,
    serverConfig: null,
    clientManifest: null,
    serverBundle: null,
};

let renderer;
let readyPromise;

function createRenderer(bundle, options) {
    /* eslint-disable global-require */
    const t = config.i18nDirective ?
        require('vue-i18n-extensions').directive :
        null;
    return createBundleRenderer(bundle, Object.assign(options, {
        cache: LRU({
            max: 1000,
            maxAge: 1000 * 60 * 15,
        }),
        runInNewContext: false,
        // Only include the t directive when specified
        ...(t ? { directives: { t } } : {}),
    }, config.rendererOpts));
}

function renderToString(context, res, cb) {
    renderer.renderToString(context,
        (err, html) => {
            if (err) {
                config.handleError(err, res, cb);
            } else {
                res.end(html);
                cb();
            }
        },
        e => config.handleError(e, res, cb));
}

function renderToStream(context, res, cb) {
    const stream = renderer.renderToStream(context);
    stream.on('data', data => res.write(data.toString()));
    stream.on('end', () => {
        res.end();
        cb();
    });
    stream.on('error', err => config.handleError(err, res, cb));
}

function render(req, res) {
    const s = Date.now();

    const context = {
        title: 'URBN Community',
        request: req,
        response: res,
        url: req.url,
        initialState: null,
    };

    res.setHeader('Content-Type', 'text/html');

    // Render the appropriate Vue components into the renderer template
    // using the server render logic in entry-server.js
    const renderFn = config.stream ? renderToStream : renderToString;
    renderFn(context, res, () => {
        if (!config.isProd) {
            console.log(`SSR request took: ${Date.now() - s}ms`);
        }
    });
}

module.exports = function initVueRenderer(app, configOpts) {
    /* eslint-disable global-require, import/no-unresolved, import/no-dynamic-require */
    Object.assign(config, configOpts);

    // In development: setup the dev server with watch and hot-reload,
    // and create a new renderer on bundle / index template update.
    if (config.hmr) {
        readyPromise = require('./setup-dev-server')(
            app,
            config,
            (bundle, options) => { renderer = createRenderer(bundle, options); },
        );
        return (req, res) => {
            // Make dev server wait on webpack builds
            readyPromise.then(() => render(req, res));
        };
    }

    // Non-local mode without HMR
    const template = fs.readFileSync(config.templatePath, 'utf-8');
    const bundle = require(path.resolve(config.serverBundle));
    const clientManifest = require(path.resolve(config.clientManifest));
    renderer = createRenderer(bundle, { template, clientManifest });
    return render;
};
